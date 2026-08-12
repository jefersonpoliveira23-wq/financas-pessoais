import { useEffect, useState } from 'react'
import { PlusCircle, Repeat, Pause, Play, Square } from 'lucide-react'
import {
  useRecurrenceRules,
  useCreateRecurrenceRule,
  useSetRecurrenceStatus,
  useMaterializeActiveRecurrences,
} from '@/hooks/useRecurrences'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  RecurrenceFormModal,
  FREQUENCY_OPTIONS,
  type RecurrenceFormValues,
} from '@/features/recurrences/RecurrenceFormModal'
import { formatCurrency, formatDate } from '@/utils/format'

const STATUS_LABEL: Record<string, string> = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }
const STATUS_TONE: Record<string, string> = {
  ativa: 'bg-(--color-success-100) text-(--color-success-700)',
  pausada: 'bg-(--color-warning-100) text-(--color-warning-700)',
  encerrada: 'bg-(--color-navy-100) text-(--color-navy-700)',
}

export function RecurrencesSection() {
  const { data: rules, isLoading } = useRecurrenceRules()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCreditCards()
  const createRule = useCreateRecurrenceRule()
  const setStatus = useSetRecurrenceStatus()
  const materialize = useMaterializeActiveRecurrences()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)

  // Garante que, ao abrir a tela, todas as recorrências ativas já têm suas
  // próximas ocorrências (até 3 meses) geradas — materialização sob demanda.
  useEffect(() => {
    if (rules && rules.length > 0) {
      materialize.mutate(rules)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules?.length])

  function accountOrCardLabel(rule: { account_id: string | null; card_id: string | null }) {
    if (rule.account_id) return accounts?.find((a) => a.id === rule.account_id)?.name ?? '—'
    if (rule.card_id) return `Cartão: ${cards?.find((c) => c.id === rule.card_id)?.name ?? '—'}`
    return '—'
  }

  async function handleSubmit(data: RecurrenceFormValues) {
    try {
      await createRule.mutateAsync({
        description: data.description,
        type: data.type,
        amount: data.amount,
        account_id: data.useCard ? null : data.accountId || null,
        card_id: data.useCard ? data.cardId || null : null,
        category_id: data.categoryId || null,
        frequency: data.frequency,
        custom_interval_days: data.frequency === 'personalizado' ? data.customIntervalDays : null,
        start_date: data.startDate,
        end_date: data.endMode === 'data_final' ? data.endDate : null,
        occurrences_count: data.endMode === 'numero_ocorrencias' ? data.occurrencesCount : null,
        is_indefinite: data.endMode === 'indefinida',
      })
      showToast('success', 'Recorrência criada e próximas ocorrências geradas.')
      setModalOpen(false)
    } catch {
      showToast('error', 'Não foi possível criar a recorrência.')
    }
  }

  async function handleStatusChange(id: string, status: 'ativa' | 'pausada' | 'encerrada') {
    try {
      await setStatus.mutateAsync({ id, status })
      showToast(
        'success',
        status === 'pausada'
          ? 'Recorrência pausada.'
          : status === 'ativa'
            ? 'Recorrência retomada.'
            : 'Recorrência encerrada.',
      )
    } catch {
      showToast('error', 'Não foi possível atualizar a recorrência.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--color-ink-400)">
          Movimentações que se repetem automaticamente (aluguel, assinaturas, salário...).
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Nova recorrência
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (rules?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrência cadastrada"
          description="Cadastre despesas ou receitas que se repetem, como aluguel ou salário."
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Nova recorrência
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rules?.map((rule) => (
            <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-(--color-ink-900)">{rule.description}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_TONE[rule.status]}`}>
                    {STATUS_LABEL[rule.status]}
                  </span>
                </div>
                <p className="text-xs text-(--color-ink-400)">
                  {FREQUENCY_OPTIONS.find((f) => f.value === rule.frequency)?.label} · {accountOrCardLabel(rule)} ·
                  desde {formatDate(rule.start_date)}
                  {rule.end_date && <> · até {formatDate(rule.end_date)}</>}
                  {rule.occurrences_count && <> · {rule.occurrences_count}x</>}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`tabular-nums font-medium ${rule.type === 'receita' ? 'text-(--color-success-700)' : 'text-(--color-danger-600)'}`}
                >
                  {rule.type === 'receita' ? '+' : '-'}
                  {formatCurrency(rule.amount)}
                </span>
                {rule.status === 'ativa' && (
                  <button
                    onClick={() => handleStatusChange(rule.id, 'pausada')}
                    title="Pausar"
                    className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-warning-100) hover:text-(--color-warning-700)"
                  >
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                {rule.status === 'pausada' && (
                  <button
                    onClick={() => handleStatusChange(rule.id, 'ativa')}
                    title="Retomar"
                    className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-success-100) hover:text-(--color-success-700)"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                {rule.status !== 'encerrada' && (
                  <button
                    onClick={() => handleStatusChange(rule.id, 'encerrada')}
                    title="Encerrar"
                    className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-danger-100) hover:text-(--color-danger-600)"
                  >
                    <Square className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <RecurrenceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={createRule.isPending}
      />
    </div>
  )
}
