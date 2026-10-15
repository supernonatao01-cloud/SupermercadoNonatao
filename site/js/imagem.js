/* Tratamento de fotos de produto no navegador (sem servidor): tirar o fundo para o produto "flutuar" no panfleto. */

const carregar = (blob) => new Promise((res, rej) => {
  const img = new Image(); const url = URL.createObjectURL(blob);
  img.onload = () => { URL.revokeObjectURL(url); res(img); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagem inválida')); };
  img.src = url;
});
const paraBlob = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem'))), 'image/webp', 0.9));

/**
 * Rápido e sem baixar nada: apaga o fundo liso (branco ou de uma cor só) ligado às bordas da foto.
 * Funciona muito bem em fotos de embalagem sobre fundo branco/estúdio. `tol` = tolerância de cor (0-255).
 */
export async function tirarFundoLiso(blob, tol = 38) {
  const img = await carregar(blob);
  const w = img.width, h = img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h), d = id.data;

  // cor do fundo = média dos cantos
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const cantos = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const bg = [0, 1, 2].map((k) => Math.round(cantos.reduce((s, p) => s + p[k], 0) / 4));
  const perto = (i) => Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) <= tol * 1.6;

  // inundação a partir das bordas
  const visto = new Uint8Array(w * h);
  const pilha = [];
  const empurrar = (x, y) => { const p = y * w + x; if (!visto[p] && perto(p * 4)) { visto[p] = 1; pilha.push(p); } };
  for (let x = 0; x < w; x++) { empurrar(x, 0); empurrar(x, h - 1); }
  for (let y = 0; y < h; y++) { empurrar(0, y); empurrar(w - 1, y); }
  while (pilha.length) {
    const p = pilha.pop(), x = p % w, y = (p - x) / w;
    if (x > 0) empurrar(x - 1, y); if (x < w - 1) empurrar(x + 1, y);
    if (y > 0) empurrar(x, y - 1); if (y < h - 1) empurrar(x, y + 1);
  }
  const removidos = visto.reduce((s, v) => s + v, 0);
  if (removidos < w * h * 0.04) throw new Error('Não encontrei um fundo liso para tirar. Use “Remover fundo (IA)” ou envie a foto já recortada.');

  for (let p = 0; p < visto.length; p++) if (visto[p]) d[p * 4 + 3] = 0;
  // suaviza a borda: pixel que encosta no fundo removido fica semitransparente
  const copia = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (visto[p]) continue;
    if (visto[p - 1] || visto[p + 1] || visto[p - w] || visto[p + w]) copia[p * 4 + 3] = 150;
  }
  ctx.putImageData(new ImageData(copia, w, h), 0, 0);
  return paraBlob(c);
}

const IMGLY = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';
/** Remoção por IA (roda no navegador; baixa o modelo na primeira vez, ~30 MB). Serve para fundos complexos. */
export async function tirarFundoIA(blob, aoProgredir = () => {}) {
  const m = await import(IMGLY);
  const trabalho = m.removeBackground(blob, {
    model: 'isnet_quint8', output: { format: 'image/webp', quality: 0.9 },
    progress: (chave, atual, total) => aoProgredir(chave, atual, total),
  });
  const limite = new Promise((_, rej) => setTimeout(() => rej(new Error('Demorou demais. Tente “Tirar fundo liso” ou envie a foto recortada.')), 150000));
  return Promise.race([trabalho, limite]);
}
