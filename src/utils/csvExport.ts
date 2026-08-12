/**
 * Exportação de movimentações para CSV — separado por vírgula, UTF-8 com BOM
 * (para o Excel no Windows reconhecer acentuação automaticamente), campos com
 * vírgula/aspas/quebra de linha entre aspas duplas (RFC 4180).
 */

export interface CsvTransactionRow {
  date: string
  description: string
  category: string
  type: string
  status: string
  amount: number
  account: string
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const HEADERS = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor', 'Conta/Cartão']

export function transactionsToCsv(rows: CsvTransactionRow[]): string {
  const lines = [HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.date,
        escapeCsvField(row.description),
        escapeCsvField(row.category),
        row.type,
        row.status,
        row.amount.toFixed(2).replace('.', ','),
        escapeCsvField(row.account),
      ].join(','),
    )
  }
  return lines.join('\r\n')
}

/** Aciona o download do CSV no navegador (BOM UTF-8 para abrir certo no Excel). */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
