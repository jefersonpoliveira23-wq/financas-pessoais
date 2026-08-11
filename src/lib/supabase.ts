import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha alto e cedo: é preferível travar no início do que operar sem conexão válida.
  throw new Error(
    'Variáveis de ambiente do Supabase ausentes. Copie ".env.example" para ".env" e preencha ' +
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY com os dados do seu projeto Supabase.',
  )
}

/**
 * Cliente Supabase único do frontend.
 *
 * Importante: aqui só é utilizada a chave "anon/public". Toda a segurança de acesso aos dados
 * é garantida no banco por meio de Row Level Security (RLS) — nunca confie apenas na interface
 * para restringir o que o usuário pode ver ou alterar.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
