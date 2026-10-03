-- NOX — get_nox_progress : répartition des journées alignées (XP inchangée)
-- total = dates uniques ; movement / recovery / habits = compteurs indépendants
create or replace function public.get_nox_progress()
returns json language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  closures as (select date, completion, priority_type from daily_closures where user_id = (select id from me)),
  movement_days as (
    select (finished_at at time zone 'Europe/Paris')::date as date from workouts
      where user_id = (select id from me) and status = 'completed' and finished_at is not null
    union select date from movement_logs where user_id = (select id from me)
  ),
  recovery_days as (select date from closures where priority_type = 'recovery' and completion = 'yes'),
  habit_days as (
    select distinct date from habit_logs
      where user_id = (select id from me) and target_snapshot is not null and count <= target_snapshot
  ),
  active_days as (select date from movement_days union select date from recovery_days union select date from habit_days),
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
      'total', (select count(*) from active_days),
      'movement', (select count(*) from movement_days),
      'recovery', (select count(*) from recovery_days),
      'habits', (select count(*) from habit_days)));
$$;
