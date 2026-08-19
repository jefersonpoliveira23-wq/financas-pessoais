import { describe, expect, it } from 'vitest'
import { buildMonthlyTimeline, monthTotalExpense, type TimelineTransactionLike } from '@/utils/dashboardTimeline'

const REFERENCE = new Date('2026-08-15T00:00:00')

describe('buildMonthlyTimeline', () => {
  it('gera 7 meses por padrão (3 para trás, mês atual, 3 para frente)', () => {
    const timeline = buildMonthlyTimeline([], REFERENCE)
    expect(timeline.map((m) => m.month)).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ])
    expect(timeline.filter((m) => m.isPast)).toHaveLength(3)
    expect(timeline.filter((m) => m.isCurrent)).toHaveLength(1)
    expect(timeline.filter((m) => m.isFuture)).toHaveLength(3)
  })

  it('separa realizado (pago/recebido) de previsto/pendente/atrasado', () => {
    const transactions: TimelineTransactionLike[] = [
      { type: 'despesa', amount: 100, status: 'pago', competence_date: '2026-08-05', installment_group_id: null },
      { type: 'despesa', amount: 50, status: 'previsto', competence_date: '2026-08-20', installment_group_id: null },
      { type: 'receita', amount: 300, status: 'recebido', competence_date: '2026-08-01', installment_group_id: null },
    ]
    const timeline = buildMonthlyTimeline(transactions, REFERENCE)
    const current = timeline.find((m) => m.isCurrent)!
    expect(current.expenseRealized).toBe(100)
    expect(current.expensePlanned).toBe(50)
    expect(current.incomeRealized).toBe(300)
    expect(current.net).toBe(150)
    expect(current.tone).toBe('success')
  })

  it('ignora transações canceladas', () => {
    const transactions: TimelineTransactionLike[] = [
      { type: 'despesa', amount: 999, status: 'cancelado', competence_date: '2026-08-05', installment_group_id: null },
    ]
    const timeline = buildMonthlyTimeline(transactions, REFERENCE)
    expect(timeline.find((m) => m.isCurrent)!.expenseRealized).toBe(0)
  })

  it('não conta compra_cartao duas vezes com pagamento_fatura', () => {
    const transactions: TimelineTransactionLike[] = [
      { type: 'compra_cartao', amount: 200, status: 'pago', competence_date: '2026-08-05', installment_group_id: null },
      {
        type: 'pagamento_fatura',
        amount: 200,
        status: 'pago',
        competence_date: '2026-08-10',
        installment_group_id: null,
      },
    ]
    const timeline = buildMonthlyTimeline(transactions, REFERENCE)
    expect(timeline.find((m) => m.isCurrent)!.expenseRealized).toBe(200)
  })

  it('mês com saldo negativo fica com tone "danger"', () => {
    const transactions: TimelineTransactionLike[] = [
      { type: 'despesa', amount: 500, status: 'previsto', competence_date: '2026-09-05', installment_group_id: null },
    ]
    const timeline = buildMonthlyTimeline(transactions, REFERENCE)
    const nextMonth = timeline.find((m) => m.month === '2026-09-01')!
    expect(nextMonth.tone).toBe('danger')
  })

  it('mês futuro sem nenhum lançamento fica neutro', () => {
    const timeline = buildMonthlyTimeline([], REFERENCE)
    const farFuture = timeline.find((m) => m.month === '2026-11-01')!
    expect(farFuture.tone).toBe('neutral')
  })

  it('respeita monthsBack/monthsForward customizados', () => {
    const timeline = buildMonthlyTimeline([], REFERENCE, 1, 2)
    expect(timeline.map((m) => m.month)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'])
  })
})

describe('monthTotalExpense', () => {
  it('soma realizado e previsto', () => {
    const timeline = buildMonthlyTimeline(
      [{ type: 'despesa', amount: 40, status: 'pago', competence_date: '2026-08-01', installment_group_id: null }],
      REFERENCE,
    )
    const current = timeline.find((m) => m.isCurrent)!
    current.expensePlanned = 10
    expect(monthTotalExpense(current)).toBe(50)
  })
})
