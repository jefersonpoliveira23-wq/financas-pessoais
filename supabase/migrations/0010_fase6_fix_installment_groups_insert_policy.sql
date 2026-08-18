-- Fix: 403 Forbidden ao confirmar importação de linhas com parcelamento
-- ("parcela 1 de 6" etc.).
--
-- Causa: a tabela public.installment_groups tem RLS habilitado, mas só
-- existiam políticas de SELECT, UPDATE e DELETE (todas com
-- auth.uid() = user_id). Não havia política de INSERT, então o Postgres
-- nega qualquer inserção feita como o usuário autenticado — e é
-- exatamente isso que public.confirm_import faz (SECURITY INVOKER) ao
-- processar uma linha com "is_recurring" + parcela X de Y.
--
-- Correção: adicionar a política de INSERT que faltava, seguindo o
-- mesmo padrão das demais políticas da tabela (auth.uid() = user_id).

create policy installment_groups_insert_own
  on public.installment_groups
  for insert
  with check (auth.uid() = user_id);
