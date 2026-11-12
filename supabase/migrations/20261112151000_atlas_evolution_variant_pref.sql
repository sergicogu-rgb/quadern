-- Atlas Evolution: avatar_refresh retorna també la preferència d'avatar del perfil (auto, m o f).
do $mig$
declare d text; d0 text;
begin
  d := pg_get_functiondef('public.avatar_refresh(uuid)'::regprocedure);
  d0 := d; d := replace(d, '''variant'',variant,', '''variant'',variant,''variant_pref'',st.variant,');
  if d = d0 then raise exception 'no trobo variant'; end if;
  execute d;
end $mig$;
