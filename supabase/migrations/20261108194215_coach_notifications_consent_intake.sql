create or replace function public.notify_coach_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.user_id;
  if p.coach_id is not null and new.revoked_at is null then
    insert into public.notifications (user_id, title, body, url)
    values (p.coach_id, '✅ ' || coalesce(p.name,'Un client') || ' ha acceptat les dades',
            'Ara ha d''omplir la fitxa inicial. T''avisarem quan la tingui.', './#clients');
  end if;
  return new;
end; $$;

create or replace function public.notify_coach_intake() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.profiles; alert boolean;
begin
  if new.col <> 'intake' or new.id <> 'inicial' or new.deleted then return new; end if;
  if tg_op = 'UPDATE' and old.data is not distinct from new.data and not old.deleted then return new; end if;
  select * into p from public.profiles where id = new.user_id;
  if p.coach_id is null then return new; end if;
  alert := coalesce((new.data->>'parqAlert')::boolean, false);
  insert into public.notifications (user_id, title, body, url)
  values (p.coach_id,
    '📋 ' || coalesce(p.name,'Un client') || case when tg_op='INSERT' or old.deleted then ' ha omplert la fitxa' else ' ha actualitzat la fitxa' end,
    concat_ws(' · ', nullif(new.data->>'goal',''), nullif(new.data->>'days','') || ' dies',
      case when alert then '⚠️ Salut: revisar' end, 'Obre-la a Clients.'),
    './#clients');
  return new;
end; $$;

revoke execute on function public.notify_coach_consent() from anon, authenticated, public;
revoke execute on function public.notify_coach_intake() from anon, authenticated, public;

drop trigger if exists consents_notify_coach on public.consents;
create trigger consents_notify_coach after insert on public.consents for each row execute function public.notify_coach_consent();
drop trigger if exists docs_notify_coach_intake on public.docs;
create trigger docs_notify_coach_intake after insert or update on public.docs for each row
  when (new.col = 'intake') execute function public.notify_coach_intake();
