"""Cadastra os panfletos de EXEMPLO a partir das imagens de imgspanfletos/ (cada imagem vira um panfleto com datas).

Uso:
    python tools/dados_panfletos.py             # sobe as imagens e cadastra os panfletos (precisa da migração 4)
    python tools/dados_panfletos.py --apagar    # remove só os exemplos (IDs fixos), sem mexer no que a equipe cadastrou
    python tools/dados_panfletos.py --demo-js caminho.js   # gera um script que carrega os mesmos dados no modo demonstração (sobe as imagens)
"""
import io, json, os, sys, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip().strip("\"'")
BASE, SEC = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
IMG = f"{BASE}/storage/v1/object/public/imagens"
pid = lambda n: f"00000000-0000-4000-8300-{n:012d}"
FAIXA = "id=gte.00000000-0000-4000-8300-000000000000&id=lt.00000000-0000-4000-8500-000000000000"

# (arquivo, nome do arquivo no Storage)
ARQ = {"rosa": ("outubro rosa.jpeg", "outubro-rosa"), "verde": ("quarta e quinta.jpeg", "quarta-quinta-verde"),
       "carne": ("quinta da carne.jpeg", "quinta-da-carne"), "pescado": ("sexta.jpeg", "super-sexta-pescado")}


def api(path, metodo="GET", corpo=None, prefer=None):
    h = {"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", method=metodo, headers=h, data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()


def subir(chave):
    arq, nome = ARQ[chave]
    im = Image.open(os.path.join(RAIZ, "imgspanfletos", arq)).convert("RGB")
    im.thumbnail((1600, 2000))
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=88, method=6)
    req = urllib.request.Request(f"{BASE}/storage/v1/object/imagens/panfletos/{nome}.webp", method="POST", data=buf.getvalue(),
                                 headers={"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "image/webp", "x-upsert": "true", "cache-control": "max-age=3600"})
    urllib.request.urlopen(req, timeout=120)
    return f"{IMG}/panfletos/{nome}.webp?v=2"


if "--apagar" in sys.argv:
    s1, _ = api("produtos?" + FAIXA, "DELETE", prefer="return=minimal")
    s2, _ = api("panfletos?" + FAIXA, "DELETE", prefer="return=minimal")
    sys.exit(f"Exemplos removidos (produtos HTTP {s1}, panfletos HTTP {s2}).")

U = {k: subir(k) for k in ARQ}
# datas de EXEMPLO relativas a hoje (horário de Uiraúna, UTC-3), para todos aparecerem no ar agora
HOJE = datetime.now(timezone(timedelta(hours=-3))).date()
d = lambda n: (HOJE + timedelta(days=n)).isoformat()
PANFLETOS = [
    dict(id=pid(1), titulo="Outubro Rosa", subtitulo="Economia para cuidar de quem você ama.", valido_de=d(-1), valido_ate=d(2), imagens=[U["rosa"]], ordem=0, ativo=True),
    dict(id=pid(2), titulo="Quarta e Quinta Verde", subtitulo=None, valido_de=d(-1), valido_ate=d(1), imagens=[U["verde"]], ordem=1, ativo=True),
    dict(id=pid(3), titulo="Quinta da Carne", subtitulo="É dia de churrasco! Confira nossas ofertas especiais de carnes!", valido_de=d(0), valido_ate=d(0), imagens=[U["carne"]], ordem=2, ativo=True),
    dict(id=pid(4), titulo="Super Sexta do Pescado", subtitulo=None, valido_de=d(0), valido_ate=d(3), imagens=[U["pescado"]], ordem=3, ativo=True),
    dict(id=pid(5), titulo="Teste: vários panfletos", subtitulo="Exemplo de panfleto com várias páginas para folhear.", valido_de=d(-1), valido_ate=d(2),
         imagens=[U["rosa"], U["carne"], U["verde"], U["pescado"]], ordem=9, ativo=True),
]

if "--demo-js" in sys.argv:
    destino = sys.argv[sys.argv.index("--demo-js") + 1]
    open(destino, "w", encoding="utf-8").write("localStorage.setItem('nonatao_demo_v1', " + json.dumps(json.dumps({"produtos": [], "sorteios": [], "temas": {}, "panfletos": PANFLETOS})) + ");")
    sys.exit(f"gerado {destino}")

# limpa exemplos antigos (produtos dos panfletos anteriores e panfletos de teste) e cadastra
s0, _ = api("produtos?" + FAIXA, "DELETE", prefer="return=minimal")
s1, _ = api("panfletos?" + FAIXA, "DELETE", prefer="return=minimal")
s2, t2 = api("panfletos", "POST", PANFLETOS, "return=minimal")
if s2 >= 300:
    sys.exit(f"Falha ao gravar (HTTP {s2}): {t2[:300]}\nRodou a migração supabase/migracao_panfletos_imagens.sql?")
print(f"produtos antigos removidos: HTTP {s0} | panfletos antigos: HTTP {s1} | novos: HTTP {s2} ({len(PANFLETOS)} panfletos)")
