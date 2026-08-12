/**
 * Cálculo de fatura de cartão de crédito: dado o dia de fechamento e o dia
 * de vencimento do cartão, determina em qual fatura uma compra cai e quando
 * essa fatura fecha/vence.
 *
 * Regra usada (padrão dos cartões brasileiros): compras até o dia de
 * fechamento (inclusive) entram na fatura que fecha NESTE mês; compras após
 * o fechamento entram na fatura que fecha no mês seguinte. Meses com menos
 * dias que o "dia de fechamento/vencimento" configurado são tratados com
 * clamp para o último dia do mês (ex.: fechamento dia 31 em fevereiro vira
 * dia 28 ou 29).
 */
import { parseISO } from 'date-fns'
import { toISODateOnly } from '@/utils/format'

export interface InvoicePeriod {
  /** Identificador da fatura no formato "AAAA-MM", pelo mês de vencimento. */
  invoiceId: string
  closingDate: string
  dueDate: string
}

function clampDay(year: number, monthIndexZeroBased: number, day: number): Date {
  const lastDayOfMonth = new Date(year, monthIndexZeroBased + 1, 0).getDate()
  return new Date(year, monthIndexZeroBased, Math.min(day, lastDayOfMonth))
}

export function getInvoicePeriod(purchaseDateISO: string, closingDay: number, dueDay: number): InvoicePeriod {
  const purchase = parseISO(purchaseDateISO)
  const purchaseDay = purchase.getDate()

  let closingYear = purchase.getFullYear()
  let closingMonth = purchase.getMonth() // 0-indexado

  if (purchaseDay > closingDay) {
    closingMonth += 1
    if (closingMonth > 11) {
      closingMonth = 0
      closingYear += 1
    }
  }

  const closingDate = clampDay(closingYear, closingMonth, closingDay)

  let dueYear = closingYear
  let dueMonth = closingMonth
  if (dueDay < closingDay) {
    dueMonth += 1
    if (dueMonth > 11) {
      dueMonth = 0
      dueYear += 1
    }
  }
  const dueDate = clampDay(dueYear, dueMonth, dueDay)

  return {
    invoiceId: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`,
    closingDate: toISODateOnly(closingDate),
    dueDate: toISODateOnly(dueDate),
  }
}
