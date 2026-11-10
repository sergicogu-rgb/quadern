create or replace function public.push_test() returns void
language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,title,body)
  select auth.uid(), '✅ Notificacions activades', 'Així et sortiran el pla del dia i l''informe del diumenge.'
  where auth.uid() is not null;
$$;
revoke execute on function public.push_test() from public, anon;
grant execute on function public.push_test() to authenticated;
