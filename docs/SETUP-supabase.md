# One-time Supabase setup

The Supabase project URL and publishable key are already in `src/config.ts`. Both are public by design: the row-level security rules in `supabase/schema.sql` decide what anyone can read or write. **Never commit the `service_role` key.**

1. **Create the tables.** In Supabase, open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](../supabase/schema.sql), and click **Run**. It's safe to run again after future updates.
2. **Point sign-up emails at the app.** Go to **Authentication → URL Configuration**. Set **Site URL** to `https://aicarmic.github.io/hoot/` and add the same URL under **Redirect URLs**.
3. **(Optional) Skip email confirmation.** Supabase emails a confirmation link on sign-up. For a family app you can turn that off under **Authentication → Sign In / Providers → Email → Confirm email**, so people are signed in straight away.

## Getting the family in

1. One person opens Hoot, goes to **Sign in → Create an account**, then **Me → Start a family**.
2. Tap **Invite someone** to share the 6-letter invite code.
3. Everyone else creates an account and enters the code under **Me → Join**.

## What's stored where

| Data | Where | Who can see it |
|---|---|---|
| Card progress, daily activity | `progress`, `activity` | Only you. The family page shows totals only. |
| Imported decks | `family_decks` | Your family |
| "Try this phrase" | `nudges` | Sender and receiver |
| Name, family | `profiles`, `families` | Your family |

The app works offline. Changes sync when you're back online, after each practice session, and when you leave the app.
