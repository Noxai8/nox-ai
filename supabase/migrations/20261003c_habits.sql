-- NOX — Moteur d'habitudes générique (tabac, alcool, habitude personnelle, …)
-- Appliqué manuellement dans le SQL Editor le 2026-10-03.

create table if not exists public.user_habits (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  kind                 text not null check (kind in ('tobacco','alcohol','sexual_habit','sugar','screens','custom')),
  label                text check (label is null or char_length(label) <= 40),
  mode                 text not null check (mode in ('reduce','stop','track')),
  unit                 text not null default 'fois' check (char_length(unit) <= 20),
  baseline             numeric check (baseline is null or baseline between 0 and 500),
  daily_target         numeric check (daily_target is null or daily_target between 0 and 500),
  professional_support boolean not null default false,
  active               boolean not null default true,
  started_on           date not null default current_date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists user_habits_one_active_per_kind
  on public.user_habits (user_id, kind) where active and kind <> 'custom';
alter table public.user_habits enable row level security;
drop policy if exists user_habits_own on public.user_habits;
create policy user_habits_own on public.user_habits for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.normalize_user_habit()
returns trigger language plpgsql as $$
begin
  if new.mode = 'stop'  then new.daily_target := 0; end if;
  if new.mode = 'track' then new.daily_target := null; end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists user_habits_normalize on public.user_habits;
create trigger user_habits_normalize before insert or update on public.user_habits
for each row execute function public.normalize_user_habit();

create table if not exists public.habit_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  habit_id        uuid not null references public.user_habits(id) on delete cascade,
  date            date not null,
  count           numeric not null check (count between 0 and 500),
  target_snapshot numeric,
  note            text check (note is null or char_length(note) <= 280),
  created_at      timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists habit_logs_user_date on public.habit_logs (user_id, date desc);
alter table public.habit_logs enable row level security;
drop policy if exists habit_logs_own on public.habit_logs;
create policy habit_logs_own on public.habit_logs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.user_habits h where h.id = habit_logs.habit_id and h.user_id = auth.uid()));

-- Cible du jour figée par le serveur au moment du relevé
create or replace function public.snapshot_habit_target()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    select daily_target into new.target_snapshot from public.user_habits where id = new.habit_id;
  else
    new.target_snapshot := old.target_snapshot;
  end if;
  return new;
end; $$;
drop trigger if exists habit_logs_snapshot on public.habit_logs;
create trigger habit_logs_snapshot before insert or update on public.habit_logs
for each row execute function public.snapshot_habit_target();

drop trigger if exists habit_logs_guard_date on public.habit_logs;
create trigger habit_logs_guard_date before insert or update on public.habit_logs
for each row execute function public.guard_recent_date();

-- XP : habitude tenue = journée alignée (plafond 80 inchangé)
create or replace function public.get_nox_progress()
returns json language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  closures as (select date, completion, priority_type from daily_closures where user_id = (select id from me)),
  active_days as (
    select date from closures where priority_type = 'recovery' and completion = 'yes'
    union select (finished_at at time zone 'Europe/Paris')::date from workouts
      where user_id = (select id from me) and status = 'completed' and finished_at is not null
    union select date from movement_logs where user_id = (select id from me)
    union select date from habit_logs
      where user_id = (select id from me) and target_snapshot is not null and count <= target_snapshot
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
