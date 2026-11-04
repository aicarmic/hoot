// Sends the SAT Prep Words reminder ("Today's SAT words…", or the Sunday quiz) by Web Push
// to every device that turned reminders on. Run by .github/workflows/sat-nudge.yml.
//
// Env: SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (see docs/SETUP-reminders.md).
// SCHEDULE: the cron line that started the run, so only the run that lands on 5 pm in Denver
// sends (GitHub cron is UTC, and Denver moves an hour with daylight saving).
// FORCE=true sends now whatever the time (manual test runs). DRY_RUN=true prints instead.
import { readFileSync } from 'node:fs'
import webpush from 'web-push'
import { SUPABASE_URL } from '../src/config.ts'
import { nudgeFor } from '../src/content/sat/schedule.ts'

const TZ = 'America/Denver'
const HOUR = 17
const APP_URL = 'https://aicarmic.github.io/hoot/'

const env = process.env
const words = JSON.parse(readFileSync(new URL('../src/content/sat/words.json', import.meta.url), 'utf8'))

/** Local date (YYYY-MM-DD) and hour in Denver for an instant. */
function denver(at) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

/** The instant a "M H * * *" cron line was meant to fire: its latest UTC time at or before now. */
function intendedTime(cron, now) {
  const [m, h] = cron.trim().split(/\s+/).map(Number)
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m))
  if (t > now) t.setUTCDate(t.getUTCDate() - 1)
  return t
}

const now = new Date()
const force = env.FORCE === 'true'
const dry = env.DRY_RUN === 'true'
const at = force || !env.SCHEDULE ? now : intendedTime(env.SCHEDULE, now)
const local = denver(at)
if (!force && local.hour !== HOUR) {
  console.log(`Not 5 pm in Denver for this run (${local.date} ${local.hour}:00). Nothing to do.`)
  process.exit(0)
}

const nudge = nudgeFor(local.date, words)
if (!nudge) {
  console.log(`No reminder for ${local.date}.`)
  process.exit(0)
}
console.log(`${local.date}: ${nudge.title}: ${nudge.body}`)
if (dry) process.exit(0)

if (!env.SUPABASE_SECRET_KEY || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  console.log('Reminders are not set up yet (see docs/SETUP-reminders.md). Skipping.')
  process.exit(0)
}
webpush.setVapidDetails(APP_URL, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

const headers = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` }
const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`, { headers })
if (!res.ok) {
  console.error(`Could not read subscriptions: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const subs = await res.json()

let sent = 0
let gone = 0
let failed = 0
for (const s of subs) {
  try {
    // Keep it for up to 6 hours if the phone is offline; after that the day's moment has passed.
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(nudge), {
      TTL: 6 * 3600,
      urgency: 'normal',
    })
    sent++
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      // The device unsubscribed or the app was removed: forget it.
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers })
      gone++
    } else {
      console.error(`Send failed: ${e.statusCode ?? ''} ${e.body ?? e.message}`)
      failed++
    }
  }
}
console.log(`Sent ${sent}, removed ${gone} expired, ${failed} failed, of ${subs.length} devices.`)
if (failed && !sent) process.exit(1)
