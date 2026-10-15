"""Servidor local para desenvolvimento (aceita URLs limpas como /panfleto, igual à Vercel).
Uso:  python serve.py [porta]     ->  http://localhost:5174"""
import os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and os.path.exists(p + ".html"):
            return p + ".html"
        return p

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
    print(f"Nonatão em http://localhost:{porta}")
    ThreadingHTTPServer(("", porta), Handler).serve_forever()
