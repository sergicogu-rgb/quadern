-- Consells de la pauta inicial sense registre de kcal (ordre de l'usuari, 17/11): la pauta s'ajusta només pel pes.
-- Canvia només dos textos de gen_initial_diet sobre la definició en viu (la resta queda igual que a 20261112141000).
do $do$
declare d text := pg_get_functiondef('public.gen_initial_diet(uuid)'::regprocedure);
begin
  d := replace(d, '''Pesa''''t cada dia en dejú i apunta les kcal: es controla la mitjana setmanal''',
                  '''Pesa''''t cada dia en dejú: es controla la mitjana setmanal del pes''');
  d := replace(d, '''1 àpat lliure a la setmana: apunta''''l aproximadament (orientatiu 1.000-1.200 kcal)''',
                  '''1 àpat lliure a la setmana (orientatiu 1.000-1.200 kcal)''');
  if d ilike '%apunta les kcal%' or d ilike '%apunta''''l aprox%' then raise exception 'no s''han trobat els textos'; end if;
  execute d;
end $do$;

-- Pautes ja creades: mateixos dos consells
update public.docs set data = replace(replace(data::text,
    'Pesa''t cada dia en dejú i apunta les kcal: es controla la mitjana setmanal', 'Pesa''t cada dia en dejú: es controla la mitjana setmanal del pes'),
    '1 àpat lliure a la setmana: apunta''l aproximadament', '1 àpat lliure a la setmana')::jsonb,
  updated_at = now()
where col = 'nutrition' and not deleted and data::text ~ 'apunta les kcal|apunta''l aproximadament';
