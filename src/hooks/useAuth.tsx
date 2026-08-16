import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true enquanto a sessão inicial ainda está sendo carregada do storage/Supabase */
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  /** Exclusão definitiva da conta via Edge Function (service_role nunca roda no navegador). */
  deleteAccount: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Traduz as mensagens de erro mais comuns do Supabase Auth para português. */
function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha inválidos.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  }
  return map[message] ?? message
}

/**
 * O cadastro é restrito a e-mails autorizados (ver migration 0006):
 * o trigger handle_new_user aborta a criação do usuário quando o e-mail
 * não está na lista, e o Supabase costuma devolver um erro genérico
 * ("Database error saving new user") em vez do texto original da exceção.
 * Qualquer erro de signUp fora do mapa conhecido é tratado como bloqueio
 * de autorização — é o cenário mais provável nesse fluxo.
 */
function translateSignUpError(message: string): string {
  const known: Record<string, string> = {
    'User already registered': 'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  }
  if (known[message]) return known[message]
  return 'Este e-mail ainda não está autorizado a criar conta neste aplicativo. Peça para o administrador liberar o acesso.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? translateAuthError(error.message) : null }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error ? translateSignUpError(error.message) : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    return { error: error ? translateAuthError(error.message) : null }
  }

  // O redirecionamento pós-login social (Google/GitHub) precisa estar
  // cadastrado em Authentication → URL Configuration → Redirect URLs no
  // painel do Supabase (mesma tela usada para o fluxo de "esqueci a senha").
  async function signInWithOAuth(provider: 'google' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/inicio` },
    })
    return { error: error ? translateAuthError(error.message) : null }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error ? translateAuthError(error.message) : null }
  }

  async function deleteAccount() {
    const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>('delete-account')
    if (error) {
      return { error: 'Não foi possível excluir a conta. Tente novamente em instantes.' }
    }
    if (data?.error) {
      return { error: data.error }
    }
    // A conta já foi apagada no servidor — encerra a sessão local também.
    await supabase.auth.signOut()
    return { error: null }
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    deleteAccount,
    signInWithOAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>')
  }
  return context
}
