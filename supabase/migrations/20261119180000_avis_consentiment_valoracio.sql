-- Avís a l'entrenador quan el client accepta el consentiment: ara el pas següent és la valoració inicial (CLIENTS_01, 2026-11-19).
create or replace function public.notify_coach_consent()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.user_id;
  if p.coach_id is not null and new.revoked_at is null then
    insert into public.notifications (user_id, title, body, url)
    values (p.coach_id, '✅ ' || coalesce(p.name,'Un client') || ' ha acceptat les dades',
            'Ara ha de fer la valoració inicial. T''avisarem quan l''hagi enviada.', './#clients');
  end if;
  return new;
end; $function$;
