// Service Worker for push notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    data: data.data || {},
    requireInteraction: false,
    silent: data.silent || false,
    tag: "kit-friend-digest", // Replace notifications with same tag
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  // Open the app
  event.waitUntil(clients.openWindow("/"));
});
