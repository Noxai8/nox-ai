-- NOX — Étape 10 sécurité (appliqué manuellement dans le SQL Editor le 2026-10-03)
-- 1. Verrou du plan et de l'essai côté app
create or replace function public.protect_profile_billing()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.subscription_plan := 'free';
      new.trial_ends_at     := null;
    else
      new.subscription_plan := old.subscription_plan;
      new.trial_ends_at     := old.trial_ends_at;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_billing on public.profiles;
create trigger profiles_protect_billing before insert or update on public.profiles
for each row execute function public.protect_profile_billing();

-- 2. Anti-antidatage des journées et séances
create or replace function public.guard_recent_date()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_table_name = 'workouts' then
    if tg_op = 'INSERT' then
      if new.finished_at is not null then new.finished_at := now(); end if;
    elsif new.finished_at is distinct from old.finished_at and new.finished_at is not null then
      new.finished_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and old.date < current_date - 1 then
    raise exception 'NOX: une journée passée ne peut plus être modifiée';
  end if;
  if new.date < current_date - 1 or new.date > current_date + 1 then
    raise exception 'NOX: date hors de la période autorisée';
  end if;
  return new;
end; $$;
drop trigger if exists daily_closures_guard_date on public.daily_closures;
create trigger daily_closures_guard_date before insert or update on public.daily_closures
for each row execute function public.guard_recent_date();
drop trigger if exists movement_logs_guard_date on public.movement_logs;
create trigger movement_logs_guard_date before insert or update on public.movement_logs
for each row execute function public.guard_recent_date();
drop trigger if exists workouts_guard_date on public.workouts;
create trigger workouts_guard_date before insert or update on public.workouts
for each row execute function public.guard_recent_date();

-- 3. XP calculée côté serveur (barème v2)
create or replace function public.get_nox_progress()
returns json language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  closures as (select date, completion, priority_type from daily_closures where user_id = (select id from me)),
  active_days as (
    select date from closures where priority_type = 'recovery' and completion = 'yes'
    union select (finished_at at time zone 'Europe/Paris')::date from workouts
      where user_id = (select id from me) and status = 'completed' and finished_at is not null
    union select date from movement_logs where user_id = (select id from me)
  ),
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
    'priorities_done', (select count(*) from closures where completion = 'yes'));
$$;
revoke all on function public.get_nox_progress() from public, anon;
grant execute on function public.get_nox_progress() to authenticated;
