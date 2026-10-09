-- Provenance des relevés de pas. Aucun accès HealthKit n'est possible depuis Safari.
alter table public.habit_logs add column if not exists source text;
update public.habit_logs set source = 'manual' where source is null;
alter table public.habit_logs alter column source set default 'manual';
alter table public.habit_logs drop constraint if exists habit_logs_source_check;
alter table public.habit_logs add constraint habit_logs_source_check
  check (source in ('manual', 'healthkit', 'health_connect'));
-- L'unicité (habit_id, date) existante garantit un seul total quotidien :
-- les imports natifs doivent UPSERT un total absolu, jamais additionner.
