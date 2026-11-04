// Loaded into Hoot's service worker (see importScripts in vite.config.ts).
// Shows the daily reminders sent by scripts/sat-nudge.mjs and opens Hoot when one is tapped.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const scope = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hoot', {
      body: data.body || '',
      icon: new URL('icons/icon-192.png', scope).href,
      badge: new URL('icons/badge-96.png', scope).href,
      tag: data.tag || 'hoot',
      data: { url: new URL(data.url || '', scope).href },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          await client.focus()
          return 'navigate' in client ? client.navigate(url) : undefined
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
