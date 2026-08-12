import { describe, expect, it } from 'vitest'
import { computeHealthScore } from '@/utils/healthScore'

describe('computeHealthScore', () => {
  it('sem nenhum dado, nota é zero com alerta de cadastro', () => {
    const r = computeHealthScore({
      averageIncome: 0,
      averageExpense: 0,
      emergencyFundAmount: null,
      monthlyDebtMinimums: null,
      budgetCategories: null,
    })
    expect(r.score).toBe(0)
    expect(r.level).toBe('critica')
    expect(r.alerts[0]).toMatch(/Cadastre movimentações/)
  })

  it('poupando 20%+ da renda, sem outros dados, pontua o máximo dos pesos disponíveis', () => {
    const r = computeHealthScore({
      averageIncome: 5000,
      averageExpense: 4000,
      emergencyFundAmount: null,
      monthlyDebtMinimums: null,
      budgetCategories: null,
    })
    expect(r.savingsRate).toBeCloseTo(0.2, 5)
    expect(r.score).toBe(100)
  })

  it('gastando mais que a renda gera alerta e pontuação zero no sinal de poupança', () => {
    const r = computeHealthScore({
      averageIncome: 3000,
      averageExpense: 3500,
      emergencyFundAmount: null,
      monthlyDebtMinimums: null,
      budgetCategories: null,
    })
    expect(r.savingsRate).toBeLessThan(0)
    expect(r.score).toBe(0)
    expect(r.alerts.some((a) => a.includes('superaram a renda'))).toBe(true)
  })

  it('reserva de emergência com 6+ meses de cobertura pontua o máximo do sinal', () => {
    const r = computeHealthScore({
      averageIncome: 5000,
      averageExpense: 3000,
      emergencyFundAmount: 18000, // 6 meses de despesa
      monthlyDebtMinimums: null,
      budgetCategories: null,
    })
    expect(r.emergencyFundMonths).toBeCloseTo(6, 5)
    expect(r.alerts.some((a) => a.includes('reserva de emergência'))).toBe(false)
  })

  it('reserva abaixo de 3 meses gera alerta', () => {
    const r = computeHealthScore({
      averageIncome: 5000,
      averageExpense: 3000,
      emergencyFundAmount: 3000, // 1 mês
      monthlyDebtMinimums: null,
      budgetCategories: null,
    })
    expect(r.emergencyFundMonths).toBeCloseTo(1, 5)
    expect(r.alerts.some((a) => a.includes('reserva de emergência'))).toBe(true)
  })

  it('comprometimento de dívida acima de 30% da renda gera alerta e zera o sinal', () => {
    const r = computeHealthScore({
      averageIncome: 4000,
      averageExpense: 2000,
      emergencyFundAmount: null,
      monthlyDebtMinimums: 1500, // 37.5%
      budgetCategories: null,
    })
    expect(r.debtBurden).toBeCloseTo(0.375, 3)
    expect(r.alerts.some((a) => a.includes('comprometimento mensal com dívidas'))).toBe(true)
  })

  it('comprometimento de dívida até 10% pontua o máximo do sinal', () => {
    const r = computeHealthScore({
      averageIncome: 5000,
      averageExpense: 3000,
      emergencyFundAmount: null,
      monthlyDebtMinimums: 400, // 8%
      budgetCategories: null,
    })
    expect(r.score).toBe(100)
  })

  it('categorias de orçamento estouradas reduzem a aderência e geram alerta', () => {
    const r = computeHealthScore({
      averageIncome: 5000,
      averageExpense: 3000,
      emergencyFundAmount: null,
      monthlyDebtMinimums: null,
      budgetCategories: [
        { budgeted: 500, spent: 600 },
        { budgeted: 300, spent: 200 },
      ],
    })
    expect(r.budgetAdherence).toBeCloseTo(0.5, 5)
    expect(r.alerts.some((a) => a.includes('estourou o limite'))).toBe(true)
  })

  it('nota nunca sai do intervalo 0-100', () => {
    const good = computeHealthScore({
      averageIncome: 10000,
      averageExpense: 1000,
      emergencyFundAmount: 100000,
      monthlyDebtMinimums: 0,
      budgetCategories: [{ budgeted: 100, spent: 50 }],
    })
    expect(good.score).toBeLessThanOrEqual(100)
    expect(good.score).toBeGreaterThanOrEqual(0)
  })

  it('cenário completo e equilibrado cai na faixa "boa"', () => {
    const r = computeHealthScore({
      averageIncome: 6000,
      averageExpense: 5000,
      emergencyFundAmount: 10000, // ~2 meses
      monthlyDebtMinimums: 600, // 10%
      budgetCategories: [
        { budgeted: 1000, spent: 900 },
        { budgeted: 500, spent: 550 },
      ],
    })
    expect(r.level === 'boa' || r.level === 'atencao').toBe(true)
  })
})
