// Activate updated service workers immediately so push keeps working after deploys.
self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    if (!event.data) {
        return;
    }

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { body: event.data.text() };
    }

    const title = data.title || 'HelloUni';
    const options = {
        body: data.body || 'Neue Benachrichtigung',
        icon: '/logo_background.png',
        badge: '/logo_background.png',
        data: data.data || {}, // Contains url to open
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Relative path from the push payload, resolved against the SW origin.
    const targetPath = (event.notification.data && event.notification.data.url) || '/notifications';
    const targetUrl = new URL(targetPath, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Reuse an already open app window: navigate it and focus.
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    if ('navigate' in client) {
                        return client.navigate(targetUrl).then(function (c) {
                            return (c || client).focus();
                        });
                    }
                    return client.focus();
                }
            }
            // Otherwise open a fresh window.
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
