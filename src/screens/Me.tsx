import { useState } from 'react'
import { createFamily, joinFamily, renameMe, signIn, signOut, signUp, useAccount } from '../lib/account'
import { syncNow } from '../lib/sync'
import { Icon } from '../ui/Icon'
import { TextField } from '../ui/TextField'

function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
  return { busy, error, run }
}

function ErrorText({ error }: { error: string }) {
  if (!error) return null
  return (
    <p className="error">
      <Icon name="error" />
      {error}
    </p>
  )
}

export function Me() {
  const acct = useAccount()
  if (!acct.ready) return <p className="meta">Loading…</p>
  if (!acct.session) return <SignIn />
  return (
    <>
      <div className="stack">
        <h1 className="h-page">Hi, {acct.profile?.display_name ?? 'there'}</h1>
        <p className="meta">{acct.session.user.email} · progress syncs across your devices</p>
      </div>
      {acct.family ? <FamilyCard /> : <JoinOrCreate />}
      <Rename current={acct.profile?.display_name ?? ''} />
      <section>
        <button type="button" className="uy-btn uy-state uy-btn--outlined uy-btn--with-icon" onClick={() => void signOut()}>
          <Icon name="logout" />
          Sign out
        </button>
      </section>
    </>
  )
}

function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')
  const { busy, error, run } = useAction()

  return (
    <>
      <div className="stack">
        <h1 className="h-page">{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
        <p className="meta">Sign in to keep your progress safe, use Hoot on more than one device, and see how the family is getting on.</p>
      </div>
      <form
        className="stack-4"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            if (mode === 'in') await signIn(email, password)
            else if ((await signUp(name, email, password)) === 'confirm-email')
              setNote('Nearly there. Check your email, tap the link, then come back and sign in.')
          })
        }}
      >
        {mode === 'up' && (
          <TextField
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="given-name"
            placeholder="What the family calls you"
          />
        )}
        <TextField
          label="Email"
          type="email"
          leadingIcon="mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          leadingIcon="lock"
          support={mode === 'up' ? 'At least 6 characters' : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />
        <ErrorText error={error} />
        {note && (
          <p className="feedback ok" role="status">
            {note}
          </p>
        )}
        <button type="submit" className="uy-btn uy-state uy-btn--filled block" disabled={busy}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="meta center-text">
        {mode === 'in' ? 'New to Hoot? ' : 'Already have an account? '}
        <button type="button" className="uy-btn uy-state uy-btn--text" style={{ height: 32 }} onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </>
  )
}

function JoinOrCreate() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const { busy, error, run } = useAction()
  return (
    <section className="stack-3">
      <h2 className="h-section">Your family</h2>
      <p className="meta">Join your family with the code someone shared, or start one and invite everyone.</p>
      <form
        className="row nowrap"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await joinFamily(code)
            await syncNow()
          })
        }}
      >
        <TextField
          label="Invite code"
          fieldClassName="grow"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 7F3K9A"
          autoCapitalize="characters"
          required
        />
        <button type="submit" className="uy-btn uy-state uy-btn--filled" disabled={busy}>
          Join
        </button>
      </form>
      <form
        className="row nowrap"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await createFamily(name)
            await syncNow()
          })
        }}
      >
        <TextField
          label="Or start a new family"
          fieldClassName="grow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Family name, e.g. The Hoots"
        />
        <button type="submit" className="uy-btn uy-state uy-btn--outlined" disabled={busy}>
          Start
        </button>
      </form>
      <ErrorText error={error} />
    </section>
  )
}

function FamilyCard() {
  const { family, members } = useAccount()
  const [copied, setCopied] = useState(false)
  if (!family) return null
  const share = async () => {
    const text = `Join our family on Hoot: ${location.origin}${location.pathname}#me (invite code ${family.invite_code})`
    try {
      if (navigator.share) await navigator.share({ title: 'Hoot', text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <section className="stack-3">
      <h2 className="h-section">{family.name}</h2>
      <div className="uy-card uy-card--outlined" style={{ gap: 4 }}>
        <span className="label">Invite code</span>
        <span className="code">{family.invite_code}</span>
        <span className="meta">{members.map((m) => m.display_name).join(', ')}</span>
      </div>
      <div className="row">
        <button type="button" className="uy-btn uy-state uy-btn--outlined uy-btn--with-icon" onClick={() => void share()}>
          <Icon name={copied ? 'check' : 'person_add'} />
          {copied ? 'Link copied' : 'Invite someone'}
        </button>
        <a className="uy-btn uy-state uy-btn--filled" href="#family">
          See family progress
        </a>
      </div>
    </section>
  )
}

function Rename({ current }: { current: string }) {
  const [name, setName] = useState(current)
  const { busy, error, run } = useAction()
  return (
    <section className="stack-3">
      <h2 className="h-section">Your name</h2>
      <form
        className="row nowrap"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => renameMe(name))
        }}
      >
        <TextField
          label="What the family calls you"
          fieldClassName="grow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" className="uy-btn uy-state uy-btn--tonal" disabled={busy || name.trim() === current}>
          Save
        </button>
      </form>
      <ErrorText error={error} />
    </section>
  )
}
