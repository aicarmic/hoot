import { useState } from 'react'
import { createFamily, joinFamily, renameMe, signIn, signOut, signUp, useAccount } from '../lib/account'
import { syncNow } from '../lib/sync'

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

export function Me() {
  const acct = useAccount()
  if (!acct.ready) return <p className="meta">Loading…</p>
  if (!acct.session) return <SignIn />
  return (
    <>
      <h1>Hi, {acct.profile?.display_name ?? 'there'}</h1>
      <p className="meta">{acct.session.user.email} · progress syncs across your devices</p>
      {acct.family ? <FamilyCard /> : <JoinOrCreate />}
      <Rename current={acct.profile?.display_name ?? ''} />
      <button type="button" className="ghost danger" onClick={() => void signOut()}>
        Sign out
      </button>
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
      <h1>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
      <p className="meta">Sign in to keep your progress safe, use Hoot on more than one device, and see how the family is getting on.</p>
      <form
        className="import"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            if (mode === 'in') await signIn(email, password)
            else if ((await signUp(name, email, password)) === 'confirm-email')
              setNote('Nearly there! Check your email, tap the link, then come back and sign in.')
          })
        }}
      >
        {mode === 'up' && (
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" placeholder="What the family calls you" />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {note && <p className="feedback ok">{note}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="meta center-text">
        {mode === 'in' ? 'New to Hoot? ' : 'Already have an account? '}
        <button type="button" className="text-btn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
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
    <section>
      <h2>Your family</h2>
      <p className="meta">Join your family with the code someone shared, or start one and invite everyone.</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await joinFamily(code)
            await syncNow()
          })
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invite code, e.g. 7F3K9A" className="grow" required />
        <button type="submit" className="primary" disabled={busy}>
          Join
        </button>
      </form>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await createFamily(name)
            await syncNow()
          })
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Family name, e.g. The Hoots" className="grow" />
        <button type="submit" className="ghost" disabled={busy}>
          Start a family
        </button>
      </form>
      {error && <p className="error">{error}</p>}
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
    <section>
      <h2>{family.name}</h2>
      <div className="deck">
        <span className="meta">Invite code</span>
        <span className="code">{family.invite_code}</span>
        <span className="meta">{members.map((m) => m.display_name).join(', ')}</span>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="ghost" onClick={() => void share()}>
          {copied ? 'Copied!' : 'Invite someone'}
        </button>
        <a className="primary" href="#family">
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
    <section>
      <h2>Your name</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => renameMe(name))
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} className="grow" required />
        <button type="submit" className="ghost" disabled={busy || name.trim() === current}>
          Save
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
