-- Consentiment DESACTIVAT de moment per decisió de l'entrenador (2026-11-19, CLIENTS_01).
-- Fins ara, sense un consentiment de salut acceptat el client no podia desar res (can_write_doc → has_consent).
-- L'interruptor és consent_required(): per tornar-lo a activar, fes que retorni true
-- i posa CONSENT_ON=true a store.js. La taula consents i el codi de la pantalla no es toquen.
create or replace function public.consent_required()
 returns boolean language sql immutable set search_path to ''
as $$ select false $$;

create or replace function public.has_consent(target uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select not public.consent_required()
      or exists(select 1 from public.consents c where c.user_id = target and c.revoked_at is null and c.health);
$function$;
