-- Apartat "Jo": fotos de progrés i mesures del cos (col·lecció 'body', id = data).
-- Les fotos de progrés van a un bucket PRIVAT ('progres'): només el client i el seu entrenador les poden veure (URL signades).

create or replace function public.can_write_doc(owner uuid, c text)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case
    when owner = (select auth.uid()) then exists(
      select 1 from public.profiles p where p.id = owner and (
        p.role = 'coach'
        or (p.coach_id is not null and c = any(array['sessions','bodyweight','kcallog','drafts','intake','checkins','body']) and public.has_consent(owner))))
    when public.is_coach_of(owner) then c = any(array['exercises','templates','targets','programs','nutrition','reports'])
    else false end;
$function$;

insert into storage.buckets (id, name, public) values ('progres','progres', false) on conflict (id) do update set public = false;

create policy "progres: pujar a la meva carpeta" on storage.objects
  for insert to authenticated with check (bucket_id = 'progres' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progres: veure les meves o dels meus clients" on storage.objects
  for select to authenticated using (bucket_id = 'progres' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.is_coach_of(((storage.foldername(name))[1])::uuid))));
create policy "progres: esborrar les meves" on storage.objects
  for delete to authenticated using (bucket_id = 'progres' and (storage.foldername(name))[1] = (select auth.uid())::text);
