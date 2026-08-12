import { describe, expect, it } from 'vitest'
import { goalProgress, monthlyContributionNeeded } from '@/utils/goals'

describe('goalProgress', () => {
  it('meta independente usa a soma dos aportes', () => {
    const p = goalProgress({ mode: 'independente', target_amount: 1000 }, 250)
    expect(p.current).toBe(250)
    expect(p.percent).toBe(25)
    expect(p.completed).toBe(false)
  })

  it('resgates (soma negativa) nunca deixam o progresso negativo', () => {
    const p = goalProgress({ mode: 'independente', target_amount: 1000 }, -50)
    expect(p.current).toBe(0)
    expect(p.percent).toBe(0)
  })

  it('meta alocada usa o saldo da conta vinculada, limitado ao alvo', () => {
    const p = goalProgress({ mode: 'alocado', target_amount: 1000 }, 999999, 1500)
    expect(p.current).toBe(1000)
    expect(p.percent).toBe(100)
    expect(p.completed).toBe(true)
  })

  it('meta alocada com conta negativa mostra progresso zero', () => {
    const p = goalProgress({ mode: 'alocado', target_amount: 1000 }, 0, -200)
    expect(p.current).toBe(0)
  })

  it('progresso nunca passa de 100%', () => {
    const p = goalProgress({ mode: 'independente', target_amount: 100 }, 250)
    expect(p.percent).toBe(100)
    expect(p.current).toBe(100)
  })
})

describe('monthlyContributionNeeded', () => {
  const today = new Date(2026, 0, 15) // 15/01/2026

  it('divide o restante pelos meses até a data-alvo', () => {
    // Alvo em jun/2026 → 5 meses (fev, mar, abr, mai, jun)
    expect(monthlyContributionNeeded(1000, 500, '2026-06-01', today)).toBe(100)
  })

  it('meta já atingida retorna 0', () => {
    expect(monthlyContributionNeeded(1000, 1000, '2026-06-01', today)).toBe(0)
  })

  it('sem data-alvo retorna null', () => {
    expect(monthlyContributionNeeded(1000, 0, null, today)).toBeNull()
  })

  it('data-alvo no passado retorna null', () => {
    expect(monthlyContributionNeeded(1000, 0, '2025-12-01', today)).toBeNull()
  })
})
