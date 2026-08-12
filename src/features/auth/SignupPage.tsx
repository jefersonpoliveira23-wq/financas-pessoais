import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema, type SignUpFormData } from '@/schemas/auth.schema'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { SocialLoginButtons } from '@/features/auth/SocialLoginButtons'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) })

  async function onSubmit(data: SignUpFormData) {
    setFormError(null)
    const { error } = await signUp(data.email, data.password, data.fullName)
    if (error) {
      setFormError(error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout title="Confira seu e-mail" subtitle="Falta pouco para começar.">
        <p className="text-sm text-(--color-ink-600)">
          Enviamos um link de confirmação para o seu e-mail. Confirme o cadastro e depois volte para entrar na sua
          conta.
        </p>
        <Button className="mt-6 w-full" variant="secondary" onClick={() => navigate('/entrar')}>
          Voltar para o login
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input label="Nome completo" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmar senha"
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
          Criar conta
        </Button>

        <SocialLoginButtons />

        <p className="text-center text-sm text-(--color-ink-400)">
          Já tem conta?{' '}
          <Link to="/entrar" className="text-(--color-navy-700) hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
