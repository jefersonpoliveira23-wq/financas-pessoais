import { describe, expect, it } from 'vitest'
import { buildInsights } from '@/utils/dashboardInsights'
import { buildMonthlyTimeline, type TimelineTransactionLike } from '@/utils/dashboardTimeline'

const REFERENCE = new Date('2026-08-15T00:00:00')

function timelineWithPastAndCurrentExpense(previousExpense: number, currentExpense: number) {
  const transactions: TimelineTransactionLike[] = [
    {
      type: 'despesa',
      amount: previousExpense,
      status: 'pago',
      competence_date: '2026-07-10',
      installment_group_id: null,
    },
    {
      type: 'despesa',
      amount: currentExpense,
      status: 'pago',
      competence_date: '2026-08-10',
      installment_group_id: null,
    },
  ]
  return buildMonthlyTimeline(transactions, REFERENCE)
}

describe('buildInsights', () => {
  it('alerta quando despesas do mês cresceram mais de 10% frente ao mês anterior', () => {
    const insights = buildInsights({
      timeline: timelineWithPastAndCurrentExpense(100, 150),
      healthAlerts: [],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: null,
      goals: [],
    })
    expect(insights.some((i) => i.tone === 'warning' && i.message.includes('maiores que no mês passado'))).toBe(true)
  })

  it('elogia quando despesas do mês caíram mais de 10%', () => {
    const insights = buildInsights({
      timeline: timelineWithPastAndCurrentExpense(200, 100),
      healthAlerts: [],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: null,
      goals: [],
    })
    expect(insights.some((i) => i.tone === 'positive' && i.message.includes('menores que no mês passado'))).toBe(true)
  })

  it('não gera insight de variação quando a mudança é pequena', () => {
    const insights = buildInsights({
      timeline: timelineWithPastAndCurrentExpense(100, 105),
      healthAlerts: [],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: null,
      goals: [],
    })
    expect(insights.some((i) => i.message.includes('mês passado'))).toBe(false)
  })

  it('identifica a categoria que mais cresceu', () => {
    const insights = buildInsights({
      timeline: buildMonthlyTimeline([], REFERENCE),
      healthAlerts: [],
      currentCategoryBreakdown: [{ name: 'Mercado', value: 500 }],
      previousCategoryBreakdown: [{ name: 'Mercado', value: 200 }],
      debtsTrend: null,
      goals: [],
    })
    expect(insights.some((i) => i.message.includes('Mercado'))).toBe(true)
  })

  it('reporta dívida abatida nos últimos 3 meses quando positiva', () => {
    const insights = buildInsights({
      timeline: buildMonthlyTimeline([], REFERENCE),
      healthAlerts: [],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: { principalPaidLast3Months: 900, installmentsDueNext3Months: 0 },
      goals: [],
    })
    expect(insights.some((i) => i.tone === 'positive' && i.message.includes('abateu'))).toBe(true)
  })

  it('reporta parcelas de dívida previstas quando não houve pagamento no período', () => {
    const insights = buildInsights({
      timeline: buildMonthlyTimeline([], REFERENCE),
      healthAlerts: [],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: { principalPaidLast3Months: 0, installmentsDueNext3Months: 600 },
      goals: [],
    })
    expect(insights.some((i) => i.message.includes('parcelas de dívidas previstas'))).toBe(true)
  })

  it('calcula o ritmo necessário para a meta mais próxima de bater', () => {
    const insights = buildInsights({
      timeline: buildMonthlyTimeline([], REFERENCE),
      healthAlerts: [],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: null,
      goals: [
        { name: 'Viagem', percent: 40, completed: false, monthlyNeeded: 300, targetDate: '2027-01-01' },
        { name: 'Carro', percent: 80, completed: false, monthlyNeeded: 500, targetDate: '2026-12-01' },
      ],
    })
    expect(insights.some((i) => i.message.includes('Carro'))).toBe(true)
  })

  it('repassa os alertas da nota de saúde financeira como insights de atenção', () => {
    const insights = buildInsights({
      timeline: buildMonthlyTimeline([], REFERENCE),
      healthAlerts: ['Sua reserva de emergência cobre menos de 3 meses de despesas.'],
      currentCategoryBreakdown: [],
      previousCategoryBreakdown: [],
      debtsTrend: null,
      goals: [],
    })
    expect(insights).toContainEqual({
      tone: 'warning',
      message: 'Sua reserva de emergência cobre menos de 3 meses de despesas.',
    })
  })
})
