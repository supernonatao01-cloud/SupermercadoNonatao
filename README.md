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

## Temas do panfleto (migração 2)

Para o painel poder editar o título e o visual de cada dia ("Quinta da Carne"), rode também
`supabase/migracao_panfleto.sql` no SQL Editor. Antes disso o site já usa os temas padrão.

## Como a equipe usa o painel (`/admin`)

- **Promoções**: toque em **+ Nova promoção** → foto, nome, preço, categoria, **dias** (Seg a Dom ou *semana toda*) → Salvar.
  O interruptor verde mostra ou esconde a oferta no site sem apagar.
- **Temas**: título, subtítulo, visual (cores, fundo e arte do título) e rodapé de cada dia da semana.
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
