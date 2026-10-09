-- Activité : calories estimées, provenance et distance facultative.
-- Ne modifie aucune donnée historique et ne fabrique aucune mesure.
alter table public.movement_logs
  add column if not exists calories_kcal integer,
  add column if not exists calories_source text,
  add column if not exists distance_km numeric(9,3),
  add column if not exists distance_source text;

alter table public.movement_logs
  drop constraint if exists movement_logs_calories_nonnegative;
alter table public.movement_logs
  add constraint movement_logs_calories_nonnegative
  check (calories_kcal is null or calories_kcal >= 0);

alter table public.movement_logs
  drop constraint if exists movement_logs_calories_source_check;
alter table public.movement_logs
  add constraint movement_logs_calories_source_check
  check (calories_source is null or calories_source in ('estimated_met','declared','measured'));

alter table public.movement_logs
  drop constraint if exists movement_logs_calories_provenance_pair;
alter table public.movement_logs
  add constraint movement_logs_calories_provenance_pair
  check ((calories_kcal is null) = (calories_source is null));

alter table public.movement_logs
  drop constraint if exists movement_logs_distance_positive;
alter table public.movement_logs
  add constraint movement_logs_distance_positive
  check (distance_km is null or distance_km > 0);

alter table public.movement_logs
  drop constraint if exists movement_logs_distance_source_check;
alter table public.movement_logs
  add constraint movement_logs_distance_source_check
  check (distance_source is null or distance_source in ('declared','measured'));

alter table public.movement_logs
  drop constraint if exists movement_logs_distance_provenance_pair;
alter table public.movement_logs
  add constraint movement_logs_distance_provenance_pair
  check ((distance_km is null) = (distance_source is null));
