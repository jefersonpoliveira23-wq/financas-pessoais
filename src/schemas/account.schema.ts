import { z } from 'zod'

export const ACCOUNT_TYPES = [
  { value: 'conta_corrente', label: 'Conta corrente' },
  { value: 'conta_digital', label: 'Conta digital' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'carteira_digital', label: 'Carteira digital' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'outra', label: 'Outra' },
] as const

const accountTypeValues = ACCOUNT_TYPES.map((t) => t.value) as [string, ...string[]]

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para a conta.').max(80),
  institution: z.string().trim().max(80).optional().or(z.literal('')),
  type: z.enum(accountTypeValues, { message: 'Selecione o tipo de conta.' }),
  initialBalance: z.number({ message: 'Informe um valor numérico.' }),
  initialBalanceDate: z.string().min(1, 'Informe a data do saldo inicial.'),
  color: z.string().optional(),
  includeInAvailableBalance: z.boolean(),
  includeInNetWorth: z.boolean(),
})

export type AccountFormData = z.infer<typeof accountSchema>
