create or replace function public.gen_initial_diet(client uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ik jsonb; sx text; ag int; cm numeric; kg numeric; pal numeric; goal text; phase text; adj numeric; pk numeric;
  bmr numeric; tdee numeric; kcal numeric; p numeric; g numeric; c numeric; civ int; crest numeric;
  pa int; arros int; poll int; oli int; pfix numeric; gfix numeric; realk numeric; it int;
  fromd date; meals jsonb; tk numeric; tc numeric; tgr numeric; tp numeric; doc jsonb; flags text[] := '{}'; nm int;
begin
  select data into ik from public.docs where user_id=client and col='intake' and id='inicial' and not deleted;
  if ik is null then return jsonb_build_object('ok',false,'flags','[]'::jsonb); end if;
  sx := coalesce(ik->>'sex','h');
  ag := coalesce(extract(year from age(current_date, nullif(ik->>'birth','')::date))::int, 30);
  cm := coalesce((ik->>'cm')::numeric, 175);
  kg := coalesce((select (d.data->>'kg')::numeric from public.docs d where d.user_id=client and d.col='bodyweight' and not d.deleted and d.data ? 'kg' order by d.data->>'date' desc limit 1), (ik->>'kg')::numeric, 75);
  pal := coalesce((ik->>'pal')::numeric, 1.55);
  goal := lower(coalesce(ik->>'goal',''));
  phase := case when goal ~ 'perdre greix' then 'Definició' when goal ~ 'guanyar múscul' then 'Volum net' when goal ~ 'recomp' then 'Recomposició' else 'Manteniment' end;
  adj := case phase when 'Definició' then -0.20 when 'Recomposició' then -0.10 when 'Volum net' then 0.10 else 0 end;
  pk := case phase when 'Definició' then 2.2 when 'Recomposició' then 2.0 else 1.8 end;
  bmr := 10*kg + 6.25*cm - 5*ag + case when sx='d' then -161 else 5 end;
  tdee := bmr*pal;
  kcal := round(tdee*(1+adj)/10)*10;
  p := round(kg*pk); g := greatest(round(kg*0.8), round(kcal*0.2/9)); c := round((kcal - p*4 - g*9)/4);
  civ := case when kcal >= 2200 then 60 else 40 end;
  crest := c - (43.2 + 16 + 1.5 + 1.8 + civ*0.60);
  pa := greatest(40, (5*round(crest*0.25/0.43/5))::int);
  arros := greatest(30, (5*round(crest*0.375/0.78/5))::int);
  pfix := 1.08 + 6 + 19 + 23.4 + civ*0.13 + pa*0.09 + 2*arros*0.07;
  poll := greatest(100, (5*round((p - pfix)/2/0.23/5))::int);
  gfix := 0.72 + 0.8 + 3 + 1.8 + civ*0.07 + pa*0.033 + 2*arros*0.006 + 2*poll*0.015;
  oli := greatest(5, round((g - gfix)/3)::int);
  for it in 1..12 loop
    realk := 2.5*pa + 110 + 27*oli + 187.2 + 7.1*arros + 2.2*poll + 100 + 3.75*civ + 117;
    exit when realk <= kcal + 40 or arros <= 30;
    arros := arros - 5;
  end loop;

  with foods(k,kc,cc,gg,pp) as (values ('pa',250,43,3.3,9),('pernil',110,1.5,3,19),('oli',900,0,100,0),('poma',52,12,0.2,0.3),
      ('arros',355,78,0.6,7),('pollastre',110,0,1.5,23),('verdura',25,4,0.2,1.5),('civada',375,60,7,13),('whey',390,6,6,78)),
    its(meal,ord,mname,note,name,k,gr,eq,ref) as (values
      (1,1,'Àpat 1',null::text,'Pa integral','pa',pa,'carb','Pa integral'),(1,2,'Àpat 1',null,'Pernil cuit','pernil',100,'prot','Pernil cuit'),
      (1,3,'Àpat 1',null,'Oli d''oliva','oli',oli,'fat','Oli d''oliva'),(1,4,'Àpat 1',null,'Poma','poma',180,'fruit','Poma'),
      (2,1,'Àpat 2',null,'Arròs','arros',arros,'carb','Arròs'),(2,2,'Àpat 2',null,'Pollastre','pollastre',poll,'prot','Pollastre'),
      (2,3,'Àpat 2',null,'Oli d''oliva','oli',oli,'fat','Oli d''oliva'),(2,4,'Àpat 2',null,'Verdura saltada','verdura',200,null,null),
      (3,1,'Àpat 3','pre-entrenament','Poma','poma',180,'fruit','Poma'),(3,2,'Àpat 3','pre-entrenament','Farina de civada','civada',civ,'carb','Civada (+ P + G)'),
      (3,3,'Àpat 3','pre-entrenament','Whey protein','whey',30,'prot','Proteïna en pols'),
      (4,1,'Àpat 4','post-entrenament','Arròs','arros',arros,'carb','Arròs'),(4,2,'Àpat 4','post-entrenament','Pollastre','pollastre',poll,'prot','Pollastre'),
      (4,3,'Àpat 4','post-entrenament','Oli d''oliva','oli',oli,'fat','Oli d''oliva'),(4,4,'Àpat 4','post-entrenament','Hortalisses / crema de verdures','verdura',200,null,null)),
    x as (select its.*, f.kc*gr/100.0 xk, f.cc*gr/100.0 xc, f.gg*gr/100.0 xg, f.pp*gr/100.0 xp from its join foods f using (k)),
    mm as (select meal, mname, note, sum(xk) k, sum(xc) cc, sum(xg) gg, sum(xp) pp,
      jsonb_agg(case when eq is null then jsonb_build_object('name',name,'g',gr,'hint','Qualsevol hortalissa, mateix pes')
                     else jsonb_build_object('name',name,'g',gr,'eq',eq,'ref',ref) end order by ord) items
      from x group by meal, mname, note)
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name',mname,'note',note,'kcal',round(k),'c',round(cc),'g',round(gg),'p',round(pp),'items',items)) order by meal),
         sum(k), sum(cc), sum(gg), sum(pp)
    into meals, tk, tc, tgr, tp from mm;

  nm := coalesce((ik->>'meals')::int, 4);
  if nm <> 4 then flags := flags || ('Prefereix ' || nm || ' àpats al dia: la pauta automàtica en té 4'); end if;
  if coalesce(trim(ik->>'allergies'),'') !~* '^(|cap|no|ninguna|ninguno)$' then flags := flags || ('Al·lèrgies: ' || left(ik->>'allergies',60) || ' → revisa la pauta'); end if;
  if coalesce(trim(ik->>'dislikes'),'') !~* '^(|cap|no|res|ninguna|ninguno)$' then flags := flags || ('No menja: ' || left(ik->>'dislikes',60) || ' → revisa la pauta'); end if;

  fromd := (now() at time zone 'Europe/Madrid')::date + 1;
  doc := jsonb_build_object('from',fromd,'title',phase||' · inici','phase',phase,'source','Pauta de l''entrenador · s''ajusta cada setmana',
    'provisional',true,'auto',true,'weightKg',kg,
    'targets',jsonb_build_object('kcal',round(tk/10)*10,'p',round(tp),'c',round(tc),'g',round(tgr)),
    'meals',meals,'calc',jsonb_build_object('sex',sx,'age',ag,'cm',cm,'kg',kg,'pal',pal),
    'supplements',jsonb_build_array(
      jsonb_build_object('name','Whey protein','txt','Substituïble per qualsevol proteïna de la taula d''equivalències'),
      jsonb_build_object('name','Creatina','txt','3-5 g cada dia, a qualsevol hora'),
      jsonb_build_object('name','Omega-3','txt','Opcional si menges peix blau menys de 2 cops per setmana')),
    'tips',jsonb_build_array(
      'Kcal inicials = manteniment estimat ' || case phase when 'Definició' then '−20 %' when 'Recomposició' then '−10 %' when 'Volum net' then '+10 %' else '(sense ajust)' end || ' (' || lower(phase) || '). S''ajusten cada setmana segons la mitjana del pes',
      case phase when 'Definició' then 'Objectiu: baixar entre un 0,5 i un 1 % del pes per setmana'
                 when 'Volum net' then 'Objectiu: pujar entre un 0,25 i un 0,5 % del pes per setmana'
                 else 'Objectiu: pes estable (±0,25 % per setmana) mentre la força puja' end,
      'Pesa''t cada dia en dejú i apunta les kcal: es controla la mitjana setmanal',
      '1 àpat lliure a la setmana: apunta''l aproximadament (orientatiu 1.000-1.200 kcal)',
      'Pesos en cru; l''oli sempre es pesa i es compta',
      'Beu 3-4 L d''aigua al dia', '3-4 h entre àpats',
      'Àpat 3 1,5-3 h abans d''entrenar i àpat 4 0,5-2 h després'),
    'updatedAt',now());
  insert into public.docs(user_id,col,id,data) values (client,'nutrition','pauta-'||fromd,doc)
  on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
  return jsonb_build_object('ok',true,'kcal',round(tk),'p',round(tp),'c',round(tc),'g',round(tgr),'flags',to_jsonb(flags));
end $$;
revoke execute on function public.gen_initial_diet(uuid) from anon, authenticated, public;

create or replace function public.on_intake_gen_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := '{}'::jsonb;
begin
  if new.col='intake' and new.id='inicial' and not new.deleted
     and exists(select 1 from public.profiles p where p.id=new.user_id and p.coach_id is not null) then
    if not exists(select 1 from public.docs d where d.user_id=new.user_id and d.col='nutrition' and not d.deleted) then
      r := public.gen_initial_diet(new.user_id);
    end if;
    if not exists(select 1 from public.docs d where d.user_id=new.user_id and d.col='templates' and not d.deleted) then
      perform public.gen_initial_plan(new.user_id);
      if jsonb_array_length(coalesce(r->'flags','[]'::jsonb)) > 0 then
        update public.docs set data = jsonb_set(data,'{flags}', coalesce(data->'flags','[]'::jsonb) || (r->'flags'))
          where user_id=new.user_id and col='programs' and id='inicial';
      end if;
    end if;
  end if;
  return new;
end $$;

do $$ declare d text; begin
  d := pg_get_functiondef('public.gen_initial_plan(uuid)'::regprocedure);
  d := replace(d, '''🏋️ La teva rutina ja està llesta''', '''🏋️ La teva rutina i la teva pauta ja estan llestes''');
  d := replace(d, '''És una rutina provisional feta amb la teva fitxa. El teu entrenador titulat la revisarà i personalitzarà en menys de 24 h.''',
                  '''Són provisionals, fetes amb la teva fitxa. El teu entrenador titulat les revisarà i personalitzarà en menys de 24 h.''');
  execute d;
end $$;
