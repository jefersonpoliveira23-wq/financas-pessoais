export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-(--color-navy-100)/70 ${className}`} aria-hidden="true" />
}
