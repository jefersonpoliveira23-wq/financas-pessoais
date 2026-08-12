import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, Save } from 'lucide-react'
import { useMonthlyPlan, useUpsertMonthlyPlan } from '@/hooks/useMonthlyPlans'
import { useBudgetProgress } from '@/hooks/useBudgets'
import { useDebts } from '@/hooks/useDebts'
import { useGoals } from '@/hooks/useGoals'
import { shiftMonth, toMonthStart } from '@/utils/budget'
import { formatCurrency, formatMonthYear } from '@/utils/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

/**
 * Planejamento mensal: renda prevista − orçamento − mínimos das dívidas −
 * poupança planejada = sobra livre. Uma visão de "onde cada real vai" antes
 * do mês acontecer.
 */
export function PlanningPage() {
  const [month, setMonth] = useState(() => toMonthStart(new Date()))
  const { data: plan } = useMonthlyPlan(month)
  const { data: budgets } = useBudgetProgress(month)
  const { data: debts } = useDebts()
  const { data: goals } = useGoals()
  const upsertPlan = useUpsertMonthlyPlan()
  const { showToast } = useToast()

  const [income, setIncome] = useState<string | null>(null)
  const [savings, setSavings] = useState<string | null>(null)
  const [notes, setNotes] = useState<string | null>(null)

  const incomeValue = income !== null ? Number(income.replace(',', '.')) || 0 : (plan?.expected_income ?? 0)
  const savingsValue = savings !== null ? Number(savings.replace(',', '.')) || 0 : (plan?.planned_savings ?? 0)
  const notesValue = notes !== null ? notes : (plan?.notes ?? '')

  const totalBudgeted = useMemo(() => (budgets ?? []).reduce((s, b) => s + b.budgeted, 0), [budgets])
  const totalDebtMinimums = useMemo(
    () =>
      (debts ?? [])
        .filter((d) => d.status === 'ativa')
        .reduce((s, d) => s + Math.min(d.minimum_payment, d.outstanding_balance), 0),
    [debts],
  )
  const activeGoals = useMemo(() => (goals ?? []).filter((g) => g.status === 'ativa'), [goals])

  const committed = totalBudgeted + totalDebtMinimums + savingsValue
  const leftover = incomeValue - committed

  async function handleSave() {
    try {
      await upsertPlan.mutateAsync({
        month,
        expected_income: incomeValue,
        planned_savings: savingsValue,
        notes: notesValue.trim() || null,
      })
      showToast('success', 'Planejamento salvo.')
      setIncome(null)
      setSavings(null)
      setNotes(null)
    } catch {
      showToast('error', 'Não foi possível salvar o planejamento.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Planejamento mensal</h1>
          <p className="text-sm text-(--color-ink-600)">
            Dê um destino a cada real antes do mês começar: renda prevista, orçamento, dívidas e poupança.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize text-(--color-ink-900)">
            {formatMonthYear(month)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader title="Entradas do plano" subtitle="Preencha o que você espera para o mês" />
          <div className="mt-3 flex flex-col gap-4">
            <Input
              label="Renda prevista (R$)"
              inputMode="decimal"
              placeholder="0,00"
              value={income !== null ? income : plan ? String(plan.expected_income).replace('.', ',') : ''}
              onChange={(e) => setIncome(e.target.value)}
            />
            <Input
              label="Poupança/investimento planejado (R$)"
              inputMode="decimal"
              placeholder="0,00"
              value={savings !== null ? savings : plan ? String(plan.planned_savings).replace('.', ',') : ''}
              onChange={(e) => setSavings(e.target.value)}
            />
            <Input label="Observações (opcional)" value={notesValue} onChange={(e) => setNotes(e.target.value)} />
            <div>
              <Button onClick={handleSave} isLoading={upsertPlan.isPending}>
                <Save className="mr-1.5 h-4 w-4" aria-hidden="true" /> Salvar planejamento
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="Resumo do mês planejado" subtitle="Calculado com orçamento e dívidas já cadastrados" />
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-(--color-ink-600)">Renda prevista</dt>
              <dd className="font-medium text-(--color-ink-900)">{formatCurrency(incomeValue)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-(--color-ink-600)">Orçamento por categorias ({(budgets ?? []).length})</dt>
              <dd className="font-medium text-(--color-danger-600)">−{formatCurrency(totalBudgeted)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-(--color-ink-600)">Mínimos das dívidas ativas</dt>
              <dd className="font-medium text-(--color-danger-600)">−{formatCurrency(totalDebtMinimums)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-(--color-ink-600)">Poupança planejada</dt>
              <dd className="font-medium text-(--color-danger-600)">−{formatCurrency(savingsValue)}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-(--color-navy-50) pt-2">
              <dt className="font-medium text-(--color-ink-900)">Sobra livre</dt>
              <dd
                className={`font-display text-lg font-semibold ${
                  leftover < 0 ? 'text-(--color-danger-600)' : 'text-(--color-success-700)'
                }`}
              >
                {formatCurrency(leftover)}
              </dd>
            </div>
          </dl>

          {leftover < 0 && (
            <p className="mt-3 rounded-lg bg-(--color-danger-100) p-3 text-sm text-(--color-danger-700)">
              O plano compromete mais do que a renda prevista. Reveja o orçamento ou a poupança planejada.
            </p>
          )}

          {activeGoals.length > 0 && leftover > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-(--color-navy-50) p-3 text-sm text-(--color-ink-600)">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-(--color-navy-600)" aria-hidden="true" />
              <span>
                Você tem {activeGoals.length} meta(s) ativa(s) — parte da sobra de {formatCurrency(leftover)} pode virar
                aporte.
              </span>
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
