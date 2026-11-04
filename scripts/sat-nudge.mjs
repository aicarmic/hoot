// Sends SAT Prep Words reminders by Web Push. Runs every hour from
// .github/workflows/sat-nudge.yml. Each device saved, with its subscription, its time zone and
// when it wants reminders (default: daily words at 5 pm, the weekly quiz on Sunday at 5 pm), and
// gets a reminder when this run's hour matches.
//
// Env: SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (see docs/SETUP-reminders.md).
// SCHEDULE: the cron line that started the run. The run counts as the hour it was scheduled
// for, even when GitHub starts it a little late.
// FORCE=true sends every device today's reminder now (manual test runs). DRY_RUN=true prints
// what each default device would get instead of sending.
import { readFileSync } from 'node:fs'
import webpush from 'web-push'
import { SUPABASE_URL } from '../src/config.ts'
import { dailyNudge, quizNudge, weekday } from '../src/content/sat/schedule.ts'

const APP_URL = 'https://aicarmic.github.io/hoot/'
const env = process.env
const words = JSON.parse(readFileSync(new URL('../src/content/sat/words.json', import.meta.url), 'utf8'))

/** Local date (YYYY-MM-DD) and hour in a time zone, at an instant. */
function localTime(at, timeZone) {
  let tz = timeZone
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
  } catch {
    tz = 'America/Denver'
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

/** The instant an hourly "M * * * *" cron line was meant to fire: the latest HH:M at or before now. */
function intendedTime(cron, now) {
  const m = Number(cron.trim().split(/\s+/)[0])
  const t = new Date(now)
  t.setUTCMinutes(m, 0, 0)
  if (t > now) t.setUTCHours(t.getUTCHours() - 1)
  return t
}

/** The reminders a device gets at instant `at`. */
function nudgesFor(sub, at, force) {
  const local = localTime(at, sub.tz)
  if (force) return [dailyNudge(local.date, words) ?? quizNudge(local.date, words)].filter(Boolean)
  const out = []
  if (sub.daily_hour === local.hour) out.push(dailyNudge(local.date, words))
  if (sub.quiz_day === weekday(local.date) && sub.quiz_hour === local.hour) out.push(quizNudge(local.date, words))
  return out.filter(Boolean)
}

const now = new Date()
const force = env.FORCE === 'true'
const at = force || !env.SCHEDULE ? now : intendedTime(env.SCHEDULE, now)

if (env.DRY_RUN === 'true') {
  const sample = { tz: 'America/Denver', daily_hour: 17, quiz_day: 0, quiz_hour: 17 }
  const list = nudgesFor(sample, at, force)
  console.log(`${at.toISOString()} (${JSON.stringify(localTime(at, sample.tz))}):`)
  for (const n of list) console.log(`  ${n.title}: ${n.body} → ${n.url}`)
  if (!list.length) console.log('  nothing')
  process.exit(0)
}

if (!env.SUPABASE_SECRET_KEY || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  console.log('Reminders are not set up yet (see docs/SETUP-reminders.md). Skipping.')
  process.exit(0)
}
webpush.setVapidDetails(APP_URL, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

const headers = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` }
const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,tz,daily_hour,quiz_day,quiz_hour`, { headers })
if (!res.ok) {
  console.error(`Could not read subscriptions: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const subs = await res.json()

let sent = 0
let gone = 0
let failed = 0
for (const s of subs) {
  for (const nudge of nudgesFor(s, at, force)) {
    try {
      // Keep it for up to 6 hours if the phone is offline; after that the moment has passed.
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
        break
      }
      console.error(`Send failed: ${e.statusCode ?? ''} ${e.body ?? e.message}`)
      failed++
    }
  }
}
console.log(`${at.toISOString()}: sent ${sent}, removed ${gone} expired, ${failed} failed, ${subs.length} devices.`)
if (failed && !sent) process.exit(1)
