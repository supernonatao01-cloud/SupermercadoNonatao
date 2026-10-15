-- =====================================================================
-- Nonatão Digital · migração 4: panfleto = promoção com imagens
-- O painel passa a cadastrar a promoção (nome + datas) e subir as imagens do panfleto.
-- Cole em: Supabase > SQL Editor > New query > Run (pode rodar de novo sem problema).
-- =====================================================================

alter table public.panfletos
  add column if not exists imagens text[] not null default '{}';   -- URLs das páginas, na ordem em que aparecem
