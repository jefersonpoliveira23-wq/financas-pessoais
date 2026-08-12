/**
 * Nota de saúde financeira — combina quatro sinais em um score de 0 a 100:
 *
 *   1. Taxa de poupança (40 pts): quanto da renda realizada sobra no mês.
 *   2. Reserva de emergência (25 pts): quantos meses de despesa ela cobre.
 *   3. Comprometimento com dívidas (20 pts): % da renda usada em pagamentos mínimos.
 *   4. Aderência ao orçamento (15 pts): % de categorias orçadas que não estouraram.
 *
 * Cada sinal é opcional (usuário pode não ter dívidas, reserva ou orçamento
 * cadastrados) — quando o dado não existe, o peso daquele sinal é redistribuído
 * proporcionalmente entre os sinais que existem, em vez de zerar a nota à toa.
 */

export type HealthLevel = 'excelente' | 'boa' | 'atencao' | 'critica'

export interface HealthScoreInput {
  /** Renda realizada média dos últimos meses disponíveis (recebida). */
  averageIncome: number
  /** Despesa realizada média dos últimos meses disponíveis (paga). */
  averageExpense: number
  /** Valor atual guardado na(s) meta(s) de reserva de emergência. Null = sem reserva cadastrada. */
  emergencyFundAmount: number | null
  /** Soma dos pagamentos mínimos mensais das dívidas ativas. Null = sem dívidas cadastradas. */
  monthlyDebtMinimums: number | null
  /** Orçamentos do mês atual: null = nenhum orçamento cadastrado. */
  budgetCategories: { budgeted: number; spent: number }[] | null
}

export interface HealthScoreResult {
  score: number
  level: HealthLevel
  savingsRate: number | null
  emergencyFundMonths: number | null
  debtBurden: number | null
  budgetAdherence: number | null
  alerts: string[]
}

const WEIGHTS = { savings: 40, emergency: 25, debt: 20, budget: 15 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function scoreSavings(rate: number): number {
  if (rate <= 0) return 0
  if (rate >= 0.2) return WEIGHTS.savings
  return (rate / 0.2) * WEIGHTS.savings
}

function scoreEmergency(months: number): number {
  if (months <= 0) return 0
  if (months >= 6) return WEIGHTS.emergency
  return (months / 6) * WEIGHTS.emergency
}

function scoreDebt(burden: number): number {
  if (burden <= 0.1) return WEIGHTS.debt
  if (burden >= 0.3) return 0
  return WEIGHTS.debt * (1 - (burden - 0.1) / 0.2)
}

function scoreBudget(adherence: number): number {
  return clamp(adherence, 0, 1) * WEIGHTS.budget
}

function levelFor(score: number): HealthLevel {
  if (score >= 80) return 'excelente'
  if (score >= 60) return 'boa'
  if (score >= 40) return 'atencao'
  return 'critica'
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const alerts: string[] = []

  const parts: { weight: number; points: number }[] = []

  let savingsRate: number | null = null
  if (input.averageIncome > 0) {
    savingsRate = (input.averageIncome - input.averageExpense) / input.averageIncome
    parts.push({ weight: WEIGHTS.savings, points: scoreSavings(savingsRate) })
    if (savingsRate < 0) alerts.push('Suas despesas realizadas superaram a renda recebida na média recente.')
    else if (savingsRate < 0.1)
      alerts.push('Sua taxa de poupança está abaixo de 10% da renda — considere revisar o orçamento.')
  }

  let emergencyFundMonths: number | null = null
  if (input.emergencyFundAmount !== null) {
    emergencyFundMonths = input.averageExpense > 0 ? input.emergencyFundAmount / input.averageExpense : 0
    parts.push({ weight: WEIGHTS.emergency, points: scoreEmergency(emergencyFundMonths) })
    if (emergencyFundMonths < 3) alerts.push('Sua reserva de emergência cobre menos de 3 meses de despesas.')
  }

  let debtBurden: number | null = null
  if (input.monthlyDebtMinimums !== null && input.monthlyDebtMinimums > 0) {
    debtBurden = input.averageIncome > 0 ? input.monthlyDebtMinimums / input.averageIncome : 1
    parts.push({ weight: WEIGHTS.debt, points: scoreDebt(debtBurden) })
    if (debtBurden > 0.3) alerts.push('O comprometimento mensal com dívidas está acima de 30% da renda.')
  }

  let budgetAdherence: number | null = null
  if (input.budgetCategories !== null && input.budgetCategories.length > 0) {
    const overBudget = input.budgetCategories.filter((c) => c.spent > c.budgeted).length
    budgetAdherence = 1 - overBudget / input.budgetCategories.length
    parts.push({ weight: WEIGHTS.budget, points: scoreBudget(budgetAdherence) })
    if (overBudget > 0)
      alerts.push(`${overBudget} categoria${overBudget > 1 ? 's' : ''} do orçamento deste mês já estourou o limite.`)
  }

  let score: number
  if (parts.length === 0) {
    score = 0
  } else {
    const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
    const totalPoints = parts.reduce((s, p) => s + p.points, 0)
    // Redistribui proporcionalmente para 100 pontos possíveis, mesmo com sinais faltando.
    score = Math.round((totalPoints / totalWeight) * 100)
  }

  if (parts.length === 0) alerts.push('Cadastre movimentações para calcularmos sua nota de saúde financeira.')

  return {
    score: clamp(score, 0, 100),
    level: levelFor(score),
    savingsRate,
    emergencyFundMonths,
    debtBurden,
    budgetAdherence,
    alerts,
  }
}
