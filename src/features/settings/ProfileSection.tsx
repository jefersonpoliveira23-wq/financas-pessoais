import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updatePasswordSchema, type UpdatePasswordFormData } from '@/schemas/auth.schema'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const nameSchema = z.object({ fullName: z.string().trim().min(2, 'Informe seu nome completo.').max(120) })
type NameFormValues = z.infer<typeof nameSchema>

export function ProfileSection() {
  const { user, updatePassword, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { showToast } = useToast()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    reset: resetName,
    formState: { errors: nameErrors, isSubmitting: isSavingName },
  } = useForm<NameFormValues>({ resolver: zodResolver(nameSchema) })

  useEffect(() => {
    if (profile) resetName({ fullName: profile.full_name })
  }, [profile, resetName])

  async function onSaveName(data: NameFormValues) {
    try {
      await updateProfile.mutateAsync({ full_name: data.fullName })
      showToast('success', 'Nome atualizado.')
    } catch {
      showToast('error', 'Não foi possível atualizar o nome.')
    }
  }

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSavingPassword },
  } = useForm<UpdatePasswordFormData>({ resolver: zodResolver(updatePasswordSchema) })

  async function onChangePassword(data: UpdatePasswordFormData) {
    const { error } = await updatePassword(data.newPassword)
    if (error) {
      showToast('error', error)
      return
    }
    showToast('success', 'Senha alterada com sucesso.')
    resetPassword()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Perfil" subtitle="Suas informações pessoais." />
        <form className="flex max-w-sm flex-col gap-4" onSubmit={handleNameSubmit(onSaveName)} noValidate>
          <Input label="E-mail" value={user?.email ?? ''} disabled />
          <Input label="Nome completo" error={nameErrors.fullName?.message} {...registerName('fullName')} />
          <Button type="submit" isLoading={isSavingName || updateProfile.isPending} className="self-start">
            Salvar nome
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Alterar senha" />
        <form className="flex max-w-sm flex-col gap-4" onSubmit={handlePasswordSubmit(onChangePassword)} noValidate>
          <Input
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword('currentPassword')}
          />
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
            error={passwordErrors.newPassword?.message}
            {...registerPassword('newPassword')}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.confirmNewPassword?.message}
            {...registerPassword('confirmNewPassword')}
          />
          <Button type="submit" isLoading={isSavingPassword} className="self-start">
            Alterar senha
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Excluir conta" subtitle="Ação permanente e irreversível." />
        <p className="mb-4 text-sm text-(--color-ink-600)">
          Todos os seus dados — contas, movimentações, cartões, dívidas, metas, patrimônio e orçamentos — serão apagados
          definitivamente. Isso não pode ser desfeito. A exclusão roda em uma Supabase Edge Function com a chave{' '}
          <code className="rounded bg-(--color-surface-alt) px-1">service_role</code> (nunca exposta no navegador), que
          remove apenas a conta autenticada fazendo a chamada.
        </p>
        <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
          Excluir minha conta
        </Button>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Excluir conta definitivamente?"
        description="Essa ação apaga todos os seus dados financeiros e não pode ser desfeita. Tem certeza que deseja continuar?"
        confirmLabel="Excluir minha conta"
        isDangerous
        isLoading={isDeleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true)
          const { error } = await deleteAccount()
          setIsDeleting(false)
          if (error) {
            showToast('error', error)
            return
          }
          setDeleteConfirmOpen(false)
          navigate('/entrar', { replace: true })
        }}
      />
    </div>
  )
}
