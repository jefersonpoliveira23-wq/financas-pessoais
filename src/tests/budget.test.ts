import { describe, expect, it } from 'vitest'
import { budgetUsage, shiftMonth, toMonthStart } from '@/utils/budget'

describe('budgetUsage', () => {
  it('abaixo de 80% é ok', () => {
    const u = budgetUsage(1000, 500)
    expect(u.status).toBe('ok')
    expect(u.percent).toBe(50)
    expect(u.remaining).toBe(500)
  })

  it('80% ou mais (sem estourar) é alerta', () => {
    expect(budgetUsage(1000, 800).status).toBe('alerta')
    expect(budgetUsage(1000, 1000).status).toBe('alerta')
  })

  it('acima do orçado é estourado, com restante negativo', () => {
    const u = budgetUsage(1000, 1250)
    expect(u.status).toBe('estourado')
    expect(u.percent).toBe(125)
    expect(u.remaining).toBe(-250)
  })

  it('orçamento zero não divide por zero', () => {
    expect(budgetUsage(0, 100).percent).toBe(0)
  })
})

describe('toMonthStart / shiftMonth', () => {
  it('normaliza para o dia 1', () => {
    expect(toMonthStart(new Date(2026, 7, 12))).toBe('2026-08-01')
  })

  it('avança e recua meses, inclusive na virada de ano', () => {
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01')
  })
})
