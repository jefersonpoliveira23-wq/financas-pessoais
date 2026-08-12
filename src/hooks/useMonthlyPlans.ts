import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type MonthlyPlan = Database['public']['Tables']['monthly_plans']['Row']
type MonthlyPlanInsert = Database['public']['Tables']['monthly_plans']['Insert']

export function useMonthlyPlan(month: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['monthly_plans', user?.id, month],
    enabled: !!user,
    queryFn: async (): Promise<MonthlyPlan | null> => {
      const { data, error } = await supabase.from('monthly_plans').select('*').eq('month', month).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpsertMonthlyPlan() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<MonthlyPlanInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('monthly_plans')
        .upsert({ ...input, user_id: user.id }, { onConflict: 'user_id,month' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly_plans'] })
    },
  })
}
