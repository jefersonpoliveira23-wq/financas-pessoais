import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getInvoicePeriod } from '@/utils/creditCard'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']
type CreditCard = Database['public']['Tables']['credit_cards']['Row']

export interface Invoice {
  invoiceId: string
  closingDate: string
  dueDate: string
  items: Transaction[]
  total: number
  payments: Transaction[]
  totalPaid: number
  isOpen: boolean // fatura ainda não fechou
}

/** Todas as movimentações (compras + pagamentos) do cartão, cruas do banco. */
function useCardTransactions(cardId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['card_transactions', user?.id, cardId],
    enabled: !!user && !!cardId,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('card_id', cardId as string)
        .order('transaction_date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/**
 * Agrupa as compras do cartão por fatura (calculado no cliente a partir do
 * dia de fechamento — não é armazenado no banco para não duplicar a fonte
 * da verdade caso o dia de fechamento do cartão mude).
 */
export function useCardInvoices(card: CreditCard | undefined) {
  const { data: transactions, isLoading } = useCardTransactions(card?.id)

  const invoices = useMemo<Invoice[]>(() => {
    if (!card || !transactions) return []

    const byInvoice = new Map<string, Invoice>()
    const today = new Date().toISOString().slice(0, 10)

    for (const t of transactions) {
      if (t.type !== 'compra_cartao') continue
      const period = getInvoicePeriod(t.transaction_date, card.closing_day, card.due_day)
      const existing = byInvoice.get(period.invoiceId)
      if (existing) {
        existing.items.push(t)
        existing.total += t.amount
      } else {
        byInvoice.set(period.invoiceId, {
          invoiceId: period.invoiceId,
          closingDate: period.closingDate,
          dueDate: period.dueDate,
          items: [t],
          total: t.amount,
          payments: [],
          totalPaid: 0,
          isOpen: period.closingDate >= today,
        })
      }
    }

    // Pagamentos de fatura também precisam ser associados à fatura certa.
    // Convenção: o pagamento é feito com transaction_date igual (ou próxima)
    // à data de vencimento da fatura que está sendo paga.
    for (const t of transactions) {
      if (t.type !== 'pagamento_fatura') continue
      let closest: Invoice | null = null
      let closestDiff = Infinity
      for (const invoice of byInvoice.values()) {
        const diff = Math.abs(new Date(invoice.dueDate).getTime() - new Date(t.transaction_date).getTime())
        if (diff < closestDiff) {
          closestDiff = diff
          closest = invoice
        }
      }
      if (closest) {
        closest.payments.push(t)
        if (t.status === 'pago') closest.totalPaid += t.amount
      }
    }

    return Array.from(byInvoice.values()).sort((a, b) => a.invoiceId.localeCompare(b.invoiceId))
  }, [card, transactions])

  return { invoices, isLoading }
}
