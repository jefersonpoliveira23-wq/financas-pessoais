import { STATUS_LABELS, STATUS_TONE } from '@/utils/transactionStatus'
import type { TransactionStatus } from '@/types/database.types'

const toneClasses = {
  success: 'bg-(--color-success-100) text-(--color-success-700)',
  warning: 'bg-(--color-warning-100) text-(--color-warning-700)',
  danger: 'bg-(--color-danger-100) text-(--color-danger-700)',
  neutral: 'bg-(--color-navy-100) text-(--color-navy-700)',
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[STATUS_TONE[status]]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
