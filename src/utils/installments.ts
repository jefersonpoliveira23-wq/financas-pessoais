/**
 * Geração das parcelas futuras de um parcelamento (seção 9 do escopo:
 * "Parcelamento automático"). Dado o valor total, a data da 1ª parcela e o
 * número de parcelas, gera a lista completa — mantendo o mesmo dia do mês
 * nas parcelas seguintes e ajustando corretamente meses com menos dias
 * (ex.: parcela no dia 31 de janeiro -> dia 28/29 em fevereiro).
 *
 * Valores: por padrão, divide o total igualmente entre as parcelas: como a
 * divisão pode não ser exata, a diferença de arredondamento é absorvida pela
 * ÚLTIMA parcela, garantindo que a soma das parcelas sempre bate com o total
 * (nunca "perde" nem "ganha" centavos).
 */
import { toISODateOnly } from '@/utils/format'

export interface InstallmentPreviewItem {
  installmentNumber: number
  transactionDate: string
  competenceDate: string
  dueDate: string
  amount: number
}

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDayOfTargetMonth))
  return target
}

export function generateInstallmentPreview(
  firstDateISO: string,
  totalInstallments: number,
  totalAmount: number,
): InstallmentPreviewItem[] {
  if (totalInstallments < 2) {
    throw new Error('É preciso de pelo menos 2 parcelas para gerar um parcelamento.')
  }

  // Arredonda para centavos e distribui igualmente; a última parcela recebe
  // o resíduo de arredondamento das demais.
  const baseInstallment = Math.floor((totalAmount / totalInstallments) * 100) / 100
  const items: InstallmentPreviewItem[] = []
  let accumulated = 0

  const [year, month, day] = firstDateISO.split('-').map(Number)
  const firstDate = new Date(year, month - 1, day)

  for (let i = 0; i < totalInstallments; i++) {
    const isLast = i === totalInstallments - 1
    const amount = isLast ? Math.round((totalAmount - accumulated) * 100) / 100 : baseInstallment
    accumulated += amount

    const date = addMonthsClamped(firstDate, i)
    const iso = toISODateOnly(date)

    items.push({
      installmentNumber: i + 1,
      transactionDate: iso,
      competenceDate: iso,
      dueDate: iso,
      amount,
    })
  }

  return items
}
