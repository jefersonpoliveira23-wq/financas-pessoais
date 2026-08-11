import { NavLink, useNavigate } from 'react-router-dom'
import { Menu, Plus } from 'lucide-react'
import { MOBILE_PRIMARY_NAV } from '@/components/layout/navItems'

interface MobileNavProps {
  onOpenMenu: () => void
  onQuickAdd: () => void
}

/**
 * Navegação inferior do celular. Prioriza, conforme seção 26 do escopo:
 * lançamento rápido, consulta do saldo (Início), contas a vencer, calendário.
 */
export function MobileNav({ onOpenMenu, onQuickAdd }: MobileNavProps) {
  const navigate = useNavigate()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-(--color-navy-100) bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação principal"
    >
      {MOBILE_PRIMARY_NAV.slice(0, 2).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive ? 'text-(--color-navy-900)' : 'text-(--color-ink-400)'
            }`
          }
        >
          <item.icon className="h-5 w-5" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}

      <button
        onClick={onQuickAdd}
        aria-label="Lançamento rápido"
        className="-mt-6 flex h-14 w-14 flex-none items-center justify-center rounded-full bg-(--color-navy-900) text-white shadow-lg"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {MOBILE_PRIMARY_NAV.slice(2, 4).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={(event) => {
            if (!item.available) {
              event.preventDefault()
              navigate(item.to)
            }
          }}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive ? 'text-(--color-navy-900)' : 'text-(--color-ink-400)'
            }`
          }
        >
          <item.icon className="h-5 w-5" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}

      <button
        onClick={onOpenMenu}
        aria-label="Mais opções"
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-(--color-ink-400)"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        Mais
      </button>
    </nav>
  )
}
