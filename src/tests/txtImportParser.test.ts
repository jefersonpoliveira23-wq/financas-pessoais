import { describe, expect, it } from 'vitest'
import { parseImportFile, resolveImportRows } from '@/utils/txtImportParser'

const VALID_HEADER =
  'DATA;VENCIMENTO;DESCRICAO;VALOR;TIPO;CATEGORIA;SUBCATEGORIA;CONTA;CARTAO;STATUS;FIXO_VARIAVEL;ESSENCIAL;RECORRENTE;PARCELA_ATUAL;TOTAL_PARCELAS;OBSERVACAO'

describe('parseImportFile — parser do TXT', () => {
  it('rejeita arquivo com cabeçalho incorreto', () => {
    const result = parseImportFile('COLUNA_ERRADA;OUTRA\nvalor;valor')
    expect(result.headerError).not.toBeNull()
  })

  it('rejeita arquivo vazio', () => {
    const result = parseImportFile('')
    expect(result.headerError).toBe('Arquivo vazio.')
  })

  it('faz o parse de uma linha válida completa', () => {
    const content = `${VALID_HEADER}\n10/08/2026;10/08/2026;Salário;5000,00;RECEITA;SALÁRIO;;CONTA CORRENTE;;RECEBIDO;FIXO;SIM;NAO;1;1;Salário mensal`
    const result = parseImportFile(content)
    expect(result.headerError).toBeNull()
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.errors).toEqual([])
    expect(row.data).toMatchObject({
      type: 'receita',
      description: 'Salário',
      amount: 5000,
      transactionDate: '2026-08-10',
      status: 'recebido',
      fixedVariable: 'fixo',
      isEssential: true,
      accountName: 'CONTA CORRENTE',
    })
  })

  it('aceita valor com ponto como separador decimal', () => {
    const content = `${VALID_HEADER}\n10/08/2026;;Item;123.45;DESPESA;;;CONTA;;PENDENTE;;;;1;1;`
    const result = parseImportFile(content)
    expect(result.rows[0].data?.amount).toBe(123.45)
  })

  it('ignora linhas em branco', () => {
    const content = `${VALID_HEADER}\n\n10/08/2026;;Item;10,00;DESPESA;;;CONTA;;PENDENTE;;;;1;1;\n\n`
    const result = parseImportFile(content)
    expect(result.rows).toHaveLength(1)
  })

  it('remove BOM do início do arquivo', () => {
    const content = `\uFEFF${VALID_HEADER}\n10/08/2026;;Item;10,00;DESPESA;;;CONTA;;PENDENTE;;;;1;1;`
    const result = parseImportFile(content)
    expect(result.headerError).toBeNull()
  })
})

describe('parseImportFile — validação de campos', () => {
  function rowWith(overrides: Record<string, string>) {
    const base: Record<string, string> = {
      DATA: '10/08/2026',
      VENCIMENTO: '',
      DESCRICAO: 'Item',
      VALOR: '10,00',
      TIPO: 'DESPESA',
      CATEGORIA: '',
      SUBCATEGORIA: '',
      CONTA: 'CONTA CORRENTE',
      CARTAO: '',
      STATUS: 'PENDENTE',
      FIXO_VARIAVEL: '',
      ESSENCIAL: '',
      RECORRENTE: '',
      PARCELA_ATUAL: '1',
      TOTAL_PARCELAS: '1',
      OBSERVACAO: '',
    }
    const merged = { ...base, ...overrides }
    const line = [
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
      .map((k) => merged[k])
      .join(';')
    return parseImportFile(`${VALID_HEADER}\n${line}`).rows[0]
  }

  it('rejeita data inválida', () => {
    expect(rowWith({ DATA: '32/13/2026' }).errors.length).toBeGreaterThan(0)
  })

  it('rejeita valor zero ou negativo', () => {
    expect(rowWith({ VALOR: '0' }).errors.length).toBeGreaterThan(0)
    expect(rowWith({ VALOR: '-10' }).errors.length).toBeGreaterThan(0)
  })

  it('rejeita tipo inválido', () => {
    expect(rowWith({ TIPO: 'TRANSFERENCIA' }).errors.length).toBeGreaterThan(0)
  })

  it('rejeita status inválido', () => {
    expect(rowWith({ STATUS: 'INEXISTENTE' }).errors.length).toBeGreaterThan(0)
  })

  it('rejeita quando não há CONTA nem CARTAO', () => {
    expect(rowWith({ CONTA: '', CARTAO: '' }).errors.length).toBeGreaterThan(0)
  })

  it('rejeita quando CONTA e CARTAO estão preenchidos ao mesmo tempo', () => {
    expect(rowWith({ CONTA: 'Conta', CARTAO: 'Cartão' }).errors.length).toBeGreaterThan(0)
  })

  it('rejeita descrição vazia', () => {
    expect(rowWith({ DESCRICAO: '' }).errors.length).toBeGreaterThan(0)
  })

  it('aceita linha totalmente válida sem categoria', () => {
    expect(rowWith({}).errors).toEqual([])
  })
})

describe('resolveImportRows — contas/cartões/categorias inexistentes', () => {
  it('sinaliza conta inexistente como erro', () => {
    const parsed = parseImportFile(`${VALID_HEADER}\n10/08/2026;;Item;10,00;DESPESA;;;Conta Fantasma;;PENDENTE;;;;1;1;`)
    const resolved = resolveImportRows(parsed.rows, {
      accounts: [{ id: 'a1', name: 'Conta Corrente' }],
      cards: [],
      categories: [],
      existingTransactions: [],
      autoCreateMissingCategories: false,
    })
    expect(resolved[0].isSelectable).toBe(false)
    expect(resolved[0].errors.some((e) => e.includes('não encontrada'))).toBe(true)
  })

  it('resolve conta existente pelo nome (case-insensitive)', () => {
    const parsed = parseImportFile(`${VALID_HEADER}\n10/08/2026;;Item;10,00;DESPESA;;;conta corrente;;PENDENTE;;;;1;1;`)
    const resolved = resolveImportRows(parsed.rows, {
      accounts: [{ id: 'a1', name: 'Conta Corrente' }],
      cards: [],
      categories: [],
      existingTransactions: [],
      autoCreateMissingCategories: false,
    })
    expect(resolved[0].accountId).toBe('a1')
    expect(resolved[0].isSelectable).toBe(true)
  })

  it('categoria ausente vira aviso (não erro) quando não deve criar automaticamente', () => {
    const parsed = parseImportFile(
      `${VALID_HEADER}\n10/08/2026;;Item;10,00;DESPESA;Categoria Nova;;Conta;;PENDENTE;;;;1;1;`,
    )
    const resolved = resolveImportRows(parsed.rows, {
      accounts: [{ id: 'a1', name: 'Conta' }],
      cards: [],
      categories: [],
      existingTransactions: [],
      autoCreateMissingCategories: false,
    })
    expect(resolved[0].isSelectable).toBe(true)
    expect(resolved[0].categoryId).toBeNull()
    expect(resolved[0].warnings.length).toBeGreaterThan(0)
  })

  it('marca categoria ausente para criação automática quando habilitado', () => {
    const parsed = parseImportFile(
      `${VALID_HEADER}\n10/08/2026;;Item;10,00;DESPESA;Categoria Nova;;Conta;;PENDENTE;;;;1;1;`,
    )
    const resolved = resolveImportRows(parsed.rows, {
      accounts: [{ id: 'a1', name: 'Conta' }],
      cards: [],
      categories: [],
      existingTransactions: [],
      autoCreateMissingCategories: true,
    })
    expect(resolved[0].categoryToCreate).toBe('Categoria Nova')
  })
})

describe('resolveImportRows — detecção de duplicidade', () => {
  it('sinaliza como possível duplicata quando já existe movimentação igual', () => {
    const parsed = parseImportFile(`${VALID_HEADER}\n10/08/2026;;Aluguel;1200,00;DESPESA;;;Conta;;PENDENTE;;;;1;1;`)
    const resolved = resolveImportRows(parsed.rows, {
      accounts: [{ id: 'a1', name: 'Conta' }],
      cards: [],
      categories: [],
      existingTransactions: [{ transaction_date: '2026-08-10', description: 'Aluguel', amount: 1200 }],
      autoCreateMissingCategories: false,
    })
    expect(resolved[0].isDuplicate).toBe(true)
    // Duplicidade é um aviso, não impede a importação — o usuário decide.
    expect(resolved[0].isSelectable).toBe(true)
  })

  it('não sinaliza duplicidade quando valores diferem', () => {
    const parsed = parseImportFile(`${VALID_HEADER}\n10/08/2026;;Aluguel;1200,00;DESPESA;;;Conta;;PENDENTE;;;;1;1;`)
    const resolved = resolveImportRows(parsed.rows, {
      accounts: [{ id: 'a1', name: 'Conta' }],
      cards: [],
      categories: [],
      existingTransactions: [{ transaction_date: '2026-08-10', description: 'Aluguel', amount: 999 }],
      autoCreateMissingCategories: false,
    })
    expect(resolved[0].isDuplicate).toBe(false)
  })
})
