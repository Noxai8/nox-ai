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

-- get_nox_progress : habit_days limité aux modes reduce/stop (coalesce(mode_snapshot,'reduce') in ('reduce','stop'))
-- Voir le script exécuté le 2026-10-04 ; identique à 20261004c_focus.sql sauf ce filtre.
