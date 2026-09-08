// Imported by the generated Workbox service worker (see vite.config workbox.importScripts).
// Handles incoming Web Push messages and taps on the notification.
/* global self, clients */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (_e) { data = { body: event.data && event.data.text() } }
  const title = data.title || "SA'DA ONE"
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link: data.link || '/' },
    tag: data.tag || undefined,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.navigate(link); return w.focus() }
      }
      if (clients.openWindow) return clients.openWindow(link)
    })
  )
})
