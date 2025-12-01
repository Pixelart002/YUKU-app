// File: sw.js
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/ofc.jpg', // Optional: Add an icon in this path
    image: data.image, // For displaying a larger image
    badge: '/ofc.jpg', // Optional: Add a badge icon
    data: {
      url: data.url || '/' // URL to open on click
    } 
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});