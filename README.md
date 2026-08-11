# Finanças Pessoais

Aplicação web de gerenciamento financeiro pessoal: contas, movimentações,
categorias e um dashboard que mostra sua situação financeira real — com
autenticação, banco de dados relacional protegido por Row Level Security e
100% em português do Brasil.

> **Status do projeto:** Fase 1 de 4 concluída (Fundação). Veja a seção
> [Status de implementação](#status-de-implementação) para o que já funciona
> e o que está planejado para as próximas fases.

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
2. Abra o arquivo `supabase/migrations/0001_fase1_fundacao.sql` deste
   repositório, copie todo o conteúdo e cole no editor.
3. Execute (▶ Run). A criação das tabelas é idempotente
   (`create table if not exists`), mas rode apenas uma vez em cada ambiente.

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

O projeto foi combinado para ser construído em 4 fases. Este entregável
cobre a **Fase 1 — Fundação** por completo e de forma real (não há dados
fixos nem telas decorativas).

### ✅ Funcional nesta entrega (Fase 1)

- Cadastro, login, logout, recuperação de senha, alteração de senha, perfil
- Rotas protegidas (usuário não autenticado nunca acessa telas internas)
- Banco de dados com RLS completo, triggers de auditoria e de prevenção de
  vínculo cruzado entre usuários
- CRUD de contas financeiras (com saldo calculado via view, arquivamento com
  confirmação — nunca exclusão física, para preservar histórico)
- CRUD de categorias e subcategorias
- CRUD de formas de pagamento
- CRUD de movimentações (receita, despesa, transferência), com:
  - Filtros por tipo, status e conta
  - Cálculo de status "Atrasado" (computado, sem job agendado)
  - Ação rápida de "marcar como pago/recebido"
  - Exclusão com modal de confirmação
  - Regra de transferência sem dupla contagem (não conta como receita/despesa)
- Dashboard básico: saldo disponível, receitas recebidas, despesas pagas,
  resultado realizado, gráfico receitas × despesas, lista de contas e últimas
  movimentações — com filtro de mês
- Preferências do usuário (tema, reconhecimento de compras no cartão, separador decimal)
- Design system completo (paleta azul-petróleo, componentes acessíveis,
  estados vazios, skeletons, toasts, modais de confirmação)
- Layout responsivo: menu lateral recolhível no desktop, navegação inferior +
  atalho de lançamento rápido no celular
- PWA instalável com tela offline informativa (app shell), atualização
  controlada do Service Worker
- 23 testes automatizados (Vitest + Testing Library) cobrindo formatação,
  cálculo de status e regras de transferência

### 🚧 Pendente — planejado para as próximas fases

Estas telas já aparecem na navegação (para refletir a estrutura de
informação completa do produto), mas mostram um aviso claro de "ainda não
implementado" em vez de simular funcionalidade — nenhum botão finge fazer
algo que não faz.

| Item | Fase planejada |
|---|---|
| Cartões de crédito, faturas, limite | Fase 2 |
| Parcelamento automático (`installment_groups`) | Fase 2 |
| Recorrências (`recurrence_rules`) | Fase 2 |
| Calendário financeiro | Fase 2 |
| Importação em massa por TXT | Fase 2 |
| Orçamento mensal | Fase 3 |
| Dívidas, simulador bola de neve/avalanche, quitação antecipada | Fase 3 |
| Metas (modo independente e alocado), reserva de emergência | Fase 3 |
| Patrimônio (ativos/passivos) | Fase 3 |
| Planejamento mensal | Fase 3 |
| Diagnósticos automáticos e nota de saúde financeira | Fase 4 |
| Relatórios avançados e exportação CSV | Fase 4 |
| Exclusão segura de conta (requer Supabase Edge Function com `service_role`) | Fase 4 |
| Login social | Fase 4 |

> A exclusão de conta está com botão visível em **Configurações → Perfil**,
> mas ao clicar o usuário vê uma explicação honesta do motivo (não pode ser
> feita com segurança apenas no frontend) em vez de uma ação que falha
> silenciosamente ou expõe a chave `service_role` no navegador.

### Próximo passo sugerido

Para continuar para a Fase 2 (Cartões, parcelamento, recorrência, calendário,
importação), a próxima migration deve ser criada como
`supabase/migrations/0002_fase2_operacoes.sql`, adicionando (via `ALTER TABLE`
nas tabelas existentes sempre que possível, para não quebrar dados já
gravados): `credit_cards`, `installment_groups`, `recurrence_rules`, e os
novos valores de `type` em `transactions` (`compra_cartao`,
`pagamento_fatura`, etc.).

---

## Arquitetura e modelo de dados

### Diagrama relacional (Fase 1)

```
auth.users (Supabase Auth)
   │ 1:1
   ├── profiles (nome, avatar, semana começa em...)
   └── user_settings (tema, reconhecimento de cartão, separador decimal)

profiles.user
   │ 1:N
   ├── accounts ──────────────┐
   ├── categories ── 1:N ── subcategories
   ├── payment_methods        │
   └── transactions ──────────┤  (account_id, destination_account_id → accounts)
                               │  (category_id → categories, subcategory_id → subcategories)
                               │  (payment_method_id → payment_methods)
        transactions ── trigger AFTER ── audit_logs (somente leitura para o usuário)

accounts + transactions ──► view account_balances (saldo calculado, fonte única)
```

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
│   │   ├── transactions/
│   │   └── settings/
│   ├── hooks/                   # useAuth, useAccounts, useTransactions...
│   ├── lib/                     # supabase.ts, registerServiceWorker.ts
│   ├── routes/                  # router.tsx, ProtectedRoute.tsx
│   ├── schemas/                 # validação Zod (auth, account, transaction)
│   ├── types/                   # database.types.ts
│   ├── utils/                   # format.ts (formatação centralizada!), transactionStatus.ts
│   └── tests/                   # setup.ts + *.test.ts
├── supabase/
│   ├── migrations/
│   │   └── 0001_fase1_fundacao.sql
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

- [x] RLS ativo em `profiles`, `user_settings`, `payment_methods`, `categories`, `subcategories`, `accounts`, `transactions`, `audit_logs`
- [x] Políticas usam `auth.uid()`, nunca confiam em parâmetros vindos do cliente
- [x] Triggers de prevenção de vínculo cruzado entre usuários (`account_id`, `category_id`, `subcategory_id`, `payment_method_id`)
- [x] `audit_logs` só pode ser lido pelo dono; escrita só via trigger `security definer`
- [x] Frontend usa exclusivamente a chave `anon/public`
- [x] `.env` no `.gitignore`, `.env.example` sem valores reais
- [x] Constraints no banco (não só na interface): `amount > 0`, transferência exige conta de destino, conta de destino ≠ conta de origem
- [x] Exclusão de conta não implementada de forma insegura — está pendente e documentada, em vez de fingir funcionar
- [ ] *(ação sua, antes de publicar)* Confirmar que nenhum segredo real está no histórico do Git

## Checklist de testes

Cobertos nesta fase (23 testes, `npm run test`):

- [x] Formatação monetária (positivo, zero, negativo, valor inválido)
- [x] Formatação de número e percentual (padrão brasileiro, vírgula)
- [x] Conversão de entrada do usuário (vírgula ou ponto) para número
- [x] Formatação de datas ISO → DD/MM/AAAA
- [x] Cálculo do status "Atrasado" (pendente/previsto vencidos, pago/recebido/cancelado nunca mudam)
- [x] Transferência exige conta de destino
- [x] Transferência não pode ter a mesma conta de origem e destino
- [x] Valor de movimentação deve ser maior que zero

Planejados para as próximas fases (dependem de funcionalidades ainda não
implementadas): geração de parcelas, meses com menos dias, quitação
antecipada, metas independentes/alocadas, orçamento, parser do TXT,
detecção de duplicidade na importação.

## Limitações do PWA

O app é instalável (manifest + Service Worker) e mostra uma tela offline
informativa quando não há conexão — mas **não funciona totalmente offline**,
porque todos os dados financeiros vivem no Supabase e exigem rede para
carregar e salvar. O Service Worker desta fase faz cache apenas do "app
shell" estático (ícones, manifest, página offline); nenhuma chamada ao
Supabase é interceptada ou cacheada, por design — cachear dados financeiros
sensíveis em um cache público do navegador seria um risco de segurança
desnecessário.
