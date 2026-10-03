-- NOX — Étape 10 : le moteur XP serveur devient la seule source de vérité
-- 1. xp_transactions : lecture seule pour l'utilisateur
drop policy if exists xp_transactions_own on public.xp_transactions;
create policy xp_transactions_read_own on public.xp_transactions
  for select to authenticated using (auth.uid() = user_id);

-- 2. profiles.xp et profiles.streak_days figés côté app (colonnes conservées, plus écrites)
create or replace function public.protect_profile_billing()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.subscription_plan := 'free';
      new.trial_ends_at     := null;
      new.xp                := 0;
      new.streak_days       := 0;
    else
      new.subscription_plan := old.subscription_plan;
      new.trial_ends_at     := old.trial_ends_at;
      new.xp                := old.xp;
      new.streak_days       := old.streak_days;
    end if;
  end if;
  return new;
end; $$;
