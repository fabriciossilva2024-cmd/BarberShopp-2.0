const CACHE_NAME = 'barberpro-premium-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalação: Cache inicial de arquivos estáticos críticos
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Estratégia Network First com exclusão de API
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // SEGURANÇA: Não interceptar requisições ao Supabase ou APIs externas
  if (requestUrl.hostname.includes('supabase.co')) {
    return;
  }

  // SEGURANÇA: Apenas métodos GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratégia: Network First (Tenta rede, se falhar ou der erro, tenta cache)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida (status 200), clona e atualiza o cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Se estiver offline ou a rede falhar, tenta servir do cache
        // Se for uma navegação de página (mode: navigate), retorna a index.html do cache como fallback
        if (event.request.mode === 'navigate') {
            return caches.match('./') || caches.match('./index.html');
        }
        return caches.match(event.request);
      })
  );
});