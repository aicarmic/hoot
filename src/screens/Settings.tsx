import { useEffect, useState } from 'react'
import { useAccount } from '../lib/account'
import { pushState, savePrefsToServer, turnOff, turnOn, type PushState } from '../lib/push'
import { DAYS, hourLabel, loadPrefs, storePrefs, timeZone, type ReminderPrefs } from '../lib/reminderPrefs'
import { Icon } from '../ui/Icon'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

const REMINDER_NOTE: Partial<Record<PushState, string>> = {
  'install-first': 'On iPhone, add Hoot to your Home Screen from Safari (Share, then Add to Home Screen), open it from there and turn reminders on.',
  unsupported: 'This browser can’t show reminders. Try Chrome on Android, or the Home Screen app on iPhone.',
  blocked: 'Notifications are blocked for Hoot. Allow them in your browser’s site settings, then come back.',
  'not-set-up': 'Reminders aren’t set up yet.',
}

export function Settings() {
  return (
    <>
      <h1 className="h-page">Settings</h1>
      <Reminders />
      <section className="stack">
        <h2 className="h-section">Account</h2>
        <a href="#me" className="mode-pick uy-state">
          <span className="lead">
            <Icon name="person" />
          </span>
          <span className="grow mode-body">
            <span className="title-m">Account and family</span>
            <span className="meta">Sign in, your name, family invite code</span>
          </span>
          <Icon name="chevron_right" className="chev" />
        </a>
      </section>
    </>
  )
}

/** SAT Prep Words reminders: on or off for this device, and when. */
function Reminders() {
  const acct = useAccount()
  const uid = acct.session?.user.id
  const [state, setState] = useState<PushState | null>(null)
  const [prefs, setPrefs] = useState<ReminderPrefs>(loadPrefs)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    pushState().then(setState, () => setState('unsupported'))
  }, [])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const change = (patch: Partial<ReminderPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    storePrefs(next)
    if (state === 'on') void run(() => savePrefsToServer(next))
  }

  const canToggle = state === 'on' || state === 'off'
  const note = state && (!uid && canToggle ? 'Sign in to get reminders.' : REMINDER_NOTE[state])

  return (
    <section className="stack">
      <h2 className="h-section">SAT reminders</h2>
      <div className="mode-pick reminder">
        <span className="lead">
          <Icon name="notifications" />
        </span>
        <span className="grow mode-body">
          <span className="title-m">On this device</span>
          <span className="meta">{note ?? (state === 'on' ? 'On' : state === 'off' ? 'Off' : '…')}</span>
          {error && <span className="meta error-text">{error}</span>}
        </span>
        {canToggle && uid && (
          <button
            type="button"
            className={`uy-btn uy-state ${state === 'on' ? 'uy-btn--outlined' : 'uy-btn--tonal'}`}
            disabled={busy}
            onClick={() => void run(async () => setState(state === 'on' ? await turnOff() : await turnOn(uid)))}
          >
            {state === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>

      <div className="settings-grid">
        <Select
          label="New words (Monday to Saturday)"
          value={prefs.dailyHour === null ? 'off' : String(prefs.dailyHour)}
          onChange={(v) => change({ dailyHour: v === 'off' ? null : Number(v) })}
          options={[['off', 'No reminder'], ...HOURS.map((h): [string, string] => [String(h), hourLabel(h)])]}
        />
        <div className="row nowrap two">
          <Select
            label="Weekly quiz"
            value={String(prefs.quizDay)}
            onChange={(v) => change({ quizDay: Number(v) })}
            options={DAYS.map((d, i): [string, string] => [String(i), d])}
          />
          <Select
            label="at"
            value={prefs.quizHour === null ? 'off' : String(prefs.quizHour)}
            onChange={(v) => change({ quizHour: v === 'off' ? null : Number(v) })}
            options={[['off', 'No reminder'], ...HOURS.map((h): [string, string] => [String(h), hourLabel(h)])]}
          />
        </div>
      </div>
      <p className="meta">
        The weekly quiz covers that week’s words up to the day you pick. Times are in this phone’s time zone ({timeZone()}).
      </p>
    </section>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <label className="uy-field grow">
      <span className="uy-field__label">{label}</span>
      <span className="uy-field__control select">
        <select className="uy-field__input" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Icon name="expand_more" />
      </span>
    </label>
  )
}
