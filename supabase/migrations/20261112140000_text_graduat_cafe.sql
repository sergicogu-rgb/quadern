-- 2026-11-12 (VSCOMA_04): "entrenador titulat" -> "entrenador, graduat en Ciències de l'Activitat Física i l'Esport,"
-- als textos de notificació de gen_initial_plan i notify_client_plan_reviewed. Només canvia text.
do $$
declare r record;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('gen_initial_plan','notify_client_plan_reviewed')
  loop
    execute replace(pg_get_functiondef(r.oid), 'El teu entrenador titulat',
      'El teu entrenador, graduat en Ciències de l''''Activitat Física i l''''Esport,');
  end loop;
end $$;
