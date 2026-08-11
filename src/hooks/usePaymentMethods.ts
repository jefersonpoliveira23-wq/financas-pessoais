import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

export function usePaymentMethods() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['payment_methods', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase.from('payment_methods').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreatePaymentMethod() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({ user_id: user.id, name })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment_methods'] }),
  })
}
