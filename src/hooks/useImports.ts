import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ResolvedImportRow } from '@/utils/txtImportParser'
import type { Database } from '@/types/database.types'

type ImportRow = Database['public']['Tables']['imports']['Row']

/** Calcula o hash SHA-256 do conteúdo do arquivo (Web Crypto nativa, sem dependências). */
export async function computeFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function useImportHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['imports', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ImportRow[]> => {
      const { data, error } = await supabase.from('imports').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Verifica se este arquivo (pelo hash) já foi importado antes pelo usuário. */
export function useCheckPreviousImport() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (fileHash: string) => {
      if (!user) return null
      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('file_hash', fileHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Registra a importação (status "pendente") e as linhas cruas — ainda sem criar nenhuma movimentação. */
export function useCreateImportBatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      filename,
      fileHash,
      rows,
    }: {
      filename: string
      fileHash: string
      rows: ResolvedImportRow[]
    }) => {
      if (!user) throw new Error('Usuário não autenticado.')

      const { data: importRecord, error: importError } = await supabase
        .from('imports')
        .insert({
          user_id: user.id,
          filename,
          file_hash: fileHash,
          total_rows: rows.length,
          accepted_rows: rows.filter((r) => r.isSelectable).length,
          rejected_rows: rows.filter((r) => !r.isSelectable).length,
        })
        .select()
        .single()
      if (importError) throw importError

      const rowsPayload = rows.map((row) => ({
        import_id: importRecord.id,
        user_id: user.id,
        row_number: row.rowNumber,
        raw_data: row.raw,
        status: row.isSelectable ? ('pendente' as const) : ('rejeitada' as const),
        error_message: row.errors.length > 0 ? row.errors.join(' ') : null,
      }))

      const { data: insertedRows, error: rowsError } = await supabase.from('import_rows').insert(rowsPayload).select()
      if (rowsError) throw rowsError

      return { importRecord, importRows: insertedRows }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })
}

interface ConfirmImportInput {
  importId: string
  newCategories: { tempKey: string; name: string; type: 'receita' | 'despesa' }[]
  rows: {
    importRowId: string
    type: 'receita' | 'despesa'
    description: string
    amount: number
    transactionDate: string
    competenceDate: string
    dueDate: string | null
    accountId: string | null
    cardId: string | null
    categoryId: string | null
    categoryTempKey: string | null
    status: string
    fixedVariable: string | null
    isEssential: boolean | null
    isRecurring: boolean
    installmentNumber: number | null
    installmentTotal: number | null
    notes: string | null
  }[]
}

export function useConfirmImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ConfirmImportInput) => {
      const { data, error } = await supabase.rpc('confirm_import', {
        p_import_id: input.importId,
        p_new_categories: input.newCategories.map((c) => ({ temp_key: c.tempKey, name: c.name, type: c.type })),
        p_rows: input.rows.map((r) => ({
          import_row_id: r.importRowId,
          type: r.type,
          description: r.description,
          amount: r.amount,
          transaction_date: r.transactionDate,
          competence_date: r.competenceDate,
          due_date: r.dueDate,
          account_id: r.accountId,
          card_id: r.cardId,
          category_id: r.categoryId,
          category_temp_key: r.categoryTempKey,
          status: r.status,
          fixed_variable: r.fixedVariable,
          is_essential: r.isEssential,
          is_recurring: r.isRecurring,
          installment_number: r.installmentNumber,
          installment_total: r.installmentTotal,
          notes: r.notes,
        })),
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['account_balances'] })
    },
  })
}

export function useCancelImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase.from('imports').update({ status: 'cancelado' }).eq('id', importId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports'] }),
  })
}
