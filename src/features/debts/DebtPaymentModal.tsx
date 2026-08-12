import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/format'
import type { Database } from '@/types/database.types'

type Debt = Database['public']['Tables']['debts']['Row']

interface DebtPaymentModalProps {
  open: boolean
  debt: Debt | null
  onClose: () => void
  onSubmit: (data: { paymentDate: string; amount: number }) => Promise<void>
  isSubmitting: boolean
}

export function DebtPaymentModal(props: DebtPaymentModalProps) {
  if (!props.open || !props.debt) return null
  return <DebtPaymentInner key={props.debt.id} {...props} debt={props.debt} />
}

function DebtPaymentInner({
  debt,
  onClose,
  onSubmit,
  isSubmitting,
}: DebtPaymentModalProps & { debt: NonNullable<DebtPaymentModalProps['debt']> }) {
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(() =>
    debt.minimum_payment > 0 ? Math.min(debt.minimum_payment, debt.outstanding_balance) : 0,
  )
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentDate) return setError('Informe a data do pagamento.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('O valor deve ser maior que zero.')
    setError(null)
    await onSubmit({ paymentDate, amount })
  }

  const quitaTotal = amount >= debt.outstanding_balance

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">Registrar pagamento</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-sm text-(--color-ink-600)">
          {debt.name} — saldo devedor atual: <strong>{formatCurrency(debt.outstanding_balance)}</strong>
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input label="Data" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <Input
            label="Valor pago (R$)"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
          />

          {quitaTotal && (
            <p className="rounded-lg bg-(--color-success-100) p-2 text-sm text-(--color-success-700)">
              Este pagamento quita a dívida por completo.
            </p>
          )}
          {error && <p className="text-sm text-(--color-danger-600)">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Registrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
