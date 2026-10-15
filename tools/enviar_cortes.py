"""Envia os recortes de tools/_cortes/ para o Storage do Supabase (bucket 'imagens').
logo-*.webp vai para temas/, o resto para produtos/. Usa nomes fixos, então rodar de novo apenas atualiza.
Uso: python tools/enviar_cortes.py"""
import glob, os, urllib.request, urllib.error

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for l in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip().strip("\"'")
BASE, SEC = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]

ok = 0
for arq in sorted(glob.glob(os.path.join(RAIZ, "tools", "_cortes", "*.webp"))):
    nome = os.path.basename(arq)
    pasta = "temas" if nome.startswith("logo-") else "produtos"
    req = urllib.request.Request(
        f"{BASE}/storage/v1/object/imagens/{pasta}/{nome}", method="POST", data=open(arq, "rb").read(),
        headers={"apikey": SEC, "Authorization": f"Bearer {SEC}", "Content-Type": "image/webp", "x-upsert": "true", "cache-control": "max-age=3600"})
    try:
        urllib.request.urlopen(req, timeout=60); ok += 1
    except urllib.error.HTTPError as e:
        print("FALHA", nome, e.code, e.read().decode()[:120])
print(f"{ok} imagens enviadas")
