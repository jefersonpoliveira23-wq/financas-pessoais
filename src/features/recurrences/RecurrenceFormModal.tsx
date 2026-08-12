import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useCategories } from '@/hooks/useCategories'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { toISODateOnly } from '@/utils/format'

export const FREQUENCY_OPTIONS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'personalizado', label: 'Intervalo personalizado (dias)' },
] as const

const recurrenceFormSchema = z
  .object({
    description: z.string().trim().min(1, 'Informe uma descrição.').max(140),
    type: z.enum(['receita', 'despesa']),
    amount: z.number({ message: 'Informe um valor.' }).positive('O valor deve ser maior que zero.'),
    accountId: z.string().optional().or(z.literal('')),
    cardId: z.string().optional().or(z.literal('')),
    categoryId: z.string().optional().or(z.literal('')),
    frequency: z.enum([
      'semanal',
      'quinzenal',
      'mensal',
      'bimestral',
      'trimestral',
      'semestral',
      'anual',
      'personalizado',
    ]),
    customIntervalDays: z.number().int().positive().optional(),
    startDate: z.string().min(1, 'Informe a data inicial.'),
    endMode: z.enum(['indefinida', 'data_final', 'numero_ocorrencias']),
    endDate: z.string().optional().or(z.literal('')),
    occurrencesCount: z.number().int().positive().optional(),
    useCard: z.boolean(),
  })
  .refine((data) => data.useCard || !!data.accountId, { message: 'Selecione a conta.', path: ['accountId'] })
  .refine((data) => !data.useCard || !!data.cardId, { message: 'Selecione o cartão.', path: ['cardId'] })
  .refine((data) => !data.useCard || data.type === 'despesa', {
    message: 'Recorrência em cartão só pode ser do tipo despesa.',
    path: ['useCard'],
  })
  .refine((data) => data.frequency !== 'personalizado' || !!data.customIntervalDays, {
    message: 'Informe o intervalo em dias.',
    path: ['customIntervalDays'],
  })
  .refine((data) => data.endMode !== 'data_final' || !!data.endDate, {
    message: 'Informe a data final.',
    path: ['endDate'],
  })
  .refine((data) => data.endMode !== 'numero_ocorrencias' || !!data.occurrencesCount, {
    message: 'Informe o número de ocorrências.',
    path: ['occurrencesCount'],
  })

export type RecurrenceFormValues = z.infer<typeof recurrenceFormSchema>

interface RecurrenceFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: RecurrenceFormValues) => Promise<void>
  isSubmitting: boolean
}

export function RecurrenceFormModal({ open, onClose, onSubmit, isSubmitting }: RecurrenceFormModalProps) {
  const { data: accounts } = useAccounts()
  const { data: cards } = useCreditCards()
  const { data: categories } = useCategories()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RecurrenceFormValues>({
    resolver: zodResolver(recurrenceFormSchema),
    defaultValues: {
      type: 'despesa',
      frequency: 'mensal',
      startDate: toISODateOnly(new Date()),
      endMode: 'indefinida',
      useCard: false,
    },
  })

  if (!open) return null

  const watchedFrequency = watch('frequency')
  const watchedEndMode = watch('endMode')
  const watchedUseCard = watch('useCard')
  const watchedType = watch('type')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-(--color-ink-900)/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-(--color-ink-900)">Nova recorrência</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-(--color-surface-alt)">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(async (data) => onSubmit(data))} noValidate>
          <Input label="Descrição" error={errors.description?.message} {...register('description')} />

          <Select label="Tipo" error={errors.type?.message} {...register('type')}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </Select>

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Input
                label="Valor"
                type="number"
                step="0.01"
                error={errors.amount?.message}
                value={field.value ?? 0}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          />

          {watchedType === 'despesa' && (
            <label className="flex items-center gap-2 text-sm text-(--color-ink-900)">
              <input type="checkbox" className="h-4 w-4 rounded border-(--color-navy-100)" {...register('useCard')} />
              Cobrar em um cartão de crédito
            </label>
          )}

          {watchedUseCard ? (
            <Select label="Cartão" error={errors.cardId?.message} {...register('cardId')}>
              <option value="">Selecione…</option>
              {(cards ?? [])
                .filter((c) => !c.is_archived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          ) : (
            <Select label="Conta" error={errors.accountId?.message} {...register('accountId')}>
              <option value="">Selecione…</option>
              {(accounts ?? [])
                .filter((a) => !a.is_archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          )}

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

          <Select label="Frequência" error={errors.frequency?.message} {...register('frequency')}>
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>

          {watchedFrequency === 'personalizado' && (
            <Controller
              control={control}
              name="customIntervalDays"
              render={({ field }) => (
                <Input
                  label="Repetir a cada quantos dias"
                  type="number"
                  min={1}
                  error={errors.customIntervalDays?.message}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            />
          )}

          <Input label="Data inicial" type="date" error={errors.startDate?.message} {...register('startDate')} />

          <Select label="Término" {...register('endMode')}>
            <option value="indefinida">Indefinido (sem data para acabar)</option>
            <option value="data_final">Até uma data específica</option>
            <option value="numero_ocorrencias">Após um número de ocorrências</option>
          </Select>

          {watchedEndMode === 'data_final' && (
            <Input label="Data final" type="date" error={errors.endDate?.message} {...register('endDate')} />
          )}

          {watchedEndMode === 'numero_ocorrencias' && (
            <Controller
              control={control}
              name="occurrencesCount"
              render={({ field }) => (
                <Input
                  label="Número de ocorrências"
                  type="number"
                  min={1}
                  error={errors.occurrencesCount?.message}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            />
          )}

          <p className="text-xs text-(--color-ink-400)">
            As próximas ocorrências são geradas automaticamente para os próximos 3 meses assim que você salvar, e essa
            janela se renova conforme o tempo passa — nunca são geradas todas de uma vez até o infinito.
          </p>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Criar recorrência
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
