/* Camada de dados do Nonatão: Supabase (REST) ou modo demonstração (localStorage).
   Sem dependências. Usada pelas páginas /panfleto, /sorteios, home e /admin. */

const cfg = window.NONATAO_CONFIG || {};
const SEM_CONFIG = !cfg.supabaseUrl || !cfg.supabaseKey;
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
/** Demonstração só no computador de desenvolvimento: o público nunca vê produtos de exemplo. */
export const DEMO = SEM_CONFIG && LOCAL;
/** Site publicado, mas o Supabase ainda não foi configurado: páginas ficam vazias e o painel avisa. */
export const SEM_BANCO = SEM_CONFIG && !LOCAL;
const semBanco = () => { throw new Error('O banco de dados ainda não foi configurado (veja o README).'); };

export const TZ = 'America/Fortaleza';
export const DIAS = [
  { n: 1, s: 'Seg', l: 'Segunda-feira' },
  { n: 2, s: 'Ter', l: 'Terça-feira' },
  { n: 3, s: 'Qua', l: 'Quarta-feira' },
  { n: 4, s: 'Qui', l: 'Quinta-feira' },
  { n: 5, s: 'Sex', l: 'Sexta-feira' },
  { n: 6, s: 'Sáb', l: 'Sábado' },
  { n: 0, s: 'Dom', l: 'Domingo' },
];
export const CATEGORIAS = [
  { nome: 'Hortifruti', emoji: '🥬' },
  { nome: 'Açougue', emoji: '🥩' },
  { nome: 'Padaria', emoji: '🥖' },
  { nome: 'Mercearia', emoji: '🛒' },
  { nome: 'Bebidas', emoji: '🥤' },
  { nome: 'Peixaria', emoji: '🐟' },
  { nome: 'Frios e laticínios', emoji: '🧀' },
  { nome: 'Limpeza', emoji: '🧼' },
  { nome: 'Higiene', emoji: '🧴' },
  { nome: 'Outros', emoji: '🏷️' },
];
export const UNIDADES = ['un', 'kg', '100g', 'pacote', 'litro', 'bandeja', 'caixa', 'dúzia'];
export const emojiDe = (cat) => (CATEGORIAS.find((c) => c.nome === cat) || CATEGORIAS[CATEGORIAS.length - 1]).emoji;

/* ---------- utilidades ---------- */
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function agora() {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { dia: DOW[p.weekday], iso: `${p.year}-${p.month}-${p.day}` };
}
export const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const desconto = (p) => (p.preco_antigo && Number(p.preco_antigo) > Number(p.preco)
  ? Math.round((1 - Number(p.preco) / Number(p.preco_antigo)) * 100) : 0);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
export const paraNumero = (txt) => {
  if (txt === '' || txt == null) return null;
  const n = Number(String(txt).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Data (DD/MM/AAAA) da próxima ocorrência do dia da semana, contando hoje. */
export function proximaData(diaSemana) {
  const { dia, iso } = agora();
  const [a, m, d] = iso.split('-').map(Number);
  const delta = (diaSemana - dia + 7) % 7;
  const dt = new Date(Date.UTC(a, m - 1, d + delta));
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

/** Temas padrão dos panfletos (dia 7 = semana toda). O painel pode sobrescrever qualquer campo. */
export const ESTILOS = [
  { id: 'azul', nome: 'Azul Nonatão', layout: 'flutuante' }, { id: 'fogo', nome: 'Fogo (carnes)', layout: 'flutuante' },
  { id: 'roxo', nome: 'Roxo', layout: 'flutuante' }, { id: 'vermelho', nome: 'Vermelho', layout: 'flutuante' }, { id: 'sol', nome: 'Sol (amarelo)', layout: 'flutuante' },
  { id: 'verde', nome: 'Verde (cartões)', layout: 'cartoes' }, { id: 'pescado', nome: 'Azul claro (cartões)', layout: 'cartoes' },
  { id: 'rosa', nome: 'Rosa (compacto)', layout: 'compacto' },
];
export const layoutDe = (estilo) => (ESTILOS.find((e) => e.id === estilo) || ESTILOS[0]).layout;
export const TEMAS_PADRAO = {
  1: { titulo: 'Segunda de Ofertas', subtitulo: 'Comece a semana economizando!', estilo: 'azul' },
  2: { titulo: 'Terça Verde', subtitulo: 'Frutas, legumes e verduras fresquinhas!', estilo: 'verde' },
  3: { titulo: 'Quarta Especial', subtitulo: 'Ofertas para a metade da semana!', estilo: 'roxo' },
  4: { titulo: 'Quinta da Carne', subtitulo: 'É dia de churrasco! Confira nossas ofertas especiais de carnes!', estilo: 'fogo' },
  5: { titulo: 'Sexta Ofertão', subtitulo: 'Preparou o fim de semana? Aproveite!', estilo: 'vermelho' },
  6: { titulo: 'Sábado de Compras', subtitulo: 'Tudo para a sua família em um só lugar!', estilo: 'sol' },
  0: { titulo: 'Domingo em Família', subtitulo: 'Almoço de domingo com preço bom!', estilo: 'sol' },
  7: { titulo: 'Ofertas da Semana', subtitulo: 'Valem todos os dias. Corra e aproveite!', estilo: 'azul' },
};
export const RODAPE_PADRAO = 'Ofertas válidas {data}. Sujeitas à disponibilidade de estoque. Imagens ilustrativas.';
export const RODAPE_SEMANA = 'Ofertas válidas durante a semana. Sujeitas à disponibilidade de estoque. Imagens ilustrativas.';

const fmtBR = (iso) => iso.split('-').reverse().join('/');
/** Texto de validade para o rodapé: "somente dia 16/10/2026" ou "de 14 a 17/10/2026". */
export function textoValidade(p, diaSemana) {
  if (p.valido_de && p.valido_ate && p.valido_de !== p.valido_ate) {
    const [a1, m1, d1] = p.valido_de.split('-'); const [a2, m2, d2] = p.valido_ate.split('-');
    return (m1 === m2 && a1 === a2) ? `de ${d1} a ${d2}/${m2}/${a2}` : `de ${d1}/${m1} a ${d2}/${m2}/${a2}`;
  }
  if (p.valido_ate) return `somente dia ${fmtBR(p.valido_ate)}`;
  return diaSemana == null ? 'durante a semana' : `somente dia ${proximaData(diaSemana)}`;
}

/* ---------- sessão (login do painel) ---------- */
const SK = 'nonatao_session';
const lerSessao = () => { try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; } };
const gravarSessao = (s) => { try { s ? localStorage.setItem(SK, JSON.stringify(s)) : localStorage.removeItem(SK); } catch { /* sem storage */ } };

async function authFetch(path, body) {
  const r = await fetch(`${cfg.supabaseUrl}/auth/v1/${path}`, {
    method: 'POST', headers: { apikey: cfg.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'Falha no login');
  return j;
}
const montarSessao = (j) => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), email: j.user && j.user.email });

export async function login(email, senha) {
  if (SEM_BANCO) semBanco();
  if (DEMO) { gravarSessao({ demo: true, email: 'demo@nonatao' }); return; }
  gravarSessao(montarSessao(await authFetch('token?grant_type=password', { email, password: senha })));
}
export function logout() { gravarSessao(null); }
export const sessaoAtual = () => lerSessao();

async function token() {
  let s = lerSessao();
  if (!s || s.demo) return cfg.supabaseKey;
  if (s.expires_at - 60 < Date.now() / 1000) {
    try { s = { ...montarSessao(await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token })), email: s.email }; gravarSessao(s); }
    catch { gravarSessao(null); throw new Error('Sessão expirada. Entre novamente.'); }
  }
  return s.access_token;
}

/* ---------- REST ---------- */
async function rest(path, { method = 'GET', body, auth = false, prefer = 'return=representation' } = {}) {
  const tk = auth ? await token() : cfg.supabaseKey;
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
    method,
    // chaves novas (sb_publishable_...) não são JWT: só mandamos Authorization quando há sessão de admin
    headers: { apikey: cfg.supabaseKey, ...(tk !== cfg.supabaseKey ? { Authorization: `Bearer ${tk}` } : {}), 'Content-Type': 'application/json', Prefer: prefer },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.text()) || `Erro ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/* ---------- modo demonstração ---------- */
const DK = 'nonatao_demo_v1';
function semear() {
  const hoje = new Date(); const mais = (d) => new Date(hoje.getTime() + d * 864e5).toISOString();
  return {
    produtos: [
      { id: 'd1', nome: 'Banana prata', descricao: 'Fresquinha, direto do produtor', categoria: 'Hortifruti', preco: 3.99, preco_antigo: 5.49, unidade: 'kg', foto_url: null, dias: [2], semana_toda: false, destaque: true, ativo: true },
      { id: 'd2', nome: 'Tomate', descricao: '', categoria: 'Hortifruti', preco: 4.99, preco_antigo: null, unidade: 'kg', foto_url: null, dias: [2, 3], semana_toda: false, destaque: false, ativo: true },
      { id: 'd3', nome: 'Frango resfriado', descricao: 'Inteiro, sem miúdos', categoria: 'Açougue', preco: 10.9, preco_antigo: 13.9, unidade: 'kg', foto_url: null, dias: [5, 6], semana_toda: false, destaque: true, ativo: true },
      { id: 'd4', nome: 'Pão francês', descricao: 'Quentinho a toda hora', categoria: 'Padaria', preco: 14.9, preco_antigo: null, unidade: 'kg', foto_url: null, dias: [], semana_toda: true, destaque: false, ativo: true },
      { id: 'd5', nome: 'Arroz tipo 1 – 5 kg', descricao: '', categoria: 'Mercearia', preco: 24.9, preco_antigo: 28.9, unidade: 'pacote', foto_url: null, dias: [], semana_toda: true, destaque: true, ativo: true },
      { id: 'd6', nome: 'Refrigerante 2 litros', descricao: 'Sabores variados', categoria: 'Bebidas', preco: 7.49, preco_antigo: 8.99, unidade: 'un', foto_url: null, dias: [5, 6, 0], semana_toda: false, destaque: false, ativo: true },
      { id: 'd7', nome: 'Queijo mussarela', descricao: 'Fatiado na hora', categoria: 'Frios e laticínios', preco: 39.9, preco_antigo: null, unidade: 'kg', foto_url: null, dias: [1, 4], semana_toda: false, destaque: false, ativo: true },
      { id: 'd8', nome: 'Detergente líquido', descricao: '500 ml', categoria: 'Limpeza', preco: 2.29, preco_antigo: 2.89, unidade: 'un', foto_url: null, dias: [1], semana_toda: false, destaque: false, ativo: true },
    ],
    temas: {},
    panfletos: [],
    sorteios: [
      { id: 's1', titulo: 'Sorteio de exemplo', premio: 'Uma cesta de compras', descricao: 'Cadastre os sorteios reais no painel.', imagem_url: null, como_participar: 'Cadastre o passo a passo aqui no painel. Ex.: a cada R$ 100 em compras você ganha um cupom.', regulamento_url: '', data_sorteio: mais(9), ganhador_nome: null, ganhador_foto_url: null, video_url: '', ativo: true },
      { id: 's2', titulo: 'Sorteio anterior (exemplo)', premio: 'Um vale-compras', descricao: '', imagem_url: null, como_participar: '', regulamento_url: '', data_sorteio: mais(-12), ganhador_nome: 'Nome do ganhador', ganhador_foto_url: null, video_url: '', ativo: true },
    ],
  };
}
function demo() {
  try { const d = JSON.parse(localStorage.getItem(DK)); if (d && d.produtos) return d; } catch { /* ignora */ }
  const d = semear(); demoSalvar(d); return d;
}
function demoSalvar(d) { try { localStorage.setItem(DK, JSON.stringify(d)); } catch { /* sem espaço */ } }
export function demoRestaurar() { try { localStorage.removeItem(DK); } catch { /* ok */ } }

/* ---------- produtos ---------- */
export async function listarProdutos({ admin = false } = {}) {
  if (SEM_BANCO) return [];
  let lista;
  if (DEMO) lista = demo().produtos;
  else lista = await rest(`produtos?select=*&order=destaque.desc,nome.asc${admin ? '' : '&ativo=eq.true'}`, { auth: admin });
  if (admin) return lista;
  const hoje = agora().iso;
  return lista.filter((p) => p.ativo && (!p.valido_ate || p.valido_ate >= hoje));
}
const camposProduto = ['nome', 'descricao', 'categoria', 'preco', 'preco_antigo', 'unidade', 'foto_url', 'dias', 'semana_toda', 'valido_ate', 'destaque', 'ativo', 'panfleto_id'];
const limpar = (o, campos) => Object.fromEntries(campos.filter((c) => c in o).map((c) => [c, o[c]]));

export async function salvarProduto(p) {
  const dados = limpar(p, camposProduto);
  if (DEMO) {
    const d = demo(); const i = d.produtos.findIndex((x) => x.id === p.id);
    if (i >= 0) d.produtos[i] = { ...d.produtos[i], ...dados }; else d.produtos.unshift({ id: uid(), ...dados });
    demoSalvar(d); return;
  }
  if (p.id) await rest(`produtos?id=eq.${p.id}`, { method: 'PATCH', body: dados, auth: true });
  else await rest('produtos', { method: 'POST', body: dados, auth: true });
}
export async function removerProduto(id) {
  if (DEMO) { const d = demo(); d.produtos = d.produtos.filter((x) => x.id !== id); demoSalvar(d); return; }
  await rest(`produtos?id=eq.${id}`, { method: 'DELETE', auth: true });
}

/* ---------- sorteios ---------- */
export async function listarSorteios({ admin = false } = {}) {
  if (SEM_BANCO) return [];
  if (DEMO) return demo().sorteios;
  return rest(`sorteios?select=*&order=data_sorteio.desc.nullslast${admin ? '' : '&ativo=eq.true'}`, { auth: admin });
}
const camposSorteio = ['titulo', 'premio', 'descricao', 'imagem_url', 'como_participar', 'regulamento_url', 'data_sorteio', 'ganhador_nome', 'ganhador_foto_url', 'video_url', 'ativo'];
export async function salvarSorteio(s) {
  const dados = limpar(s, camposSorteio);
  if (DEMO) {
    const d = demo(); const i = d.sorteios.findIndex((x) => x.id === s.id);
    if (i >= 0) d.sorteios[i] = { ...d.sorteios[i], ...dados }; else d.sorteios.unshift({ id: uid(), ...dados });
    demoSalvar(d); return;
  }
  if (s.id) await rest(`sorteios?id=eq.${s.id}`, { method: 'PATCH', body: dados, auth: true });
  else await rest('sorteios', { method: 'POST', body: dados, auth: true });
}
export async function removerSorteio(id) {
  if (DEMO) { const d = demo(); d.sorteios = d.sorteios.filter((x) => x.id !== id); demoSalvar(d); return; }
  await rest(`sorteios?id=eq.${id}`, { method: 'DELETE', auth: true });
}
/** ativo (antes da data) · apuracao (data passou, sem ganhador) · encerrado (com ganhador) */
export function statusSorteio(s) {
  if (s.ganhador_nome) return 'encerrado';
  if (s.data_sorteio && new Date(s.data_sorteio).getTime() <= Date.now()) return 'apuracao';
  return 'ativo';
}

/* ---------- panfletos (encartes) ---------- */
const camposPanfleto = ['titulo', 'subtitulo', 'estilo', 'cor_a', 'cor_b', 'fundo_url', 'titulo_arte_url', 'rodape', 'dias', 'semana_toda', 'valido_de', 'valido_ate', 'ordem', 'ativo'];
/** Lista os panfletos. Se a tabela ainda não existe (migração 3 não rodada), devolve [] e o site usa só os produtos avulsos. */
export async function listarPanfletos({ admin = false } = {}) {
  try {
    if (DEMO) return demo().panfletos || [];
    if (SEM_BANCO) return [];
    return await rest(`panfletos?select=*&order=ordem.asc,criado_em.asc${admin ? '' : '&ativo=eq.true'}`, { auth: admin });
  } catch { return []; }
}
/** Panfletos que valem hoje (ativo + janela de datas) — para o site público. */
export const panfletoVigente = (pf, iso = agora().iso) => pf.ativo !== false && (!pf.valido_de || pf.valido_de <= iso) && (!pf.valido_ate || pf.valido_ate >= iso);
export async function salvarPanfleto(p) {
  const dados = limpar(p, camposPanfleto);
  if (DEMO) {
    const d = demo(); d.panfletos = d.panfletos || []; const i = d.panfletos.findIndex((x) => x.id === p.id);
    if (i >= 0) d.panfletos[i] = { ...d.panfletos[i], ...dados }; else d.panfletos.push({ id: uid(), ...dados });
    demoSalvar(d); return;
  }
  if (p.id) await rest(`panfletos?id=eq.${p.id}`, { method: 'PATCH', body: dados, auth: true });
  else await rest('panfletos', { method: 'POST', body: dados, auth: true });
}
export async function removerPanfleto(id) {
  if (DEMO) { const d = demo(); d.panfletos = (d.panfletos || []).filter((x) => x.id !== id); d.produtos.forEach((p) => { if (p.panfleto_id === id) p.panfleto_id = null; }); demoSalvar(d); return; }
  await rest(`panfletos?id=eq.${id}`, { method: 'DELETE', auth: true });
}

/* ---------- temas dos panfletos (dias avulsos) ---------- */
/** Devolve { 0..7: tema } já com os padrões aplicados por baixo do que foi salvo. */
export async function listarTemas() {
  let salvos = [];
  try {
    if (DEMO) salvos = Object.entries(demo().temas || {}).map(([dia, t]) => ({ dia: Number(dia), ...t }));
    else if (!SEM_BANCO) salvos = await rest('panfleto_dias?select=*');
  } catch { /* tabela ainda não criada: usa os padrões */ }
  const out = {};
  for (const d of Object.keys(TEMAS_PADRAO)) out[d] = { dia: Number(d), ...TEMAS_PADRAO[d] };
  for (const t of salvos) out[t.dia] = { ...out[t.dia], ...Object.fromEntries(Object.entries(t).filter(([, v]) => v !== null && v !== '')) };
  return out;
}
const camposTema = ['dia', 'titulo', 'subtitulo', 'estilo', 'cor_a', 'cor_b', 'fundo_url', 'titulo_arte_url', 'rodape'];
export async function salvarTema(t) {
  const dados = limpar(t, camposTema);
  if (DEMO) { const d = demo(); d.temas = d.temas || {}; d.temas[t.dia] = dados; demoSalvar(d); return; }
  await rest('panfleto_dias?on_conflict=dia', { method: 'POST', body: dados, auth: true, prefer: 'resolution=merge-duplicates,return=minimal' });
}

/* ---------- administração ---------- */
export async function ehAdmin() {
  if (SEM_BANCO) return false;
  if (DEMO) return true;
  try { const r = await rest('admins?select=user_id', { auth: true }); return Array.isArray(r) && r.length > 0; } catch { return false; }
}

/** Reduz a foto (celular tem 5 a 12 MB) para ~1000px em WebP antes de enviar. */
export function reduzirImagem(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não deu para ler a imagem'))), 'image/webp', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Arquivo de imagem inválido')); };
    img.src = url;
  });
}
const blobParaDataUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

/** Envia um Blob já pronto (ex.: foto sem fundo) e devolve a URL pública. */
export async function enviarBlob(blob, pasta = 'produtos') {
  if (DEMO) return blobParaDataUrl(blob);
  const caminho = `${pasta}/${uid()}.webp`;
  const r = await fetch(`${cfg.supabaseUrl}/storage/v1/object/imagens/${caminho}`, {
    method: 'POST', headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${await token()}`, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: blob,
  });
  if (!r.ok) throw new Error('Não foi possível enviar a foto: ' + (await r.text()));
  return `${cfg.supabaseUrl}/storage/v1/object/public/imagens/${caminho}`;
}

/** Envia a foto e devolve a URL pública. */
export async function enviarImagem(file, pasta = 'produtos') {
  const blob = await reduzirImagem(file, pasta === 'produtos' ? 900 : 1200);
  if (DEMO) return blobParaDataUrl(await reduzirImagem(file, 520));
  const caminho = `${pasta}/${uid()}.webp`;
  const r = await fetch(`${cfg.supabaseUrl}/storage/v1/object/imagens/${caminho}`, {
    method: 'POST', headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${await token()}`, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: blob,
  });
  if (!r.ok) throw new Error('Não foi possível enviar a foto: ' + (await r.text()));
  return `${cfg.supabaseUrl}/storage/v1/object/public/imagens/${caminho}`;
}
