-- ============================================================================
-- Migration 0002 — Fase 2: Operações financeiras
-- ----------------------------------------------------------------------------
-- Adiciona: cartões de crédito, parcelamento automático (installment_groups),
-- recorrências (recurrence_rules), e estende "transactions" com os tipos
-- "compra_cartao" e "pagamento_fatura" — sem quebrar nenhum dado já gravado
-- pela migration 0001 (tudo aqui é ALTER TABLE ou CREATE TABLE novo).
--
-- Pré-requisito: 0001_fase1_fundacao.sql já aplicada.
-- ============================================================================

-- ============================================================================
-- credit_cards
-- ============================================================================
create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  institution text,
  brand text,
  credit_limit numeric(14, 2) not null check (credit_limit >= 0),
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  default_payment_account_id uuid references public.accounts (id) on delete set null,
  color text,
  icon text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_cards enable row level security;
create index if not exists idx_credit_cards_user on public.credit_cards (user_id);

create policy "credit_cards_all_own" on public.credit_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_credit_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

create or replace function public.check_credit_card_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.default_payment_account_id is not null then
    select user_id into owner from public.accounts where id = new.default_payment_account_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Conta padrão de pagamento não pertence ao usuário informado';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_credit_cards_check_owner
  before insert or update on public.credit_cards
  for each row execute function public.check_credit_card_owner();

-- ============================================================================
-- installment_groups — metadados compartilhados de um parcelamento
-- ----------------------------------------------------------------------------
-- Cada parcela em si é uma linha normal em "transactions" (installment_number
-- de installment_total), vinculada por installment_group_id. O grupo guarda
-- os atributos compartilhados para permitir editar "esta e as próximas" ou
-- "todas as parcelas" de forma consistente.
-- ============================================================================
create table if not exists public.installment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  total_installments smallint not null check (total_installments >= 2),
  account_id uuid references public.accounts (id) on delete restrict,
  card_id uuid references public.credit_cards (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  fixed_variable text check (fixed_variable in ('fixo', 'variavel', 'eventual')),
  is_essential boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_installment_group_account_or_card check (
    (account_id is not null and card_id is null) or (account_id is null and card_id is not null)
  )
);

alter table public.installment_groups enable row level security;
create index if not exists idx_installment_groups_user on public.installment_groups (user_id);

create policy "installment_groups_select_own" on public.installment_groups
  for select using (auth.uid() = user_id);
create policy "installment_groups_update_own" on public.installment_groups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "installment_groups_delete_own" on public.installment_groups
  for delete using (auth.uid() = user_id);
-- Sem policy de INSERT direta: grupos só são criados pela função
-- create_installment_group (abaixo), que roda como o próprio usuário
-- (security invoker) mas centraliza a regra "mínimo 2 parcelas".

create trigger trg_installment_groups_updated_at
  before update on public.installment_groups
  for each row execute function public.set_updated_at();

-- ============================================================================
-- recurrence_rules
-- ============================================================================
create table if not exists public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  type text not null check (type in ('receita', 'despesa')),
  amount numeric(14, 2) not null check (amount > 0),
  account_id uuid references public.accounts (id) on delete restrict,
  card_id uuid references public.credit_cards (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  fixed_variable text check (fixed_variable in ('fixo', 'variavel', 'eventual')),
  is_essential boolean,

  frequency text not null check (
    frequency in ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'personalizado')
  ),
  custom_interval_days smallint check (custom_interval_days > 0),
  start_date date not null,
  due_day smallint check (due_day between 1 and 31),
  end_date date,
  occurrences_count smallint check (occurrences_count > 0),
  is_indefinite boolean not null default true,
  adjust_to_business_day boolean not null default false,

  status text not null default 'ativa' check (status in ('ativa', 'pausada', 'encerrada')),
  -- Até qual data a série já foi "materializada" (transações geradas). A
  -- geração é sob demanda (ver função materialize_recurrence_rule), nunca
  -- automática/infinita.
  last_materialized_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_recurrence_account_or_card check (
    (account_id is not null and card_id is null) or (account_id is null and card_id is not null)
  ),
  constraint chk_recurrence_card_requires_despesa check (
    card_id is null or type = 'despesa'
  ),
  constraint chk_recurrence_custom_interval check (
    (frequency = 'personalizado' and custom_interval_days is not null)
    or (frequency <> 'personalizado')
  ),
  constraint chk_recurrence_end check (
    is_indefinite = true or end_date is not null or occurrences_count is not null
  )
);

alter table public.recurrence_rules enable row level security;
create index if not exists idx_recurrence_rules_user on public.recurrence_rules (user_id);

create policy "recurrence_rules_all_own" on public.recurrence_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_recurrence_rules_updated_at
  before update on public.recurrence_rules
  for each row execute function public.set_updated_at();

create or replace function public.check_recurrence_rule_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.account_id is not null then
    select user_id into owner from public.accounts where id = new.account_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Conta não pertence ao usuário informado';
    end if;
  end if;
  if new.card_id is not null then
    select user_id into owner from public.credit_cards where id = new.card_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Cartão não pertence ao usuário informado';
    end if;
  end if;
  if new.category_id is not null then
    select user_id into owner from public.categories where id = new.category_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Categoria não pertence ao usuário informado';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_recurrence_rules_check_owner
  before insert or update on public.recurrence_rules
  for each row execute function public.check_recurrence_rule_owner();

-- ============================================================================
-- transactions — extensão para cartões e parcelamento/recorrência
-- ============================================================================
alter table public.transactions add column if not exists card_id uuid references public.credit_cards (id) on delete restrict;
alter table public.transactions add column if not exists installment_group_id uuid references public.installment_groups (id) on delete restrict;
alter table public.transactions add column if not exists installment_number smallint;
alter table public.transactions add column if not exists installment_total smallint;
alter table public.transactions add column if not exists recurrence_rule_id uuid references public.recurrence_rules (id) on delete set null;

-- account_id deixa de ser obrigatório: uma "compra_cartao" fica associada ao
-- cartão, não a uma conta (a conta só entra quando a fatura é paga).
alter table public.transactions alter column account_id drop not null;

-- Substitui o check antigo de "type" (nome padrão gerado pelo Postgres para
-- o check inline definido em 0001) por um check nomeado, já com os dois
-- novos tipos desta fase.
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint chk_transactions_type check (
  type in ('receita', 'despesa', 'transferencia', 'compra_cartao', 'pagamento_fatura')
);

-- Cada tipo de movimentação usa uma combinação específica e válida de
-- conta/cartão — reforçado no banco, não só na interface.
alter table public.transactions drop constraint if exists chk_account_or_card;
alter table public.transactions add constraint chk_account_or_card check (
  (type in ('receita', 'despesa', 'transferencia') and account_id is not null and card_id is null)
  or (type = 'compra_cartao' and card_id is not null and account_id is null)
  or (type = 'pagamento_fatura' and account_id is not null and card_id is not null)
);

create index if not exists idx_transactions_user_card on public.transactions (user_id, card_id);
create index if not exists idx_transactions_installment_group on public.transactions (installment_group_id);
create index if not exists idx_transactions_recurrence_rule on public.transactions (recurrence_rule_id);

-- Atualiza a validação de dono (agora também confere card_id, e só confere
-- account_id quando ele não é nulo — antes era sempre obrigatório).
create or replace function public.check_transaction_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.account_id is not null then
    select user_id into owner from public.accounts where id = new.account_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Conta não pertence ao usuário informado';
    end if;
  end if;

  if new.destination_account_id is not null then
    select user_id into owner from public.accounts where id = new.destination_account_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Conta de destino não pertence ao usuário informado';
    end if;
  end if;

  if new.card_id is not null then
    select user_id into owner from public.credit_cards where id = new.card_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Cartão não pertence ao usuário informado';
    end if;
  end if;

  if new.category_id is not null then
    select user_id into owner from public.categories where id = new.category_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Categoria não pertence ao usuário informado';
    end if;
  end if;

  if new.subcategory_id is not null then
    select user_id into owner from public.subcategories where id = new.subcategory_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Subcategoria não pertence ao usuário informado';
    end if;
  end if;

  if new.payment_method_id is not null then
    select user_id into owner from public.payment_methods where id = new.payment_method_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Forma de pagamento não pertence ao usuário informado';
    end if;
  end if;

  if new.installment_group_id is not null then
    select user_id into owner from public.installment_groups where id = new.installment_group_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Grupo de parcelas não pertence ao usuário informado';
    end if;
  end if;

  if new.recurrence_rule_id is not null then
    select user_id into owner from public.recurrence_rules where id = new.recurrence_rule_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Regra de recorrência não pertence ao usuário informado';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- account_balances — regra de dupla contagem estendida
-- ----------------------------------------------------------------------------
-- "compra_cartao" nunca mexe no saldo de conta (só no limite do cartão, via
-- credit_card_summary). "pagamento_fatura" reduz o saldo da conta pagadora,
-- exatamente como uma despesa — mas não é uma despesa nova (a despesa já foi
-- reconhecida na compra), então ela não aparece nos relatórios de resultado
-- filtrados por type IN ('receita','despesa').
-- ============================================================================
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.initial_balance
    + coalesce(sum(
        case
          when t.status not in ('pago', 'recebido') then 0
          when t.account_id = a.id and t.type = 'receita' then t.amount
          when t.account_id = a.id and t.type = 'despesa' then -t.amount
          when t.account_id = a.id and t.type = 'pagamento_fatura' then -t.amount
          when t.account_id = a.id and t.type = 'transferencia' then -t.amount
          when t.destination_account_id = a.id and t.type = 'transferencia' then t.amount
          else 0
        end
      ), 0) as current_balance
from public.accounts a
left join public.transactions t
  on t.user_id = a.user_id
  and (t.account_id = a.id or t.destination_account_id = a.id)
group by a.id, a.user_id, a.name, a.initial_balance;

-- ============================================================================
-- credit_card_summary — limite utilizado/disponível por cartão
-- ----------------------------------------------------------------------------
-- Limite utilizado = compras no cartão ainda não cobertas por pagamento de
-- fatura. Um pagamento parcial reduz proporcionalmente o utilizado.
-- ============================================================================
create or replace view public.credit_card_summary
with (security_invoker = true) as
select
  c.id as card_id,
  c.user_id,
  c.name,
  c.credit_limit,
  coalesce(sum(case when t.type = 'compra_cartao' and t.status <> 'cancelado' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type = 'pagamento_fatura' and t.status = 'pago' then t.amount else 0 end), 0)
    as used_limit,
  c.credit_limit - (
    coalesce(sum(case when t.type = 'compra_cartao' and t.status <> 'cancelado' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type = 'pagamento_fatura' and t.status = 'pago' then t.amount else 0 end), 0)
  ) as available_limit
from public.credit_cards c
left join public.transactions t on t.card_id = c.id and t.user_id = c.user_id
group by c.id, c.user_id, c.name, c.credit_limit;

-- ============================================================================
-- RPC: create_installment_group
-- ----------------------------------------------------------------------------
-- Cria o grupo de parcelas e todas as parcelas (a 1ª incluída) em uma única
-- transação de banco — ou tudo é criado, ou nada é (evita geração parcial).
-- Roda como o próprio usuário (security invoker): as policies de RLS e os
-- triggers de validação de dono continuam se aplicando normalmente.
-- ============================================================================
create or replace function public.create_installment_group(
  p_description text,
  p_account_id uuid,
  p_card_id uuid,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_payment_method_id uuid,
  p_fixed_variable text,
  p_is_essential boolean,
  p_installments jsonb -- [{transaction_date, competence_date, due_date, amount, status, installment_number}, ...]
)
returns setof public.transactions
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_total int;
  v_item jsonb;
  v_type text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_total := jsonb_array_length(p_installments);
  if v_total < 2 then
    raise exception 'Um grupo de parcelas precisa de pelo menos 2 parcelas.';
  end if;

  v_type := case when p_card_id is not null then 'compra_cartao' else 'despesa' end;

  insert into public.installment_groups (
    user_id, description, total_installments, account_id, card_id,
    category_id, subcategory_id, payment_method_id, fixed_variable, is_essential
  ) values (
    v_user_id, p_description, v_total, p_account_id, p_card_id,
    p_category_id, p_subcategory_id, p_payment_method_id, p_fixed_variable, p_is_essential
  )
  returning id into v_group_id;

  for v_item in select * from jsonb_array_elements(p_installments)
  loop
    insert into public.transactions (
      user_id, type, description, amount, transaction_date, competence_date, due_date,
      account_id, card_id, category_id, subcategory_id, payment_method_id, status,
      fixed_variable, is_essential, installment_group_id, installment_number, installment_total
    ) values (
      v_user_id,
      v_type,
      p_description || ' (' || (v_item ->> 'installment_number') || '/' || v_total || ')',
      (v_item ->> 'amount')::numeric,
      (v_item ->> 'transaction_date')::date,
      (v_item ->> 'competence_date')::date,
      nullif(v_item ->> 'due_date', '')::date,
      p_account_id,
      p_card_id,
      p_category_id,
      p_subcategory_id,
      p_payment_method_id,
      coalesce(v_item ->> 'status', 'previsto'),
      p_fixed_variable,
      p_is_essential,
      v_group_id,
      (v_item ->> 'installment_number')::smallint,
      v_total
    );
  end loop;

  return query select * from public.transactions where installment_group_id = v_group_id order by installment_number;
end;
$$;

-- ============================================================================
-- RPC: materialize_recurrence_rule
-- ----------------------------------------------------------------------------
-- Gera (materializa) as ocorrências de uma recorrência entre a última data
-- já materializada e "p_until" (limite passado pelo chamador — o frontend
-- sempre usa uma janela curta, ex.: hoje + 3 meses). Isso é o que evita gerar
-- registros infinitos: nunca se materializa "para sempre", só sob demanda e
-- com um teto explícito.
-- ============================================================================
create or replace function public.materialize_recurrence_rule(p_rule_id uuid, p_until date)
returns setof public.transactions
language plpgsql
security invoker
as $$
declare
  v_rule public.recurrence_rules%rowtype;
  v_next date;
  v_count int := 0;
  v_max_iterations int := 60; -- proteção extra contra loop indevido
  v_type text;
begin
  select * into v_rule from public.recurrence_rules where id = p_rule_id;
  if v_rule is null then
    raise exception 'Regra de recorrência não encontrada.';
  end if;
  if v_rule.status <> 'ativa' then
    return;
  end if;

  v_next := coalesce(v_rule.last_materialized_date, v_rule.start_date - 1);
  v_type := case when v_rule.card_id is not null then 'compra_cartao' else v_rule.type end;

  loop
    exit when v_count >= v_max_iterations;

    v_next := case v_rule.frequency
      when 'semanal' then v_next + interval '7 days'
      when 'quinzenal' then v_next + interval '14 days'
      when 'mensal' then v_next + interval '1 month'
      when 'bimestral' then v_next + interval '2 months'
      when 'trimestral' then v_next + interval '3 months'
      when 'semestral' then v_next + interval '6 months'
      when 'anual' then v_next + interval '1 year'
      else v_next + make_interval(days => v_rule.custom_interval_days)
    end;

    exit when v_next > p_until;
    exit when v_rule.end_date is not null and v_next > v_rule.end_date;
    exit when v_rule.occurrences_count is not null and v_count >= v_rule.occurrences_count;

    insert into public.transactions (
      user_id, type, description, amount, transaction_date, competence_date, due_date,
      account_id, card_id, category_id, subcategory_id, payment_method_id, status,
      fixed_variable, is_essential, recurrence_rule_id
    ) values (
      v_rule.user_id, v_type, v_rule.description, v_rule.amount, v_next, v_next, v_next,
      v_rule.account_id, v_rule.card_id, v_rule.category_id, v_rule.subcategory_id, v_rule.payment_method_id,
      'previsto', v_rule.fixed_variable, v_rule.is_essential, v_rule.id
    );

    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    update public.recurrence_rules set last_materialized_date = v_next where id = p_rule_id;
  end if;

  return query
    select * from public.transactions
    where recurrence_rule_id = p_rule_id
    order by transaction_date desc
    limit v_count;
end;
$$;

comment on function public.materialize_recurrence_rule is
  'Gera ocorrências futuras de uma recorrência até a data "p_until" (janela curta, nunca infinita). Chamada sob demanda pelo frontend (ex.: ao abrir o calendário).';
