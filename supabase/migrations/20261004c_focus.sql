-- NOX — Pilier Focus : missions du jour, sessions serveur, progression bornée à aujourd'hui
-- Appliqué manuellement le 2026-10-04 (voir conversation : tests d'écriture directe, allègement, dates futures)

alter table public.profiles drop constraint if exists profiles_focus_areas_valid;
alter table public.profiles add constraint profiles_focus_areas_valid
  check (focus_areas <@ array['movement','nutrition','recovery','focus']::text[]);

create table if not exists public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null check (char_length(title) between 1 and 80),
  kind text not null check (kind in ('duration', 'task')),
  target_minutes smallint check (target_minutes is null or target_minutes between 5 and 240),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.daily_missions enable row level security;
drop policy if exists daily_missions_own on public.daily_missions;
drop policy if exists daily_missions_read_own on public.daily_missions;
drop policy if exists daily_missions_delete_own on public.daily_missions;
create policy daily_missions_read_own on public.daily_missions for select to authenticated using (auth.uid() = user_id);
create policy daily_missions_delete_own on public.daily_missions for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.daily_missions(id) on delete cascade,
  planned_minutes smallint not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes smallint,
  distractions smallint not null default 0
);
create index if not exists focus_sessions_user on public.focus_sessions (user_id, started_at desc);
alter table public.focus_sessions enable row level security;
drop policy if exists focus_sessions_read_own on public.focus_sessions;
create policy focus_sessions_read_own on public.focus_sessions for select to authenticated using (auth.uid() = user_id);

create or replace function public.nox_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Paris')::date $$;

create or replace function public.set_daily_mission(p_date date, p_title text, p_kind text, p_target_minutes int default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := nox_today(); v_old daily_missions%rowtype; v_used int; v_row daily_missions%rowtype;
begin
  if v_uid is null then raise exception 'NOX: non authentifié'; end if;
  if p_date < v_today - 1 or p_date > v_today + 1 then raise exception 'NOX: date hors période'; end if;
  if p_kind not in ('duration', 'task') then raise exception 'NOX: type de mission invalide'; end if;
  if p_kind = 'duration' and (p_target_minutes is null or p_target_minutes not between 5 and 240) then
    raise exception 'NOX: objectif entre 5 et 240 minutes';
  end if;
  select * into v_old from daily_missions where user_id = v_uid and date = p_date;
  if found then
    select coalesce(sum(minutes), 0) into v_used from focus_sessions where mission_id = v_old.id;
    if (v_used > 0 or v_old.done_at is not null)
       and (p_kind <> v_old.kind or (p_kind = 'duration' and p_target_minutes < v_old.target_minutes)) then
      raise exception 'NOX: une mission commencée ne peut pas être allégée';
    end if;
    update daily_missions
       set title = btrim(p_title), kind = p_kind,
           target_minutes = case when p_kind = 'duration' then p_target_minutes end,
           done_at = case when p_kind = 'task' then v_old.done_at end
     where id = v_old.id returning * into v_row;
  else
    insert into daily_missions (user_id, date, title, kind, target_minutes)
    values (v_uid, p_date, btrim(p_title), p_kind, case when p_kind = 'duration' then p_target_minutes end)
    returning * into v_row;
  end if;
  return row_to_json(v_row);
end; $$;

create or replace function public.complete_focus_task(p_mission_id uuid, p_done boolean default true)
returns json language plpgsql security definer set search_path = public as $$
declare v_today date := nox_today(); v_row daily_missions%rowtype;
begin
  update daily_missions set done_at = case when p_done then now() end
   where id = p_mission_id and user_id = auth.uid() and kind = 'task' and date between v_today - 1 and v_today
  returning * into v_row;
  if not found then raise exception 'NOX: tâche introuvable, future ou trop ancienne'; end if;
  return row_to_json(v_row);
end; $$;

create or replace function public.start_focus_session(p_mission_id uuid, p_planned_minutes int default 25)
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := nox_today(); v_id uuid; v_start timestamptz;
begin
  if v_uid is null then raise exception 'NOX: non authentifié'; end if;
  if not exists (select 1 from daily_missions where id = p_mission_id and user_id = v_uid
                 and kind = 'duration' and date between v_today - 1 and v_today) then
    raise exception 'NOX: mission introuvable, future ou trop ancienne';
  end if;
  update focus_sessions
     set ended_at = least(now(), started_at + interval '90 minutes'),
         minutes  = floor(extract(epoch from (least(now(), started_at + interval '90 minutes') - started_at)) / 60)
   where user_id = v_uid and ended_at is null;
  insert into focus_sessions (user_id, mission_id, planned_minutes)
  values (v_uid, p_mission_id, greatest(5, least(90, p_planned_minutes)))
  returning id, started_at into v_id, v_start;
  return json_build_object('id', v_id, 'started_at', v_start);
end; $$;

create or replace function public.stop_focus_session(p_session_id uuid, p_distractions int default 0)
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_minutes int; v_mission uuid; v_total int;
begin
  update focus_sessions
     set ended_at     = least(now(), started_at + interval '90 minutes'),
         minutes      = floor(extract(epoch from (least(now(), started_at + interval '90 minutes') - started_at)) / 60),
         distractions = greatest(0, least(99, p_distractions))
   where id = p_session_id and user_id = v_uid and ended_at is null
  returning minutes, mission_id into v_minutes, v_mission;
  if v_mission is null then raise exception 'NOX: session introuvable ou déjà terminée'; end if;
  select coalesce(sum(minutes), 0) into v_total from focus_sessions where mission_id = v_mission;
  return json_build_object('minutes', v_minutes, 'mission_total', v_total);
end; $$;

revoke all on function public.set_daily_mission(date, text, text, int) from public, anon;
revoke all on function public.complete_focus_task(uuid, boolean)      from public, anon;
revoke all on function public.start_focus_session(uuid, int)          from public, anon;
revoke all on function public.stop_focus_session(uuid, int)           from public, anon;
grant execute on function public.set_daily_mission(date, text, text, int) to authenticated;
grant execute on function public.complete_focus_task(uuid, boolean)      to authenticated;
grant execute on function public.start_focus_session(uuid, int)          to authenticated;
grant execute on function public.stop_focus_session(uuid, int)           to authenticated;

create or replace function public.get_nox_progress()
returns json language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id, nox_today() as today),
  closures as (select date, completion, priority_type from daily_closures
                where user_id = (select id from me) and date <= (select today from me)),
  movement_days as (
    select d as date from (
      select (finished_at at time zone 'Europe/Paris')::date as d from workouts
       where user_id = (select id from me) and status = 'completed' and finished_at is not null
      union select date from movement_logs where user_id = (select id from me)
    ) x where d <= (select today from me)
  ),
  recovery_days as (select date from closures where priority_type = 'recovery' and completion = 'yes'),
  habit_days as (select distinct date from habit_logs
                  where user_id = (select id from me) and date <= (select today from me)
                    and target_snapshot is not null and count <= target_snapshot),
  focus_days as (
    select m.date from daily_missions m
     where m.user_id = (select id from me) and m.date <= (select today from me)
       and ((m.kind = 'task' and m.done_at is not null)
         or (m.kind = 'duration' and (select coalesce(sum(s.minutes), 0) from focus_sessions s
                                       where s.mission_id = m.id) >= m.target_minutes))
  ),
  active_days as (select date from movement_days union select date from recovery_days
                  union select date from habit_days union select date from focus_days),
  all_days as (select date from closures union select date from active_days),
  per_day as (
    select least(80,
             case when c.date is not null then 25 else 0 end
           + case c.completion when 'yes' then 15 when 'partial' then 8 else 0 end
           + case when a.date is not null then 40 else 0 end) as xp
    from all_days d left join closures c on c.date = d.date left join active_days a on a.date = d.date
  )
  select json_build_object(
    'xp', coalesce((select sum(xp) from per_day), 0),
    'observed_days', (select count(*) from closures),
    'active_days', (select count(*) from active_days),
    'priorities_done', (select count(*) from closures where completion = 'yes'),
    'aligned', json_build_object(
      'total', (select count(*) from active_days), 'movement', (select count(*) from movement_days),
      'recovery', (select count(*) from recovery_days), 'habits', (select count(*) from habit_days),
      'focus', (select count(*) from focus_days)));
$$;
