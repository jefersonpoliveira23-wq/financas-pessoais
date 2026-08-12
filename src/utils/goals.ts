/**
 * Regras de progresso de metas.
 *
 * Meta independente: progresso = soma dos aportes registrados (aporte negativo
 * é resgate). Meta alocada: progresso = saldo da conta vinculada, limitado ao
 * valor-alvo (o dinheiro é o mesmo — nunca contamos além do que existe).
 */

export interface GoalLike {
  mode: 'independente' | 'alocado'
  target_amount: number
}

export interface GoalProgress {
  current: number
  /** 0 a 100, limitado a 100. */
  percent: number
  completed: boolean
}

function toCents(value: number): number {
  return Math.round(value * 100) / 100
}

export function goalProgress(
  goal: GoalLike,
  contributionsSum: number,
  linkedAccountBalance?: number | null,
): GoalProgress {
  const raw = goal.mode === 'alocado' ? Math.max(0, linkedAccountBalance ?? 0) : Math.max(0, contributionsSum)
  const current = toCents(Math.min(raw, goal.target_amount))
  const percent = goal.target_amount > 0 ? Math.min(100, (current / goal.target_amount) * 100) : 0
  return { current, percent, completed: current >= goal.target_amount }
}

/**
 * Quanto é preciso aportar por mês para atingir a meta até a data-alvo.
 * Retorna null quando não há data-alvo ou ela já passou.
 */
export function monthlyContributionNeeded(
  targetAmount: number,
  currentAmount: number,
  targetDate: string | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!targetDate) return null
  const remaining = toCents(targetAmount - currentAmount)
  if (remaining <= 0) return 0

  const [y, m] = targetDate.split('-').map(Number)
  const monthsLeft = (y - today.getFullYear()) * 12 + (m - 1 - today.getMonth())
  if (monthsLeft <= 0) return null
  return toCents(remaining / monthsLeft)
}
