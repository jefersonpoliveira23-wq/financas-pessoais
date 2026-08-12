import { describe, expect, it } from 'vitest'
import { transactionSchema } from '@/schemas/transaction.schema'

const base = {
  type: 'despesa' as const,
  description: 'Aluguel',
  amount: 1200,
  transactionDate: '2026-08-10',
  competenceDate: '2026-08-01',
  accountId: '11111111-1111-1111-1111-111111111111',
  status: 'pendente' as const,
}

describe('transactionSchema — regra de dupla contagem em transferências', () => {
  it('exige conta de destino quando o tipo é transferência', () => {
    const result = transactionSchema.safeParse({ ...base, type: 'transferencia', destinationAccountId: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita transferência para a mesma conta de origem', () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: 'transferencia',
      accountId: base.accountId,
      destinationAccountId: base.accountId,
    })
    expect(result.success).toBe(false)
  })

  it('aceita transferência válida entre contas diferentes', () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: 'transferencia',
      accountId: '11111111-1111-1111-1111-111111111111',
      destinationAccountId: '22222222-2222-2222-2222-222222222222',
    })
    expect(result.success).toBe(true)
  })

  it('não exige conta de destino para receita/despesa', () => {
    const result = transactionSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('rejeita valores menores ou iguais a zero', () => {
    const result = transactionSchema.safeParse({ ...base, amount: 0 })
    expect(result.success).toBe(false)
  })
})

describe('transactionSchema — compra no cartão', () => {
  it('exige cartão quando o tipo é compra no cartão', () => {
    const result = transactionSchema.safeParse({ ...base, type: 'compra_cartao', accountId: '', cardId: '' })
    expect(result.success).toBe(false)
  })

  it('não exige conta quando o tipo é compra no cartão', () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: 'compra_cartao',
      accountId: '',
      cardId: '33333333-3333-3333-3333-333333333333',
    })
    expect(result.success).toBe(true)
  })
})
