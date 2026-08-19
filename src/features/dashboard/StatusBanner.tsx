import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useMonthlyProjection } from '@/features/calendar/useMonthlyProjection'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/utils/format'

type Tone = 'success' | 'warning' | 'danger'

const TONE_STYLE: Record<Tone, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  success: { bg: 'bg-(--color-success-100)', text: 'text-(--color-success-700)', icon: CheckCircle2 },
  warning: { bg: 'bg-(--color-warning-100)', text: 'text-(--color-warning-700)', icon: AlertTriangle },
  danger: { bg: 'bg-(--color-danger-100)', text: 'text-(--color-danger-700)', icon: XCircle },
}

/**
 * "Estamos no vermelho ou no verde?" — resposta direta logo no topo da
 * Início, reaproveitando a mesma projeção diária de saldo que já roda no
 * Calendário financeiro (`useMonthlyProjection`), sem duplicar a lógica.
 */
export function StatusBanner() {
  const { referenceBalance, firstNegativeDay, isLoading } = useMonthlyProjection(new Date())

  if (isLoading) return <Skeleton className="h-20 w-full" />

  let tone: Tone
  let message: string
  if (referenceBalance < 0) {
    tone = 'danger'
    message = `Seu saldo disponível hoje está negativo: ${formatCurrency(referenceBalance)}.`
  } else if (firstNegativeDay) {
    tone = 'warning'
    message = `Saldo positivo hoje (${formatCurrency(referenceBalance)}), mas a projeção indica que pode ficar negativo em ${formatDate(firstNegativeDay.date)} se nada mudar.`
  } else {
    tone = 'success'
    message = `Você está no verde: saldo disponível de ${formatCurrency(referenceBalance)}, sem previsão de ficar negativo este mês.`
  }

  const style = TONE_STYLE[tone]
  const Icon = style.icon

  return (
    <Card className={`flex items-center gap-4 ${style.bg} border-transparent`}>
      <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/60 ${style.text}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${style.text}`}>{message}</p>
      </div>
      <Link
        to="/calendario"
        className={`flex-none text-xs font-medium underline underline-offset-2 ${style.text} hover:opacity-80`}
      >
        Ver calendário
      </Link>
    </Card>
  )
}
