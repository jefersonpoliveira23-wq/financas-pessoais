/**
 * Insights automáticos do dashboard (Início) — regras determinísticas sobre
 * dados que a própria página já calculou (linha do tempo, categorias, nota
 * de saúde financeira, dívidas, metas). Nenhuma chamada de IA aqui de
 * propósito: são comparações simples e auditáveis.
 */
import { formatCurrency, formatPercent } from '@/utils/format'
import type { TimelineMonth } from '@/utils/dashboardTimeline'
import { monthTotalExpense } from '@/utils/dashboardTimeline'
import type { CategoryBreakdownItem } from '@/utils/categoryBreakdown'

export type InsightTone = 'positive' | 'warning' | 'neutral'

export interface Insight {
  tone: InsightTone
  message: string
}

export interface GoalPaceLike {
  name: string
  percent: number
  completed: boolean
  /** Aporte mensal necessário para bater a meta na data-alvo. Null = sem data-alvo ou já vencida. */
  monthlyNeeded: number | null
  targetDate: string | null
}

export interface DebtsTrendInput {
  /** Soma do principal abatido em dívidas nos últimos 3 meses (debt_payments.principal_portion, ou o valor total do pagamento quando não há esse detalhamento). */
  principalPaidLast3Months: number
  /** Soma das parcelas de dívida (installment_group_id vinculado a uma dívida) já lançadas para os próximos 3 meses. */
  installmentsDueNext3Months: number
}

export interface BuildInsightsInput {
  timeline: TimelineMonth[]
  healthAlerts: string[]
  currentCategoryBreakdown: CategoryBreakdownItem[]
  previousCategoryBreakdown: CategoryBreakdownItem[]
  debtsTrend: DebtsTrendInput | null
  goals: GoalPaceLike[]
}

const EXPENSE_GROWTH_WARNING_THRESHOLD = 0.1 // 10%
const CATEGORY_GROWTH_MIN_ABSOLUTE = 50 // ignora ruído de categorias pequenas

function comparePastTwoMonths(timeline: TimelineMonth[]): Insight | null {
  const current = timeline.find((m) => m.isCurrent)
  const currentIndex = timeline.findIndex((m) => m.isCurrent)
  if (!current || currentIndex <= 0) return null
  const previous = timeline[currentIndex - 1]

  const currentExpense = monthTotalExpense(current)
  const previousExpense = monthTotalExpense(previous)
  if (previousExpense <= 0) return null

  const variation = (currentExpense - previousExpense) / previousExpense
  if (variation >= EXPENSE_GROWTH_WARNING_THRESHOLD) {
    return {
      tone: 'warning',
      message: `Suas despesas deste mês estão ${formatPercent(variation)} maiores que no mês passado.`,
    }
  }
  if (variation <= -EXPENSE_GROWTH_WARNING_THRESHOLD) {
    return {
      tone: 'positive',
      message: `Suas despesas deste mês estão ${formatPercent(Math.abs(variation))} menores que no mês passado.`,
    }
  }
  return null
}

function biggestCategoryIncrease(current: CategoryBreakdownItem[], previous: CategoryBreakdownItem[]): Insight | null {
  const previousByName = new Map(previous.map((c) => [c.name, c.value]))
  let best: { name: string; diff: number; previousValue: number } | null = null

  for (const c of current) {
    const previousValue = previousByName.get(c.name) ?? 0
    const diff = c.value - previousValue
    if (diff < CATEGORY_GROWTH_MIN_ABSOLUTE) continue
    if (!best || diff > best.diff) best = { name: c.name, diff, previousValue }
  }

  if (!best) return null
  if (best.previousValue <= 0) {
    return {
      tone: 'warning',
      message: `"${best.name}" é a categoria com maior gasto novo no período (${formatCurrency(best.diff)}).`,
    }
  }
  const variation = best.diff / best.previousValue
  return {
    tone: 'warning',
    message: `"${best.name}" foi a categoria que mais cresceu: ${formatPercent(variation)} a mais que no período anterior.`,
  }
}

function debtsTrendInsight(trend: DebtsTrendInput | null): Insight | null {
  if (!trend) return null
  const { principalPaidLast3Months, installmentsDueNext3Months } = trend

  if (principalPaidLast3Months > 0) {
    return {
      tone: 'positive',
      message: `Você abateu ${formatCurrency(principalPaidLast3Months)} em dívidas nos últimos 3 meses.`,
    }
  }
  if (installmentsDueNext3Months > 0) {
    return {
      tone: 'neutral',
      message: `Há ${formatCurrency(installmentsDueNext3Months)} em parcelas de dívidas previstas para os próximos 3 meses.`,
    }
  }
  return null
}

function goalPaceInsight(goals: GoalPaceLike[]): Insight | null {
  const active = goals.filter((g) => !g.completed && g.monthlyNeeded !== null && g.monthlyNeeded > 0)
  if (active.length === 0) return null

  const closest = active.reduce((best, g) => (g.percent > best.percent ? g : best), active[0])
  return {
    tone: 'neutral',
    message: `No ritmo atual, faltam ${formatCurrency(closest.monthlyNeeded ?? 0)}/mês para bater a meta "${closest.name}" na data planejada.`,
  }
}

export function buildInsights(input: BuildInsightsInput): Insight[] {
  const insights: Insight[] = []

  const expenseComparison = comparePastTwoMonths(input.timeline)
  if (expenseComparison) insights.push(expenseComparison)

  const categoryIncrease = biggestCategoryIncrease(input.currentCategoryBreakdown, input.previousCategoryBreakdown)
  if (categoryIncrease) insights.push(categoryIncrease)

  const debtsInsight = debtsTrendInsight(input.debtsTrend)
  if (debtsInsight) insights.push(debtsInsight)

  const goalInsight = goalPaceInsight(input.goals)
  if (goalInsight) insights.push(goalInsight)

  for (const alert of input.healthAlerts) {
    insights.push({ tone: 'warning', message: alert })
  }

  return insights
}
