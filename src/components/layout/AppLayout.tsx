import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { useAuth } from '@/hooks/useAuth'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh bg-(--color-surface)">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <MobileNav
        onOpenMenu={() => setMobileMenuOpen(true)}
        onQuickAdd={() => navigate('/movimentacoes', { state: { openCreate: true } })}
      />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-(--color-ink-900)/40 md:hidden">
          <div className="flex h-full w-72 flex-col bg-(--color-navy-950) p-4 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="rounded p-1 hover:bg-(--color-navy-900)"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto" aria-label="Navegação completa">
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                          isActive ? 'bg-(--color-navy-900)' : 'text-(--color-navy-100) hover:bg-(--color-navy-900)/60'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-none" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      {!item.available && <span className="text-[10px] text-(--color-navy-500)">em breve</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              onClick={() => signOut()}
              className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--color-navy-100) hover:bg-(--color-navy-900)/60"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
