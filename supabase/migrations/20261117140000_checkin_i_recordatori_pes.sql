-- Fase 2 (17/11): check-in setmanal del client (col·lecció 'checkins') i recordatori push a les 12:00 si no hi ha pes del dia.

-- 1) El client pot escriure 'checkins'
create or replace function public.can_write_doc(owner uuid, c text)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case
    when owner = (select auth.uid()) then exists(
      select 1 from public.profiles p where p.id = owner and (
        p.role = 'coach'
        or (p.coach_id is not null and c = any(array['sessions','bodyweight','kcallog','drafts','intake','checkins']) and public.has_consent(owner))))
    when public.is_coach_of(owner) then c = any(array['exercises','templates','targets','programs','nutrition','reports'])
    else false end;
$function$;

-- 2) Recordatoris (hora de Madrid): 12:00 cada dia si no hi ha pes d'avui; diumenge a les 12:00 també el check-in.
--    Només clients amb entrenador, consentiment vigent i alguna subscripció push. Un sol avís de cada tipus per dia.
create or replace function public.daily_reminders(force boolean default false)
 returns int
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  loc timestamp := now() at time zone 'Europe/Madrid';
  d date := loc::date;
  ws date := d - ((extract(isodow from d)::int) - 1);
  n int := 0; k int;
begin
  if not force and extract(hour from loc) <> 12 then return 0; end if;

  insert into public.notifications(user_id, title, body, url)
  select p.id, '⚖️ Encara no tens el pes d''avui',
         'Si t''has pesat en dejú, apunta''l ara. Si no, demà al matí abans d''esmorzar.', './#avui'
  from public.profiles p
  where p.role <> 'coach' and p.coach_id is not null and public.has_consent(p.id)
    and exists (select 1 from public.push_subs s where s.user_id = p.id)
    and not exists (select 1 from public.docs x where x.user_id = p.id and x.col = 'bodyweight' and x.id = d::text and not x.deleted)
    and not exists (select 1 from public.notifications o where o.user_id = p.id and o.title like '⚖️%'
                    and (o.created_at at time zone 'Europe/Madrid')::date = d);
  get diagnostics k = row_count; n := n + k;

  if extract(isodow from d) = 7 then
    insert into public.notifications(user_id, title, body, url)
    select p.id, '📝 Check-in setmanal', 'Com ha anat la setmana? 30 segons i el teu entrenador ho tindrà en compte.', './#avui'
    from public.profiles p
    where p.role <> 'coach' and p.coach_id is not null and public.has_consent(p.id)
      and exists (select 1 from public.push_subs s where s.user_id = p.id)
      and not exists (select 1 from public.docs x where x.user_id = p.id and x.col = 'checkins' and x.id = ws::text and not x.deleted)
      and not exists (select 1 from public.notifications o where o.user_id = p.id and o.title like '📝%'
                      and (o.created_at at time zone 'Europe/Madrid')::date = d);
    get diagnostics k = row_count; n := n + k;
  end if;
  return n;
end $function$;
revoke execute on function public.daily_reminders(boolean) from public, anon, authenticated;

-- 3) pg_cron en UTC: a les 10 i a les 11 UTC (12:00 a Madrid a l'estiu o a l'hivern); la funció només actua quan a Madrid són les 12.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'recordatoris-12h';
select cron.schedule('recordatoris-12h', '0 10,11 * * *', $$select public.daily_reminders()$$);
