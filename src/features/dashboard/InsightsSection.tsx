import { useMemo } from 'react'
import { Lightbulb, TrendingDown, TrendingUp } from 'lucide-react'
import { subMonths } from 'date-fns'
import { useGoalContributionSums, useGoals } from '@/hooks/useGoals'
import { useAccountBalances } from '@/hooks/useAccounts'
import { useAllDebtPayments, useDebts } from '@/hooks/useDebts'
import { useMonthlyCashflow } from '@/hooks/useMonthlyCashflow'
import { useBudgetProgress } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { goalProgress, monthlyContributionNeeded } from '@/utils/goals'
import { computeHealthScore } from '@/utils/healthScore'
import { toMonthStart } from '@/utils/budget'
import { aggregateExpensesByCategory } from '@/utils/categoryBreakdown'
import { buildInsights, type Insight } from '@/utils/dashboardInsights'
import type { TimelineMonth } from '@/utils/dashboardTimeline'
import type { Database } from '@/types/database.types'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { toISODateOnly } from '@/utils/format'

type Transaction = Database['public']['Tables']['transactions']['Row']

const TONE_ICON: Record<Insight['tone'], typeof Lightbulb> = {
  positive: TrendingUp,
  warning: TrendingDown,
  neutral: Lightbulb,
}
const TONE_COLOR: Record<Insight['tone'], string> = {
  positive: 'text-(--color-success-600)',
  warning: 'text-(--color-warning-600)',
  neutral: 'text-(--color-navy-600)',
}

/**
 * Painel de insights automáticos: cruza dados que outras seções da Início já
 * buscam (React Query reaproveita as mesmas queryKeys, então isso não gera
 * chamadas de rede extras) e aplica as regras de `@/utils/dashboardInsights`.
 */
export function InsightsSection({
  timelineTransactions,
  timeline,
  isLoadingTimeline,
}: {
  timelineTransactions: Transaction[]
  timeline: TimelineMonth[]
  isLoadingTimeline: boolean
}) {
  const { data: cashflow, isLoading: loadingCashflow } = useMonthlyCashflow(3)
  const { data: goals, isLoading: loadingGoals } = useGoals()
  const { data: contributionSums } = useGoalContributionSums()
  const { data: balances } = useAccountBalances()
  const { data: debts, isLoading: loadingDebts } = useDebts()
  const { data: budgetProgress, isLoading: loadingBudget } = useBudgetProgress(toMonthStart(new Date()))
  const { data: categories } = useCategories()

  const threeMonthsAgoISO = useMemo(() => toISODateOnly(subMonths(new Date(), 3)), [])
  const { data: recentPayments, isLoading: loadingPayments } = useAllDebtPayments(threeMonthsAgoISO)

  const isLoading =
    isLoadingTimeline || loadingCashflow || loadingGoals || loadingDebts || loadingBudget || loadingPayments

  const healthAlerts = useMemo(() => {
    const list = cashflow ?? []
    const averageIncome = list.length ? list.reduce((s, m) => s + m.income, 0) / list.length : 0
    const averageExpense = list.length ? list.reduce((s, m) => s + m.expense, 0) / list.length : 0

    const emergencyGoals = (goals ?? []).filter((g) => g.is_emergency_fund && g.status !== 'arquivada')
    const emergencyFundAmount =
      emergencyGoals.length === 0
        ? null
        : emergencyGoals.reduce((sum, g) => {
            const sumContrib = contributionSums?.get(g.id) ?? 0
            const linkedBalance = g.linked_account_id
              ? (balances?.find((b) => b.account_id === g.linked_account_id)?.current_balance ?? 0)
              : null
            return sum + goalProgress(g, sumContrib, linkedBalance).current
          }, 0)

    const activeDebts = (debts ?? []).filter((d) => d.status === 'ativa')
    const monthlyDebtMinimums = !debts
      ? null
      : activeDebts.reduce((s, d) => s + Math.min(d.minimum_payment, d.outstanding_balance), 0)

    const budgetCategories =
      !budgetProgress || budgetProgress.length === 0
        ? null
        : budgetProgress.map((b) => ({ budgeted: b.budgeted, spent: b.spent }))

    return computeHealthScore({
      averageIncome,
      averageExpense,
      emergencyFundAmount,
      monthlyDebtMinimums,
      budgetCategories,
    }).alerts
  }, [cashflow, goals, contributionSums, balances, debts, budgetProgress])

  const { currentCategoryBreakdown, previousCategoryBreakdown } = useMemo(() => {
    const currentMonth = timeline.find((m) => m.isCurrent)
    const previousIndex = timeline.findIndex((m) => m.isCurrent) - 1
    const previousMonth = previousIndex >= 0 ? timeline[previousIndex] : null
    if (!currentMonth || !previousMonth) return { currentCategoryBreakdown: [], previousCategoryBreakdown: [] }

    const currentTx = timelineTransactions.filter((t) => t.competence_date.startsWith(currentMonth.month.slice(0, 7)))
    const previousTx = timelineTransactions.filter((t) => t.competence_date.startsWith(previousMonth.month.slice(0, 7)))

    return {
      currentCategoryBreakdown: aggregateExpensesByCategory(currentTx, categories ?? [], 100),
      previousCategoryBreakdown: aggregateExpensesByCategory(previousTx, categories ?? [], 100),
    }
  }, [timeline, timelineTransactions, categories])

  const debtsTrend = useMemo(() => {
    const principalPaidLast3Months = (recentPayments ?? []).reduce(
      (sum, p) => sum + (p.principal_portion ?? p.amount),
      0,
   )
    const installmentsDueNext3Months = timelineTransactions
      .filter((t) => t.installment_group_id !== null)
      .filter((t) => t.status === 'previsto' || t.status === 'pendente' || t.status === 'atrasado')
      .filter((t) => {
        const currentMonth = timeline.find((m) => m.isCurrent)?.month.slice(0, 7)
        return currentMonth ? t.competence_date.slice(0, 7) >= currentMonth : true
      })
      .reduce((sum, t) => sum + t.amount, 0)

    return { principalPaidLast3Months, installmentsDueNext3Months }
  }, [recentPayments, timelineTransactions, timeline])

  const goalsForPace = useMemo(
    () =>
      (goals ?? [])
        .filter((g) => g.status === 'ativa')
        .map((g) => {
          const sum = contributionSums?.get(g.id) ?? 0
          const linkedBalance = g.linked_account_id
            ? (balances?.find((b) => b.account_id === g.linked_account_id)?.current_balance ?? 0)
            : null
          const progress = goalProgress(g, sum, linkedBalance)
          return {
            name: g.name,
            percent: progress.percent,
            completed: progress.completed,
            monthlyNeeded: monthlyContributionNeeded(g.target_amount, progress.current, g.target_date),
            targetDate: g.target_date,
          }
        }),
    [goals, contributionSums, balances],
  )

  const insights = useMemo(
    () =>
      buildInsights({
        timeline,
        healthAlerts,
        currentCategoryBreakdown,
        previousCategoryBreakdown,
        debtsTrend,
        goals: goalsForPace,
      }),
    [timeline, healthAlerts, currentCategoryBreakdown, previousCategoryBreakdown, debtsTrend, goalsForPace],
  )

  return (
    <Card>
      <CardHeader title="Insights" subtitle="Leituras automáticas com base nos seus dados dos últimos meses" />
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Ainda sem insights"
          description="Continue registrando movimentações — assim que houver histórico suficiente, leituras automáticas aparecem aqui."
        />
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {insights.map((insight, i) => {
            const Icon = TONE_ICON[insight.tone]
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm text-(--color-ink-600)">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE_COLOR[insight.tone]}`} aria-hidden="true" />
                {insight.message}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
