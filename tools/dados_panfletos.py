"""Cadastra os 4 panfletos de EXEMPLO (Quinta da Carne, Quarta e Quinta Verde, Super Sexta do Pescado, Outubro Rosa)
com os produtos recortados de imgspanfletos/. As imagens precisam estar no Storage (python tools/enviar_cortes.py).

Uso:
    python tools/dados_panfletos.py             # cadastra / atualiza no Supabase (precisa da migração 3)
    python tools/dados_panfletos.py --apagar    # remove só os exemplos (IDs fixos), sem mexer no que a equipe cadastrou
    python tools/dados_panfletos.py --demo-js caminho.js   # gera um script que carrega os mesmos dados no modo demonstração
"""
import json, os, sys, urllib.request, urllib.error

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip().strip("\"'")
BASE, SEC = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
IMG = f"{BASE}/storage/v1/object/public/imagens"
foto = lambda n: f"{IMG}/produtos/{n}.webp?v=1"
logo = lambda n: f"{IMG}/temas/logo-{n}.webp?v=1"
pid = lambda n: f"00000000-0000-4000-8300-{n:012d}"   # panfletos
prid = lambda n: f"00000000-0000-4000-8400-{n:012d}"  # produtos
PADRAO = "Ofertas válidas {data}. Sujeitas à disponibilidade de estoque. Imagens ilustrativas."

PANFLETOS = [
    dict(id=pid(1), titulo="Outubro Rosa", subtitulo="Economia para cuidar de quem você ama.", estilo="rosa", titulo_arte_url=logo("rosa"),
         dias=[], semana_toda=True, valido_de="2026-10-14", valido_ate="2026-10-17", ordem=0, rodape=PADRAO),
    dict(id=pid(2), titulo="Quarta e Quinta Verde", subtitulo=None, estilo="verde", titulo_arte_url=logo("verde"),
         dias=[3, 4], semana_toda=False, valido_de=None, valido_ate=None, ordem=1, rodape=PADRAO),
    dict(id=pid(3), titulo="Quinta da Carne", subtitulo="É dia de churrasco! Confira nossas ofertas especiais de carnes!", estilo="fogo", titulo_arte_url=logo("carne"),
         dias=[4], semana_toda=False, valido_de=None, valido_ate=None, ordem=2, rodape=PADRAO),
    dict(id=pid(4), titulo="Super Sexta do Pescado", subtitulo=None, estilo="pescado", titulo_arte_url=logo("pescado"),
         dias=[5], semana_toda=False, valido_de=None, valido_ate=None, ordem=1, rodape=PADRAO),
]

# (panfleto, arquivo, nome, categoria, preço, preço antigo, unidade, destaque)
P = [
    # Quinta da Carne
    (3, "carne-coxao", "Coxão Mole Bovino Frigotil Kg", "Açougue", 45.90, 48.90, "kg", True),
    (3, "carne-costela", "Costela Bovina Ponta de Agulha Frigotil Kg", "Açougue", 25.90, 39.90, "kg", False),
    (3, "carne-file", "Filé de Coxa e Sobrecoxa com Pele Bom Todo Bandeja 1Kg", "Açougue", 16.90, 20.90, "un", False),
    (3, "carne-pernil", "Pernil Suíno com Osso e Sem Pele Coopavel Kg", "Açougue", 13.90, 19.90, "kg", False),
    (3, "carne-linguica", "Linguiça Tipo Calabresa Suinco Kg", "Açougue", 22.90, 25.90, "kg", False),
    # Quarta e Quinta Verde
    (2, "verde-uva", "Uva Roxa S/Semente Kg", "Hortifruti", 7.90, 10.90, "kg", False),
    (2, "verde-maca", "Maçã Kg", "Hortifruti", 9.90, 10.90, "kg", False),
    (2, "verde-mamao", "Mamão Kg", "Hortifruti", 1.99, 2.99, "kg", False),
    (2, "verde-abacate", "Abacate Kg", "Hortifruti", 4.90, 5.90, "kg", False),
    (2, "verde-cenoura", "Cenoura Kg", "Hortifruti", 4.99, 6.90, "kg", False),
    (2, "verde-goiaba", "Goiaba Kg", "Hortifruti", 3.45, 3.99, "kg", False),
    # Super Sexta do Pescado
    (4, "pescado-tilapia", "Peixe Tilápia Kg", "Peixaria", 19.90, 22.90, "kg", True),
    (4, "pescado-panga", "Filé de Peixe Panga Bom Todo 500g", "Peixaria", 19.90, 24.99, "un", False),
    (4, "pescado-filetilapia", "Filé de Tilápia Aurora 400g", "Peixaria", 26.90, 29.90, "un", False),
    (4, "pescado-bacalhau", "Bacalhau Desfiado Ribeiralves 400g", "Peixaria", 54.90, 69.90, "un", False),
    (4, "pescado-camarao", "Camarão S/Cabeça 400g MasterBoi", "Peixaria", 32.90, 36.90, "un", False),
    (4, "pescado-bolinho", "Bolinho C/Bacalhau Aurora 360g", "Peixaria", 22.90, 29.90, "un", False),
    (4, "pescado-sardinha", "Sardinha Coqueiro 125g Óleo ou Molho Tomate", "Peixaria", 5.90, 6.90, "un", False),
    # Outubro Rosa
    (1, "rosa-arroz", "Arroz Parboilizado Tipo 1 Laguna 1Kg", "Mercearia", 4.69, 4.89, "un", False),
    (1, "rosa-macarrao", "Macarrão Parafuso Galo 500g", "Mercearia", 3.89, 4.39, "un", False),
    (1, "rosa-flocao", "Flocão Fortemilho 400g", "Mercearia", 1.19, 1.29, "un", False),
    (1, "rosa-acucar", "Açúcar Cristal Alegre 1Kg", "Mercearia", 2.99, 3.99, "un", False),
    (1, "rosa-cafe", "Café Tradicional ou Extraforte Aurora 250g", "Mercearia", 9.98, 10.90, "un", False),
    (1, "rosa-tirol", "Leite UHT Tirol 1L Integral ou Desnatado", "Frios e laticínios", 6.99, None, "un", False),
    (1, "rosa-ninho", "Leite em Pó Integral Tguinho 800g", "Frios e laticínios", 24.90, 26.90, "un", False),
    (1, "rosa-italac", "Leite Condensado Semidesnatado Italac 395g", "Frios e laticínios", 6.09, 6.89, "un", False),
    (1, "rosa-damare", "Creme Culinário Damare 200g", "Mercearia", 1.89, 2.29, "un", False),
    (1, "rosa-cracker", "Biscoito Cream Cracker Galo 360g", "Mercearia", 3.49, 4.49, "un", False),
    (1, "rosa-margarina", "Margarina com 60% de Gordura Elogiata 3Kg", "Frios e laticínios", 28.90, 31.90, "un", False),
    (1, "rosa-cupim", "Cupim Bovino Congelado Tipo B Friboi Kg", "Açougue", 38.90, 42.90, "kg", False),
    (1, "rosa-pernil", "Pernil Suíno com Osso e Sem Pele Coopavel Kg", "Açougue", 13.90, 19.90, "kg", False),
    (1, "rosa-superfrango", "Coxa e Sobrecoxa Envelopada Super Frango Kg", "Açougue", 11.90, 13.90, "kg", False),
    (1, "rosa-bomtodo", "Filé de Coxa e Sobrecoxa com Pele Bom Todo Bandeja 1Kg", "Açougue", 16.90, 20.90, "un", False),
    (1, "rosa-queijo", "Queijo Mussarela Ouro Bom Kg", "Frios e laticínios", 42.90, 48.90, "kg", False),
]
DIAS_PF = {p["id"]: p for p in PANFLETOS}
PRODUTOS = [dict(id=prid(i + 1), panfleto_id=pid(pf), nome=n, categoria=c, preco=pr, preco_antigo=an, unidade=u, foto_url=foto(arq),
                 destaque=d, dias=[], semana_toda=False, ativo=True, descricao=None)
            for i, (pf, arq, n, c, pr, an, u, d) in enumerate(P)]


def api(path, metodo="GET", corpo=None, prefer=None):
    h = {"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", method=metodo, headers=h, data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()


if "--demo-js" in sys.argv:
    destino = sys.argv[sys.argv.index("--demo-js") + 1]
    demo = {"produtos": PRODUTOS, "sorteios": [], "temas": {}, "panfletos": PANFLETOS}
    open(destino, "w", encoding="utf-8").write("localStorage.setItem('nonatao_demo_v1', " + json.dumps(json.dumps(demo)) + ");")
    sys.exit(f"gerado {destino}")

ANT = "id=gte.00000000-0000-4000-8000-000000000000&id=lt.00000000-0000-4000-8300-000000000000"  # exemplos antigos
if "--apagar" in sys.argv:
    s1, _ = api(f"produtos?id=gte.00000000-0000-4000-8000-000000000000&id=lt.00000000-0000-4000-9000-000000000000", "DELETE", prefer="return=minimal")
    s2, _ = api("panfletos?id=gte.00000000-0000-4000-8000-000000000000&id=lt.00000000-0000-4000-9000-000000000000", "DELETE", prefer="return=minimal")
    sys.exit(f"Exemplos removidos (produtos HTTP {s1}, panfletos HTTP {s2}).")

# 1) tira os 25 produtos de exemplo antigos (avulsos) para não misturar
s0, _ = api("produtos?" + ANT, "DELETE", prefer="return=minimal")
# 2) panfletos e produtos
s1, t1 = api("panfletos", "POST", PANFLETOS, "resolution=merge-duplicates,return=minimal")
if s1 >= 300:
    sys.exit(f"Falha ao gravar panfletos (HTTP {s1}): {t1[:300]}\nRodou a migração supabase/migracao_panfletos.sql?")
s2, t2 = api("produtos", "POST", PRODUTOS, "resolution=merge-duplicates,return=minimal")
print(f"antigos removidos: HTTP {s0} | panfletos: HTTP {s1} ({len(PANFLETOS)}) | produtos: HTTP {s2} ({len(PRODUTOS)})")
if s2 >= 300: print(t2[:300])
