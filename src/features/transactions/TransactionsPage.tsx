import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PlusCircle, ArrowLeftRight, Pencil, Trash2, CheckCircle2, Repeat, Calendar } from 'lucide-react'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useMarkTransactionPaid,
  type TransactionFilters,
} from '@/hooks/useTransactions'
import {
  useCreateInstallmentGroup,
  useDeleteInstallmentScope,
  type InstallmentEditScope,
} from '@/hooks/useInstallments'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InstallmentScopeDialog } from '@/components/ui/InstallmentScopeDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal'
import { InstallmentPreviewModal } from '@/features/transactions/InstallmentPreviewModal'
import { RecurrencesSection } from '@/features/recurrences/RecurrencesSection'
import { TRANSACTION_TYPES, TRANSACTION_STATUSES, type TransactionFormData } from '@/schemas/transaction.schema'
import { generateInstallmentPreview, type InstallmentPreviewItem } from '@/utils/installments'
import { formatCurrency, formatDate, toISODateOnly } from '@/utils/format'
import { effectiveStatus } from '@/utils/transactionStatus'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export function TransactionsPage() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'movimentacoes' | 'recorrencias'>('movimentacoes')
  const [filters, setFilters] = useState<TransactionFilters>({})
  const { data: transactions, isLoading } = useTransactions(filters)
  const { data: accounts } = useAccounts()
  const { data: cards } = useCreditCards()
  const { data: categories } = useCategories()

  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()
  const markPaid = useMarkTransactionPaid()
  const createInstallmentGroup = useCreateInstallmentGroup()
  const deleteInstallmentScope = useDeleteInstallmentScope()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(() =>
    Boolean((location.state as { openCreate?: boolean } | null)?.openCreate),
  )
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [installmentPreview, setInstallmentPreview] = useState<{
    description: string
    totalAmount: number
    items: InstallmentPreviewItem[]
    base: TransactionFormData
  } | null>(null)

  const accountOrCardName = useMemo(() => {
    const accountMap = new Map((accounts ?? []).map((a) => [a.id, a.name]))
    const cardMap = new Map((cards ?? []).map((c) => [c.id, c.name]))
    return (t: Transaction) => {
      if (t.account_id) return accountMap.get(t.account_id) ?? '—'
      if (t.card_id) return `Cartão: ${cardMap.get(t.card_id) ?? '—'}`
      return '—'
    }
  }, [accounts, cards])

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '—')
  }, [categories])

  function buildPayload(data: TransactionFormData) {
    return {
      type: data.type as Transaction['type'],
      description: data.description,
      amount: data.amount,
      transaction_date: data.transactionDate,
      competence_date: data.competenceDate,
      due_date: data.dueDate || null,
      paid_date: data.paidDate || null,
      account_id: data.type === 'compra_cartao' ? null : data.accountId || null,
      card_id: data.type === 'compra_cartao' ? data.cardId || null : null,
      destination_account_id: data.type === 'transferencia' ? data.destinationAccountId || null : null,
      category_id: data.categoryId || null,
      subcategory_id: data.subcategoryId || null,
      payment_method_id: data.paymentMethodId || null,
      status: data.status as Transaction['status'],
      fixed_variable: (data.fixedVariable as Transaction['fixed_variable']) ?? null,
      is_essential: data.isEssential ?? null,
      notes: data.notes || null,
    }
  }

  async function handleSubmit(data: TransactionFormData) {
    const total = data.installmentTotal ?? 1

    // Parcelamento: mostra a prévia antes de gerar tudo (nunca cria direto).
    if (!editing && total > 1 && (data.type === 'despesa' || data.type === 'compra_cartao')) {
      const items = generateInstallmentPreview(data.transactionDate, total, data.amount)
      setInstallmentPreview({ description: data.description, totalAmount: data.amount, items, base: data })
      setModalOpen(false)
      return
    }

    const payload = buildPayload(data)
    try {
      if (editing) {
        await updateTransaction.mutateAsync({ id: editing.id, ...payload })
        showToast('success', 'Movimentação atualizada.')
      } else {
        await createTransaction.mutateAsync(payload)
        showToast('success', 'Movimentação criada.')
      }
      setModalOpen(false)
      setEditing(null)
    } catch {
      showToast('error', 'Não foi possível salvar a movimentação.')
    }
  }

  async function handleConfirmInstallments(items: InstallmentPreviewItem[]) {
    if (!installmentPreview) return
    const { base } = installmentPreview
    try {
      await createInstallmentGroup.mutateAsync({
        description: base.description,
        accountId: base.type === 'compra_cartao' ? null : base.accountId || null,
        cardId: base.type === 'compra_cartao' ? base.cardId || null : null,
        categoryId: base.categoryId || null,
        subcategoryId: base.subcategoryId || null,
        paymentMethodId: base.paymentMethodId || null,
        fixedVariable: (base.fixedVariable as Transaction['fixed_variable']) ?? null,
        isEssential: base.isEssential ?? null,
        installments: items,
        firstInstallmentStatus: base.status,
      })
      showToast('success', `${items.length} parcelas cadastradas.`)
      setInstallmentPreview(null)
    } catch {
      showToast('error', 'Não foi possível cadastrar as parcelas.')
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteTransaction.mutateAsync(deleting.id)
      showToast('success', 'Movimentação excluída.')
    } catch {
      showToast('error', 'Não foi possível excluir a movimentação.')
    } finally {
      setDeleting(null)
    }
  }

  async function handleDeleteInstallmentScope(scope: InstallmentEditScope) {
    if (!deleting || !deleting.installment_group_id || !deleting.installment_number) return
    try {
      await deleteInstallmentScope.mutateAsync({
        transactionId: deleting.id,
        groupId: deleting.installment_group_id,
        installmentNumber: deleting.installment_number,
        scope,
      })
      showToast('success', 'Parcela(s) excluída(s).')
    } catch {
      showToast('error', 'Não foi possível excluir.')
    } finally {
      setDeleting(null)
    }
  }

  async function handleMarkPaid(transaction: Transaction) {
    const status = transaction.type === 'receita' ? 'recebido' : 'pago'
    try {
      await markPaid.mutateAsync({ id: transaction.id, status, paidDate: toISODateOnly(new Date()) })
      showToast('success', status === 'pago' ? 'Marcado como pago.' : 'Marcado como recebido.')
    } catch {
      showToast('error', 'Não foi possível atualizar o status.')
    }
  }

  const hasNoAccounts = (accounts ?? []).length === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Movimentações</h1>
          <p className="text-sm text-(--color-ink-400)">Receitas, despesas, transferências e compras no cartão.</p>
        </div>
        {activeTab === 'movimentacoes' && (
          <Button
            disabled={hasNoAccounts}
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Nova movimentação
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-(--color-navy-100)">
        <button
          onClick={() => setActiveTab('movimentacoes')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'movimentacoes'
              ? 'border-(--color-navy-900) text-(--color-navy-900)'
              : 'border-transparent text-(--color-ink-400) hover:text-(--color-ink-900)'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          Movimentações
        </button>
        <button
          onClick={() => setActiveTab('recorrencias')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'recorrencias'
              ? 'border-(--color-navy-900) text-(--color-navy-900)'
              : 'border-transparent text-(--color-ink-400) hover:text-(--color-ink-900)'
          }`}
        >
          <Repeat className="h-4 w-4" aria-hidden="true" />
          Recorrências
        </button>
      </div>

      {activeTab === 'recorrencias' ? (
        <RecurrencesSection />
      ) : (
        <>
          <Card className="flex flex-wrap items-end gap-3">
            <Select
              label="Tipo"
              value={filters.type ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}
              className="w-44"
            >
              <option value="">Todos</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
              className="w-40"
            >
              <option value="">Todos</option>
              {TRANSACTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>

            <Select
              label="Conta"
              value={filters.accountId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value || undefined }))}
              className="w-44"
            >
              <option value="">Todas</option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="filterFrom" className="text-sm font-medium text-(--color-ink-900)">
                Data início
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-ink-400)"
                  aria-hidden="true"
                />
                <input
                  id="filterFrom"
                  type="date"
                  value={filters.from ?? ''}
                  max={filters.to ?? undefined}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
                  className="h-10 w-40 rounded-lg border border-(--color-navy-100) bg-white pl-9 pr-3 text-sm text-(--color-ink-900)
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-navy-500)"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="filterTo" className="text-sm font-medium text-(--color-ink-900)">
                Data fim
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-ink-400)"
                  aria-hidden="true"
                />
                <input
                  id="filterTo"
                  type="date"
                  value={filters.to ?? ''}
                  min={filters.from ?? undefined}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
                  className="h-10 w-40 rounded-lg border border-(--color-navy-100) bg-white pl-9 pr-3 text-sm text-(--color-ink-900)
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-navy-500)"
                />
              </div>
            </div>

            {Object.keys(filters).length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                Limpar filtros
              </Button>
            )}
          </Card>

          {hasNoAccounts ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Cadastre uma conta primeiro"
              description="Você precisa de pelo menos uma conta para registrar movimentações."
            />
          ) : isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (transactions ?? []).length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Nenhuma movimentação encontrada"
              description="Ajuste os filtros ou cadastre uma nova movimentação."
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-(--color-navy-100) text-left text-xs text-(--color-ink-400)">
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Conta / Cartão</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Valor</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-navy-100)">
                  {(transactions ?? []).map((t) => {
                    const status = effectiveStatus(t)
                    const canMarkPaid = status === 'pendente' || status === 'previsto' || status === 'atrasado'
                    const isTransferOrCardPurchase = t.type === 'transferencia' || t.type === 'compra_cartao'
                    return (
                      <tr key={t.id} className="hover:bg-(--color-surface-alt)/50">
                        <td className="px-4 py-3 text-(--color-ink-900)">
                          {t.description}
                          {t.installment_group_id && (
                            <span className="ml-1.5 text-xs text-(--color-ink-400)">
                              {t.installment_number}/{t.installment_total}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-(--color-ink-600)">{formatDate(t.transaction_date)}</td>
                        <td className="px-4 py-3 text-(--color-ink-600)">{accountOrCardName(t)}</td>
                        <td className="px-4 py-3 text-(--color-ink-600)">{categoryName(t.category_id)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums font-medium ${
                            t.type === 'despesa' || t.type === 'compra_cartao' || t.type === 'pagamento_fatura'
                              ? 'text-(--color-danger-600)'
                              : t.type === 'receita'
                                ? 'text-(--color-success-700)'
                                : 'text-(--color-ink-900)'
                          }`}
                        >
                          {t.type === 'despesa' || t.type === 'compra_cartao' ? '-' : t.type === 'receita' ? '+' : ''}
                          {formatCurrency(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canMarkPaid && !isTransferOrCardPurchase && (
                              <button
                                onClick={() => handleMarkPaid(t)}
                                aria-label="Marcar como pago/recebido"
                                title="Marcar como pago/recebido"
                                className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-success-100) hover:text-(--color-success-700)"
                              >
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditing(t)
                                setModalOpen(true)
                              }}
                              aria-label="Editar"
                              title="Editar"
                              className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => setDeleting(t)}
                              aria-label="Excluir"
                              title="Excluir"
                              className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-danger-100) hover:text-(--color-danger-600)"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      <TransactionFormModal
        open={modalOpen}
        transaction={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        isSubmitting={createTransaction.isPending || updateTransaction.isPending}
      />

      {installmentPreview && (
        <InstallmentPreviewModal
          open={!!installmentPreview}
          description={installmentPreview.description}
          totalAmount={installmentPreview.totalAmount}
          items={installmentPreview.items}
          onClose={() => setInstallmentPreview(null)}
          onConfirm={handleConfirmInstallments}
          isSubmitting={createInstallmentGroup.isPending}
        />
      )}

      {deleting?.installment_group_id && deleting.installment_number && deleting.installment_total ? (
        <InstallmentScopeDialog
          open={!!deleting}
          title="Excluir parcela"
          installmentNumber={deleting.installment_number}
          totalInstallments={deleting.installment_total}
          isLoading={deleteInstallmentScope.isPending}
          onConfirm={handleDeleteInstallmentScope}
          onCancel={() => setDeleting(null)}
        />
      ) : (
        <ConfirmDialog
          open={!!deleting}
          title="Excluir movimentação?"
          description={`Tem certeza que deseja excluir "${deleting?.description}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          isLoading={deleteTransaction.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
