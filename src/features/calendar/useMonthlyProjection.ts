import { useMemo } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { computeDailyProjection, findFirstNegativeDay, findLowestBalanceDay } from '@/utils/calendarProjection'
import { toISODateOnly } from '@/utils/format'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export function eventDateOf(t: Transaction): string {
  return t.due_date ?? t.transaction_date
}

export function useMonthlyProjection(referenceDate: Date) {
  const monthStart = startOfMonth(referenceDate)
  const monthEnd = endOfMonth(referenceDate)
  const from = toISODateOnly(monthStart)
  const to = toISODateOnly(monthEnd)

  const { data: transactions, isLoading: loadingTransactions } = useTransactions({ from, to })
  const { data: accounts } = useAccounts()
  const { data: balances, isLoading: loadingBalances } = useAccountBalances()

  const result = useMemo(() => {
    const list = (transactions ?? []).filter((t) => t.type !== 'transferencia') // ver nota sobre transferências abaixo
    const todayISO = toISODateOnly(new Date())

    const referenceBalance = (balances ?? [])
      .filter((b) => accounts?.find((a) => a.id === b.account_id)?.include_in_available_balance)
      .reduce((sum, b) => sum + b.current_balance, 0)

    const pendingItems = list
      .filter((t) => t.status === 'previsto' || t.status === 'pendente' || t.status === 'atrasado')
      .map((t) => ({
        eventDate: eventDateOf(t),
        netAmount: t.type === 'receita' ? t.amount : -t.amount,
      }))

    const projection = computeDailyProjection(referenceBalance, todayISO, to, pendingItems)
    const firstNegativeDay = findFirstNegativeDay(projection)
    const lowestBalanceDay = findLowestBalanceDay(projection)

    // Itens por dia (para a grade do calendário e a lista do dia selecionado).
    const itemsByDay = new Map<string, Transaction[]>()
    for (const t of transactions ?? []) {
      const date = eventDateOf(t)
      const arr = itemsByDay.get(date) ?? []
      arr.push(t)
      itemsByDay.set(date, arr)
    }

    // Concentração de vencimentos: dia com mais itens pendentes de pagamento.
    let concentrationDay: { date: string; count: number } | null = null
    for (const [date, items] of itemsByDay.entries()) {
      const pendingCount = items.filter(
        (t) => t.status === 'previsto' || t.status === 'pendente' || t.status === 'atrasado',
      ).length
      if (pendingCount > 0 && (!concentrationDay || pendingCount > concentrationDay.count)) {
        concentrationDay = { date, count: pendingCount }
      }
    }

    // Valor livre até a próxima receita prevista/pendente a partir de hoje.
    const nextIncome = pendingItems
      .filter((i) => i.netAmount > 0 && i.eventDate >= todayISO)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0]
    const freeUntilNextIncome = nextIncome
      ? ((projection.find((p) => p.date < nextIncome.eventDate) ?? projection[0])?.balance ?? referenceBalance)
      : (projection[projection.length - 1]?.balance ?? referenceBalance)

    return {
      referenceBalance,
      projection,
      firstNegativeDay,
      lowestBalanceDay,
      concentrationDay,
      freeUntilNextIncome,
      itemsByDay,
      monthStart,
      monthEnd,
    }
  }, [transactions, accounts, balances, to, monthStart, monthEnd])

  return { ...result, isLoading: loadingTransactions || loadingBalances }
}
