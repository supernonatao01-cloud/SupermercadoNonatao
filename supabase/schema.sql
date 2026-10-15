-- =====================================================================
-- Nonatão Digital · esquema do Supabase (panfleto online + sorteios)
-- Cole tudo isto em: Supabase > SQL Editor > New query > Run
-- Pode rodar de novo sem problema (é idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- quem pode usar o painel /admin --------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- promoções (panfleto) ------------------------------------------------
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  categoria text not null default 'Outros',
  preco numeric(10,2) not null check (preco >= 0),
  preco_antigo numeric(10,2) check (preco_antigo is null or preco_antigo >= 0),
  unidade text not null default 'un',
  foto_url text,
  dias smallint[] not null default '{}',      -- 0=domingo ... 6=sábado
  semana_toda boolean not null default false, -- vale todos os dias
  valido_ate date,                            -- opcional: some sozinho depois
  destaque boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists produtos_ativo_idx on public.produtos (ativo);

-- sorteios ------------------------------------------------------------
create table if not exists public.sorteios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  premio text not null,
  descricao text,
  imagem_url text,
  como_participar text,
  regulamento_url text,
  data_sorteio timestamptz,
  ganhador_nome text,
  ganhador_foto_url text,
  video_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists sorteios_ativo_idx on public.sorteios (ativo);

create or replace function public.toca_atualizado_em()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists produtos_upd on public.produtos;
create trigger produtos_upd before update on public.produtos
  for each row execute function public.toca_atualizado_em();
drop trigger if exists sorteios_upd on public.sorteios;
create trigger sorteios_upd before update on public.sorteios
  for each row execute function public.toca_atualizado_em();

-- segurança (RLS): todo mundo LÊ o que está ativo; só admin ESCREVE ----
alter table public.admins   enable row level security;
alter table public.produtos enable row level security;
alter table public.sorteios enable row level security;

drop policy if exists "admins_ve_a_si_mesmo" on public.admins;
create policy "admins_ve_a_si_mesmo" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "produtos_leitura_publica" on public.produtos;
create policy "produtos_leitura_publica" on public.produtos
  for select to anon, authenticated using (ativo = true or public.is_admin());
drop policy if exists "produtos_admin_escreve" on public.produtos;
create policy "produtos_admin_escreve" on public.produtos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sorteios_leitura_publica" on public.sorteios;
create policy "sorteios_leitura_publica" on public.sorteios
  for select to anon, authenticated using (ativo = true or public.is_admin());
drop policy if exists "sorteios_admin_escreve" on public.sorteios;
create policy "sorteios_admin_escreve" on public.sorteios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- fotos (Storage) -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists "imagens_leitura_publica" on storage.objects;
create policy "imagens_leitura_publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'imagens');
drop policy if exists "imagens_admin_envia" on storage.objects;
create policy "imagens_admin_envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'imagens' and public.is_admin());
drop policy if exists "imagens_admin_altera" on storage.objects;
create policy "imagens_admin_altera" on storage.objects
  for update to authenticated using (bucket_id = 'imagens' and public.is_admin());
drop policy if exists "imagens_admin_apaga" on storage.objects;
create policy "imagens_admin_apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'imagens' and public.is_admin());

-- =====================================================================
-- DEPOIS de criar o usuário em Authentication > Users, rode (trocando o e-mail):
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'SEU-EMAIL@exemplo.com'
--   on conflict do nothing;
--
-- Repita para cada pessoa da equipe que vai usar o painel.
-- =====================================================================
