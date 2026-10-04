-- NOX — Objectifs « au moins X » (objectifs personnels) et pas déclarés
-- Les objectifs « au moins X » et les pas enrichissent « Ta journée » mais n'alignent pas une journée (pas d'XP).
alter table public.user_habits drop constraint if exists user_habits_kind_check;
alter table public.user_habits add constraint user_habits_kind_check
  check (kind in ('tobacco','alcohol','sexual_habit','sugar','screens','steps','custom'));
alter table public.user_habits drop constraint if exists user_habits_mode_check;
alter table public.user_habits add constraint user_habits_mode_check
  check (mode in ('reduce','stop','track','build'));
alter table public.user_habits drop constraint if exists user_habits_baseline_check;
alter table public.user_habits add constraint user_habits_baseline_check check (baseline is null or baseline between 0 and 100000);
alter table public.user_habits drop constraint if exists user_habits_daily_target_check;
alter table public.user_habits add constraint user_habits_daily_target_check check (daily_target is null or daily_target between 0 and 100000);
alter table public.habit_logs drop constraint if exists habit_logs_count_check;
alter table public.habit_logs add constraint habit_logs_count_check check (count between 0 and 100000);

create or replace function public.normalize_user_habit()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and current_user in ('anon', 'authenticated') then
    new.risk_flag  := old.risk_flag or coalesce(new.risk_flag, false);
    new.kind       := old.kind;
    new.user_id    := old.user_id;
    new.started_on := old.started_on;
  end if;
  if new.kind = 'steps' then new.mode := 'build'; new.unit := 'pas'; end if;
  if new.mode = 'build' and new.kind not in ('steps', 'custom') then
    raise exception 'NOX: ce type d''habitude ne peut pas être un objectif « au moins »';
  end if;
  if new.kind = 'alcohol' and new.risk_flag and not new.professional_support then new.mode := 'track'; end if;
  if new.mode = 'stop'  then new.daily_target := 0; end if;
  if new.mode = 'track' then new.daily_target := null; end if;
  if new.mode = 'build' and (new.daily_target is null or new.daily_target <= 0) then
    raise exception 'NOX: un objectif « au moins » a besoin d''une cible';
  end if;
  new.updated_at := now();
  return new;
end; $$;

alter table public.habit_logs add column if not exists mode_snapshot text;

create or replace function public.snapshot_habit_target()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    select daily_target, mode into new.target_snapshot, new.mode_snapshot from public.user_habits where id = new.habit_id;
  else
    new.target_snapshot := old.target_snapshot;
    new.mode_snapshot   := old.mode_snapshot;
  end if;
  return new;
end; $$;

-- Seules les habitudes à réduire ou arrêter alignent une journée ; « au moins X » et pas : aucun effet XP.
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
                    and target_snapshot is not null
                    and coalesce(mode_snapshot, 'reduce') in ('reduce', 'stop')
                    and count <= target_snapshot),
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
