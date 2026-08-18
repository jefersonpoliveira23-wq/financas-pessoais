-- Fix: register_debt_payment falhava com "violates check constraint
-- installment_groups_total_installments_check" quando, ao quitar uma
-- dívida vinculada a um parcelamento, restava exatamente 1 parcela já
-- vencida/paga (não 'previsto') no grupo. A constraint exige
-- total_installments >= 2, então não é possível manter um grupo de
-- parcelamento com 1 única parcela.
--
-- Correção: quando sobra 0 OU 1 parcela após remover as futuras
-- ('previsto'), desvincula essa parcela remanescente do grupo
-- (installment_group_id/installment_number/installment_total = null)
-- e apaga o installment_group, em vez de tentar atualizar
-- total_installments para 1.
--
-- Mantém integralmente o restante do corpo da função conforme
-- publicado na migration 0008 (nenhuma outra alteração de
-- comportamento/segurança é feita aqui).

CREATE OR REPLACE FUNCTION public.register_debt_payment(p_debt_id uuid, p_payment_date date, p_amount numeric, p_interest_portion numeric DEFAULT NULL::numeric, p_principal_portion numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
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

if v_remaining_count <= 1 then
-- installment_groups exige total_installments >= 2: com 0 ou 1 parcela
-- restante o grupo deixa de fazer sentido. Desvincula a parcela
-- remanescente (se houver) do grupo e remove o installment_group.
update public.transactions
set installment_group_id = null,
installment_number = null,
installment_total = null
where installment_group_id = v_debt.installment_group_id;

delete from public.installment_groups where id = v_debt.installment_group_id;
else
update public.installment_groups set total_installments = v_remaining_count where id = v_debt.installment_group_id;
end if;
end if;

return v_payment_id;
end;
$function$
;
