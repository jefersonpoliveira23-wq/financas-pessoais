import { useMemo, useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { aggregateExpensesByCategory } from '@/utils/categoryBreakdown'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatPercent } from '@/utils/format'

const PALETTE = [
  'var(--color-navy-600)',
  'var(--color-danger-600)',
  'var(--color-success-600)',
  'var(--color-warning-600)',
  'var(--color-navy-400)',
  'var(--color-danger-400)',
  'var(--color-success-400)',
  'var(--color-navy-800)',
]

const RANGE_OPTIONS = [
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
]

/** Mesma regra de Relatórios ("maiores categorias de despesa"), embutida na Início com período próprio. */
export function CategoryBreakdownSection() {
  const [months, setMonths] = useState(3)
  const { data: categories } = useCategories()

  const from = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (months - 1))
    return d.toISOString().slice(0, 10)
  }, [months])
  const to = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const { data: transactions, isLoading } = useTransactions({ from, to })

  const chartData = useMemo(
    () => aggregateExpensesByCategory(transactions ?? [], categories ?? [], 8),
    [transactions, categories],
  )
  const total = chartData.reduce((s, c) => s + c.value, 0)

  return (
    <Card>
      <CardHeader
        title="Maiores categorias de gasto"
        subtitle={total > 0 ? `Total no período: ${formatCurrency(total)}` : undefined}
        action={
          <div className="w-44">
            <Select label="Período" value={String(months)} onChange={(e) => setMonths(Number(e.target.value))}>
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <EmptyState icon={PieChartIcon} title="Sem despesas no período" description="" />
      ) : (
        <div className="mt-2 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={(e) => `${e.name} — ${formatPercent(e.percent ?? 0)}`}
                labelLine
              >
                {chartData.map((entry, i) => (
                  <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend
                formatter={(value, entry) => {
                  const payload = (entry as { payload?: { value?: number } })?.payload
                  const v = payload?.value ?? 0
                  return `${value} (${formatCurrency(v)})`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
