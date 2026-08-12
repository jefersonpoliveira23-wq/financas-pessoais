/**
 * Projeção de saldo diário para o Calendário financeiro (seção 15).
 *
 * A partir do saldo disponível de hoje (fonte única: view account_balances)
 * e das movimentações ainda não efetivadas (previsto/pendente/atrasado) do
 * mês, calcula o saldo projetado dia a dia até o fim do mês exibido.
 *
 * Duas decisões deliberadas, documentadas aqui para não parecerem bugs:
 *  - A projeção só existe do dia de hoje em diante (não reconstruímos saldo
 *    histórico "no passado" — isso exigiria inventar informação que não
 *    temos com certeza).
 *  - Itens atrasados (vencidos e ainda não pagos) são jogados no dia de
 *    hoje, porque não sabemos quando serão efetivamente pagos — é a
 *    suposição mais honesta possível.
 */
import { parseISO, differenceInCalendarDays, addDays } from 'date-fns'
import { toISODateOnly } from '@/utils/format'

export interface ProjectionItem {
  /** Data do evento (vencimento, ou data da movimentação se não houver vencimento). */
  eventDate: string
  /** Valor já com sinal: positivo para entradas, negativo para saídas. */
  netAmount: number
}

export interface DayProjection {
  date: string
  balance: number
}

export function computeDailyProjection(
  referenceBalance: number,
  todayISO: string,
  monthEndISO: string,
  items: ProjectionItem[],
): DayProjection[] {
  const today = parseISO(todayISO)
  const monthEnd = parseISO(monthEndISO)
  const dayCount = differenceInCalendarDays(monthEnd, today) + 1
  if (dayCount <= 0) return []

  const bucket = new Map<string, number>()
  for (const item of items) {
    // Itens vencidos (antes de hoje) são reagrupados em "hoje".
    const bucketDate = item.eventDate < todayISO ? todayISO : item.eventDate
    bucket.set(bucketDate, (bucket.get(bucketDate) ?? 0) + item.netAmount)
  }

  const result: DayProjection[] = []
  let cumulative = referenceBalance
  for (let i = 0; i < dayCount; i++) {
    const date = toISODateOnly(addDays(today, i))
    cumulative += bucket.get(date) ?? 0
    result.push({ date, balance: cumulative })
  }
  return result
}

/** Primeiro dia em que o saldo projetado fica negativo, se houver. */
export function findFirstNegativeDay(projection: DayProjection[]): DayProjection | null {
  return projection.find((day) => day.balance < 0) ?? null
}

/** Dia com o menor saldo projetado do período (o "fundo do poço" do mês). */
export function findLowestBalanceDay(projection: DayProjection[]): DayProjection | null {
  if (projection.length === 0) return null
  return projection.reduce((lowest, day) => (day.balance < lowest.balance ? day : lowest), projection[0])
}
