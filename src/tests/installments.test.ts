import { describe, expect, it } from 'vitest'
import { generateInstallmentPreview } from '@/utils/installments'

describe('generateInstallmentPreview', () => {
  it('gera o número correto de parcelas', () => {
    const items = generateInstallmentPreview('2026-08-10', 3, 300)
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.installmentNumber)).toEqual([1, 2, 3])
  })

  it('divide o valor igualmente quando é exato', () => {
    const items = generateInstallmentPreview('2026-08-10', 3, 300)
    expect(items.every((i) => i.amount === 100)).toBe(true)
  })

  it('a soma das parcelas sempre bate com o valor total, mesmo com dízima', () => {
    const items = generateInstallmentPreview('2026-08-10', 3, 100)
    const sum = items.reduce((acc, i) => acc + i.amount, 0)
    expect(Math.round(sum * 100) / 100).toBe(100)
    // 100 / 3 = 33.33..., a última parcela absorve o resíduo
    expect(items[0].amount).toBe(33.33)
    expect(items[1].amount).toBe(33.33)
    expect(items[2].amount).toBe(33.34)
  })

  it('mantém o mesmo dia do mês nas parcelas seguintes', () => {
    const items = generateInstallmentPreview('2026-01-15', 3, 300)
    expect(items.map((i) => i.transactionDate)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })

  it('ajusta corretamente parcela iniciada no dia 31 em meses menores', () => {
    const items = generateInstallmentPreview('2026-01-31', 4, 400)
    // jan(31) -> fev(28, não bissexto) -> mar(31) -> abr(30)
    expect(items.map((i) => i.transactionDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('ajusta corretamente em ano bissexto', () => {
    const items = generateInstallmentPreview('2028-01-31', 2, 200)
    expect(items[1].transactionDate).toBe('2028-02-29')
  })

  it('lança erro para menos de 2 parcelas', () => {
    expect(() => generateInstallmentPreview('2026-08-10', 1, 100)).toThrow()
  })
})
