import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type Debt = Database['public']['Tables']['debts']['Row']
type DebtInsert = Database['public']['Tables']['debts']['Insert']
type DebtUpdate = Database['public']['Tables']['debts']['Update']
type DebtPayment = Database['public']['Tables']['debt_payments']['Row']

export function useDebts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['debts', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Debt[]> => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('status', { ascending: true })
        .order('outstanding_balance', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Todos os pagamentos de dívida do usuário desde uma data — usado no
 * dashboard para calcular quanto de principal foi abatido nos últimos meses
 * (ver `@/utils/dashboardInsights`). Diferente de `useDebtPayments`, que é
 * por dívida específica.
 */
export function useAllDebtPayments(sinceISO: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['debt_payments_all', user?.id, sinceISO],
    enabled: !!user,
    queryFn: async (): Promise<DebtPayment[]> => {
      const { data, error } = await supabase.from('debt_payments').select('*').gte('payment_date', sinceISO)
      if (error) throw error
      return data
    },
  })
}

export function useDebtPayments(debtId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['debt_payments', user?.id, debtId],
    enabled: !!user && !!debtId,
    queryFn: async (): Promise<DebtPayment[]> => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId!)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateDebt() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<DebtInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('debts')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['net_worth_summary'] })
    },
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: DebtUpdate & { id: string }) => {
      const { data, error } = await supabase.from('debts').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['net_worth_summary'] })
    },
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['net_worth_summary'] })
    },
  })
}

/** Pagamento + abatimento do saldo devedor, atômico via RPC (security invoker). */
export function useRegisterDebtPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      debtId: string
      paymentDate: string
      amount: number
      interestPortion?: number | null
      principalPortion?: number | null
      notes?: string | null
    }) => {
      const { data, error } = await supabase.rpc('register_debt_payment', {
        p_debt_id: input.debtId,
        p_payment_date: input.paymentDate,
        p_amount: input.amount,
        p_interest_portion: input.interestPortion ?? null,
        p_principal_portion: input.principalPortion ?? null,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt_payments'] })
      queryClient.invalidateQueries({ queryKey: ['net_worth_summary'] })
    },
  })
}
