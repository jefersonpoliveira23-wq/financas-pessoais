-- ============================================================================
-- Migration 0006 — Fase 5: acesso restrito por lista de e-mails autorizados
-- ----------------------------------------------------------------------------
-- Por padrão qualquer pessoa conseguia criar conta (e-mail/senha, Google ou
-- GitHub). Esta migration fecha o cadastro: só quem estiver na tabela
-- authorized_emails consegue se registrar. A verificação é feita dentro do
-- trigger handle_new_user (que roda no servidor, dentro da própria transação
-- de criação do usuário em auth.users) — não é algo que dá para burlar pelo
-- app, porque nenhuma interface do cliente participa dessa checagem.
--
-- Também adiciona profiles.is_admin, usado para restringir quem pode
-- gerenciar a lista de e-mails autorizados (tela em Configurações > Acesso).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles.is_admin
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is 'Quem tem is_admin=true pode gerenciar a lista de e-mails autorizados a se cadastrar.';

-- ----------------------------------------------------------------------------
-- authorized_emails
-- ----------------------------------------------------------------------------
create table if not exists public.authorized_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  note text,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.authorized_emails is 'E-mails liberados para criar conta no app. Verificada pelo trigger handle_new_user antes de permitir o cadastro (Google, GitHub ou e-mail/senha).';

alter table public.authorized_emails enable row level security;

-- Só administradores enxergam/gerenciam a lista — o restante dos usuários
-- não precisa e não deve saber quem mais está autorizado.
create policy "authorized_emails_admin_select" on public.authorized_emails
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "authorized_emails_admin_insert" on public.authorized_emails
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "authorized_emails_admin_delete" on public.authorized_emails
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ----------------------------------------------------------------------------
-- handle_new_user: agora valida a allowlist antes de criar profile/settings.
-- Se o e-mail não estiver autorizado, a exceção reverte toda a transação —
-- inclusive o INSERT em auth.users — então a conta nunca chega a existir.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.authorized_emails
    where lower(email) = lower(new.email)
  ) then
    raise exception 'E-mail não autorizado a criar conta neste aplicativo.';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;
