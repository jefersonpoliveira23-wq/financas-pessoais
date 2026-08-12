/**
 * Tipos do banco de dados (Supabase / PostgreSQL).
 *
 * Este arquivo é escrito manualmente para acompanhar as migrations em
 * `supabase/migrations/` (0001 — Fundação, 0002 — Cartões/Parcelamento/
 * Recorrência). Assim que o projeto Supabase estiver criado, o ideal é
 * substituir (ou conferir) este arquivo pelo gerado automaticamente com:
 *
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.types.ts
 *
 * O campo `Relationships: []` em cada tabela/view é exigido pelo tipo
 * `GenericTable`/`GenericView` do @supabase/postgrest-js — como as regras de
 * integridade entre usuários são reforçadas por trigger (e não por foreign
 * keys usadas em joins aninhados do PostgREST), a lista fica vazia.
 */

export type AccountType =
  'conta_corrente' | 'conta_digital' | 'poupanca' | 'dinheiro' | 'carteira_digital' | 'investimento' | 'outra'

export type CategoryType = 'receita' | 'despesa' | 'ambos'

export type TransactionType = 'receita' | 'despesa' | 'transferencia' | 'compra_cartao' | 'pagamento_fatura'

export type TransactionStatus =
  'previsto' | 'pendente' | 'pago' | 'recebido' | 'atrasado' | 'cancelado' | 'cancelado_por_quitacao'

export type FixedVariable = 'fixo' | 'variavel' | 'eventual'

export type Theme = 'claro' | 'escuro' | 'automatico'

export type CardRecognitionMode = 'data_compra' | 'mes_fatura'

export type RecurrenceFrequency =
  'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'personalizado'

export type RecurrenceStatus = 'ativa' | 'pausada' | 'encerrada'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          week_start_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          avatar_url?: string | null
          week_start_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          currency: string
          theme: Theme
          card_recognition_mode: CardRecognitionMode
          decimal_separator: 'virgula' | 'ponto'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          currency?: string
          theme?: Theme
          card_recognition_mode?: CardRecognitionMode
          decimal_separator?: 'virgula' | 'ponto'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
        Relationships: []
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          name: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payment_methods']['Insert']>
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: CategoryType
          color: string | null
          icon: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: CategoryType
          color?: string | null
          icon?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }
      subcategories: {
        Row: {
          id: string
          user_id: string
          category_id: string
          name: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          name: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['subcategories']['Insert']>
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          institution: string | null
          type: AccountType
          initial_balance: number
          initial_balance_date: string
          color: string | null
          icon: string | null
          include_in_available_balance: boolean
          include_in_net_worth: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          institution?: string | null
          type: AccountType
          initial_balance?: number
          initial_balance_date?: string
          color?: string | null
          icon?: string | null
          include_in_available_balance?: boolean
          include_in_net_worth?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: TransactionType
          description: string
          amount: number
          transaction_date: string
          competence_date: string
          due_date: string | null
          paid_date: string | null
          account_id: string | null
          destination_account_id: string | null
          card_id: string | null
          installment_group_id: string | null
          installment_number: number | null
          installment_total: number | null
          recurrence_rule_id: string | null
          category_id: string | null
          subcategory_id: string | null
          payment_method_id: string | null
          status: TransactionStatus
          fixed_variable: FixedVariable | null
          is_essential: boolean | null
          is_recurring: boolean
          notes: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: TransactionType
          description: string
          amount: number
          transaction_date: string
          competence_date: string
          due_date?: string | null
          paid_date?: string | null
          account_id?: string | null
          destination_account_id?: string | null
          card_id?: string | null
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          recurrence_rule_id?: string | null
          category_id?: string | null
          subcategory_id?: string | null
          payment_method_id?: string | null
          status?: TransactionStatus
          fixed_variable?: FixedVariable | null
          is_essential?: boolean | null
          is_recurring?: boolean
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
      credit_cards: {
        Row: {
          id: string
          user_id: string
          name: string
          institution: string | null
          brand: string | null
          credit_limit: number
          closing_day: number
          due_day: number
          default_payment_account_id: string | null
          color: string | null
          icon: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          institution?: string | null
          brand?: string | null
          credit_limit: number
          closing_day: number
          due_day: number
          default_payment_account_id?: string | null
          color?: string | null
          icon?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['credit_cards']['Insert']>
        Relationships: []
      }
      installment_groups: {
        Row: {
          id: string
          user_id: string
          description: string
          total_installments: number
          account_id: string | null
          card_id: string | null
          category_id: string | null
          subcategory_id: string | null
          payment_method_id: string | null
          fixed_variable: FixedVariable | null
          is_essential: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          total_installments: number
          account_id?: string | null
          card_id?: string | null
          category_id?: string | null
          subcategory_id?: string | null
          payment_method_id?: string | null
          fixed_variable?: FixedVariable | null
          is_essential?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['installment_groups']['Insert']>
        Relationships: []
      }
      recurrence_rules: {
        Row: {
          id: string
          user_id: string
          description: string
          type: 'receita' | 'despesa'
          amount: number
          account_id: string | null
          card_id: string | null
          category_id: string | null
          subcategory_id: string | null
          payment_method_id: string | null
          fixed_variable: FixedVariable | null
          is_essential: boolean | null
          frequency: RecurrenceFrequency
          custom_interval_days: number | null
          start_date: string
          due_day: number | null
          end_date: string | null
          occurrences_count: number | null
          is_indefinite: boolean
          adjust_to_business_day: boolean
          status: RecurrenceStatus
          last_materialized_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          type: 'receita' | 'despesa'
          amount: number
          account_id?: string | null
          card_id?: string | null
          category_id?: string | null
          subcategory_id?: string | null
          payment_method_id?: string | null
          fixed_variable?: FixedVariable | null
          is_essential?: boolean | null
          frequency: RecurrenceFrequency
          custom_interval_days?: number | null
          start_date: string
          due_day?: number | null
          end_date?: string | null
          occurrences_count?: number | null
          is_indefinite?: boolean
          adjust_to_business_day?: boolean
          status?: RecurrenceStatus
          last_materialized_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recurrence_rules']['Insert']>
        Relationships: []
      }
      imports: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_hash: string
          total_rows: number
          accepted_rows: number
          rejected_rows: number
          status: 'pendente' | 'confirmado' | 'cancelado'
          created_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_hash: string
          total_rows?: number
          accepted_rows?: number
          rejected_rows?: number
          status?: 'pendente' | 'confirmado' | 'cancelado'
          created_at?: string
          confirmed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['imports']['Insert']>
        Relationships: []
      }
      import_rows: {
        Row: {
          id: string
          import_id: string
          user_id: string
          row_number: number
          raw_data: Record<string, unknown>
          status: 'pendente' | 'aceita' | 'rejeitada' | 'ignorada'
          error_message: string | null
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          import_id: string
          user_id: string
          row_number: number
          raw_data: Record<string, unknown>
          status?: 'pendente' | 'aceita' | 'rejeitada' | 'ignorada'
          error_message?: string | null
          transaction_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['import_rows']['Insert']>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          table_name: string
          record_id: string
          action: 'insert' | 'update' | 'delete'
          changed_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          table_name: string
          record_id: string
          action: 'insert' | 'update' | 'delete'
          changed_data?: Record<string, unknown> | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
        Relationships: []
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string
          user_id: string
          name: string
          initial_balance: number
          current_balance: number
        }
        Relationships: []
      }
      credit_card_summary: {
        Row: {
          card_id: string
          user_id: string
          name: string
          credit_limit: number
          used_limit: number
          available_limit: number
        }
        Relationships: []
      }
    }
    Functions: {
      create_installment_group: {
        Args: {
          p_description: string
          p_account_id: string | null
          p_card_id: string | null
          p_category_id: string | null
          p_subcategory_id: string | null
          p_payment_method_id: string | null
          p_fixed_variable: FixedVariable | null
          p_is_essential: boolean | null
          p_installments: unknown
        }
        Returns: Database['public']['Tables']['transactions']['Row'][]
      }
      materialize_recurrence_rule: {
        Args: { p_rule_id: string; p_until: string }
        Returns: Database['public']['Tables']['transactions']['Row'][]
      }
      confirm_import: {
        Args: { p_import_id: string; p_new_categories: unknown; p_rows: unknown }
        Returns: Database['public']['Tables']['transactions']['Row'][]
      }
    }
  }
}
