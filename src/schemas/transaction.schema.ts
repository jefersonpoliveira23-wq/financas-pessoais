import { z } from 'zod'

export const TRANSACTION_TYPES = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'transferencia', label: 'Transferência' },
] as const

export const TRANSACTION_STATUSES = [
  { value: 'previsto', label: 'Previsto' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'cancelado_por_quitacao', label: 'Cancelado por quitação' },
] as const

const transactionTypeValues = TRANSACTION_TYPES.map((t) => t.value) as [string, ...string[]]
const transactionStatusValues = TRANSACTION_STATUSES.map((t) => t.value) as [string, ...string[]]

export const transactionSchema = z
  .object({
    type: z.enum(transactionTypeValues, { message: 'Selecione o tipo de movimentação.' }),
    description: z.string().trim().min(1, 'Informe uma descrição.').max(140),
    amount: z.number({ message: 'Informe um valor numérico.' }).positive('O valor deve ser maior que zero.'),
    transactionDate: z.string().min(1, 'Informe a data da movimentação.'),
    competenceDate: z.string().min(1, 'Informe a data de competência.'),
    dueDate: z.string().optional().or(z.literal('')),
    paidDate: z.string().optional().or(z.literal('')),
    accountId: z.string().uuid('Selecione a conta.'),
    destinationAccountId: z.string().uuid().optional().or(z.literal('')),
    categoryId: z.string().uuid().optional().or(z.literal('')),
    subcategoryId: z.string().uuid().optional().or(z.literal('')),
    paymentMethodId: z.string().uuid().optional().or(z.literal('')),
    status: z.enum(transactionStatusValues, { message: 'Selecione o status.' }),
    fixedVariable: z.enum(['fixo', 'variavel', 'eventual']).optional(),
    isEssential: z.boolean().optional(),
    notes: z.string().max(500).optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
  })
  .refine((data) => data.type !== 'transferencia' || !!data.destinationAccountId, {
    message: 'Selecione a conta de destino da transferência.',
    path: ['destinationAccountId'],
  })
  .refine((data) => data.type !== 'transferencia' || data.destinationAccountId !== data.accountId, {
    message: 'A conta de destino deve ser diferente da conta de origem.',
    path: ['destinationAccountId'],
  })

export type TransactionFormData = z.infer<typeof transactionSchema>
