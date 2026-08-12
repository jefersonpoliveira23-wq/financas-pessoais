/**
 * Simulador de quitação de dívidas — estratégias "bola de neve" e "avalanche".
 *
 * Lógica pura (sem I/O) para ser testável: a cada mês, os juros são
 * capitalizados sobre o saldo devedor, os pagamentos mínimos são feitos em
 * todas as dívidas e o valor extra do orçamento vai integralmente para a
 * dívida-alvo da estratégia:
 *   - bola de neve: menor saldo primeiro (vitórias rápidas, motivação);
 *   - avalanche: maior taxa de juros primeiro (menor custo total).
 *
 * Todos os valores são arredondados para centavos a cada passo, para o
 * cronograma bater com o que o usuário verá na prática.
 */

export interface SimulatorDebt {
  id: string
  name: string
  /** Saldo devedor atual. */
  balance: number
  /** Juros mensais em percentual (1.99 = 1,99% a.m.). */
  monthlyRate: number
  /** Pagamento mínimo mensal. */
  minimumPayment: number
}

export interface MonthPayment {
  debtId: string
  amount: number
  interest: number
  principal: number
  remainingBalance: number
}

export interface SimulationMonth {
  /** 1 = primeiro mês da simulação. */
  month: number
  payments: MonthPayment[]
  totalBalance: number
}

export interface SimulationResult {
  strategy: 'bola_de_neve' | 'avalanche'
  feasible: boolean
  /** Motivo quando feasible = false. */
  infeasibleReason?: string
  months: number
  totalPaid: number
  totalInterest: number
  /** Ordem em que as dívidas foram quitadas (ids). */
  payoffOrder: string[]
  schedule: SimulationMonth[]
}

const MAX_MONTHS = 600

function toCents(value: number): number {
  return Math.round(value * 100) / 100
}

function sortByStrategy(debts: SimulatorDebt[], strategy: 'bola_de_neve' | 'avalanche'): SimulatorDebt[] {
  const copy = [...debts]
  if (strategy === 'bola_de_neve') {
    copy.sort((a, b) => a.balance - b.balance || b.monthlyRate - a.monthlyRate)
  } else {
    copy.sort((a, b) => b.monthlyRate - a.monthlyRate || a.balance - b.balance)
  }
  return copy
}

export function simulatePayoff(
  debts: SimulatorDebt[],
  monthlyBudget: number,
  strategy: 'bola_de_neve' | 'avalanche',
): SimulationResult {
  const active = debts.filter((d) => d.balance > 0).map((d) => ({ ...d, balance: toCents(d.balance) }))

  const base: Omit<SimulationResult, 'feasible' | 'infeasibleReason'> = {
    strategy,
    months: 0,
    totalPaid: 0,
    totalInterest: 0,
    payoffOrder: [],
    schedule: [],
  }

  if (active.length === 0) {
    return { ...base, feasible: true }
  }

  const totalMinimum = toCents(active.reduce((sum, d) => sum + Math.min(d.minimumPayment, d.balance), 0))
  if (monthlyBudget <= 0 || monthlyBudget < totalMinimum) {
    return {
      ...base,
      feasible: false,
      infeasibleReason: 'O orçamento mensal não cobre a soma dos pagamentos mínimos das dívidas ativas.',
    }
  }

  const balances = new Map(active.map((d) => [d.id, d.balance]))
  const payoffOrder: string[] = []
  const schedule: SimulationMonth[] = []
  let totalPaid = 0
  let totalInterest = 0

  for (let month = 1; month <= MAX_MONTHS; month++) {
    // 1. Juros do mês sobre o saldo atual.
    let monthInterest = 0
    for (const d of active) {
      const bal = balances.get(d.id)!
      if (bal <= 0) continue
      const interest = toCents((bal * d.monthlyRate) / 100)
      balances.set(d.id, toCents(bal + interest))
      monthInterest = toCents(monthInterest + interest)
    }

    // Se os juros do mês já consomem o orçamento inteiro, a dívida nunca cai.
    if (monthInterest >= monthlyBudget) {
      return {
        ...base,
        months: month - 1,
        totalPaid,
        totalInterest,
        payoffOrder,
        schedule,
        feasible: false,
        infeasibleReason: 'Com esse orçamento, os juros mensais superam o valor pago — o saldo devedor nunca diminui.',
      }
    }

    let budgetLeft = monthlyBudget
    const payments: MonthPayment[] = []
    const paidThisMonth = new Map<string, MonthPayment>()

    // 2. Pagamentos mínimos em todas as dívidas ativas.
    for (const d of active) {
      const bal = balances.get(d.id)!
      if (bal <= 0) continue
      const pay = toCents(Math.min(d.minimumPayment, bal, budgetLeft))
      if (pay <= 0) continue
      balances.set(d.id, toCents(bal - pay))
      budgetLeft = toCents(budgetLeft - pay)
      const p: MonthPayment = {
        debtId: d.id,
        amount: pay,
        interest: 0,
        principal: pay,
        remainingBalance: balances.get(d.id)!,
      }
      paidThisMonth.set(d.id, p)
      payments.push(p)
    }

    // 3. Extra vai para a dívida-alvo (reordenada a cada mês, pois saldos mudam).
    const targets = sortByStrategy(
      active.filter((d) => balances.get(d.id)! > 0),
      strategy,
    )
    for (const target of targets) {
      if (budgetLeft <= 0) break
      const bal = balances.get(target.id)!
      const pay = toCents(Math.min(bal, budgetLeft))
      if (pay <= 0) continue
      balances.set(target.id, toCents(bal - pay))
      budgetLeft = toCents(budgetLeft - pay)
      const existing = paidThisMonth.get(target.id)
      if (existing) {
        existing.amount = toCents(existing.amount + pay)
        existing.principal = toCents(existing.principal + pay)
        existing.remainingBalance = balances.get(target.id)!
      } else {
        const p: MonthPayment = {
          debtId: target.id,
          amount: pay,
          interest: 0,
          principal: pay,
          remainingBalance: balances.get(target.id)!,
        }
        paidThisMonth.set(target.id, p)
        payments.push(p)
      }
    }

    const monthPaid = toCents(payments.reduce((s, p) => s + p.amount, 0))
    totalPaid = toCents(totalPaid + monthPaid)
    totalInterest = toCents(totalInterest + monthInterest)

    // Registra quitação na ordem em que aconteceu.
    for (const d of active) {
      if (balances.get(d.id)! <= 0 && !payoffOrder.includes(d.id)) {
        payoffOrder.push(d.id)
      }
    }

    const totalBalance = toCents(Array.from(balances.values()).reduce((s, b) => s + b, 0))
    schedule.push({ month, payments, totalBalance })

    if (totalBalance <= 0) {
      return { ...base, feasible: true, months: month, totalPaid, totalInterest, payoffOrder, schedule }
    }
  }

  return {
    ...base,
    months: MAX_MONTHS,
    totalPaid,
    totalInterest,
    payoffOrder,
    schedule,
    feasible: false,
    infeasibleReason: 'A simulação ultrapassou 50 anos — aumente o valor mensal destinado às dívidas.',
  }
}
