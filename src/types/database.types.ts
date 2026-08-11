/**
 * Tipos do banco de dados (Supabase / PostgreSQL).
 *
 * Este arquivo é escrito manualmente para acompanhar a migration
 * `supabase/migrations/0001_fase1_fundacao.sql`. Assim que o projeto Supabase
 * estiver criado, o ideal é substituir (ou conferir) este arquivo pelo gerado
 * automaticamente com:
 *
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.types.ts
 *
 * Novas tabelas serão adicionadas aqui conforme as próximas fases (cartões,
 * dívidas, orçamento, metas, patrimônio, importação, etc.).
 *
 * O campo `Relationships: []` em cada tabela/view é exigido pelo tipo
 * `GenericTable`/`GenericView` do @supabase/postgrest-js — como as regras de
 * integridade entre usuários são reforçadas por trigger (e não por foreign
 * keys usadas em joins aninhados do PostgREST), a lista fica vazia.
 */

export type AccountType =
  'conta_corrente' | 'conta_digital' | 'poupanca' | 'dinheiro' | 'carteira_digital' | 'investimento' | 'outra'

export type CategoryType = 'receita' | 'despesa' | 'ambos'

export type TransactionType = 'receita' | 'despesa' | 'transferencia'

export type TransactionStatus =
  'previsto' | 'pendente' | 'pago' | 'recebido' | 'atrasado' | 'cancelado' | 'cancelado_por_quitacao'

export type FixedVariable = 'fixo' | 'variavel' | 'eventual'

export type Theme = 'claro' | 'escuro' | 'automatico'

export type CardRecognitionMode = 'data_compra' | 'mes_fatura'

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
          account_id: string
          destination_account_id: string | null
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
          account_id: string
          destination_account_id?: string | null
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
    }
    Functions: Record<string, never>
  }
}
