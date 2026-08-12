import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type CreditCard = Database['public']['Tables']['credit_cards']['Row']
type CreditCardInsert = Database['public']['Tables']['credit_cards']['Insert']
type CreditCardUpdate = Database['public']['Tables']['credit_cards']['Update']
type CreditCardSummary = Database['public']['Views']['credit_card_summary']['Row']

export function useCreditCards() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['credit_cards', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CreditCard[]> => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('is_archived', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Limite utilizado/disponível por cartão, calculado no banco (fonte única). */
export function useCreditCardSummaries() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['credit_card_summary', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CreditCardSummary[]> => {
      const { data, error } = await supabase.from('credit_card_summary').select('*')
      if (error) throw error
      return data
    },
  })
}

export function useCreateCreditCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreditCardInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] })
      queryClient.invalidateQueries({ queryKey: ['credit_card_summary'] })
    },
  })
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: CreditCardUpdate & { id: string }) => {
      const { data, error } = await supabase.from('credit_cards').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] })
      queryClient.invalidateQueries({ queryKey: ['credit_card_summary'] })
    },
  })
}

export function useArchiveCreditCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').update({ is_archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  })
}
