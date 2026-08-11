import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type Account = Database['public']['Tables']['accounts']['Row']
type AccountInsert = Database['public']['Tables']['accounts']['Insert']
type AccountUpdate = Database['public']['Tables']['accounts']['Update']
type AccountBalance = Database['public']['Views']['account_balances']['Row']

export function useAccounts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['accounts', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('is_archived', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Saldo atual de cada conta, vindo da view account_balances (fonte única, sem duplicar cálculo no frontend). */
export function useAccountBalances() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['account_balances', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AccountBalance[]> => {
      const { data, error } = await supabase.from('account_balances').select('*')
      if (error) throw error
      return data
    },
  })
}

export function useCreateAccount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<AccountInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: AccountUpdate & { id: string }) => {
      const { data, error } = await supabase.from('accounts').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

/** Arquivar (não excluir fisicamente) — preserva histórico de movimentações. */
export function useArchiveAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').update({ is_archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
