import { useMemo, useState } from 'react'
import { Archive, HandCoins, Pencil, Plus, ShieldCheck, Target } from 'lucide-react'
import {
  useAddGoalContribution,
  useCreateGoal,
  useGoalContributionSums,
  useGoals,
  useUpdateGoal,
} from '@/hooks/useGoals'
import { useAccountBalances } from '@/hooks/useAccounts'
import { GoalFormModal, type GoalFormData } from '@/features/goals/GoalFormModal'
import { goalProgress, monthlyContributionNeeded } from '@/utils/goals'
import { formatCurrency, formatDate } from '@/utils/format'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { Database } from '@/types/database.types'

type Goal = Database['public']['Tables']['goals']['Row']

export function GoalsPage() {
  const { data: goals, isLoading } = useGoals()
  const { data: contributionSums } = useGoalContributionSums()
  const { data: balances } = useAccountBalances()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const addContribution = useAddGoalContribution()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contributingTo, setContributingTo] = useState<Goal | null>(null)
  const [contribution, setContribution] = useState('')
  const [archiving, setArchiving] = useState<Goal | null>(null)

  const visibleGoals = useMemo(() => (goals ?? []).filter((g) => g.status !== 'arquivada'), [goals])

  function progressFor(goal: Goal) {
    const sum = contributionSums?.get(goal.id) ?? 0
    const linkedBalance = goal.linked_account_id
      ? (balances?.find((b) => b.account_id === goal.linked_account_id)?.current_balance ?? 0)
      : null
    return goalProgress(goal, sum, linkedBalance)
  }

  async function handleSubmit(data: GoalFormData) {
    const payload = {
      name: data.name.trim(),
      description: data.description.trim() || null,
      mode: data.mode,
      target_amount: data.targetAmount,
      target_date: data.targetDate || null,
      linked_account_id: data.mode === 'alocado' ? data.linkedAccountId : null,
      is_emergency_fund: data.isEmergencyFund,
    }
    try {
      if (editing) {
        await updateGoal.mutateAsync({ id: editing.id, ...payload })
        showToast('success', 'Meta atualizada.')
      } else {
        await createGoal.mutateAsync(payload)
        showToast('success', 'Meta criada.')
      }
      setModalOpen(false)
      setEditing(null)
    } catch {
      showToast('error', 'Não foi possível salvar a meta.')
    }
  }

  async function handleContribute() {
    const value = Number(contribution.replace(',', '.'))
    if (!Number.isFinite(value) || value === 0) {
      showToast('error', 'Informe um valor diferente de zero (negativo = resgate).')
      return
    }
    const current = progressFor(contributingTo!).current
    if (value < 0 && current + value < 0) {
      showToast('error', 'O resgate não pode deixar a meta com valor negativo.')
      return
    }
    try {
      await addContribution.mutateAsync({
        goalId: contributingTo!.id,
        contributionDate: new Date().toISOString().slice(0, 10),
        amount: value,
      })
      showToast('success', value > 0 ? 'Aporte registrado.' : 'Resgate registrado.')
      setContributingTo(null)
      setContribution('')
    } catch {
      showToast('error', 'Não foi possível registrar.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Metas</h1>
          <p className="text-sm text-(--color-ink-600)">
            Reserve dinheiro para objetivos — de forma independente (aportes manuais) ou acompanhando o saldo de uma
            conta.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Nova meta
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : visibleGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta ativa"
          description="Crie sua primeira meta — que tal começar pela reserva de emergência?"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleGoals.map((goal) => {
            const p = progressFor(goal)
            const needed = monthlyContributionNeeded(goal.target_amount, p.current, goal.target_date)
            return (
              <Card key={goal.id} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 font-medium text-(--color-ink-900)">
                      {goal.is_emergency_fund && (
                        <ShieldCheck className="h-4 w-4 text-(--color-navy-600)" aria-hidden="true" />
                      )}
                      {goal.name}
                    </p>
                    <p className="text-xs text-(--color-ink-600)">
                      {goal.mode === 'alocado' ? 'Acompanha saldo de conta' : 'Aportes manuais'}
                      {goal.target_date ? ` · alvo até ${formatDate(goal.target_date)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {goal.mode === 'independente' && !p.completed && (
                      <Button variant="secondary" size="sm" onClick={() => setContributingTo(goal)}>
                        <HandCoins className="mr-1 h-4 w-4" aria-hidden="true" /> Aporte
                      </Button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(goal)
                        setModalOpen(true)
                      }}
                      aria-label={`Editar ${goal.name}`}
                      className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setArchiving(goal)}
                      aria-label={`Arquivar ${goal.name}`}
                      className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-(--color-ink-600)">
                    <strong className="text-(--color-ink-900)">{formatCurrency(p.current)}</strong> de{' '}
                    {formatCurrency(goal.target_amount)}
                  </span>
                  <span className="text-xs font-medium text-(--color-ink-600)">{p.percent.toFixed(0)}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-(--color-navy-50)"
                  role="progressbar"
                  aria-valuenow={Math.round(p.percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full ${p.completed ? 'bg-(--color-success-600)' : 'bg-(--color-navy-600)'}`}
                    style={{ width: `${p.percent}%` }}
                  />
                </div>

                {p.completed ? (
                  <p className="mt-2 text-xs font-medium text-(--color-success-700)">Meta atingida! 🎉</p>
                ) : needed !== null && needed > 0 ? (
                  <p className="mt-2 text-xs text-(--color-ink-600)">
                    Para chegar lá até a data-alvo: aporte {formatCurrency(needed)}/mês.
                  </p>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      <GoalFormModal
        open={modalOpen}
        goal={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        isSubmitting={createGoal.isPending || updateGoal.isPending}
      />

      {contributingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-1 font-display text-lg font-semibold text-(--color-ink-900)">Registrar aporte</h2>
            <p className="mb-4 text-sm text-(--color-ink-600)">
              {contributingTo.name} — valor negativo registra um resgate.
            </p>
            <Input
              label="Valor (R$)"
              inputMode="decimal"
              placeholder="0,00"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setContributingTo(null)
                  setContribution('')
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleContribute} isLoading={addContribution.isPending}>
                Registrar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!archiving}
        title="Arquivar meta"
        description={`"${archiving?.name}" sairá da lista, mas o histórico de aportes é preservado.`}
        confirmLabel="Arquivar"
        isLoading={updateGoal.isPending}
        onCancel={() => setArchiving(null)}
        onConfirm={async () => {
          try {
            await updateGoal.mutateAsync({ id: archiving!.id, status: 'arquivada' })
            showToast('success', 'Meta arquivada.')
          } catch {
            showToast('error', 'Não foi possível arquivar.')
          } finally {
            setArchiving(null)
          }
        }}
      />
    </div>
  )
}
