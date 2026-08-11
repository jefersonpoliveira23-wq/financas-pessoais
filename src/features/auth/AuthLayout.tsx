import type { ReactNode } from 'react'
import { Wallet2 } from 'lucide-react'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden flex-1 flex-col justify-between bg-(--color-navy-950) p-10 text-white md:flex">
        <div className="flex items-center gap-2">
          <Wallet2 className="h-7 w-7 text-(--color-navy-500)" aria-hidden="true" />
          <span className="font-display text-xl font-semibold">Finanças Pessoais</span>
        </div>
        <div className="max-w-sm">
          <p className="font-display text-3xl font-semibold leading-tight">Para onde está indo o seu dinheiro?</p>
          <p className="mt-4 text-sm text-(--color-navy-100)">
            Não é só registrar o que já aconteceu — é enxergar o que vai acontecer se você continuar tomando as mesmas
            decisões.
          </p>
        </div>
        <p className="text-xs text-(--color-navy-100)">
          Seus dados ficam protegidos por usuário, com Row Level Security no banco.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-(--color-surface) p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-2 text-(--color-navy-900)">
              <Wallet2 className="h-6 w-6" aria-hidden="true" />
              <span className="font-display text-lg font-semibold">Finanças Pessoais</span>
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">{title}</h1>
          <p className="mt-1 text-sm text-(--color-ink-400)">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
