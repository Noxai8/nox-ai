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

-- set_daily_mission, complete_focus_task, start_focus_session, stop_focus_session,
-- get_nox_progress (sources bornées à nox_today()) : voir le script exécuté le 2026-10-04.
-- Règles : écriture missions/sessions uniquement par RPC security definer ; mission commencée non allégeable ;
-- tâche validable seulement aujourd'hui ou hier ; session max 90 min ; aucune source future ne compte.
