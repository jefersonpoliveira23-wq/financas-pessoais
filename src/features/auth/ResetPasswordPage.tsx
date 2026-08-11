import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/schemas/auth.schema'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

/**
 * Página acessada a partir do link enviado por e-mail (fluxo do Supabase
 * Auth: o link já autentica a sessão temporariamente antes de chegar aqui).
 */
export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(data: ResetPasswordFormData) {
    setFormError(null)
    const { error } = await updatePassword(data.password)
    if (error) {
      setFormError(error)
      return
    }
    navigate('/inicio', { replace: true })
  }

  return (
    <AuthLayout title="Definir nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {formError && (
          <p role="alert" className="text-sm text-(--color-danger-600)">
            {formError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  )
}
