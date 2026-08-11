import { isBefore, startOfDay, parseISO } from 'date-fns'
import type { TransactionStatus } from '@/types/database.types'

/**
 * Calcula o status "efetivo" de exibição: se o vencimento já passou e a
 * movimentação continua "previsto" ou "pendente", ela é exibida como
 * "atrasado" — sem alterar o valor armazenado no banco. Isso evita depender
 * de um job agendado para manter o status sempre correto.
 */
export function effectiveStatus(transaction: {
  status: TransactionStatus
  due_date: string | null
}): TransactionStatus {
  if (
    (transaction.status === 'previsto' || transaction.status === 'pendente') &&
    transaction.due_date &&
    isBefore(parseISO(transaction.due_date), startOfDay(new Date()))
  ) {
    return 'atrasado'
  }
  return transaction.status
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  previsto: 'Previsto',
  pendente: 'Pendente',
  pago: 'Pago',
  recebido: 'Recebido',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
  cancelado_por_quitacao: 'Cancelado por quitação',
}

export const STATUS_TONE: Record<TransactionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  previsto: 'neutral',
  pendente: 'warning',
  pago: 'success',
  recebido: 'success',
  atrasado: 'danger',
  cancelado: 'neutral',
  cancelado_por_quitacao: 'neutral',
}
