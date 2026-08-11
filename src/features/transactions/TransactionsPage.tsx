import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PlusCircle, ArrowLeftRight, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useMarkTransactionPaid,
  type TransactionFilters,
} from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal'
import { TRANSACTION_TYPES, TRANSACTION_STATUSES, type TransactionFormData } from '@/schemas/transaction.schema'
import { formatCurrency, formatDate, toISODateOnly } from '@/utils/format'
import { effectiveStatus } from '@/utils/transactionStatus'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export function TransactionsPage() {
  const location = useLocation()
  const [filters, setFilters] = useState<TransactionFilters>({})
  const { data: transactions, isLoading } = useTransactions(filters)
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()
  const markPaid = useMarkTransactionPaid()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(() =>
    Boolean((location.state as { openCreate?: boolean } | null)?.openCreate),
  )
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const accountName = useMemo(() => {
    const map = new Map((accounts ?? []).map((a) => [a.id, a.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [accounts])

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '—')
  }, [categories])

  async function handleSubmit(data: TransactionFormData) {
    const payload = {
      type: data.type as Transaction['type'],
      description: data.description,
      amount: data.amount,
      transaction_date: data.transactionDate,
      competence_date: data.competenceDate,
      due_date: data.dueDate || null,
      paid_date: data.paidDate || null,
      account_id: data.accountId,
      destination_account_id: data.type === 'transferencia' ? data.destinationAccountId || null : null,
      category_id: data.categoryId || null,
      subcategory_id: data.subcategoryId || null,
      payment_method_id: data.paymentMethodId || null,
      status: data.status as Transaction['status'],
      fixed_variable: (data.fixedVariable as Transaction['fixed_variable']) ?? null,
      is_essential: data.isEssential ?? null,
      notes: data.notes || null,
    }

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
          <p className="text-sm text-(--color-ink-400)">Receitas, despesas e transferências.</p>
        </div>
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
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <Select
          label="Tipo"
          value={filters.type ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}
          className="w-40"
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
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-(--color-navy-100) text-left text-xs text-(--color-ink-400)">
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Conta</th>
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
                return (
                  <tr key={t.id} className="hover:bg-(--color-surface-alt)/50">
                    <td className="px-4 py-3 text-(--color-ink-900)">{t.description}</td>
                    <td className="px-4 py-3 text-(--color-ink-600)">{formatDate(t.transaction_date)}</td>
                    <td className="px-4 py-3 text-(--color-ink-600)">{accountName(t.account_id)}</td>
                    <td className="px-4 py-3 text-(--color-ink-600)">{categoryName(t.category_id)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        t.type === 'despesa' ? 'text-(--color-danger-600)' : 'text-(--color-success-700)'
                      }`}
                    >
                      {t.type === 'despesa' ? '-' : t.type === 'receita' ? '+' : ''}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canMarkPaid && t.type !== 'transferencia' && (
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

      <ConfirmDialog
        open={!!deleting}
        title="Excluir movimentação?"
        description={`Tem certeza que deseja excluir "${deleting?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isLoading={deleteTransaction.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
