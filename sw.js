const CACHE_NAME = '2.9.0';
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './manifest.json',
    './images/yellow_bg.png',
    './images/app-navbar-logo-yellow-transparent.png',
    './assets/chapters.json',
    './assets/verse.json',
    './assets/timeline.json',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/js/all.min.js'
];

// Add all 90 chapters to cache
for (let i = 1; i <= 90; i++) {
    urlsToCache.push(`./assets/verse_translation/chapter_${i}.json`);
}

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch resources
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// Activate Service Worker and clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
