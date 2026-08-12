import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type Budget = Database['public']['Tables']['budgets']['Row']
type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
type BudgetProgress = Database['public']['Views']['budget_progress']['Row']

/** Orçamentos do mês, com orçado × realizado vindos da view (fonte única). */
export function useBudgetProgress(month: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['budget_progress', user?.id, month],
    enabled: !!user,
    queryFn: async (): Promise<BudgetProgress[]> => {
      const { data, error } = await supabase.from('budget_progress').select('*').eq('month', month)
      if (error) throw error
      return data
    },
  })
}

export function useUpsertBudget() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<BudgetInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ ...input, user_id: user.id }, { onConflict: 'user_id,category_id,month' })
        .select()
        .single()
      if (error) throw error
      return data as Budget
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_progress'] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_progress'] })
    },
  })
}

/** Copia os orçamentos de um mês para outro (só categorias ainda sem orçamento no destino). */
export function useCopyBudgets() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fromMonth, toMonth }: { fromMonth: string; toMonth: string }) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data: source, error } = await supabase
        .from('budgets')
        .select('category_id, amount')
        .eq('month', fromMonth)
      if (error) throw error
      if (!source || source.length === 0) return 0

      const { data: existing, error: err2 } = await supabase.from('budgets').select('category_id').eq('month', toMonth)
      if (err2) throw err2
      const already = new Set((existing ?? []).map((b) => b.category_id))

      const rows = source
        .filter((b) => !already.has(b.category_id))
        .map((b) => ({ user_id: user.id, category_id: b.category_id, month: toMonth, amount: b.amount }))
      if (rows.length === 0) return 0

      const { error: err3 } = await supabase.from('budgets').insert(rows)
      if (err3) throw err3
      return rows.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_progress'] })
    },
  })
}
