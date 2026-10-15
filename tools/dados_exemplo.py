"""Cadastra (ou remove) promoções e sorteios de EXEMPLO para testar o site.
Uso:
    python tools/dados_exemplo.py            # cadastra / atualiza os exemplos
    python tools/dados_exemplo.py --apagar   # remove só os exemplos (não mexe no que a equipe cadastrou)

Os exemplos usam IDs fixos (00000000-0000-4000-8000-...), por isso dá para apagá-los com segurança.
Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env.local (nunca imprime segredos)."""
import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip().strip("\"'")
BASE, SEC = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]

def api(path, metodo="GET", corpo=None, extra=None):
    h = {"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "application/json", **(extra or {})}
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", method=metodo, headers=h, data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def uid(prefixo, n):  # IDs fixos e reconhecíveis
    return f"00000000-0000-4000-8{prefixo}00-{n:012d}"

# (nome, categoria, preço, preço antigo, unidade, dias [0=dom..6=sáb], semana toda, destaque, descrição)
P = [
    # semana toda
    ("Pão francês", "Padaria", 14.90, None, "kg", [], True, False, "Quentinho a toda hora"),
    ("Arroz tipo 1 – 5 kg", "Mercearia", 24.90, 28.90, "pacote", [], True, True, "Grãos selecionados"),
    ("Feijão carioca 1 kg", "Mercearia", 7.99, 9.49, "pacote", [], True, False, ""),
    ("Café tradicional 500 g", "Mercearia", 15.90, 18.90, "un", [], True, True, "Torra e moagem forte"),
    # segunda
    ("Frango resfriado", "Açougue", 10.90, 13.90, "kg", [1], False, True, "Inteiro, sem miúdos"),
    ("Queijo mussarela", "Frios e laticínios", 39.90, None, "kg", [1], False, False, "Fatiado na hora"),
    ("Detergente líquido 500 ml", "Limpeza", 2.29, 2.89, "un", [1], False, False, ""),
    # terça (hortifruti)
    ("Banana prata", "Hortifruti", 3.99, 5.49, "kg", [2], False, True, "Fresquinha, direto do produtor"),
    ("Tomate", "Hortifruti", 4.99, None, "kg", [2, 3], False, False, ""),
    ("Cebola", "Hortifruti", 3.49, 4.29, "kg", [2], False, False, ""),
    ("Batata inglesa", "Hortifruti", 4.49, None, "kg", [2], False, False, ""),
    # quarta
    ("Leite integral 1 L", "Frios e laticínios", 4.89, 5.59, "un", [3], False, True, ""),
    ("Iogurte natural 170 g", "Frios e laticínios", 2.99, None, "un", [3], False, False, ""),
    ("Biscoito recheado 140 g", "Mercearia", 2.49, 2.99, "un", [3], False, False, "Vários sabores"),
    # quinta (carnes)
    ("Carne moída de 1ª", "Açougue", 32.90, 36.90, "kg", [4], False, True, ""),
    ("Linguiça toscana", "Açougue", 19.90, None, "kg", [4], False, False, "Perfeita para o churrasco"),
    ("Alcatra em bifes", "Açougue", 44.90, 49.90, "kg", [4], False, False, ""),
    # sexta (churrasco)
    ("Refrigerante 2 litros", "Bebidas", 7.49, 8.99, "un", [5, 6, 0], False, True, "Sabores variados"),
    ("Cerveja lata 350 ml", "Bebidas", 3.99, 4.49, "un", [5, 6], False, False, "Bem gelada"),
    ("Carvão 2 kg", "Outros", 14.90, 17.90, "pacote", [5, 6], False, False, ""),
    # sábado
    ("Picanha bovina", "Açougue", 69.90, 79.90, "kg", [6], False, True, "Ideal para o fim de semana"),
    ("Ovos brancos", "Mercearia", 8.90, 10.90, "dúzia", [6], False, False, ""),
    ("Sabão em pó 2 kg", "Limpeza", 16.90, 19.90, "un", [6], False, False, ""),
    # domingo
    ("Bolo caseiro", "Padaria", 12.90, None, "un", [0], False, False, "Sabores do dia"),
    ("Pão de queijo", "Padaria", 29.90, 34.90, "kg", [0], False, True, "Saiu agora do forno"),
]

agora = datetime.now(timezone.utc)
def quando(dias, hora_utc=22):
    return (agora + timedelta(days=dias)).replace(hour=hora_utc, minute=0, second=0, microsecond=0).isoformat()

S = [
    {"id": uid("1", 1), "titulo": "Sorteio de teste: cesta de compras", "premio": "Uma cesta de compras do Nonatão",
     "descricao": "Exemplo para testar o site. Será substituído pelos sorteios reais.",
     "como_participar": "A cada R$ 100,00 em compras você ganha um cupom.\nPreencha o cupom com nome e telefone e coloque na urna.\nO resultado sai ao vivo no Instagram.",
     "regulamento_url": "", "data_sorteio": quando(9), "ganhador_nome": None, "video_url": "", "ativo": True},
    {"id": uid("1", 2), "titulo": "Sorteio de teste: vale-compras", "premio": "Um vale-compras de R$ 500",
     "descricao": "Exemplo de sorteio aguardando o resultado.",
     "como_participar": "Compre qualquer produto participante e receba seu cupom.", "regulamento_url": "",
     "data_sorteio": quando(-1), "ganhador_nome": None, "video_url": "", "ativo": True},
    {"id": uid("1", 3), "titulo": "Sorteio de teste: kit churrasco", "premio": "Um kit churrasco completo",
     "descricao": "Exemplo de sorteio encerrado, com ganhador.", "como_participar": "", "regulamento_url": "",
     "data_sorteio": quando(-15), "ganhador_nome": "Nome do ganhador (teste)", "video_url": "https://www.instagram.com/nonatao_redesuperlegal/", "ativo": True},
]

# os IDs dos exemplos ficam todos nesta faixa
FAIXA = "{}?id=gte.00000000-0000-4000-8000-000000000000&id=lt.00000000-0000-4000-8200-000000000000"

if "--apagar" in sys.argv:
    s1, _ = api(FAIXA.format("produtos"), "DELETE", extra={"Prefer": "return=minimal"})
    s2, _ = api(FAIXA.format("sorteios"), "DELETE", extra={"Prefer": "return=minimal"})
    sys.exit(f"Exemplos removidos (produtos HTTP {s1}, sorteios HTTP {s2}).")

prod = [{"id": uid("0", i + 1), "nome": n, "categoria": c, "preco": p, "preco_antigo": a, "unidade": u, "dias": d,
         "semana_toda": sw, "destaque": dest, "descricao": desc or None, "ativo": True}
        for i, (n, c, p, a, u, d, sw, dest, desc) in enumerate(P)]
merge = {"Prefer": "resolution=merge-duplicates,return=minimal"}
s1, t1 = api("produtos", "POST", prod, merge)
s2, t2 = api("sorteios", "POST", S, merge)
print(f"produtos: HTTP {s1} ({len(prod)})  sorteios: HTTP {s2} ({len(S)})")
if s1 >= 300: print(t1[:300])
if s2 >= 300: print(t2[:300])
