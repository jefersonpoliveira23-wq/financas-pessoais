import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, FileBarChart2 } from 'lucide-react'
import { useMonthlyCashflow } from '@/hooks/useMonthlyCashflow'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditCards } from '@/hooks/useCreditCards'
import { downloadCsv, transactionsToCsv } from '@/utils/csvExport'
import { formatCurrency, formatDate, formatMonthYear } from '@/utils/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

const PALETTE = [
  'var(--color-navy-600)',
  'var(--color-danger-600)',
  'var(--color-success-600)',
  'var(--color-warning-600)',
  'var(--color-navy-400)',
  'var(--color-danger-400)',
  'var(--color-success-400)',
  'var(--color-navy-800)',
]

const RANGE_OPTIONS = [
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
]

export function ReportsPage() {
  const [months, setMonths] = useState(6)
  const { data: cashflow, isLoading: loadingCashflow } = useMonthlyCashflow(months)
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCreditCards()
  const { showToast } = useToast()

  const from = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (months - 1))
    return d.toISOString().slice(0, 10)
  }, [months])
  const to = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const { data: transactions, isLoading: loadingTransactions } = useTransactions({ from, to })

  const cashflowChart = useMemo(
    () =>
      (cashflow ?? []).map((m) => ({
        mes: formatMonthYear(m.month).replace(/^./, (c) => c.toUpperCase()),
        Receitas: m.income,
        Despesas: m.expense,
      })),
    [cashflow],
  )

  const categoryChart = useMemo(() => {
    const list = transactions ?? []
    const totals = new Map<string, number>()
    for (const t of list) {
      if (t.type !== 'despesa' && t.type !== 'compra_cartao') continue
      if (t.status === 'cancelado' || t.status === 'cancelado_por_quitacao') continue
      const name = categories?.find((c) => c.id === t.category_id)?.name ?? 'Sem categoria'
      totals.set(name, (totals.get(name) ?? 0) + t.amount)
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [transactions, categories])

  const totalExpenseInRange = categoryChart.reduce((s, c) => s + c.value, 0)

  function accountOrCardName(t: NonNullable<typeof transactions>[number]) {
    if (t.card_id) return cards?.find((c) => c.id === t.card_id)?.name ?? 'Cartão'
    if (t.account_id) return accounts?.find((a) => a.id === t.account_id)?.name ?? 'Conta'
    return '—'
  }

  function handleExportCsv() {
    const list = transactions ?? []
    if (list.length === 0) {
      showToast('info', 'Nenhuma movimentação no período selecionado para exportar.')
      return
    }
    const csv = transactionsToCsv(
      list.map((t) => ({
        date: formatDate(t.transaction_date),
        description: t.description,
        category: categories?.find((c) => c.id === t.category_id)?.name ?? 'Sem categoria',
        type: t.type,
        status: t.status,
        amount: t.amount,
        account: accountOrCardName(t),
      })),
    )
    downloadCsv(`movimentacoes_${from}_a_${to}.csv`, csv)
    showToast('success', `${list.length} movimentação(ões) exportada(s).`)
  }

  const isLoading = loadingCashflow || loadingTransactions

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Relatórios</h1>
          <p className="text-sm text-(--color-ink-600)">
            Evolução de receitas e despesas, maiores categorias de gasto e exportação para planilha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select label="Período" value={String(months)} onChange={(e) => setMonths(Number(e.target.value))}>
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Exportar CSV
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <CardHeader title="Receitas × Despesas" subtitle="Movimentações efetivadas, mês a mês" />
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : cashflowChart.every((m) => m.Receitas === 0 && m.Despesas === 0) ? (
          <EmptyState icon={FileBarChart2} title="Sem movimentações no período" description="" />
        ) : (
          <div className="mt-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-navy-50)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="Receitas" fill="var(--color-success-600)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="var(--color-danger-600)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <CardHeader
          title="Maiores categorias de despesa"
          subtitle={`Despesas e compras no cartão no período — total de ${formatCurrency(totalExpenseInRange)}`}
        />
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : categoryChart.length === 0 ? (
          <EmptyState icon={FileBarChart2} title="Sem despesas no período" description="" />
        ) : (
          <div className="mt-2 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e) => e.name}
                >
                  {categoryChart.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  )
}
