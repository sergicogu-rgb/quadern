-- 1. Perfils: correu visible per a l'entrenador i protecció del rol
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

-- 2. Invitacions
create table if not exists public.invites (
  email text primary key,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  user_id uuid references auth.users(id) on delete set null
);
alter table public.invites enable row level security;
create policy "invites: llegir les meves" on public.invites for select to authenticated using (coach_id = (select auth.uid()));
create policy "invites: esborrar les meves" on public.invites for delete to authenticated using (coach_id = (select auth.uid()) and accepted_at is null);
create index if not exists invites_coach_idx on public.invites(coach_id);

-- 3. Consentiments RGPD
create table if not exists public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  version text not null,
  health boolean not null,
  ai boolean not null default false,
  adult boolean not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  revoked_at timestamptz
);
alter table public.consents enable row level security;
create index if not exists consents_user_idx on public.consents(user_id);
create policy "consents: crear el meu" on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()) and health and adult and revoked_at is null);
create policy "consents: llegir el meu o dels meus clients" on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or public.is_coach_of(user_id));
create policy "consents: retirar el meu" on public.consents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and revoked_at is not null);
revoke update on public.consents from authenticated;
grant update (revoked_at) on public.consents to authenticated;

create or replace function public.has_consent(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.consents c where c.user_id = target and c.revoked_at is null and c.health);
$$;

-- 4. Qui pot escriure cada col·lecció
create or replace function public.can_write_doc(owner uuid, c text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when owner = (select auth.uid()) then exists(
      select 1 from public.profiles p where p.id = owner and (
        p.role = 'coach'
        or (p.coach_id is not null and c = any(array['sessions','bodyweight','kcallog','drafts']) and public.has_consent(owner))))
    when public.is_coach_of(owner) then c = any(array['exercises','templates','targets','programs','nutrition','reports'])
    else false end;
$$;

drop policy if exists "docs: crear els meus" on public.docs;
drop policy if exists "docs: editar els meus" on public.docs;
drop policy if exists "docs: esborrar els meus" on public.docs;
create policy "docs: crear" on public.docs for insert to authenticated with check (public.can_write_doc(user_id, col));
create policy "docs: editar" on public.docs for update to authenticated using (public.can_write_doc(user_id, col)) with check (public.can_write_doc(user_id, col));
create policy "docs: esborrar" on public.docs for delete to authenticated using (public.can_write_doc(user_id, col));

-- 5. Usuari nou: si té invitació, queda lligat a l'entrenador
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare inv public.invites;
begin
  select * into inv from public.invites i where lower(i.email) = lower(new.email) and i.accepted_at is null;
  insert into public.profiles (id, name, email, coach_id)
  values (new.id, coalesce(inv.name, split_part(new.email,'@',1)), new.email, inv.coach_id);
  if inv.email is not null then
    update public.invites set accepted_at = now(), user_id = new.id where email = inv.email;
  end if;
  return new;
end; $$;

-- 6. Resum per al panell de l'entrenador
create or replace function public.coach_overview()
returns table (id uuid, name text, email text, created_at timestamptz, consent_at timestamptz, ai boolean,
  last_session date, sessions_7d int, last_weight numeric, last_weight_date date, kcal_7d numeric, kcal_days_7d int)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.email, p.created_at, c.accepted_at, coalesce(c.ai,false),
    (select max((d.data->>'date')::date) from public.docs d where d.user_id=p.id and d.col='sessions' and not d.deleted),
    (select count(*)::int from public.docs d where d.user_id=p.id and d.col='sessions' and not d.deleted and (d.data->>'date')::date > current_date-7),
    (select (d.data->>'kg')::numeric from public.docs d where d.user_id=p.id and d.col='bodyweight' and not d.deleted and d.data ? 'date' order by d.data->>'date' desc limit 1),
    (select max((d.data->>'date')::date) from public.docs d where d.user_id=p.id and d.col='bodyweight' and not d.deleted and d.data ? 'kg'),
    (select round(avg((d.data->>'kcal')::numeric)) from public.docs d where d.user_id=p.id and d.col='kcallog' and not d.deleted and (d.data->>'date')::date > current_date-7),
    (select count(*)::int from public.docs d where d.user_id=p.id and d.col='kcallog' and not d.deleted and (d.data->>'date')::date > current_date-7)
  from public.profiles p
  left join lateral (select accepted_at, ai from public.consents x where x.user_id=p.id and x.revoked_at is null order by accepted_at desc limit 1) c on true
  where p.coach_id = (select auth.uid())
  order by p.name;
$$;

-- 7. Desvincular un client
create or replace function public.coach_unlink(client uuid) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set coach_id = null where id = client and coach_id = (select auth.uid());
$$;

revoke execute on function public.coach_overview() from anon, public;
revoke execute on function public.coach_unlink(uuid) from anon, public;
revoke execute on function public.can_write_doc(uuid,text) from anon, public;
revoke execute on function public.has_consent(uuid) from anon, public;
grant execute on function public.coach_overview() to authenticated;
grant execute on function public.coach_unlink(uuid) to authenticated;
grant execute on function public.can_write_doc(uuid,text) to authenticated;
grant execute on function public.has_consent(uuid) to authenticated;
