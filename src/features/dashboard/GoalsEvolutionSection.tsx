import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import { useGoalContributionSums, useGoals } from '@/hooks/useGoals'
import { useAccountBalances } from '@/hooks/useAccounts'
import { goalProgress, monthlyContributionNeeded } from '@/utils/goals'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/utils/format'

/** Evolução das metas: progresso atual + ritmo mensal necessário para bater a data-alvo. */
export function GoalsEvolutionSection() {
  const { data: goals, isLoading: loadingGoals } = useGoals()
  const { data: contributionSums } = useGoalContributionSums()
  const { data: balances } = useAccountBalances()

  const isLoading = loadingGoals

  const activeGoals = useMemo(() => (goals ?? []).filter((g) => g.status === 'ativa'), [goals])

  const rows = useMemo(
    () =>
      activeGoals.map((goal) => {
        const sum = contributionSums?.get(goal.id) ?? 0
        const linkedBalance = goal.linked_account_id
          ? (balances?.find((b) => b.account_id === goal.linked_account_id)?.current_balance ?? 0)
          : null
        const progress = goalProgress(goal, sum, linkedBalance)
        const monthlyNeeded = monthlyContributionNeeded(goal.target_amount, progress.current, goal.target_date)
        return { goal, progress, monthlyNeeded }
      }),
    [activeGoals, contributionSums, balances],
  )

  return (
    <Card>
      <CardHeader
        title="Evolução das metas"
        subtitle="Progresso atual e ritmo mensal necessário para bater a data planejada"
        action={
          <Link to="/metas" className="text-sm text-(--color-navy-700) hover:underline">
            Ver metas
          </Link>
        }
      />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta ativa"
          description="Crie uma meta para acompanhar sua evolução aqui."
        />
      ) : (
        <ul className="mt-2 flex flex-col gap-4">
          {rows.map(({ goal, progress, monthlyNeeded }) => (
            <li key={goal.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-(--color-ink-900)">{goal.name}</span>
                <span className="tabular-nums text-(--color-ink-600)">
                  {formatCurrency(progress.current)} de {formatCurrency(goal.target_amount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-navy-50)">
                <div
                  className={`h-full rounded-full ${progress.completed ? 'bg-(--color-success-600)' : 'bg-(--color-navy-600)'}`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-(--color-ink-400)">
                {progress.completed
                  ? 'Meta concluída.'
                  : monthlyNeeded !== null
                    ? `Faltam ${formatCurrency(monthlyNeeded)}/mês para bater a meta até ${formatDate(goal.target_date)}.`
                    : goal.target_date
                      ? 'Data-alvo já passou — reveja o prazo desta meta.'
                      : 'Sem data-alvo definida.'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
