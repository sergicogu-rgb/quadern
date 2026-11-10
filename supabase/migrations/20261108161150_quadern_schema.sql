-- Perfils d'usuari (preparat per a entrenador + clients)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'client' check (role in ('client','coach')),
  coach_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_coach_of(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = target and p.coach_id = (select auth.uid()));
$$;

create policy "profiles: llegir el propi o els meus clients" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or coach_id = (select auth.uid()));
create policy "profiles: editar el propi nom" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, split_part(new.email,'@',1));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Documents de l'app: una fila per document (col·lecció + id), dades en JSON
create table public.docs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  col text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);
create index docs_user_updated on public.docs (user_id, updated_at);
alter table public.docs enable row level security;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger docs_touch before insert or update on public.docs
  for each row execute function public.touch_updated_at();

create policy "docs: llegir els meus o dels meus clients" on public.docs
  for select to authenticated using (user_id = (select auth.uid()) or public.is_coach_of(user_id));
create policy "docs: crear els meus" on public.docs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "docs: editar els meus" on public.docs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "docs: esborrar els meus" on public.docs
  for delete to authenticated using (user_id = (select auth.uid()));

-- Fotos dels exercicis
insert into storage.buckets (id, name, public) values ('fotos','fotos', true) on conflict (id) do nothing;
create policy "fotos: pujar a la meva carpeta" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: actualitzar les meves" on storage.objects
  for update to authenticated using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: esborrar les meves" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
