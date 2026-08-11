import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, LogOut, Wallet2 } from 'lucide-react'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { useAuth } from '@/hooks/useAuth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { signOut, user } = useAuth()

  return (
    <aside
      className={`hidden flex-none flex-col border-r border-(--color-navy-800) bg-(--color-navy-950) text-white transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <Wallet2 className="h-6 w-6 flex-none text-(--color-navy-500)" aria-hidden="true" />
        {!collapsed && <span className="font-display text-lg font-semibold">Finanças</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Navegação principal">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    isActive
                      ? 'bg-(--color-navy-900) text-white'
                      : 'text-(--color-navy-100) hover:bg-(--color-navy-900)/60'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-none" aria-hidden="true" />
                {!collapsed && (
                  <span className="flex-1 truncate">
                    {item.label}
                    {!item.available && <span className="ml-1.5 text-[10px] text-(--color-navy-500)">em breve</span>}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-(--color-navy-800) p-2">
        {!collapsed && user && (
          <p className="truncate px-3 pb-2 text-xs text-(--color-navy-100)" title={user.email ?? ''}>
            {user.email}
          </p>
        )}
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--color-navy-100) hover:bg-(--color-navy-900)/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <LogOut className="h-5 w-5 flex-none" aria-hidden="true" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--color-navy-100) hover:bg-(--color-navy-900)/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5 flex-none" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="h-5 w-5 flex-none" aria-hidden="true" />
          )}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
