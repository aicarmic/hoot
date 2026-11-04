// Sends Hoot's study reminders by Web Push. Runs every hour from .github/workflows/sat-nudge.yml.
// Each device saved, with its subscription, its time zone and when it wants reminders (default:
// daily at 5 pm, the SAT weekly quiz on Sunday at 5 pm). At the daily hour it gets one reminder
// for each class its person is enrolled in with reminders on: SAT Prep Words shows the day's two
// words, other classes say how many cards are ready to review.
//
// Env: SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (see docs/SETUP-reminders.md).
// SCHEDULE: the cron line that started the run. The run counts as the hour it was scheduled
// for, even when GitHub starts it a little late.
// FORCE=true sends every device today's reminder now (manual test runs). DRY_RUN=true prints
// what each default device would get instead of sending.
import { readdirSync, readFileSync } from 'node:fs'
import webpush from 'web-push'
import { SUPABASE_URL } from '../src/config.ts'
import { dailyNudge, quizNudge, weekday } from '../src/content/sat/schedule.ts'

const APP_URL = 'https://aicarmic.github.io/hoot/'
const env = process.env
const words = JSON.parse(readFileSync(new URL('../src/content/sat/words.json', import.meta.url), 'utf8'))
const SAT = 'sat-words'

// Built-in decks, for class names and for counting cards due per class.
const deckDir = new URL('../src/content/decks/', import.meta.url)
const decks = readdirSync(deckDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, deckDir), 'utf8')))

/** Same rule as classIdOf in src/lib/enrollment.ts. */
const classIdOf = (d) => (d.speechLang && d.kind !== 'vocab' ? `lang:${d.subject}` : d.id)

/** A class's reminder, from how many of its cards are due today. */
function classNudge(classId, title, due) {
  const lang = classId.startsWith('lang:')
  return {
    title: `Time for ${title}`,
    body: due > 0 ? `${due} card${due === 1 ? '' : 's'} ready to review. A few minutes is plenty.` : 'A few minutes today keeps it fresh.',
    url: lang ? `#class/${encodeURIComponent(title.toLowerCase())}` : `#deck/${classId}`,
    tag: `class-${classId}`,
  }
}

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

/**
 * The reminders a device gets at instant `at`. `classes`: its person's enrolled classes with
 * reminders on. `dueOn(classId, date)`: cards due in a class by a date. `title(classId)`: its name.
 */
function nudgesFor(sub, at, force, classes, dueOn, title) {
  const local = localTime(at, sub.tz)
  const out = []
  if (force || sub.daily_hour === local.hour) {
    for (const id of classes) {
      if (id === SAT) out.push(dailyNudge(local.date, words) ?? (force ? quizNudge(local.date, words) : null))
      else out.push(classNudge(id, title(id), dueOn(id, local.date)))
    }
  }
  if (!force && classes.includes(SAT) && sub.quiz_day === weekday(local.date) && sub.quiz_hour === local.hour)
    out.push(quizNudge(local.date, words))
  return out.filter(Boolean)
}

const now = new Date()
const force = env.FORCE === 'true'
const at = force || !env.SCHEDULE ? now : intendedTime(env.SCHEDULE, now)

if (env.DRY_RUN === 'true') {
  const sample = { tz: 'America/Denver', daily_hour: 17, quiz_day: 0, quiz_hour: 17 }
  const list = nudgesFor(sample, at, force, [SAT, 'lang:Italian'], () => 3, (id) => (id.startsWith('lang:') ? id.slice(5) : id))
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

/** Every row of a REST query, a page at a time. */
async function rows(query) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: { ...headers, Range: `${from}-${from + 999}` } })
    if (!res.ok) {
      console.error(`Could not read ${query.split('?')[0]}: ${res.status} ${await res.text()}`)
      process.exit(1)
    }
    const page = await res.json()
    out.push(...page)
    if (page.length < 1000) return out
  }
}

const subs = await rows('push_subscriptions?select=endpoint,user_id,p256dh,auth,tz,daily_hour,quiz_day,quiz_hour')
const users = [...new Set(subs.map((s) => s.user_id))]
const inUsers = `in.(${users.join(',')})`
const enrolled = users.length ? await rows(`enrollments?select=user_id,class_id&reminders=is.true&user_id=${inUsers}`) : []
const familyDecks = await rows('family_decks?select=deck_id,title:deck->>title,subject:deck->>subject,speechLang:deck->>speechLang,kind:deck->>kind')
const progress = users.length ? await rows(`progress?select=user_id,deck_id,due:data->>due&user_id=${inUsers}`) : []

const classOfDeck = new Map()
const titles = new Map([[SAT, 'SAT Prep Words']])
for (const d of [...decks, ...familyDecks.map((f) => ({ ...f, id: f.deck_id }))]) {
  const id = classIdOf(d)
  classOfDeck.set(d.id, id)
  if (!titles.has(id)) titles.set(id, id.startsWith('lang:') ? d.subject : d.title)
}
const title = (id) => titles.get(id) ?? id
const classesOf = (uid) => enrolled.filter((e) => e.user_id === uid && (titles.has(e.class_id) || e.class_id === SAT)).map((e) => e.class_id)
const dueFor = (uid) => (classId, date) =>
  progress.filter((p) => p.user_id === uid && classOfDeck.get(p.deck_id) === classId && p.due <= date).length

let sent = 0
let gone = 0
let failed = 0
for (const s of subs) {
  for (const nudge of nudgesFor(s, at, force, classesOf(s.user_id), dueFor(s.user_id), title)) {
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
