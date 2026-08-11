import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas/auth.schema'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(data: ForgotPasswordFormData) {
    setFormError(null)
    const { error } = await requestPasswordReset(data.email)
    if (error) {
      setFormError(error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout title="Verifique seu e-mail" subtitle="Enviamos as instruções de redefinição.">
        <p className="text-sm text-(--color-ink-600)">
          Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha.
        </p>
        <Link to="/entrar" className="mt-6 inline-block text-sm text-(--color-navy-700) hover:underline">
          Voltar para o login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Esqueci minha senha" subtitle="Informe seu e-mail para receber o link de redefinição.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />

        {formError && (
          <p role="alert" className="text-sm text-(--color-danger-600)">
            {formError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Enviar link
        </Button>

        <Link to="/entrar" className="text-center text-sm text-(--color-navy-700) hover:underline">
          Voltar para o login
        </Link>
      </form>
    </AuthLayout>
  )
}
