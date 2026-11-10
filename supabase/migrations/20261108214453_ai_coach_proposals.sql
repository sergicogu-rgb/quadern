create table if not exists public.proposals(
  id bigint generated always as identity primary key,
  client_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('setmana','inicial','ajust')),
  week date,
  title text not null,
  summary text,            -- raonament per a l'entrenador (no el veu el client)
  message text,            -- missatge de l'entrenador IA per al client
  payload jsonb not null default '{"docs":[]}'::jsonb,  -- {docs:[{col,id,data,label}]}
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded')),
  created_at timestamptz default now(), decided_at timestamptz, coach_note text);
create index if not exists proposals_coach on public.proposals(coach_id, status, created_at desc);
create index if not exists proposals_client on public.proposals(client_id, created_at desc);
alter table public.proposals enable row level security;
create policy "proposals: coach llegeix" on public.proposals for select to authenticated using (coach_id = (select auth.uid()));

-- Aprovar / rebutjar una proposta (només l'entrenador del client)
create or replace function public.proposal_decide(pid bigint, approve boolean, msg text default null, note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.proposals; d jsonb; n int := 0; m text;
begin
  select * into p from public.proposals where id = pid for update;
  if p.id is null or p.coach_id <> (select auth.uid()) then raise exception 'No autoritzat'; end if;
  if p.status <> 'pending' then raise exception 'Aquesta proposta ja està decidida'; end if;
  if not approve then
    update public.proposals set status='rejected', decided_at=now(), coach_note=note where id=pid;
    return jsonb_build_object('ok',true,'status','rejected');
  end if;
  if not exists(select 1 from public.profiles x where x.id=p.client_id and x.coach_id=p.coach_id) then raise exception 'Ja no és client teu'; end if;
  for d in select * from jsonb_array_elements(coalesce(p.payload->'docs','[]'::jsonb)) loop
    if (d->>'col') = any(array['exercises','templates','targets','programs','nutrition','reports']) and coalesce(d->>'id','')<>'' then
      insert into public.docs(user_id,col,id,data,deleted) values (p.client_id, d->>'col', d->>'id', d->'data', d->'data' is null or d->'data'='null'::jsonb)
      on conflict (user_id,col,id) do update set data=excluded.data, deleted=excluded.deleted;
      n := n + 1;
    end if;
  end loop;
  m := nullif(trim(coalesce(msg, p.message, '')), '');
  if m is not null then
    insert into public.docs(user_id,col,id,data) values (p.client_id,'reports','q-'||p.id,
      jsonb_build_object('week', coalesce(p.week, current_date)::text, 'title', p.title, 'text', m, 'from', 'ia', 'createdAt', now()))
    on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
    insert into public.notifications(user_id,title,body) values (p.client_id, left(p.title,60), left(regexp_replace(m,'[*#|_]','','g'),170));
  end if;
  update public.proposals set status='approved', decided_at=now(), coach_note=note, message=coalesce(m,p.message) where id=pid;
  return jsonb_build_object('ok',true,'status','approved','docs',n);
end $$;
revoke execute on function public.proposal_decide(bigint,boolean,text,text) from public, anon;
grant execute on function public.proposal_decide(bigint,boolean,text,text) to authenticated;

-- Avís a l'entrenador quan la IA deixa propostes noves
create or replace function public.notify_coach_proposal() returns trigger
language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  select coalesce(name,email) into nm from public.profiles where id=new.client_id;
  insert into public.notifications(user_id,title,body,url) values (new.coach_id, '🤖 Proposta per a '||coalesce(nm,'un client'), left(new.title,160), './#clients');
  return new;
end $$;
revoke execute on function public.notify_coach_proposal() from public, anon, authenticated;
drop trigger if exists proposals_notify on public.proposals;
create trigger proposals_notify after insert on public.proposals for each row execute function public.notify_coach_proposal();

-- Afegeix el recompte de propostes pendents al panell
drop function if exists public.coach_overview();
create function public.coach_overview()
 returns table(id uuid, name text, email text, created_at timestamptz, consent_at timestamptz, ai boolean, last_session date, sessions_7d integer, last_weight numeric, last_weight_date date, kcal_7d numeric, kcal_days_7d integer, intake_done boolean, intake_alert boolean, proposals_pending integer)
 language sql stable security definer set search_path to '' as $function$
  select p.id, p.name, p.email, p.created_at, c.accepted_at, coalesce(c.ai,false),
    (select max((d.data->>'date')::date) from public.docs d where d.user_id=p.id and d.col='sessions' and not d.deleted),
    (select count(*)::int from public.docs d where d.user_id=p.id and d.col='sessions' and not d.deleted and (d.data->>'date')::date > current_date-7),
    (select (d.data->>'kg')::numeric from public.docs d where d.user_id=p.id and d.col='bodyweight' and not d.deleted and d.data ? 'date' order by d.data->>'date' desc limit 1),
    (select max((d.data->>'date')::date) from public.docs d where d.user_id=p.id and d.col='bodyweight' and not d.deleted and d.data ? 'kg'),
    (select round(avg((d.data->>'kcal')::numeric)) from public.docs d where d.user_id=p.id and d.col='kcallog' and not d.deleted and (d.data->>'date')::date > current_date-7),
    (select count(*)::int from public.docs d where d.user_id=p.id and d.col='kcallog' and not d.deleted and (d.data->>'date')::date > current_date-7),
    exists(select 1 from public.docs d where d.user_id=p.id and d.col='intake' and d.id='inicial' and not d.deleted),
    exists(select 1 from public.docs d where d.user_id=p.id and d.col='intake' and d.id='inicial' and not d.deleted and coalesce((d.data->>'parqAlert')::boolean,false)),
    (select count(*)::int from public.proposals x where x.client_id=p.id and x.coach_id=p.coach_id and x.status='pending')
  from public.profiles p
  left join lateral (select accepted_at, ai from public.consents x where x.user_id=p.id and x.revoked_at is null order by accepted_at desc limit 1) c on true
  where p.coach_id = (select auth.uid())
  order by p.name;
$function$;
revoke execute on function public.coach_overview() from public, anon;
grant execute on function public.coach_overview() to authenticated;
