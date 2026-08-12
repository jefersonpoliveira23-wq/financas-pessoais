/**
 * Parser e validação do TXT de importação em massa (seção 19 do escopo).
 *
 * Formato esperado (igual ao gerado em /templates/modelo-importacao.txt):
 * UTF-8, colunas separadas por ";", datas DD/MM/AAAA, valores com vírgula ou
 * ponto decimal.
 *
 * Este módulo é dividido em duas etapas, para poder ser testado sem depender
 * do banco:
 *  1. parseImportFile — só olha para o texto do arquivo (sintaxe, tipos,
 *     datas, valores). Não sabe nada sobre contas/categorias do usuário.
 *  2. resolveImportRows — cruza cada linha já parseada com os dados reais do
 *     usuário (contas, cartões, categorias, movimentações existentes), para
 *     resolver nomes em IDs, sinalizar contas/cartões inexistentes e
 *     detectar possíveis duplicidades.
 */

export const EXPECTED_HEADER = [
  'DATA',
  'VENCIMENTO',
  'DESCRICAO',
  'VALOR',
  'TIPO',
  'CATEGORIA',
  'SUBCATEGORIA',
  'CONTA',
  'CARTAO',
  'STATUS',
  'FIXO_VARIAVEL',
  'ESSENCIAL',
  'RECORRENTE',
  'PARCELA_ATUAL',
  'TOTAL_PARCELAS',
  'OBSERVACAO',
]

export type ImportTransactionType = 'receita' | 'despesa'
export type ImportStatus = 'previsto' | 'pendente' | 'pago' | 'recebido' | 'atrasado' | 'cancelado'

export interface ParsedImportRowData {
  type: ImportTransactionType
  description: string
  amount: number
  transactionDate: string
  dueDate: string | null
  competenceDate: string
  accountName: string | null
  cardName: string | null
  categoryName: string | null
  subcategoryName: string | null
  status: ImportStatus
  fixedVariable: 'fixo' | 'variavel' | 'eventual' | null
  isEssential: boolean | null
  isRecurring: boolean
  installmentNumber: number | null
  installmentTotal: number | null
  notes: string | null
}

export interface ParsedImportRow {
  rowNumber: number
  raw: Record<string, string>
  errors: string[]
  data: ParsedImportRowData | null
}

export interface ParseResult {
  headerError: string | null
  rows: ParsedImportRow[]
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function parseBrazilianDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  if (month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null
  return `${yyyy}-${mm}-${dd}`
}

function parseAmount(value: string): number | null {
  const cleaned = value.trim()
  if (!cleaned) return null
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  let normalized = cleaned
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.')
  }
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

function parseBoolean(value: string): boolean | null {
  const normalized = stripAccents(value.trim().toUpperCase())
  if (normalized === 'SIM') return true
  if (normalized === 'NAO') return false
  if (!normalized) return null
  return null
}

const TYPE_MAP: Record<string, ImportTransactionType> = { RECEITA: 'receita', DESPESA: 'despesa' }
const STATUS_MAP: Record<string, ImportStatus> = {
  PREVISTO: 'previsto',
  PENDENTE: 'pendente',
  PAGO: 'pago',
  RECEBIDO: 'recebido',
  ATRASADO: 'atrasado',
  CANCELADO: 'cancelado',
}
const FIXED_VARIABLE_MAP: Record<string, 'fixo' | 'variavel' | 'eventual'> = {
  FIXO: 'fixo',
  VARIAVEL: 'variavel',
  EVENTUAL: 'eventual',
}

export function parseImportFile(content: string): ParseResult {
  // Remove BOM (comum em arquivos exportados do Excel) e normaliza quebras de linha.
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return { headerError: 'Arquivo vazio.', rows: [] }
  }

  const header = lines[0].split(';').map((h) => h.trim().toUpperCase())
  const headerMatches = EXPECTED_HEADER.every((col, i) => header[i] === col)
  if (!headerMatches) {
    return {
      headerError:
        'Cabeçalho não reconhecido. Use o arquivo-modelo (baixe em "Importar dados" → "Baixar arquivo-modelo") sem alterar a ordem ou os nomes das colunas.',
      rows: [],
    }
  }

  const rows: ParsedImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1 // número da linha no arquivo (1 = cabeçalho)
    const cells = lines[i].split(';')
    const raw: Record<string, string> = {}
    EXPECTED_HEADER.forEach((col, idx) => {
      raw[col] = (cells[idx] ?? '').trim()
    })

    const errors: string[] = []

    const transactionDate = parseBrazilianDate(raw.DATA)
    if (!transactionDate) errors.push('Data inválida (use DD/MM/AAAA).')

    const dueDate = raw.VENCIMENTO ? parseBrazilianDate(raw.VENCIMENTO) : null
    if (raw.VENCIMENTO && !dueDate) errors.push('Vencimento inválido (use DD/MM/AAAA).')

    if (!raw.DESCRICAO) errors.push('Descrição obrigatória.')

    const amount = parseAmount(raw.VALOR)
    if (amount === null || amount <= 0) errors.push('Valor inválido (deve ser um número maior que zero).')

    const type = TYPE_MAP[stripAccents(raw.TIPO.toUpperCase())]
    if (!type) errors.push('Tipo inválido (use RECEITA ou DESPESA).')

    const status = STATUS_MAP[stripAccents(raw.STATUS.toUpperCase())]
    if (!status) errors.push('Status inválido.')

    if (!raw.CONTA && !raw.CARTAO) errors.push('Informe CONTA ou CARTAO.')
    if (raw.CONTA && raw.CARTAO) errors.push('Informe apenas CONTA ou apenas CARTAO, não os dois.')

    const fixedVariableRaw = stripAccents(raw.FIXO_VARIAVEL.toUpperCase())
    const fixedVariable = fixedVariableRaw ? (FIXED_VARIABLE_MAP[fixedVariableRaw] ?? null) : null
    if (raw.FIXO_VARIAVEL && !fixedVariable) errors.push('FIXO_VARIAVEL inválido (use FIXO, VARIAVEL ou EVENTUAL).')

    const isEssential = raw.ESSENCIAL ? parseBoolean(raw.ESSENCIAL) : null
    if (raw.ESSENCIAL && isEssential === null) errors.push('ESSENCIAL inválido (use SIM ou NAO).')

    const isRecurringParsed = raw.RECORRENTE ? parseBoolean(raw.RECORRENTE) : false
    if (raw.RECORRENTE && isRecurringParsed === null) errors.push('RECORRENTE inválido (use SIM ou NAO).')

    const installmentNumber = raw.PARCELA_ATUAL ? Number(raw.PARCELA_ATUAL) : null
    const installmentTotal = raw.TOTAL_PARCELAS ? Number(raw.TOTAL_PARCELAS) : null
    if (raw.PARCELA_ATUAL && (!Number.isInteger(installmentNumber) || (installmentNumber ?? 0) < 1)) {
      errors.push('PARCELA_ATUAL inválida.')
    }
    if (raw.TOTAL_PARCELAS && (!Number.isInteger(installmentTotal) || (installmentTotal ?? 0) < 1)) {
      errors.push('TOTAL_PARCELAS inválido.')
    }

    const data: ParsedImportRowData | null =
      errors.length === 0
        ? {
            type: type,
            description: raw.DESCRICAO,
            amount: amount as number,
            transactionDate: transactionDate as string,
            dueDate,
            competenceDate: transactionDate as string,
            accountName: raw.CONTA || null,
            cardName: raw.CARTAO || null,
            categoryName: raw.CATEGORIA || null,
            subcategoryName: raw.SUBCATEGORIA || null,
            status: status,
            fixedVariable,
            isEssential,
            isRecurring: isRecurringParsed ?? false,
            installmentNumber,
            installmentTotal,
            notes: raw.OBSERVACAO || null,
          }
        : null

    rows.push({ rowNumber, raw, errors, data })
  }

  return { headerError: null, rows }
}

// ============================================================================
// Etapa 2 — resolução semântica (cruza com contas, cartões, categorias e
// movimentações existentes do usuário).
// ============================================================================

export interface ResolveContext {
  accounts: { id: string; name: string }[]
  cards: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  /** Movimentações já existentes, para detecção de possível duplicidade. */
  existingTransactions: { transaction_date: string; description: string; amount: number }[]
  /** Se true, categorias ausentes citadas no arquivo serão marcadas para criação automática. */
  autoCreateMissingCategories: boolean
}

export interface ResolvedImportRow extends ParsedImportRow {
  accountId: string | null
  cardId: string | null
  categoryId: string | null
  categoryToCreate: string | null
  isDuplicate: boolean
  warnings: string[]
  /** true = linha será importada se o usuário confirmar; false = sempre ignorada (erro de sintaxe). */
  isSelectable: boolean
}

function normalizeName(value: string): string {
  return stripAccents(value.trim().toLowerCase())
}

export function resolveImportRows(rows: ParsedImportRow[], context: ResolveContext): ResolvedImportRow[] {
  const accountByName = new Map(context.accounts.map((a) => [normalizeName(a.name), a.id]))
  const cardByName = new Map(context.cards.map((c) => [normalizeName(c.name), c.id]))
  const categoryByName = new Map(context.categories.map((c) => [normalizeName(c.name), c.id]))

  return rows.map((row): ResolvedImportRow => {
    const errors = [...row.errors]
    const warnings: string[] = []
    let accountId: string | null = null
    let cardId: string | null = null
    let categoryId: string | null = null
    let categoryToCreate: string | null = null
    let isDuplicate = false

    if (row.data) {
      if (row.data.accountName) {
        accountId = accountByName.get(normalizeName(row.data.accountName)) ?? null
        if (!accountId) errors.push(`Conta "${row.data.accountName}" não encontrada.`)
      }
      if (row.data.cardName) {
        cardId = cardByName.get(normalizeName(row.data.cardName)) ?? null
        if (!cardId) errors.push(`Cartão "${row.data.cardName}" não encontrado.`)
      }
      if (row.data.categoryName) {
        categoryId = categoryByName.get(normalizeName(row.data.categoryName)) ?? null
        if (!categoryId) {
          if (context.autoCreateMissingCategories) {
            categoryToCreate = row.data.categoryName
            warnings.push(`Categoria "${row.data.categoryName}" será criada automaticamente.`)
          } else {
            warnings.push(`Categoria "${row.data.categoryName}" não encontrada — a linha será importada sem categoria.`)
          }
        }
      }

      isDuplicate = context.existingTransactions.some(
        (t) =>
          t.transaction_date === row.data!.transactionDate &&
          normalizeName(t.description) === normalizeName(row.data!.description) &&
          Math.abs(t.amount - row.data!.amount) < 0.005,
      )
      if (isDuplicate) warnings.push('Possível duplicidade: já existe uma movimentação igual nesta data.')
    }

    return {
      ...row,
      errors,
      accountId,
      cardId,
      categoryId,
      categoryToCreate,
      isDuplicate,
      warnings,
      isSelectable: errors.length === 0,
    }
  })
}
