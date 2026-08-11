-- ============================================================================
-- Migration 0001 — Fase 1: Fundação
-- ----------------------------------------------------------------------------
-- Cria a base do sistema: extensões, funções utilitárias, e as tabelas
-- profiles, user_settings, payment_methods, categories, subcategories,
-- accounts, transactions e audit_logs — todas com Row Level Security (RLS).
--
-- Convenções usadas em TODAS as migrations deste projeto:
--   * Toda tabela privada tem user_id uuid referenciando auth.users(id).
--   * RLS é ativado e as políticas usam auth.uid() — nunca confiamos apenas
--     na interface para restringir acesso.
--   * Valores monetários usam numeric(14,2) — nunca float/double.
--   * created_at/updated_at são mantidos automaticamente por trigger.
--   * Vínculos entre tabelas do mesmo usuário são validados por trigger
--     (não basta a foreign key: é preciso garantir que as duas pontas
--     pertencem ao mesmo usuário, prevenindo acesso cruzado).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Funções utilitárias
-- ----------------------------------------------------------------------------

-- Mantém updated_at sempre atualizado em qualquer UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Cria automaticamente profile + user_settings quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  week_start_day smallint not null default 1 check (week_start_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados de perfil do usuário. week_start_day: 0=domingo .. 6=sábado.';

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Sem policy de INSERT/DELETE para o usuário: o registro é criado pelo
-- trigger handle_new_user (security definer) e removido em cascata ao
-- excluir a conta em auth.users.

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- user_settings — 1:1 com o usuário (preferências gerais e regras de negócio)
-- ============================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'BRL',
  theme text not null default 'automatico' check (theme in ('claro', 'escuro', 'automatico')),
  -- Define se compras no cartão são reconhecidas na data da compra ou no mês
  -- da fatura. Aplicado de forma consistente em dashboard, orçamento e
  -- relatórios (ver seção 8 do escopo do produto).
  card_recognition_mode text not null default 'data_compra'
    check (card_recognition_mode in ('data_compra', 'mes_fatura')),
  decimal_separator text not null default 'virgula' check (decimal_separator in ('virgula', 'ponto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Dispara a criação de profile + user_settings ao nascer um novo usuário.
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- payment_methods — formas de pagamento (Pix, débito, boleto, dinheiro, ...)
-- ============================================================================
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.payment_methods enable row level security;
create index if not exists idx_payment_methods_user on public.payment_methods (user_id);

create policy "payment_methods_all_own" on public.payment_methods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_payment_methods_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

-- ============================================================================
-- categories / subcategories
-- ============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('receita', 'despesa', 'ambos')),
  color text,
  icon text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;
create index if not exists idx_categories_user on public.categories (user_id);

create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

alter table public.subcategories enable row level security;
create index if not exists idx_subcategories_user on public.subcategories (user_id);
create index if not exists idx_subcategories_category on public.subcategories (category_id);

create policy "subcategories_all_own" on public.subcategories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_subcategories_updated_at
  before update on public.subcategories
  for each row execute function public.set_updated_at();

-- Garante que a categoria referenciada pertence ao mesmo usuário da
-- subcategoria (a foreign key sozinha não impede vínculo cruzado entre
-- usuários diferentes).
create or replace function public.check_subcategory_owner()
returns trigger
language plpgsql
as $$
declare
  category_owner uuid;
begin
  select user_id into category_owner from public.categories where id = new.category_id;
  if category_owner is null or category_owner <> new.user_id then
    raise exception 'Categoria não pertence ao usuário informado';
  end if;
  return new;
end;
$$;

create trigger trg_subcategories_check_owner
  before insert or update on public.subcategories
  for each row execute function public.check_subcategory_owner();

-- ============================================================================
-- accounts — contas financeiras (corrente, digital, poupança, dinheiro, ...)
-- ============================================================================
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  institution text,
  type text not null check (
    type in ('conta_corrente', 'conta_digital', 'poupanca', 'dinheiro', 'carteira_digital', 'investimento', 'outra')
  ),
  initial_balance numeric(14, 2) not null default 0,
  initial_balance_date date not null default current_date,
  color text,
  icon text,
  include_in_available_balance boolean not null default true,
  include_in_net_worth boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
create index if not exists idx_accounts_user on public.accounts (user_id);

create policy "accounts_all_own" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- transactions — fonte única de movimentações (receita, despesa, transferência)
-- ----------------------------------------------------------------------------
-- Os tipos "compra_cartao", "pagamento_fatura", "aporte_investimento",
-- "resgate_investimento", "pagamento_divida" e "quitacao_antecipada" serão
-- habilitados na Fase 2/3, junto com as colunas de cartão, parcelamento e
-- recorrência (installment_group_id, recurrence_rule_id, card_id), via
-- ALTER TABLE em migrations futuras — para não travar hoje em decisões que
-- dependem de tabelas que ainda não existem (credit_cards, installment_groups,
-- recurrence_rules).
-- ============================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('receita', 'despesa', 'transferencia')),
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),

  -- Datas: transaction_date é a data do lançamento; competence_date é o mês
  -- de competência (usado em orçamento/relatórios); due_date e paid_date
  -- controlam vencimento e efetivação (ver seção "Regras de competência e caixa").
  transaction_date date not null,
  competence_date date not null,
  due_date date,
  paid_date date,

  account_id uuid not null references public.accounts (id) on delete restrict,
  destination_account_id uuid references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,

  status text not null default 'pendente' check (
    status in ('previsto', 'pendente', 'pago', 'recebido', 'atrasado', 'cancelado', 'cancelado_por_quitacao')
  ),
  fixed_variable text check (fixed_variable in ('fixo', 'variavel', 'eventual')),
  is_essential boolean,
  is_recurring boolean not null default false,

  notes text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Transferências exigem conta de destino; os demais tipos, não.
  constraint chk_transfer_needs_destination check (
    (type = 'transferencia' and destination_account_id is not null)
    or (type <> 'transferencia' and destination_account_id is null)
  ),
  -- Não é permitido transferir de uma conta para ela mesma.
  constraint chk_destination_not_same_account check (
    destination_account_id is null or destination_account_id <> account_id
  )
);

alter table public.transactions enable row level security;
create index if not exists idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index if not exists idx_transactions_user_status on public.transactions (user_id, status);
create index if not exists idx_transactions_user_account on public.transactions (user_id, account_id);
create index if not exists idx_transactions_user_category on public.transactions (user_id, category_id);
create index if not exists idx_transactions_user_competence on public.transactions (user_id, competence_date);

create policy "transactions_all_own" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Garante que account_id, destination_account_id, category_id, subcategory_id
-- e payment_method_id pertencem ao MESMO usuário da transação. Isso é o que
-- de fato impede o acesso cruzado entre usuários (a FK, por si só, não
-- garante isso).
create or replace function public.check_transaction_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.accounts where id = new.account_id;
  if owner is null or owner <> new.user_id then
    raise exception 'Conta não pertence ao usuário informado';
  end if;

  if new.destination_account_id is not null then
    select user_id into owner from public.accounts where id = new.destination_account_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Conta de destino não pertence ao usuário informado';
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

  return new;
end;
$$;

create trigger trg_transactions_check_owner
  before insert or update on public.transactions
  for each row execute function public.check_transaction_owner();

-- ============================================================================
-- audit_logs — trilha de auditoria (somente leitura para o usuário)
-- ============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
create index if not exists idx_audit_logs_user on public.audit_logs (user_id, created_at desc);

-- O usuário só pode LER seu próprio histórico. Não há policy de INSERT para
-- o usuário: os registros são criados exclusivamente pela trigger abaixo
-- (security definer), o que impede fraudar o histórico de auditoria.
create policy "audit_logs_select_own" on public.audit_logs
  for select using (auth.uid() = user_id);

create or replace function public.log_transaction_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, table_name, record_id, action, changed_data)
    values (new.user_id, 'transactions', new.id, 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (user_id, table_name, record_id, action, changed_data)
    values (new.user_id, 'transactions', new.id, 'update', jsonb_build_object('antes', to_jsonb(old), 'depois', to_jsonb(new)));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (user_id, table_name, record_id, action, changed_data)
    values (old.user_id, 'transactions', old.id, 'delete', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_transactions_audit
  after insert or update or delete on public.transactions
  for each row execute function public.log_transaction_audit();

-- ============================================================================
-- View: saldo atual por conta (fonte única para dashboard, contas e relatórios)
-- ----------------------------------------------------------------------------
-- Regra de dupla contagem: transferências não somam nem subtraem do resultado
-- (receita/despesa), apenas movem saldo entre contas. Aqui elas SÃO somadas ao
-- saldo da conta (entram/saem do caixa da conta), mas nunca aparecerão como
-- receita/despesa em relatórios de resultado (isso é feito filtrando o tipo
-- nas consultas de resultado, não nesta view de saldo).
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

comment on view public.account_balances is
  'Saldo atual por conta, considerando apenas movimentações efetivadas (pago/recebido). '
  'Transferências afetam o saldo das duas contas envolvidas, mas nunca são contadas como receita/despesa.';
