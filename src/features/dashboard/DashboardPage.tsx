import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts'
import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet, PlusCircle, Calendar, CreditCard } from 'lucide-react'
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { useAccountBalances, useAccounts } from '@/hooks/useAccounts'
import { useCreditCards, useCreditCardSummaries } from '@/hooks/useCreditCards'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatCurrencyCompact, formatDate, toISODateOnly } from '@/utils/format'
import { StatusBanner } from '@/features/dashboard/StatusBanner'
import {
  TimelineSection,
  useDashboardTimelineWindow,
  DASHBOARD_TIMELINE_MONTHS_BACK,
  DASHBOARD_TIMELINE_MONTHS_FORWARD,
} from '@/features/dashboard/TimelineSection'
import { InsightsSection } from '@/features/dashboard/InsightsSection'
import { CategoryBreakdownSection } from '@/features/dashboard/CategoryBreakdownSection'
import { DebtsByCategorySection } from '@/features/dashboard/DebtsByCategorySection'
import { GoalsEvolutionSection } from '@/features/dashboard/GoalsEvolutionSection'
import { buildMonthlyTimeline } from '@/utils/dashboardTimeline'

function IndicatorCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Wallet
  tone: 'neutral' | 'success' | 'danger'
}) {
  const toneClasses = {
    neutral: 'bg-(--color-navy-100) text-(--color-navy-700)',
    success: 'bg-(--color-success-100) text-(--color-success-700)',
    danger: 'bg-(--color-danger-100) text-(--color-danger-700)',
  }[tone]

  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${toneClasses}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-(--color-ink-400)">{label}</p>
        <p className="truncate font-display text-lg font-semibold tabular-nums text-(--color-ink-900)">{value}</p>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const [range, setRange] = useState(() => {
    const now = new Date()
    return { from: toISODateOnly(startOfMonth(now)), to: toISODateOnly(endOfMonth(now)) }
  })
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  // '' = tudo | 'account:<id>' | 'card:<id>'
  const [scope, setScope] = useState('')
  const accountId = scope.startsWith('account:') ? scope.slice(8) : undefined
  const cardId = scope.startsWith('card:') ? scope.slice(5) : undefined

  function goToMonth(date: Date) {
    setReferenceDate(date)
    setRange({ from: toISODateOnly(startOfMonth(date)), to: toISODateOnly(endOfMonth(date)) })
  }

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: cards } = useCreditCards()
  const { data: cardSummaries } = useCreditCardSummaries()
  const { data: balances, isLoading: loadingBalances } = useAccountBalances()
  const { data: transactions, isLoading: loadingTransactions } = useTransactions({
    from: range.from,
    to: range.to,
    accountId,
    cardId,
  })

  const summary = useMemo(() => {
    const list = transactions ?? []
    const receitasRecebidas = list
      .filter((t) => t.type === 'receita' && t.status === 'recebido')
      .reduce((sum, t) => sum + t.amount, 0)
    const despesasPagas = list
      .filter((t) => t.type === 'despesa' && t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0)

    const saldoDisponivel = (balances ?? [])
      .filter((b) =>
        accountId
          ? b.account_id === accountId
          : accounts?.find((a) => a.id === b.account_id)?.include_in_available_balance,
      )
      .reduce((sum, b) => sum + b.current_balance, 0)

    const compras = list.filter((t) => t.type === 'compra_cartao' && t.status !== 'cancelado')
    const comprasNoPeriodo = compras.reduce((sum, t) => sum + t.amount, 0)
    const comprasPagas = compras.filter((t) => t.status === 'pago').reduce((sum, t) => sum + t.amount, 0)

    return {
      receitasRecebidas,
      despesasPagas,
      resultadoRealizado: receitasRecebidas - despesasPagas,
      saldoDisponivel,
      comprasNoPeriodo,
      comprasPagas,
      comprasEmAberto: comprasNoPeriodo - comprasPagas,
    }
  }, [transactions, balances, accounts, accountId])

  const cardSummary = cardId ? (cardSummaries ?? []).find((c) => c.card_id === cardId) : undefined
  const isCardScope = !!cardId

  const chartData = isCardScope
    ? [
        { nome: 'Compras pagas', valor: summary.comprasPagas, fill: 'var(--color-success-600)' },
        { nome: 'Compras em aberto', valor: summary.comprasEmAberto, fill: 'var(--color-danger-600)' },
      ]
    : [
        { nome: 'Receitas', valor: summary.receitasRecebidas, fill: 'var(--color-success-600)' },
        { nome: 'Despesas', valor: summary.despesasPagas, fill: 'var(--color-danger-600)' },
      ]
  const chartMax = Math.max(chartData[0].valor, chartData[1].valor, 1)
  const chartIsEmpty = chartData[0].valor === 0 && chartData[1].valor === 0

  const isLoading = loadingAccounts || loadingBalances || loadingTransactions
  const hasNoAccounts = !loadingAccounts && (accounts?.length ?? 0) === 0

  const [debtsOnly, setDebtsOnly] = useState(false)
  const {
    transactions: timelineTransactions,
    isLoading: loadingTimelineWindow,
    today: timelineToday,
  } = useDashboardTimelineWindow()

  const fullTimeline = useMemo(
    () =>
      buildMonthlyTimeline(
        timelineTransactions,
        timelineToday,
        DASHBOARD_TIMELINE_MONTHS_BACK,
        DASHBOARD_TIMELINE_MONTHS_FORWARD,
      ),
    [timelineTransactions, timelineToday],
  )
  const displayedTimeline = useMemo(() => {
    if (!debtsOnly) return fullTimeline
    const debtsOnlyTx = timelineTransactions.filter((t) => t.installment_group_id !== null)
    return buildMonthlyTimeline(
      debtsOnlyTx,
      timelineToday,
      DASHBOARD_TIMELINE_MONTHS_BACK,
      DASHBOARD_TIMELINE_MONTHS_FORWARD,
    )
  }, [debtsOnly, fullTimeline, timelineTransactions, timelineToday])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Início</h1>
          <p className="text-sm text-(--color-ink-400)">
            Sua situação financeira de {formatDate(range.from)} a {formatDate(range.to)}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => goToMonth(subMonths(referenceDate, 1))}>
            Mês anterior
          </Button>
          <Button variant="secondary" size="sm" onClick={() => goToMonth(new Date())}>
            Mês atual
          </Button>
          <Button variant="secondary" size="sm" onClick={() => goToMonth(addMonths(referenceDate, 1))}>
            Próximo mês
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <Select label="Conta ou cartão" value={scope} onChange={(e) => setScope(e.target.value)} className="w-64">
          <option value="">Todas as contas e cartões</option>
          <optgroup label="Contas">
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={`account:${a.id}`}>
                {a.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Cartões">
            {(cards ?? []).map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                {c.name}
              </option>
            ))}
          </optgroup>
        </Select>
        {(['from', 'to'] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label htmlFor={`dash-${key}`} className="text-sm font-medium text-(--color-ink-900)">
              {key === 'from' ? 'Data início' : 'Data fim'}
            </label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-ink-400)"
                aria-hidden="true"
              />
              <input
                id={`dash-${key}`}
                type="date"
                value={range[key]}
                min={key === 'to' ? range.from || undefined : undefined}
                max={key === 'from' ? range.to || undefined : undefined}
                onChange={(e) => setRange((r) => ({ ...r, [key]: e.target.value }))}
                className="h-10 w-40 rounded-lg border border-(--color-navy-100) bg-white pl-9 pr-3 text-sm text-(--color-ink-900)
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-navy-500)"
              />
            </div>
          </div>
        ))}
      </Card>

      {hasNoAccounts && (
        <EmptyState
          icon={Wallet}
          title="Cadastre sua primeira conta"
          description="Para começar a ver seu saldo e suas movimentações, cadastre pelo menos uma conta financeira."
          action={
            <Link to="/contas">
              <Button size="sm">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Cadastrar conta
              </Button>
            </Link>
          }
        />
      )}

      {!hasNoAccounts && (
        <>
          <StatusBanner />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : isCardScope ? (
              <>
                <IndicatorCard
                  label="Limite utilizado"
                  value={formatCurrency(cardSummary?.used_limit ?? 0)}
                  icon={CreditCard}
                  tone="danger"
                />
                <IndicatorCard
                  label="Limite disponível"
                  value={formatCurrency(cardSummary?.available_limit ?? 0)}
                  icon={Wallet}
                  tone="success"
                />
                <IndicatorCard
                  label="Compras no período"
                  value={formatCurrency(summary.comprasNoPeriodo)}
                  icon={ArrowDownCircle}
                  tone="neutral"
                />
                <IndicatorCard
                  label="Compras pagas no período"
                  value={formatCurrency(summary.comprasPagas)}
                  icon={ArrowUpCircle}
                  tone="success"
                />
              </>
            ) : (
              <>
                <IndicatorCard
                  label={accountId ? 'Saldo da conta hoje' : 'Saldo disponível hoje'}
                  value={formatCurrency(summary.saldoDisponivel)}
                  icon={Wallet}
                  tone={summary.saldoDisponivel >= 0 ? 'success' : 'danger'}
                />
                <IndicatorCard
                  label="Receitas recebidas no período"
                  value={formatCurrency(summary.receitasRecebidas)}
                  icon={ArrowUpCircle}
                  tone="success"
                />
                <IndicatorCard
                  label="Despesas pagas no período"
                  value={formatCurrency(summary.despesasPagas)}
                  icon={ArrowDownCircle}
                  tone="danger"
                />
                <IndicatorCard
                  label="Resultado realizado"
                  value={formatCurrency(summary.resultadoRealizado)}
                  icon={Scale}
                  tone={summary.resultadoRealizado >= 0 ? 'success' : 'danger'}
                />
              </>
            )}
          </div>

          <Card>
            <CardHeader title="Receitas versus despesas" subtitle="Movimentações efetivadas no período selecionado" />
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : chartIsEmpty ? (
              <EmptyState
                icon={Scale}
                title="Sem movimentações efetivadas"
                description="Marque receitas como recebidas e despesas como pagas para ver esse gráfico."
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={64} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-navy-100)" vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickFormatter={(v) => formatCurrencyCompact(v)}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={72}
                    domain={[0, chartMax * 1.15]}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.nome} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="valor"
                      position="top"
                      formatter={(v: string | number | boolean | null | undefined) =>
                        formatCurrencyCompact(Number(v) || 0)
                      }
                      fill="var(--color-ink-900)"
                      fontSize={12}
                      fontWeight={600}
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {!isCardScope && (
            <Card>
              <CardHeader
                title="Contas"
                subtitle="Saldo atual por conta"
                action={
                  <Link to="/contas" className="text-sm text-(--color-navy-700) hover:underline">
                    Ver todas
                  </Link>
                }
              />
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <ul className="divide-y divide-(--color-navy-100)">
                  {(balances ?? [])
                    .filter((b) => !accountId || b.account_id === accountId)
                    .slice(0, 5)
                    .map((b) => (
                      <li key={b.account_id} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="text-(--color-ink-900)">{b.name}</span>
                        <span
                          className={`tabular-nums font-medium ${
                            b.current_balance < 0 ? 'text-(--color-danger-600)' : 'text-(--color-ink-900)'
                          }`}
                        >
                          {formatCurrency(b.current_balance)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <CardHeader
              title="Últimas movimentações"
              action={
                <Link to="/movimentacoes" className="text-sm text-(--color-navy-700) hover:underline">
                  Ver todas
                </Link>
              }
            />
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (transactions ?? []).length === 0 ? (
              <EmptyState
                icon={ArrowUpCircle}
                title="Nenhuma movimentação neste período"
                description="Cadastre uma receita, despesa ou transferência para começar."
              />
            ) : (
              <ul className="divide-y divide-(--color-navy-100)">
                {(transactions ?? []).slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-(--color-ink-900)">{t.description}</p>
                      <p className="text-xs text-(--color-ink-400)">{t.status}</p>
                    </div>
                    <span
                      className={`flex-none tabular-nums font-medium ${
                        t.type === 'despesa' ? 'text-(--color-danger-600)' : 'text-(--color-success-700)'
                      }`}
                    >
                      {t.type === 'despesa' ? '-' : '+'}
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <TimelineSection
            timeline={displayedTimeline}
            isLoading={loadingTimelineWindow}
            debtsOnly={debtsOnly}
            onToggleDebtsOnly={setDebtsOnly}
          />

          <InsightsSection
            timelineTransactions={timelineTransactions}
            timeline={fullTimeline}
            isLoadingTimeline={loadingTimelineWindow}
          />

          <CategoryBreakdownSection />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DebtsByCategorySection />
            <GoalsEvolutionSection />
          </div>
        </>
      )}
    </div>
  )
}
