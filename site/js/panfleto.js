import {
  DEMO, DIAS, CATEGORIAS, RODAPE_PADRAO, agora, brl, desconto, esc, emojiDe, layoutDe, textoValidade,
  listarProdutos, listarPanfletos, panfletoVigente,
} from './api.js';
import { montarShell } from './shell.js';

montarShell('panfleto');
if (DEMO) document.getElementById('demo').hidden = false;

const $ = (s) => document.querySelector(s);
const hoje = agora().dia;
const FAV = 'nonatao_favoritos';
const lerFav = () => { try { return new Set(JSON.parse(localStorage.getItem(FAV)) || []); } catch { return new Set(); } };
const gravarFav = (s) => { try { localStorage.setItem(FAV, JSON.stringify([...s])); } catch { /* sem storage */ } };

const pedido = new URLSearchParams(location.search).get('p');
const estado = { produtos: [], panfletos: [], sel: pedido, cat: 'Todas', q: '', fav: lerFav(), vista: 'panfleto' };

const unidadeRotulo = (u) => (!u || u === 'un' ? 'und' : u);
const NOME_DIA = Object.fromEntries(DIAS.map((d) => [d.n, d.l.replace('-feira', '')]));

/** Panfletos que valem hoje (ativos e dentro da janela de datas). */
const vigentes = () => estado.panfletos.filter((pf) => panfletoVigente(pf));
const doDiaHoje = (pf) => pf.semana_toda || (pf.dias || []).includes(hoje);
/** Produtos avulsos (sem panfleto) que valem hoje: viram uma aba "Ofertas de hoje". */
const avulsosHoje = () => estado.produtos.filter((p) => !p.panfleto_id && (p.semana_toda || (p.dias || []).includes(hoje)));
const TEMA_AVULSO = { id: 'avulso', titulo: 'Ofertas de hoje', subtitulo: null, estilo: 'azul', dias: [hoje], semana_toda: false };
/** Abas: os panfletos de hoje primeiro (depois por ordem), depois os demais. */
function itensAbas() {
  const lista = [...vigentes()].sort((a, b) => Number(doDiaHoje(b)) - Number(doDiaHoje(a)) || (a.ordem - b.ordem));
  if (avulsosHoje().length) lista.push(TEMA_AVULSO);
  return lista;
}
const encarteAtual = () => {
  const lista = itensAbas();
  const tema = lista.find((t) => t.id === estado.sel) || lista[0];
  if (!tema) return null;
  return { id: tema.id, tema, produtos: tema.id === 'avulso' ? avulsosHoje() : estado.produtos.filter((p) => p.panfleto_id === tema.id) };
};
/** Todos os produtos dos panfletos em vigor (visão em lista). */
const doDia = () => estado.produtos.filter((p) => (p.panfleto_id ? vigentes().some((pf) => pf.id === p.panfleto_id) : true));
/** Etiqueta no canto do encarte: "Quinta-feira", "Quarta e quinta" ou "14 a 17/10". */
function etiqueta(t) {
  if (t.valido_de && t.valido_ate && t.valido_de !== t.valido_ate) {
    const [, m1, d1] = t.valido_de.split('-'), [, m2, d2] = t.valido_ate.split('-');
    return m1 === m2 ? `${d1} a ${d2}/${m2}` : `${d1}/${m1} a ${d2}/${m2}`;
  }
  const dias = [...(t.dias || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (t.semana_toda || !dias.length) return 'Todos os dias';
  if (dias.length === 1) return DIAS.find((d) => d.n === dias[0]).l;
  return dias.map((d) => NOME_DIA[d]).join(' e ');
}

/* ---------- abas (uma por panfleto, com a logo) ---------- */
const tabs = $('#tabs');
function montarAbas() {
  const lista = itensAbas();
  if (!lista.find((t) => t.id === estado.sel)) estado.sel = lista[0] ? lista[0].id : null;
  tabs.innerHTML = lista.map((t) => `<button class="pftab" role="tab" data-pf="${esc(t.id)}" aria-selected="${t.id === estado.sel}">
      ${t.titulo_arte_url ? `<img src="${esc(t.titulo_arte_url)}" alt="" width="44" height="44" loading="lazy">` : '<span class="pftab__ico" aria-hidden="true">🏷️</span>'}
      <span class="pftab__t">${esc(t.titulo)}</span>${doDiaHoje(t) ? '<span class="hoje">hoje</span>' : ''}</button>`).join('');
  const ativa = tabs.querySelector('[aria-selected="true"]');
  if (ativa) ativa.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function escolher(id) {
  estado.sel = id; montarAbas(); render();
  try { history.replaceState(null, '', `?p=${encodeURIComponent(id)}`); } catch { /* ok */ }
}
tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-pf]'); if (b) escolher(b.dataset.pf); });

/* ---------- alternar panfleto / lista ---------- */
document.querySelector('.viewswitch').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]'); if (!b) return;
  estado.vista = b.dataset.vista;
  document.querySelectorAll('.viewswitch button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('#vista-panfleto').hidden = estado.vista !== 'panfleto';
  $('#vista-lista').hidden = estado.vista !== 'lista';
  document.querySelector('.daytabs').hidden = estado.vista === 'lista';
  render();
});

/* ============ ENCARTE ============ */
const HEX = /^#[0-9a-f]{6}$/i;
function precoBadge(p) {
  const [r, c] = Number(p.preco).toFixed(2).split('.');
  const off = p.preco_antigo && Number(p.preco_antigo) > Number(p.preco);
  return `<div class="badge-preco" aria-hidden="true">
    ${off ? `<small class="de">DE: ${brl(p.preco_antigo)}</small>` : ''}
    <small class="por">POR R$</small>
    <strong>${Number(r).toLocaleString('pt-BR')}<sup>,${c}</sup></strong>
    <span class="un">${esc(unidadeRotulo(p.unidade))}</span></div>`;
}
function pcard(p, i, grande) {
  const off = desconto(p);
  const img = p.foto_url ? `<img src="${esc(p.foto_url)}" alt="" crossorigin="anonymous" ${i > 3 ? 'loading="lazy"' : ''}>` : `<div class="ph" aria-hidden="true">${emojiDe(p.categoria)}</div>`;
  const rotulo = `${p.nome}, ${brl(p.preco)}${p.unidade && p.unidade !== 'un' ? ' o ' + p.unidade : ''}`;
  return `<button type="button" class="pcard${grande ? ' pcard--big' : ''}" data-id="${esc(p.id)}" style="--i:${Math.min(i, 12)}" aria-label="${esc(rotulo)}. Ver detalhes">
    <div class="pcard__img">${img}${off ? `<span class="pcard__off">-${off}%</span>` : ''}</div>
    ${precoBadge(p)}
    <div class="pcard__nome"><span>${esc(p.nome)}${p.descricao ? `<small>${esc(p.descricao)}</small>` : ''}</span></div>
  </button>`;
}
function flyerHTML(enc) {
  const { tema, produtos } = enc;
  const estilo = tema.estilo || 'azul';
  const layout = layoutDe(estilo);
  const estilos = [];
  if (HEX.test(tema.cor_a || '')) estilos.push(`--a:${tema.cor_a}`);
  if (HEX.test(tema.cor_b || '')) estilos.push(`--b:${tema.cor_b}`);
  if (tema.fundo_url) estilos.push(`--bg:url('${encodeURI(tema.fundo_url)}')`);
  const palavras = String(tema.titulo || '').trim().split(/\s+/);
  const principal = palavras.pop() || '';
  const titulo = tema.titulo_arte_url
    ? `<img class="flyer__arte" src="${esc(tema.titulo_arte_url)}" alt="${esc(tema.titulo)}" crossorigin="anonymous">`
    : `<h2>${palavras.length ? `<span class="t-pre">${esc(palavras.join(' '))}</span>` : ''}<span class="t-main" style="--n:${Math.max(5, principal.length)}">${esc(principal)}</span></h2>`;
  const rodape = (tema.rodape || RODAPE_PADRAO).replace('{data}', textoValidade(tema));

  const ordem = [...produtos].sort((a, b) => Number(b.destaque) - Number(a.destaque));
  const cartoes = ordem.map((p, i) => pcard(p, i, i === 0 && p.destaque && layout !== 'compacto' && ordem.length >= 3)).join('');
  const grade = layout === 'flutuante' ? `<div class="pgrid">${cartoes}</div>` : `<div class="painel"><div class="pgrid">${cartoes}</div></div>`;
  const corpo = produtos.length ? grade
    : `<div class="flyer__vazio"><div class="big">🛒</div><h3>As ofertas deste dia estão chegando</h3><p>Volte mais tarde ou entre no clube de ofertas para receber as novidades no WhatsApp.</p>
         <a class="btn btn--whats no-export" target="_blank" rel="noopener" href="https://chat.whatsapp.com/Lcsv8LEJewk5SvZZ7n6JXw?s=cl&p=i&mlu=0&ilr=4">Entrar no clube de ofertas</a></div>`;

  return `<article class="flyer st-${esc(estilo)} lay-${layout}${tema.fundo_url ? ' has-bg' : ''}" style="${estilos.join(';')}" aria-label="Panfleto: ${esc(tema.titulo)}">
    <div class="flyer__top"><img class="flyer__logo" src="assets/logo-branco.png" alt="Nonatão Supermercados" width="56" height="52"><span class="flyer__tag">${esc(etiqueta(tema))}</span></div>
    <header class="flyer__head">${titulo}${tema.subtitulo ? `<p class="flyer__sub">${esc(tema.subtitulo)}</p>` : ''}</header>
    ${corpo}
    <footer class="flyer__foot">
      <span class="cal" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zM5 9h14v11H5zm2 2v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z"/></svg></span>
      <p>${esc(rodape)}</p>
      <img src="${estilo === 'pescado' ? 'assets/logo.png' : 'assets/logo-branco.png'}" alt="" width="50" height="46">
    </footer>
  </article>`;
}
function encarteComAcoes(enc) {
  return `<section class="flyer-wrap" data-fid="${esc(enc.id)}">${flyerHTML(enc)}
    <div class="flyer-actions">
      <button class="btn btn--yellow" type="button" data-act="baixar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-share"/></svg>Baixar panfleto (imagem)</button>
      <button class="btn btn--whats" type="button" data-act="zap"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-whats"/></svg>Enviar no WhatsApp</button>
    </div></section>`;
}

/* ---------- detalhe do produto ---------- */
const dlg = $('#detalhe');
function abrirDetalhe(id) {
  const p = estado.produtos.find((x) => x.id === id); if (!p) return;
  const off = desconto(p), fav = estado.fav.has(p.id);
  const [r, c] = Number(p.preco).toFixed(2).split('.');
  dlg.innerHTML = `
    <div class="det__media">${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}">` : `<div class="ph" aria-hidden="true">${emojiDe(p.categoria)}</div>`}
      <button class="det__x" type="button" data-x aria-label="Fechar">×</button></div>
    <div class="det__b">
      <p class="cat">${esc(p.categoria)}</p><h2>${esc(p.nome)}</h2>${p.descricao ? `<p class="desc">${esc(p.descricao)}</p>` : ''}
      <div class="det__preco">${p.preco_antigo && off ? `<del>${brl(p.preco_antigo)}</del>` : ''}<strong><small>R$</small>${Number(r).toLocaleString('pt-BR')}<sup>,${c}</sup></strong>
        <span class="un" style="color:var(--muted);font-weight:700">${p.unidade && p.unidade !== 'un' ? '/' + esc(p.unidade) : 'a unidade'}</span>${off ? `<span class="off">-${off}%</span>` : ''}</div>
      <div class="det__acoes">
        <button class="fav" type="button" data-fav aria-pressed="${fav}" aria-label="Favoritar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-heart"/></svg></button>
        <button class="btn btn--whats" type="button" data-share><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-share"/></svg>Compartilhar</button>
      </div></div>`;
  dlg.dataset.id = id; dlg.showModal();
}
dlg.addEventListener('click', (e) => {
  if (e.target === dlg || e.target.closest('[data-x]')) { dlg.close(); return; }
  const p = estado.produtos.find((x) => x.id === dlg.dataset.id); if (!p) return;
  if (e.target.closest('[data-fav]')) alternarFav(p.id, e.target.closest('[data-fav]'));
  if (e.target.closest('[data-share]')) compartilharProduto(p);
});
function alternarFav(id, btn) {
  estado.fav.has(id) ? estado.fav.delete(id) : estado.fav.add(id);
  gravarFav(estado.fav);
  if (btn) { btn.setAttribute('aria-pressed', String(estado.fav.has(id))); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
}
function compartilharProduto(p) {
  const un = p.unidade && p.unidade !== 'un' ? ` o ${p.unidade}` : '';
  const texto = `🛒 ${p.nome} por ${brl(p.preco)}${un} no Nonatão Supermercados!\nVeja mais ofertas: ${location.origin}/panfleto`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ text: texto }).catch(() => {});
  else open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
}

/* ---------- baixar como imagem / enviar ---------- */
let libPromise;
const carregarLib = () => libPromise || (libPromise = new Promise((res, rej) => {
  if (window.htmlToImage) return res();
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
  s.onload = res; s.onerror = () => { libPromise = null; rej(new Error('lib')); };
  document.head.append(s);
}));
function toast(msg, erro = false) {
  const t = document.createElement('div'); t.className = 'toast' + (erro ? ' toast--err' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.append(t); setTimeout(() => t.remove(), 3500);
}
async function gerarImagem(node) {
  await carregarLib();
  const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: '#041c63', filter: (n) => !(n.classList && n.classList.contains('no-export')) };
  try { await window.htmlToImage.toPng(node, opts); } catch { /* aquecimento (Safari) */ }
  const url = await window.htmlToImage.toPng(node, opts);
  return (await fetch(url)).blob();
}
async function baixar(wrap, btn) {
  const texto = btn.innerHTML; btn.disabled = true; btn.textContent = 'Gerando imagem…';
  try {
    const blob = await gerarImagem(wrap.querySelector('.flyer'));
    const titulo = wrap.querySelector('.flyer').getAttribute('aria-label').replace('Panfleto: ', '');
    const nome = `panfleto-nonatao-${titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.png`;
    const file = new File([blob], nome, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [file], text: 'Ofertas do Nonatão Supermercados' }).catch(() => {});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Panfleto salvo!');
    }
  } catch { toast('Não foi possível gerar a imagem agora. Tente de novo.', true); }
  btn.disabled = false; btn.innerHTML = texto;
}
$('#flyer-host').addEventListener('click', (e) => {
  const c = e.target.closest('.pcard'); if (c) { abrirDetalhe(c.dataset.id); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const wrap = b.closest('.flyer-wrap');
  if (b.dataset.act === 'baixar') baixar(wrap, b);
  if (b.dataset.act === 'zap') {
    const titulo = wrap.querySelector('.flyer').getAttribute('aria-label').replace('Panfleto: ', '');
    const texto = `🛒 ${titulo} no Nonatão Supermercados!\nConfira o panfleto: ${location.origin}/panfleto?p=${encodeURIComponent(wrap.dataset.fid)}`;
    open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }
});

/* ============ LISTA ============ */
$('#busca').addEventListener('input', (e) => { estado.q = e.target.value.trim().toLowerCase(); render(); });
const catsEl = $('#cats');
function montarCats() {
  const usadas = new Set(estado.produtos.map((p) => p.categoria));
  const lista = ['Todas', ...CATEGORIAS.map((c) => c.nome).filter((n) => usadas.has(n)), 'Favoritos'];
  catsEl.innerHTML = lista.map((n) => {
    const rotulo = n === 'Todas' ? 'Todas' : n === 'Favoritos' ? '♥ Favoritos' : `${emojiDe(n)} ${n}`;
    return `<button class="chip-btn" data-cat="${esc(n)}" aria-pressed="${estado.cat === n}">${esc(rotulo)}</button>`;
  }).join('');
}
catsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { estado.cat = b.dataset.cat; montarCats(); render(); } });

function preco(v) {
  const [r, c] = Number(v).toFixed(2).split('.');
  return `<strong><small>R$</small>${Number(r).toLocaleString('pt-BR')}<sup>,${c}</sup></strong>`;
}
function card(p, i) {
  const off = desconto(p);
  const foto = p.foto_url ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}" loading="lazy" width="440" height="380" style="object-fit:contain">` : `<div class="ph" aria-hidden="true">${emojiDe(p.categoria)}</div>`;
  const un = p.unidade && p.unidade !== 'un' ? `/${esc(p.unidade)}` : '';
  const fav = estado.fav.has(p.id);
  return `<article class="oferta" style="--i:${Math.min(i, 14)}" data-id="${esc(p.id)}">
    <div class="oferta__media">${foto}${off ? `<span class="sel sel--off">-${off}%</span>` : ''}${p.destaque ? '<span class="sel sel--hot">Destaque</span>' : ''}
      <button class="fav" data-fav aria-pressed="${fav}" aria-label="${fav ? 'Remover dos favoritos' : 'Favoritar'} ${esc(p.nome)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-heart"/></svg></button></div>
    <div class="oferta__body"><p class="oferta__cat">${esc(p.categoria)}</p><h3>${esc(p.nome)}</h3>${p.descricao ? `<p class="desc">${esc(p.descricao)}</p>` : ''}
      <div class="preco">${p.preco_antigo && off ? `<del>${brl(p.preco_antigo)}</del>` : ''}${preco(p.preco)}<span class="un">${un || 'un'}</span></div>
      <button class="btn btn--whats" data-share><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-share"/></svg>Compartilhar</button></div>
  </article>`;
}
function renderLista() {
  const grid = $('#grid');
  const lista = doDia().filter((p) => {
    if (estado.cat === 'Favoritos' ? !estado.fav.has(p.id) : (estado.cat !== 'Todas' && p.categoria !== estado.cat)) return false;
    return !estado.q || (`${p.nome} ${p.descricao || ''} ${p.categoria}`).toLowerCase().includes(estado.q);
  });
  $('#titulo-dia').textContent = 'Todos os produtos em oferta';
  $('#contador').textContent = lista.length === 1 ? '1 oferta' : `${lista.length} ofertas`;
  if (!lista.length) {
    const filtrando = estado.q || estado.cat !== 'Todas';
    grid.innerHTML = `<div class="vazio"><div class="big">🛒</div><h3>${filtrando ? 'Nada encontrado' : 'Ainda não temos ofertas para este dia'}</h3>
      <p>${filtrando ? 'Tente outra busca ou categoria.' : 'Volte mais tarde ou entre no clube de ofertas para receber as novidades no WhatsApp.'}</p>
      <a class="btn btn--whats" target="_blank" rel="noopener" href="https://chat.whatsapp.com/Lcsv8LEJewk5SvZZ7n6JXw?s=cl&p=i&mlu=0&ilr=4">Entrar no clube de ofertas</a></div>`;
    return;
  }
  grid.innerHTML = lista.map(card).join('');
}
$('#grid').addEventListener('click', (e) => {
  const art = e.target.closest('.oferta'); if (!art) return;
  const p = estado.produtos.find((x) => x.id === art.dataset.id); if (!p) return;
  if (e.target.closest('[data-fav]')) { alternarFav(p.id, e.target.closest('[data-fav]')); if (estado.cat === 'Favoritos') setTimeout(renderLista, 450); }
  if (e.target.closest('[data-share]')) compartilharProduto(p);
});

/* ---------- render geral ---------- */
function vazio() {
  return `<div class="flyer-wrap"><article class="flyer st-azul lay-flutuante"><div class="flyer__top"><img class="flyer__logo" src="assets/logo-branco.png" alt="Nonatão Supermercados" width="56" height="52"></div>
    <div class="flyer__vazio"><div class="big">🛒</div><h3>Os panfletos estão chegando</h3><p>Volte mais tarde ou entre no clube de ofertas para receber as novidades no WhatsApp.</p>
    <a class="btn btn--whats" target="_blank" rel="noopener" href="https://chat.whatsapp.com/Lcsv8LEJewk5SvZZ7n6JXw?s=cl&p=i&mlu=0&ilr=4">Entrar no clube de ofertas</a></div></article></div>`;
}
function render() {
  if (estado.vista === 'lista') { renderLista(); return; }
  const enc = encarteAtual();
  $('#flyer-host').innerHTML = enc ? encarteComAcoes(enc) : vazio();
}

/* deslizar para trocar de panfleto (celular) */
let x0 = null, y0 = 0;
const alvoSwipe = $('#flyer-host');
alvoSwipe.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
alvoSwipe.addEventListener('touchend', (e) => {
  if (x0 == null) return;
  const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
  if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
  const ordem = itensAbas().map((t) => t.id);
  const i = ordem.indexOf(estado.sel) + (dx < 0 ? 1 : -1);
  if (i >= 0 && i < ordem.length) escolher(ordem[i]);
}, { passive: true });

/* ---------- carregar ---------- */
$('#flyer-host').innerHTML = '<div class="skel" style="width:min(100%,820px);height:520px"></div>';
Promise.all([listarProdutos(), listarPanfletos()]).then(([lista, pfs]) => {
  estado.produtos = lista; estado.panfletos = pfs; montarAbas(); montarCats(); render();
}).catch(() => {
  $('#flyer-host').innerHTML = '<div class="vazio" style="width:100%"><div class="big">📡</div><h3>Não foi possível carregar o panfleto</h3><p>Verifique sua internet e tente de novo.</p><button class="btn btn--blue" onclick="location.reload()">Tentar novamente</button></div>';
});
