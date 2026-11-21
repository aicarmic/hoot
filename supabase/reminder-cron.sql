-- Starts Hoot's reminder job (GitHub Actions "SAT reminders") every 20 minutes from Supabase.
-- GitHub's own hourly schedule skips most runs, so this is what makes reminders arrive on time.
-- Setup: docs/SETUP-reminders.md, "Make reminders reliable". Safe to run again.
--
-- Before running: replace PASTE_GITHUB_TOKEN_HERE below with the GitHub token from that doc.
-- The token is stored encrypted in Supabase Vault. Don't commit it.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Save (or replace) the token.
do $$
declare existing uuid;
begin
  select id into existing from vault.secrets where name = 'hoot_github_token';
  if existing is null then
    perform vault.create_secret('PASTE_GITHUB_TOKEN_HERE', 'hoot_github_token');
  else
    perform vault.update_secret(existing, 'PASTE_GITHUB_TOKEN_HERE');
  end if;
end $$;

-- Every 20 minutes, ask GitHub to run the reminder job. It sends only what is due and owed.
select cron.schedule('hoot-reminders', '*/20 * * * *', $job$
  select net.http_post(
    url := 'https://api.github.com/repos/aicarmic/hoot/actions/workflows/sat-nudge.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hoot_github_token'),
      'Accept', 'application/vnd.github+json',
      'User-Agent', 'hoot-reminders'
    ),
    body := '{"ref":"main","inputs":{"force":"false"}}'::jsonb
  );
$job$);

-- To check it's working, a few minutes later:
--   select status_code, created from net._http_response order by created desc limit 5;
-- 204 means GitHub accepted it. 401 means the token is wrong or expired.
-- To stop it: select cron.unschedule('hoot-reminders');
