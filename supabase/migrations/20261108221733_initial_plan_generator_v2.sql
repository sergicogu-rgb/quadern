create or replace function public.gen_initial_plan(client uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ik jsonb; days int; mins int; nex int; exp text; goal text; txt text;
  beg boolean; adv boolean; salut boolean; forca boolean;
  knee boolean; back boolean; shoulder boolean;
  lib jsonb := $L${
   "press_banca":{"n":"Press banca amb barra","m":"Pit","t":"c","beg":"press_pit_maq","sh":"press_pit_maq"},
   "press_pit_maq":{"n":"Press de pit a màquina","m":"Pit","t":"c"},
   "press_incl_manu":{"n":"Press inclinat amb manuelles","m":"Pit","t":"c","beg":"press_incl_maq"},
   "press_incl_maq":{"n":"Press inclinat a màquina","m":"Pit","t":"c"},
   "peck_deck":{"n":"Peck deck (obertures)","m":"Pit","t":"i"},
   "jalo":{"n":"Jaló al pit agafada ampla","m":"Esquena","t":"c"},
   "jalo_neutre":{"n":"Jaló al pit agafada neutra","m":"Esquena","t":"c"},
   "rem_politja":{"n":"Rem assegut a politja","m":"Esquena","t":"c"},
   "rem_pit_rec":{"n":"Rem amb pit recolzat (màquina)","m":"Esquena","t":"c"},
   "press_militar_manu":{"n":"Press militar amb manuelles","m":"Espatlles","t":"c","beg":"press_esp_maq","sh":"laterals_politja"},
   "press_esp_maq":{"n":"Press d'espatlles a màquina","m":"Espatlles","t":"c","sh":"face_pull"},
   "laterals_manu":{"n":"Elevacions laterals amb manuelles","m":"Espatlles","t":"i"},
   "laterals_politja":{"n":"Elevacions laterals a politja","m":"Espatlles","t":"i"},
   "face_pull":{"n":"Face pull a politja","m":"Espatlles","t":"i"},
   "curl_manu":{"n":"Curl de bíceps amb manuelles","m":"Bíceps","t":"i"},
   "curl_politja":{"n":"Curl de bíceps a politja","m":"Bíceps","t":"i"},
   "curl_barra":{"n":"Curl amb barra","m":"Bíceps","t":"i"},
   "curl_martell":{"n":"Curl martell","m":"Bíceps","t":"i"},
   "triceps_politja":{"n":"Extensió de tríceps a politja alta","m":"Tríceps","t":"i"},
   "triceps_cap":{"n":"Extensió de tríceps per sobre del cap a politja","m":"Tríceps","t":"i","sh":"triceps_politja"},
   "press_frances":{"n":"Press francès amb barra Z","m":"Tríceps","t":"i","beg":"triceps_cap","sh":"triceps_politja"},
   "sentadilla":{"n":"Sentadilla amb barra","m":"Quàdriceps","t":"c","beg":"premsa","kn":"premsa","bk":"premsa"},
   "premsa":{"n":"Premsa de cames","m":"Quàdriceps","t":"c"},
   "hack":{"n":"Hack squat","m":"Quàdriceps","t":"c","beg":"premsa","kn":"premsa","bk":"premsa"},
   "bulgara":{"n":"Sentadilla búlgara amb manuelles","m":"Quàdriceps","t":"c","beg":"leg_ext","kn":"leg_curl_est"},
   "leg_ext":{"n":"Extensió de quàdriceps","m":"Quàdriceps","t":"i"},
   "pmr":{"n":"Pes mort romanès","m":"Isquios","t":"c","beg":"pmr_manu","bk":"leg_curl_est"},
   "pmr_manu":{"n":"Pes mort romanès amb manuelles","m":"Isquios","t":"c","bk":"leg_curl_est"},
   "leg_curl_ass":{"n":"Curl femoral assegut","m":"Isquios","t":"i"},
   "leg_curl_est":{"n":"Curl femoral estirat","m":"Isquios","t":"i"},
   "hip_thrust":{"n":"Hip thrust","m":"Glutis","t":"c"},
   "adductors":{"n":"Adductors a màquina","m":"Adductors","t":"i"},
   "bessons":{"n":"Elevació de talons (bessons)","m":"Bessons","t":"i"},
   "crunch_politja":{"n":"Crunch a politja","m":"Abdominals","t":"i"},
   "crunch_maq":{"n":"Crunch a màquina","m":"Abdominals","t":"i"}
  }$L$::jsonb;
  ses jsonb := $S${
   "FB_A":{"n":"Cos sencer A","x":["sentadilla","press_banca","jalo","leg_curl_ass","laterals_manu","triceps_politja","curl_manu","crunch_politja"]},
   "FB_B":{"n":"Cos sencer B","x":["pmr","press_incl_manu","rem_politja","leg_ext","curl_politja","triceps_cap","face_pull","crunch_maq"]},
   "FB_C":{"n":"Cos sencer C","x":["hack","press_esp_maq","rem_pit_rec","hip_thrust","peck_deck","leg_curl_est","laterals_politja","bessons"]},
   "TA":{"n":"Tors A","x":["press_banca","jalo","press_militar_manu","rem_politja","laterals_manu","triceps_politja","curl_manu","crunch_politja"]},
   "CA":{"n":"Cama A","x":["sentadilla","pmr","leg_ext","leg_curl_ass","bessons","crunch_maq","adductors","hip_thrust"]},
   "TB":{"n":"Tors B","x":["press_incl_manu","rem_pit_rec","jalo_neutre","peck_deck","laterals_politja","curl_politja","triceps_cap","face_pull"]},
   "CB":{"n":"Cama B","x":["hack","hip_thrust","bulgara","leg_curl_est","adductors","bessons","crunch_politja","leg_ext"]},
   "BR":{"n":"Espatlles i braços","x":["press_esp_maq","laterals_politja","curl_barra","press_frances","curl_martell","triceps_politja","face_pull","crunch_maq"]},
   "PA":{"n":"Empenta A","x":["press_banca","press_militar_manu","press_incl_manu","laterals_manu","triceps_politja","triceps_cap","peck_deck","crunch_politja"]},
   "PB":{"n":"Tracció A","x":["jalo","rem_politja","rem_pit_rec","face_pull","curl_manu","curl_politja","curl_martell","crunch_maq"]},
   "PC":{"n":"Empenta B","x":["press_pit_maq","press_esp_maq","press_incl_maq","laterals_politja","press_frances","triceps_politja","peck_deck","crunch_maq"]},
   "PD":{"n":"Tracció B","x":["jalo_neutre","rem_pit_rec","rem_politja","face_pull","curl_barra","curl_martell","curl_politja","crunch_politja"]}
  }$S$::jsonb;
  split text[]; key text; e jsonb; exids text[]; used text[]; i int; j int; n int; niso int;
  ns int; rmin int; rmax int; ranges jsonb; first_c boolean; rir text; flags text[] := '{}'; split_name text; tname text;
begin
  select data into ik from public.docs where user_id=client and col='intake' and id='inicial' and not deleted;
  if ik is null then return jsonb_build_object('ok',false,'reason','sense fitxa'); end if;
  days := least(6, greatest(2, coalesce((ik->>'days')::int, 3)));
  mins := coalesce((ik->>'minutes')::int, 60);
  exp := coalesce(ik->>'exp',''); goal := lower(coalesce(ik->>'goal',''));
  beg := exp ~* '^(Mai|Menys)'; adv := exp ~* '(2 – 5|Més de 5)';
  salut := goal ~ 'salut'; forca := goal ~ 'força';
  nex := case when mins <= 45 then 5 when beg then 6 when mins <= 60 then 7 else 8 end;
  txt := lower(coalesce(ik->>'injuries','') || ' ' || coalesce(ik->>'medical',''));
  knee := txt ~ '(genoll|rodilla|menisc|creuat|lca|rótula|ròtula)';
  back := txt ~ '(esquena|lumbar|hèrnia|hernia|espalda|ciàtic|ciatic|discal)';
  shoulder := txt ~ '(espatlla|hombro|manegot|manguito|rotador|clavícula)';
  if knee then flags := flags || 'Lesió de genoll declarada: s''han evitat sentadilla i búlgara'::text; end if;
  if back then flags := flags || 'Molèsties d''esquena declarades: s''han evitat sentadilla amb barra i pes mort'::text; end if;
  if shoulder then flags := flags || 'Molèsties d''espatlla declarades: s''han evitat els press per sobre del cap'::text; end if;
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
    exids := '{}'; used := '{}'; first_c := true; n := 0; niso := 0;
    for j in 0..jsonb_array_length(ses->split[i]->'x')-1 loop
      exit when n >= nex;
      key := ses->split[i]->'x'->>j;
      if beg and lib->key ? 'beg' then key := lib->key->>'beg'; end if;
      if back and lib->key ? 'bk' then key := lib->key->>'bk'; end if;
      if shoulder and lib->key ? 'sh' then key := lib->key->>'sh'; end if;
      if knee and lib->key ? 'kn' then key := lib->key->>'kn'; end if;
      if key = any(used) then continue; end if;
      e := lib->key; used := used || key; n := n + 1;
      if salut or beg then ns := 2;
      elsif e->>'t'='c' then ns := 3;
      else niso := niso + 1; ns := case when adv and niso <= 2 then 3 else 2 end; end if;
      if salut then rmin := 10; rmax := 15;
      elsif e->>'t'='i' then rmin := 10; rmax := 15;
      elsif forca and first_c and not beg then rmin := 4; rmax := 6;
      elsif beg then rmin := 8; rmax := 12;
      else rmin := 6; rmax := 10; end if;
      if e->>'t'='c' then first_c := false; end if;
      select jsonb_agg(jsonb_build_object('min',rmin,'max',rmax)) into ranges from generate_series(1,ns);
      insert into public.docs(user_id,col,id,data) values (client,'exercises','g-'||key,
        jsonb_build_object('name',e->>'n','muscle',e->>'m','ranges',ranges,'repMin',rmin,'repMax',rmax,
          'inc', case when e->>'t'='c' then 2.5 else 1 end,'source','regles','createdAt',now()))
      on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
      exids := exids || ('g-'||key);
    end loop;
    tname := 'Rutina ' || i || ' · ' || (ses->split[i]->>'n');
    insert into public.docs(user_id,col,id,data) values (client,'templates','rutina-'||i,
      jsonb_build_object('name',tname,'order',i,'exIds',to_jsonb(exids),'source','regles','note',rir,'createdAt',now()))
    on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
  end loop;

  insert into public.docs(user_id,col,id,data) values (client,'programs','inicial',
    jsonb_build_object('status','provisional','source','regles','generatedAt',now(),'reviewDue',now()+interval '24 hours',
      'split',split_name,'days',days,'exercisesPerSession',nex,'rir',rir,'flags',to_jsonb(flags)))
  on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;

  insert into public.notifications(user_id,title,body,url) values (client,'🏋️ La teva rutina ja està llesta',
    'És una rutina provisional feta amb la teva fitxa. El teu entrenador titulat la revisarà i personalitzarà en menys de 24 h.','./#avui');
  return jsonb_build_object('ok',true,'split',split_name,'routines',array_length(split,1),'perSession',nex,'flags',to_jsonb(flags));
end $$;
revoke execute on function public.gen_initial_plan(uuid) from anon, authenticated, public;
