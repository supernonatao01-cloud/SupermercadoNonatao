import os, sys, json
from PIL import Image
from rembg import remove, new_session

SRC = r"C:\SupermercadoNonatao\imgspanfletos"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools", "_cortes")
os.makedirs(OUT, exist_ok=True)
FILES = {"carne": "quinta da carne.jpeg", "verde": "quarta e quinta.jpeg", "pescado": "sexta.jpeg", "rosa": "outubro rosa.jpeg"}

# (arquivo, chave, caixa x0,y0,x1,y1 na imagem original)
CAIXAS = {
    # logos 3D
    "logo-carne": ("carne", (805, 35, 1180, 362)),
    "logo-verde": ("verde", (335, 0, 940, 462)),
    "logo-pescado": ("pescado", (55, 30, 475, 372)),
    "logo-rosa": ("rosa", (0, 0, 548, 348)),
    # carne
    "carne-coxao": ("carne", (80, 8, 660, 300)),
    "carne-costela": ("carne", (150, 545, 610, 765)),
    "carne-file": ("carne", (806, 522, 1098, 720)),
    "carne-pernil": ("carne", (186, 975, 585, 1235)),
    "carne-linguica": ("carne", (836, 970, 1198, 1250)),
    # verde
    "verde-uva": ("verde", (170, 640, 425, 772)),
    "verde-maca": ("verde", (535, 618, 770, 775)),
    "verde-mamao": ("verde", (858, 585, 1128, 782)),
    "verde-abacate": ("verde", (180, 982, 418, 1162)),
    "verde-cenoura": ("verde", (538, 1028, 755, 1152)),
    "verde-goiaba": ("verde", (892, 998, 1102, 1162)),
    # pescado
    "pescado-tilapia": ("pescado", (605, 150, 908, 282)),
    "pescado-panga": ("pescado", (158, 503, 352, 660)),
    "pescado-filetilapia": ("pescado", (436, 503, 650, 660)),
    "pescado-bacalhau": ("pescado", (716, 508, 942, 664)),
    "pescado-camarao": ("pescado", (136, 868, 370, 1030)),
    "pescado-bolinho": ("pescado", (413, 872, 662, 1030)),
    "pescado-sardinha": ("pescado", (688, 878, 952, 1030)),
    # rosa
    "rosa-arroz": ("rosa", (45, 340, 182, 428)),
    "rosa-macarrao": ("rosa", (312, 345, 452, 428)),
    "rosa-flocao": ("rosa", (560, 338, 694, 418)),
    "rosa-acucar": ("rosa", (796, 330, 912, 430)),
    "rosa-cafe": ("rosa", (45, 513, 182, 614)),
    "rosa-tirol": ("rosa", (312, 520, 432, 600)),
    "rosa-ninho": ("rosa", (560, 523, 672, 614)),
    "rosa-italac": ("rosa", (806, 528, 900, 614)),
    "rosa-damare": ("rosa", (68, 712, 168, 794)),
    "rosa-cracker": ("rosa", (260, 718, 420, 800)),
    "rosa-margarina": ("rosa", (534, 700, 700, 800)),
    "rosa-cupim": ("rosa", (806, 735, 990, 792)),
    "rosa-pernil": ("rosa", (45, 1012, 305, 1232)),
    "rosa-superfrango": ("rosa", (262, 1005, 516, 1216)),
    "rosa-bomtodo": ("rosa", (520, 995, 746, 1224)),
    "rosa-queijo": ("rosa", (750, 995, 1022, 1228)),
}

MODOS = {"rosa-arroz": "branco", "rosa-macarrao": "branco", "rosa-flocao": "branco", "rosa-acucar": "branco", "rosa-cafe": "branco", "rosa-tirol": "branco", "rosa-ninho": "branco", "rosa-italac": "branco", "rosa-damare": "branco", "rosa-cracker": "branco", "rosa-margarina": "branco", "rosa-cupim": "branco", "rosa-superfrango": "branco", "rosa-bomtodo": "branco", "rosa-queijo": "branco", "carne-file": "preto", "pescado-panga": "branco", "pescado-filetilapia": "branco", "pescado-camarao": "branco"}

def fundo_liso(im, cor, tol):
    import numpy as np
    from collections import deque
    a = np.array(im.convert("RGB")).astype(int)
    h, w, _ = a.shape
    if cor is None:
        cantos = [a[0, 0], a[0, w-1], a[h-1, 0], a[h-1, w-1]]
        cor = tuple(int(sum(c[k] for c in cantos) / 4) for k in range(3))
    dist = np.abs(a - np.array(cor)).sum(axis=2)
    perto = dist <= tol * 1.6
    visto = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            if perto[y, x] and not visto[y, x]: visto[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w-1):
            if perto[y, x] and not visto[y, x]: visto[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not visto[ny, nx] and perto[ny, nx]:
                visto[ny, nx] = True; q.append((ny, nx))
    manter = ~visto
    # tira ilhas pequenas (letras do nome, restos de etiqueta)
    lab = np.zeros((h, w), int); n = 0; tam = {}
    for y0 in range(h):
        for x0 in range(w):
            if manter[y0, x0] and not lab[y0, x0]:
                n += 1; lab[y0, x0] = n; q2 = deque([(y0, x0)]); c = 0
                while q2:
                    y, x = q2.popleft(); c += 1
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny, nx = y+dy, x+dx
                        if 0 <= ny < h and 0 <= nx < w and manter[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q2.append((ny, nx))
                tam[n] = c
    if tam:
        maior = max(tam.values())
        ok = {k for k, v in tam.items() if v >= maior * 0.12}
        manter = np.isin(lab, list(ok))
    rgba = np.dstack([a.astype("uint8"), np.where(manter, 255, 0).astype("uint8")])
    return Image.fromarray(rgba, "RGBA")

FADE = {"carne-coxao", "rosa-arroz", "rosa-macarrao", "rosa-flocao", "rosa-acucar", "rosa-cafe", "rosa-tirol", "rosa-ninho", "rosa-italac", "rosa-damare", "rosa-cracker", "rosa-margarina", "rosa-cupim"}
only = sys.argv[1:]
sess = new_session("isnet-general-use")
imgs = {k: Image.open(os.path.join(SRC, v)).convert("RGB") for k, v in FILES.items()}
ok = []
for nome, (fonte, caixa) in CAIXAS.items():
    if only and not any(nome.startswith(o) for o in only):
        continue
    im = imgs[fonte].crop(caixa)
    modo = MODOS.get(nome, "rembg")
    if modo == "preto":      # fundo escuro: tudo que é quase preto e liga às bordas some
        cut = fundo_liso(im, (0, 0, 0), 70)
    elif modo == "branco":   # fundo claro liso: vira transparente
        cut = fundo_liso(im, None, 40)
    else:
        cut = remove(im, session=sess)
    bb = cut.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    if bb:
        cut = cut.crop(bb)
    if nome in FADE:
        import numpy as np
        arr = np.array(cut); H = arr.shape[0]; k = max(4, int(H * 0.14))
        rampa = np.linspace(1, 0, k)
        arr[H-k:, :, 3] = (arr[H-k:, :, 3] * rampa[:, None]).astype("uint8")
        cut = Image.fromarray(arr, "RGBA")
    maxd = 900 if nome.startswith("logo") else 640
    cut.thumbnail((maxd, maxd), Image.LANCZOS)
    cut.save(os.path.join(OUT, nome + ".webp"), quality=88, method=6)
    ok.append(nome)
print(len(ok), "recortes")

# folha de contato para conferir
nomes = [n for n in CAIXAS if os.path.exists(os.path.join(OUT, n + ".webp")) and (not only or any(n.startswith(o) for o in only))]
cols = 6
cell = 220
rows = (len(nomes) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell, rows * cell), (60, 60, 70))
for i, n in enumerate(nomes):
    im = Image.open(os.path.join(OUT, n + ".webp")).convert("RGBA")
    im.thumbnail((cell - 12, cell - 12))
    # xadrez para ver a transparência
    x, y = (i % cols) * cell, (i // cols) * cell
    chk = Image.new("RGB", (cell, cell), (230, 230, 230))
    for yy in range(0, cell, 20):
        for xx in range(0, cell, 20):
            if (xx // 20 + yy // 20) % 2:
                chk.paste((200, 200, 205), (xx, yy, xx + 20, yy + 20))
    chk.paste(im, ((cell - im.width) // 2, (cell - im.height) // 2), im)
    sheet.paste(chk, (x, y))
sheet.save(os.path.join(OUT, "_folha.jpg"), quality=88)
print("folha ok")
