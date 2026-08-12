import { describe, expect, it } from 'vitest'
import { simulatePayoff, type SimulatorDebt } from '@/utils/debtSimulator'

const cartao: SimulatorDebt = { id: 'cartao', name: 'Cartão', balance: 3000, monthlyRate: 10, minimumPayment: 300 }
const emprestimo: SimulatorDebt = { id: 'emp', name: 'Empréstimo', balance: 10000, monthlyRate: 2, minimumPayment: 400 }
const boleto: SimulatorDebt = { id: 'boleto', name: 'Boleto', balance: 500, monthlyRate: 0, minimumPayment: 100 }

describe('simulatePayoff', () => {
  it('sem dívidas ativas, quita em 0 meses', () => {
    const r = simulatePayoff([], 1000, 'bola_de_neve')
    expect(r.feasible).toBe(true)
    expect(r.months).toBe(0)
    expect(r.totalPaid).toBe(0)
  })

  it('orçamento abaixo da soma dos mínimos é inviável', () => {
    const r = simulatePayoff([cartao, emprestimo], 500, 'avalanche')
    expect(r.feasible).toBe(false)
    expect(r.infeasibleReason).toMatch(/mínimos/)
  })

  it('orçamento que não vence os juros é inviável (saldo nunca cai)', () => {
    // Juros do cartão: 10% de 3000 = 300/mês. Orçamento de 300 nunca reduz o principal.
    const r = simulatePayoff([{ ...cartao, minimumPayment: 250 }], 300, 'avalanche')
    expect(r.feasible).toBe(false)
    expect(r.infeasibleReason).toMatch(/juros/)
  })

  it('bola de neve quita a menor dívida primeiro', () => {
    const r = simulatePayoff([cartao, emprestimo, boleto], 1500, 'bola_de_neve')
    expect(r.feasible).toBe(true)
    expect(r.payoffOrder[0]).toBe('boleto')
  })

  it('avalanche ataca a maior taxa primeiro', () => {
    const r = simulatePayoff([cartao, emprestimo, boleto], 1500, 'avalanche')
    expect(r.feasible).toBe(true)
    // Cartão (10% a.m.) deve ser quitado antes do empréstimo (2% a.m.).
    expect(r.payoffOrder.indexOf('cartao')).toBeLessThan(r.payoffOrder.indexOf('emp'))
  })

  it('avalanche nunca paga mais juros totais que bola de neve', () => {
    const neve = simulatePayoff([cartao, emprestimo, boleto], 1500, 'bola_de_neve')
    const ava = simulatePayoff([cartao, emprestimo, boleto], 1500, 'avalanche')
    expect(ava.totalInterest).toBeLessThanOrEqual(neve.totalInterest)
  })

  it('total pago = soma dos saldos + juros totais (fechamento contábil)', () => {
    const r = simulatePayoff([cartao, boleto], 2000, 'avalanche')
    expect(r.feasible).toBe(true)
    const principal = 3000 + 500
    expect(r.totalPaid).toBeCloseTo(principal + r.totalInterest, 1)
  })

  it('dívida sem juros com orçamento exato quita no prazo esperado', () => {
    // 500 / 100 por mês = 5 meses
    const r = simulatePayoff([boleto], 100, 'bola_de_neve')
    expect(r.feasible).toBe(true)
    expect(r.months).toBe(5)
    expect(r.totalInterest).toBe(0)
    expect(r.totalPaid).toBe(500)
  })

  it('último mês paga apenas o restante (não estoura o saldo)', () => {
    const r = simulatePayoff([boleto], 300, 'bola_de_neve')
    expect(r.feasible).toBe(true)
    expect(r.months).toBe(2)
    const lastMonth = r.schedule[r.schedule.length - 1]
    const lastPayment = lastMonth.payments.reduce((s, p) => s + p.amount, 0)
    expect(lastPayment).toBe(200)
    expect(r.totalPaid).toBe(500)
  })
})
