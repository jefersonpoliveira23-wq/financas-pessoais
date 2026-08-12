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

export type DebtStatus = 'ativa' | 'quitada' | 'renegociada'

export type GoalMode = 'independente' | 'alocado'

export type GoalStatus = 'ativa' | 'concluida' | 'arquivada'

export type AssetCategory = 'imovel' | 'veiculo' | 'investimento' | 'negocio' | 'outro'

export type LiabilityCategory = 'financiamento_imovel' | 'financiamento_veiculo' | 'emprestimo' | 'outro'

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
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          month: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          month: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string
          name: string
          creditor: string | null
          original_amount: number
          outstanding_balance: number
          monthly_interest_rate: number
          minimum_payment: number
          due_day: number | null
          status: DebtStatus
          settled_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          creditor?: string | null
          original_amount: number
          outstanding_balance: number
          monthly_interest_rate?: number
          minimum_payment?: number
          due_day?: number | null
          status?: DebtStatus
          settled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['debts']['Insert']>
        Relationships: []
      }
      debt_payments: {
        Row: {
          id: string
          user_id: string
          debt_id: string
          payment_date: string
          amount: number
          interest_portion: number | null
          principal_portion: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          debt_id: string
          payment_date: string
          amount: number
          interest_portion?: number | null
          principal_portion?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['debt_payments']['Insert']>
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          mode: GoalMode
          target_amount: number
          target_date: string | null
          linked_account_id: string | null
          is_emergency_fund: boolean
          status: GoalStatus
          color: string | null
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          mode?: GoalMode
          target_amount: number
          target_date?: string | null
          linked_account_id?: string | null
          is_emergency_fund?: boolean
          status?: GoalStatus
          color?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['goals']['Insert']>
        Relationships: []
      }
      goal_contributions: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          contribution_date: string
          amount: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          contribution_date: string
          amount: number
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['goal_contributions']['Insert']>
        Relationships: []
      }
      assets: {
        Row: {
          id: string
          user_id: string
          name: string
          category: AssetCategory
          current_value: number
          acquisition_value: number | null
          acquisition_date: string | null
          notes: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: AssetCategory
          current_value: number
          acquisition_value?: number | null
          acquisition_date?: string | null
          notes?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
        Relationships: []
      }
      liabilities: {
        Row: {
          id: string
          user_id: string
          name: string
          category: LiabilityCategory
          current_value: number
          linked_debt_id: string | null
          notes: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: LiabilityCategory
          current_value: number
          linked_debt_id?: string | null
          notes?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['liabilities']['Insert']>
        Relationships: []
      }
      asset_value_history: {
        Row: {
          id: string
          user_id: string
          asset_id: string
          reference_date: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          asset_id: string
          reference_date: string
          value: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['asset_value_history']['Insert']>
        Relationships: []
      }
      monthly_plans: {
        Row: {
          id: string
          user_id: string
          month: string
          expected_income: number
          planned_savings: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          expected_income?: number
          planned_savings?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['monthly_plans']['Insert']>
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
      budget_progress: {
        Row: {
          budget_id: string
          user_id: string
          category_id: string
          month: string
          budgeted: number
          spent: number
        }
        Relationships: []
      }
      net_worth_summary: {
        Row: {
          user_id: string
          accounts_total: number
          assets_total: number
          liabilities_total: number
          debts_total: number
          net_worth: number
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
      register_debt_payment: {
        Args: {
          p_debt_id: string
          p_payment_date: string
          p_amount: number
          p_interest_portion?: number | null
          p_principal_portion?: number | null
          p_notes?: string | null
        }
        Returns: string
      }
    }
  }
}
