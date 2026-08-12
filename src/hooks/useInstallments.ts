import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { InstallmentPreviewItem } from '@/utils/installments'
import type { Database } from '@/types/database.types'

type FixedVariable = Database['public']['Tables']['transactions']['Row']['fixed_variable']

export interface CreateInstallmentGroupInput {
  description: string
  accountId: string | null
  cardId: string | null
  categoryId: string | null
  subcategoryId: string | null
  paymentMethodId: string | null
  fixedVariable: FixedVariable
  isEssential: boolean | null
  installments: InstallmentPreviewItem[]
  /** Status a aplicar na 1ª parcela (as demais nascem sempre como "previsto"). */
  firstInstallmentStatus: string
}

/**
 * Cria o grupo de parcelas inteiro (parcela 1 incluída) em uma única
 * transação de banco via RPC — evita geração parcial se algo falhar no meio
 * do caminho (ver supabase/migrations/0002_fase2_operacoes.sql).
 */
export function useCreateInstallmentGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateInstallmentGroupInput) => {
      const { data, error } = await supabase.rpc('create_installment_group', {
        p_description: input.description,
        p_account_id: input.accountId,
        p_card_id: input.cardId,
        p_category_id: input.categoryId,
        p_subcategory_id: input.subcategoryId,
        p_payment_method_id: input.paymentMethodId,
        p_fixed_variable: input.fixedVariable,
        p_is_essential: input.isEssential,
        p_installments: input.installments.map((item) => ({
          installment_number: item.installmentNumber,
          transaction_date: item.transactionDate,
          competence_date: item.competenceDate,
          due_date: item.dueDate,
          amount: item.amount,
          status: item.installmentNumber === 1 ? input.firstInstallmentStatus : 'previsto',
        })),
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] })
      queryClient.invalidateQueries({ queryKey: ['credit_card_summary'] })
    },
  })
}

export type InstallmentEditScope = 'only_this' | 'this_and_future' | 'all'

/** Exclui parcelas do grupo conforme o escopo escolhido, e ajusta total_installments do grupo restante. */
export function useDeleteInstallmentScope() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transactionId,
      groupId,
      installmentNumber,
      scope,
    }: {
      transactionId: string
      groupId: string
      installmentNumber: number
      scope: InstallmentEditScope
    }) => {
      if (scope === 'only_this') {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId)
        if (error) throw error
      } else {
        let query = supabase.from('transactions').delete().eq('installment_group_id', groupId)
        if (scope === 'this_and_future') query = query.gte('installment_number', installmentNumber)
        const { error } = await query
        if (error) throw error
      }

      // Atualiza (ou remove) o grupo conforme quantas parcelas restaram.
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('installment_group_id', groupId)

      if (!count) {
        await supabase.from('installment_groups').delete().eq('id', groupId)
      } else {
        await supabase.from('installment_groups').update({ total_installments: count }).eq('id', groupId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] })
      queryClient.invalidateQueries({ queryKey: ['credit_card_summary'] })
    },
  })
}

/** Atualiza descrição/categoria/etc. desta parcela, das próximas, ou de todas. */
export function useUpdateInstallmentScope() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transactionId,
      groupId,
      installmentNumber,
      scope,
      changes,
    }: {
      transactionId: string
      groupId: string
      installmentNumber: number
      scope: InstallmentEditScope
      changes: Partial<Database['public']['Tables']['transactions']['Update']>
    }) => {
      if (scope === 'only_this') {
        const { error } = await supabase.from('transactions').update(changes).eq('id', transactionId)
        if (error) throw error
        return
      }
      let query = supabase.from('transactions').update(changes).eq('installment_group_id', groupId)
      if (scope === 'this_and_future') query = query.gte('installment_number', installmentNumber)
      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] })
      queryClient.invalidateQueries({ queryKey: ['credit_card_summary'] })
    },
  })
}
