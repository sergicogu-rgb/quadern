-- Valoració inicial v2 i rutina en esborrany (2026-11-18, CLIENTS_01).
--  1. gen_initial_plan: si la fitxa és version>=2 (valoració), el programa queda status 'esborrany' (el client no el veu
--     fins que l'entrenador el valida) i no s'avisa el client. Les zones de lesió marcades (assessment.answers.injZ) també compten.
--     Dia de cama: 2 exercicis de cama i 1 de braços, abdominals al final (regla de l'entrenador).
--  2. notify_coach_intake: «ha enviat la valoració inicial» i avís de la rutina en esborrany.
--  3. notify_client_plan_reviewed: d'esborrany a revisat → «La teva rutina ja està llesta» amb el missatge de l'entrenador.
--  4. coach_overview: «Rutina per revisar» també per als esborranys.
-- Es fa sobre les versions vives amb replace() i es comprova que cada canvi s'aplica.
do $mig$
declare d text; d0 text;
begin
  d := pg_get_functiondef('public.gen_initial_plan(uuid)'::regprocedure);

  d0 := d; d := replace(d,
    '"CA":{"n":"Cama A","x":["hack","hip_thrust_maq","leg_curl_ass","leg_ext","curl_maq","triceps_politja","bessons","crunch_maq","adductors"]},',
    '"CA":{"n":"Cama A","x":["hack","hip_thrust_maq","curl_maq","leg_curl_ass","leg_ext","triceps_politja","bessons","adductors","crunch_maq"]},');
  if d = d0 then raise exception 'v5: no trobo CA'; end if;
  d0 := d; d := replace(d,
    '"CB":{"n":"Cama B","x":["premsa","leg_curl_est","leg_ext","curl_bayesian","triceps_cap","abductors","bessons","crunch_politja","hiperext"]},',
    '"CB":{"n":"Cama B","x":["premsa","leg_curl_est","curl_bayesian","leg_ext","abductors","triceps_cap","hiperext","bessons","crunch_politja"]},');
  if d = d0 then raise exception 'v5: no trobo CB'; end if;
  d0 := d; d := replace(d,
    '"CC":{"n":"Dia 5 opcional · inferior (o la rutina 5)","x":["premsa","hip_thrust_maq","leg_curl_ass","curl_politja","triceps_maq","bessons","crunch_maq"]},',
    '"CC":{"n":"Dia 5 opcional · inferior (o la rutina 5)","x":["premsa","hip_thrust_maq","curl_politja","leg_curl_ass","bessons","triceps_maq","crunch_maq"]},');
  if d = d0 then raise exception 'v5: no trobo CC'; end if;

  d0 := d; d := replace(d,
    '  if knee then flags := flags ||',
    '  knee := knee or coalesce(ik->''assessment''->''answers''->''injZ'',''[]''::jsonb) ? ''Genoll'';' || chr(10) ||
    '  back := back or coalesce(ik->''assessment''->''answers''->''injZ'',''[]''::jsonb) ?| array[''Esquena baixa'',''Esquena alta''];' || chr(10) ||
    '  shoulder := shoulder or coalesce(ik->''assessment''->''answers''->''injZ'',''[]''::jsonb) ? ''Espatlla'';' || chr(10) ||
    '  if knee then flags := flags ||');
  if d = d0 then raise exception 'v5: no trobo les lesions'; end if;

  d0 := d; d := replace(d,
    'jsonb_build_object(''status'',''provisional'',''source'',''regles''',
    'jsonb_build_object(''status'',case when coalesce((ik->>''version'')::int,1) >= 2 then ''esborrany'' else ''provisional'' end,''source'',''regles''');
  if d = d0 then raise exception 'v5: no trobo l''estat'; end if;

  d0 := d; d := replace(d,
    'if not exists(select 1 from public.notifications n where n.user_id=client and n.title like ''🏋️ La teva rutina%'') then',
    'if coalesce((ik->>''version'')::int,1) < 2 and not exists(select 1 from public.notifications n where n.user_id=client and n.title like ''🏋️ La teva rutina%'') then');
  if d = d0 then raise exception 'v5: no trobo l''avís al client'; end if;
  execute d;

  d := pg_get_functiondef('public.coach_overview()'::regprocedure);
  d0 := d; d := replace(d, 'd.data->>''status''=''provisional''', 'd.data->>''status'' in (''provisional'',''esborrany'')');
  if d = d0 then raise exception 'v5: no trobo coach_overview'; end if;
  execute d;
end $mig$;

create or replace function public.notify_coach_intake()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare p public.profiles; alert boolean; prov boolean; v2 boolean;
begin
  if new.col <> 'intake' or new.id <> 'inicial' or new.deleted then return new; end if;
  if tg_op = 'UPDATE' and old.data is not distinct from new.data and not old.deleted then return new; end if;
  select * into p from public.profiles where id = new.user_id;
  if p.coach_id is null then return new; end if;
  alert := coalesce((new.data->>'parqAlert')::boolean, false);
  v2 := coalesce((new.data->>'version')::int,1) >= 2;
  prov := exists(select 1 from public.docs d where d.user_id=new.user_id and d.col='programs' and d.id='inicial' and not d.deleted and d.data->>'status' in ('provisional','esborrany'));
  insert into public.notifications (user_id, title, body, url)
  values (p.coach_id,
    '📋 ' || coalesce(p.name,'Un client') || case when tg_op='INSERT' or old.deleted then case when v2 then ' ha enviat la valoració inicial' else ' ha omplert la fitxa' end else ' ha actualitzat la fitxa' end,
    concat_ws(' · ', nullif(new.data->>'goal',''), nullif(new.data->>'days','') || ' dies',
      case when alert then '⚠️ Salut: revisar' end,
      case when prov and tg_op='INSERT' then case when v2 then 'Rutina en esborrany: adapta-la i envia-la' else 'Rutina provisional creada: revisa-la abans de 24 h' end else 'Obre-la a Clients' end),
    './#clients');
  return new;
end; $function$;

create or replace function public.notify_client_plan_reviewed()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare es boolean;
begin
  if new.col='programs' and new.id='inicial' and new.data->>'status'='revisat' and coalesce(new.data->>'via','') <> 'proposal' then
    if coalesce(old.data->>'status','')='provisional' then
      insert into public.notifications(user_id,title,body,url) values (new.user_id,'✅ Rutina revisada',
        'El teu entrenador, graduat en Ciències de l''Activitat Física i l''Esport, ha revisat i validat la teva rutina. Endavant!','./#avui');
    elsif coalesce(old.data->>'status','')='esborrany' then
      es := exists(select 1 from public.docs d where d.user_id=new.user_id and d.col='intake' and d.id='inicial' and d.data->>'lang'='es');
      insert into public.notifications(user_id,title,body,url) values (new.user_id,
        case when es then '🏋️ Tu rutina ya está lista' else '🏋️ La teva rutina ja està llesta' end,
        coalesce(nullif(left(regexp_replace(coalesce(new.data->>'welcome',''),'[*#|_]','','g'),170),''),
          case when es then 'Tu entrenador ha preparado tu rutina y tu pauta. ¡Vamos!' else 'El teu entrenador t''ha preparat la rutina i la pauta. Som-hi!' end),
        './#avui');
    end if;
  end if;
  return new;
end $function$;
