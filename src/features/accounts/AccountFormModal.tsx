import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { accountSchema, ACCOUNT_TYPES, type AccountFormData } from '@/schemas/account.schema'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Database } from '@/types/database.types'

type Account = Database['public']['Tables']['accounts']['Row']

interface AccountFormModalProps {
  open: boolean
  account?: Account | null
  onClose: () => void
  onSubmit: (data: AccountFormData) => Promise<void>
  isSubmitting: boolean
}

export function AccountFormModal({ open, account, onClose, onSubmit, isSubmitting }: AccountFormModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      institution: '',
      type: 'conta_corrente',
      initialBalance: 0,
      initialBalanceDate: new Date().toISOString().slice(0, 10),
      includeInAvailableBalance: true,
      includeInNetWorth: true,
    },
  })

  useEffect(() => {
    if (!open) return
    reset(
      account
        ? {
            name: account.name,
            institution: account.institution ?? '',
            type: account.type,
            initialBalance: account.initial_balance,
            initialBalanceDate: account.initial_balance_date,
            includeInAvailableBalance: account.include_in_available_balance,
            includeInNetWorth: account.include_in_net_worth,
          }
        : {
            name: '',
            institution: '',
            type: 'conta_corrente',
            initialBalance: 0,
            initialBalanceDate: new Date().toISOString().slice(0, 10),
            includeInAvailableBalance: true,
            includeInNetWorth: true,
          },
    )
  }, [open, account, reset])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">
            {account ? 'Editar conta' : 'Nova conta'}
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
          <Input label="Nome da conta" error={errors.name?.message} {...register('name')} />
          <Input label="Instituição" error={errors.institution?.message} {...register('institution')} />

          <Select label="Tipo" error={errors.type?.message} {...register('type')}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          <Controller
            control={control}
            name="initialBalance"
            render={({ field }) => (
              <Input
                label="Saldo inicial"
                type="number"
                step="0.01"
                error={errors.initialBalance?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          />

          <Input
            label="Data do saldo inicial"
            type="date"
            error={errors.initialBalanceDate?.message}
            {...register('initialBalanceDate')}
          />

          <label className="flex items-center gap-2 text-sm text-(--color-ink-900)">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-(--color-navy-100)"
              {...register('includeInAvailableBalance')}
            />
            Incluir no saldo disponível
          </label>
          <label className="flex items-center gap-2 text-sm text-(--color-ink-900)">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-(--color-navy-100)"
              {...register('includeInNetWorth')}
            />
            Incluir no patrimônio
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {account ? 'Salvar alterações' : 'Criar conta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
