import { useMemo, useState } from 'react'
import { CheckCircle2, HandCoins, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCreateDebt, useDebts, useDeleteDebt, useRegisterDebtPayment, useUpdateDebt } from '@/hooks/useDebts'
import { DebtFormModal, type DebtFormData } from '@/features/debts/DebtFormModal'
import { DebtPaymentModal } from '@/features/debts/DebtPaymentModal'
import { PayoffSimulator } from '@/features/debts/PayoffSimulator'
import { formatCurrency, formatPercent } from '@/utils/format'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { Database } from '@/types/database.types'

type Debt = Database['public']['Tables']['debts']['Row']

export function DebtsPage() {
  const { data: debts, isLoading } = useDebts()
  const createDebt = useCreateDebt()
  const updateDebt = useUpdateDebt()
  const deleteDebt = useDeleteDebt()
  const registerPayment = useRegisterDebtPayment()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [paying, setPaying] = useState<Debt | null>(null)
  const [deleting, setDeleting] = useState<Debt | null>(null)

  const activeDebts = useMemo(() => (debts ?? []).filter((d) => d.status === 'ativa'), [debts])
  const settledDebts = useMemo(() => (debts ?? []).filter((d) => d.status !== 'ativa'), [debts])
  const totalOutstanding = activeDebts.reduce((s, d) => s + d.outstanding_balance, 0)

  async function handleSubmit(data: DebtFormData) {
    const payload = {
      name: data.name.trim(),
      creditor: data.creditor.trim() || null,
      original_amount: data.originalAmount,
      outstanding_balance: data.outstandingBalance,
      monthly_interest_rate: data.monthlyInterestRate,
      minimum_payment: data.minimumPayment,
      due_day: data.dueDay,
      notes: data.notes.trim() || null,
    }
    try {
      if (editing) {
        await updateDebt.mutateAsync({ id: editing.id, ...payload })
        showToast('success', 'Dívida atualizada.')
      } else {
        await createDebt.mutateAsync(payload)
        showToast('success', 'Dívida cadastrada.')
      }
      setModalOpen(false)
      setEditing(null)
    } catch {
      showToast('error', 'Não foi possível salvar a dívida.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Dívidas</h1>
          <p className="text-sm text-(--color-ink-600)">
            Acompanhe o saldo devedor, registre pagamentos e simule a quitação antecipada.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Nova dívida
        </Button>
      </div>

      {activeDebts.length > 0 && (
        <Card className="p-4">
          <p className="text-sm text-(--color-ink-600)">
            Saldo devedor total ({activeDebts.length} dívida(s) ativa(s))
          </p>
          <p className="font-display text-2xl font-semibold text-(--color-danger-600)">
            {formatCurrency(totalOutstanding)}
          </p>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : !debts || debts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma dívida cadastrada"
          description="Cadastre suas dívidas para acompanhar o saldo devedor e planejar a quitação com o simulador."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {activeDebts.map((debt) => {
              const paidPercent =
                debt.original_amount > 0
                  ? Math.max(0, Math.min(100, (1 - debt.outstanding_balance / debt.original_amount) * 100))
                  : 0
              return (
                <Card key={debt.id} className="p-4">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-(--color-ink-900)">{debt.name}</p>
                      <p className="text-xs text-(--color-ink-600)">
                        {debt.creditor ? `${debt.creditor} · ` : ''}
                        {debt.monthly_interest_rate > 0
                          ? `${formatPercent(debt.monthly_interest_rate, { alreadyPercent: true })} a.m.`
                          : 'sem juros'}
                        {debt.due_day ? ` · vence dia ${debt.due_day}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="secondary" size="sm" onClick={() => setPaying(debt)}>
                        <HandCoins className="mr-1 h-4 w-4" aria-hidden="true" /> Registrar pagamento
                      </Button>
                      <button
                        onClick={() => {
                          setEditing(debt)
                          setModalOpen(true)
                        }}
                        aria-label={`Editar ${debt.name}`}
                        className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleting(debt)}
                        aria-label={`Excluir ${debt.name}`}
                        className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-(--color-ink-600)">
                      Devendo{' '}
                      <strong className="text-(--color-ink-900)">{formatCurrency(debt.outstanding_balance)}</strong> de{' '}
                      {formatCurrency(debt.original_amount)}
                    </span>
                    <span className="text-xs text-(--color-ink-600)">{paidPercent.toFixed(0)}% pago</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-(--color-navy-50)"
                    role="progressbar"
                    aria-valuenow={Math.round(paidPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full bg-(--color-success-600)" style={{ width: `${paidPercent}%` }} />
                  </div>
                </Card>
              )
            })}
          </div>

          <PayoffSimulator debts={debts} />

          {settledDebts.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold text-(--color-ink-900)">Quitadas</h2>
              <div className="flex flex-col gap-2">
                {settledDebts.map((debt) => (
                  <Card key={debt.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-(--color-success-600)" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-(--color-ink-900)">{debt.name}</p>
                        <p className="text-xs text-(--color-ink-600)">
                          {formatCurrency(debt.original_amount)} — quitada
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleting(debt)}
                      aria-label={`Excluir ${debt.name}`}
                      className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <DebtFormModal
        open={modalOpen}
        debt={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        isSubmitting={createDebt.isPending || updateDebt.isPending}
      />

      <DebtPaymentModal
        open={!!paying}
        debt={paying}
        onClose={() => setPaying(null)}
        onSubmit={async ({ paymentDate, amount }) => {
          try {
            await registerPayment.mutateAsync({ debtId: paying!.id, paymentDate, amount })
            showToast('success', 'Pagamento registrado e saldo devedor atualizado.')
            setPaying(null)
          } catch {
            showToast('error', 'Não foi possível registrar o pagamento.')
          }
        }}
        isSubmitting={registerPayment.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Excluir dívida"
        description={`"${deleting?.name}" e todo o histórico de pagamentos serão excluídos. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isLoading={deleteDebt.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await deleteDebt.mutateAsync(deleting!.id)
            showToast('success', 'Dívida excluída.')
          } catch {
            showToast('error', 'Não foi possível excluir.')
          } finally {
            setDeleting(null)
          }
        }}
      />
    </div>
  )
}
