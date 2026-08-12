import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Database } from '@/types/database.types'

type Debt = Database['public']['Tables']['debts']['Row']

export interface DebtFormData {
  name: string
  creditor: string
  originalAmount: number
  outstandingBalance: number
  monthlyInterestRate: number
  minimumPayment: number
  dueDay: number | null
  notes: string
}

interface DebtFormModalProps {
  open: boolean
  debt?: Debt | null
  onClose: () => void
  onSubmit: (data: DebtFormData) => Promise<void>
  isSubmitting: boolean
}

const EMPTY: DebtFormData = {
  name: '',
  creditor: '',
  originalAmount: 0,
  outstandingBalance: 0,
  monthlyInterestRate: 0,
  minimumPayment: 0,
  dueDay: null,
  notes: '',
}

export function DebtFormModal(props: DebtFormModalProps) {
  // Remonta o formulário a cada abertura/troca de dívida — o estado inicial
  // vem direto das props, sem useEffect (evita renders em cascata).
  if (!props.open) return null
  return <DebtFormInner key={props.debt?.id ?? 'new'} {...props} />
}

function DebtFormInner({ debt, onClose, onSubmit, isSubmitting }: DebtFormModalProps) {
  const [form, setForm] = useState<DebtFormData>(() =>
    debt
      ? {
          name: debt.name,
          creditor: debt.creditor ?? '',
          originalAmount: debt.original_amount,
          outstandingBalance: debt.outstanding_balance,
          monthlyInterestRate: debt.monthly_interest_rate,
          minimumPayment: debt.minimum_payment,
          dueDay: debt.due_day,
          notes: debt.notes ?? '',
        }
      : EMPTY,
  )
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof DebtFormData>(key: K, value: DebtFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Informe o nome da dívida.')
    if (form.originalAmount <= 0) return setError('O valor original deve ser maior que zero.')
    if (form.outstandingBalance < 0) return setError('O saldo devedor não pode ser negativo.')
    if (form.monthlyInterestRate < 0) return setError('A taxa de juros não pode ser negativa.')
    if (form.dueDay !== null && (form.dueDay < 1 || form.dueDay > 31)) return setError('Dia de vencimento inválido.')
    setError(null)
    await onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">
            {debt ? 'Editar dívida' : 'Nova dívida'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Credor (opcional)" value={form.creditor} onChange={(e) => set('creditor', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor original (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.originalAmount}
              onChange={(e) => set('originalAmount', e.target.valueAsNumber || 0)}
            />
            <Input
              label="Saldo devedor (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.outstandingBalance}
              onChange={(e) => set('outstandingBalance', e.target.valueAsNumber || 0)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Juros (% ao mês)"
              type="number"
              step="0.01"
              min="0"
              value={form.monthlyInterestRate}
              onChange={(e) => set('monthlyInterestRate', e.target.valueAsNumber || 0)}
            />
            <Input
              label="Pagamento mínimo (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.minimumPayment}
              onChange={(e) => set('minimumPayment', e.target.valueAsNumber || 0)}
            />
          </div>
          <Input
            label="Dia de vencimento (opcional)"
            type="number"
            min="1"
            max="31"
            value={form.dueDay ?? ''}
            onChange={(e) => set('dueDay', e.target.value ? e.target.valueAsNumber : null)}
          />
          <Input label="Observações (opcional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />

          {error && <p className="text-sm text-(--color-danger-600)">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {debt ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
