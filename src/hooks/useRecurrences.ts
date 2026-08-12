import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toISODateOnly } from '@/utils/format'
import type { Database } from '@/types/database.types'

type RecurrenceRule = Database['public']['Tables']['recurrence_rules']['Row']
type RecurrenceRuleInsert = Database['public']['Tables']['recurrence_rules']['Insert']

export function useRecurrenceRules() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['recurrence_rules', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RecurrenceRule[]> => {
      const { data, error } = await supabase
        .from('recurrence_rules')
        .select('*')
        .order('status', { ascending: true })
        .order('description', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useCreateRecurrenceRule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<RecurrenceRuleInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('recurrence_rules')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error

      // Materializa imediatamente uma janela curta (hoje + 3 meses) para que
      // as próximas ocorrências já apareçam em Movimentações e no Calendário.
      await supabase.rpc('materialize_recurrence_rule', {
        p_rule_id: data.id,
        p_until: toISODateOnly(addMonths(new Date(), 3)),
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence_rules'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

export function useSetRecurrenceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ativa' | 'pausada' | 'encerrada' }) => {
      const { error } = await supabase.from('recurrence_rules').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurrence_rules'] }),
  })
}

/** Garante que todas as recorrências ativas têm ocorrências geradas até a janela informada (padrão: 3 meses). */
export function useMaterializeActiveRecurrences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rules: RecurrenceRule[]) => {
      if (!user) return
      const until = toISODateOnly(addMonths(new Date(), 3))
      for (const rule of rules) {
        if (rule.status !== 'ativa') continue
        if (rule.last_materialized_date && rule.last_materialized_date >= until) continue
        await supabase.rpc('materialize_recurrence_rule', { p_rule_id: rule.id, p_until: until })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
      queryClient.invalidateQueries({ queryKey: ['recurrence_rules'] })
    },
  })
}
