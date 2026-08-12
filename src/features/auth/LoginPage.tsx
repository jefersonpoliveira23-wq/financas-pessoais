import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema, type SignInFormData } from '@/schemas/auth.schema'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { SocialLoginButtons } from '@/features/auth/SocialLoginButtons'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) })

  async function onSubmit(data: SignInFormData) {
    setFormError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setFormError(error)
      return
    }
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/inicio'
    navigate(from, { replace: true })
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua conta para continuar.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {formError && (
          <p role="alert" className="text-sm text-(--color-danger-600)">
            {formError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Entrar
        </Button>

        <SocialLoginButtons />

        <div className="flex items-center justify-between text-sm">
          <Link to="/esqueci-senha" className="text-(--color-navy-700) hover:underline">
            Esqueci minha senha
          </Link>
          <Link to="/cadastro" className="text-(--color-navy-700) hover:underline">
            Criar conta
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
