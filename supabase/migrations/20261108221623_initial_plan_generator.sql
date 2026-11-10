-- (2026-11-10) Bolcat parcial: l'original començava amb una primera versió de
-- public.gen_initial_plan(uuid), que la migració següent (20261108221733_initial_plan_generator_v2)
-- substitueix sencera amb create or replace. Aquí només queda la resta, que sí que cal per reconstruir.
revoke execute on function public.gen_initial_plan(uuid) from anon, authenticated, public;

-- Disparador: fitxa nova i cap rutina → rutina provisional
create or replace function public.on_intake_gen_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.col='intake' and new.id='inicial' and not new.deleted
     and exists(select 1 from public.profiles p where p.id=new.user_id and p.coach_id is not null)
     and not exists(select 1 from public.docs d where d.user_id=new.user_id and d.col='templates' and not d.deleted) then
    perform public.gen_initial_plan(new.user_id);
  end if;
  return new;
end $$;
revoke execute on function public.on_intake_gen_plan() from anon, authenticated, public;
drop trigger if exists docs_a_gen_plan on public.docs;
create trigger docs_a_gen_plan after insert on public.docs for each row when (new.col='intake') execute function public.on_intake_gen_plan();

-- Avís a l'entrenador: fitxa + rutina provisional per revisar
create or replace function public.notify_coach_intake() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.profiles; alert boolean; prov boolean;
begin
  if new.col <> 'intake' or new.id <> 'inicial' or new.deleted then return new; end if;
  if tg_op = 'UPDATE' and old.data is not distinct from new.data and not old.deleted then return new; end if;
  select * into p from public.profiles where id = new.user_id;
  if p.coach_id is null then return new; end if;
  alert := coalesce((new.data->>'parqAlert')::boolean, false);
  prov := exists(select 1 from public.docs d where d.user_id=new.user_id and d.col='programs' and d.id='inicial' and not d.deleted and d.data->>'status'='provisional');
  insert into public.notifications (user_id, title, body, url)
  values (p.coach_id,
    '📋 ' || coalesce(p.name,'Un client') || case when tg_op='INSERT' or old.deleted then ' ha omplert la fitxa' else ' ha actualitzat la fitxa' end,
    concat_ws(' · ', nullif(new.data->>'goal',''), nullif(new.data->>'days','') || ' dies',
      case when alert then '⚠️ Salut: revisar' end,
      case when prov and tg_op='INSERT' then 'Rutina provisional creada: revisa-la abans de 24 h' else 'Obre-la a Clients' end),
    './#clients');
  return new;
end; $$;

-- Quan l'entrenador valida la rutina → avís al client
create or replace function public.notify_client_plan_reviewed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.col='programs' and new.id='inicial' and coalesce(old.data->>'status','')='provisional' and new.data->>'status'='revisat'
     and coalesce(new.data->>'via','') <> 'proposal' then
    insert into public.notifications(user_id,title,body,url) values (new.user_id,'✅ Rutina revisada',
      'El teu entrenador titulat ha revisat i validat la teva rutina. Endavant!','./#avui');
  end if;
  return new;
end $$;
revoke execute on function public.notify_client_plan_reviewed() from anon, authenticated, public;
drop trigger if exists docs_notify_plan_reviewed on public.docs;
create trigger docs_notify_plan_reviewed after update on public.docs for each row when (new.col='programs') execute function public.notify_client_plan_reviewed();

-- En aprovar una proposta inicial de Q, la rutina passa a revisada
create or replace function public.proposal_decide(pid bigint, approve boolean, msg text default null, note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $function$
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
  if p.kind='inicial' then
    update public.docs set deleted=true where user_id=p.client_id and col='templates' and data->>'source'='regles';
  end if;
  for d in select * from jsonb_array_elements(coalesce(p.payload->'docs','[]'::jsonb)) loop
    if (d->>'col') = any(array['exercises','templates','targets','programs','nutrition','reports']) and coalesce(d->>'id','')<>'' then
      insert into public.docs(user_id,col,id,data,deleted) values (p.client_id, d->>'col', d->>'id', d->'data', d->'data' is null or d->'data'='null'::jsonb)
      on conflict (user_id,col,id) do update set data=excluded.data, deleted=excluded.deleted;
      n := n + 1;
    end if;
  end loop;
  if p.kind='inicial' then
    update public.docs set data = data || jsonb_build_object('status','revisat','reviewedAt',now(),'via','proposal')
      where user_id=p.client_id and col='programs' and id='inicial';
  end if;
  m := nullif(trim(coalesce(msg, p.message, '')), '');
  if m is not null then
    insert into public.docs(user_id,col,id,data) values (p.client_id,'reports','q-'||p.id,
      jsonb_build_object('week', coalesce(p.week, current_date)::text, 'title', p.title, 'text', m, 'from', 'ia', 'createdAt', now()))
    on conflict (user_id,col,id) do update set data=excluded.data, deleted=false;
    insert into public.notifications(user_id,title,body) values (p.client_id, left(p.title,60), left(regexp_replace(m,'[*#|_]','','g'),170));
  end if;
  update public.proposals set status='approved', decided_at=now(), coach_note=note, message=coalesce(m,p.message) where id=pid;
  return jsonb_build_object('ok',true,'status','approved','docs',n);
end $function$;
