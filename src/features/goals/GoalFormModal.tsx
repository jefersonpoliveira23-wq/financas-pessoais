import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAccounts } from '@/hooks/useAccounts'
import type { Database } from '@/types/database.types'

type Goal = Database['public']['Tables']['goals']['Row']

export interface GoalFormData {
  name: string
  description: string
  mode: 'independente' | 'alocado'
  targetAmount: number
  targetDate: string
  linkedAccountId: string
  isEmergencyFund: boolean
}

interface GoalFormModalProps {
  open: boolean
  goal?: Goal | null
  onClose: () => void
  onSubmit: (data: GoalFormData) => Promise<void>
  isSubmitting: boolean
}

const EMPTY: GoalFormData = {
  name: '',
  description: '',
  mode: 'independente',
  targetAmount: 0,
  targetDate: '',
  linkedAccountId: '',
  isEmergencyFund: false,
}

export function GoalFormModal(props: GoalFormModalProps) {
  if (!props.open) return null
  return <GoalFormInner key={props.goal?.id ?? 'new'} {...props} />
}

function GoalFormInner({ goal, onClose, onSubmit, isSubmitting }: GoalFormModalProps) {
  const { data: accounts } = useAccounts()
  const [form, setForm] = useState<GoalFormData>(() =>
    goal
      ? {
          name: goal.name,
          description: goal.description ?? '',
          mode: goal.mode,
          targetAmount: goal.target_amount,
          targetDate: goal.target_date ?? '',
          linkedAccountId: goal.linked_account_id ?? '',
          isEmergencyFund: goal.is_emergency_fund,
        }
      : EMPTY,
  )
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof GoalFormData>(key: K, value: GoalFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Informe o nome da meta.')
    if (form.targetAmount <= 0) return setError('O valor-alvo deve ser maior que zero.')
    if (form.mode === 'alocado' && !form.linkedAccountId)
      return setError('Meta alocada precisa de uma conta vinculada.')
    setError(null)
    await onSubmit(form)
  }

  const activeAccounts = (accounts ?? []).filter((a) => !a.is_archived)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">
            {goal ? 'Editar meta' : 'Nova meta'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />

          <Select
            label="Como acompanhar o progresso"
            value={form.mode}
            onChange={(e) => set('mode', e.target.value as GoalFormData['mode'])}
          >
            <option value="independente">Independente — registro os aportes manualmente</option>
            <option value="alocado">Alocado — acompanha o saldo de uma conta</option>
          </Select>

          {form.mode === 'alocado' && (
            <Select
              label="Conta vinculada"
              value={form.linkedAccountId}
              onChange={(e) => set('linkedAccountId', e.target.value)}
            >
              <option value="">Selecione…</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor-alvo (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.targetAmount}
              onChange={(e) => set('targetAmount', e.target.valueAsNumber || 0)}
            />
            <Input
              label="Data-alvo (opcional)"
              type="date"
              value={form.targetDate}
              onChange={(e) => set('targetDate', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-(--color-ink-900)">
            <input
              type="checkbox"
              checked={form.isEmergencyFund}
              onChange={(e) => set('isEmergencyFund', e.target.checked)}
              className="h-4 w-4 rounded border-(--color-navy-100)"
            />
            Esta é minha reserva de emergência
          </label>

          {error && <p className="text-sm text-(--color-danger-600)">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {goal ? 'Salvar' : 'Criar meta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
