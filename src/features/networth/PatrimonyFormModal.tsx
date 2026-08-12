import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useDebts } from '@/hooks/useDebts'
import type { Database } from '@/types/database.types'

type Asset = Database['public']['Tables']['assets']['Row']
type Liability = Database['public']['Tables']['liabilities']['Row']

export const ASSET_CATEGORIES = [
  { value: 'imovel', label: 'Imóvel' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'negocio', label: 'Negócio próprio' },
  { value: 'outro', label: 'Outro' },
] as const

export const LIABILITY_CATEGORIES = [
  { value: 'financiamento_imovel', label: 'Financiamento imobiliário' },
  { value: 'financiamento_veiculo', label: 'Financiamento de veículo' },
  { value: 'emprestimo', label: 'Empréstimo' },
  { value: 'outro', label: 'Outro' },
] as const

export interface PatrimonyFormData {
  name: string
  category: string
  currentValue: number
  acquisitionValue: number | null
  acquisitionDate: string
  linkedDebtId: string
  notes: string
}

interface PatrimonyFormModalProps {
  open: boolean
  kind: 'ativo' | 'passivo'
  item?: Asset | Liability | null
  onClose: () => void
  onSubmit: (data: PatrimonyFormData) => Promise<void>
  isSubmitting: boolean
}

const EMPTY: PatrimonyFormData = {
  name: '',
  category: '',
  currentValue: 0,
  acquisitionValue: null,
  acquisitionDate: '',
  linkedDebtId: '',
  notes: '',
}

export function PatrimonyFormModal(props: PatrimonyFormModalProps) {
  if (!props.open) return null
  return <PatrimonyFormInner key={`${props.kind}-${props.item?.id ?? 'new'}`} {...props} />
}

function PatrimonyFormInner({ kind, item, onClose, onSubmit, isSubmitting }: PatrimonyFormModalProps) {
  const { data: debts } = useDebts()
  const isAsset = kind === 'ativo'
  const categories = isAsset ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const [form, setForm] = useState<PatrimonyFormData>(() => {
    if (!item) return { ...EMPTY, category: categories[categories.length - 1].value }
    const asset = item as Asset
    const liability = item as Liability
    return {
      name: item.name,
      category: item.category,
      currentValue: item.current_value,
      acquisitionValue: isAsset ? asset.acquisition_value : null,
      acquisitionDate: isAsset ? (asset.acquisition_date ?? '') : '',
      linkedDebtId: !isAsset ? (liability.linked_debt_id ?? '') : '',
      notes: item.notes ?? '',
    }
  })
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof PatrimonyFormData>(key: K, value: PatrimonyFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Informe o nome.')
    if (form.currentValue < 0) return setError('O valor não pode ser negativo.')
    setError(null)
    await onSubmit(form)
  }

  const activeDebts = (debts ?? []).filter((d) => d.status === 'ativa')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">
            {item ? 'Editar' : 'Novo'} {isAsset ? 'ativo' : 'passivo'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />

          <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>

          <Input
            label={isAsset ? 'Valor atual (R$)' : 'Valor devido (R$)'}
            type="number"
            step="0.01"
            min="0"
            value={form.currentValue}
            onChange={(e) => set('currentValue', e.target.valueAsNumber || 0)}
          />

          {isAsset && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Valor de aquisição (opcional)"
                type="number"
                step="0.01"
                min="0"
                value={form.acquisitionValue ?? ''}
                onChange={(e) => set('acquisitionValue', e.target.value ? e.target.valueAsNumber : null)}
              />
              <Input
                label="Data de aquisição (opcional)"
                type="date"
                value={form.acquisitionDate}
                onChange={(e) => set('acquisitionDate', e.target.value)}
              />
            </div>
          )}

          {!isAsset && activeDebts.length > 0 && (
            <Select
              label="Vincular a uma dívida cadastrada (evita contar duas vezes)"
              value={form.linkedDebtId}
              onChange={(e) => set('linkedDebtId', e.target.value)}
            >
              <option value="">Não vincular</option>
              {activeDebts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}

          <Input label="Observações (opcional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />

          {error && <p className="text-sm text-(--color-danger-600)">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {item ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
