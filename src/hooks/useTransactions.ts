import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export interface TransactionFilters {
  from?: string
  to?: string
  accountId?: string
  categoryId?: string
  status?: string
  type?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['transactions', user?.id, filters],
    enabled: !!user,
    queryFn: async (): Promise<Transaction[]> => {
      let query = supabase.from('transactions').select('*').order('transaction_date', { ascending: false })

      if (filters.from) query = query.gte('competence_date', filters.from)
      if (filters.to) query = query.lte('competence_date', filters.to)
      if (filters.accountId) query = query.eq('account_id', filters.accountId)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
      if (filters.status) query = query.eq('status', filters.status as Transaction['status'])
      if (filters.type) query = query.eq('type', filters.type as Transaction['type'])

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useCreateTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<TransactionInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase.from('transactions').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

/** Marca uma movimentação como paga/recebida hoje (atalho usado no dashboard e na lista). */
export function useMarkTransactionPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, paidDate }: { id: string; status: 'pago' | 'recebido'; paidDate: string }) => {
      const { error } = await supabase.from('transactions').update({ status, paid_date: paidDate }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}
