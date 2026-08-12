// Supabase Edge Function — exclusão segura e definitiva da conta do usuário.
//
// Por que isso não pode viver no frontend: excluir o usuário de auth.users
// exige a chave `service_role` (privilégios administrativos), que nunca deve
// ser exposta no navegador — qualquer pessoa com essa chave teria acesso
// total ao banco, ignorando o RLS. Esta função roda no servidor do Supabase,
// nunca no navegador, e a chave fica apenas nas variáveis de ambiente do
// projeto (configuradas automaticamente pelo Supabase, não precisam ser
// cadastradas manualmente).
//
// Segurança: a função só apaga a conta de quem está fazendo a chamada — o
// id do usuário nunca vem do corpo da requisição (que poderia ser
// manipulado), e sim extraído do token JWT validado, exatamente como o RLS
// faria. Um usuário não pode, de forma alguma, apagar a conta de outro.
//
// Deploy: supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente "anon" com o token do usuário: usado só para validar quem está
    // chamando (via getUser), respeitando o mesmo fluxo de autenticação do
    // resto do app — nunca confiamos em um user_id vindo do corpo da requisição.
    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente com service_role: só aqui, só neste momento, só para excluir
    // exatamente o usuário já autenticado acima.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Todas as tabelas do app referenciam auth.users com "on delete cascade"
    // (profiles, accounts, transactions, credit_cards, debts, goals, assets,
    // liabilities, budgets, monthly_plans, imports, audit_logs...) — apagar o
    // usuário no Auth já remove todos os dados financeiros associados, sem
    // deixar registros órfãos.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Não foi possível excluir a conta. Tente novamente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Erro inesperado ao excluir a conta.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
