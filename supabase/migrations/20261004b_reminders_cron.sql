-- NOX — Envoi automatique des rappels toutes les 15 minutes (pg_cron + pg_net)
-- ⚠️ Remplacer <CRON_SECRET> par la valeur du secret Edge Function CRON_SECRET avant exécution.
--    Ne jamais commiter la vraie valeur.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'nox-send-reminders';

select cron.schedule(
  'nox-send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Vérification : select status_code, content, created from net._http_response order by created desc limit 3;
