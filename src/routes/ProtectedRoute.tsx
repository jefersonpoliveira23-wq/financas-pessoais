import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/Skeleton'

/** Bloqueia acesso a quem não estiver autenticado, redirecionando para /entrar. */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-(--color-surface) p-6">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/entrar" replace state={{ from: location }} />
  }

  return <Outlet />
}

/** Impede que um usuário já autenticado veja telas de login/cadastro. */
export function PublicOnlyRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) return null

  if (session) {
    return <Navigate to="/inicio" replace />
  }

  return <Outlet />
}
