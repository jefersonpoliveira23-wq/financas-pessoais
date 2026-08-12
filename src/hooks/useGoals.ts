import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type Goal = Database['public']['Tables']['goals']['Row']
type GoalInsert = Database['public']['Tables']['goals']['Insert']
type GoalUpdate = Database['public']['Tables']['goals']['Update']
type GoalContribution = Database['public']['Tables']['goal_contributions']['Row']

export function useGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['goals', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('status', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Soma de aportes por meta (para metas independentes). */
export function useGoalContributionSums() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['goal_contribution_sums', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase.from('goal_contributions').select('goal_id, amount')
      if (error) throw error
      const sums = new Map<string, number>()
      for (const row of data) {
        sums.set(row.goal_id, (sums.get(row.goal_id) ?? 0) + row.amount)
      }
      return sums
    },
  })
}

export function useGoalContributions(goalId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['goal_contributions', user?.id, goalId],
    enabled: !!user && !!goalId,
    queryFn: async (): Promise<GoalContribution[]> => {
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId!)
        .order('contribution_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<GoalInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: GoalUpdate & { id: string }) => {
      const { data, error } = await supabase.from('goals').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useAddGoalContribution() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { goalId: string; contributionDate: string; amount: number; notes?: string | null }) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('goal_contributions')
        .insert({
          user_id: user.id,
          goal_id: input.goalId,
          contribution_date: input.contributionDate,
          amount: input.amount,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal_contributions'] })
      queryClient.invalidateQueries({ queryKey: ['goal_contribution_sums'] })
    },
  })
}
