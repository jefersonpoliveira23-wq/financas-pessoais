import { useEffect, useState } from 'react'
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
  const { user, updatePassword } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { showToast } = useToast()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

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
          A exclusão definitiva da conta exige uma rotina de backend com privilégios elevados (Supabase Edge Function
          usando a chave <code className="rounded bg-(--color-surface-alt) px-1">service_role</code>, que nunca deve
          rodar no navegador). Essa função ainda não foi implementada — está marcada como pendência para uma próxima
          fase do projeto e documentada no README.
        </p>
        <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
          Excluir minha conta
        </Button>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Funcionalidade pendente"
        description="A exclusão segura de conta ainda não está implementada nesta fase. Veja a seção 'Pendências' do README para os próximos passos."
        confirmLabel="Entendi"
        isDangerous={false}
        onConfirm={() => setDeleteConfirmOpen(false)}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}
