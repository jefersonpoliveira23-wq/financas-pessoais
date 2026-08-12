-- ============================================================================
-- Migration 0005 — Fase 4: Diagnósticos e Relatórios
-- ----------------------------------------------------------------------------
-- Adiciona apenas uma view de leitura (nenhuma tabela nova): o fluxo de caixa
-- mensal realizado, usada tanto pelos Diagnósticos (nota de saúde financeira)
-- quanto pelos Relatórios (gráficos de evolução). A lógica de cálculo em si
-- (nota, alertas, agregações para os gráficos) fica no frontend, testável em
-- src/utils/ — a view só centraliza a agregação pesada no banco.
--
-- Pré-requisitos: 0001, 0002, 0003 e 0004 já aplicadas.
-- ============================================================================

-- Fluxo de caixa mensal realizado: receitas recebidas e despesas pagas
-- (mesmo critério já usado no Dashboard — nunca inclui transferências,
-- compras no cartão em aberto ou pagamentos de fatura, que não são
-- receita/despesa em si), agrupado por mês de competência.
create or replace view public.monthly_cashflow
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', competence_date)::date as month,
  coalesce(sum(amount) filter (where type = 'receita' and status = 'recebido'), 0) as income,
  coalesce(sum(amount) filter (where type = 'despesa' and status = 'pago'), 0) as expense
from public.transactions
group by user_id, date_trunc('month', competence_date)::date;
