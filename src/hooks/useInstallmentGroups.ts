import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type InstallmentGroup = Database['public']['Tables']['installment_groups']['Row']

/**
 * Só id + categoria de cada grupo de parcelamento — usado para agregar
 * dívidas por categoria no dashboard (ver `@/utils/debtsByCategory`).
 * Escopado por RLS (auth.uid() = user_id), igual a todo o resto do app.
 */
export function useInstallmentGroupCategories() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['installment_groups_categories', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Pick<InstallmentGroup, 'id' | 'category_id'>[]> => {
      const { data, error } = await supabase.from('installment_groups').select('id, category_id')
      if (error) throw error
      return data
    },
  })
}
