import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, HeartPulse, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { useMonthlyCashflow } from '@/hooks/useMonthlyCashflow'
import { useGoalContributionSums, useGoals } from '@/hooks/useGoals'
import { useAccountBalances } from '@/hooks/useAccounts'
import { useDebts } from '@/hooks/useDebts'
import { useBudgetProgress } from '@/hooks/useBudgets'
import { goalProgress } from '@/utils/goals'
import { computeHealthScore, type HealthLevel } from '@/utils/healthScore'
import { toMonthStart } from '@/utils/budget'
import { formatPercent } from '@/utils/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

const LEVEL_STYLE: Record<HealthLevel, { label: string; ring: string; text: string; bg: string }> = {
  excelente: {
    label: 'Excelente',
    ring: 'stroke-(--color-success-600)',
    text: 'text-(--color-success-700)',
    bg: 'bg-(--color-success-100)',
  },
  boa: {
    label: 'Boa',
    ring: 'stroke-(--color-navy-600)',
    text: 'text-(--color-navy-700)',
    bg: 'bg-(--color-navy-100)',
  },
  atencao: {
    label: 'Atenção',
    ring: 'stroke-(--color-warning-600)',
    text: 'text-(--color-warning-700)',
    bg: 'bg-(--color-warning-100)',
  },
  critica: {
    label: 'Crítica',
    ring: 'stroke-(--color-danger-600)',
    text: 'text-(--color-danger-700)',
    bg: 'bg-(--color-danger-100)',
  },
}

function ScoreRing({ score, level }: { score: number; level: HealthLevel }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const style = LEVEL_STYLE[level]

  return (
    <div className="relative flex h-36 w-36 flex-none items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-(--color-navy-50)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className={`fill-none ${style.ring} transition-[stroke-dashoffset] duration-500`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-semibold text-(--color-ink-900)">{score}</span>
        <span className="text-xs text-(--color-ink-600)">de 100</span>
      </div>
    </div>
  )
}

/**
 * Diagnósticos: nota de saúde financeira (0-100) combinando taxa de poupança,
 * cobertura da reserva de emergência, comprometimento com dívidas e aderência
 * ao orçamento — toda a lógica de cálculo vive em src/utils/healthScore.ts
 * (testável), esta página só busca os dados e renderiza.
 */
export function DiagnosticsPage() {
  const { data: cashflow, isLoading: loadingCashflow } = useMonthlyCashflow(3)
  const { data: goals, isLoading: loadingGoals } = useGoals()
  const { data: contributionSums } = useGoalContributionSums()
  const { data: balances } = useAccountBalances()
  const { data: debts, isLoading: loadingDebts } = useDebts()
  const { data: budgetProgress, isLoading: loadingBudget } = useBudgetProgress(toMonthStart(new Date()))

  const isLoading = loadingCashflow || loadingGoals || loadingDebts || loadingBudget

  const { averageIncome, averageExpense } = useMemo(() => {
    const list = cashflow ?? []
    if (list.length === 0) return { averageIncome: 0, averageExpense: 0 }
    return {
      averageIncome: list.reduce((s, m) => s + m.income, 0) / list.length,
      averageExpense: list.reduce((s, m) => s + m.expense, 0) / list.length,
    }
  }, [cashflow])

  const emergencyFundAmount = useMemo(() => {
    const emergencyGoals = (goals ?? []).filter((g) => g.is_emergency_fund && g.status !== 'arquivada')
    if (emergencyGoals.length === 0) return null
    return emergencyGoals.reduce((sum, g) => {
      const sumContrib = contributionSums?.get(g.id) ?? 0
      const linkedBalance = g.linked_account_id
        ? (balances?.find((b) => b.account_id === g.linked_account_id)?.current_balance ?? 0)
        : null
      return sum + goalProgress(g, sumContrib, linkedBalance).current
    }, 0)
  }, [goals, contributionSums, balances])

  const monthlyDebtMinimums = useMemo(() => {
    const active = (debts ?? []).filter((d) => d.status === 'ativa')
    if (!debts || active.length === 0) return debts ? null : null
    return active.reduce((s, d) => s + Math.min(d.minimum_payment, d.outstanding_balance), 0)
  }, [debts])

  const budgetCategories = useMemo(() => {
    if (!budgetProgress || budgetProgress.length === 0) return null
    return budgetProgress.map((b) => ({ budgeted: b.budgeted, spent: b.spent }))
  }, [budgetProgress])

  const result = useMemo(
    () =>
      computeHealthScore({
        averageIncome,
        averageExpense,
        emergencyFundAmount,
        monthlyDebtMinimums,
        budgetCategories,
      }),
    [averageIncome, averageExpense, emergencyFundAmount, monthlyDebtMinimums, budgetCategories],
  )

  const style = LEVEL_STYLE[result.level]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Diagnósticos</h1>
        <p className="text-sm text-(--color-ink-600)">
          Uma nota de 0 a 100 combinando poupança, reserva de emergência, dívidas e orçamento — calculada a partir dos
          últimos 3 meses de movimentações efetivadas.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
          <ScoreRing score={result.score} level={result.level} />
          <div className="flex-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} px-3 py-1 text-sm font-medium ${style.text}`}
            >
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
              Saúde financeira {style.label.toLowerCase()}
            </span>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {result.savingsRate !== null && (
                <div className="flex items-center gap-2 text-sm">
                  {result.savingsRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-(--color-success-600)" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-(--color-danger-600)" aria-hidden="true" />
                  )}
                  <span className="text-(--color-ink-600)">
                    Poupança: <strong className="text-(--color-ink-900)">{formatPercent(result.savingsRate)}</strong> da
                    renda
                  </span>
                </div>
              )}
              {result.emergencyFundMonths !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-(--color-navy-600)" aria-hidden="true" />
                  <span className="text-(--color-ink-600)">
                    Reserva cobre{' '}
                    <strong className="text-(--color-ink-900)">{result.emergencyFundMonths.toFixed(1)}</strong> mês(es)
                    de despesas
                  </span>
                </div>
              )}
              {result.debtBurden !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-(--color-danger-600)" aria-hidden="true" />
                  <span className="text-(--color-ink-600)">
                    Dívidas comprometem{' '}
                    <strong className="text-(--color-ink-900)">{formatPercent(result.debtBurden)}</strong> da renda
                  </span>
                </div>
              )}
              {result.budgetAdherence !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-(--color-success-600)" aria-hidden="true" />
                  <span className="text-(--color-ink-600)">
                    <strong className="text-(--color-ink-900)">{formatPercent(result.budgetAdherence)}</strong> do
                    orçamento dentro do limite
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {!isLoading && result.alerts.length > 0 && (
        <Card className="p-4">
          <CardHeader title="Pontos de atenção" />
          <ul className="mt-3 flex flex-col gap-2">
            {result.alerts.map((alert, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-(--color-ink-600)">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-(--color-warning-600)" aria-hidden="true" />
                {alert}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <CardHeader title="Como a nota é calculada" />
        <p className="mt-2 text-sm text-(--color-ink-600)">
          Poupança (40 pts): 20% ou mais da renda sobrando pontua o máximo. Reserva de emergência (25 pts): 6 meses ou
          mais de despesas cobertas pontua o máximo. Dívidas (20 pts): comprometimento de até 10% da renda pontua o
          máximo, acima de 30% zera o sinal. Orçamento (15 pts): proporção de categorias dentro do limite no mês atual.
          Sinais sem dados cadastrados (ex.: sem dívidas ou sem orçamento) não penalizam a nota — o peso é redistribuído
          entre os sinais disponíveis.
        </p>
      </Card>
    </div>
  )
}
