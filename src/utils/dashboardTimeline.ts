/**
 * Linha do tempo mensal do dashboard (Início): agrega movimentações em uma
 * janela de meses ao redor de uma data de referência (por padrão, 3 meses
 * para trás e 3 para frente), separando o que já foi efetivado (pago/
 * recebido) do que ainda está previsto/pendente/atrasado.
 *
 * Meses futuros só aparecem com valores "previstos" porque só existem
 * transações lançadas (parcelas futuras, recorrências materializadas) —
 * não inventamos dados que não existem no banco.
 */
import { addMonths, startOfMonth, subMonths } from 'date-fns'
import { toISODateOnly } from '@/utils/format'

export interface TimelineTransactionLike {
  type: string
  amount: number
  status: string
  competence_date: string
  installment_group_id: string | null
}

export interface TimelineMonth {
  /** Primeiro dia do mês, ISO (YYYY-MM-DD). */
  month: string
  incomeRealized: number
  incomePlanned: number
  expenseRealized: number
  expensePlanned: number
  /** (incomeRealized + incomePlanned) - (expenseRealized + expensePlanned) */
  net: number
  isPast: boolean
  isCurrent: boolean
  isFuture: boolean
  tone: 'success' | 'danger' | 'neutral'
}

const REALIZED_INCOME_STATUSES = new Set(['recebido'])
const REALIZED_EXPENSE_STATUSES = new Set(['pago'])
const PLANNED_STATUSES = new Set(['previsto', 'pendente', 'atrasado'])
// 'transferencia' não é receita nem despesa (é o mesmo dinheiro mudando de lugar).
// 'pagamento_fatura' é a quitação da fatura do cartão: a despesa real já foi
// contada em cada 'compra_cartao' individual, então contar a fatura também
// duplicaria o valor.
const EXPENSE_TYPES = new Set(['despesa', 'compra_cartao'])
const INCOME_TYPES = new Set(['receita'])

function monthKey(dateISO: string): string {
  return toISODateOnly(startOfMonth(new Date(`${dateISO}T00:00:00`)))
}

/**
 * @param transactions Já deve vir filtrado por período pelo chamador (ex.: via `useTransactions({from, to})`).
 * Se `debtsOnly` for necessário, filtre `installment_group_id !== null` antes de chamar esta função.
 */
export function buildMonthlyTimeline(
  transactions: TimelineTransactionLike[],
  referenceDate: Date,
  monthsBack = 3,
  monthsForward = 3,
): TimelineMonth[] {
  const referenceMonth = startOfMonth(referenceDate)
  const months: TimelineMonth[] = []

  for (let i = -monthsBack; i <= monthsForward; i++) {
    const monthDate = i < 0 ? subMonths(referenceMonth, -i) : addMonths(referenceMonth, i)
    months.push({
      month: toISODateOnly(monthDate),
      incomeRealized: 0,
      incomePlanned: 0,
      expenseRealized: 0,
      expensePlanned: 0,
      net: 0,
      isPast: i < 0,
      isCurrent: i === 0,
      isFuture: i > 0,
      tone: 'neutral',
    })
  }

  const byMonth = new Map(months.map((m) => [m.month, m]))

  for (const t of transactions) {
    if (t.status === 'cancelado' || t.status === 'cancelado_por_quitacao') continue
    const bucket = byMonth.get(monthKey(t.competence_date))
    if (!bucket) continue

    if (INCOME_TYPES.has(t.type)) {
      if (REALIZED_INCOME_STATUSES.has(t.status)) bucket.incomeRealized += t.amount
      else if (PLANNED_STATUSES.has(t.status)) bucket.incomePlanned += t.amount
    } else if (EXPENSE_TYPES.has(t.type)) {
      if (REALIZED_EXPENSE_STATUSES.has(t.status)) bucket.expenseRealized += t.amount
      else if (PLANNED_STATUSES.has(t.status)) bucket.expensePlanned += t.amount
    }
  }

  for (const m of months) {
    m.net = m.incomeRealized + m.incomePlanned - (m.expenseRealized + m.expensePlanned)
    const hasData = m.incomeRealized || m.incomePlanned || m.expenseRealized || m.expensePlanned
    m.tone = !hasData ? 'neutral' : m.net >= 0 ? 'success' : 'danger'
  }

  return months
}

/** Total de despesas (realizadas + previstas) de um mês — atalho usado em cards e insights. */
export function monthTotalExpense(month: TimelineMonth): number {
  return month.expenseRealized + month.expensePlanned
}
