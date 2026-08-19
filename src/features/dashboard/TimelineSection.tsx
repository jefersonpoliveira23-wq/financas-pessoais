import { useMemo, useState } from 'react'
import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { CalendarRange } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { monthTotalExpense, type TimelineMonth } from '@/utils/dashboardTimeline'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatCurrencyCompact, formatMonthYear, toISODateOnly } from '@/utils/format'
import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns'

const MONTHS_BACK = 3
const MONTHS_FORWARD = 3

function monthLabel(month: string): string {
  return formatMonthYear(month)
    .replace(' de ', '/')
    .replace(/^./, (c) => c.toUpperCase())
}

export const DASHBOARD_TIMELINE_MONTHS_BACK = MONTHS_BACK
export const DASHBOARD_TIMELINE_MONTHS_FORWARD = MONTHS_FORWARD

/**
 * Busca a janela de -3/+3 meses de transações (sem filtrar por dívidas) —
 * usado tanto pelo TimelineSection (que pode filtrar localmente para "só
 * dívidas/parcelas") quanto pelo InsightsSection, que sempre olha o quadro
 * completo. Evita duas buscas de rede: o React Query dedupe pela mesma
 * queryKey de `useTransactions`.
 */
export function useDashboardTimelineWindow() {
  const today = useMemo(() => new Date(), [])
  const from = useMemo(() => toISODateOnly(startOfMonth(subMonths(today, MONTHS_BACK))), [today])
  const to = useMemo(() => toISODateOnly(endOfMonth(addMonths(today, MONTHS_FORWARD))), [today])

  const { data: transactions, isLoading } = useTransactions({ from, to })

  return { transactions: transactions ?? [], isLoading, today }
}

export function TimelineSection({
  timeline,
  isLoading,
  debtsOnly,
  onToggleDebtsOnly,
}: {
  timeline: TimelineMonth[]
  isLoading: boolean
  debtsOnly: boolean
  onToggleDebtsOnly: (value: boolean) => void
}) {
  const [showIncome, setShowIncome] = useState(true)

  const chartData = useMemo(
    () =>
      timeline.map((m) => ({
        mes: monthLabel(m.month),
        isCurrent: m.isCurrent,
        Realizado: m.expenseRealized,
        Previsto: m.expensePlanned,
        Receitas: m.incomeRealized + m.incomePlanned,
        total: monthTotalExpense(m),
      })),
    [timeline],
  )

  const hasAnyData = timeline.some((m) => m.incomeRealized || m.incomePlanned || m.expenseRealized || m.expensePlanned)

  return (
    <Card>
      <CardHeader
        title="Linha do tempo"
        subtitle="Despesas já pagas e previstas — 3 meses para trás e 3 para frente, a partir de hoje"
        action={
          <div className="flex items-center gap-2">
            <Button variant={debtsOnly ? 'secondary' : 'primary'} size="sm" onClick={() => onToggleDebtsOnly(false)}>
              Todas as despesas
            </Button>
            <Button variant={debtsOnly ? 'primary' : 'secondary'} size="sm" onClick={() => onToggleDebtsOnly(true)}>
              Só dívidas/parcelas
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : !hasAnyData ? (
        <EmptyState
          icon={CalendarRange}
          title="Sem movimentações no período"
          description="Cadastre despesas, parcelas ou recorrências para ver a linha do tempo."
        />
      ) : (
        <div className="mt-2 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-navy-50)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrencyCompact(v)} width={72} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <ReferenceLine y={0} stroke="var(--color-navy-200)" />
              <Bar dataKey="Realizado" stackId="despesa" fill="var(--color-danger-600)" radius={[0, 0, 0, 0]}>
                <LabelList
                  dataKey="Realizado"
                  position="center"
                  formatter={(v: number) => (v > 0 ? formatCurrencyCompact(v) : '')}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
              <Bar dataKey="Previsto" stackId="despesa" fill="var(--color-danger-200)" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="total"
                  position="top"
                  formatter={(v: number) => (v > 0 ? formatCurrencyCompact(v) : '')}
                  fill="var(--color-ink-600)"
                  fontSize={11}
                  fontWeight={600}
                  offset={8}
                />
              </Bar>
              {showIncome && (
                <Line type="monotone" dataKey="Receitas" stroke="var(--color-success-600)" strokeWidth={2} dot>
                  <LabelList
                    dataKey="Receitas"
                    position="top"
                    formatter={(v: number) => (v > 0 ? formatCurrencyCompact(v) : '')}
                    fill="var(--color-success-700)"
                    fontSize={11}
                    fontWeight={600}
                    offset={10}
                  />
                </Line>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isLoading && hasAnyData && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-(--color-ink-400)">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-(--color-danger-600)" /> Pago/realizado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-(--color-danger-200)" /> Previsto/pendente
          </span>
          <button
            type="button"
            onClick={() => setShowIncome((v) => !v)}
            className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-(--color-success-600)" />
            {showIncome ? 'Ocultar receitas' : 'Mostrar receitas'}
          </button>
        </div>
      )}
    </Card>
  )
}
