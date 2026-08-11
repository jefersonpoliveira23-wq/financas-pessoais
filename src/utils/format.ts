/**
 * Funções de formatação centralizadas.
 *
 * Regra do projeto: nenhum componente deve formatar moeda, data ou percentual
 * "na mão" — sempre importar daqui. Isso garante consistência (R$ 1.234,56,
 * DD/MM/AAAA, timezone America/Sao_Paulo) em toda a aplicação.
 */
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const TIMEZONE = 'America/Sao_Paulo'
const LOCALE = 'pt-BR'

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
})

const numberFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Formata um valor numérico como moeda brasileira: 1234.56 -> "R$ 1.234,56" */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return currencyFormatter.format(0)
  return currencyFormatter.format(value)
}

/** Formata um número simples com separador decimal brasileiro: 1234.5 -> "1.234,50" */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return numberFormatter.format(0)
  return numberFormatter.format(value)
}

/**
 * Formata uma fração (0 a 1) como percentual brasileiro: 0.783 -> "78,3%"
 * Se `value` já vier como "78.3" (0-100), passe `{ alreadyPercent: true }`.
 */
export function formatPercent(value: number, options?: { alreadyPercent?: boolean }): string {
  const fraction = options?.alreadyPercent ? value / 100 : value
  if (!Number.isFinite(fraction)) return percentFormatter.format(0)
  return percentFormatter.format(fraction)
}

/**
 * Converte texto digitado pelo usuário (aceita vírgula OU ponto como
 * separador decimal) em número. Ex.: "1.234,56" -> 1234.56, "1234.56" -> 1234.56
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.trim()
  if (!cleaned) return NaN

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  let normalized = cleaned
  if (hasComma && hasDot) {
    // Formato "1.234,56": ponto é milhar, vírgula é decimal.
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    // Formato "1234,56"
    normalized = cleaned.replace(',', '.')
  }
  // Se só tem ponto, já está no formato aceito pelo Number().

  return Number(normalized)
}

/** Formata uma data ISO ("2026-08-10") como "10/08/2026". Aceita Date também. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

/** Formata uma data ISO como "10 de agosto de 2026". */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/** Formata um mês/ano ISO como "agosto de 2026". */
export function formatMonthYear(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  return format(date, "MMMM 'de' yyyy", { locale: ptBR })
}

/** Converte uma Date para o formato ISO usado no banco (YYYY-MM-DD, sem hora). */
export function toISODateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
