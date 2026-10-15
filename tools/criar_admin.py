"""Cria (ou atualiza) uma pessoa da equipe que pode usar o painel /admin do site.

Uso:   python tools/criar_admin.py
Pede o e-mail e a senha NO SEU TERMINAL (a senha não aparece na tela e não é guardada em arquivo).
Usa a service_role do .env.local para: 1) criar o usuário no Supabase Auth (já confirmado)
e 2) autorizá-lo na tabela admins. Rode de novo para cada pessoa; se o e-mail já existir, a senha é trocada.
"""
import getpass, json, os, sys, urllib.request, urllib.error

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip().strip("\"'")
BASE, SEC = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]


def chamar(caminho, metodo="GET", corpo=None, prefer=None):
    h = {"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(f"{BASE}{caminho}", method=metodo, headers=h, data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t


email = input("E-mail da pessoa: ").strip().lower()
senha = getpass.getpass("Senha (mínimo 8 caracteres): ")
if getpass.getpass("Repita a senha: ") != senha:
    sys.exit("As senhas não conferem.")
if len(senha) < 8 or "@" not in email:
    sys.exit("E-mail inválido ou senha com menos de 8 caracteres.")

status, r = chamar("/auth/v1/admin/users", "POST", {"email": email, "password": senha, "email_confirm": True})
if status in (200, 201):
    uid = r["id"]; print("Usuário criado.")
else:
    # já existe? acha o id e troca a senha
    s2, lista = chamar("/auth/v1/admin/users?per_page=1000")
    usuarios = (lista or {}).get("users", []) if isinstance(lista, dict) else []
    achado = next((u for u in usuarios if (u.get("email") or "").lower() == email), None)
    if not achado:
        sys.exit(f"Não foi possível criar o usuário (HTTP {status}): {r}")
    uid = achado["id"]
    s3, r3 = chamar(f"/auth/v1/admin/users/{uid}", "PUT", {"password": senha, "email_confirm": True})
    if s3 >= 300: sys.exit(f"Usuário existe, mas não consegui trocar a senha (HTTP {s3}): {r3}")
    print("Usuário já existia: senha atualizada.")

s4, r4 = chamar("/rest/v1/admins", "POST", {"user_id": uid}, "resolution=merge-duplicates,return=minimal")
if s4 >= 300: sys.exit(f"Usuário criado, mas falhou ao autorizar como administrador (HTTP {s4}): {r4}")
print(f"Pronto! {email} já pode entrar em /admin.")
