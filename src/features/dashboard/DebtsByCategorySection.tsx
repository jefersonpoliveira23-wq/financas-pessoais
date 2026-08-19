import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { useDebts } from '@/hooks/useDebts'
import { useInstallmentGroupCategories } from '@/hooks/useInstallmentGroups'
import { useCategories } from '@/hooks/useCategories'
import { aggregateDebtsByCategory } from '@/utils/debtsByCategory'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'

/** Visão de longo prazo: quanto do saldo devedor total está concentrado em cada categoria. */
export function DebtsByCategorySection() {
  const { data: debts, isLoading: loadingDebts } = useDebts()
  const { data: groups, isLoading: loadingGroups } = useInstallmentGroupCategories()
  const { data: categories, isLoading: loadingCategories } = useCategories()

  const isLoading = loadingDebts || loadingGroups || loadingCategories

  const totals = useMemo(
    () => aggregateDebtsByCategory(debts ?? [], groups ?? [], categories ?? []),
    [debts, groups, categories],
  )
  const grandTotal = totals.reduce((s, t) => s + t.value, 0)

  return (
    <Card>
      <CardHeader
        title="Maiores dívidas por categoria"
        subtitle="Saldo devedor em aberto, agrupado pela categoria de origem"
        action={
          <Link to="/dividas" className="text-sm text-(--color-navy-700) hover:underline">
            Ver dívidas
          </Link>
        }
      />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : totals.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma dívida em aberto"
          description="Suas dívidas ativas aparecerão aqui, agrupadas por categoria."
        />
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {totals.map((t) => {
            const percent = grandTotal > 0 ? (t.value / grandTotal) * 100 : 0
            return (
              <li key={t.categoryId ?? '__other__'} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-(--color-ink-900)">{t.name}</span>
                  <span className="tabular-nums font-medium text-(--color-ink-900)">{formatCurrency(t.value)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-navy-50)">
                  <div className="h-full rounded-full bg-(--color-danger-500)" style={{ width: `${percent}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
