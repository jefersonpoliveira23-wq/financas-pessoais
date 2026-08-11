import { forwardRef, useId, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className = '', children, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-(--color-ink-900)">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`h-10 rounded-lg border bg-white px-3 text-sm text-(--color-ink-900)
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-navy-500)
          ${error ? 'border-(--color-danger-600)' : 'border-(--color-navy-100)'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span id={errorId} role="alert" className="text-xs text-(--color-danger-600)">
          {error}
        </span>
      )}
    </div>
  )
})
