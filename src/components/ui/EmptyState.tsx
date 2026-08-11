import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--color-navy-100) bg-(--color-navy-50)/40 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-navy-100)">
        <Icon className="h-6 w-6 text-(--color-navy-700)" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display font-semibold text-(--color-ink-900)">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-(--color-ink-400)">{description}</p>
      </div>
      {action}
    </div>
  )
}
