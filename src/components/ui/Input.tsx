import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = '', ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-(--color-ink-900)">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={`h-10 rounded-lg border bg-white px-3 text-sm text-(--color-ink-900) placeholder:text-(--color-ink-400)
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-navy-500)
          ${error ? 'border-(--color-danger-600)' : 'border-(--color-navy-100)'} ${className}`}
        {...props}
      />
      {hint && !error && (
        <span id={hintId} className="text-xs text-(--color-ink-400)">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-xs text-(--color-danger-600)">
          {error}
        </span>
      )}
    </div>
  )
})
