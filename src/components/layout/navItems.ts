import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  PiggyBank,
  CalendarDays,
  Landmark,
  Target,
  TrendingUp,
  Upload,
  FileBarChart2,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Indica se a tela já está implementada nesta fase do projeto. */
  available: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: LayoutDashboard, available: true },
  { to: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, available: true },
  { to: '/contas', label: 'Contas', icon: Wallet, available: true },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard, available: true },
  { to: '/orcamento', label: 'Orçamento', icon: PiggyBank, available: false },
  { to: '/calendario', label: 'Calendário financeiro', icon: CalendarDays, available: true },
  { to: '/dividas', label: 'Dívidas e parcelamentos', icon: Landmark, available: false },
  { to: '/metas', label: 'Metas', icon: Target, available: false },
  { to: '/patrimonio', label: 'Patrimônio', icon: TrendingUp, available: false },
  { to: '/importar', label: 'Importar dados', icon: Upload, available: true },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart2, available: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, available: true },
]

/** Subconjunto priorizado para a navegação inferior no celular (seção 26 do escopo). */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  NAV_ITEMS[0], // Início
  NAV_ITEMS[1], // Movimentações
  NAV_ITEMS[2], // Contas
  NAV_ITEMS[5], // Calendário
]
