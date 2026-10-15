-- =====================================================================
-- Nonatão Digital · migração 3: panfletos independentes
-- (vários panfletos por dia, campanhas com data e produtos ligados a cada panfleto)
-- Cole em: Supabase > SQL Editor > New query > Run (pode rodar de novo sem problema).
-- Antes de rodar, o site continua funcionando com os produtos avulsos de cada dia.
-- =====================================================================

create table if not exists public.panfletos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,                                 -- ex.: Quinta da Carne
  subtitulo text,
  estilo text not null default 'azul',                  -- azul, fogo, roxo, vermelho, sol (flutuante) | verde, pescado (cartões) | rosa (compacto)
  cor_a text,                                           -- cores opcionais (#RRGGBB)
  cor_b text,
  fundo_url text,                                       -- imagem de fundo opcional
  titulo_arte_url text,                                 -- logo 3D do panfleto (PNG/WebP sem fundo)
  rodape text,                                          -- {data} vira "somente dia 16/10/2026" ou "de 14 a 17/10/2026"
  dias smallint[] not null default '{}',                -- 0=domingo ... 6=sábado
  semana_toda boolean not null default false,           -- aparece em todos os dias
  valido_de date,                                       -- opcional: só aparece a partir desta data
  valido_ate date,                                      -- opcional: some sozinho depois desta data
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists panfletos_upd on public.panfletos;
create trigger panfletos_upd before update on public.panfletos
  for each row execute function public.toca_atualizado_em();

alter table public.produtos
  add column if not exists panfleto_id uuid references public.panfletos(id) on delete set null;
create index if not exists produtos_panfleto_idx on public.produtos (panfleto_id);

alter table public.panfletos enable row level security;
drop policy if exists "panfletos_leitura_publica" on public.panfletos;
create policy "panfletos_leitura_publica" on public.panfletos
  for select to anon, authenticated using (ativo = true or public.is_admin());
drop policy if exists "panfletos_admin_escreve" on public.panfletos;
create policy "panfletos_admin_escreve" on public.panfletos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
