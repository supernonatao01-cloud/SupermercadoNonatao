import { DEMO, agora, esc, listarPanfletos, panfletoVigente } from './api.js';
import { montarShell } from './shell.js';

montarShell('ofertas');
if (DEMO) document.getElementById('demo').hidden = false;

const $ = (s) => document.querySelector(s);
const hojeISO = agora().iso;
const estado = { pfs: [], sel: new URLSearchParams(location.search).get('p'), pagina: 0 };
const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/');   // 2026-10-17 -> 17/10

/** Só entram as ofertas no ar hoje (datas) e que tenham pelo menos uma imagem. */
const noAr = () => estado.pfs.filter((p) => panfletoVigente(p, hojeISO) && (p.imagens || []).length)
  .sort((a, b) => (a.ordem - b.ordem) || String(b.valido_de || '').localeCompare(String(a.valido_de || '')));
const atual = () => { const l = noAr(); return l.find((p) => p.id === estado.sel) || l[0] || null; };

/** "Termina hoje", "Válido até 17/10", "Válido de 14/10 a 17/10"… */
function validade(p) {
  if (p.valido_ate === hojeISO) return { txt: 'Termina hoje', hoje: true };
  if (p.valido_de && p.valido_ate) return { txt: p.valido_de === p.valido_ate ? `Válido só em ${dm(p.valido_de)}` : `Válido de ${dm(p.valido_de)} a ${dm(p.valido_ate)}`, hoje: false };
  if (p.valido_ate) return { txt: `Válido até ${dm(p.valido_ate)}`, hoje: false };
  return { txt: 'No ar agora', hoje: false };
}

/* ---------- abas ---------- */
const tabs = $('#tabs');
function montarAbas() {
  const lista = noAr();
  $('#barra-abas').hidden = lista.length < 2;   // com uma só oferta não precisa de abas
  tabs.innerHTML = lista.map((p) => {
    const v = validade(p);
    return `<button class="pftab" role="tab" data-pf="${esc(p.id)}" aria-selected="${p.id === (atual() || {}).id}">
      <img src="${esc(p.imagens[0])}" alt="" width="54" height="54" loading="lazy">
      <span><span class="pftab__t">${esc(p.titulo)}</span><small>${esc(v.txt)}</small></span>${v.hoje ? '<span class="hoje">último dia</span>' : ''}</button>`;
  }).join('');
  const ativa = tabs.querySelector('[aria-selected="true"]');
  if (ativa) ativa.scrollIntoView({ inline: 'center', block: 'nearest' });
}
tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-pf]'); if (b) escolher(b.dataset.pf); });
function escolher(id) {
  estado.sel = id; estado.pagina = 0; montarAbas(); render();
  try { history.replaceState(null, '', `?p=${encodeURIComponent(id)}`); } catch { /* ok */ }
}

/* ---------- visualizador ---------- */
function render() {
  const host = $('#viewer-host');
  const p = atual();
  if (!p) {
    host.innerHTML = `<div class="vazio" style="margin:30px 0 70px"><div class="big">🛒</div><h3>Nenhuma oferta no ar agora</h3>
      <p>Assim que uma nova oferta começar, ela aparece aqui. Entre no clube de ofertas para ser avisado no WhatsApp.</p>
      <a class="btn btn--whats" target="_blank" rel="noopener" href="https://chat.whatsapp.com/Lcsv8LEJewk5SvZZ7n6JXw?s=cl&p=i&mlu=0&ilr=4">Entrar no clube de ofertas</a></div>`;
    return;
  }
  const v = validade(p), n = p.imagens.length;
  host.innerHTML = `<section class="viewer" data-id="${esc(p.id)}">
    <header class="viewer__head"><h2>${esc(p.titulo)}</h2>${p.subtitulo ? `<p>${esc(p.subtitulo)}</p>` : ''}
      <span class="badge-val${v.hoje ? ' badge-val--hoje' : ''}">${esc(v.txt)}</span></header>
    <div class="carrossel">
      <button class="navbtn navbtn--prev" type="button" data-nav="-1" aria-label="Página anterior">‹</button>
      <div class="slides" id="slides" tabindex="0" aria-label="Páginas da oferta ${esc(p.titulo)}">
        ${p.imagens.map((u, i) => `<button class="slide" type="button" data-i="${i}" aria-label="Ampliar página ${i + 1} de ${n}">
          <img src="${esc(u)}" alt="${esc(p.titulo)}, página ${i + 1} de ${n}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">
          <span class="slide__zoom" aria-hidden="true">🔍 Toque para ampliar</span></button>`).join('')}
      </div>
      <button class="navbtn navbtn--next" type="button" data-nav="1" aria-label="Próxima página">›</button>
    </div>
    ${n > 1 ? `<div><div class="pontos" id="pontos">${p.imagens.map((_, i) => `<button type="button" data-ir="${i}" aria-label="Ir para a página ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}></button>`).join('')}</div>
      <p class="contador" id="contador">Página 1 de ${n}</p></div>` : ''}
    <div class="viewer__acoes">
      <button class="btn btn--yellow" type="button" data-acao="baixar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-share"/></svg>Baixar esta página</button>
      <button class="btn btn--whats" type="button" data-acao="zap"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-whats"/></svg>Enviar no WhatsApp</button>
    </div></section>`;
  const slides = $('#slides');
  slides.addEventListener('scroll', () => {
    const i = Math.round(slides.scrollLeft / slides.clientWidth);
    if (i !== estado.pagina) { estado.pagina = i; marcarPagina(); }
  }, { passive: true });
  marcarPagina();
}
function marcarPagina() {
  const p = atual(); if (!p) return;
  document.querySelectorAll('#pontos button').forEach((b, i) => { if (i === estado.pagina) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const c = $('#contador'); if (c) c.textContent = `Página ${estado.pagina + 1} de ${p.imagens.length}`;
  const prev = document.querySelector('.navbtn--prev'), next = document.querySelector('.navbtn--next');
  if (prev) prev.disabled = estado.pagina <= 0;
  if (next) next.disabled = estado.pagina >= p.imagens.length - 1;
}
function irPara(i, suave = true) {
  const p = atual(); const s = $('#slides'); if (!p || !s) return;
  i = Math.max(0, Math.min(p.imagens.length - 1, i));
  s.scrollTo({ left: i * s.clientWidth, behavior: suave ? 'smooth' : 'auto' });
}

/* ---------- zoom em tela cheia ---------- */
const zoom = $('#zoom');
function abrirZoom(i) {
  const p = atual(); if (!p) return;
  estado.pagina = i; mostrarZoom(); zoom.showModal();
  // tela cheia de verdade (esconde a barra do navegador onde há suporte)
  try { if (zoom.requestFullscreen) zoom.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch { /* sem suporte */ }
}
function mostrarZoom() {
  const p = atual();
  $('#zoom-img').src = p.imagens[estado.pagina]; $('#zoom-img').alt = `${p.titulo}, página ${estado.pagina + 1}`;
  $('#zoom-t').textContent = p.imagens.length > 1 ? `${p.titulo} · ${estado.pagina + 1}/${p.imagens.length}` : p.titulo;
  $('#zoom-area').classList.remove('is-zoom'); $('#zoom-area').scrollTo(0, 0);
  const ini = estado.pagina <= 0, fim = estado.pagina >= p.imagens.length - 1;
  $('#zoom-prev').disabled = ini; $('#zoom-next').disabled = fim; $('#zoom-lp').disabled = ini; $('#zoom-ln').disabled = fim;
}
const passoZoom = (d) => { const p = atual(); const i = estado.pagina + d; if (i < 0 || i >= p.imagens.length) return; estado.pagina = i; mostrarZoom(); };
$('#zoom-prev').onclick = () => passoZoom(-1);
$('#zoom-next').onclick = () => passoZoom(1);
$('#zoom-mais').onclick = () => $('#zoom-area').classList.toggle('is-zoom');
$('#zoom-img').onclick = () => $('#zoom-area').classList.toggle('is-zoom');
$('#zoom-lp').onclick = () => passoZoom(-1);
$('#zoom-ln').onclick = () => passoZoom(1);
$('#zoom-x').onclick = () => zoom.close();
// deslizar para trocar de página (quando não está ampliado)
let zx = null, zy = 0;
$('#zoom-area').addEventListener('touchstart', (e) => { zx = e.touches.length === 1 ? e.touches[0].clientX : null; zy = e.touches[0].clientY; }, { passive: true });
$('#zoom-area').addEventListener('touchend', (e) => {
  if (zx == null || $('#zoom-area').classList.contains('is-zoom')) return;
  const dx = e.changedTouches[0].clientX - zx, dy = e.changedTouches[0].clientY - zy; zx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) passoZoom(dx < 0 ? 1 : -1);
}, { passive: true });
zoom.addEventListener('close', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  marcarPagina(); irPara(estado.pagina, false);
});
zoom.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') passoZoom(1); if (e.key === 'ArrowLeft') passoZoom(-1); });

/* ---------- ações ---------- */
function toast(msg, erro = false) {
  const t = document.createElement('div'); t.className = 'toast' + (erro ? ' toast--err' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.append(t); setTimeout(() => t.remove(), 3500);
}
async function baixarPagina(btn) {
  const p = atual(); const url = p.imagens[estado.pagina];
  const txt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Preparando…';
  try {
    const blob = await (await fetch(url)).blob();
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const nome = `oferta-${p.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${estado.pagina + 1}.${ext}`;
    const file = new File([blob], nome, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [file], text: `${p.titulo} · Nonatão Supermercados` }).catch(() => {});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Imagem salva!');
    }
  } catch { toast('Não foi possível baixar agora. Tente de novo.', true); }
  btn.disabled = false; btn.innerHTML = txt;
}
$('#viewer-host').addEventListener('click', (e) => {
  const slide = e.target.closest('.slide'); if (slide) { abrirZoom(Number(slide.dataset.i)); return; }
  const nav = e.target.closest('[data-nav]'); if (nav) { irPara(estado.pagina + Number(nav.dataset.nav)); return; }
  const ir = e.target.closest('[data-ir]'); if (ir) { irPara(Number(ir.dataset.ir)); return; }
  const ac = e.target.closest('[data-acao]'); if (!ac) return;
  if (ac.dataset.acao === 'baixar') baixarPagina(ac);
  if (ac.dataset.acao === 'zap') {
    const p = atual();
    open(`https://wa.me/?text=${encodeURIComponent(`🛒 ${p.titulo} no Nonatão Supermercados!\nConfira a oferta: ${location.origin}/ofertas?p=${encodeURIComponent(p.id)}`)}`, '_blank', 'noopener');
  }
});
document.addEventListener('keydown', (e) => {
  if (zoom.open || !$('#slides')) return;
  if (e.key === 'ArrowRight') irPara(estado.pagina + 1); if (e.key === 'ArrowLeft') irPara(estado.pagina - 1);
});

/* ---------- carregar ---------- */
$('#viewer-host').innerHTML = '<div class="skel" style="width:min(100%,620px);height:560px;margin:24px auto"></div>';
listarPanfletos().then((l) => { estado.pfs = l; if (!atual()) estado.sel = null; montarAbas(); render(); })
  .catch(() => { $('#viewer-host').innerHTML = '<div class="vazio" style="margin:30px 0 70px"><div class="big">📡</div><h3>Não foi possível carregar as ofertas</h3><p>Verifique sua internet e tente de novo.</p><button class="btn btn--blue" onclick="location.reload()">Tentar novamente</button></div>'; });
