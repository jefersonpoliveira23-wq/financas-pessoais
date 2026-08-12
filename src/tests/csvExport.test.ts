import { describe, expect, it } from 'vitest'
import { transactionsToCsv, type CsvTransactionRow } from '@/utils/csvExport'

const row: CsvTransactionRow = {
  date: '15/03/2026',
  description: 'Mercado',
  category: 'Alimentação',
  type: 'Despesa',
  status: 'Pago',
  amount: 123.45,
  account: 'Conta Corrente',
}

describe('transactionsToCsv', () => {
  it('inclui o cabeçalho em português', () => {
    const csv = transactionsToCsv([])
    expect(csv).toBe('Data,Descrição,Categoria,Tipo,Status,Valor,Conta/Cartão')
  })

  it('formata valores com vírgula decimal (padrão BR)', () => {
    const csv = transactionsToCsv([row])
    expect(csv).toContain('123,45')
  })

  it('escapa campos com vírgula entre aspas', () => {
    const csv = transactionsToCsv([{ ...row, description: 'Mercado, feira e padaria' }])
    expect(csv).toContain('"Mercado, feira e padaria"')
  })

  it('escapa aspas duplicando-as', () => {
    const csv = transactionsToCsv([{ ...row, description: 'Presente "surpresa"' }])
    expect(csv).toContain('"Presente ""surpresa"""')
  })

  it('escapa campos com quebra de linha', () => {
    const csv = transactionsToCsv([{ ...row, description: 'Linha um\nLinha dois' }])
    expect(csv).toContain('"Linha um\nLinha dois"')
  })

  it('múltiplas linhas são separadas por CRLF', () => {
    const csv = transactionsToCsv([row, row])
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(3) // cabeçalho + 2 linhas
  })

  it('valor negativo mantém o sinal', () => {
    const csv = transactionsToCsv([{ ...row, amount: -50.5 }])
    expect(csv).toContain('-50,50')
  })
})
