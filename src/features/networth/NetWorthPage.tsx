import { useMemo, useState } from 'react'
import { Archive, Pencil, Plus, TrendingUp } from 'lucide-react'
import {
  useAssets,
  useCreateAsset,
  useCreateLiability,
  useLiabilities,
  useNetWorthSummary,
  useUpdateAsset,
  useUpdateLiability,
} from '@/hooks/useNetWorth'
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  PatrimonyFormModal,
  type PatrimonyFormData,
} from '@/features/networth/PatrimonyFormModal'
import { formatCurrency } from '@/utils/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { Database } from '@/types/database.types'

type Asset = Database['public']['Tables']['assets']['Row']
type Liability = Database['public']['Tables']['liabilities']['Row']

function categoryLabel(kind: 'ativo' | 'passivo', value: string) {
  const list = kind === 'ativo' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  return list.find((c) => c.value === value)?.label ?? value
}

export function NetWorthPage() {
  const { data: assets, isLoading: loadingAssets } = useAssets()
  const { data: liabilities, isLoading: loadingLiabilities } = useLiabilities()
  const { data: summary } = useNetWorthSummary()
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const createLiability = useCreateLiability()
  const updateLiability = useUpdateLiability()
  const { showToast } = useToast()

  const [modalKind, setModalKind] = useState<'ativo' | 'passivo' | null>(null)
  const [editing, setEditing] = useState<Asset | Liability | null>(null)
  const [archiving, setArchiving] = useState<{ kind: 'ativo' | 'passivo'; item: Asset | Liability } | null>(null)

  const visibleAssets = useMemo(() => (assets ?? []).filter((a) => !a.is_archived), [assets])
  const visibleLiabilities = useMemo(() => (liabilities ?? []).filter((l) => !l.is_archived), [liabilities])
  const isLoading = loadingAssets || loadingLiabilities

  async function handleSubmit(data: PatrimonyFormData) {
    try {
      if (modalKind === 'ativo') {
        const payload = {
          name: data.name.trim(),
          category: data.category as Asset['category'],
          current_value: data.currentValue,
          acquisition_value: data.acquisitionValue,
          acquisition_date: data.acquisitionDate || null,
          notes: data.notes.trim() || null,
        }
        if (editing) {
          await updateAsset.mutateAsync({ id: editing.id, ...payload })
        } else {
          await createAsset.mutateAsync(payload)
        }
      } else {
        const payload = {
          name: data.name.trim(),
          category: data.category as Liability['category'],
          current_value: data.currentValue,
          linked_debt_id: data.linkedDebtId || null,
          notes: data.notes.trim() || null,
        }
        if (editing) {
          await updateLiability.mutateAsync({ id: editing.id, ...payload })
        } else {
          await createLiability.mutateAsync(payload)
        }
      }
      showToast('success', editing ? 'Atualizado.' : 'Cadastrado.')
      setModalKind(null)
      setEditing(null)
    } catch {
      showToast('error', 'Não foi possível salvar.')
    }
  }

  const isSubmitting =
    createAsset.isPending || updateAsset.isPending || createLiability.isPending || updateLiability.isPending

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Patrimônio</h1>
          <p className="text-sm text-(--color-ink-600)">
            Sua foto financeira completa: contas + ativos − passivos − dívidas ativas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(null)
              setModalKind('passivo')
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Passivo
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setModalKind('ativo')
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Ativo
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4 lg:col-span-1">
            <p className="text-sm text-(--color-ink-600)">Contas</p>
            <p className="font-display text-lg font-semibold text-(--color-ink-900)">
              {formatCurrency(summary.accounts_total)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-(--color-ink-600)">Ativos</p>
            <p className="font-display text-lg font-semibold text-(--color-ink-900)">
              {formatCurrency(summary.assets_total)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-(--color-ink-600)">Passivos</p>
            <p className="font-display text-lg font-semibold text-(--color-danger-600)">
              −{formatCurrency(summary.liabilities_total)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-(--color-ink-600)">Dívidas ativas</p>
            <p className="font-display text-lg font-semibold text-(--color-danger-600)">
              −{formatCurrency(summary.debts_total)}
            </p>
          </Card>
          <Card className="border-2 border-(--color-navy-600) p-4">
            <p className="text-sm text-(--color-ink-600)">Patrimônio líquido</p>
            <p
              className={`font-display text-lg font-semibold ${
                summary.net_worth < 0 ? 'text-(--color-danger-600)' : 'text-(--color-success-700)'
              }`}
            >
              {formatCurrency(summary.net_worth)}
            </p>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : visibleAssets.length === 0 && visibleLiabilities.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum ativo ou passivo cadastrado"
          description="Cadastre imóveis, veículos, investimentos e financiamentos para enxergar seu patrimônio líquido real. Suas contas bancárias já entram automaticamente."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <CardHeader title="Ativos" subtitle="O que você possui" />
            {visibleAssets.length === 0 ? (
              <p className="mt-3 text-sm text-(--color-ink-600)">Nenhum ativo cadastrado.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-(--color-navy-50)">
                {visibleAssets.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-(--color-ink-900)">{asset.name}</p>
                      <p className="text-xs text-(--color-ink-600)">{categoryLabel('ativo', asset.category)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-(--color-ink-900)">
                        {formatCurrency(asset.current_value)}
                      </p>
                      <button
                        onClick={() => {
                          setEditing(asset)
                          setModalKind('ativo')
                        }}
                        aria-label={`Editar ${asset.name}`}
                        className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setArchiving({ kind: 'ativo', item: asset })}
                        aria-label={`Arquivar ${asset.name}`}
                        className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                      >
                        <Archive className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Passivos" subtitle="O que você deve (além das dívidas já cadastradas)" />
            {visibleLiabilities.length === 0 ? (
              <p className="mt-3 text-sm text-(--color-ink-600)">Nenhum passivo cadastrado.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-(--color-navy-50)">
                {visibleLiabilities.map((liability) => (
                  <li key={liability.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-(--color-ink-900)">{liability.name}</p>
                      <p className="text-xs text-(--color-ink-600)">
                        {categoryLabel('passivo', liability.category)}
                        {liability.linked_debt_id ? ' · vinculado a dívida' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-(--color-danger-600)">
                        −{formatCurrency(liability.current_value)}
                      </p>
                      <button
                        onClick={() => {
                          setEditing(liability)
                          setModalKind('passivo')
                        }}
                        aria-label={`Editar ${liability.name}`}
                        className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setArchiving({ kind: 'passivo', item: liability })}
                        aria-label={`Arquivar ${liability.name}`}
                        className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                      >
                        <Archive className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <PatrimonyFormModal
        open={!!modalKind}
        kind={modalKind ?? 'ativo'}
        item={editing}
        onClose={() => {
          setModalKind(null)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={!!archiving}
        title={`Arquivar ${archiving?.kind}`}
        description={`"${archiving?.item.name}" sai do cálculo do patrimônio, mas o histórico é preservado.`}
        confirmLabel="Arquivar"
        isLoading={updateAsset.isPending || updateLiability.isPending}
        onCancel={() => setArchiving(null)}
        onConfirm={async () => {
          try {
            if (archiving!.kind === 'ativo') {
              await updateAsset.mutateAsync({ id: archiving!.item.id, is_archived: true })
            } else {
              await updateLiability.mutateAsync({ id: archiving!.item.id, is_archived: true })
            }
            showToast('success', 'Arquivado.')
          } catch {
            showToast('error', 'Não foi possível arquivar.')
          } finally {
            setArchiving(null)
          }
        }}
      />
    </div>
  )
}
