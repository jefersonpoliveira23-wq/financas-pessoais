import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { InstallmentEditScope } from '@/hooks/useInstallments'

interface InstallmentScopeDialogProps {
  open: boolean
  title: string
  installmentNumber: number
  totalInstallments: number
  isLoading?: boolean
  onConfirm: (scope: InstallmentEditScope) => void
  onCancel: () => void
}

/**
 * "Esta parcela faz parte de um parcelamento. O que você deseja alterar?"
 * Usado tanto para editar quanto para excluir parcelas (seção 9 do escopo).
 */
export function InstallmentScopeDialog({
  open,
  title,
  installmentNumber,
  totalInstallments,
  isLoading,
  onConfirm,
  onCancel,
}: InstallmentScopeDialogProps) {
  const [scope, setScope] = useState<InstallmentEditScope>('only_this')

  if (!open) return null

  const options: { value: InstallmentEditScope; label: string; description: string }[] = [
    {
      value: 'only_this',
      label: 'Somente esta parcela',
      description: `Apenas a parcela ${installmentNumber}/${totalInstallments}.`,
    },
    {
      value: 'this_and_future',
      label: 'Esta e as próximas',
      description: `Da parcela ${installmentNumber} até a ${totalInstallments}/${totalInstallments}.`,
    },
    { value: 'all', label: 'Todas as parcelas', description: `Todas as ${totalInstallments} parcelas do grupo.` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">{title}</h2>
          <button onClick={onCancel} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-4 text-sm text-(--color-ink-600)">Esta movimentação faz parte de um parcelamento.</p>

        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-sm ${
                scope === option.value ? 'border-(--color-navy-500) bg-(--color-navy-50)' : 'border-(--color-navy-100)'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="installment-scope"
                  checked={scope === option.value}
                  onChange={() => setScope(option.value)}
                  className="h-4 w-4"
                />
                <span className="font-medium text-(--color-ink-900)">{option.label}</span>
              </span>
              <span className="pl-6 text-xs text-(--color-ink-400)">{option.description}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => onConfirm(scope)} isLoading={isLoading}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}
