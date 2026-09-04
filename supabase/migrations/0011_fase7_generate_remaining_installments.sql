-- ============================================================================
-- Migration 0011 — Gerar parcelas restantes de uma compra parcelada
-- ----------------------------------------------------------------------------
-- Compras importadas via TXT sem RECORRENTE=SIM entram como uma única
-- movimentação avulsa (com installment_number/installment_total só para
-- exibição, ex.: "Celular Verônica (8/10)"), sem installment_group_id e sem
-- as parcelas futuras (9/10, 10/10 etc.) — por isso elas nunca aparecem como
-- faturas separadas nos próximos meses em Cartões > Ver faturas.
--
-- Esta função permite gerar as parcelas que faltam a partir de uma parcela
-- já existente: cria (ou reaproveita) um installment_group vinculando a
-- parcela atual a ele, e insere as parcelas seguintes (sempre como
-- 'previsto', um mês depois da anterior), preservando o dia do mês da data
-- original de compra/vencimento.
-- ============================================================================

create or replace function public.generate_remaining_installments(p_transaction_id uuid)
returns setof public.transactions
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_txn public.transactions%rowtype;
  v_group_id uuid;
  v_base_description text;
  v_offset int;
  v_i int;
  v_txn_date date;
  v_competence_date date;
  v_due_date date;
  v_desc text;
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select * into v_txn from public.transactions where id = p_transaction_id and user_id = v_user_id for update;
  if not found then
    raise exception 'Movimentação não encontrada.';
  end if;

  if v_txn.installment_number is null or v_txn.installment_total is null then
    raise exception 'Esta movimentação não tem informação de parcelas.';
  end if;

  if v_txn.installment_total <= v_txn.installment_number then
    raise exception 'Não há parcelas restantes para gerar.';
  end if;

  v_group_id := v_txn.installment_group_id;

  -- Extrai a descrição base removendo o sufixo "(N/M)" que o importador
  -- (ou este próprio processo) adiciona a cada parcela.
  v_base_description := regexp_replace(v_txn.description, '\s*\(\d+/\d+\)\s*$', '');

  if v_group_id is null then
    insert into public.installment_groups (
      user_id, description, total_installments, account_id, card_id, category_id, fixed_variable, is_essential
    ) values (
      v_user_id, v_base_description, v_txn.installment_total, v_txn.account_id, v_txn.card_id,
      v_txn.category_id, v_txn.fixed_variable, v_txn.is_essential
    )
    returning id into v_group_id;

    update public.transactions
      set installment_group_id = v_group_id,
          description = v_base_description || ' (' || v_txn.installment_number || '/' || v_txn.installment_total || ')'
      where id = v_txn.id;
  end if;

  for v_i in (v_txn.installment_number + 1) .. v_txn.installment_total loop
    select exists(
      select 1 from public.transactions
      where installment_group_id = v_group_id and installment_number = v_i
    ) into v_exists;

    if not v_exists then
      v_offset := v_i - v_txn.installment_number;
      v_txn_date := (v_txn.transaction_date + make_interval(months => v_offset))::date;
      v_competence_date := (v_txn.competence_date + make_interval(months => v_offset))::date;
      v_due_date := case when v_txn.due_date is not null
        then (v_txn.due_date + make_interval(months => v_offset))::date
        else null end;
      v_desc := v_base_description || ' (' || v_i || '/' || v_txn.installment_total || ')';

      insert into public.transactions (
        user_id, type, description, amount, transaction_date, competence_date, due_date,
        account_id, card_id, category_id, status, fixed_variable, is_essential, is_recurring,
        installment_group_id, installment_number, installment_total, notes
      ) values (
        v_user_id, v_txn.type, v_desc, v_txn.amount, v_txn_date, v_competence_date, v_due_date,
        v_txn.account_id, v_txn.card_id, v_txn.category_id,
        'previsto',
        v_txn.fixed_variable, v_txn.is_essential, true,
        v_group_id, v_i, v_txn.installment_total, v_txn.notes
      );
    end if;
  end loop;

  return query select * from public.transactions where installment_group_id = v_group_id order by installment_number;
end;
$$;

comment on function public.generate_remaining_installments is
  'Gera as parcelas restantes de uma compra parcelada avulsa (ex.: importada sem RECORRENTE=SIM), criando o installment_group se necessário e as parcelas futuras como previsto.';
