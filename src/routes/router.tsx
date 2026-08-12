import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { CardsPage } from '@/features/cards/CardsPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { ImportPage } from '@/features/import/ImportPage'
import { BudgetPage } from '@/features/budget/BudgetPage'
import { PlanningPage } from '@/features/planning/PlanningPage'
import { DebtsPage } from '@/features/debts/DebtsPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { NetWorthPage } from '@/features/networth/NetWorthPage'
import { DiagnosticsPage } from '@/features/diagnostics/DiagnosticsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ComingSoon } from '@/components/layout/ComingSoon'
import { NAV_ITEMS } from '@/components/layout/navItems'

const comingSoonRoutes = NAV_ITEMS.filter((item) => !item.available).map((item) => ({
  path: item.to,
  element: <ComingSoon title={item.label} icon={item.icon} phase="próxima fase do projeto" />,
}))

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/cadastro', element: <SignupPage /> },
      { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
    ],
  },
  // A redefinição de senha fica fora do PublicOnlyRoute: o link do e-mail
  // pode chegar com uma sessão temporária já ativa.
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/inicio', element: <DashboardPage /> },
          { path: '/movimentacoes', element: <TransactionsPage /> },
          { path: '/contas', element: <AccountsPage /> },
          { path: '/cartoes', element: <CardsPage /> },
          { path: '/calendario', element: <CalendarPage /> },
          { path: '/orcamento', element: <BudgetPage /> },
          { path: '/planejamento', element: <PlanningPage /> },
          { path: '/dividas', element: <DebtsPage /> },
          { path: '/metas', element: <GoalsPage /> },
          { path: '/patrimonio', element: <NetWorthPage /> },
          { path: '/diagnosticos', element: <DiagnosticsPage /> },
          { path: '/relatorios', element: <ReportsPage /> },
          { path: '/importar', element: <ImportPage /> },
          { path: '/configuracoes', element: <SettingsPage /> },
          ...comingSoonRoutes,
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/inicio" replace /> },
  { path: '*', element: <Navigate to="/inicio" replace /> },
])
