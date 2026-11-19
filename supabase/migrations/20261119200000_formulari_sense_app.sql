-- Clients sense app (2026-11-19, CLIENTS_01): l'entrenador crea un enllaç personal i el client respon la valoració
-- sense compte ni contrasenya. Les respostes queden associades a l'entrenador; la rutina es fa en PDF.
--  · form_links: un enllaç per persona (token aleatori), caduca en 7 dies i només es pot enviar un cop.
--  · form_responses: les respostes (mateix format que intake/inicial version:2). Només les veu el seu entrenador.
--  · form_link_info / form_submit: les úniques portes per a qui no té sessió (anon), i només amb un token vàlid.

create table if not exists public.form_links (
  token text primary key default encode(extensions.gen_random_bytes(18), 'hex'),
  coach_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz
);
create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  token text references public.form_links(token) on delete set null,
  name text,
  lang text,
  data jsonb not null,
  status text not null default 'pendent' check (status in ('pendent','enviada')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists form_responses_coach on public.form_responses(coach_id, created_at desc);

alter table public.form_links enable row level security;
alter table public.form_responses enable row level security;

create policy form_links_coach on public.form_links for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
create policy form_responses_coach_sel on public.form_responses for select to authenticated using (coach_id = auth.uid());
create policy form_responses_coach_upd on public.form_responses for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy form_responses_coach_del on public.form_responses for delete to authenticated using (coach_id = auth.uid());

-- anon no hi té cap política: amb RLS activat no pot llegir ni escriure aquestes taules.

-- Per a la pàgina del formulari: l'enllaç és vàlid? (nom per saludar; res més)
create or replace function public.form_link_info(t text)
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select coalesce((select jsonb_build_object('ok', l.used_at is null and l.expires_at > now(),
            'name', l.name, 'used', l.used_at is not null, 'expired', l.expires_at <= now())
     from public.form_links l where l.token = t), '{"ok":false}'::jsonb);
$$;

-- Enviar la valoració: un sol cop per enllaç, mida limitada, avisa l'entrenador
create or replace function public.form_submit(t text, payload jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare l public.form_links; nm text;
begin
  select * into l from public.form_links where token = t for update;
  if l.token is null then raise exception 'Enllaç no vàlid'; end if;
  if l.used_at is not null then raise exception 'Aquest enllaç ja s''ha fet servir'; end if;
  if l.expires_at <= now() then raise exception 'Aquest enllaç ha caducat'; end if;
  if jsonb_typeof(payload) <> 'object' or pg_column_size(payload) > 200000 then raise exception 'Dades no vàlides'; end if;
  nm := left(coalesce(nullif(trim(payload->>'name'), ''), l.name), 80);
  insert into public.form_responses(coach_id, token, name, lang, data) values (l.coach_id, l.token, nm, left(payload->>'lang', 5), payload);
  update public.form_links set used_at = now() where token = t;
  insert into public.notifications(user_id, title, body, url)
  values (l.coach_id, '📋 ' || nm || ' ha enviat la valoració (sense app)',
          concat_ws(' · ', nullif(payload->>'goal', ''), nullif(payload->>'days', '') || ' dies',
                    case when coalesce((payload->>'parqAlert')::boolean, false) then '⚠️ Salut: revisar' end, 'Rutina en PDF'),
          './#clients');
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.form_link_info(text), public.form_submit(text, jsonb) to anon, authenticated;
