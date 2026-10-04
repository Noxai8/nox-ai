-- NOX — Rappels : appareils (web + natif), préférences, historique des envois
create table if not exists public.push_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  channel      text not null check (channel in ('web', 'fcm')),
  endpoint     text not null unique,
  keys         jsonb,
  platform     text check (char_length(platform) <= 40),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_devices_user on public.push_devices (user_id);
alter table public.push_devices enable row level security;
drop policy if exists push_devices_own on public.push_devices;
create policy push_devices_own on public.push_devices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reminder_prefs (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  enabled       boolean not null default true,
  morning       boolean not null default true,
  morning_time  time    not null default '08:30',
  evening       boolean not null default true,
  evening_time  time    not null default '21:00',
  habits_check  boolean not null default false,
  weekly        boolean not null default true,
  quiet_start   time    not null default '22:30',
  quiet_end     time    not null default '07:30',
  max_per_day   smallint not null default 2 check (max_per_day between 1 and 3),
  timezone      text    not null default 'Europe/Paris',
  updated_at    timestamptz not null default now()
);
alter table public.reminder_prefs enable row level security;
drop policy if exists reminder_prefs_own on public.reminder_prefs;
create policy reminder_prefs_own on public.reminder_prefs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reminder_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('morning', 'evening', 'habits', 'weekly')),
  local_date date not null,
  sent_at    timestamptz not null default now(),
  unique (user_id, kind, local_date)
);
alter table public.reminder_log enable row level security;
drop policy if exists reminder_log_read_own on public.reminder_log;
create policy reminder_log_read_own on public.reminder_log for select to authenticated
  using (auth.uid() = user_id);
