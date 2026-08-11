import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, CreditCard } from 'lucide-react'
import { usePaymentMethods, useCreatePaymentMethod } from '@/hooks/usePaymentMethods'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'

const schema = z.object({ name: z.string().trim().min(1, 'Informe um nome.').max(60) })
type FormValues = z.infer<typeof schema>

export function PaymentMethodsSection() {
  const { data: methods, isLoading } = usePaymentMethods()
  const createMethod = useCreatePaymentMethod()
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    try {
      await createMethod.mutateAsync(data.name)
      showToast('success', 'Forma de pagamento criada.')
      reset()
    } catch {
      showToast('error', 'Não foi possível criar. Verifique se o nome já existe.')
    }
  }

  return (
    <Card>
      <CardHeader title="Formas de pagamento" subtitle="Pix, débito, boleto, dinheiro, etc." />

      <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="min-w-[180px] flex-1">
          <Input label="Nova forma de pagamento" error={errors.name?.message} {...register('name')} />
        </div>
        <Button type="submit" isLoading={isSubmitting || createMethod.isPending}>
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Adicionar
        </Button>
      </form>

      {isLoading ? null : (methods?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma forma de pagamento"
          description="Cadastre as formas de pagamento que você costuma usar."
        />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {methods?.map((m) => (
            <li key={m.id} className="rounded-full bg-(--color-surface-alt) px-3 py-1.5 text-sm text-(--color-ink-600)">
              {m.name}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
