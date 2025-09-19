/**
 * SimplifiAccess Neo - Service Worker
 * Advanced caching and offline functionality
 */

const CACHE_NAME = 'simplifiaccess-neo-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// Files to cache immediately
const STATIC_FILES = [
    '/neo/',
    '/neo/index.html',
    '/neo/css/neo.css',
    '/neo/js/neo/core.js',
    '/neo/js/neo/components.js',
    '/neo/js/neo/api.js',
    '/neo/js/neo/app.js',
    '/neo/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/health',
    '/api/stats',
    '/api/doors',
    '/api/users',
    '/api/events'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(request));
    } else if (url.pathname.startsWith('/neo/') || url.pathname === '/neo/') {
        event.respondWith(handleStaticRequest(request));
    } else if (url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'fonts.googleapis.com') {
        event.respondWith(handleExternalRequest(request));
    } else {
        event.respondWith(handleOtherRequest(request));
    }
});

// Handle API requests with smart caching
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    const cache = await caches.open(API_CACHE);
    
    try {
        // Try network first for API requests
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
            return networkResponse;
        } else {
            // If network fails, try cache
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            throw new Error('Network failed and no cache available');
        }
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log('Serving API from cache:', request.url);
            return cachedResponse;
        }
        
        // No cache available, return offline response
        return new Response(
            JSON.stringify({ 
                error: 'Offline', 
                message: 'No internet connection and no cached data available' 
            }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle static file requests
async function handleStaticRequest(request) {
    const cache = await caches.open(STATIC_CACHE);
    
    try {
        // Try cache first for static files
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // Cache the response for future use
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // If both cache and network fail, return offline page
        return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
                <title>Offline - SimplifiAccess Neo</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #0a0a0a;
                        color: white;
                        text-align: center;
                    }
                    .offline-content {
                        max-width: 400px;
                        padding: 2rem;
                    }
                    .offline-icon {
                        font-size: 4rem;
                        margin-bottom: 1rem;
                    }
                    h1 { margin-bottom: 1rem; }
                    p { color: #a0a0a0; margin-bottom: 2rem; }
                    .retry-btn {
                        background: #6366f1;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-size: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="offline-content">
                    <div class="offline-icon">🔐</div>
                    <h1>You're Offline</h1>
                    <p>Please check your internet connection and try again.</p>
                    <button class="retry-btn" onclick="window.location.reload()">
                        Try Again
                    </button>
                </div>
            </body>
            </html>`,
            { 
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }
}

// Handle external CDN requests
async function handleExternalRequest(request) {
    const cache = await caches.open(STATIC_CACHE);
    
    try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fetch from network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return a fallback response for external resources
        return new Response('', { status: 404 });
    }
}

// Handle other requests
async function handleOtherRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        return new Response('Not found', { status: 404 });
    }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'door-control') {
        event.waitUntil(syncDoorControls());
    } else if (event.tag === 'user-actions') {
        event.waitUntil(syncUserActions());
    }
});

// Sync door control actions when back online
async function syncDoorControls() {
    try {
        const cache = await caches.open('offline-actions');
        const requests = await cache.keys();
        
        for (const request of requests) {
            if (request.url.includes('/doors/') && request.url.includes('/control')) {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.delete(request);
                        console.log('Synced door control action:', request.url);
                    }
                } catch (error) {
                    console.error('Failed to sync door control action:', error);
                }
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Sync user actions when back online
async function syncUserActions() {
    try {
        const cache = await caches.open('offline-actions');
        const requests = await cache.keys();
        
        for (const request of requests) {
            if (request.url.includes('/users/')) {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.delete(request);
                        console.log('Synced user action:', request.url);
                    }
                } catch (error) {
                    console.error('Failed to sync user action:', error);
                }
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from SimplifiAccess',
        icon: '/neo/icon-192.png',
        badge: '/neo/icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/neo/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App',
                icon: '/neo/icon-192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/neo/icon-192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('SimplifiAccess Neo', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/neo/')
        );
    }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE)
                .then(cache => cache.addAll(event.data.urls))
        );
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync triggered:', event.tag);
    
    if (event.tag === 'health-check') {
        event.waitUntil(performHealthCheck());
    }
});

// Perform periodic health check
async function performHealthCheck() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            console.log('Health check successful');
        } else {
            console.log('Health check failed:', response.status);
        }
    } catch (error) {
        console.error('Health check error:', error);
    }
}

console.log('Service Worker loaded successfully');