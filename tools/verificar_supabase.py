"""Confere se o Supabase está pronto para o site (não imprime segredos).
Uso:  python tools/verificar_supabase.py
Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env.local e a chave publicável de site/js/config.js."""
import json, os, re, sys, urllib.request, urllib.error

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def env():
    d = {}
    for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1); d[k.strip()] = v.strip().strip('"\'')
    return d

def chamar(url, chave, metodo="GET", corpo=None):
    h = {"apikey": chave, "Content-Type": "application/json"}
    if not chave.startswith("sb_publishable_"):
        h["Authorization"] = f"Bearer {chave}"
    req = urllib.request.Request(url, method=metodo, headers=h, data=json.dumps(corpo).encode() if corpo else None)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

e = env()
base = e.get("SUPABASE_URL", "").rstrip("/")
sec = e.get("SUPABASE_SERVICE_ROLE_KEY", "")
cfg = open(os.path.join(RAIZ, "site", "js", "config.js"), encoding="utf-8").read()
pub = (re.search(r"supabaseKey:\s*'([^']+)'", cfg) or [None, ""])[1]
if not base or not sec or not pub:
    sys.exit("Faltando SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local ou a chave publicável no config.js")

ok = True
def passo(nome, cond, dica=""):
    global ok; ok &= bool(cond); print(("OK    " if cond else "FALHA ") + nome + ("" if cond else f"  -> {dica}"))

s, _ = chamar(f"{base}/rest/v1/", sec)
passo("URL e service_role aceitas", s == 200, f"HTTP {s}: confira a Project URL e a chave do .env.local")
for tabela in ("produtos", "sorteios"):
    s, t = chamar(f"{base}/rest/v1/{tabela}?select=id&limit=1", pub)
    passo(f"tabela {tabela} existe e o público consegue ler", s == 200, "rode supabase/schema.sql no SQL Editor" if s in (404, 400) else f"HTTP {s}")
s, t = chamar(f"{base}/rest/v1/produtos", pub, "POST", {"nome": "teste", "preco": 1})
passo("público NÃO consegue escrever (segurança RLS)", s in (401, 403), f"HTTP {s}: a RLS não está ativa!")
s, t = chamar(f"{base}/storage/v1/bucket/imagens", sec)
passo("bucket de fotos 'imagens' existe", s == 200, "rode o schema.sql (ele cria o bucket)")
s, t = chamar(f"{base}/rest/v1/admins?select=user_id", sec)
passo("tabela admins acessível pela service_role", s == 200, f"HTTP {s}")
# ida e volta: grava com a service_role, lê como público e apaga
s, t = chamar(f"{base}/rest/v1/produtos", sec, "POST", {"nome": "__teste__", "preco": 1, "dias": [1], "ativo": True})
passo("service_role consegue gravar", s in (200, 201), f"HTTP {s}")
s, t = chamar(f"{base}/rest/v1/produtos?nome=eq.__teste__&select=id", pub)
passo("o público enxerga o que está ativo", s == 200 and '"id"' in t, f"HTTP {s}")
chamar(f"{base}/rest/v1/produtos?nome=eq.__teste__", sec, "DELETE")
print("\nTudo pronto." if ok else "\nAinda há pendências acima.")
