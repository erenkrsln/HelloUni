self.addEventListener('push', function (event) {
    if (!event.data) {
        return;
    }

    try {
        const data = event.data.json();
        const title = data.title || 'HelloUni';
        const options = {
            body: data.body || 'Neue Benachrichtigung',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: data.data || {}, // Contains url to open
            vibrate: [100, 50, 100],
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (e) {
        console.error('Error handling push event:', e);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // URL to open
    const urlToOpen = event.notification.data?.url || '/notifications';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Check if window is already open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
