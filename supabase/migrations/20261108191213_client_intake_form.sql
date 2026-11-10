create or replace function public.can_write_doc(owner uuid, c text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when owner = (select auth.uid()) then exists(
      select 1 from public.profiles p where p.id = owner and (
        p.role = 'coach'
        or (p.coach_id is not null and c = any(array['sessions','bodyweight','kcallog','drafts','intake']) and public.has_consent(owner))))
    when public.is_coach_of(owner) then c = any(array['exercises','templates','targets','programs','nutrition','reports'])
    else false end;
$$;

drop function if exists public.coach_overview();
create function public.coach_overview()
returns table (id uuid, name text, email text, created_at timestamptz, consent_at timestamptz, ai boolean,
  last_session date, sessions_7d int, last_weight numeric, last_weight_date date, kcal_7d numeric, kcal_days_7d int,
  intake_done boolean, intake_alert boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.email, p.created_at, c.accepted_at, coalesce(c.ai,false),
    (select max((d.data->>'date')::date) from public.docs d where d.user_id=p.id and d.col='sessions' and not d.deleted),
    (select count(*)::int from public.docs d where d.user_id=p.id and d.col='sessions' and not d.deleted and (d.data->>'date')::date > current_date-7),
    (select (d.data->>'kg')::numeric from public.docs d where d.user_id=p.id and d.col='bodyweight' and not d.deleted and d.data ? 'date' order by d.data->>'date' desc limit 1),
    (select max((d.data->>'date')::date) from public.docs d where d.user_id=p.id and d.col='bodyweight' and not d.deleted and d.data ? 'kg'),
    (select round(avg((d.data->>'kcal')::numeric)) from public.docs d where d.user_id=p.id and d.col='kcallog' and not d.deleted and (d.data->>'date')::date > current_date-7),
    (select count(*)::int from public.docs d where d.user_id=p.id and d.col='kcallog' and not d.deleted and (d.data->>'date')::date > current_date-7),
    exists(select 1 from public.docs d where d.user_id=p.id and d.col='intake' and d.id='inicial' and not d.deleted),
    exists(select 1 from public.docs d where d.user_id=p.id and d.col='intake' and d.id='inicial' and not d.deleted and coalesce((d.data->>'parqAlert')::boolean,false))
  from public.profiles p
  left join lateral (select accepted_at, ai from public.consents x where x.user_id=p.id and x.revoked_at is null order by accepted_at desc limit 1) c on true
  where p.coach_id = (select auth.uid())
  order by p.name;
$$;
revoke execute on function public.coach_overview() from anon, public;
grant execute on function public.coach_overview() to authenticated;
