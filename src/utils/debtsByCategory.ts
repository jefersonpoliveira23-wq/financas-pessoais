/**
 * Dívidas agrupadas por categoria (visão de longo prazo do dashboard).
 *
 * Dívidas não têm categoria própria no banco — quando nascem de um
 * parcelamento (import ou "Nova dívida parcelada"), a categoria vem do
 * `installment_groups` vinculado. Dívidas cadastradas manualmente (sem
 * parcelamento, ex.: empréstimo) caem no grupo "Outras dívidas".
 */

export interface DebtLike {
  outstanding_balance: number
  status: string
  installment_group_id: string | null
}

export interface InstallmentGroupCategoryLike {
  id: string
  category_id: string | null
}

export interface CategoryLike {
  id: string
  name: string
}

export interface DebtCategoryTotal {
  categoryId: string | null
  name: string
  value: number
}

export const OTHER_DEBTS_LABEL = 'Outras dívidas'

/** Só dívidas com saldo em aberto entram na soma (quitada normalmente já está com outstanding_balance = 0). */
export function aggregateDebtsByCategory(
  debts: DebtLike[],
  installmentGroups: InstallmentGroupCategoryLike[],
  categories: CategoryLike[],
): DebtCategoryTotal[] {
  const groupCategoryById = new Map(installmentGroups.map((g) => [g.id, g.category_id]))
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  const totals = new Map<string, DebtCategoryTotal>()

  for (const debt of debts) {
    if (debt.status === 'quitada') continue
    if (debt.outstanding_balance <= 0) continue

    const categoryId = debt.installment_group_id ? (groupCategoryById.get(debt.installment_group_id) ?? null) : null
    const key = categoryId ?? '__other__'
    const name = categoryId ? (categoryNameById.get(categoryId) ?? OTHER_DEBTS_LABEL) : OTHER_DEBTS_LABEL

    const existing = totals.get(key)
    if (existing) existing.value += debt.outstanding_balance
    else totals.set(key, { categoryId, name, value: debt.outstanding_balance })
  }

  return [...totals.values()].sort((a, b) => b.value - a.value)
}
