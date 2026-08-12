-- ============================================================================
-- Migration 0004 — Fase 3: Planejamento
-- ----------------------------------------------------------------------------
-- Adiciona: orçamento mensal (budgets), dívidas (debts, debt_payments),
-- metas (goals, goal_contributions), patrimônio (assets, liabilities,
-- asset_value_history) e planejamento mensal (monthly_plans).
-- Tudo é CREATE TABLE novo — nada altera dados das fases anteriores.
--
-- Pré-requisitos: 0001, 0002 e 0003 já aplicadas.
-- ============================================================================

-- ============================================================================
-- budgets — orçamento mensal por categoria
-- ============================================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  -- Primeiro dia do mês orçado (sempre dia 1: normalizado por constraint).
  month date not null check (extract(day from month) = 1),
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;
create index if not exists idx_budgets_user_month on public.budgets (user_id, month);

create policy "budgets_all_own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- Reforço: a categoria orçada precisa pertencer ao mesmo usuário.
create or replace function public.check_budget_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.categories where id = new.category_id;
  if owner is null or owner <> new.user_id then
    raise exception 'Categoria não pertence ao usuário informado';
  end if;
  return new;
end;
$$;

create trigger trg_budgets_check_owner
  before insert or update on public.budgets
  for each row execute function public.check_budget_owner();

-- ============================================================================
-- debts — dívidas (saldo devedor, juros, estratégia de quitação)
-- ============================================================================
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  creditor text,
  -- Valor original contratado e saldo devedor atual (fonte da verdade do que falta pagar).
  original_amount numeric(14, 2) not null check (original_amount > 0),
  outstanding_balance numeric(14, 2) not null check (outstanding_balance >= 0),
  -- Juros mensais em percentual (ex.: 1.99 = 1,99% a.m.). Zero é permitido (dívida sem juros).
  monthly_interest_rate numeric(7, 4) not null default 0 check (monthly_interest_rate >= 0),
  minimum_payment numeric(14, 2) not null default 0 check (minimum_payment >= 0),
  due_day smallint check (due_day between 1 and 31),
  status text not null default 'ativa' check (status in ('ativa', 'quitada', 'renegociada')),
  settled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts enable row level security;
create index if not exists idx_debts_user on public.debts (user_id, status);

create policy "debts_all_own" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_debts_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- debt_payments — histórico de pagamentos de cada dívida
-- ============================================================================
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.debts (id) on delete cascade,
  payment_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  -- Decomposição opcional (informativa): quanto foi juros e quanto abateu principal.
  interest_portion numeric(14, 2) check (interest_portion >= 0),
  principal_portion numeric(14, 2) check (principal_portion >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.debt_payments enable row level security;
create index if not exists idx_debt_payments_debt on public.debt_payments (debt_id, payment_date);

create policy "debt_payments_all_own" on public.debt_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.check_debt_payment_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.debts where id = new.debt_id;
  if owner is null or owner <> new.user_id then
    raise exception 'Dívida não pertence ao usuário informado';
  end if;
  return new;
end;
$$;

create trigger trg_debt_payments_check_owner
  before insert or update on public.debt_payments
  for each row execute function public.check_debt_payment_owner();

-- ============================================================================
-- RPC: register_debt_payment — pagamento + abatimento do saldo, atômico
-- ----------------------------------------------------------------------------
-- security invoker: RLS e triggers de dono continuam valendo.
-- Abate o saldo devedor e, se zerar, marca a dívida como quitada.
-- ============================================================================
create or replace function public.register_debt_payment(
  p_debt_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_interest_portion numeric default null,
  p_principal_portion numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_debt public.debts%rowtype;
  v_payment_id uuid;
  v_principal numeric;
begin
  select * into v_debt from public.debts where id = p_debt_id for update;
  if not found then
    raise exception 'Dívida não encontrada';
  end if;
  if v_debt.status = 'quitada' then
    raise exception 'Dívida já quitada';
  end if;
  if p_amount <= 0 then
    raise exception 'Valor do pagamento deve ser maior que zero';
  end if;

  -- Quanto do pagamento abate o principal: usa a decomposição informada,
  -- ou o valor integral quando não informada.
  v_principal := coalesce(p_principal_portion, p_amount);
  if v_principal > v_debt.outstanding_balance then
    v_principal := v_debt.outstanding_balance;
  end if;

  insert into public.debt_payments (user_id, debt_id, payment_date, amount, interest_portion, principal_portion, notes)
  values (v_debt.user_id, p_debt_id, p_payment_date, p_amount, p_interest_portion, v_principal, p_notes)
  returning id into v_payment_id;

  update public.debts
  set outstanding_balance = outstanding_balance - v_principal,
      status = case when outstanding_balance - v_principal <= 0 then 'quitada' else status end,
      settled_at = case when outstanding_balance - v_principal <= 0 then now() else settled_at end
  where id = p_debt_id;

  return v_payment_id;
end;
$$;

-- ============================================================================
-- goals — metas financeiras
-- ----------------------------------------------------------------------------
-- mode 'independente': o progresso é a soma dos aportes registrados na meta.
-- mode 'alocado': a meta é vinculada a uma conta e o progresso acompanha o
-- saldo da conta (limitado ao valor-alvo) — sem duplicar dinheiro.
-- ============================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  mode text not null default 'independente' check (mode in ('independente', 'alocado')),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  linked_account_id uuid references public.accounts (id) on delete set null,
  is_emergency_fund boolean not null default false,
  status text not null default 'ativa' check (status in ('ativa', 'concluida', 'arquivada')),
  color text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Meta alocada exige conta vinculada; meta independente não usa conta.
  constraint goals_mode_account check (
    (mode = 'alocado' and linked_account_id is not null)
    or (mode = 'independente')
  )
);

alter table public.goals enable row level security;
create index if not exists idx_goals_user on public.goals (user_id, status);

create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create or replace function public.check_goal_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.linked_account_id is not null then
    select user_id into owner from public.accounts where id = new.linked_account_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Conta vinculada não pertence ao usuário informado';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_goals_check_owner
  before insert or update on public.goals
  for each row execute function public.check_goal_owner();

-- ============================================================================
-- goal_contributions — aportes de metas no modo independente
-- ============================================================================
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  contribution_date date not null,
  -- Negativo = resgate (retirada da meta); a soma nunca pode ficar negativa (validado na aplicação).
  amount numeric(14, 2) not null check (amount <> 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.goal_contributions enable row level security;
create index if not exists idx_goal_contributions_goal on public.goal_contributions (goal_id, contribution_date);

create policy "goal_contributions_all_own" on public.goal_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.check_goal_contribution_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.goals where id = new.goal_id;
  if owner is null or owner <> new.user_id then
    raise exception 'Meta não pertence ao usuário informado';
  end if;
  return new;
end;
$$;

create trigger trg_goal_contributions_check_owner
  before insert or update on public.goal_contributions
  for each row execute function public.check_goal_contribution_owner();

-- ============================================================================
-- assets / liabilities — patrimônio (ativos e passivos)
-- ============================================================================
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'outro' check (
    category in ('imovel', 'veiculo', 'investimento', 'negocio', 'outro')
  ),
  current_value numeric(14, 2) not null check (current_value >= 0),
  acquisition_value numeric(14, 2) check (acquisition_value >= 0),
  acquisition_date date,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;
create index if not exists idx_assets_user on public.assets (user_id, is_archived);

create policy "assets_all_own" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_assets_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'outro' check (
    category in ('financiamento_imovel', 'financiamento_veiculo', 'emprestimo', 'outro')
  ),
  current_value numeric(14, 2) not null check (current_value >= 0),
  -- Vínculo opcional com uma dívida já cadastrada (evita dupla contagem no
  -- patrimônio: ou a dívida entra via debts, ou como passivo manual — a view
  -- net_worth_summary usa liabilities + debts ativas SEM vínculo duplicado).
  linked_debt_id uuid references public.debts (id) on delete set null,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.liabilities enable row level security;
create index if not exists idx_liabilities_user on public.liabilities (user_id, is_archived);

create policy "liabilities_all_own" on public.liabilities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_liabilities_updated_at
  before update on public.liabilities
  for each row execute function public.set_updated_at();

create or replace function public.check_liability_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.linked_debt_id is not null then
    select user_id into owner from public.debts where id = new.linked_debt_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Dívida vinculada não pertence ao usuário informado';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_liabilities_check_owner
  before insert or update on public.liabilities
  for each row execute function public.check_liability_owner();

-- ============================================================================
-- asset_value_history — snapshots de valor de um ativo ao longo do tempo
-- ============================================================================
create table if not exists public.asset_value_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  reference_date date not null,
  value numeric(14, 2) not null check (value >= 0),
  created_at timestamptz not null default now(),
  unique (asset_id, reference_date)
);

alter table public.asset_value_history enable row level security;
create index if not exists idx_asset_value_history_asset on public.asset_value_history (asset_id, reference_date);

create policy "asset_value_history_all_own" on public.asset_value_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.check_asset_history_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.assets where id = new.asset_id;
  if owner is null or owner <> new.user_id then
    raise exception 'Ativo não pertence ao usuário informado';
  end if;
  return new;
end;
$$;

create trigger trg_asset_history_check_owner
  before insert or update on public.asset_value_history
  for each row execute function public.check_asset_history_owner();

-- Ao atualizar o valor atual de um ativo, registra automaticamente um snapshot
-- do dia (upsert por data) — histórico sem esforço do usuário.
create or replace function public.snapshot_asset_value()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.current_value is distinct from old.current_value then
    insert into public.asset_value_history (user_id, asset_id, reference_date, value)
    values (new.user_id, new.id, current_date, new.current_value)
    on conflict (asset_id, reference_date) do update set value = excluded.value;
  end if;
  return new;
end;
$$;

create trigger trg_assets_snapshot_value
  after insert or update on public.assets
  for each row execute function public.snapshot_asset_value();

-- ============================================================================
-- monthly_plans — planejamento mensal (renda prevista e observações)
-- ============================================================================
create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  expected_income numeric(14, 2) not null default 0 check (expected_income >= 0),
  planned_savings numeric(14, 2) not null default 0 check (planned_savings >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.monthly_plans enable row level security;
create index if not exists idx_monthly_plans_user_month on public.monthly_plans (user_id, month);

create policy "monthly_plans_all_own" on public.monthly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_monthly_plans_updated_at
  before update on public.monthly_plans
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Views de leitura (security invoker — respeitam o RLS de quem consulta)
-- ============================================================================

-- Orçado × realizado por categoria/mês. "Realizado" = despesas e compras no
-- cartão pagas/efetivadas OU pendentes do mês (competência), nunca transferências.
create or replace view public.budget_progress
with (security_invoker = true) as
select
  b.id as budget_id,
  b.user_id,
  b.category_id,
  b.month,
  b.amount as budgeted,
  coalesce((
    select sum(t.amount)
    from public.transactions t
    where t.user_id = b.user_id
      and t.category_id = b.category_id
      and t.type in ('despesa', 'compra_cartao')
      and t.status not in ('cancelado')
      and date_trunc('month', t.competence_date)::date = b.month
  ), 0) as spent
from public.budgets b;

-- Patrimônio líquido: contas marcadas para patrimônio + ativos − passivos − dívidas ativas
-- (dívidas já representadas como passivo vinculado não contam duas vezes).
create or replace view public.net_worth_summary
with (security_invoker = true) as
select
  u.user_id,
  coalesce(acc.total, 0) as accounts_total,
  coalesce(ast.total, 0) as assets_total,
  coalesce(lia.total, 0) as liabilities_total,
  coalesce(deb.total, 0) as debts_total,
  coalesce(acc.total, 0) + coalesce(ast.total, 0) - coalesce(lia.total, 0) - coalesce(deb.total, 0) as net_worth
from (select distinct user_id from (
        select user_id from public.accounts
        union select user_id from public.assets
        union select user_id from public.liabilities
        union select user_id from public.debts
      ) s) u
left join (
  select a.user_id, sum(ab.current_balance) as total
  from public.account_balances ab
  join public.accounts a on a.id = ab.account_id
  where a.include_in_net_worth and not a.is_archived
  group by a.user_id
) acc on acc.user_id = u.user_id
left join (
  select user_id, sum(current_value) as total
  from public.assets where not is_archived group by user_id
) ast on ast.user_id = u.user_id
left join (
  select user_id, sum(current_value) as total
  from public.liabilities where not is_archived group by user_id
) lia on lia.user_id = u.user_id
left join (
  select d.user_id, sum(d.outstanding_balance) as total
  from public.debts d
  where d.status = 'ativa'
    and not exists (
      select 1 from public.liabilities l
      where l.linked_debt_id = d.id and not l.is_archived
    )
  group by d.user_id
) deb on deb.user_id = u.user_id;
