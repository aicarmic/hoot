import { supabase } from './supabase'

/**
 * Daily reminders by Web Push. This device subscribes through the service worker and saves the
 * subscription in Supabase (push_subscriptions). A GitHub Actions job (.github/workflows/sat-nudge.yml)
 * sends the 5 pm reminder to every saved subscription. See docs/SETUP-reminders.md.
 */

/** The VAPID public key, set as a repository variable at build time. Public by design. */
const VAPID_PUBLIC_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

export type PushState =
  | 'not-set-up' // no VAPID key in this build
  | 'install-first' // iPhone or iPad in Safari: push only works from the Home Screen app
  | 'unsupported'
  | 'blocked' // the person said no to notifications
  | 'off'
  | 'on'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  // `ready` never settles without a service worker (e.g. the dev server), so give up after a while.
  return Promise.race([navigator.serviceWorker.ready, new Promise<undefined>((r) => setTimeout(() => r(undefined), 4000))])
}

export async function pushState(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY) return 'not-set-up'
  if (!supported()) return isIOS() && !isStandalone() ? 'install-first' : 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Ask for permission, subscribe this device and save it for the signed-in person. */
export async function turnOn(userId: string): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    user_id: userId,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  })
  if (error) {
    await sub.unsubscribe()
    throw new Error(error.message)
  }
  return 'on'
}

export async function turnOff(): Promise<PushState> {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'off'
}
