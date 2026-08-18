-- ============================================================================
-- Migration 0008 — Fase 6: importação de parcelas gera parcelamento + dívida
-- ----------------------------------------------------------------------------
-- Hoje, ao importar uma linha marcada como RECORRENTE=SIM com PARCELA_ATUAL
-- e TOTAL_PARCELAS (ex.: "parcela 1 de 6"), o confirm_import só criava UMA
-- movimentação avulsa — as parcelas futuras não apareciam no calendário nem
-- em Dívidas.
--
-- Esta migration muda confirm_import para, quando a linha tem parcelas
-- restantes (TOTAL_PARCELAS > PARCELA_ATUAL), criar:
--   1. um installment_group (mesmo mecanismo usado pelo parcelamento manual
--      de compras), com uma movimentação por parcela restante (da atual até
--      a última), já visíveis no Calendário financeiro dos próximos meses;
--   2. uma dívida em public.debts vinculada a esse grupo, para aparecer na
--      aba Dívidas com o saldo devedor correspondente às parcelas que faltam.
--
-- Também adiciona debts.installment_group_id e ajusta register_debt_payment:
-- ao quitar uma dívida vinculada a um parcelamento, as parcelas futuras
-- ainda não pagas (status 'previsto') são removidas — saindo da recorrência
-- e do calendário dos próximos meses, como pedido.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- debts.installment_group_id
-- ----------------------------------------------------------------------------
alter table public.debts
  add column if not exists installment_group_id uuid references public.installment_groups (id) on delete set null;

create index if not exists idx_debts_installment_group on public.debts (installment_group_id);

comment on column public.debts.installment_group_id is 'Parcelamento (installment_groups) que originou esta dívida, quando criada automaticamente pela importação. Ao quitar a dívida, as parcelas futuras deste grupo ainda não pagas são removidas.';

create or replace function public.check_debt_owner()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.installment_group_id is not null then
    select user_id into owner from public.installment_groups where id = new.installment_group_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Parcelamento vinculado não pertence ao usuário informado';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_debts_check_owner on public.debts;
create trigger trg_debts_check_owner
  before insert or update on public.debts
  for each row execute function public.check_debt_owner();

-- ----------------------------------------------------------------------------
-- register_debt_payment: ao quitar, remove parcelas futuras ainda não pagas
-- do parcelamento vinculado (se houver).
-- ----------------------------------------------------------------------------
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
  v_new_balance numeric;
  v_remaining_count int;
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

  v_principal := coalesce(p_principal_portion, p_amount);
  if v_principal > v_debt.outstanding_balance then
    v_principal := v_debt.outstanding_balance;
  end if;

  insert into public.debt_payments (user_id, debt_id, payment_date, amount, interest_portion, principal_portion, notes)
  values (v_debt.user_id, p_debt_id, p_payment_date, p_amount, p_interest_portion, v_principal, p_notes)
  returning id into v_payment_id;

  v_new_balance := v_debt.outstanding_balance - v_principal;

  update public.debts
  set outstanding_balance = v_new_balance,
      status = case when v_new_balance <= 0 then 'quitada' else status end,
      settled_at = case when v_new_balance <= 0 then now() else settled_at end
  where id = p_debt_id;

  -- Dívida quitada e vinculada a um parcelamento: as parcelas futuras que
  -- ainda não venceram/foram pagas somem da recorrência e do calendário.
  if v_new_balance <= 0 and v_debt.installment_group_id is not null then
    delete from public.transactions
      where installment_group_id = v_debt.installment_group_id
        and status = 'previsto';

    select count(*) into v_remaining_count
      from public.transactions where installment_group_id = v_debt.installment_group_id;

    if v_remaining_count = 0 then
      delete from public.installment_groups where id = v_debt.installment_group_id;
    else
      update public.installment_groups set total_installments = v_remaining_count where id = v_debt.installment_group_id;
    end if;
  end if;

  return v_payment_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- confirm_import: gera parcelamento + dívida quando a linha tiver parcelas
-- restantes (RECORRENTE=SIM e TOTAL_PARCELAS > PARCELA_ATUAL).
-- ----------------------------------------------------------------------------
create or replace function public.confirm_import(
  p_import_id uuid,
  p_new_categories jsonb,
  p_rows jsonb
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
  v_current_transaction_id uuid;
  v_category_id uuid;
  v_account_id uuid;
  v_card_id uuid;
  v_installment_number int;
  v_installment_total int;
  v_has_installments boolean;
  v_group_id uuid;
  v_type text;
  v_status text;
  v_base_txn_date date;
  v_base_due_date date;
  v_txn_date date;
  v_due_date date;
  v_desc text;
  v_offset int;
  v_i int;
  v_amount numeric;
  v_unpaid_installments int;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  perform 1 from public.imports where id = p_import_id and user_id = v_user_id;
  if not found then
    raise exception 'Importação não encontrada.';
  end if;

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

    v_account_id := nullif(v_item ->> 'account_id', '')::uuid;
    v_card_id := nullif(v_item ->> 'card_id', '')::uuid;
    v_amount := (v_item ->> 'amount')::numeric;
    v_installment_number := nullif(v_item ->> 'installment_number', '')::int;
    v_installment_total := nullif(v_item ->> 'installment_total', '')::int;
    v_has_installments :=
      coalesce((v_item ->> 'is_recurring')::boolean, false)
      and v_installment_number is not null
      and v_installment_total is not null
      and v_installment_total > v_installment_number;

    if v_has_installments then
      v_base_txn_date := (v_item ->> 'transaction_date')::date;
      v_base_due_date := nullif(v_item ->> 'due_date', '')::date;
      v_type := case when v_card_id is not null then 'compra_cartao' else (v_item ->> 'type') end;

      insert into public.installment_groups (
        user_id, description, total_installments, account_id, card_id,
        category_id, fixed_variable, is_essential
      ) values (
        v_user_id, v_item ->> 'description', v_installment_total, v_account_id, v_card_id,
        v_category_id, nullif(v_item ->> 'fixed_variable', ''),
        case when v_item ->> 'is_essential' is null then null else (v_item ->> 'is_essential')::boolean end
      )
      returning id into v_group_id;

      v_current_transaction_id := null;
      v_unpaid_installments := 0;

      for v_i in v_installment_number .. v_installment_total loop
        v_offset := v_i - v_installment_number;
        v_txn_date := (v_base_txn_date + make_interval(months => v_offset))::date;
        v_due_date := case when v_base_due_date is not null then (v_base_due_date + make_interval(months => v_offset))::date else null end;
        v_status := case when v_i = v_installment_number then coalesce(v_item ->> 'status', 'pendente') else 'previsto' end;
        v_desc := (v_item ->> 'description') || ' (' || v_i || '/' || v_installment_total || ')';

        if v_status <> 'pago' then
          v_unpaid_installments := v_unpaid_installments + 1;
        end if;

        insert into public.transactions (
          user_id, type, description, amount, transaction_date, competence_date, due_date,
          account_id, card_id, category_id, status, fixed_variable, is_essential, is_recurring,
          installment_group_id, installment_number, installment_total, notes
        ) values (
          v_user_id, v_type, v_desc, v_amount, v_txn_date, v_txn_date, v_due_date,
          v_account_id, v_card_id, v_category_id,
          v_status,
          nullif(v_item ->> 'fixed_variable', ''),
          case when v_item ->> 'is_essential' is null then null else (v_item ->> 'is_essential')::boolean end,
          true,
          v_group_id, v_i, v_installment_total,
          nullif(v_item ->> 'notes', '')
        )
        returning id into v_new_transaction_id;

        if v_i = v_installment_number then
          v_current_transaction_id := v_new_transaction_id;
        end if;
      end loop;

      insert into public.debts (
        user_id, name, original_amount, outstanding_balance, monthly_interest_rate,
        minimum_payment, due_day, status, notes, installment_group_id
      ) values (
        v_user_id,
        v_item ->> 'description',
        v_amount * v_installment_total,
        v_amount * v_unpaid_installments,
        0,
        v_amount,
        extract(day from coalesce(v_base_due_date, v_base_txn_date))::smallint,
        'ativa',
        nullif(v_item ->> 'notes', ''),
        v_group_id
      );

      update public.import_rows
        set status = 'aceita', transaction_id = v_current_transaction_id
        where id = (v_item ->> 'import_row_id')::uuid;
    else
      insert into public.transactions (
        user_id, type, description, amount, transaction_date, competence_date, due_date,
        account_id, card_id, category_id, status, fixed_variable, is_essential, is_recurring,
        installment_number, installment_total, notes
      ) values (
        v_user_id,
        v_item ->> 'type',
        v_item ->> 'description',
        v_amount,
        (v_item ->> 'transaction_date')::date,
        (v_item ->> 'competence_date')::date,
        nullif(v_item ->> 'due_date', '')::date,
        v_account_id,
        v_card_id,
        v_category_id,
        coalesce(v_item ->> 'status', 'pendente'),
        nullif(v_item ->> 'fixed_variable', ''),
        case when v_item ->> 'is_essential' is null then null else (v_item ->> 'is_essential')::boolean end,
        coalesce((v_item ->> 'is_recurring')::boolean, false),
        v_installment_number,
        v_installment_total,
        nullif(v_item ->> 'notes', '')
      )
      returning id into v_new_transaction_id;

      update public.import_rows
        set status = 'aceita', transaction_id = v_new_transaction_id
        where id = (v_item ->> 'import_row_id')::uuid;
    end if;
  end loop;

  update public.imports set status = 'confirmado', confirmed_at = now() where id = p_import_id;

  return query
    select t.* from public.transactions t
    join public.import_rows ir on ir.transaction_id = t.id
    where ir.import_id = p_import_id;
end;
$$;

comment on function public.confirm_import is
  'Confirma uma importação TXT: cria categorias novas e todas as movimentações aceitas. Linhas com parcelas restantes (RECORRENTE=SIM e TOTAL_PARCELAS > PARCELA_ATUAL) também geram um parcelamento (installment_groups) com as parcelas futuras e uma dívida vinculada em public.debts.';
