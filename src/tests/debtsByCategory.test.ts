import { describe, expect, it } from 'vitest'
import { aggregateDebtsByCategory, OTHER_DEBTS_LABEL } from '@/utils/debtsByCategory'

describe('aggregateDebtsByCategory', () => {
  const categories = [
    { id: 'cat-1', name: 'Cartão' },
    { id: 'cat-2', name: 'Financiamento' },
  ]
  const groups = [
    { id: 'group-1', category_id: 'cat-1' },
    { id: 'group-2', category_id: 'cat-2' },
    { id: 'group-3', category_id: null },
  ]

  it('agrupa dívidas ativas pela categoria do parcelamento vinculado', () => {
    const debts = [
      { outstanding_balance: 300, status: 'ativa', installment_group_id: 'group-1' },
      { outstanding_balance: 200, status: 'ativa', installment_group_id: 'group-1' },
      { outstanding_balance: 1000, status: 'ativa', installment_group_id: 'group-2' },
    ]
    const result = aggregateDebtsByCategory(debts, groups, categories)
    expect(result).toEqual([
      { categoryId: 'cat-2', name: 'Financiamento', value: 1000 },
      { categoryId: 'cat-1', name: 'Cartão', value: 500 },
    ])
  })

  it('dívida sem parcelamento vinculado cai em "Outras dívidas"', () => {
    const debts = [{ outstanding_balance: 5000, status: 'ativa', installment_group_id: null }]
    const result = aggregateDebtsByCategory(debts, groups, categories)
    expect(result).toEqual([{ categoryId: null, name: OTHER_DEBTS_LABEL, value: 5000 }])
  })

  it('parcelamento vinculado mas sem categoria também cai em "Outras dívidas"', () => {
    const debts = [{ outstanding_balance: 800, status: 'ativa', installment_group_id: 'group-3' }]
    const result = aggregateDebtsByCategory(debts, groups, categories)
    expect(result).toEqual([{ categoryId: null, name: OTHER_DEBTS_LABEL, value: 800 }])
  })

  it('ignora dívidas quitadas e com saldo zerado', () => {
    const debts = [
      { outstanding_balance: 0, status: 'quitada', installment_group_id: 'group-1' },
      { outstanding_balance: 0, status: 'ativa', installment_group_id: 'group-2' },
    ]
    expect(aggregateDebtsByCategory(debts, groups, categories)).toEqual([])
  })
})
