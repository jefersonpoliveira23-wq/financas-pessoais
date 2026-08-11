import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import {
  transactionSchema,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  type TransactionFormData,
} from '@/schemas/transaction.schema'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories, useSubcategories } from '@/hooks/useCategories'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { toISODateOnly } from '@/utils/format'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionFormModalProps {
  open: boolean
  transaction?: Transaction | null
  onClose: () => void
  onSubmit: (data: TransactionFormData) => Promise<void>
  isSubmitting: boolean
}

const emptyDefaults: TransactionFormData = {
  type: 'despesa',
  description: '',
  amount: 0,
  transactionDate: toISODateOnly(new Date()),
  competenceDate: toISODateOnly(new Date()),
  dueDate: '',
  paidDate: '',
  accountId: '',
  destinationAccountId: '',
  categoryId: '',
  subcategoryId: '',
  paymentMethodId: '',
  status: 'pendente',
  notes: '',
}

export function TransactionFormModal({
  open,
  transaction,
  onClose,
  onSubmit,
  isSubmitting,
}: TransactionFormModalProps) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({ resolver: zodResolver(transactionSchema), defaultValues: emptyDefaults })

  const watchedType = watch('type')
  const watchedCategoryId = watch('categoryId')
  const { data: subcategories } = useSubcategories(watchedCategoryId || undefined)

  useEffect(() => {
    if (!open) return
    reset(
      transaction
        ? {
            type: transaction.type,
            description: transaction.description,
            amount: transaction.amount,
            transactionDate: transaction.transaction_date,
            competenceDate: transaction.competence_date,
            dueDate: transaction.due_date ?? '',
            paidDate: transaction.paid_date ?? '',
            accountId: transaction.account_id,
            destinationAccountId: transaction.destination_account_id ?? '',
            categoryId: transaction.category_id ?? '',
            subcategoryId: transaction.subcategory_id ?? '',
            paymentMethodId: transaction.payment_method_id ?? '',
            status: transaction.status,
            fixedVariable: transaction.fixed_variable ?? undefined,
            isEssential: transaction.is_essential ?? undefined,
            notes: transaction.notes ?? '',
          }
        : emptyDefaults,
    )
  }, [open, transaction, reset])

  if (!open) return null

  const activeAccounts = (accounts ?? []).filter((a) => !a.is_archived)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">
            {transaction ? 'Editar movimentação' : 'Nova movimentação'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(async (data) => {
            await onSubmit(data)
          })}
          noValidate
        >
          <Select label="Tipo" error={errors.type?.message} {...register('type')}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          <Input label="Descrição" error={errors.description?.message} {...register('description')} />

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Input
                label="Valor"
                type="number"
                step="0.01"
                min="0"
                error={errors.amount?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data da movimentação"
              type="date"
              error={errors.transactionDate?.message}
              {...register('transactionDate')}
            />
            <Input
              label="Data de competência"
              type="date"
              error={errors.competenceDate?.message}
              {...register('competenceDate')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Vencimento" type="date" {...register('dueDate')} />
            <Input label="Pagamento/recebimento" type="date" {...register('paidDate')} />
          </div>

          <Select
            label={watchedType === 'transferencia' ? 'Conta de origem' : 'Conta'}
            error={errors.accountId?.message}
            {...register('accountId')}
          >
            <option value="">Selecione…</option>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          {watchedType === 'transferencia' && (
            <Select
              label="Conta de destino"
              error={errors.destinationAccountId?.message}
              {...register('destinationAccountId')}
            >
              <option value="">Selecione…</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}

          {watchedType !== 'transferencia' && (
            <>
              <Select label="Categoria" {...register('categoryId')}>
                <option value="">Sem categoria</option>
                {(categories ?? [])
                  .filter((c) => c.type === 'ambos' || c.type === watchedType)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>

              {watchedCategoryId && (subcategories?.length ?? 0) > 0 && (
                <Select label="Subcategoria" {...register('subcategoryId')}>
                  <option value="">Sem subcategoria</option>
                  {subcategories?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </>
          )}

          <Select label="Status" error={errors.status?.message} {...register('status')}>
            {TRANSACTION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          {watchedType !== 'transferencia' && (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Fixo, variável ou eventual" {...register('fixedVariable')}>
                <option value="">Não informado</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
                <option value="eventual">Eventual</option>
              </Select>
              <label className="mt-6 flex items-center gap-2 text-sm text-(--color-ink-900)">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-(--color-navy-100)"
                  {...register('isEssential')}
                />
                Essencial
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-(--color-ink-900)">
            Observações
            <textarea
              className="min-h-20 rounded-lg border border-(--color-navy-100) bg-white p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-navy-500)"
              {...register('notes')}
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {transaction ? 'Salvar alterações' : 'Criar movimentação'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
