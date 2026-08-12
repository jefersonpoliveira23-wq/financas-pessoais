import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.11.82-.27.82-.6 0-.29-.01-1.24-.02-2.25-3.34.75-4.04-1.44-4.04-1.44-.55-1.43-1.34-1.82-1.34-1.82-1.09-.77.08-.75.08-.75 1.21.09 1.84 1.28 1.84 1.28 1.07 1.87 2.81 1.33 3.49 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.38-5.47-6.15 0-1.36.47-2.47 1.24-3.34-.12-.31-.54-1.57.12-3.28 0 0 1.01-.33 3.3 1.28a11.2 11.2 0 0 1 6.01 0c2.29-1.61 3.3-1.28 3.3-1.28.66 1.71.24 2.97.12 3.28.77.87 1.24 1.98 1.24 3.34 0 4.78-2.81 5.84-5.49 6.15.43.38.81 1.13.81 2.28 0 1.65-.02 2.98-.02 3.38 0 .33.22.72.83.6C20.56 22.34 24 17.74 24 12.3 24 5.5 18.63 0 12 0Z" />
    </svg>
  )
}

/** Botões de login social — o vínculo com auth.users e RLS já funciona igual ao e-mail/senha, sem nenhuma mudança no banco. */
export function SocialLoginButtons() {
  const { signInWithOAuth } = useAuth()
  const { showToast } = useToast()
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null)

  async function handleClick(provider: 'google' | 'github') {
    setLoadingProvider(provider)
    const { error } = await signInWithOAuth(provider)
    if (error) {
      showToast('error', error)
      setLoadingProvider(null)
    }
    // Em caso de sucesso o navegador é redirecionado para o provedor —
    // não há mais nada para fazer aqui.
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-(--color-ink-400)">
        <span className="h-px flex-1 bg-(--color-navy-100)" />
        ou continue com
        <span className="h-px flex-1 bg-(--color-navy-100)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          isLoading={loadingProvider === 'google'}
          disabled={loadingProvider !== null && loadingProvider !== 'google'}
          onClick={() => handleClick('google')}
        >
          <GoogleIcon />
          <span className="ml-2">Google</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          isLoading={loadingProvider === 'github'}
          disabled={loadingProvider !== null && loadingProvider !== 'github'}
          onClick={() => handleClick('github')}
        >
          <GithubIcon />
          <span className="ml-2">GitHub</span>
        </Button>
      </div>
    </div>
  )
}
