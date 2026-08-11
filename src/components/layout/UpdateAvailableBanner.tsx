import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { applyServiceWorkerUpdate } from '@/lib/registerServiceWorker'
import { Button } from '@/components/ui/Button'

/** Mostra um aviso discreto quando há uma nova versão do app pronta, sem recarregar sozinho. */
export function UpdateAvailableBanner() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    function handleUpdate(event: Event) {
      setRegistration((event as CustomEvent<ServiceWorkerRegistration>).detail)
    }
    window.addEventListener('sw-update-available', handleUpdate)
    return () => window.removeEventListener('sw-update-available', handleUpdate)
  }, [])

  if (!registration) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-3 bg-(--color-navy-900) px-4 py-2.5 text-sm text-white">
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      <span>Uma nova versão do app está disponível.</span>
      <Button size="sm" variant="secondary" onClick={() => applyServiceWorkerUpdate(registration)}>
        Atualizar agora
      </Button>
    </div>
  )
}
