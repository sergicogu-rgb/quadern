-- Pla inicial v4 (2026-11-12, VSCOMA_04): regla de l'entrenador per a tots els clients.
--   Dia de cama = cama + bíceps + tríceps. Dia superior (tors) = pit, espatlla i esquena, sense braços.
--   5 dies: recomanem 4 (freqüència 2 de cada grup); el 5è dia és opcional i el client tria superior (rutina 5)
--           o inferior (rutina 6). Aquestes dues no compten al resum de volum setmanal.
--   6 dies (empenta / tracció / cama): sense canvis de moment.
-- Es fa sobre la versió viva amb replace() i comprovació que cada canvi s'ha aplicat.
do $mig$
declare d text; d0 text;
begin
  d := pg_get_functiondef('public.gen_initial_plan(uuid)'::regprocedure);

  d0 := d; d := replace(d,
    '"TA":{"n":"Tors A","x":["press_pit_maq","jalo","press_esp_maq","rem_politja","laterals_maq","curl_maq","triceps_politja","peck_deck"]},',
    '"TA":{"n":"Tors A","x":["press_pit_maq","jalo","press_esp_maq","rem_politja","laterals_maq","peck_deck","face_pull","deltoide_post"]},');
  if d = d0 then raise exception 'v4: no trobo TA'; end if;

  d0 := d; d := replace(d,
    '"CA":{"n":"Cama A","x":["hack","hip_thrust_maq","leg_curl_ass","leg_ext","bessons","crunch_maq","adductors"]},',
    '"CA":{"n":"Cama A","x":["hack","hip_thrust_maq","leg_curl_ass","leg_ext","curl_maq","triceps_politja","bessons","crunch_maq","adductors"]},');
  if d = d0 then raise exception 'v4: no trobo CA'; end if;

  d0 := d; d := replace(d,
    '"TB":{"n":"Tors B","x":["press_incl_maq","rem_pit_rec","jalo_neutre","laterals_politja","curl_bayesian","triceps_cap","peck_deck","deltoide_post"]},',
    '"TB":{"n":"Tors B","x":["press_incl_maq","rem_pit_rec","jalo_neutre","laterals_politja","peck_deck","deltoide_post","face_pull"]},');
  if d = d0 then raise exception 'v4: no trobo TB'; end if;

  d0 := d; d := replace(d,
    '"CB":{"n":"Cama B","x":["premsa","leg_curl_est","abductors","leg_ext","bessons","crunch_politja","hiperext"]},',
    '"CB":{"n":"Cama B","x":["premsa","leg_curl_est","leg_ext","curl_bayesian","triceps_cap","abductors","bessons","crunch_politja","hiperext"]},'
    || chr(10) || '   "TC":{"n":"Dia 5 opcional · superior (o la rutina 6)","x":["press_incl_maq","rem_politja","jalo_neutre","laterals_maq","creuat_politja","face_pull"]},'
    || chr(10) || '   "CC":{"n":"Dia 5 opcional · inferior (o la rutina 5)","x":["premsa","hip_thrust_maq","leg_curl_ass","curl_politja","triceps_maq","bessons","crunch_maq"]},');
  if d = d0 then raise exception 'v4: no trobo CB'; end if;

  d0 := d; d := replace(d, 'when 5 then array[''TA'',''CA'',''TB'',''CB'',''BR'']', 'when 5 then array[''TA'',''CA'',''TB'',''CB'',''TC'',''CC'']');
  if d = d0 then raise exception 'v4: no trobo el split de 5 dies'; end if;

  d0 := d; d := replace(d, '  rir := case when salut',
    '  if days = 5 then flags := flags || ''Ha demanat 5 dies: recomanem 4 (freqüència 2 de cada grup). El 5è dia és opcional: tria superior (rutina 5) o inferior (rutina 6)''::text; end if;'
    || chr(10) || '  rir := case when salut');
  if d = d0 then raise exception 'v4: no trobo rir'; end if;

  d0 := d; d := replace(d, '      vol := jsonb_set(vol, array[m],',
    '      if days = 5 and i > 4 then continue; end if;' || chr(10) || '      vol := jsonb_set(vol, array[m],');
  if d = d0 then raise exception 'v4: no trobo el càlcul de volum'; end if;

  execute d;
end $mig$;
