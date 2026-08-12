# Finanças Pessoais

Aplicação web de gerenciamento financeiro pessoal: contas, movimentações,
categorias e um dashboard que mostra sua situação financeira real — com
autenticação, banco de dados relacional protegido por Row Level Security e
100% em português do Brasil.

> **Status do projeto:** Fases 1, 2, 3 e 4 de 4 concluídas — projeto completo.
> Veja a seção [Status de implementação](#status-de-implementação) para o
> detalhamento de cada fase e as simplificações conscientes documentadas.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação](#2-instalação)
3. [Variáveis de ambiente](#3-variáveis-de-ambiente)
4. [Criação do projeto Supabase](#4-criação-do-projeto-supabase)
5. [Execução das migrations](#5-execução-das-migrations)
6. [Execução local](#6-execução-local)
7. [Testes](#7-testes)
8. [Build](#8-build)
9. [Publicação](#9-publicação)
10. [Segurança antes de tornar o repositório público](#10-segurança-antes-de-tornar-o-repositório-público)
11. [Status de implementação](#status-de-implementação)
12. [Arquitetura e modelo de dados](#arquitetura-e-modelo-de-dados)
13. [Regras financeiras](#regras-financeiras)
14. [Estrutura de pastas](#estrutura-de-pastas)
15. [Checklist de segurança](#checklist-de-segurança)
16. [Checklist de testes](#checklist-de-testes)
17. [Limitações do PWA](#limitações-do-pwa)

---

## 1. Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou superior (o projeto foi construído e testado com Node 22)
- npm 10+ (vem junto com o Node.js)
- Uma conta gratuita no [Supabase](https://supabase.com)
- Git

## 2. Instalação

```bash
git clone <url-do-seu-repositorio>
cd financas-pessoais
npm install
```

## 3. Variáveis de ambiente

Copie o arquivo de exemplo e preencha com os dados do **seu** projeto Supabase
(você cria o projeto no passo 4):

```bash
cp .env.example .env
```

```bash
# .env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica-aqui
```

> ⚠️ **Nunca** coloque a chave `service_role` no frontend, em `.env`, ou em
> qualquer arquivo commitado. Apenas a chave `anon/public` deve estar aqui —
> a segurança real dos dados vem do Row Level Security no banco, não da
> chave usada pelo cliente.
>
> O arquivo `.env` já está no `.gitignore` e nunca deve ser commitado.

## 4. Criação do projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto (escolha uma região, ex.: São Paulo/`sa-east-1`, para menor latência).
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon/public** para o seu `.env`.
3. Em **Project Settings → Auth → Email**, você pode desativar a confirmação
   de e-mail durante o desenvolvimento local (facilita testar cadastro), mas
   **reative antes de ir para produção**.
4. Em **Authentication → URL Configuration**, adicione a URL da sua aplicação
   (ex.: `http://localhost:5173` em desenvolvimento, e a URL da Vercel em
   produção) tanto em *Site URL* quanto em *Redirect URLs* — isso é necessário
   para o fluxo de "esqueci minha senha" funcionar corretamente.

## 5. Execução das migrations

As migrations ficam em `supabase/migrations/`, em ordem numérica. Você pode
aplicá-las de duas formas:

### Opção A — Colar no SQL Editor (mais simples, sem instalar nada)

1. No painel do Supabase, abra **SQL Editor**.
2. Abra, **nesta ordem**, cada arquivo em `supabase/migrations/` deste
   repositório (`0001_fase1_fundacao.sql`, `0002_fase2_operacoes.sql`,
   `0003_fase2_importacao.sql`, `0004_fase3_planejamento.sql`,
   `0005_fase4_diagnosticos.sql`), copie o conteúdo e execute (▶ Run) um de
   cada vez — a ordem importa, pois as migrations seguintes dependem das
   tabelas criadas nas anteriores.
3. A criação das tabelas é idempotente (`create table if not exists`), mas
   rode cada migration apenas uma vez em cada ambiente.

### Opção B — Supabase CLI (recomendado para times/CI)

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

### Dados fictícios (opcional)

Depois de criar sua conta pelo próprio app, você pode popular dados de teste
com `supabase/seed.sql`. O script tem instruções no topo do arquivo (é
preciso colar o UUID do seu usuário de teste antes de rodar) — **nenhum dado
real deve ser usado aqui**.

### Deploy da Edge Function de exclusão de conta (Fase 4)

A exclusão definitiva de conta (Configurações → Perfil) depende de uma
Supabase Edge Function, porque apagar um usuário exige a chave
`service_role` — que nunca deve rodar no navegador. Sem esse deploy, o botão
"Excluir minha conta" mostra um erro amigável ao usuário, mas o resto do app
funciona normalmente.

```bash
supabase functions deploy delete-account --project-ref SEU_PROJECT_REF
```

Não é preciso cadastrar nenhuma variável de ambiente manualmente: o Supabase
já injeta `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
automaticamente dentro de toda Edge Function do projeto.

### Login social — Google e GitHub (opcional, Fase 4)

Os botões "Google" e "GitHub" nas telas de entrar/criar conta usam
`supabase.auth.signInWithOAuth` — funcionam assim que você habilita o
provedor correspondente:

1. No painel do Supabase, vá em **Authentication → Providers** e habilite
   **Google** e/ou **GitHub**, seguindo o passo a passo de cada um (criar as
   credenciais OAuth no Google Cloud Console / GitHub Developer Settings e
   colar o Client ID/Secret).
2. Confirme que a mesma URL usada em **Authentication → URL Configuration**
   (seção 4 deste README) está correta — é para lá que o provedor
   redireciona depois do login.

Se nenhum provedor for habilitado, os botões continuam visíveis mas o
Supabase retorna um erro claro ("provider is not enabled") — o app não
quebra, só orienta o usuário a tentar e-mail/senha.

## 6. Execução local

```bash
npm run dev
```

Acesse `http://localhost:5173`, crie uma conta pela tela de cadastro e
comece a usar.

## 7. Testes

```bash
npm run test        # roda a suíte uma vez
npm run test:watch  # modo watch, útil durante o desenvolvimento
npm run test:ui     # interface visual do Vitest
```

## 8. Build

```bash
npm run build     # tsc -b && vite build — gera a pasta dist/
npm run preview   # serve a build de produção localmente para conferência
```

## 9. Publicação

### Vercel (recomendado)

1. Importe o repositório no [Vercel](https://vercel.com/new).
2. O Vercel detecta automaticamente que é um projeto Vite. Confirme:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` com os mesmos valores do seu `.env`.
4. Como é uma SPA com rotas via `react-router-dom`, adicione um arquivo
   `vercel.json` na raiz (crie-o se for publicar lá) com um rewrite para
   `index.html`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
5. Deploy. Depois, volte ao Supabase e adicione a URL de produção em
   **Authentication → URL Configuration**.

### GitHub Pages (alternativa)

O GitHub Pages serve arquivos estáticos sem suporte nativo a rotas de SPA
(um refresh em `/movimentacoes` retorna 404). Para funcionar:

1. Defina `base` no `vite.config.ts` com o nome do repositório, ex.:
   ```ts
   export default defineConfig({
     base: '/nome-do-repositorio/',
     // ...resto da config
   })
   ```
2. Gere a build (`npm run build`) e publique o conteúdo de `dist/` no branch
   `gh-pages` (pode usar a action `peaceiris/actions-gh-pages` ou o pacote
   `gh-pages` via npm).
3. Duplique `dist/index.html` como `dist/404.html` **antes de publicar** —
   esse é o truque padrão para SPAs no GitHub Pages: o GitHub serve o
   `404.html` em qualquer rota desconhecida, e o React Router assume a partir
   daí no cliente.
4. Atualize as *Redirect URLs* no Supabase Auth para a URL do GitHub Pages.

A Vercel é recomendada por lidar com o roteamento de SPA automaticamente e
não exigir esses ajustes manuais.

## 10. Segurança antes de tornar o repositório público

Antes de dar `git push` para um repositório **público**, confirme:

- [ ] `.env` não está commitado (`git status` não deve listá-lo)
- [ ] `.env.example` só tem placeholders, nunca valores reais
- [ ] Nenhum print, log ou arquivo de teste com dados financeiros reais foi commitado
- [ ] A chave usada no frontend é a `anon/public`, nunca a `service_role`
- [ ] RLS está ativo em todas as tabelas (confirme rodando a query abaixo no SQL Editor)
- [ ] O histórico do Git não tem commits antigos com segredos (`git log -p` ou uma ferramenta como `gitleaks`)

```sql
-- Confirma que RLS está ativo em todas as tabelas públicas
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
-- rowsecurity deve ser "true" em todas as linhas
```

---

## Status de implementação

O projeto foi combinado para ser construído em 4 fases — **todas concluídas
nesta entrega**, de forma real (não há dados fixos nem telas decorativas):
**Fase 1 — Fundação**, **Fase 2 — Operações financeiras**, **Fase 3 —
Planejamento** e **Fase 4 — Diagnósticos e Relatórios**.

### ✅ Funcional nesta entrega (Fases 1 a 4 — projeto completo)

**Fundação (Fase 1)**
- Cadastro, login, logout, recuperação de senha, alteração de senha, perfil
- Rotas protegidas (usuário não autenticado nunca acessa telas internas)
- Banco de dados com RLS completo, triggers de auditoria e de prevenção de
  vínculo cruzado entre usuários
- CRUD de contas financeiras (com saldo calculado via view, arquivamento com
  confirmação — nunca exclusão física, para preservar histórico)
- CRUD de categorias, subcategorias e formas de pagamento
- Dashboard básico, preferências do usuário, design system, layout responsivo,
  PWA instalável

**Operações financeiras (Fase 2)**
- **Cartões de crédito**: CRUD, cálculo de fatura pela data de fechamento
  (com tratamento de meses com menos dias e virada de ano), limite
  usado/disponível calculado no banco (view `credit_card_summary`), pagamento
  de fatura integral ou parcial sem duplicar despesa
- **Movimentações** agora também suportam compra no cartão (`compra_cartao`)
- **Parcelamento automático**: ao cadastrar uma movimentação com mais de 1
  parcela, o sistema mostra a prévia das parcelas restantes (valores iguais
  ou personalizados, com a última parcela sempre recalculada para a soma
  bater com o total) antes de confirmar; tudo é criado atomicamente via RPC
  (`create_installment_group`). Editar/excluir permite escolher entre
  "somente esta parcela", "esta e as próximas" ou "todas as parcelas"
- **Recorrências**: criação de despesas/receitas recorrentes (semanal,
  quinzenal, mensal, bimestral, trimestral, semestral, anual ou intervalo
  personalizado), com pausar/retomar/encerrar. A materialização das
  ocorrências é sob demanda e em janela curta (hoje + 3 meses) — nunca gera
  registros infinitos
- **Calendário financeiro**: grade mensal com os lançamentos de cada dia,
  linha de saldo projetado dia a dia, identificação automática do primeiro
  dia com saldo negativo, do menor saldo projetado do mês, do valor livre até
  a próxima receita e do dia com maior concentração de vencimentos
- **Importação em massa por TXT**: modelo para download, upload por
  arrastar-e-soltar, prévia linha a linha com seleção individual, validação
  completa (datas, valores, tipos, status), identificação de contas/cartões
  inexistentes (nunca criados automaticamente), opção de criar categorias
  ausentes, detecção de possível duplicidade, hash do arquivo com aviso de
  reimportação, relatório de erros para download, histórico de importações,
  confirmação transacional via RPC (`confirm_import`)
**Planejamento (Fase 3)**

- **Orçamento mensal**: limite por categoria com orçado × realizado calculado
  no banco (view `budget_progress` — soma despesas e compras no cartão do mês
  de competência, nunca transferências), barra de consumo com estados
  ok/alerta (80%)/estourado, navegação entre meses e cópia dos orçamentos do
  mês anterior
- **Dívidas**: cadastro com saldo devedor, juros mensais, pagamento mínimo e
  vencimento; registro de pagamento atômico via RPC (`register_debt_payment`,
  `security invoker`) que abate o saldo e marca quitação automática;
  **simulador de quitação** comparando bola de neve × avalanche (tempo,
  total pago, juros e ordem de quitação — 100% no navegador, nada é gravado)
- **Metas**: modo independente (aportes/resgates manuais) e modo alocado
  (progresso acompanha o saldo de uma conta vinculada, sem duplicar
  dinheiro), marcação de reserva de emergência, cálculo do aporte mensal
  necessário para bater a meta na data-alvo
- **Patrimônio**: ativos e passivos com categorias, snapshot automático do
  valor do ativo a cada atualização (`asset_value_history`), e patrimônio
  líquido consolidado na view `net_worth_summary` (contas + ativos − passivos
  − dívidas ativas, com trava contra dupla contagem de dívida vinculada a
  passivo)
- **Planejamento mensal**: renda prevista − orçamento − mínimos das dívidas −
  poupança planejada = sobra livre, com alerta quando o plano compromete mais
  que a renda
- 91 testes automatizados (Vitest + Testing Library), incluindo cálculo de
  fatura, geração de parcelas, projeção diária de saldo, parser/validação da
  importação TXT, simulador de quitação, progresso de metas e status do
  orçamento

**Diagnósticos e Relatórios (Fase 4)**

- **Nota de saúde financeira** (0 a 100): combina quatro sinais — taxa de
  poupança (peso 40), cobertura da reserva de emergência em meses de despesa
  (peso 25), comprometimento mensal com dívidas (peso 20) e aderência ao
  orçamento do mês (peso 15). Sinais sem dado cadastrado (ex.: sem dívidas)
  não penalizam a nota — o peso é redistribuído entre os sinais disponíveis.
  Toda a lógica vive em `src/utils/healthScore.ts`, testável e sem tocar no
  banco
- **Alertas automáticos**: gastos acima da renda, poupança abaixo de 10%,
  reserva cobrindo menos de 3 meses, dívidas comprometendo mais de 30% da
  renda, categorias de orçamento estouradas — cada um com o texto explicando
  o motivo
- **Relatórios**: gráfico de receitas × despesas realizadas mês a mês (3/6/12
  meses, view `monthly_cashflow`) e maiores categorias de despesa no período
  (despesas + compras no cartão, nunca transferências)
- **Exportação CSV** das movimentações do período selecionado — separador
  vírgula, decimal brasileiro, BOM UTF-8 (abre corretamente no Excel), campos
  com vírgula/aspas/quebra de linha corretamente escapados (RFC 4180)
- **Exclusão segura de conta**: Supabase Edge Function (`supabase/functions/delete-account`)
  usando `service_role` — roda no servidor, nunca no navegador; o id do
  usuário vem do token JWT validado na função (nunca do corpo da requisição),
  então um usuário só pode excluir a própria conta. Todas as tabelas
  referenciam `auth.users` com `on delete cascade`, então apagar o usuário já
  remove todos os dados financeiros associados, sem registros órfãos
- **Login social**: botões de Google e GitHub nas telas de entrar/criar conta
  via `supabase.auth.signInWithOAuth` — funcionam assim que os provedores
  são habilitados no painel (seção 5 deste README); sem habilitar, o app
  continua funcionando normalmente com e-mail/senha
- 108 testes automatizados (Vitest + Testing Library) — 17 novos nesta fase:
  10 cobrindo a nota de saúde financeira (cada sinal isolado, pesos
  redistribuídos, alertas) e 7 cobrindo a exportação CSV (escapes RFC 4180,
  formatação decimal brasileira)

Simplificações conscientes desta entrega, documentadas para não parecerem bugs:
- A importação TXT cria a movimentação com o `PARCELA_ATUAL`/`TOTAL_PARCELAS`
  informados apenas como referência — ela não aciona automaticamente a
  geração das parcelas restantes (isso continua disponível manualmente em
  Movimentações). Também não cria recorrências automaticamente a partir da
  coluna `RECORRENTE`.
- A edição de parcelas com escopo "esta e as próximas" / "todas" está
  disponível para **exclusão**; a edição de campos (descrição, categoria...)
  com esses mesmos escopos ainda é feita apenas parcela a parcela.
- A projeção de saldo do Calendário não contabiliza transferências entre
  contas (o efeito de uma transferência entre contas próprias tende a zero) e
  só projeta a partir de hoje — não reconstrói saldo histórico.
- O pagamento de dívida registrado em **Dívidas** abate o saldo devedor, mas
  **não cria automaticamente uma despesa** em Movimentações (evita dupla
  contagem quando a parcela da dívida já está lançada lá — ex.: veio de uma
  importação ou recorrência). Se quiser refletir no caixa, lance a despesa
  normalmente em Movimentações.
- Aportes de metas independentes são registros próprios da meta — também não
  movimentam contas (mesma lógica: o dinheiro pode já estar contabilizado).
  No modo alocado isso não se aplica, pois o progresso lê o saldo real da
  conta.
- O simulador de quitação assume juros compostos mensais constantes e
  orçamento fixo — é uma projeção educativa, não um cálculo contratual.
- A nota de saúde financeira usa a média dos últimos 3 meses de receitas
  recebidas e despesas pagas (view `monthly_cashflow`) — um único mês atípico
  (ex.: uma despesa grande e pontual) pesa menos do que pesaria olhando só o
  mês corrente, mas a nota ainda pode variar bastante com poucos meses de
  histórico.
- O login social depende dos provedores (Google/GitHub) estarem habilitados
  no painel do Supabase — isso é uma configuração feita por você fora do
  código (seção 5 deste README), não algo que o app possa fazer sozinho.
- A exclusão de conta remove o usuário de `auth.users`, e todas as tabelas em
  cascata (`on delete cascade`). Ela **não** passa por uma tela de "exportar
  meus dados antes de excluir" — se quiser um backup, use a exportação CSV
  em Relatórios antes de confirmar a exclusão.

> **Projeto completo:** as 4 fases planejadas foram entregues de forma real.
> Ideias razoáveis para uma eventual Fase 5 — fora do escopo original —
> incluem: metas compartilhadas entre usuários, notificações por e-mail de
> vencimentos, categorização automática por IA na importação, e exportação
> em PDF dos relatórios.

---

## Arquitetura e modelo de dados

### Diagrama relacional (Fase 1 + Fase 2)

```
auth.users (Supabase Auth)
   │ 1:1
   ├── profiles (nome, avatar, semana começa em...)
   └── user_settings (tema, reconhecimento de cartão, separador decimal)

profiles.user
   │ 1:N
   ├── accounts ──────────────┐
   ├── credit_cards           │
   ├── categories ── 1:N ── subcategories
   ├── payment_methods        │
   ├── installment_groups     │  (agrupa parcelas)
   ├── recurrence_rules       │  (gera ocorrências sob demanda)
   ├── imports ── 1:N ── import_rows
   └── transactions ──────────┤  (account_id, destination_account_id → accounts; card_id → credit_cards)
                               │  (installment_group_id → installment_groups)
                               │  (recurrence_rule_id → recurrence_rules)
                               │  (category_id → categories, subcategory_id → subcategories)
                               │  (payment_method_id → payment_methods)
        transactions ── trigger AFTER ── audit_logs (somente leitura para o usuário)

accounts + transactions ──► view account_balances (saldo calculado, fonte única)
credit_cards + transactions ──► view credit_card_summary (limite usado/disponível)
```

### Cartões: compra vs. pagamento de fatura, sem dupla contagem

Uma `compra_cartao` nunca toca o saldo de nenhuma conta — ela só afeta o
`used_limit` calculado pela view `credit_card_summary`. Quando a fatura é
paga (`pagamento_fatura`), aí sim o saldo da conta pagadora é reduzido —
exatamente como uma despesa comum — mas o `used_limit` do cartão também
diminui na mesma proporção. Resultado: o valor da compra nunca é contado
duas vezes (uma no limite do cartão e outra como despesa da conta).

### Parcelamento e recorrência não são a mesma coisa

- **Parcelamento** (`installment_groups`) tem uma quantidade definida de
  parcelas, criadas todas de uma vez (via RPC transacional) no momento do
  cadastro.
- **Recorrência** (`recurrence_rules`) descreve uma regra (frequência,
  início, fim opcional) e suas ocorrências são geradas aos poucos, sob
  demanda, numa janela curta — nunca de uma vez só até o infinito.

### Por que uma `view` para saldo, em vez de calcular no frontend?

O saldo de uma conta depende de somar/subtrair movimentações efetivadas
(`pago`/`recebido`) considerando o tipo (receita soma, despesa subtrai,
transferência move entre duas contas). Se esse cálculo fosse feito em cada
tela do frontend, corremos o risco de duas telas calcularem de formas
ligeiramente diferentes (bug clássico de "fonte da verdade duplicada"). A
view `account_balances` centraliza essa regra no banco — dashboard, tela de
Contas e (nas próximas fases) relatórios e calendário todos leem do mesmo
lugar.

### Prevenção de vínculo cruzado entre usuários

A foreign key sozinha garante que `transactions.account_id` aponta para uma
conta que existe — mas **não** garante que essa conta pertence ao mesmo
usuário da movimentação. Isso é reforçado por triggers
(`check_transaction_owner`, `check_subcategory_owner`) que comparam
explicitamente o `user_id` das duas pontas antes de aceitar o
INSERT/UPDATE, além do RLS que já impede a leitura de dados de outros
usuários.

---

## Regras financeiras

### Competência × Caixa

- **Data de competência** (`competence_date`): mês ao qual o valor pertence
  para fins de orçamento e relatórios (ex.: uma compra parcelada em outubro
  tem 3 parcelas com competências em out/nov/dez).
- **Data de caixa** (`paid_date`/`transaction_date` conforme o status): quando
  o dinheiro de fato saiu ou entrou na conta.

O dashboard da Fase 1 usa `competence_date` para os filtros de mês e status
`pago`/`recebido` para os indicadores "realizados" — ou seja, já mistura as
duas visões de forma proposital: "o que pertence a este mês" filtrado por "o
que já efetivamente aconteceu".

### Dupla contagem — o que NUNCA deve somar duas vezes

- **Transferências** entre contas não são receita nem despesa. Elas só
  aparecem no resultado (receitas − despesas) se você as contar por engano —
  por isso os cálculos de indicadores do dashboard filtram explicitamente
  `type = 'receita'` e `type = 'despesa'`, nunca `transferencia`.
- **Pagamento de fatura de cartão** (Fase 2) vai liquidar a obrigação do
  cartão, não gerar uma despesa nova — a despesa já foi reconhecida na compra
  (ou no fechamento da fatura, dependendo da preferência configurada em
  Configurações → Preferências).
- **Aportes/resgates de investimento** (Fase 2/3) não deverão contar como
  despesa/receita do mês; eles mudam a composição do patrimônio, não o
  resultado.

### Status "Atrasado" — calculado, não armazenado

Uma movimentação não muda de `pendente` para `atrasado` sozinha no banco (o
que exigiria um job agendado rodando todo dia). Em vez disso, a função
`effectiveStatus` (`src/utils/transactionStatus.ts`) calcula isso em tempo de
leitura: se o status salvo é `previsto` ou `pendente` **e** a data de
vencimento já passou, a interface mostra "Atrasado" sem alterar o valor no
banco. Está coberto por testes automatizados.

---

## Estrutura de pastas

```
financas-pessoais/
├── public/
│   ├── icons/                  # ícones do PWA (temporários, substituíveis)
│   ├── templates/
│   │   └── modelo-importacao.txt
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   ├── offline.html            # tela offline informativa
│   └── sw.js                   # Service Worker (app shell apenas)
├── src/
│   ├── components/
│   │   ├── layout/              # Sidebar, MobileNav, AppLayout, ComingSoon...
│   │   └── ui/                  # Button, Input, Card, Toast, ConfirmDialog...
│   ├── features/                # uma pasta por área de negócio
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── accounts/
│   │   ├── cards/                 # cartões, faturas, pagamento
│   │   ├── transactions/          # movimentações + parcelamento
│   │   ├── recurrences/           # recorrências (aba dentro de Movimentações)
│   │   ├── calendar/              # calendário financeiro + projeção
│   │   ├── import/                # importação em massa por TXT
│   │   └── settings/
│   ├── hooks/                   # useAuth, useAccounts, useCreditCards, useInstallments,
│   │                             # useRecurrences, useImports, useTransactions...
│   ├── lib/                     # supabase.ts, registerServiceWorker.ts
│   ├── routes/                  # router.tsx, ProtectedRoute.tsx
│   ├── schemas/                 # validação Zod (auth, account, transaction)
│   ├── types/                   # database.types.ts
│   ├── utils/                   # format.ts (formatação centralizada!), transactionStatus.ts,
│   │                             # creditCard.ts, installments.ts, calendarProjection.ts,
│   │                             # txtImportParser.ts
│   └── tests/                   # setup.ts + *.test.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_fase1_fundacao.sql
│   │   ├── 0002_fase2_operacoes.sql      # cartões, parcelamento, recorrência
│   │   └── 0003_fase2_importacao.sql     # imports, import_rows
│   └── seed.sql                 # dados fictícios opcionais
├── .env.example
├── eslint.config.js
├── .prettierrc.json
├── vite.config.ts                # inclui config do Vitest
└── package.json
```

**Regra do projeto:** nenhum componente formata moeda, data ou percentual
"na mão" — tudo passa por `src/utils/format.ts`. Isso está coberto por
testes e é o que garante R$ 1.234,56 / DD/MM/AAAA em todo o app.

---

## Checklist de segurança

- [x] RLS ativo em todas as tabelas privadas: `profiles`, `user_settings`, `payment_methods`, `categories`, `subcategories`, `accounts`, `transactions`, `audit_logs`, `credit_cards`, `installment_groups`, `recurrence_rules`, `imports`, `import_rows`, `budgets`, `debts`,
  `debt_payments`, `goals`, `goal_contributions`, `assets`, `liabilities`,
  `asset_value_history`, `monthly_plans`
- [x] Políticas usam `auth.uid()`, nunca confiam em parâmetros vindos do cliente
- [x] Triggers de prevenção de vínculo cruzado entre usuários (contas, cartões, categorias, subcategorias, formas de pagamento, grupos de parcelas, regras de recorrência)
- [x] `audit_logs` só pode ser lido pelo dono; escrita só via trigger `security definer`
- [x] RPCs (`create_installment_group`, `materialize_recurrence_rule`, `confirm_import`) rodam como `security invoker` — RLS e triggers de dono continuam valendo, sem elevar privilégio
- [x] Importação TXT: nunca executa conteúdo do arquivo, valida extensão além do nome, limita tamanho (2 MB) e linhas (2000), nunca cria contas/cartões automaticamente
- [x] Frontend usa exclusivamente a chave `anon/public`
- [x] `.env` no `.gitignore`, `.env.example` sem valores reais
- [x] Constraints no banco (não só na interface): valores monetários `> 0`, combinação válida de conta/cartão por tipo de movimentação, transferência exige conta de destino diferente da origem
- [x] Exclusão de conta implementada com `service_role` isolado em Edge Function — nunca exposta ao frontend
- [ ] *(ação sua, antes de publicar)* Fazer o deploy da Edge Function `delete-account` (seção 5) — sem isso, o botão de exclusão mostra um erro amigável em vez de funcionar
- [ ] *(ação sua, se for usar login social)* Habilitar os provedores Google/GitHub em Authentication → Providers (seção 5)
- [ ] *(ação sua, antes de publicar)* Confirmar que nenhum segredo real está no histórico do Git

## Checklist de testes

Cobertos até esta fase (108 testes, `npm run test`):

- [x] Formatação monetária, numérica, percentual e de datas (padrão brasileiro)
- [x] Cálculo do status "Atrasado" (computado, nunca altera pago/recebido/cancelado)
- [x] Regras de transferência (exige destino, destino ≠ origem, sem dupla contagem)
- [x] Compra no cartão exige cartão selecionado
- [x] Definição da fatura pela data de fechamento, incluindo meses com menos dias e virada de ano/bissexto
- [x] Geração de parcelas: quantidade correta, mesmo dia do mês, ajuste em meses menores, soma sempre bate com o total (mesmo com dízima)
- [x] Projeção diária de saldo: aplicação no dia certo, itens atrasados agrupados em "hoje", identificação do primeiro dia negativo e do menor saldo do período
- [x] Parser do TXT: cabeçalho, datas, valores (vírgula/ponto), linhas em branco, BOM
- [x] Validação da importação: campos obrigatórios, tipos/status inválidos, conta e cartão mutuamente exclusivos
- [x] Contas e cartões inexistentes identificados corretamente; categorias ausentes resolvidas conforme a opção escolhida
- [x] Detecção de possível duplicidade na importação (mesma data + descrição + valor)
- [x] Simulador de quitação: inviabilidade (orçamento < mínimos; juros ≥ orçamento), ordem bola de neve × avalanche, avalanche nunca paga mais juros, fechamento contábil (total pago = principal + juros), último mês não estoura o saldo
- [x] Metas: progresso independente (aportes, resgate nunca negativo) × alocado (limitado ao alvo, conta negativa = 0), aporte mensal necessário até a data-alvo
- [x] Orçamento: status ok/alerta (80%)/estourado, restante negativo, divisão por zero, normalização de mês e virada de ano
- [x] Nota de saúde financeira: cada sinal isolado (poupança, reserva, dívidas, orçamento), pesos redistribuídos quando um sinal não tem dado, alertas disparando nos limiares certos, nota sempre entre 0 e 100
- [x] Exportação CSV: cabeçalho em português, decimal brasileiro, escape de vírgula/aspas/quebra de linha (RFC 4180), múltiplas linhas separadas por CRLF

Não cobertos por testes automatizados (dependem de infraestrutura externa
real): a Edge Function `delete-account` (Deno, roda no Supabase) e o fluxo de
login social (depende de provedores OAuth de terceiros) — ambos foram
revisados manualmente linha a linha; testá-los de ponta a ponta exige um
projeto Supabase real com os provedores configurados, fora do escopo deste
ambiente de desenvolvimento local. Também não coberto: isolamento por
usuário em teste de integração (idem, requer projeto Supabase real).

## Limitações do PWA

O app é instalável (manifest + Service Worker) e mostra uma tela offline
informativa quando não há conexão — mas **não funciona totalmente offline**,
porque todos os dados financeiros vivem no Supabase e exigem rede para
carregar e salvar. O Service Worker desta fase faz cache apenas do "app
shell" estático (ícones, manifest, página offline); nenhuma chamada ao
Supabase é interceptada ou cacheada, por design — cachear dados financeiros
sensíveis em um cache público do navegador seria um risco de segurança
desnecessário.
