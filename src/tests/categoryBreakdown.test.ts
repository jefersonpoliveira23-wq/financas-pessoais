import { describe, expect, it } from 'vitest'
import { aggregateExpensesByCategory, NO_CATEGORY_LABEL } from '@/utils/categoryBreakdown'

describe('aggregateExpensesByCategory', () => {
  const categories = [
    { id: 'cat-1', name: 'Mercado' },
    { id: 'cat-2', name: 'Transporte' },
  ]

  it('soma despesas e compras no cartão por categoria, ordenado do maior para o menor', () => {
    const transactions = [
      { type: 'despesa', amount: 100, status: 'pago', category_id: 'cat-1' },
      { type: 'compra_cartao', amount: 50, status: 'pago', category_id: 'cat-1' },
      { type: 'despesa', amount: 300, status: 'pendente', category_id: 'cat-2' },
    ]
    expect(aggregateExpensesByCategory(transactions, categories)).toEqual([
      { name: 'Transporte', value: 300 },
      { name: 'Mercado', value: 150 },
    ])
  })

  it('ignora receitas, transferências e status cancelado', () => {
    const transactions = [
      { type: 'receita', amount: 1000, status: 'recebido', category_id: 'cat-1' },
      { type: 'transferencia', amount: 200, status: 'pago', category_id: 'cat-1' },
      { type: 'despesa', amount: 999, status: 'cancelado', category_id: 'cat-1' },
    ]
    expect(aggregateExpensesByCategory(transactions, categories)).toEqual([])
  })

  it('sem categoria cai em "Sem categoria"', () => {
    const transactions = [{ type: 'despesa', amount: 40, status: 'pago', category_id: null }]
    expect(aggregateExpensesByCategory(transactions, categories)).toEqual([{ name: NO_CATEGORY_LABEL, value: 40 }])
  })

  it('respeita o limite de itens retornados', () => {
    const manyCategories = Array.from({ length: 10 }, (_, i) => ({ id: `cat-${i}`, name: `Categoria ${i}` }))
    const transactions = manyCategories.map((c, i) => ({
      type: 'despesa',
      amount: i + 1,
      status: 'pago',
      category_id: c.id,
    }))
    expect(aggregateExpensesByCategory(transactions, manyCategories, 3)).toHaveLength(3)
  })
})
