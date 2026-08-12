import { useState } from 'react'
import { X, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/format'
import type { InstallmentPreviewItem } from '@/utils/installments'

interface InstallmentPreviewModalProps {
  open: boolean
  description: string
  totalAmount: number
  items: InstallmentPreviewItem[]
  onClose: () => void
  onConfirm: (items: InstallmentPreviewItem[]) => Promise<void>
  isSubmitting: boolean
}

/**
 * "Esta movimentação possui mais N parcelas. Deseja cadastrar
 * automaticamente as parcelas restantes?" — mostra a prévia completa antes
 * de confirmar (seção 9 do escopo). A última parcela é sempre recalculada
 * automaticamente para garantir que a soma bate com o valor total, mesmo
 * quando o usuário personaliza as demais.
 *
 * Nota: este componente só existe montado enquanto o pai mantém uma prévia
 * ativa (`{installmentPreview && <InstallmentPreviewModal ... />}`), então o
 * estado local já nasce correto a cada abertura — não precisa de useEffect
 * para "sincronizar" com a prop `items` a cada vez que o modal abre.
 */
export function InstallmentPreviewModal({
  open,
  description,
  totalAmount,
  items,
  onClose,
  onConfirm,
  isSubmitting,
}: InstallmentPreviewModalProps) {
  const [localItems, setLocalItems] = useState<InstallmentPreviewItem[]>(items)

  if (!open) return null

  function updateAmount(index: number, newAmount: number) {
    setLocalItems((current) => {
      const next = [...current]
      next[index] = { ...next[index], amount: Number.isFinite(newAmount) ? newAmount : 0 }
      const lastIndex = next.length - 1
      if (index !== lastIndex) {
        const sumExceptLast = next.slice(0, lastIndex).reduce((acc, i) => acc + i.amount, 0)
        next[lastIndex] = { ...next[lastIndex], amount: Math.round((totalAmount - sumExceptLast) * 100) / 100 }
      }
      return next
    })
  }

  const sum = localItems.reduce((acc, i) => acc + i.amount, 0)
  const lastAmountNegative = localItems[localItems.length - 1]?.amount < 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">Confirmar parcelamento</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 flex items-start gap-2 text-sm text-(--color-ink-600)">
          <Info className="mt-0.5 h-4 w-4 flex-none text-(--color-navy-500)" aria-hidden="true" />
          <span>
            <strong>{description}</strong> possui {localItems.length - 1} parcela
            {localItems.length - 1 === 1 ? '' : 's'} restante{localItems.length - 1 === 1 ? '' : 's'}. Confira as datas
            e valores abaixo — você pode personalizar cada parcela; a última é recalculada automaticamente para a soma
            sempre bater com o total.
          </span>
        </p>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-(--color-navy-100)">
          <table className="w-full text-sm">
            <thead className="bg-(--color-surface-alt) text-left text-xs text-(--color-ink-400)">
              <tr>
                <th className="px-3 py-2 font-medium">Parcela</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-navy-100)">
              {localItems.map((item, index) => (
                <tr key={item.installmentNumber}>
                  <td className="px-3 py-2 text-(--color-ink-900)">
                    {item.installmentNumber}/{localItems.length}
                  </td>
                  <td className="px-3 py-2 text-(--color-ink-600)">{formatDate(item.transactionDate)}</td>
                  <td className="px-3 py-2 text-right">
                    {index === localItems.length - 1 ? (
                      <span className="tabular-nums font-medium text-(--color-ink-900)">
                        {formatCurrency(item.amount)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateAmount(index, e.target.valueAsNumber)}
                        className="w-28 rounded border border-(--color-navy-100) px-2 py-1 text-right text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--color-navy-500)"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-(--color-ink-400)">Soma das parcelas</span>
          <span className="tabular-nums font-medium text-(--color-ink-900)">{formatCurrency(sum)}</span>
        </div>

        {lastAmountNegative && (
          <p className="mt-2 text-xs text-(--color-danger-600)">
            Os valores personalizados ultrapassam o total — ajuste alguma parcela.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            isLoading={isSubmitting}
            disabled={lastAmountNegative}
            onClick={() => onConfirm(localItems)}
          >
            Cadastrar {localItems.length} parcelas
          </Button>
        </div>
      </div>
    </div>
  )
}
