-- NOX — Lot 2 « Ta journée » : objectifs dans la journée, source des relevés et des repas,
-- snapshot de clôture, rappels contextuels.
-- À APPLIQUER MANUELLEMENT. Toutes les modifications sont additives (aucun effet sur l'XP).

-- 1. Objectifs : inclus ou non dans « Ta journée »
alter table public.user_habits
  add column if not exists in_day boolean not null default true;

-- 2. Source des relevés : saisie manuelle aujourd'hui, mesure native plus tard
alter table public.habit_logs
  add column if not exists source text not null default 'manual';
alter table public.habit_logs drop constraint if exists habit_logs_source_check;
alter table public.habit_logs add constraint habit_logs_source_check
  check (source in ('manual', 'healthkit', 'health_connect'));

-- Un relevé fait depuis l'app est TOUJOURS une saisie manuelle : impossible de le faire passer pour une mesure.
-- (La cible et le mode restent figés au moment du relevé, comme avant.)
create or replace function public.snapshot_habit_target()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    select daily_target, mode into new.target_snapshot, new.mode_snapshot
      from public.user_habits where id = new.habit_id;
    if current_user in ('anon', 'authenticated') then new.source := 'manual'; end if;
  else
    new.target_snapshot := old.target_snapshot;
    new.mode_snapshot   := old.mode_snapshot;
    if current_user in ('anon', 'authenticated') then new.source := old.source; end if;
  end if;
  return new;
end; $$;

-- 3. Origine des repas (les repas existants restent sans origine connue)
alter table public.food_entries
  add column if not exists source text;
alter table public.food_entries drop constraint if exists food_entries_source_check;
alter table public.food_entries add constraint food_entries_source_check
  check (source is null or source in ('manual', 'photo', 'barcode', 'recipe', 'meal_plan', 'pantry', 'voice'));

-- 4. Snapshot structuré de la journée au moment de la clôture (historique et bilans, jamais une source d'XP)
alter table public.daily_closures
  add column if not exists day_snapshot jsonb,
  add column if not exists items_done   smallint,
  add column if not exists items_total  smallint;
alter table public.daily_closures drop constraint if exists daily_closures_snapshot_check;
alter table public.daily_closures add constraint daily_closures_snapshot_check check (
  (day_snapshot is null or (jsonb_typeof(day_snapshot) = 'object' and pg_column_size(day_snapshot) <= 16384))
  and (items_done  is null or items_done  between 0 and 100)
  and (items_total is null or items_total between 0 and 100)
  and (items_done  is null or items_total is null or items_done <= items_total)
);

-- 5. Rappels contextuels : un réglage par type, intervalle minimal, nouveaux types d'historique
alter table public.reminder_prefs
  add column if not exists nudge_nutrition boolean not null default true,
  add column if not exists nudge_movement  boolean not null default true,
  add column if not exists nudge_mission   boolean not null default true,
  add column if not exists nudge_goals     boolean not null default true,
  add column if not exists min_gap_minutes smallint not null default 120;
alter table public.reminder_prefs drop constraint if exists reminder_prefs_min_gap_check;
alter table public.reminder_prefs add constraint reminder_prefs_min_gap_check
  check (min_gap_minutes between 120 and 480);

alter table public.reminder_log drop constraint if exists reminder_log_kind_check;
alter table public.reminder_log add constraint reminder_log_kind_check
  check (kind in ('morning', 'evening', 'habits', 'weekly',
                  'nutrition', 'movement', 'mission_start', 'mission_end', 'goals'));
