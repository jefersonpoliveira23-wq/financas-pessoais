import { useMemo, useState } from 'react'
import { addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday as isTodayFn } from 'date-fns'
import { AlertTriangle, TrendingDown, CalendarClock, Wallet } from 'lucide-react'
import { useMonthlyProjection } from '@/features/calendar/useMonthlyProjection'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, formatMonthYear, toISODateOnly } from '@/utils/format'
import { effectiveStatus } from '@/utils/transactionStatus'
import { CalendarDays as CalendarIcon } from 'lucide-react'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone: 'neutral' | 'danger' | 'warning'
}) {
  const toneClasses = {
    neutral: 'bg-(--color-navy-100) text-(--color-navy-700)',
    danger: 'bg-(--color-danger-100) text-(--color-danger-700)',
    warning: 'bg-(--color-warning-100) text-(--color-warning-700)',
  }[tone]
  return (
    <Card className="flex items-center gap-3">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${toneClasses}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-(--color-ink-400)">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums text-(--color-ink-900)">{value}</p>
      </div>
    </Card>
  )
}

export function CalendarPage() {
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const {
    projection,
    firstNegativeDay,
    lowestBalanceDay,
    concentrationDay,
    freeUntilNextIncome,
    itemsByDay,
    monthStart,
    monthEnd,
    isLoading,
  } = useMonthlyProjection(referenceDate)

  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd])
  const leadingBlanks = monthStart.getDay() // 0 = domingo

  const projectionMap = useMemo(() => new Map(projection.map((p) => [p.date, p.balance])), [projection])

  const todayISO = toISODateOnly(new Date())
  const selected = selectedDate ?? (isSameMonth(referenceDate, new Date()) ? todayISO : toISODateOnly(monthStart))
  const selectedItems = itemsByDay.get(selected) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Calendário financeiro</h1>
          <p className="text-sm text-(--color-ink-400)">{formatMonthYear(referenceDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setReferenceDate((d) => subMonths(d, 1))}>
            Mês anterior
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setReferenceDate(new Date())}>
            Mês atual
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setReferenceDate((d) => addMonths(d, 1))}>
            Próximo mês
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Saldo disponível hoje"
              value={formatCurrency(projection[0]?.balance ?? 0)}
              tone="neutral"
            />
            <StatCard
              icon={AlertTriangle}
              label="Primeiro dia com saldo negativo"
              value={firstNegativeDay ? formatDate(firstNegativeDay.date) : 'Nenhum previsto'}
              tone={firstNegativeDay ? 'danger' : 'neutral'}
            />
            <StatCard
              icon={TrendingDown}
              label="Menor saldo projetado do mês"
              value={lowestBalanceDay ? formatCurrency(lowestBalanceDay.balance) : '—'}
              tone={lowestBalanceDay && lowestBalanceDay.balance < 0 ? 'danger' : 'neutral'}
            />
            <StatCard
              icon={CalendarClock}
              label="Concentração de vencimentos"
              value={
                concentrationDay ? `${formatDate(concentrationDay.date)} (${concentrationDay.count} itens)` : 'Nenhuma'
              }
              tone="warning"
            />
          </div>

          <Card>
            <p className="mb-3 text-sm text-(--color-ink-600)">
              Valor livre até a próxima receita prevista: <strong>{formatCurrency(freeUntilNextIncome)}</strong>
            </p>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-(--color-ink-400)">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}

              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {days.map((day) => {
                const iso = toISODateOnly(day)
                const items = itemsByDay.get(iso) ?? []
                const balance = projectionMap.get(iso)
                const hasNegative = balance !== undefined && balance < 0
                const isSelected = iso === selected
                const isToday = isTodayFn(day)

                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDate(iso)}
                    className={`flex min-h-16 flex-col items-center justify-start gap-0.5 rounded-lg border p-1.5 text-xs transition-colors ${
                      isSelected
                        ? 'border-(--color-navy-500) bg-(--color-navy-50)'
                        : 'border-transparent hover:bg-(--color-surface-alt)'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isToday ? 'bg-(--color-navy-900) text-white' : 'text-(--color-ink-900)'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span
                        className={`rounded-full px-1.5 text-[10px] ${
                          hasNegative
                            ? 'bg-(--color-danger-100) text-(--color-danger-700)'
                            : 'bg-(--color-navy-100) text-(--color-navy-700)'
                        }`}
                      >
                        {items.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-display font-semibold text-(--color-ink-900)">{formatDate(selected)}</h2>
            {selectedItems.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="Nenhum lançamento neste dia"
                description="Selecione outro dia no calendário."
              />
            ) : (
              <ul className="divide-y divide-(--color-navy-100)">
                {selectedItems.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-(--color-ink-900)">{t.description}</p>
                      <div className="mt-0.5">
                        <StatusBadge status={effectiveStatus(t)} />
                      </div>
                    </div>
                    <span
                      className={`flex-none tabular-nums font-medium ${
                        t.type === 'receita' ? 'text-(--color-success-700)' : 'text-(--color-danger-600)'
                      }`}
                    >
                      {t.type === 'receita' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="text-xs text-(--color-ink-400)">
            A projeção de saldo considera apenas contas incluídas no saldo disponível e não inclui transferências entre
            contas (o efeito líquido de uma transferência entre contas próprias tende a zero). Itens atrasados são
            somados ao saldo de hoje, já que a data real de pagamento ainda não é conhecida.
          </p>
        </>
      )}
    </div>
  )
}
