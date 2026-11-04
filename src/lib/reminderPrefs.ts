/**
 * When this person wants their reminders. Kept on the device and copied onto its push
 * subscription row, which the reminder job reads (scripts/sat-nudge.mjs).
 */
export interface ReminderPrefs {
  /** Hour (0–23, local time) for the daily words, or null for no daily reminder. */
  dailyHour: number | null
  /** Day of the weekly quiz reminder: 0 = Sunday … 6 = Saturday. */
  quizDay: number
  /** Hour (0–23, local time) for the weekly quiz, or null for no quiz reminder. */
  quizHour: number | null
}

export const DEFAULT_PREFS: ReminderPrefs = { dailyHour: 17, quizDay: 0, quizHour: 17 }

const KEY = 'hoot.reminders.v1'

export function loadPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export function storePrefs(p: ReminderPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** 17 → "5 pm", 0 → "12 am". */
export function hourLabel(h: number): string {
  return `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`
}

/** This device's time zone, e.g. "America/Denver". */
export function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Denver'
  } catch {
    return 'America/Denver'
  }
}
