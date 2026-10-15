-- =====================================================================
-- Nonatão Digital · migração 2: tema de cada dia do panfleto
-- Cole em: Supabase > SQL Editor > New query > Run (pode rodar de novo sem problema).
-- Antes disso o site já funciona com os temas padrão; depois, o painel passa a editá-los.
-- =====================================================================

create table if not exists public.panfleto_dias (
  dia smallint primary key check (dia between 0 and 7),  -- 0=domingo ... 6=sábado, 7="semana toda"
  titulo text not null,
  subtitulo text,
  estilo text not null default 'azul',                   -- fogo, verde, roxo, azul, vermelho, sol
  cor_a text,                                            -- cores opcionais (#RRGGBB) que sobrescrevem o estilo
  cor_b text,
  fundo_url text,                                        -- imagem de fundo opcional
  titulo_arte_url text,                                  -- arte do título opcional (PNG sem fundo)
  rodape text,                                           -- use {data} para a data de validade
  atualizado_em timestamptz not null default now()
);

drop trigger if exists panfleto_dias_upd on public.panfleto_dias;
create trigger panfleto_dias_upd before update on public.panfleto_dias
  for each row execute function public.toca_atualizado_em();

alter table public.panfleto_dias enable row level security;
drop policy if exists "panfleto_dias_leitura_publica" on public.panfleto_dias;
create policy "panfleto_dias_leitura_publica" on public.panfleto_dias
  for select to anon, authenticated using (true);
drop policy if exists "panfleto_dias_admin_escreve" on public.panfleto_dias;
create policy "panfleto_dias_admin_escreve" on public.panfleto_dias
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.panfleto_dias (dia, titulo, subtitulo, estilo) values
  (1, 'Segunda de Ofertas',   'Comece a semana economizando!',            'azul'),
  (2, 'Terça Verde',          'Frutas, legumes e verduras fresquinhas!',  'verde'),
  (3, 'Quarta Especial',      'Ofertas para a metade da semana!',         'roxo'),
  (4, 'Quinta da Carne',      'É dia de churrasco! Confira nossas ofertas especiais de carnes!', 'fogo'),
  (5, 'Sexta Ofertão',        'Preparou o fim de semana? Aproveite!',     'vermelho'),
  (6, 'Sábado de Compras',    'Tudo para a sua família em um só lugar!',  'sol'),
  (0, 'Domingo em Família',   'Almoço de domingo com preço bom!',         'sol'),
  (7, 'Ofertas da Semana',    'Valem todos os dias. Corra e aproveite!',  'azul')
on conflict (dia) do nothing;
