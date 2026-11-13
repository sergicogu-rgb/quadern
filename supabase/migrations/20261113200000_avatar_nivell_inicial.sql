-- ELION Evolution (2026-11-13, VSCOMA_05): nivell inicial segons l'estat de forma de la fitxa.
-- Índex de forma = 60 % experiència + 40 % composició (greix estimat amb Deurenberg 1991:
--   %greix = 1,20·IMC + 0,23·edat − 10,8·home − 5,4; home 12 % → 100 i 30 % → 0; dona 22 % → 100 i 40 % → 0).
-- Nivell inicial: < 20 → 1, 20-39 → 2, 40-59 → 3, ≥ 60 → 4 (el 5 només s'aconsegueix entrenant).
-- El motor comença a comptar des dels punts del llindar d'aquest nivell; el nivell continua sense baixar mai.

create or replace function public.avatar_start_level(cid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  d jsonb; e text; ep numeric; cm numeric; kg numeric; age numeric; male int; bmi numeric; bf numeric; bp numeric; idx numeric; lv int;
begin
  select x.data into d from public.docs x where x.user_id = cid and x.col = 'intake' and x.id = 'inicial' and not x.deleted;
  if d is null then return jsonb_build_object('level', 1, 'reason', 'sense fitxa'); end if;
  e := lower(coalesce(d->>'exp', ''));
  ep := case when e ~ '^mai' then 0 when e ~ '^menys' then 20 when e ~ '^6 mesos' then 45 when e ~ '^2' then 75 when e ~ '^més' then 100 else 20 end;
  cm := nullif(d->>'cm', '')::numeric; kg := nullif(d->>'kg', '')::numeric;
  age := coalesce(date_part('year', age(current_date, nullif(d->>'birth', '')::date)), 30);
  male := case when d->>'sex' = 'h' then 1 else 0 end;
  if cm > 0 and kg > 0 then
    bmi := kg / ((cm / 100) ^ 2);
    bf := 1.20 * bmi + 0.23 * age - 10.8 * male - 5.4;
    bp := greatest(0, least(100, case when male = 1 then (30 - bf) / 18 else (40 - bf) / 18 end * 100));
    idx := 0.6 * ep + 0.4 * bp;
  else
    idx := ep;
  end if;
  lv := case when idx < 20 then 1 when idx < 40 then 2 when idx < 60 then 3 else 4 end;
  return jsonb_build_object('level', lv, 'index', round(idx), 'exp_pts', ep, 'body_pts', round(bp), 'bodyfat_est', round(bf, 1), 'bmi', round(bmi, 1));
end $$;
revoke all on function public.avatar_start_level(uuid) from public, anon;

CREATE OR REPLACE FUNCTION public.avatar_refresh(client uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := auth.uid(); cid uuid := coalesce(client, auth.uid());
  coach uuid; cfg record; w jsonb; thr int[]; tol numeric; goodw numeric;
  today date := (now() at time zone 'Europe/Madrid')::date; curw date;
  firstd date; wk date; planned int; goal text; sexv text; st record;
  ses int; compl numeric; perf numeric; pc numeric; ntr int; tr numeric;
  logged int; within int; target numeric; fd numeric;
  avgw numeric; prevavg numeric; nbw int; chg numeric; bw numeric; bd numeric;
  goodn int; actn int; cs numeric;
  num numeric; den numeric; score int; pts numeric := 0; lvl int := 1; maxlvl int; i int;
  cur jsonb; det jsonb; nxt jsonb; variant text; sl jsonb;
begin
  if cid is null then raise exception 'sense usuari'; end if;
  if me is not null and me <> cid and not public.is_coach_of(cid) then raise exception 'sense permís'; end if;
  select p.coach_id into coach from public.profiles p where p.id = cid;
  select * into cfg from public.avatar_config c where c.coach_id = coach;
  w   := coalesce(cfg.weights, '{"train":40,"food":30,"body":20,"consist":10}'::jsonb);
  thr := coalesce(cfg.thresholds, '{0,300,900,2000,3600}');
  tol := coalesce((cfg.params->>'kcal_tol_pct')::numeric, 10) / 100;
  goodw := coalesce((cfg.params->>'good_week_pct')::numeric, 75) / 100;
  sl := public.avatar_start_level(cid);
  pts := thr[least(4, greatest(1, coalesce((sl->>'level')::int, 1)))];
  select lower(coalesce(d.data->>'goal','')), d.data->>'sex' into goal, sexv
    from public.docs d where d.user_id = cid and d.col = 'intake' and d.id = 'inicial' and not d.deleted;
  select least(7, greatest(1, coalesce((select (d.data->>'days')::int from public.docs d where d.user_id=cid and d.col='programs' and d.id='inicial' and not d.deleted),
                                      (select count(*)::int from public.docs d where d.user_id=cid and d.col='templates' and not d.deleted and coalesce(d.data->>'name','') !~ 'opcional'),
                                      3))) into planned;
  select min((d.data->>'date')::date) into firstd from public.docs d
    where d.user_id = cid and d.col in ('sessions','bodyweight','kcallog') and not d.deleted and d.data->>'date' ~ '^\d{4}-\d{2}-\d{2}$';
  curw := date_trunc('week', today)::date;
  insert into public.avatar_state(user_id) values (cid) on conflict (user_id) do nothing;
  select * into st from public.avatar_state s where s.user_id = cid;
  if firstd is not null then
    wk := date_trunc('week', firstd)::date;
    while wk <= curw loop
      select count(*) into ses from public.docs d where d.user_id=cid and d.col='sessions' and not d.deleted
        and (d.data->>'date')::date between wk and wk + 6;
      compl := least(1, ses::numeric / planned);
      with sets as (
        select it->>'exId' ex, (d.data->>'date')::date dt,
               max((s->>'kg')::numeric * (1 + coalesce((s->>'reps')::numeric,0)/30)) e1
        from public.docs d, jsonb_array_elements(d.data->'items') it, jsonb_array_elements(it->'sets') s
        where d.user_id=cid and d.col='sessions' and not d.deleted and (d.data->>'date')::date <= wk + 6
          and coalesce((s->>'kg')::numeric,0) > 0
        group by 1,2),
      cmp as (select ex, max(e1) filter (where dt >= wk) ecur, max(e1) filter (where dt < wk) eprev from sets group by ex)
      select count(*) filter (where ecur is not null and eprev is not null),
             avg(case when ecur >= eprev*0.98 then 1.0 else 0.0 end) filter (where ecur is not null and eprev is not null)
        into ntr, perf from cmp;
      pc := case when ntr > 0 then perf end;
      perf := case when ses = 0 then 0 when ntr = 0 then 1 else perf end;
      tr := 100 * (0.75*compl + 0.25*perf);
      select (d.data->'targets'->>'kcal')::numeric into target from public.docs d
        where d.user_id=cid and d.col='nutrition' and not d.deleted and coalesce(d.data->>'from','') <= (wk+6)::text
        order by d.data->>'from' desc limit 1;
      select count(distinct d.data->>'date'),
             least(1, count(*) filter (where (d.data->>'free')::boolean)) +
             count(*) filter (where not coalesce((d.data->>'free')::boolean,false) and target is not null
                                and abs((d.data->>'kcal')::numeric - target) <= target*tol)
        into logged, within
        from public.docs d where d.user_id=cid and d.col='kcallog' and not d.deleted and (d.data->>'date')::date between wk and wk + 6;
      fd := case when target is null and logged = 0 then null
                 when target is null then 100 * logged / 7.0
                 else 100 * (0.4*logged/7.0 + 0.6*least(7,within)/7.0) end;
      select avg((d.data->>'kg')::numeric), count(*) into avgw, nbw from public.docs d
        where d.user_id=cid and d.col='bodyweight' and not d.deleted and (d.data->>'date')::date between wk and wk + 6;
      select avg((d.data->>'kg')::numeric) into prevavg from public.docs d
        where d.user_id=cid and d.col='bodyweight' and not d.deleted and (d.data->>'date')::date between wk - 7 and wk - 1;
      if nbw >= 2 and prevavg is not null then
        chg := 100 * (avgw - prevavg) / prevavg;
        bw := case when goal ~ 'perdre greix' then case when chg between -1.2 and -0.2 then 100 when chg between -0.2 and 0.3 then 70 when chg < -1.2 then 70 else 40 end
                   when goal ~ 'guanyar múscul' then case when chg between 0.1 and 0.6 then 100 when chg between -0.25 and 0.1 or chg > 0.6 then 70 else 40 end
                   else case when abs(chg) <= 0.5 then 100 when abs(chg) <= 1 then 70 else 50 end end;
      else bw := null; end if;
      bd := case when bw is null and pc is null then null when bw is null then 100*pc when pc is null then bw else 0.7*bw + 0.3*100*pc end;
      select count(*) filter (where n >= planned*goodw), count(*) filter (where n > 0 or a > 0) into goodn, actn
        from (select g::date ws,
                (select count(*) from public.docs d where d.user_id=cid and d.col='sessions' and not d.deleted and (d.data->>'date')::date between g::date and g::date+6) n,
                (select count(*) from public.docs d where d.user_id=cid and d.col in ('bodyweight','kcallog') and not d.deleted and (d.data->>'date')::date between g::date and g::date+6) a
              from generate_series(greatest(wk - 21, date_trunc('week', firstd)::date), wk, interval '7 days') g) x;
      cs := 100 * (0.7*goodn + 0.3*actn) / greatest(1, least(4, (wk - date_trunc('week', firstd)::date)/7 + 1));
      num := (w->>'train')::numeric*tr + (w->>'consist')::numeric*cs
             + coalesce((w->>'food')::numeric*fd, 0) + coalesce((w->>'body')::numeric*bd, 0);
      den := (w->>'train')::numeric + (w->>'consist')::numeric
             + case when fd is null then 0 else (w->>'food')::numeric end + case when bd is null then 0 else (w->>'body')::numeric end;
      score := round(least(100, num / nullif(den,0)));
      det := jsonb_strip_nulls(jsonb_build_object('sessions',ses,'planned',planned,'strength_ok',round(perf*100),
               'kcal_days',logged,'kcal_ok',within,'kcal_target',target,'weight_chg_pct',round(chg,2),'good_weeks',goodn));
      if wk < curw then
        pts := pts + score;
        lvl := 1; for i in 1..array_length(thr,1) loop if pts >= thr[i] then lvl := i; end if; end loop;
        lvl := least(5, lvl);
        insert into public.avatar_history(user_id,week,score,train,food,body,consist,detail,points,level)
          values (cid, wk, score, round(tr), round(fd), round(bd), round(cs), det, pts, lvl)
          on conflict (user_id,week) do update set score=excluded.score, train=excluded.train, food=excluded.food, body=excluded.body,
            consist=excluded.consist, detail=excluded.detail, points=excluded.points, level=excluded.level;
      else
        cur := jsonb_build_object('score',score,'train',round(tr),'food',round(fd),'body',round(bd),'consist',round(cs)) || det;
      end if;
      chg := null;
      wk := wk + 7;
    end loop;
  end if;
  lvl := 1; for i in 1..array_length(thr,1) loop if pts >= thr[i] then lvl := i; end if; end loop;
  maxlvl := greatest(coalesce(st.level,1), least(5, lvl));
  variant := case when st.variant in ('m','f') then st.variant when sexv = 'd' then 'f' else 'm' end;
  nxt := case when maxlvl < 5 then jsonb_build_object('level', maxlvl+1, 'points', thr[maxlvl+1], 'missing', greatest(0, thr[maxlvl+1] - pts),
                'sessions_left', greatest(0, planned - coalesce((cur->>'sessions')::int,0))) else null end;
  update public.avatar_state set level = maxlvl, points = pts, week = curw, week_score = (cur->>'score')::int,
    week_detail = cur, updated_at = now() where user_id = cid;
  return jsonb_build_object('level',maxlvl,'points',pts,'variant',variant,'variant_pref',st.variant,'model',st.model,'week',curw,'current',cur,'next',nxt,
    'start',sl,'thresholds',to_jsonb(thr),'weights',w,'seen_level',st.seen_level,'seen_week',st.seen_week,
    'history',(select coalesce(jsonb_agg(jsonb_build_object('week',h.week,'score',h.score,'level',h.level) order by h.week),'[]'::jsonb)
               from (select * from public.avatar_history h where h.user_id = cid order by week desc limit 8) h));
end $function$;
