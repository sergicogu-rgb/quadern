-- Pla inicial v3 (2026-11-11): el mateix dia de l'alta, segons la fitxa.
-- Rutina: cada múscul 2 cops per setmana, sèries segons nivell, límit de sèries per sessió segons els minuts,
--         i resum de volum setmanal i freqüència per múscul a programs/inicial (el veu l'entrenador en validar).
-- Pauta: comença el mateix dia de l'alta (abans començava l'endemà).
-- Recull també la versió viva de gen_initial_plan (biblioteca de màquines), que no era al repo.

create or replace function public.gen_initial_plan(client uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ik jsonb; days int; mins int; exp text; goal text; txt text;
  beg boolean; adv boolean; salut boolean; forca boolean;
  knee boolean; back boolean; shoulder boolean;
  lib jsonb := $L${
   "press_pit_maq":{"n":"Press de pit a màquina","m":"Pit","t":"c"},
   "press_incl_maq":{"n":"Press inclinat a màquina","m":"Pit","t":"c"},
   "peck_deck":{"n":"Peck deck (obertures)","m":"Pit","t":"i"},
   "creuat_politja":{"n":"Creuat de politges","m":"Pit","t":"i"},
   "jalo":{"n":"Jaló al pit agafada ampla","m":"Esquena","t":"c"},
   "jalo_neutre":{"n":"Jaló al pit agafada neutra","m":"Esquena","t":"c"},
   "rem_politja":{"n":"Rem assegut a politja","m":"Esquena","t":"c"},
   "rem_pit_rec":{"n":"Rem amb pit recolzat (màquina)","m":"Esquena","t":"c"},
   "press_esp_maq":{"n":"Press d'espatlles a màquina","m":"Espatlles","t":"c","sh":"laterals_politja"},
   "laterals_maq":{"n":"Elevacions laterals a màquina","m":"Espatlles","t":"i"},
   "laterals_politja":{"n":"Elevacions laterals a politja","m":"Espatlles","t":"i"},
   "face_pull":{"n":"Face pull a politja","m":"Espatlles","t":"i"},
   "deltoide_post":{"n":"Deltoide posterior a màquina (peck deck invers)","m":"Espatlles","t":"i"},
   "curl_maq":{"n":"Curl de bíceps a màquina (predicador)","m":"Bíceps","t":"i"},
   "curl_politja":{"n":"Curl de bíceps a politja","m":"Bíceps","t":"i"},
   "curl_bayesian":{"n":"Curl bayesian a politja","m":"Bíceps","t":"i"},
   "triceps_politja":{"n":"Extensió de tríceps a politja alta","m":"Tríceps","t":"i"},
   "triceps_cap":{"n":"Extensió de tríceps per sobre del cap a politja","m":"Tríceps","t":"i","sh":"triceps_maq"},
   "triceps_maq":{"n":"Extensió de tríceps a màquina","m":"Tríceps","t":"i"},
   "premsa":{"n":"Premsa de cames","m":"Quàdriceps","t":"c"},
   "hack":{"n":"Hack squat (màquina)","m":"Quàdriceps","t":"c","kn":"premsa","bk":"premsa"},
   "leg_ext":{"n":"Extensió de quàdriceps","m":"Quàdriceps","t":"i"},
   "leg_curl_ass":{"n":"Curl femoral assegut","m":"Isquios","t":"i"},
   "leg_curl_est":{"n":"Curl femoral estirat","m":"Isquios","t":"i"},
   "hiperext":{"n":"Hiperextensions a 45° (glutis i isquios)","m":"Isquios","t":"i","bk":"leg_curl_est","beg":"leg_curl_est"},
   "hip_thrust_maq":{"n":"Hip thrust a màquina","m":"Glutis","t":"c"},
   "abductors":{"n":"Abductors a màquina","m":"Glutis","t":"i"},
   "adductors":{"n":"Adductors a màquina","m":"Adductors","t":"i"},
   "bessons":{"n":"Elevació de talons a màquina (bessons)","m":"Bessons","t":"i"},
   "crunch_politja":{"n":"Crunch a politja","m":"Abdominals","t":"i"},
   "crunch_maq":{"n":"Crunch a màquina","m":"Abdominals","t":"i"}
  }$L$::jsonb;
  -- Llistes per prioritat: els darrers són els primers que cauen si la sessió no hi cap.
  ses jsonb := $S${
   "FB_A":{"n":"Cos sencer A","x":["premsa","press_pit_maq","jalo","leg_curl_ass","laterals_maq","curl_maq","triceps_politja","crunch_politja"]},
   "FB_B":{"n":"Cos sencer B","x":["hack","press_incl_maq","rem_politja","leg_curl_est","hip_thrust_maq","laterals_politja","curl_politja","triceps_cap"]},
   "FB_C":{"n":"Cos sencer C","x":["premsa","press_esp_maq","rem_pit_rec","hip_thrust_maq","peck_deck","curl_bayesian","triceps_maq","crunch_maq"]},
   "TA":{"n":"Tors A","x":["press_pit_maq","jalo","press_esp_maq","rem_politja","laterals_maq","curl_maq","triceps_politja","peck_deck"]},
   "CA":{"n":"Cama A","x":["hack","hip_thrust_maq","leg_curl_ass","leg_ext","bessons","crunch_maq","adductors"]},
   "TB":{"n":"Tors B","x":["press_incl_maq","rem_pit_rec","jalo_neutre","laterals_politja","curl_bayesian","triceps_cap","peck_deck","deltoide_post"]},
   "CB":{"n":"Cama B","x":["premsa","leg_curl_est","abductors","leg_ext","bessons","crunch_politja","hiperext"]},
   "BR":{"n":"Espatlles i braços","x":["press_esp_maq","laterals_maq","curl_maq","triceps_maq","curl_bayesian","triceps_politja","deltoide_post","crunch_maq"]},
   "PA":{"n":"Empenta A","x":["press_pit_maq","press_esp_maq","press_incl_maq","laterals_maq","triceps_politja","triceps_cap","peck_deck","crunch_politja"]},
   "PB":{"n":"Tracció A","x":["jalo","rem_politja","rem_pit_rec","deltoide_post","curl_maq","curl_bayesian","face_pull","crunch_maq"]},
   "PC":{"n":"Empenta B","x":["press_incl_maq","press_esp_maq","creuat_politja","laterals_politja","triceps_maq","triceps_cap","peck_deck","crunch_maq"]},
   "PD":{"n":"Tracció B","x":["jalo_neutre","rem_pit_rec","rem_politja","face_pull","curl_politja","curl_bayesian","deltoide_post","crunch_politja"]}
  }$S$::jsonb;
  split text[]; key text; e jsonb; m text; exids text[]; used text[]; sm text[]; i int; j int;
  ns int; cap int; tot int; rmin int; rmax int; ranges jsonb; first_c boolean; rir text; flags text[] := '{}';
  split_name text; tname text; vol jsonb := '{}'::jsonb; low text[] := '{}';
begin
  select data into ik from public.docs where user_id=client and col='intake' and id='inicial' and not deleted;
  if ik is null then return jsonb_build_object('ok',false,'reason','sense fitxa'); end if;
  days := least(6, greatest(2, coalesce((ik->>'days')::int, 3)));
  mins := coalesce((ik->>'minutes')::int, 60);
  exp := coalesce(ik->>'exp',''); goal := lower(coalesce(ik->>'goal',''));
  beg := exp ~* '^(Mai|Menys)'; adv := exp ~* '(2 – 5|Més de 5)';
  salut := goal ~ 'salut'; forca := goal ~ 'força';
  -- Sèries màximes per sessió segons el temps disponible (uns 3 min per sèrie amb el descans)
  cap := case when mins <= 45 then 13 when mins <= 60 then 18 when mins <= 75 then 22 else 26 end;
  txt := lower(coalesce(ik->>'injuries','') || ' ' || coalesce(ik->>'medical',''));
  knee := txt ~ '(genoll|rodilla|menisc|creuat|lca|rótula|ròtula)';
  back := txt ~ '(esquena|lumbar|hèrnia|hernia|espalda|ciàtic|ciatic|discal)';
  shoulder := txt ~ '(espatlla|hombro|manegot|manguito|rotador|clavícula)';
  if knee then flags := flags || 'Lesió de genoll declarada: revisa el rang de moviment a premsa i extensió de quàdriceps'::text; end if;
  if back then flags := flags || 'Molèsties d''esquena declarades: s''han evitat hack squat i hiperextensions'::text; end if;
  if shoulder then flags := flags || 'Molèsties d''espatlla declarades: s''han evitat el press d''espatlles i el tríceps per sobre del cap'::text; end if;
  if coalesce((ik->>'parqAlert')::boolean,false) then flags := flags || 'PAR-Q positiu: demanar vist i plau mèdic abans d''entrenar intens'::text; end if;
  if lower(coalesce(trim(ik->>'injuries'),'')) not in ('','cap','no','ninguna','ninguno') and not (knee or back or shoulder) then flags := flags || ('Lesió declarada: ' || left(ik->>'injuries',80)); end if;

  split := case days when 2 then array['FB_A','FB_B'] when 3 then array['FB_A','FB_B','FB_C']
    when 4 then array['TA','CA','TB','CB'] when 5 then array['TA','CA','TB','CB','BR'] else array['PA','PB','CA','PC','PD','CB'] end;
  split_name := case when days<=3 then 'Cos sencer' when days<=5 then 'Tors / cama' else 'Empenta / tracció / cama' end;
  rir := case when salut then 'RIR 2-4: acaba cada sèrie amb 2-4 repeticions a la recambra'
              when beg then 'RIR 2-3: acaba cada sèrie amb 2-3 repeticions a la recambra; prioritza la tècnica'
              when forca then 'RIR 1-3 als bàsics; aïllats RIR 1-2'
              else 'RIR 1-2 (l''última sèrie dels aïllats pot arribar a RIR 0-1)' end;

  update public.docs set deleted=true where user_id=client and col='templates' and data->>'source'='regles';

  for i in 1..array_length(split,1) loop
    exids := '{}'; used := '{}'; sm := '{}'; first_c := true; tot := 0;
    for j in 0..jsonb_array_length(ses->split[i]->'x')-1 loop
      key := ses->split[i]->'x'->>j;
      if beg and lib->key ? 'beg' then key := lib->key->>'beg'; end if;
      if back and lib->key ? 'bk' then key := lib->key->>'bk'; end if;
      if shoulder and lib->key ? 'sh' then key := lib->key->>'sh'; end if;
      if knee and lib->key ? 'kn' then key := lib->key->>'kn'; end if;
      if key = any(used) then continue; end if;
      e := lib->key; m := e->>'m';
      -- Sèries per exercici: multiarticulars 3 (4 avançats), aïllats 2 (3 intermedis i avançats); salut, 2
      ns := case when salut then 2 when e->>'t'='c' then case when adv then 4 else 3 end when beg then 2 else 3 end;
      if tot + ns > cap then ns := 2; end if;
      if tot + ns > cap then continue; end if;
      used := used || key; tot := tot + ns;
      if salut then rmin := 10; rmax := 15;
      elsif e->>'t'='i' then rmin := 10; rmax := 15;
      elsif forca and first_c and not beg then rmin := 4; rmax := 6;
      elsif beg then rmin := 8; rmax := 12;
      else rmin := 6; rmax := 10; end if;
      if e->>'t'='c' then first_c := false; end if;
      select jsonb_agg(jsonb_build_object('min',rmin,'max',rmax)) into ranges from generate_series(1,ns);
      insert into public.docs(user_id,col,id,data) values (client,'exercises','g-'||key,
        jsonb_build_object('name',e->>'n','muscle',m,'ranges',ranges,'repMin',rmin,'repMax',rmax,
          'inc', case when e->>'t'='c' then 2.5 else 1 end,'source','regles','createdAt',now()))
      on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
      exids := exids || ('g-'||key);
      vol := jsonb_set(vol, array[m], jsonb_build_object(
        'sets', coalesce((vol->m->>'sets')::int,0) + ns,
        'freq', coalesce((vol->m->>'freq')::int,0) + case when m = any(sm) then 0 else 1 end));
      if not (m = any(sm)) then sm := sm || m; end if;
    end loop;
    tname := 'Rutina ' || i || ' · ' || (ses->split[i]->>'n');
    insert into public.docs(user_id,col,id,data) values (client,'templates','rutina-'||i,
      jsonb_build_object('name',tname,'order',i,'exIds',to_jsonb(exids),'source','regles','note',rir,'sets',tot,'createdAt',now()))
    on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
  end loop;

  select coalesce(array_agg(k order by k), '{}') into low from jsonb_each(vol) as v(k,x)
    where k = any(array['Pit','Esquena','Espatlles','Bíceps','Tríceps','Quàdriceps','Isquios','Glutis']) and (x->>'freq')::int < 2;
  if array_length(low,1) > 0 then flags := flags || ('Freqüència 1 per setmana: ' || array_to_string(low, ', ') || ' (el temps per sessió no hi arriba)'); end if;

  insert into public.docs(user_id,col,id,data) values (client,'programs','inicial',
    jsonb_build_object('status','provisional','source','regles','generatedAt',now(),'reviewDue',now()+interval '24 hours',
      'split',split_name,'days',days,'setsPerSession',cap,'rir',rir,'volume',vol,'flags',to_jsonb(flags)))
  on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;

  if not exists(select 1 from public.notifications n where n.user_id=client and n.title like '🏋️ La teva rutina%') then
    insert into public.notifications(user_id,title,body,url) values (client,'🏋️ La teva rutina i la teva pauta ja estan llestes',
      'Són provisionals, fetes amb la teva fitxa. El teu entrenador titulat les revisarà i personalitzarà en menys de 24 h.','./#avui');
  end if;
  return jsonb_build_object('ok',true,'split',split_name,'routines',array_length(split,1),'setsPerSession',cap,'volume',vol,'flags',to_jsonb(flags));
end $$;
revoke execute on function public.gen_initial_plan(uuid) from anon, authenticated, public;

-- Pauta inicial: comença el mateix dia de l'alta (canvi d'una línia sobre la versió viva de gen_initial_diet)
do $do$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.gen_initial_diet(uuid)'::regprocedure);
  d2 := replace(d, $x$fromd := (now() at time zone 'Europe/Madrid')::date + 1;$x$, $x$fromd := (now() at time zone 'Europe/Madrid')::date;$x$);
  if d2 = d then raise exception 'gen_initial_diet: no s''ha trobat la línia de la data d''inici'; end if;
  execute d2;
end $do$;
