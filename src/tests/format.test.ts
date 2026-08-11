import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatPercent, parseCurrencyInput, formatNumber } from '@/utils/format'

describe('formatCurrency', () => {
  it('formata valores positivos no padrão brasileiro', () => {
    expect(formatCurrency(1234.56)).toBe('R$\u00A01.234,56')
  })

  it('formata zero corretamente', () => {
    expect(formatCurrency(0)).toBe('R$\u00A00,00')
  })

  it('formata valores negativos', () => {
    expect(formatCurrency(-420)).toBe('-R$\u00A0420,00')
  })

  it('nunca quebra com valores inválidos', () => {
    expect(formatCurrency(NaN)).toBe('R$\u00A00,00')
  })
})

describe('formatNumber', () => {
  it('usa vírgula como separador decimal', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50')
  })
})

describe('formatPercent', () => {
  it('formata uma fração como percentual', () => {
    expect(formatPercent(0.783)).toBe('78,3%')
  })

  it('formata um valor já em escala 0-100 quando indicado', () => {
    expect(formatPercent(78.3, { alreadyPercent: true })).toBe('78,3%')
  })
})

describe('parseCurrencyInput', () => {
  it('aceita vírgula como separador decimal', () => {
    expect(parseCurrencyInput('1234,56')).toBe(1234.56)
  })

  it('aceita ponto como separador decimal', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56)
  })

  it('aceita ponto de milhar com vírgula decimal', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56)
  })
})

describe('formatDate', () => {
  it('formata data ISO como DD/MM/AAAA', () => {
    expect(formatDate('2026-08-10')).toBe('10/08/2026')
  })

  it('retorna travessão para valores vazios', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})
