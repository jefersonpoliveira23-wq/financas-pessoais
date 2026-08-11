import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-(--color-navy-100) bg-white p-5 shadow-sm ${className}`} {...props} />
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-semibold text-(--color-ink-900)">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-(--color-ink-400)">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
