-- NOX — Repérage alcool enregistré et imposé côté serveur
alter table public.user_habits
  add column if not exists risk_flag boolean not null default false;

create or replace function public.normalize_user_habit()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and current_user in ('anon', 'authenticated') then
    new.risk_flag  := old.risk_flag or coalesce(new.risk_flag, false);
    new.kind       := old.kind;
    new.user_id    := old.user_id;
    new.started_on := old.started_on;
  end if;
  if new.kind = 'alcohol' and new.risk_flag and not new.professional_support then
    new.mode := 'track';
  end if;
  if new.mode = 'stop'  then new.daily_target := 0; end if;
  if new.mode = 'track' then new.daily_target := null; end if;
  new.updated_at := now();
  return new;
end; $$;
