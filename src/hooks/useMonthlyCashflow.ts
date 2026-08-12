import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type MonthlyCashflow = Database['public']['Views']['monthly_cashflow']['Row']

/** Fluxo de caixa mensal realizado (receitas recebidas x despesas pagas), últimos N meses. */
export function useMonthlyCashflow(months = 12) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['monthly_cashflow', user?.id, months],
    enabled: !!user,
    queryFn: async (): Promise<MonthlyCashflow[]> => {
      const since = new Date()
      since.setDate(1)
      since.setMonth(since.getMonth() - (months - 1))
      const sinceISO = since.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('monthly_cashflow')
        .select('*')
        .gte('month', sinceISO)
        .order('month', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
