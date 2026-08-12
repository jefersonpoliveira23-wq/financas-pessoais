import { describe, expect, it } from 'vitest'
import { getInvoicePeriod } from '@/utils/creditCard'

describe('getInvoicePeriod', () => {
  it('compra até o dia de fechamento entra na fatura que fecha neste mês', () => {
    // Fechamento dia 10, vencimento dia 17. Compra dia 5/08.
    const result = getInvoicePeriod('2026-08-05', 10, 17)
    expect(result.closingDate).toBe('2026-08-10')
    expect(result.dueDate).toBe('2026-08-17')
    expect(result.invoiceId).toBe('2026-08')
  })

  it('compra após o fechamento entra na fatura do mês seguinte', () => {
    const result = getInvoicePeriod('2026-08-15', 10, 17)
    expect(result.closingDate).toBe('2026-09-10')
    expect(result.dueDate).toBe('2026-09-17')
    expect(result.invoiceId).toBe('2026-09')
  })

  it('compra exatamente no dia de fechamento entra na fatura deste mês', () => {
    const result = getInvoicePeriod('2026-08-10', 10, 17)
    expect(result.closingDate).toBe('2026-08-10')
  })

  it('lida com fechamento no fim do mês em fevereiro (28 dias)', () => {
    // Fechamento dia 31 (clampa para o último dia de fevereiro).
    const result = getInvoicePeriod('2026-02-20', 31, 5)
    expect(result.closingDate).toBe('2026-02-28')
  })

  it('lida com ano bissexto (fevereiro com 29 dias)', () => {
    const result = getInvoicePeriod('2028-02-20', 31, 5)
    expect(result.closingDate).toBe('2028-02-29')
  })

  it('vencimento em dia menor que o fechamento cai no mês seguinte ao fechamento', () => {
    // Fechamento dia 25, vencimento dia 5 (do mês seguinte ao fechamento).
    const result = getInvoicePeriod('2026-08-20', 25, 5)
    expect(result.closingDate).toBe('2026-08-25')
    expect(result.dueDate).toBe('2026-09-05')
  })

  it('compra em dezembro com fatura virando o ano', () => {
    const result = getInvoicePeriod('2026-12-28', 25, 5)
    expect(result.closingDate).toBe('2027-01-25')
    expect(result.dueDate).toBe('2027-02-05')
  })
})
