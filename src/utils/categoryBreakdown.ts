/**
 * Maiores categorias de despesa em um período — mesma regra usada em
 * Relatórios, extraída aqui para ser testável e reaproveitada pelo dashboard
 * da Início.
 */

export interface CategoryBreakdownTransactionLike {
  type: string
  amount: number
  status: string
  category_id: string | null
}

export interface CategoryLike {
  id: string
  name: string
}

export interface CategoryBreakdownItem {
  name: string
  value: number
}

const EXPENSE_TYPES = new Set(['despesa', 'compra_cartao'])
const EXCLUDED_STATUSES = new Set(['cancelado', 'cancelado_por_quitacao'])
export const NO_CATEGORY_LABEL = 'Sem categoria'

export function aggregateExpensesByCategory(
  transactions: CategoryBreakdownTransactionLike[],
  categories: CategoryLike[],
  limit = 8,
): CategoryBreakdownItem[] {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const totals = new Map<string, number>()

  for (const t of transactions) {
    if (!EXPENSE_TYPES.has(t.type)) continue
    if (EXCLUDED_STATUSES.has(t.status)) continue
    const name = t.category_id ? (categoryNameById.get(t.category_id) ?? NO_CATEGORY_LABEL) : NO_CATEGORY_LABEL
    totals.set(name, (totals.get(name) ?? 0) + t.amount)
  }

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}
