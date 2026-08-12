import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { simulatePayoff, type SimulatorDebt } from '@/utils/debtSimulator'
import { formatCurrency } from '@/utils/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Database } from '@/types/database.types'

type Debt = Database['public']['Tables']['debts']['Row']

interface PayoffSimulatorProps {
  debts: Debt[]
}

/**
 * Simulador de quitação — roda 100% no navegador, nada é gravado no banco.
 * Compara bola de neve × avalanche com o mesmo orçamento mensal.
 */
export function PayoffSimulator({ debts }: PayoffSimulatorProps) {
  const activeDebts = useMemo(() => debts.filter((d) => d.status === 'ativa' && d.outstanding_balance > 0), [debts])
  const totalMinimum = useMemo(
    () => activeDebts.reduce((s, d) => s + Math.min(d.minimum_payment, d.outstanding_balance), 0),
    [activeDebts],
  )

  const [budgetInput, setBudgetInput] = useState('')
  const [strategy, setStrategy] = useState<'bola_de_neve' | 'avalanche'>('bola_de_neve')

  const budget = Number(budgetInput.replace(',', '.'))
  const hasBudget = Number.isFinite(budget) && budget > 0

  const simDebts: SimulatorDebt[] = activeDebts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.outstanding_balance,
    monthlyRate: d.monthly_interest_rate,
    minimumPayment: d.minimum_payment,
  }))

  const result = hasBudget ? simulatePayoff(simDebts, budget, strategy) : null
  const other = hasBudget
    ? simulatePayoff(simDebts, budget, strategy === 'avalanche' ? 'bola_de_neve' : 'avalanche')
    : null

  const debtName = (id: string) => activeDebts.find((d) => d.id === id)?.name ?? id

  if (activeDebts.length === 0) return null

  return (
    <Card className="p-4">
      <CardHeader
        title="Simulador de quitação"
        subtitle="Compare as estratégias bola de neve (menor saldo primeiro) e avalanche (maior juro primeiro). Nada é gravado — é só simulação."
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label={`Valor mensal para dívidas (mínimos somam ${formatCurrency(totalMinimum)})`}
            inputMode="decimal"
            placeholder="0,00"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Select
            label="Estratégia"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as 'bola_de_neve' | 'avalanche')}
          >
            <option value="bola_de_neve">Bola de neve — vitórias rápidas</option>
            <option value="avalanche">Avalanche — menor custo total</option>
          </Select>
        </div>
      </div>

      {result && !result.feasible && (
        <p className="mt-4 rounded-lg bg-(--color-danger-100) p-3 text-sm text-(--color-danger-700)">
          {result.infeasibleReason}
        </p>
      )}

      {result && result.feasible && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-(--color-surface-alt) p-3">
              <p className="text-xs text-(--color-ink-600)">Tempo até quitar tudo</p>
              <p className="font-display text-lg font-semibold text-(--color-ink-900)">
                {result.months} {result.months === 1 ? 'mês' : 'meses'}
              </p>
            </div>
            <div className="rounded-lg bg-(--color-surface-alt) p-3">
              <p className="text-xs text-(--color-ink-600)">Total pago</p>
              <p className="font-display text-lg font-semibold text-(--color-ink-900)">
                {formatCurrency(result.totalPaid)}
              </p>
            </div>
            <div className="rounded-lg bg-(--color-surface-alt) p-3">
              <p className="text-xs text-(--color-ink-600)">Juros pagos no caminho</p>
              <p className="font-display text-lg font-semibold text-(--color-danger-600)">
                {formatCurrency(result.totalInterest)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-(--color-ink-900)">Ordem de quitação</p>
            <ol className="flex flex-wrap gap-2 text-sm text-(--color-ink-600)">
              {result.payoffOrder.map((id, i) => (
                <li key={id} className="rounded-full bg-(--color-navy-50) px-3 py-1">
                  {i + 1}º {debtName(id)}
                </li>
              ))}
            </ol>
          </div>

          {other && other.feasible && other.totalInterest !== result.totalInterest && (
            <p className="flex items-start gap-2 rounded-lg bg-(--color-navy-50) p-3 text-sm text-(--color-ink-600)">
              <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-(--color-navy-600)" aria-hidden="true" />
              <span>
                Na outra estratégia ({strategy === 'avalanche' ? 'bola de neve' : 'avalanche'}), você pagaria{' '}
                <strong>{formatCurrency(other.totalInterest)}</strong> de juros em {other.months} meses —{' '}
                {other.totalInterest < result.totalInterest
                  ? `economia de ${formatCurrency(result.totalInterest - other.totalInterest)}.`
                  : `${formatCurrency(other.totalInterest - result.totalInterest)} a mais.`}
              </span>
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
