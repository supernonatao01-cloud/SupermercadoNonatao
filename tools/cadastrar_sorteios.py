"""Cadastra os sorteios reais informados pela equipe (15/10/2026). Pode rodar de novo: atualiza em vez de duplicar.

Uso:  python tools/cadastrar_sorteios.py
"""
import io, json, os, sys, urllib.request, urllib.error
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip().strip("\"'")
BASE, SEC = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
sid = lambda n: f"00000000-0000-4000-8600-{n:012d}"


def subir(arquivo, destino):
    im = Image.open(arquivo).convert("RGB"); im.thumbnail((1400, 1800))
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=88, method=6)
    req = urllib.request.Request(f"{BASE}/storage/v1/object/imagens/{destino}", method="POST", data=buf.getvalue(),
                                 headers={"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "image/webp", "x-upsert": "true", "cache-control": "max-age=3600"})
    urllib.request.urlopen(req, timeout=120)
    return f"{BASE}/storage/v1/object/public/imagens/{destino}?v=1"


arte_moto = subir(os.path.join(RAIZ, "design", "exemplo1.PNG"), "sorteios/moto-eletrica-tres-coracoes.webp")

SORTEIOS = [
    dict(id=sid(1), titulo="Ação Três Corações", premio="Uma moto elétrica", imagem_url=arte_moto, data_sorteio=None,
         descricao=None,
         como_participar="Na compra de 1 bebida proteica ou 1 barra de proteína, você ganha 1 cupom."),
    dict(id=sid(2), titulo="Ação Jucurutu", premio="Uma Air Fryer", imagem_url=None, data_sorteio=None,
         descricao=None,
         como_participar="Na compra de qualquer produto Jucurutu, você ganha 1 cupom."),
    dict(id=sid(3), titulo="Ação ASL Distribuidora · Dia Super Legal", premio="Um patinete", imagem_url=None,
         data_sorteio="2026-10-30T19:00:00-03:00",   # horário não informado: ajustar no painel
         descricao="Sorteio no Dia Super Legal, 30/10.",
         como_participar="Na compra de 2 unidades de Fini, você ganha 1 cupom."),
    dict(id=sid(4), titulo="Ação Três Corações", premio="Um patinete", imagem_url=None, data_sorteio=None,
         descricao=None,
         como_participar="Na compra de 8 unidades de suco Fria o, você ganha 1 cupom."),
    dict(id=sid(5), titulo="Ação Jucurutu · Supermercado Nonatão", premio="Um tanquinho", imagem_url=None, data_sorteio=None,
         descricao=None,
         como_participar="Na compra de qualquer produto Jucurutu, você ganha 1 cupom."),
]
for s in SORTEIOS:
    s.update(regulamento_url=None, ganhador_nome=None, ganhador_foto_url=None, video_url=None, ativo=True)

h = {"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"}
req = urllib.request.Request(f"{BASE}/rest/v1/sorteios", method="POST", headers=h, data=json.dumps(SORTEIOS).encode())
try:
    print("sorteios: HTTP", urllib.request.urlopen(req, timeout=60).status, f"({len(SORTEIOS)})")
except urllib.error.HTTPError as e:
    sys.exit(f"Falha (HTTP {e.code}): {e.read().decode()[:300]}")
