-- NOX — Colonne note manquante sur daily_closures (bug : la clôture renvoyait 400)
alter table public.daily_closures
  add column if not exists note text
  check (note is null or char_length(note) <= 280);
