import { useMemo, useRef, useState } from 'react'
import { Upload, Download, FileWarning, CheckCircle2, AlertTriangle, History } from 'lucide-react'
import { parseImportFile, resolveImportRows, type ResolvedImportRow } from '@/utils/txtImportParser'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import {
  computeFileHash,
  useCheckPreviousImport,
  useCreateImportBatch,
  useConfirmImport,
  useImportHistory,
} from '@/hooks/useImports'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate, formatCurrency } from '@/utils/format'

type Step = 'upload' | 'preview' | 'done'

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportPage() {
  const { data: accounts } = useAccounts()
  const { data: cards } = useCreditCards()
  const { data: categories } = useCategories()
  const { data: existingTransactions } = useTransactions()
  const { data: history, isLoading: loadingHistory } = useImportHistory()

  const checkPreviousImport = useCheckPreviousImport()
  const createImportBatch = useCreateImportBatch()
  const confirmImport = useConfirmImport()
  const { showToast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [fileHash, setFileHash] = useState('')
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [rows, setRows] = useState<ResolvedImportRow[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [autoCreateCategories, setAutoCreateCategories] = useState(true)
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string; hash: string } | null>(null)
  const [importedSummary, setImportedSummary] = useState<{ accepted: number; total: number; installments: number } | null>(
    null,
  )
  const [currentImportId, setCurrentImportId] = useState<string | null>(null)

  const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
  const MAX_ROWS = 2000

  function processContent(name: string, content: string) {
    const parsed = parseImportFile(content)
    if (parsed.headerError) {
      setHeaderError(parsed.headerError)
      setStep('upload')
      return
    }
    if (parsed.rows.length > MAX_ROWS) {
      setHeaderError(`O arquivo tem ${parsed.rows.length} linhas — o limite é ${MAX_ROWS} por importação.`)
      return
    }

    const resolved = resolveImportRows(parsed.rows, {
      accounts: (accounts ?? []).map((a) => ({ id: a.id, name: a.name })),
      cards: (cards ?? []).map((c) => ({ id: c.id, name: c.name })),
      categories: (categories ?? []).map((c) => ({ id: c.id, name: c.name })),
      existingTransactions: (existingTransactions ?? []).map((t) => ({
        transaction_date: t.transaction_date,
        description: t.description,
        amount: t.amount,
      })),
      autoCreateMissingCategories: autoCreateCategories,
    })

    setHeaderError(null)
    setFileName(name)
    setRows(resolved)
    setSelectedRows(new Set(resolved.filter((r) => r.isSelectable).map((r) => r.rowNumber)))
    setStep('preview')
  }

  async function handleFile(file: File) {
    if (!/\.txt$/i.test(file.name)) {
      setHeaderError('Envie um arquivo .txt gerado a partir do modelo.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setHeaderError('Arquivo muito grande — o limite é 2 MB.')
      return
    }

    const content = await file.text()
    const hash = await computeFileHash(content)

    const previous = await checkPreviousImport.mutateAsync(hash)
    if (previous) {
      setPendingFile({ name: file.name, content, hash })
      setDuplicateWarningOpen(true)
      return
    }

    setFileHash(hash)
    processContent(file.name, content)
  }

  function confirmReimport() {
    if (!pendingFile) return
    setFileHash(pendingFile.hash)
    processContent(pendingFile.name, pendingFile.content)
    setDuplicateWarningOpen(false)
    setPendingFile(null)
  }

  function toggleRow(rowNumber: number) {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  const acceptedCount = rows.filter((r) => r.isSelectable && selectedRows.has(r.rowNumber)).length
  const rejectedCount = rows.filter((r) => !r.isSelectable).length

  async function handleConfirmImport() {
    const rowsToImport = rows.filter((r) => r.isSelectable && selectedRows.has(r.rowNumber))
    if (rowsToImport.length === 0) {
      showToast('error', 'Selecione ao menos uma linha para importar.')
      return
    }

    try {
      const batch = await createImportBatch.mutateAsync({ filename: fileName, fileHash, rows })

      // Mapeia categorias novas (por nome) para uma chave temporária única.
      const newCategoryNames = new Map<string, { tempKey: string; name: string; type: 'receita' | 'despesa' }>()
      for (const row of rowsToImport) {
        if (row.categoryToCreate && row.data) {
          const key = row.categoryToCreate.toLowerCase()
          if (!newCategoryNames.has(key)) {
            newCategoryNames.set(key, { tempKey: key, name: row.categoryToCreate, type: row.data.type })
          }
        }
      }

      const importRowsById = new Map(batch.importRows.map((r) => [r.row_number, r.id]))

      await confirmImport.mutateAsync({
        importId: batch.importRecord.id,
        newCategories: Array.from(newCategoryNames.values()),
        rows: rowsToImport.map((row) => ({
          importRowId: importRowsById.get(row.rowNumber) as string,
          type: row.data!.type,
          description: row.data!.description,
          amount: row.data!.amount,
          transactionDate: row.data!.transactionDate,
          competenceDate: row.data!.competenceDate,
          dueDate: row.data!.dueDate,
          accountId: row.accountId,
          cardId: row.cardId,
          categoryId: row.categoryId,
          categoryTempKey: row.categoryToCreate ? row.categoryToCreate.toLowerCase() : null,
          status: row.data!.status,
          fixedVariable: row.data!.fixedVariable,
          isEssential: row.data!.isEssential,
          isRecurring: row.data!.isRecurring,
          installmentNumber: row.data!.installmentNumber,
          installmentTotal: row.data!.installmentTotal,
          notes: row.data!.notes,
        })),
      })

      const installmentsCreated = rowsToImport.filter(
        (row) =>
          row.data!.isRecurring &&
          row.data!.installmentTotal !== null &&
          row.data!.installmentNumber !== null &&
          row.data!.installmentTotal > row.data!.installmentNumber,
      ).length

      setImportedSummary({ accepted: rowsToImport.length, total: rows.length, installments: installmentsCreated })
      setCurrentImportId(batch.importRecord.id)
      setStep('done')
      showToast(
        'success',
        installmentsCreated > 0
          ? `${rowsToImport.length} movimentações importadas — ${installmentsCreated} com parcelas geraram dívida e recorrência no calendário.`
          : `${rowsToImport.length} movimentações importadas.`,
      )
    } catch {
      showToast('error', 'Não foi possível confirmar a importação. Nada foi criado.')
    }
  }

  function downloadErrorReport() {
    const rejected = rows.filter((r) => !r.isSelectable)
    const lines = ['LINHA;ERROS', ...rejected.map((r) => `${r.rowNumber};"${r.errors.join(' | ')}"`)]
    downloadTextFile('erros-importacao.txt', lines.join('\n'))
  }

  function resetFlow() {
    setStep('upload')
    setFileName('')
    setRows([])
    setSelectedRows(new Set())
    setHeaderError(null)
    setImportedSummary(null)
    setCurrentImportId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const templateContent = useMemo(
    () =>
      [
        'DATA;VENCIMENTO;DESCRICAO;VALOR;TIPO;CATEGORIA;SUBCATEGORIA;CONTA;CARTAO;STATUS;FIXO_VARIAVEL;ESSENCIAL;RECORRENTE;PARCELA_ATUAL;TOTAL_PARCELAS;OBSERVACAO',
        '10/08/2026;10/08/2026;Salário;5000,00;RECEITA;SALÁRIO;;CONTA CORRENTE;;RECEBIDO;FIXO;SIM;NAO;1;1;Salário mensal',
        '10/08/2026;10/09/2026;Notebook;350,00;DESPESA;ELETRÔNICOS;INFORMÁTICA;;NUBANK;PENDENTE;VARIAVEL;NAO;NAO;1;10;Compra parcelada',
        '15/08/2026;15/08/2026;Aluguel;1200,00;DESPESA;MORADIA;ALUGUEL;CONTA CORRENTE;;PENDENTE;FIXO;SIM;SIM;1;1;Despesa mensal',
      ].join('\n'),
    [],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Importar dados</h1>
        <p className="text-sm text-(--color-ink-400)">Importe movimentações em massa a partir de um arquivo TXT.</p>
      </div>

      {step === 'upload' && (
        <>
          <Card>
            <CardHeader title="1. Baixe o arquivo-modelo" subtitle="Use exatamente essas colunas, nesta ordem." />
            <Button variant="secondary" onClick={() => downloadTextFile('modelo-importacao.txt', templateContent)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar arquivo-modelo
            </Button>
          </Card>

          <Card>
            <CardHeader
              title="2. Envie o arquivo preenchido"
              subtitle="Formato TXT, UTF-8, colunas separadas por ponto e vírgula."
            />

            <label className="flex items-center gap-2 text-sm text-(--color-ink-900)">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-(--color-navy-100)"
                checked={autoCreateCategories}
                onChange={(e) => setAutoCreateCategories(e.target.checked)}
              />
              Criar automaticamente categorias citadas no arquivo que ainda não existem
            </label>

            <div
              className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-(--color-navy-100) bg-(--color-navy-50)/40 px-6 py-10 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handleFile(file)
              }}
            >
              <Upload className="h-8 w-8 text-(--color-navy-700)" aria-hidden="true" />
              <p className="text-sm text-(--color-ink-600)">Arraste o arquivo aqui, ou</p>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Selecionar arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>

            {headerError && (
              <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-(--color-danger-600)">
                <FileWarning className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                {headerError}
              </p>
            )}
          </Card>
        </>
      )}

      {step === 'preview' && (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-(--color-ink-900)">{fileName}</p>
              <p className="text-sm text-(--color-ink-400)">
                {rows.length} linhas · {acceptedCount} selecionadas para importar · {rejectedCount} rejeitadas
              </p>
            </div>
            <div className="flex gap-2">
              {rejectedCount > 0 && (
                <Button variant="secondary" size="sm" onClick={downloadErrorReport}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Baixar relatório de erros
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={resetFlow}>
                Cancelar
              </Button>
            </div>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-(--color-navy-100) text-left text-xs text-(--color-ink-400)">
                  <th className="px-3 py-2 font-medium">Importar</th>
                  <th className="px-3 py-2 font-medium">Linha</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Conta/Cartão</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-navy-100)">
                {rows.map((row) => (
                  <tr key={row.rowNumber} className={row.isSelectable ? '' : 'bg-(--color-danger-100)/20'}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        disabled={!row.isSelectable}
                        checked={selectedRows.has(row.rowNumber)}
                        onChange={() => toggleRow(row.rowNumber)}
                        className="h-4 w-4 rounded border-(--color-navy-100)"
                      />
                    </td>
                    <td className="px-3 py-2 text-(--color-ink-400)">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-(--color-ink-600)">
                      {row.data ? formatDate(row.data.transactionDate) : row.raw.DATA}
                    </td>
                    <td className="px-3 py-2 text-(--color-ink-900)">{row.data?.description ?? row.raw.DESCRICAO}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-(--color-ink-900)">
                      {row.data ? formatCurrency(row.data.amount) : row.raw.VALOR}
                    </td>
                    <td className="px-3 py-2 text-(--color-ink-600)">
                      {row.data?.accountName ?? row.data?.cardName ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length > 0 ? (
                        <span className="flex items-start gap-1 text-xs text-(--color-danger-600)">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                          {row.errors.join(' ')}
                        </span>
                      ) : row.warnings.length > 0 ? (
                        <span className="flex items-start gap-1 text-xs text-(--color-warning-700)">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                          {row.warnings.join(' ')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-(--color-success-700)">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Pronta para importar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={resetFlow}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              isLoading={createImportBatch.isPending || confirmImport.isPending}
              disabled={acceptedCount === 0}
            >
              Importar {acceptedCount} movimentações
            </Button>
          </div>
        </>
      )}

      {step === 'done' && importedSummary && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-(--color-success-600)" aria-hidden="true" />
          <p className="font-display text-lg font-semibold text-(--color-ink-900)">Importação concluída</p>
          <p className="text-sm text-(--color-ink-600)">
            {importedSummary.accepted} de {importedSummary.total} linhas foram importadas com sucesso. As novas
            movimentações já aparecem no Dashboard, no Calendário e em Movimentações.
          </p>
          {importedSummary.installments > 0 && (
            <p className="text-sm text-(--color-ink-600)">
              {importedSummary.installments} {importedSummary.installments === 1 ? 'linha' : 'linhas'} com parcelas
              restantes {importedSummary.installments === 1 ? 'gerou' : 'geraram'} as parcelas futuras no Calendário e
              uma dívida em Dívidas — quitando a dívida por lá, as parcelas futuras somem automaticamente.
            </p>
          )}
          <Button onClick={resetFlow}>Importar outro arquivo</Button>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Histórico de importações"
          subtitle=""
          action={<History className="h-4 w-4 text-(--color-ink-400)" aria-hidden="true" />}
        />
        {loadingHistory ? (
          <Skeleton className="h-20 w-full" />
        ) : (history?.length ?? 0) === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma importação ainda"
            description="O histórico das suas importações aparecerá aqui."
          />
        ) : (
          <ul className="divide-y divide-(--color-navy-100)">
            {history?.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-(--color-ink-900)">{h.filename}</p>
                  <p className="text-xs text-(--color-ink-400)">
                    {formatDate(h.created_at)} · {h.accepted_rows} de {h.total_rows} linhas
                    {h.id === currentImportId ? ' · agora' : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    h.status === 'confirmado'
                      ? 'bg-(--color-success-100) text-(--color-success-700)'
                      : h.status === 'cancelado'
                        ? 'bg-(--color-navy-100) text-(--color-navy-700)'
                        : 'bg-(--color-warning-100) text-(--color-warning-700)'
                  }`}
                >
                  {h.status === 'confirmado' ? 'Confirmada' : h.status === 'cancelado' ? 'Cancelada' : 'Pendente'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={duplicateWarningOpen}
        title="Arquivo já importado antes"
        description={`"${pendingFile?.name}" parece ser idêntico a um arquivo que você já importou anteriormente. Deseja importar novamente mesmo assim?`}
        confirmLabel="Importar mesmo assim"
        isDangerous={false}
        onConfirm={confirmReimport}
        onCancel={() => {
          setDuplicateWarningOpen(false)
          setPendingFile(null)
        }}
      />
    </div>
  )
}
