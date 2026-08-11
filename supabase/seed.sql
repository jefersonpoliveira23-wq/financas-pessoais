-- ============================================================================
-- Dados fictícios opcionais para testar a aplicação localmente.
-- ----------------------------------------------------------------------------
-- Este script NÃO roda sozinho: como o SQL Editor do Supabase executa como
-- "postgres" (sem um usuário autenticado no contexto), é preciso indicar
-- manualmente para qual usuário os dados fictícios serão criados.
--
-- Como usar:
--   1. Cadastre-se normalmente pelo app (tela de Cadastro).
--   2. No painel do Supabase, vá em Authentication > Users e copie o UUID
--      do seu usuário de teste.
--   3. Substitua o valor abaixo por esse UUID.
--   4. Cole este script inteiro no SQL Editor do Supabase e execute.
--
-- Todos os dados aqui são fictícios — nenhuma informação financeira real.
-- ============================================================================

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <<< SUBSTITUA AQUI
  v_conta_corrente uuid;
  v_carteira uuid;
  v_cat_salario uuid;
  v_cat_moradia uuid;
  v_cat_alimentacao uuid;
  v_cat_lazer uuid;
begin
  if v_user_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Substitua v_user_id pelo UUID real do seu usuário de teste antes de rodar este script.';
  end if;

  insert into public.accounts (user_id, name, institution, type, initial_balance, initial_balance_date)
  values (v_user_id, 'Conta Corrente', 'Banco Fictício', 'conta_corrente', 2500.00, current_date - interval '60 days')
  returning id into v_conta_corrente;

  insert into public.accounts (user_id, name, institution, type, initial_balance, initial_balance_date)
  values (v_user_id, 'Carteira', null, 'dinheiro', 150.00, current_date - interval '60 days')
  returning id into v_carteira;

  insert into public.categories (user_id, name, type) values (v_user_id, 'Salário', 'receita') returning id into v_cat_salario;
  insert into public.categories (user_id, name, type) values (v_user_id, 'Moradia', 'despesa') returning id into v_cat_moradia;
  insert into public.categories (user_id, name, type) values (v_user_id, 'Alimentação', 'despesa') returning id into v_cat_alimentacao;
  insert into public.categories (user_id, name, type) values (v_user_id, 'Lazer', 'despesa') returning id into v_cat_lazer;

  insert into public.payment_methods (user_id, name) values
    (v_user_id, 'Pix'),
    (v_user_id, 'Dinheiro');

  insert into public.transactions
    (user_id, type, description, amount, transaction_date, competence_date, due_date, paid_date, account_id, destination_account_id, category_id, status, fixed_variable, is_essential)
  values
    (v_user_id, 'receita', 'Salário — mês corrente', 5000.00, date_trunc('month', current_date)::date + 4, date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 4, date_trunc('month', current_date)::date + 4, v_conta_corrente, null, v_cat_salario, 'recebido', 'fixo', true),
    (v_user_id, 'despesa', 'Aluguel', 1200.00, date_trunc('month', current_date)::date + 9, date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 9, date_trunc('month', current_date)::date + 9, v_conta_corrente, null, v_cat_moradia, 'pago', 'fixo', true),
    (v_user_id, 'despesa', 'Supermercado', 480.30, date_trunc('month', current_date)::date + 6, date_trunc('month', current_date)::date, null, date_trunc('month', current_date)::date + 6, v_conta_corrente, null, v_cat_alimentacao, 'pago', 'variavel', true),
    (v_user_id, 'despesa', 'Cinema', 60.00, date_trunc('month', current_date)::date + 12, date_trunc('month', current_date)::date, null, null, v_carteira, null, v_cat_lazer, 'pendente', 'eventual', false),
    (v_user_id, 'despesa', 'Conta de luz', 210.00, date_trunc('month', current_date)::date + 20, date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 20, null, v_conta_corrente, null, v_cat_moradia, 'pendente', 'fixo', true),
    (v_user_id, 'transferencia', 'Reforço da carteira', 100.00, current_date - 3, current_date - 3, null, null, v_conta_corrente, v_carteira, null, 'pago', null, null);

  raise notice 'Dados fictícios criados com sucesso para o usuário %', v_user_id;
end $$;
