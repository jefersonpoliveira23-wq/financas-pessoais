import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate, toISODateOnly } from '@/utils/format'
import type { Invoice } from '@/hooks/useCardInvoices'

const paySchema = z.object({
  accountId: z.string().uuid('Selecione a conta.'),
  amount: z.number({ message: 'Informe um valor.' }).positive('O valor deve ser maior que zero.'),
  paymentDate: z.string().min(1, 'Informe a data do pagamento.'),
})
type PayFormValues = z.infer<typeof paySchema>

interface PayInvoiceModalProps {
  open: boolean
  invoice: Invoice | null
  defaultAccountId?: string | null
  onClose: () => void
  onSubmit: (data: PayFormValues) => Promise<void>
  isSubmitting: boolean
}

export function PayInvoiceModal({
  open,
  invoice,
  defaultAccountId,
  onClose,
  onSubmit,
  isSubmitting,
}: PayInvoiceModalProps) {
  const { data: accounts } = useAccounts()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PayFormValues>({ resolver: zodResolver(paySchema) })

  useEffect(() => {
    if (!open || !invoice) return
    const remaining = Math.max(invoice.total - invoice.totalPaid, 0)
    reset({
      accountId: defaultAccountId ?? '',
      amount: remaining,
      paymentDate: toISODateOnly(new Date()),
    })
  }, [open, invoice, defaultAccountId, reset])

  if (!open || !invoice) return null

  const remaining = Math.max(invoice.total - invoice.totalPaid, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">Pagar fatura</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-sm text-(--color-ink-600)">
          Fatura com vencimento em {formatDate(invoice.dueDate)}. Total: {formatCurrency(invoice.total)}
          {invoice.totalPaid > 0 && <> · Já pago: {formatCurrency(invoice.totalPaid)}</>}. Saldo em aberto:{' '}
          <strong>{formatCurrency(remaining)}</strong>.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(async (data) => onSubmit(data))} noValidate>
          <Select label="Pagar com a conta" error={errors.accountId?.message} {...register('accountId')}>
            <option value="">Selecione…</option>
            {(accounts ?? [])
              .filter((a) => !a.is_archived)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Input
                label="Valor a pagar"
                type="number"
                step="0.01"
                hint="Pagamento parcial é permitido — o restante fica em aberto na fatura."
                error={errors.amount?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          />

          <Input
            label="Data do pagamento"
            type="date"
            error={errors.paymentDate?.message}
            {...register('paymentDate')}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Confirmar pagamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
