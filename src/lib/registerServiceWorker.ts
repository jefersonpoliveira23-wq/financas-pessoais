/**
 * Registra o Service Worker apenas em produção (evita cache agressivo
 * atrapalhar o hot reload durante o desenvolvimento).
 *
 * A atualização é controlada: quando uma nova versão fica pronta, disparamos
 * o evento "sw-update-available" no window. Um componente da UI escuta esse
 * evento e mostra um botão "Atualizar agora" — o usuário decide quando
 * recarregar, em vez de a página recarregar sozinha.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }))
          }
        })
      })
    } catch {
      // Sem service worker, o app continua funcionando normalmente online —
      // apenas sem a tela offline informativa.
    }
  })
}

export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage('SKIP_WAITING')
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload())
}
