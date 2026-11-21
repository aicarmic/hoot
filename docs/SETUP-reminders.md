# Classes and daily reminders

**Enrollment.** A class is a language (all its decks) or one study module (one deck, like SAT Prep
Words). The first time someone opens a class, and every time after until they enroll, Hoot asks:
**Enroll** or **Preview**. A preview saves no progress. Enrolling saves progress and turns on a
daily reminder for that class. Anyone who already had progress in a class is enrolled in it
automatically. Settings (the gear on Learn) lists your classes, each with a reminder switch and a
Leave button.

**Reminders.** Every phone that turns reminders on gets, at the daily reminder time it picked, one
notification for each enrolled class with reminders on. SAT Prep Words shows the day's two words
and their meanings, plus a pop quiz on the last two. Other classes say how many cards are ready to
review. SAT also has a weekly quiz reminder. The defaults are 5 pm daily and the quiz on Sunday at
5 pm, in the phone's own time zone. Tapping a notification opens that class.

The first week in Hoot (the week of 2026-11-02) has a catch-up quiz covering every word so far,
including the ones that only went out on WhatsApp.

How it works: each phone subscribes with Web Push and saves the subscription in Supabase
(`push_subscriptions`), together with the times it wants. A GitHub Actions job,
`.github/workflows/sat-nudge.yml`, runs `scripts/sat-nudge.mjs`, which sends each device what it
is owed: a reminder goes out on the first run at or after its time (up to 5 hours late), once a
day. GitHub's own hourly schedule turned out to skip most runs (about 3 a day in November 2026),
so Supabase starts the job every 20 minutes too (step 9). Nothing runs on Home Assistant or the
Mac mini.

## One-time setup (about 10 minutes)

1. **Database.** Supabase → SQL Editor → paste all of `supabase/schema.sql` → Run. It is safe to
   run again; it adds the `push_subscriptions` table.
2. **Keys.** On the Mac, in a checkout of this repo, run `npx web-push generate-vapid-keys`.
   It prints a public key and a private key.
3. **GitHub.** Repo → Settings → Secrets and variables → Actions:
   - *Variables* tab → New repository variable `VAPID_PUBLIC_KEY` = the public key.
   - *Secrets* tab → New repository secret `VAPID_PRIVATE_KEY` = the private key.
   - *Secrets* tab → New repository secret `SUPABASE_SECRET_KEY` = a Supabase secret key
     (Supabase → Project Settings → API Keys → Secret keys; the legacy `service_role` key also
     works). It stays in GitHub's secrets. Never put it in the code.
4. **Rebuild the app** so it knows the public key: Actions → Deploy to GitHub Pages → Run workflow
   (on `main`).
5. **Turn it on, on each phone.** Open Hoot → gear (Settings) → SAT reminders → Turn on, and
   allow notifications. Each person needs to be signed in. Pick the times there too.
6. **Test.** Actions → SAT reminders → Run workflow. Every phone that turned it on should
   get today's reminder within a minute.
7. **Enroll someone yourself** (optional; for example, the kids in SAT Prep Words once they have
   accounts). In the SQL Editor, put their Hoot display names in the list:
   ```sql
   insert into public.enrollments (user_id, class_id)
   select id, 'sat-words' from public.profiles where display_name in ('Name one', 'Name two')
   on conflict do nothing;
   ```
8. **Retire the Home Assistant automation** (`automation.notifications_daily_sat_words_to_learning_hub`)
   so the family doesn't get the words twice.

9. **Make reminders reliable** (about 5 minutes).
   - GitHub → your picture → Settings → Developer settings → Personal access tokens →
     Fine-grained tokens → Generate new token. Name it "Hoot reminders", pick the longest
     expiration, Repository access → Only select repositories → `hoot`, and under Repository
     permissions set **Actions: Read and write**. Generate it and copy it.
   - Supabase → SQL Editor → paste all of `supabase/reminder-cron.sql`, replace both
     `PASTE_GITHUB_TOKEN_HERE` with the token, and Run.
   - Check it a few minutes later: Actions → SAT reminders should show runs marked
     "workflow_dispatch" every 20 minutes.
   - When the token expires, reminders stop again. Make a new one and rerun the same SQL.

## Phones

- **Android (Chrome):** works in the browser or the installed app. Install it anyway (menu →
  Add to Home screen) so tapping the notification opens Hoot full screen.
- **iPhone (iOS 16.4 or later):** reminders only work from the Home Screen app. In Safari, tap
  Share → Add to Home Screen, open Hoot from the Home Screen, sign in, then turn the reminder on
  there. Make sure Settings → Notifications → Hoot is allowed. Focus modes can hold it back.

## Good to know

- A 5 pm reminder usually comes between 5:00 and 5:25.
- If reminders stop: check Actions → SAT reminders. No recent runs means the Supabase job or its
  token stopped (see the check at the end of `supabase/reminder-cron.sql`), or GitHub disabled the
  workflow (it does that to scheduled jobs after 60 days with no commits; turn it back on there).
  Runs that say "sent 0" at the reminder time mean no device is subscribed: on each phone, open
  Hoot once with notifications allowed, or turn reminders off and on in Settings.
- Words follow the calendar, not who practiced: everyone gets the same two words each day, as with
  the old WhatsApp post. Someone who misses days catches up in Flashcards.
- The schedule lives in `src/content/sat/schedule.ts` and the words, in teaching order, in
  `src/content/sat/words.json`. The first 20 are the ones Home Assistant posted 2026-10-23 to
  2026-11-03. If Home Assistant posted more before it was turned off, put those words next in
  `words.json`, in the order they went out.
