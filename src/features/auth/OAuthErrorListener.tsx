import { useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'

/**
 * O login social (Google/GitHub) não passa pelo signInWithOAuth para tratar
 * erros — o usuário é redirecionado direto pelo provedor de volta para o
 * app, e o Supabase acrescenta `error`/`error_description` na URL quando
 * algo falha no servidor (ex.: e-mail fora da lista de autorizados da
 * migration 0006). Esse listener roda uma vez no carregamento do app para
 * capturar esse caso e mostrar um aviso, já que nenhuma tela específica
 * "recebe" esse retorno.
 */
export function OAuthErrorListener() {
  const { showToast } = useToast()

  useEffect(() => {
    const url = new URL(window.location.href)
    const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
    const errorDescription = url.searchParams.get('error_description') ?? hashParams.get('error_description')
    const errorCode = url.searchParams.get('error') ?? hashParams.get('error')

    if (!errorDescription && !errorCode) return

    showToast(
      'error',
      'Não foi possível entrar. Se seu e-mail ainda não foi autorizado, peça para o administrador liberar o acesso.',
    )

    url.search = ''
    url.hash = ''
    window.history.replaceState({}, '', url.toString())
  }, [showToast])

  return null
}
