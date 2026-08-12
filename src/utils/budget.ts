/**
 * Regras do orçamento mensal: status de consumo orçado × realizado.
 * Limiar de alerta: 80% (consumo alto, ainda dentro do orçado).
 */

export type BudgetStatus = 'ok' | 'alerta' | 'estourado'

export interface BudgetUsage {
  status: BudgetStatus
  /** Percentual consumido (pode passar de 100). */
  percent: number
  remaining: number
}

const ALERT_THRESHOLD = 0.8

export function budgetUsage(budgeted: number, spent: number): BudgetUsage {
  const percent = budgeted > 0 ? (spent / budgeted) * 100 : 0
  const remaining = Math.round((budgeted - spent) * 100) / 100
  const status: BudgetStatus = spent > budgeted ? 'estourado' : spent >= budgeted * ALERT_THRESHOLD ? 'alerta' : 'ok'
  return { status, percent, remaining }
}

/** Normaliza qualquer data para o primeiro dia do mês (formato aceito pela coluna `month`). */
export function toMonthStart(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function shiftMonth(monthISO: string, delta: number): string {
  const [y, m] = monthISO.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return toMonthStart(d)
}
