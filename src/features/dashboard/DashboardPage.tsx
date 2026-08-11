import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet, PlusCircle } from 'lucide-react'
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { useAccountBalances, useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatMonthYear, toISODateOnly } from '@/utils/format'

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
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const from = toISODateOnly(startOfMonth(referenceDate))
  const to = toISODateOnly(endOfMonth(referenceDate))

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: balances, isLoading: loadingBalances } = useAccountBalances()
  const { data: transactions, isLoading: loadingTransactions } = useTransactions({ from, to })

  const summary = useMemo(() => {
    const list = transactions ?? []
    const receitasRecebidas = list
      .filter((t) => t.type === 'receita' && t.status === 'recebido')
      .reduce((sum, t) => sum + t.amount, 0)
    const despesasPagas = list
      .filter((t) => t.type === 'despesa' && t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0)

    const saldoDisponivel = (balances ?? [])
      .filter((b) => accounts?.find((a) => a.id === b.account_id)?.include_in_available_balance)
      .reduce((sum, b) => sum + b.current_balance, 0)

    return {
      receitasRecebidas,
      despesasPagas,
      resultadoRealizado: receitasRecebidas - despesasPagas,
      saldoDisponivel,
    }
  }, [transactions, balances, accounts])

  const chartData = [
    { nome: 'Receitas', valor: summary.receitasRecebidas, fill: 'var(--color-success-600)' },
    { nome: 'Despesas', valor: summary.despesasPagas, fill: 'var(--color-danger-600)' },
  ]

  const isLoading = loadingAccounts || loadingBalances || loadingTransactions
  const hasNoAccounts = !loadingAccounts && (accounts?.length ?? 0) === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Início</h1>
          <p className="text-sm text-(--color-ink-400)">Sua situação financeira em {formatMonthYear(referenceDate)}.</p>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (
              <>
                <IndicatorCard
                  label="Saldo disponível hoje"
                  value={formatCurrency(summary.saldoDisponivel)}
                  icon={Wallet}
                  tone={summary.saldoDisponivel >= 0 ? 'success' : 'danger'}
                />
                <IndicatorCard
                  label="Receitas recebidas no mês"
                  value={formatCurrency(summary.receitasRecebidas)}
                  icon={ArrowUpCircle}
                  tone="success"
                />
                <IndicatorCard
                  label="Despesas pagas no mês"
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
            <CardHeader title="Receitas versus despesas" subtitle="Movimentações efetivadas no mês selecionado" />
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : summary.receitasRecebidas === 0 && summary.despesasPagas === 0 ? (
              <EmptyState
                icon={Scale}
                title="Sem movimentações efetivadas"
                description="Marque receitas como recebidas e despesas como pagas para ver esse gráfico."
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={64}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-navy-100)" vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={90}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

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
                {(balances ?? []).slice(0, 5).map((b) => (
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
                title="Nenhuma movimentação neste mês"
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
        </>
      )}
    </div>
  )
}
