import { describe, expect, it } from 'vitest'
import { computeDailyProjection, findFirstNegativeDay, findLowestBalanceDay } from '@/utils/calendarProjection'

describe('computeDailyProjection', () => {
  it('mantém o saldo de referência quando não há itens pendentes', () => {
    const projection = computeDailyProjection(1000, '2026-08-11', '2026-08-13', [])
    expect(projection).toEqual([
      { date: '2026-08-11', balance: 1000 },
      { date: '2026-08-12', balance: 1000 },
      { date: '2026-08-13', balance: 1000 },
    ])
  })

  it('aplica o efeito de uma despesa futura no dia correto e mantém depois', () => {
    const projection = computeDailyProjection(1000, '2026-08-11', '2026-08-14', [
      { eventDate: '2026-08-13', netAmount: -300 },
    ])
    expect(projection.map((d) => d.balance)).toEqual([1000, 1000, 700, 700])
  })

  it('itens vencidos (antes de hoje) são jogados no dia de hoje', () => {
    const projection = computeDailyProjection(1000, '2026-08-11', '2026-08-12', [
      { eventDate: '2026-08-05', netAmount: -200 },
    ])
    expect(projection[0].balance).toBe(800)
    expect(projection[1].balance).toBe(800)
  })

  it('soma múltiplos itens no mesmo dia', () => {
    const projection = computeDailyProjection(1000, '2026-08-11', '2026-08-11', [
      { eventDate: '2026-08-11', netAmount: -100 },
      { eventDate: '2026-08-11', netAmount: 500 },
    ])
    expect(projection[0].balance).toBe(1400)
  })

  it('retorna vazio quando o mês já terminou antes de hoje', () => {
    const projection = computeDailyProjection(1000, '2026-09-05', '2026-08-31', [])
    expect(projection).toEqual([])
  })
})

describe('findFirstNegativeDay', () => {
  it('identifica o primeiro dia com saldo negativo', () => {
    const projection = computeDailyProjection(500, '2026-08-11', '2026-08-15', [
      { eventDate: '2026-08-13', netAmount: -800 },
    ])
    const negativeDay = findFirstNegativeDay(projection)
    expect(negativeDay?.date).toBe('2026-08-13')
    expect(negativeDay?.balance).toBe(-300)
  })

  it('retorna null quando o saldo nunca fica negativo', () => {
    const projection = computeDailyProjection(500, '2026-08-11', '2026-08-15', [])
    expect(findFirstNegativeDay(projection)).toBeNull()
  })
})

describe('findLowestBalanceDay', () => {
  it('identifica o dia de menor saldo do período, mesmo que recupere depois', () => {
    const projection = computeDailyProjection(1000, '2026-08-11', '2026-08-15', [
      { eventDate: '2026-08-12', netAmount: -900 },
      { eventDate: '2026-08-14', netAmount: 2000 },
    ])
    const lowest = findLowestBalanceDay(projection)
    expect(lowest?.date).toBe('2026-08-12')
    expect(lowest?.balance).toBe(100)
  })
})
