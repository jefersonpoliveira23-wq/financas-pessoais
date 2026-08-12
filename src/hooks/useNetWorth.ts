import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type Asset = Database['public']['Tables']['assets']['Row']
type AssetInsert = Database['public']['Tables']['assets']['Insert']
type AssetUpdate = Database['public']['Tables']['assets']['Update']
type Liability = Database['public']['Tables']['liabilities']['Row']
type LiabilityInsert = Database['public']['Tables']['liabilities']['Insert']
type LiabilityUpdate = Database['public']['Tables']['liabilities']['Update']
type NetWorthSummary = Database['public']['Views']['net_worth_summary']['Row']
type AssetValueHistory = Database['public']['Tables']['asset_value_history']['Row']

export function useAssets() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['assets', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('is_archived', { ascending: true })
        .order('current_value', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useLiabilities() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['liabilities', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Liability[]> => {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .order('is_archived', { ascending: true })
        .order('current_value', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Patrimônio líquido consolidado — cálculo centralizado na view do banco. */
export function useNetWorthSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['net_worth_summary', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NetWorthSummary | null> => {
      const { data, error } = await supabase.from('net_worth_summary').select('*').maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useAssetHistory(assetId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['asset_value_history', user?.id, assetId],
    enabled: !!user && !!assetId,
    queryFn: async (): Promise<AssetValueHistory[]> => {
      const { data, error } = await supabase
        .from('asset_value_history')
        .select('*')
        .eq('asset_id', assetId!)
        .order('reference_date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

function invalidatePatrimony(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['assets'] })
  queryClient.invalidateQueries({ queryKey: ['liabilities'] })
  queryClient.invalidateQueries({ queryKey: ['net_worth_summary'] })
  queryClient.invalidateQueries({ queryKey: ['asset_value_history'] })
}

export function useCreateAsset() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<AssetInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('assets')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidatePatrimony(queryClient),
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: AssetUpdate & { id: string }) => {
      const { data, error } = await supabase.from('assets').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidatePatrimony(queryClient),
  })
}

export function useCreateLiability() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<LiabilityInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('liabilities')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidatePatrimony(queryClient),
  })
}

export function useUpdateLiability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: LiabilityUpdate & { id: string }) => {
      const { data, error } = await supabase.from('liabilities').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidatePatrimony(queryClient),
  })
}
