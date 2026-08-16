import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'

type AuthorizedEmail = Database['public']['Tables']['authorized_emails']['Row']

export function useAuthorizedEmails() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['authorized_emails', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AuthorizedEmail[]> => {
      const { data, error } = await supabase.from('authorized_emails').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAddAuthorizedEmail() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { email: string; note?: string }) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { data, error } = await supabase
        .from('authorized_emails')
        .insert({ email: input.email.trim().toLowerCase(), note: input.note || null, added_by: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['authorized_emails'] }),
  })
}

export function useRemoveAuthorizedEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('authorized_emails').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['authorized_emails'] }),
  })
}
