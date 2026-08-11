// Service Worker do Finanças Pessoais.
//
// Escopo desta versão (Fase 1/4): cache apenas do "app shell" estático
// (index.html, ícones, manifest, página offline) — o suficiente para exibir
// uma tela offline informativa quando não há conexão. NÃO fazemos cache de
// chamadas ao Supabase nem de qualquer dado financeiro: este app depende de
// conexão para carregar e salvar dados, e isso é intencional (ver README,
// seção "Limitações do PWA").
//
// Atualização do Service Worker é controlada pelo usuário: uma nova versão
// fica "esperando" até o app mandar a mensagem SKIP_WAITING (disparada pelo
// botão "Atualizar agora" exibido na interface).

const CACHE_VERSION = 'financas-shell-v1'
const APP_SHELL = ['/', '/index.html', '/offline.html', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Falhas ao pré-cachear não devem impedir a instalação do SW.
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Nunca interceptar chamadas ao Supabase (autenticação e dados financeiros).
  if (url.origin !== self.location.origin) return

  // Navegação (abrir/recarregar a página): tenta rede; se falhar, cai para a
  // página offline informativa.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }

  // Assets estáticos conhecidos do app shell: cache-first.
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)))
  }
})
