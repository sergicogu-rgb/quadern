create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subs(
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null, auth text not null,
  ua text, created_at timestamptz default now());
alter table public.push_subs enable row level security;
create policy "own subs select" on public.push_subs for select to authenticated using (user_id = (select auth.uid()));
create policy "own subs insert" on public.push_subs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own subs update" on public.push_subs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own subs delete" on public.push_subs for delete to authenticated using (user_id = (select auth.uid()));
create index if not exists push_subs_user on public.push_subs(user_id);

create table if not exists public.notifications(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text, url text default './',
  created_at timestamptz default now(), sent_at timestamptz, read_at timestamptz, result jsonb);
alter table public.notifications enable row level security;
create policy "own notif select" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "own notif update" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists notifications_user on public.notifications(user_id, read_at);

-- clau privada VAPID: només accessible amb service role (RLS sense polítiques)
-- AVÍS (2026-11-10): els valors reals NO es desen al repositori (és públic). Estan a public.app_secrets
-- de la base de dades. Per reconstruir el projecte, genera claus noves (npx web-push generate-vapid-keys)
-- i substitueix-les aquí només en local.
create table if not exists public.app_secrets(name text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets values
 ('vapid_public','<REDACTAT>'),
 ('vapid_private','<REDACTAT>')
on conflict (name) do nothing;

create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://tsgvbxvrufuqlbzekmwd.supabase.co/functions/v1/push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type":"application/json"}'::jsonb);
  return new;
end $$;
revoke execute on function public.notify_push() from public, anon, authenticated;
drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.notify_push();
