# Nonatão Digital

Site do Nonatão Supermercados (Uiraúna-PB): landing page, **panfleto online** (ofertas por dia da semana),
**sorteios** e **painel admin**.

- Site estático (HTML/CSS/JS, sem build) na pasta `site/`, publicado na Vercel.
- Dados (promoções, sorteios, fotos e login do painel) no **Supabase**.

## Rodar no computador

```bash
python serve.py        # http://localhost:5174  (aceita URLs limpas como /panfleto)
```

Enquanto `site/js/config.js` estiver vazio, o site roda em **modo demonstração** (apenas no `localhost`):
os dados de exemplo ficam só no navegador e o painel `/admin` abre sem senha.
Na internet (sem Supabase configurado) as páginas aparecem vazias — nunca com produtos de exemplo.

## Ligar o Supabase (uma vez só)

1. Crie uma conta e um projeto em <https://supabase.com> (plano gratuito; região **South America (São Paulo)**).
2. **SQL Editor → New query**: cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. **Authentication → Users → Add user**: crie o usuário (e-mail + senha) de cada pessoa da equipe
   (marque *Auto Confirm User*). Em **Authentication → Sign In / Providers**, desligue *Allow new users to sign up*.
4. No **SQL Editor**, autorize cada pessoa como administradora (troque o e-mail):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'SEU-EMAIL@exemplo.com'
   on conflict do nothing;
   ```
5. **Project Settings → API**: copie a **Project URL** e a chave **anon public** para `site/js/config.js`:
   ```js
   window.NONATAO_CONFIG = { supabaseUrl: 'https://xxxx.supabase.co', supabaseKey: 'eyJ...' };
   ```
   A chave *anon* é pública por natureza; a proteção vem das regras (RLS) do `schema.sql`.
   **Nunca** use a chave `service_role` aqui.
6. Faça commit e push: a Vercel publica sozinha. Acesse `/admin` e entre com o e-mail e a senha.

## Panfletos independentes (migração 3)

Cada **panfleto** é um encarte com logo 3D, visual, dias e validade próprios (ex.: *Quinta da Carne*, *Quarta e Quinta Verde*,
*Super Sexta do Pescado*, *Outubro Rosa*). Os produtos entram no panfleto escolhido e vários panfletos podem aparecer no mesmo dia.

1. Rode `supabase/migracao_panfletos.sql` no SQL Editor (cria a tabela `panfletos` e a coluna `produtos.panfleto_id`).
2. Para ver os 4 panfletos de exemplo com os produtos recortados de `imgspanfletos/`:
   ```bash
   python tools/recortar_panfletos.py   # recorta produtos e logos (precisa de: pip install rembg pillow)
   python tools/enviar_cortes.py        # envia os recortes para o Storage
   python tools/dados_panfletos.py      # cadastra os panfletos e produtos (--apagar remove os exemplos)
   ```
   Antes da migração o site continua funcionando com os produtos avulsos de cada dia.

Visuais disponíveis: azul, fogo, roxo, vermelho, sol (produtos flutuando com selo redondo), verde e azul claro (cartões) e rosa (compacto).

## Como a equipe usa o painel (`/admin`)

- **Promoções**: toque em **+ Nova promoção** → foto, nome, preço, categoria, **dias** (Seg a Dom ou *semana toda*) → Salvar.
  O interruptor verde mostra ou esconde a oferta no site sem apagar.
- **Panfletos**: título, logo 3D, visual, dias, validade (data inicial e final) e rodapé de cada encarte; ao cadastrar um produto, escolha em qual panfleto ele entra.
- **Sorteios**: **+ Novo sorteio** → arte, prêmio, data/hora (contagem regressiva automática), como participar, regulamento.
  Depois do sorteio, preencha o **ganhador** (nome, foto, vídeo): ele passa sozinho para *Já sorteados*.

## Estrutura

```
site/            site publicado (index, panfleto, sorteios, admin)
  js/api.js      camada de dados (Supabase via REST; modo demo no localhost)
supabase/        schema.sql (tabelas, regras de segurança e bucket de fotos)
serve.py         servidor local de desenvolvimento
vercel.json      aponta a Vercel para site/
```
