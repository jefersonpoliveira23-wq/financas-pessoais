-- ============================================================================
-- Migration 0007 — categorias e subcategorias padrão para novos usuários
-- ----------------------------------------------------------------------------
-- Cria a função seed_default_categories, que insere um conjunto de
-- categorias/subcategorias comuns para um usuário. Ela é chamada
-- automaticamente pelo handle_new_user sempre que uma conta nova é criada
-- (dentro da allowlist da migration 0006), e também é rodada uma vez aqui
-- para todo mundo que já tem conta e ainda não tem nenhuma categoria.
--
-- As categorias pré-cadastradas são só um ponto de partida: o usuário pode
-- editar ou excluir qualquer uma delas normalmente em Configurações >
-- Categorias, não existe nenhuma trava especial para elas.
-- ============================================================================

create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_id uuid;
begin
  -- Receitas
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Receitas', 'receita')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Salário'),
    (p_user_id, v_cat_id, 'Freelance / Renda extra'),
    (p_user_id, v_cat_id, 'Investimentos'),
    (p_user_id, v_cat_id, 'Reembolsos'),
    (p_user_id, v_cat_id, 'Outras receitas')
  on conflict (category_id, name) do nothing;

  -- Moradia
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Moradia', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Aluguel/Financiamento'),
    (p_user_id, v_cat_id, 'Condomínio'),
    (p_user_id, v_cat_id, 'IPTU'),
    (p_user_id, v_cat_id, 'Energia'),
    (p_user_id, v_cat_id, 'Água'),
    (p_user_id, v_cat_id, 'Gás'),
    (p_user_id, v_cat_id, 'Internet'),
    (p_user_id, v_cat_id, 'Manutenção')
  on conflict (category_id, name) do nothing;

  -- Alimentação
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Alimentação', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Mercado'),
    (p_user_id, v_cat_id, 'Restaurantes/Delivery'),
    (p_user_id, v_cat_id, 'Padaria')
  on conflict (category_id, name) do nothing;

  -- Transporte
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Transporte', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Combustível'),
    (p_user_id, v_cat_id, 'Transporte público'),
    (p_user_id, v_cat_id, 'Apps (Uber/99)'),
    (p_user_id, v_cat_id, 'Manutenção do veículo'),
    (p_user_id, v_cat_id, 'Estacionamento'),
    (p_user_id, v_cat_id, 'Seguro do veículo')
  on conflict (category_id, name) do nothing;

  -- Saúde
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Saúde', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Plano de saúde'),
    (p_user_id, v_cat_id, 'Farmácia'),
    (p_user_id, v_cat_id, 'Consultas/Exames'),
    (p_user_id, v_cat_id, 'Academia')
  on conflict (category_id, name) do nothing;

  -- Educação
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Educação', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Mensalidade'),
    (p_user_id, v_cat_id, 'Cursos'),
    (p_user_id, v_cat_id, 'Livros/Material')
  on conflict (category_id, name) do nothing;

  -- Lazer
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Lazer', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Streaming'),
    (p_user_id, v_cat_id, 'Viagens'),
    (p_user_id, v_cat_id, 'Bares/Shows'),
    (p_user_id, v_cat_id, 'Hobbies')
  on conflict (category_id, name) do nothing;

  -- Compras pessoais
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Compras pessoais', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Roupas'),
    (p_user_id, v_cat_id, 'Eletrônicos'),
    (p_user_id, v_cat_id, 'Cuidados pessoais')
  on conflict (category_id, name) do nothing;

  -- Assinaturas
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Assinaturas', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Streaming'),
    (p_user_id, v_cat_id, 'Softwares/Apps')
  on conflict (category_id, name) do nothing;

  -- Dívidas
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Dívidas', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Cartão de crédito'),
    (p_user_id, v_cat_id, 'Empréstimos'),
    (p_user_id, v_cat_id, 'Financiamentos')
  on conflict (category_id, name) do nothing;

  -- Pets
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Pets', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Ração'),
    (p_user_id, v_cat_id, 'Veterinário'),
    (p_user_id, v_cat_id, 'Pet shop')
  on conflict (category_id, name) do nothing;

  -- Família/Filhos
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Família/Filhos', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Escola'),
    (p_user_id, v_cat_id, 'Mesada'),
    (p_user_id, v_cat_id, 'Roupas infantis')
  on conflict (category_id, name) do nothing;

  -- Outras despesas
  insert into public.categories (user_id, name, type)
    values (p_user_id, 'Outras despesas', 'despesa')
    on conflict (user_id, name) do update set name = excluded.name
    returning id into v_cat_id;
  insert into public.subcategories (user_id, category_id, name) values
    (p_user_id, v_cat_id, 'Presentes dados'),
    (p_user_id, v_cat_id, 'Doações'),
    (p_user_id, v_cat_id, 'Taxas bancárias'),
    (p_user_id, v_cat_id, 'Imprevistos')
  on conflict (category_id, name) do nothing;
end;
$$;

comment on function public.seed_default_categories(uuid) is 'Insere um conjunto de categorias/subcategorias comuns para o usuário. Idempotente — pode ser chamada mais de uma vez sem duplicar nada. O usuário pode editar/excluir qualquer uma delas depois.';

-- ----------------------------------------------------------------------------
-- handle_new_user: agora também semeia as categorias padrão do novo usuário.
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

  perform public.seed_default_categories(new.id);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Backfill: quem já tem conta e ainda não tem nenhuma categoria cadastrada
-- recebe o mesmo conjunto padrão agora.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    where not exists (select 1 from public.categories c where c.user_id = p.id)
  loop
    perform public.seed_default_categories(r.id);
  end loop;
end;
$$;
