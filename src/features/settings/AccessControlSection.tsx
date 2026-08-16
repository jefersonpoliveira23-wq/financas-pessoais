import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuthorizedEmails, useAddAuthorizedEmail, useRemoveAuthorizedEmail } from '@/hooks/useAuthorizedEmails'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/utils/format'
import type { Database } from '@/types/database.types'

type AuthorizedEmail = Database['public']['Tables']['authorized_emails']['Row']

const schema = z.object({
  email: z.string().trim().min(1, 'Informe um e-mail.').email('E-mail inválido.'),
  note: z.string().trim().max(60).optional(),
})
type FormValues = z.infer<typeof schema>

export function AccessControlSection() {
  const { data: emails, isLoading } = useAuthorizedEmails()
  const addEmail = useAddAuthorizedEmail()
  const removeEmail = useRemoveAuthorizedEmail()
  const { showToast } = useToast()
  const [removing, setRemoving] = useState<AuthorizedEmail | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    try {
      await addEmail.mutateAsync({ email: data.email, note: data.note })
      showToast('success', 'E-mail autorizado.')
      reset()
    } catch {
      showToast('error', 'Não foi possível autorizar. Verifique se o e-mail já está na lista.')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Acesso ao aplicativo"
        subtitle="Apenas e-mails autorizados aqui conseguem criar conta (Google, GitHub ou e-mail/senha)."
      />

      <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="min-w-[220px] flex-1">
          <Input label="E-mail a autorizar" type="email" error={errors.email?.message} {...register('email')} />
        </div>
        <div className="min-w-[160px] flex-1">
          <Input label="Nota (opcional)" placeholder="Ex.: irmão, esposa..." error={errors.note?.message} {...register('note')} />
        </div>
        <Button type="submit" isLoading={isSubmitting || addEmail.isPending}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Autorizar
        </Button>
      </form>

      {isLoading ? null : (emails?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum e-mail autorizado ainda"
          description="Adicione o e-mail de quem pode criar conta no app."
        />
      ) : (
        <ul className="divide-y divide-(--color-navy-100)">
          {emails?.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="text-(--color-ink-900)">{e.email}</p>
                <p className="text-xs text-(--color-ink-400)">
                  {e.note ? `${e.note} · ` : ''}Autorizado em {formatDate(e.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemoving(e)}
                aria-label={`Remover autorização de ${e.email}`}
                className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Remover autorização?"
        description={`"${removing?.email}" não vai mais conseguir criar conta no app. Se a pessoa já tiver uma conta, ela não será afetada — isso só bloqueia novos cadastros.`}
        confirmLabel="Remover"
        isLoading={removeEmail.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          try {
            await removeEmail.mutateAsync(removing.id)
            showToast('success', 'Autorização removida.')
          } catch {
            showToast('error', 'Não foi possível remover a autorização.')
          } finally {
            setRemoving(null)
          }
        }}
      />
    </Card>
  )
}
