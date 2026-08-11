import { describe, expect, it } from 'vitest'
import { effectiveStatus } from '@/utils/transactionStatus'

describe('effectiveStatus', () => {
  it('mantém "pendente" quando o vencimento ainda não passou', () => {
    const future = new Date()
    future.setDate(future.getDate() + 5)
    expect(effectiveStatus({ status: 'pendente', due_date: future.toISOString().slice(0, 10) })).toBe('pendente')
  })

  it('calcula "atrasado" quando o vencimento já passou e está pendente', () => {
    expect(effectiveStatus({ status: 'pendente', due_date: '2020-01-01' })).toBe('atrasado')
  })

  it('calcula "atrasado" quando o vencimento já passou e está previsto', () => {
    expect(effectiveStatus({ status: 'previsto', due_date: '2020-01-01' })).toBe('atrasado')
  })

  it('não altera status já efetivados (pago/recebido), mesmo com vencimento no passado', () => {
    expect(effectiveStatus({ status: 'pago', due_date: '2020-01-01' })).toBe('pago')
    expect(effectiveStatus({ status: 'recebido', due_date: '2020-01-01' })).toBe('recebido')
  })

  it('não altera cancelados', () => {
    expect(effectiveStatus({ status: 'cancelado', due_date: '2020-01-01' })).toBe('cancelado')
  })

  it('mantém o status quando não há data de vencimento', () => {
    expect(effectiveStatus({ status: 'pendente', due_date: null })).toBe('pendente')
  })
})
