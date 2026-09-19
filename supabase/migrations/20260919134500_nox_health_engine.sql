-- NOX Health Engine foundation
-- Normalized source records, connection permissions and import history.

create extension if not exists pgcrypto;

create table if not exists public.health_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('apple_health','health_connect','fitbit','whoop','garmin','oura','withings','polar','samsung_health','nox_band')),
  status text not null default 'disconnected' check (status in ('disconnected','connecting','connected','error','revoked')),
  external_user_id text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create table if not exists public.health_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  data_type text not null,
  can_read boolean not null default false,
  can_write boolean not null default false,
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, provider, data_type)
);

create table if not exists public.health_import_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_deduplicated integer not null default 0,
  error_message text,
  cursor text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_id text not null,
  data_type text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  value numeric,
  unit text,
  device_name text,
  device_id text,
  source_priority integer not null default 100,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, provider, data_type, external_id)
);

create index if not exists health_records_user_type_start_idx on public.health_records(user_id, data_type, start_at desc);
create index if not exists health_records_user_time_idx on public.health_records(user_id, start_at desc);
create index if not exists health_import_runs_user_provider_idx on public.health_import_runs(user_id, provider, started_at desc);

alter table public.health_connections enable row level security;
alter table public.health_permissions enable row level security;
alter table public.health_import_runs enable row level security;
alter table public.health_records enable row level security;

drop policy if exists "health_connections_owner" on public.health_connections;
create policy "health_connections_owner" on public.health_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "health_permissions_owner" on public.health_permissions;
create policy "health_permissions_owner" on public.health_permissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "health_import_runs_owner" on public.health_import_runs;
create policy "health_import_runs_owner" on public.health_import_runs for select using (auth.uid() = user_id);
drop policy if exists "health_records_owner" on public.health_records;
create policy "health_records_owner" on public.health_records for select using (auth.uid() = user_id);

comment on table public.health_records is 'Canonical NOX Health Engine records. Raw provider payload belongs in metadata; external_id preserves provider identity for idempotent imports.';
comment on column public.health_records.source_priority is 'Lower number means higher aggregation priority; deduplication policy is applied separately from raw-record preservation.';
