import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

export interface Profile {
  id: string
  display_name: string
  family_id: string | null
}
export interface Family {
  id: string
  name: string
  invite_code: string
}

export interface AccountState {
  ready: boolean
  session: Session | null
  profile: Profile | null
  family: Family | null
  members: Profile[]
}

let state: AccountState = { ready: false, session: null, profile: null, family: null, members: [] }
const listeners = new Set<() => void>()

function setState(patch: Partial<AccountState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export const getAccount = () => state

/** Reload profile, family and members for the signed-in user. */
export async function refreshAccount(): Promise<void> {
  const session = state.session
  if (!session) {
    setState({ profile: null, family: null, members: [], ready: true })
    return
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, family_id')
    .eq('id', session.user.id)
    .maybeSingle()
  let family: Family | null = null
  let members: Profile[] = []
  if (profile?.family_id) {
    const [f, m] = await Promise.all([
      supabase.from('families').select('id, name, invite_code').eq('id', profile.family_id).maybeSingle(),
      supabase.from('profiles').select('id, display_name, family_id').eq('family_id', profile.family_id).order('display_name'),
    ])
    family = f.data
    members = m.data ?? []
  }
  setState({ profile, family, members, ready: true })
}

const onSessionListeners = new Set<(s: Session | null) => void>()
export function onSessionChange(fn: (s: Session | null) => void) {
  onSessionListeners.add(fn)
}

export function initAccount() {
  supabase.auth.getSession().then(({ data }) => {
    setState({ session: data.session })
    void refreshAccount().then(() => onSessionListeners.forEach((f) => f(data.session)))
  })
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return
    const changed = session?.user.id !== state.session?.user.id
    setState({ session })
    if (changed) void refreshAccount().then(() => onSessionListeners.forEach((f) => f(session)))
  })
}

const friendly = (e: { message: string } | null) => {
  if (!e) return
  const m = e.message
  if (/invalid login/i.test(m)) throw new Error('That email and password don’t match.')
  if (/already registered/i.test(m)) throw new Error('That email already has an account. Try signing in.')
  if (/email not confirmed/i.test(m)) throw new Error('Check your email and tap the confirmation link first.')
  throw new Error(m)
}

export async function signUp(name: string, email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name.trim() }, emailRedirectTo: location.origin + location.pathname },
  })
  friendly(error)
  return data.session ? 'signed-in' : 'confirm-email'
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  friendly(error)
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function createFamily(name: string) {
  const { error } = await supabase.rpc('create_family', { family_name: name })
  friendly(error)
  await refreshAccount()
}

export async function joinFamily(code: string) {
  const { error } = await supabase.rpc('join_family', { code })
  friendly(error)
  await refreshAccount()
}

export async function renameMe(name: string) {
  if (!state.session) return
  const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', state.session.user.id)
  friendly(error)
  await refreshAccount()
}
