import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { useBudgetProgress, useCopyBudgets, useDeleteBudget, useUpsertBudget } from '@/hooks/useBudgets'
import { budgetUsage, shiftMonth, toMonthStart } from '@/utils/budget'
import { formatCurrency, formatMonthYear } from '@/utils/format'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

const STATUS_STYLES: Record<string, { bar: string; text: string; label: string }> = {
  ok: { bar: 'bg-(--color-success-600)', text: 'text-(--color-success-700)', label: 'Dentro do orçado' },
  alerta: { bar: 'bg-(--color-warning-600)', text: 'text-(--color-warning-700)', label: 'Atenção: consumo alto' },
  estourado: { bar: 'bg-(--color-danger-600)', text: 'text-(--color-danger-700)', label: 'Orçamento estourado' },
}

export function BudgetPage() {
  const [month, setMonth] = useState(() => toMonthStart(new Date()))
  const { data: categories } = useCategories()
  const { data: progress, isLoading } = useBudgetProgress(month)
  const upsertBudget = useUpsertBudget()
  const deleteBudget = useDeleteBudget()
  const copyBudgets = useCopyBudgets()
  const { showToast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type !== 'receita' && !c.is_archived),
    [categories],
  )
  const categoryName = (id: string) => expenseCategories.find((c) => c.id === id)?.name ?? 'Categoria'

  const budgetedIds = new Set((progress ?? []).map((p) => p.category_id))
  const availableCategories = expenseCategories.filter((c) => !budgetedIds.has(c.id))

  const totals = useMemo(() => {
    const budgeted = (progress ?? []).reduce((s, p) => s + p.budgeted, 0)
    const spent = (progress ?? []).reduce((s, p) => s + p.spent, 0)
    return { budgeted, spent }
  }, [progress])

  async function handleAdd() {
    const value = Number(amount.replace(',', '.'))
    if (!categoryId || !Number.isFinite(value) || value <= 0) {
      showToast('error', 'Escolha uma categoria e informe um valor maior que zero.')
      return
    }
    try {
      await upsertBudget.mutateAsync({ category_id: categoryId, month, amount: value })
      showToast('success', 'Orçamento salvo.')
      setFormOpen(false)
      setCategoryId('')
      setAmount('')
    } catch {
      showToast('error', 'Não foi possível salvar o orçamento.')
    }
  }

  async function handleCopy() {
    try {
      const copied = await copyBudgets.mutateAsync({ fromMonth: shiftMonth(month, -1), toMonth: month })
      showToast(
        copied > 0 ? 'success' : 'info',
        copied > 0 ? `${copied} orçamento(s) copiado(s) do mês anterior.` : 'Nada novo para copiar do mês anterior.',
      )
    } catch {
      showToast('error', 'Não foi possível copiar os orçamentos.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Orçamento</h1>
          <p className="text-sm text-(--color-ink-600)">
            Defina limites por categoria e acompanhe o realizado do mês (despesas e compras no cartão).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize text-(--color-ink-900)">
            {formatMonthYear(month)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-(--color-ink-600)">Total orçado</p>
          <p className="font-display text-xl font-semibold text-(--color-ink-900)">{formatCurrency(totals.budgeted)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-(--color-ink-600)">Total gasto</p>
          <p className="font-display text-xl font-semibold text-(--color-ink-900)">{formatCurrency(totals.spent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-(--color-ink-600)">Saldo do orçamento</p>
          <p
            className={`font-display text-xl font-semibold ${
              totals.budgeted - totals.spent < 0 ? 'text-(--color-danger-600)' : 'text-(--color-success-700)'
            }`}
          >
            {formatCurrency(totals.budgeted - totals.spent)}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setFormOpen(true)} disabled={availableCategories.length === 0}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Adicionar orçamento
        </Button>
        <Button variant="secondary" onClick={handleCopy} isLoading={copyBudgets.isPending}>
          <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" /> Copiar do mês anterior
        </Button>
      </div>

      {formOpen && (
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Selecione…</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Input
              label="Valor orçado (R$)"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} isLoading={upsertBudget.isPending}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : !progress || progress.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Nenhum orçamento neste mês"
          description="Adicione limites por categoria para acompanhar seus gastos, ou copie os valores do mês anterior."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {progress.map((p) => {
            const usage = budgetUsage(p.budgeted, p.spent)
            const style = STATUS_STYLES[usage.status]
            return (
              <Card key={p.budget_id} className="p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-(--color-ink-900)">{categoryName(p.category_id)}</p>
                    <p className={`text-xs ${style.text}`}>{style.label}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-(--color-ink-600)">
                      <span className="font-medium text-(--color-ink-900)">{formatCurrency(p.spent)}</span>
                      {' de '}
                      {formatCurrency(p.budgeted)}
                      {usage.remaining >= 0
                        ? ` — resta ${formatCurrency(usage.remaining)}`
                        : ` — ${formatCurrency(Math.abs(usage.remaining))} acima`}
                    </p>
                    <button
                      onClick={() => setDeletingId(p.budget_id)}
                      aria-label={`Remover orçamento de ${categoryName(p.category_id)}`}
                      className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-(--color-navy-50)"
                  role="progressbar"
                  aria-valuenow={Math.round(Math.min(100, usage.percent))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={`h-full ${style.bar}`} style={{ width: `${Math.min(100, usage.percent)}%` }} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Remover orçamento"
        description="O limite desta categoria neste mês será removido. As movimentações não são afetadas."
        confirmLabel="Remover"
        isLoading={deleteBudget.isPending}
        onCancel={() => setDeletingId(null)}
        onConfirm={async () => {
          try {
            await deleteBudget.mutateAsync(deletingId!)
            showToast('success', 'Orçamento removido.')
          } catch {
            showToast('error', 'Não foi possível remover.')
          } finally {
            setDeletingId(null)
          }
        }}
      />
    </div>
  )
}
