-- NOX — Axes de parcours choisis par l'utilisateur (modifiables dans Moi)
alter table public.profiles
  add column if not exists focus_areas text[] not null default '{}'::text[];
alter table public.profiles drop constraint if exists profiles_focus_areas_valid;
alter table public.profiles add constraint profiles_focus_areas_valid
  check (focus_areas <@ array['movement','nutrition','recovery']::text[]);
-- Comptes existants : expérience inchangée (les trois axes)
update public.profiles set focus_areas = array['movement','nutrition','recovery']
 where focus_areas = '{}'::text[];
