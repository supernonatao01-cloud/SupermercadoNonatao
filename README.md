# Nonatão Digital

Site do Nonatão Supermercados (Uiraúna-PB): landing page, **ofertas online** (imagens com período de validade),
**sorteios** e **painel admin**.

- Site estático (HTML/CSS/JS, sem build) na pasta `site/`, publicado na Vercel.
- Dados (promoções, sorteios, fotos e login do painel) no **Supabase**.

## Rodar no computador

```bash
python serve.py        # http://localhost:5174  (aceita URLs limpas como /ofertas)
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

## Ofertas (migrações 3 e 4)

Uma **oferta** é uma promoção (ex.: *Quinta da Carne*) com **período em que fica no ar** e **imagens** (páginas) que o cliente folheia.
O cliente só vê o que está no ar no dia; depois da data final a oferta some sozinha.

1. Rode `supabase/migracao_panfletos.sql` e depois `supabase/migracao_panfletos_imagens.sql` no SQL Editor.
2. Para ver as ofertas de exemplo (imagens de `imgspanfletos/`): `python tools/dados_panfletos.py` (`--apagar` remove os exemplos).

## Como a equipe usa o painel (`/admin`)

- **Ofertas**: **+ Nova oferta** → nome da promoção, *a partir do dia* / *até o dia* (ou “Só hoje”), adicione as imagens
  (várias de uma vez; ← → muda a ordem; a primeira é a capa) → Salvar. O interruptor verde mostra ou esconde sem apagar.
- **Sorteios**: **+ Novo sorteio** → arte, prêmio, data/hora (contagem regressiva automática), como participar, regulamento.
  Depois do sorteio, preencha o **ganhador** (nome, foto, vídeo): ele passa sozinho para *Já sorteados*.
- **Usuários do painel**: `python tools/criar_admin.py` (cria o login e autoriza). Criar só em Authentication não basta.

## Estrutura

```
site/            site publicado (index, ofertas, sorteios, admin)
  js/api.js      camada de dados (Supabase via REST; modo demo no localhost)
supabase/        schema.sql e migrações (tabelas, regras de segurança, bucket de fotos)
tools/           scripts de apoio (admin, exemplos, verificação)
serve.py         servidor local de desenvolvimento
vercel.json      aponta a Vercel para site/
```
