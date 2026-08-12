import { useState } from 'react'
import { PlusCircle, CreditCard as CreditCardIcon, Pencil, Archive, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useCreditCards,
  useCreditCardSummaries,
  useCreateCreditCard,
  useUpdateCreditCard,
  useArchiveCreditCard,
} from '@/hooks/useCreditCards'
import { useCardInvoices } from '@/hooks/useCardInvoices'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CardFormModal } from '@/features/cards/CardFormModal'
import { PayInvoiceModal } from '@/features/cards/PayInvoiceModal'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Invoice } from '@/hooks/useCardInvoices'
import type { Database } from '@/types/database.types'

type CreditCardRow = Database['public']['Tables']['credit_cards']['Row']

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(Math.max(used / limit, 0), 1) : 0
  const tone =
    pct >= 0.9 ? 'bg-(--color-danger-600)' : pct >= 0.7 ? 'bg-(--color-warning-600)' : 'bg-(--color-success-600)'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-surface-alt)">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct * 100}%` }} />
    </div>
  )
}

function InvoiceRow({ invoice, onPay }: { invoice: Invoice; onPay: (invoice: Invoice) => void }) {
  const [expanded, setExpanded] = useState(false)
  const remaining = Math.max(invoice.total - invoice.totalPaid, 0)
  const isPaid = remaining <= 0.005

  return (
    <li className="py-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded((e) => !e)} className="flex flex-1 items-center gap-2 text-left text-sm">
          {expanded ? (
            <ChevronDown className="h-4 w-4 flex-none text-(--color-ink-400)" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-none text-(--color-ink-400)" aria-hidden="true" />
          )}
          <span className="text-(--color-ink-900)">Fatura com vencimento em {formatDate(invoice.dueDate)}</span>
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${
              isPaid
                ? 'bg-(--color-success-100) text-(--color-success-700)'
                : invoice.isOpen
                  ? 'bg-(--color-navy-100) text-(--color-navy-700)'
                  : 'bg-(--color-warning-100) text-(--color-warning-700)'
            }`}
          >
            {isPaid ? 'Paga' : invoice.isOpen ? 'Em aberto' : 'Fechada'}
          </span>
        </button>
        <span className="tabular-nums font-medium text-(--color-ink-900)">{formatCurrency(invoice.total)}</span>
        {!isPaid && (
          <Button size="sm" variant="secondary" onClick={() => onPay(invoice)}>
            Pagar
          </Button>
        )}
      </div>

      {expanded && (
        <ul className="ml-6 mt-2 divide-y divide-(--color-navy-100) border-l border-(--color-navy-100) pl-4">
          {invoice.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-1.5 text-sm text-(--color-ink-600)">
              <span>{item.description}</span>
              <span className="tabular-nums">{formatCurrency(item.amount)}</span>
            </li>
          ))}
          {invoice.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between py-1.5 text-sm text-(--color-success-700)"
            >
              <span>Pagamento em {formatDate(payment.transaction_date)}</span>
              <span className="tabular-nums">-{formatCurrency(payment.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function CardDetail({ card }: { card: CreditCardRow }) {
  const { invoices, isLoading } = useCardInvoices(card)
  const createTransaction = useCreateTransaction()
  const { showToast } = useToast()
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)

  async function handlePay(data: { accountId: string; amount: number; paymentDate: string }) {
    if (!payingInvoice) return
    try {
      await createTransaction.mutateAsync({
        type: 'pagamento_fatura',
        description: `Pagamento fatura ${card.name} — venc. ${formatDate(payingInvoice.dueDate)}`,
        amount: data.amount,
        transaction_date: data.paymentDate,
        competence_date: data.paymentDate,
        paid_date: data.paymentDate,
        account_id: data.accountId,
        card_id: card.id,
        status: 'pago',
      })
      showToast('success', 'Pagamento registrado.')
      setPayingInvoice(null)
    } catch {
      showToast('error', 'Não foi possível registrar o pagamento.')
    }
  }

  if (isLoading) return <Skeleton className="h-24 w-full" />

  const openOrFuture = invoices.filter((i) => i.isOpen || new Date(i.closingDate) >= new Date())
  const past = invoices.filter((i) => !openOrFuture.includes(i))

  return (
    <div className="mt-3 border-t border-(--color-navy-100) pt-3">
      {invoices.length === 0 ? (
        <p className="text-sm text-(--color-ink-400)">Nenhuma compra registrada neste cartão ainda.</p>
      ) : (
        <>
          <ul className="divide-y divide-(--color-navy-100)">
            {openOrFuture.map((invoice) => (
              <InvoiceRow key={invoice.invoiceId} invoice={invoice} onPay={setPayingInvoice} />
            ))}
          </ul>
          {past.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-(--color-ink-400)">
                Faturas anteriores ({past.length})
              </summary>
              <ul className="mt-2 divide-y divide-(--color-navy-100)">
                {past.map((invoice) => (
                  <InvoiceRow key={invoice.invoiceId} invoice={invoice} onPay={setPayingInvoice} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <PayInvoiceModal
        open={!!payingInvoice}
        invoice={payingInvoice}
        defaultAccountId={card.default_payment_account_id}
        onClose={() => setPayingInvoice(null)}
        onSubmit={handlePay}
        isSubmitting={createTransaction.isPending}
      />
    </div>
  )
}

export function CardsPage() {
  const { data: cards, isLoading } = useCreditCards()
  const { data: summaries } = useCreditCardSummaries()
  const createCard = useCreateCreditCard()
  const updateCard = useUpdateCreditCard()
  const archiveCard = useArchiveCreditCard()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCardRow | null>(null)
  const [archivingCard, setArchivingCard] = useState<CreditCardRow | null>(null)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  function summaryFor(cardId: string) {
    return summaries?.find((s) => s.card_id === cardId)
  }

  async function handleSubmit(data: {
    name: string
    institution?: string
    brand?: string
    creditLimit: number
    closingDay: number
    dueDay: number
    defaultPaymentAccountId?: string
  }) {
    try {
      const payload = {
        name: data.name,
        institution: data.institution || null,
        brand: data.brand || null,
        credit_limit: data.creditLimit,
        closing_day: data.closingDay,
        due_day: data.dueDay,
        default_payment_account_id: data.defaultPaymentAccountId || null,
      }
      if (editingCard) {
        await updateCard.mutateAsync({ id: editingCard.id, ...payload })
        showToast('success', 'Cartão atualizado.')
      } else {
        await createCard.mutateAsync(payload)
        showToast('success', 'Cartão criado.')
      }
      setModalOpen(false)
      setEditingCard(null)
    } catch {
      showToast('error', 'Não foi possível salvar o cartão.')
    }
  }

  async function handleArchive() {
    if (!archivingCard) return
    try {
      await archiveCard.mutateAsync(archivingCard.id)
      showToast('success', 'Cartão arquivado.')
    } catch {
      showToast('error', 'Não foi possível arquivar o cartão.')
    } finally {
      setArchivingCard(null)
    }
  }

  const active = (cards ?? []).filter((c) => !c.is_archived)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Cartões</h1>
          <p className="text-sm text-(--color-ink-400)">Limite, faturas e compras parceladas.</p>
        </div>
        <Button
          onClick={() => {
            setEditingCard(null)
            setModalOpen(true)
          }}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Novo cartão
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : active.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          title="Nenhum cartão cadastrado"
          description="Cadastre seus cartões de crédito para acompanhar limite e faturas."
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Cadastrar cartão
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((card) => {
            const summary = summaryFor(card.id)
            return (
              <Card key={card.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-(--color-ink-900)">{card.name}</p>
                      <button
                        onClick={() => {
                          setEditingCard(card)
                          setModalOpen(true)
                        }}
                        aria-label={`Editar ${card.name}`}
                        className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-xs text-(--color-ink-400)">
                      {card.institution ? `${card.institution} · ` : ''}
                      Fecha dia {card.closing_day} · Vence dia {card.due_day}
                    </p>

                    <div className="mt-3 max-w-sm">
                      <div className="mb-1 flex justify-between text-xs text-(--color-ink-600)">
                        <span>{formatCurrency(summary?.used_limit ?? 0)} usado</span>
                        <span>{formatCurrency(card.credit_limit)} limite</span>
                      </div>
                      <UsageBar used={summary?.used_limit ?? 0} limit={card.credit_limit} />
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCardId((id) => (id === card.id ? null : card.id))}
                    className="flex flex-none items-center gap-1 text-sm text-(--color-navy-700) hover:underline"
                  >
                    {expandedCardId === card.id ? 'Ocultar faturas' : 'Ver faturas'}
                  </button>
                </div>

                {expandedCardId === card.id && <CardDetail card={card} />}

                <button
                  onClick={() => setArchivingCard(card)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-(--color-ink-400) hover:text-(--color-danger-600)"
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                  Arquivar cartão
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <CardFormModal
        open={modalOpen}
        card={editingCard}
        onClose={() => {
          setModalOpen(false)
          setEditingCard(null)
        }}
        onSubmit={handleSubmit}
        isSubmitting={createCard.isPending || updateCard.isPending}
      />

      <ConfirmDialog
        open={!!archivingCard}
        title="Arquivar cartão?"
        description={`"${archivingCard?.name}" deixará de aparecer nas listagens ativas. O histórico de compras e faturas será preservado.`}
        confirmLabel="Arquivar"
        isDangerous={false}
        isLoading={archiveCard.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchivingCard(null)}
      />
    </div>
  )
}
