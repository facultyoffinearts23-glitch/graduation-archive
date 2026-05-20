// ============================================================
//  sw.js — Service Worker للـ PWA
//  غيّر CACHE_NAME عند كل تحديث رئيسي للملفات (v1 → v2 ...)
// ============================================================

const CACHE_NAME = 'app-cache-v1';
const REPO_NAME  = '/REPO_NAME'; // ← غيّر هذا باسم مستودعك

// الموارد التي تُخزَّن عند أول تثبيت
const STATIC_ASSETS = [
  `${REPO_NAME}/`,
  `${REPO_NAME}/index.html`,
  `${REPO_NAME}/manifest.json`,

  // ── Google Fonts (أضف روابطك هنا) ──
  // 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap',

  // ── Font Awesome ──
  // 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',

  // ── Tailwind CDN ──
  // 'https://cdn.tailwindcss.com',

  // ── ملفات CSS/JS محلية إضافية ──
  // `${REPO_NAME}/style.css`,
  // `${REPO_NAME}/app.js`,
];

// روابط API — لا تُخزَّن أبداً (Network Only)
const API_ORIGINS = [
  'script.google.com',
  'script.googleusercontent.com',
  // أضف نطاقات API الأخرى هنا
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1) Network Only — APIs الخارجية
  if (API_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2) Network First — الصفحة الرئيسية
  if (url.pathname === `${REPO_NAME}/` ||
      url.pathname === `${REPO_NAME}/index.html`) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3) Cache First — كل الموارد الأخرى
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
