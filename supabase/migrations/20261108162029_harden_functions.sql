revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_coach_of(uuid) from public, anon;
grant execute on function public.is_coach_of(uuid) to authenticated;
