import { useState } from 'react'
import { PlusCircle, Wallet, Archive, Pencil } from 'lucide-react'
import {
  useAccountBalances,
  useAccounts,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccount,
} from '@/hooks/useAccounts'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AccountFormModal } from '@/features/accounts/AccountFormModal'
import { ACCOUNT_TYPES, type AccountFormData } from '@/schemas/account.schema'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Database } from '@/types/database.types'

type Account = Database['public']['Tables']['accounts']['Row']

function accountTypeLabel(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type
}

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts()
  const { data: balances } = useAccountBalances()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const archiveAccount = useArchiveAccount()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [archivingAccount, setArchivingAccount] = useState<Account | null>(null)

  function balanceFor(accountId: string) {
    return balances?.find((b) => b.account_id === accountId)?.current_balance ?? 0
  }

  async function handleSubmit(data: AccountFormData) {
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          name: data.name,
          institution: data.institution || null,
          type: data.type as Account['type'],
          initial_balance: data.initialBalance,
          initial_balance_date: data.initialBalanceDate,
          include_in_available_balance: data.includeInAvailableBalance,
          include_in_net_worth: data.includeInNetWorth,
        })
        showToast('success', 'Conta atualizada com sucesso.')
      } else {
        await createAccount.mutateAsync({
          name: data.name,
          institution: data.institution || null,
          type: data.type as Account['type'],
          initial_balance: data.initialBalance,
          initial_balance_date: data.initialBalanceDate,
          include_in_available_balance: data.includeInAvailableBalance,
          include_in_net_worth: data.includeInNetWorth,
        })
        showToast('success', 'Conta criada com sucesso.')
      }
      setModalOpen(false)
      setEditingAccount(null)
    } catch {
      showToast('error', 'Não foi possível salvar a conta. Tente novamente.')
    }
  }

  async function handleArchive() {
    if (!archivingAccount) return
    try {
      await archiveAccount.mutateAsync(archivingAccount.id)
      showToast('success', 'Conta arquivada. O histórico foi preservado.')
    } catch {
      showToast('error', 'Não foi possível arquivar a conta.')
    } finally {
      setArchivingAccount(null)
    }
  }

  const active = (accounts ?? []).filter((a) => !a.is_archived)
  const archived = (accounts ?? []).filter((a) => a.is_archived)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Contas</h1>
          <p className="text-sm text-(--color-ink-400)">Contas correntes, digitais, poupança, dinheiro e mais.</p>
        </div>
        <Button
          onClick={() => {
            setEditingAccount(null)
            setModalOpen(true)
          }}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Nova conta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua primeira conta financeira para começar a acompanhar seu saldo."
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Cadastrar conta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((account) => (
            <Card key={account.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-semibold text-(--color-ink-900)">{account.name}</p>
                  <p className="text-xs text-(--color-ink-400)">
                    {accountTypeLabel(account.type)}
                    {account.institution ? ` · ${account.institution}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingAccount(account)
                    setModalOpen(true)
                  }}
                  aria-label={`Editar ${account.name}`}
                  className="rounded p-1.5 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-ink-900)"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p
                className={`font-display text-xl font-semibold tabular-nums ${
                  balanceFor(account.id) < 0 ? 'text-(--color-danger-600)' : 'text-(--color-ink-900)'
                }`}
              >
                {formatCurrency(balanceFor(account.id))}
              </p>
              <p className="text-xs text-(--color-ink-400)">
                Saldo inicial de {formatCurrency(account.initial_balance)} em {formatDate(account.initial_balance_date)}
              </p>
              <button
                onClick={() => setArchivingAccount(account)}
                className="mt-1 flex items-center gap-1.5 self-start text-xs text-(--color-ink-400) hover:text-(--color-danger-600)"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                Arquivar
              </button>
            </Card>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <details className="rounded-2xl border border-(--color-navy-100) bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-(--color-ink-600)">
            Contas arquivadas ({archived.length})
          </summary>
          <ul className="mt-3 divide-y divide-(--color-navy-100)">
            {archived.map((account) => (
              <li key={account.id} className="flex items-center justify-between py-2 text-sm text-(--color-ink-400)">
                <span>{account.name}</span>
                <span>{formatCurrency(balanceFor(account.id))}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <AccountFormModal
        open={modalOpen}
        account={editingAccount}
        onClose={() => {
          setModalOpen(false)
          setEditingAccount(null)
        }}
        onSubmit={handleSubmit}
        isSubmitting={createAccount.isPending || updateAccount.isPending}
      />

      <ConfirmDialog
        open={!!archivingAccount}
        title="Arquivar conta?"
        description={`"${archivingAccount?.name}" deixará de aparecer nas listagens ativas, mas o histórico de movimentações será preservado.`}
        confirmLabel="Arquivar"
        isDangerous={false}
        isLoading={archiveAccount.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchivingAccount(null)}
      />
    </div>
  )
}
