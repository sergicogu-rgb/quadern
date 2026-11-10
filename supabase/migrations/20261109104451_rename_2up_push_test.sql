create or replace function public.push_test() returns void
language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,title,body)
  select auth.uid(), '✅ Notificacions de 2UP activades', 'Així et sortiran el pla del dia, els missatges d''Atlas i l''informe del diumenge.'
  where auth.uid() is not null;
$$;
revoke execute on function public.push_test() from public, anon;
grant execute on function public.push_test() to authenticated;
