import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

interface ComingSoonProps {
  title: string
  icon: LucideIcon
  phase: string
}

/**
 * Placeholder honesto para telas ainda não implementadas nesta fase do
 * projeto. A navegação funciona normalmente (não é um botão quebrado) — a
 * tela apenas deixa claro o que falta e em qual fase será entregue.
 */
export function ComingSoon({ title, icon, phase }: ComingSoonProps) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">{title}</h1>
      <div className="mt-6">
        <EmptyState
          icon={icon}
          title="Ainda não implementado"
          description={`Esta área está planejada para a ${phase}, conforme o plano de implementação combinado. As telas de Início, Movimentações, Contas e Configurações já estão funcionais.`}
        />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-(--color-ink-400)">
        <Construction className="h-3.5 w-3.5" aria-hidden="true" />
        Pendência sinalizada intencionalmente — veja o README, seção "Status de implementação".
      </div>
    </div>
  )
}
