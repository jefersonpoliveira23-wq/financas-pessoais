-- ============================================================================
-- Migration 0003 — Fase 2: Importação em massa por TXT
-- ----------------------------------------------------------------------------
-- Pré-requisito: 0001 e 0002 já aplicadas.
-- ============================================================================

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  file_hash text not null,
  total_rows int not null default 0,
  accepted_rows int not null default 0,
  rejected_rows int not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'cancelado')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.imports enable row level security;
create index if not exists idx_imports_user on public.imports (user_id, created_at desc);
create index if not exists idx_imports_user_hash on public.imports (user_id, file_hash);

create policy "imports_all_own" on public.imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'rejeitada', 'ignorada')),
  error_message text,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.import_rows enable row level security;
create index if not exists idx_import_rows_import on public.import_rows (import_id);
create index if not exists idx_import_rows_user on public.import_rows (user_id);

create policy "import_rows_all_own" on public.import_rows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- RPC: confirm_import
-- ----------------------------------------------------------------------------
-- Cria, em uma única transação de banco, todas as movimentações aceitas de
-- uma importação (e as categorias novas marcadas para criação automática),
-- vinculando cada import_row à transação criada. Ou tudo é confirmado, ou
-- nada é — evita uma importação parcialmente processada.
-- ============================================================================
create or replace function public.confirm_import(
  p_import_id uuid,
  p_new_categories jsonb, -- [{temp_key, name, type}]
  p_rows jsonb            -- [{import_row_id, type, description, amount, transaction_date, competence_date, due_date, account_id, card_id, category_id, category_temp_key, status, fixed_variable, is_essential, is_recurring, installment_number, installment_total, notes}]
)
returns setof public.transactions
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_map jsonb := '{}'::jsonb;
  v_item jsonb;
  v_new_category_id uuid;
  v_new_transaction_id uuid;
  v_category_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  perform 1 from public.imports where id = p_import_id and user_id = v_user_id;
  if not found then
    raise exception 'Importação não encontrada.';
  end if;

  -- Cria as categorias novas primeiro, guardando um mapa temp_key -> id real.
  for v_item in select * from jsonb_array_elements(p_new_categories)
  loop
    insert into public.categories (user_id, name, type)
    values (v_user_id, v_item ->> 'name', v_item ->> 'type')
    returning id into v_new_category_id;

    v_category_map := v_category_map || jsonb_build_object(v_item ->> 'temp_key', v_new_category_id::text);
  end loop;

  for v_item in select * from jsonb_array_elements(p_rows)
  loop
    if v_item ->> 'category_temp_key' is not null then
      v_category_id := (v_category_map ->> (v_item ->> 'category_temp_key'))::uuid;
    else
      v_category_id := nullif(v_item ->> 'category_id', '')::uuid;
    end if;

    insert into public.transactions (
      user_id, type, description, amount, transaction_date, competence_date, due_date,
      account_id, card_id, category_id, status, fixed_variable, is_essential, is_recurring,
      installment_number, installment_total, notes
    ) values (
      v_user_id,
      v_item ->> 'type',
      v_item ->> 'description',
      (v_item ->> 'amount')::numeric,
      (v_item ->> 'transaction_date')::date,
      (v_item ->> 'competence_date')::date,
      nullif(v_item ->> 'due_date', '')::date,
      nullif(v_item ->> 'account_id', '')::uuid,
      nullif(v_item ->> 'card_id', '')::uuid,
      v_category_id,
      coalesce(v_item ->> 'status', 'pendente'),
      nullif(v_item ->> 'fixed_variable', ''),
      case when v_item ->> 'is_essential' is null then null else (v_item ->> 'is_essential')::boolean end,
      coalesce((v_item ->> 'is_recurring')::boolean, false),
      nullif(v_item ->> 'installment_number', '')::smallint,
      nullif(v_item ->> 'installment_total', '')::smallint,
      nullif(v_item ->> 'notes', '')
    )
    returning id into v_new_transaction_id;

    update public.import_rows
      set status = 'aceita', transaction_id = v_new_transaction_id
      where id = (v_item ->> 'import_row_id')::uuid;
  end loop;

  update public.imports set status = 'confirmado', confirmed_at = now() where id = p_import_id;

  return query
    select t.* from public.transactions t
    join public.import_rows ir on ir.transaction_id = t.id
    where ir.import_id = p_import_id;
end;
$$;

comment on function public.confirm_import is
  'Confirma uma importação TXT: cria categorias novas e todas as movimentações aceitas em uma única transação de banco.';
