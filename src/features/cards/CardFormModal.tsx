import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Database } from '@/types/database.types'

type CreditCard = Database['public']['Tables']['credit_cards']['Row']

const cardSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para o cartão.').max(80),
  institution: z.string().trim().max(80).optional().or(z.literal('')),
  brand: z.string().trim().max(40).optional().or(z.literal('')),
  creditLimit: z.number({ message: 'Informe um valor numérico.' }).min(0, 'O limite não pode ser negativo.'),
  closingDay: z.number({ message: 'Informe o dia de fechamento.' }).int().min(1).max(31),
  dueDay: z.number({ message: 'Informe o dia de vencimento.' }).int().min(1).max(31),
  defaultPaymentAccountId: z.string().optional().or(z.literal('')),
})
type CardFormValues = z.infer<typeof cardSchema>

interface CardFormModalProps {
  open: boolean
  card?: CreditCard | null
  onClose: () => void
  onSubmit: (data: CardFormValues) => Promise<void>
  isSubmitting: boolean
}

export function CardFormModal({ open, card, onClose, onSubmit, isSubmitting }: CardFormModalProps) {
  const { data: accounts } = useAccounts()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: '',
      institution: '',
      brand: '',
      creditLimit: 0,
      closingDay: 1,
      dueDay: 10,
      defaultPaymentAccountId: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset(
      card
        ? {
            name: card.name,
            institution: card.institution ?? '',
            brand: card.brand ?? '',
            creditLimit: card.credit_limit,
            closingDay: card.closing_day,
            dueDay: card.due_day,
            defaultPaymentAccountId: card.default_payment_account_id ?? '',
          }
        : {
            name: '',
            institution: '',
            brand: '',
            creditLimit: 0,
            closingDay: 1,
            dueDay: 10,
            defaultPaymentAccountId: '',
          },
    )
  }, [open, card, reset])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">
            {card ? 'Editar cartão' : 'Novo cartão'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(async (data) => onSubmit(data))} noValidate>
          <Input label="Nome do cartão" error={errors.name?.message} {...register('name')} />
          <Input label="Instituição" error={errors.institution?.message} {...register('institution')} />
          <Input label="Bandeira" error={errors.brand?.message} {...register('brand')} />

          <Controller
            control={control}
            name="creditLimit"
            render={({ field }) => (
              <Input
                label="Limite total"
                type="number"
                step="0.01"
                error={errors.creditLimit?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="closingDay"
              render={({ field }) => (
                <Input
                  label="Dia de fechamento"
                  type="number"
                  min={1}
                  max={31}
                  error={errors.closingDay?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            />
            <Controller
              control={control}
              name="dueDay"
              render={({ field }) => (
                <Input
                  label="Dia de vencimento"
                  type="number"
                  min={1}
                  max={31}
                  error={errors.dueDay?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            />
          </div>

          <Select label="Conta padrão para pagamento" {...register('defaultPaymentAccountId')}>
            <option value="">Nenhuma</option>
            {(accounts ?? [])
              .filter((a) => !a.is_archived)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {card ? 'Salvar alterações' : 'Criar cartão'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
