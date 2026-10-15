import { DEMO, DIAS, CATEGORIAS, agora, brl, desconto, esc, emojiDe, listarProdutos } from './api.js';
import { montarShell } from './shell.js';

montarShell('panfleto');
if (DEMO) document.getElementById('demo').hidden = false;

const $ = (s) => document.querySelector(s);
const hoje = agora().dia;
const FAV = 'nonatao_favoritos';
const lerFav = () => { try { return new Set(JSON.parse(localStorage.getItem(FAV)) || []); } catch { return new Set(); } };
const gravarFav = (s) => { try { localStorage.setItem(FAV, JSON.stringify([...s])); } catch { /* sem storage */ } };

const estado = { produtos: [], aba: String(hoje), cat: 'Todas', q: '', fav: lerFav() };

/* ---------- abas ---------- */
const tabs = $('#tabs');
tabs.innerHTML = [
  ...DIAS.map((d) => `<button class="chip-btn" role="tab" data-aba="${d.n}" aria-selected="false">${d.s}${d.n === hoje ? '<span class="hoje">hoje</span>' : ''}</button>`),
  '<button class="chip-btn chip-btn--week" role="tab" data-aba="semana" aria-selected="false">Semana toda</button>',
].join('');
function marcarAba() {
  tabs.querySelectorAll('.chip-btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === estado.aba)));
  const ativa = tabs.querySelector('[aria-selected="true"]');
  if (ativa) ativa.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]'); if (!b) return;
  estado.aba = b.dataset.aba; marcarAba(); render();
});

/* ---------- filtros ---------- */
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
catsEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  estado.cat = b.dataset.cat; montarCats(); render();
});

/* ---------- cartões ---------- */
function preco(v) {
  const [r, c] = Number(v).toFixed(2).split('.');
  return `<strong><small>R$</small>${Number(r).toLocaleString('pt-BR')}<sup>,${c}</sup></strong>`;
}
function card(p, i) {
  const off = desconto(p);
  const foto = p.foto_url
    ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}" loading="lazy" width="440" height="380">`
    : `<div class="ph" aria-hidden="true">${emojiDe(p.categoria)}</div>`;
  const un = p.unidade && p.unidade !== 'un' ? `/${esc(p.unidade)}` : '';
  const fav = estado.fav.has(p.id);
  return `<article class="oferta" style="--i:${Math.min(i, 14)}" data-id="${esc(p.id)}">
    <div class="oferta__media">${foto}
      ${off ? `<span class="sel sel--off">-${off}%</span>` : ''}
      ${p.destaque ? '<span class="sel sel--hot">Destaque</span>' : ''}
      <button class="fav" data-fav aria-pressed="${fav}" aria-label="${fav ? 'Remover dos favoritos' : 'Favoritar'} ${esc(p.nome)}">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-heart"/></svg>
      </button>
    </div>
    <div class="oferta__body">
      <p class="oferta__cat">${esc(p.categoria)}</p>
      <h3>${esc(p.nome)}</h3>
      ${p.descricao ? `<p class="desc">${esc(p.descricao)}</p>` : ''}
      <div class="preco">${p.preco_antigo && off ? `<del>${brl(p.preco_antigo)}</del>` : ''}${preco(p.preco)}<span class="un">${un || 'un'}</span></div>
      ${p.valido_ate ? `<p class="valid">Válido até ${p.valido_ate.split('-').reverse().join('/')}</p>` : ''}
      <button class="btn btn--whats" data-share>
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-share"/></svg>Compartilhar
      </button>
    </div>
  </article>`;
}

function filtrar() {
  return estado.produtos.filter((p) => {
    const dias = p.dias || [];
    const naAba = estado.aba === 'semana' ? p.semana_toda : (p.semana_toda || dias.includes(Number(estado.aba)));
    if (!naAba) return false;
    if (estado.cat === 'Favoritos' ? !estado.fav.has(p.id) : (estado.cat !== 'Todas' && p.categoria !== estado.cat)) return false;
    if (estado.q && !(`${p.nome} ${p.descricao || ''} ${p.categoria}`).toLowerCase().includes(estado.q)) return false;
    return true;
  });
}

function render() {
  const grid = $('#grid');
  const lista = filtrar();
  const d = DIAS.find((x) => String(x.n) === estado.aba);
  $('#titulo-dia').textContent = estado.aba === 'semana' ? 'Ofertas da semana toda' : (Number(estado.aba) === hoje ? `Ofertas de hoje · ${d.l}` : `Ofertas de ${d.l.toLowerCase()}`);
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

/* ---------- ações nos cartões ---------- */
$('#grid').addEventListener('click', (e) => {
  const art = e.target.closest('.oferta'); if (!art) return;
  const p = estado.produtos.find((x) => x.id === art.dataset.id); if (!p) return;
  if (e.target.closest('[data-fav]')) {
    const btn = e.target.closest('[data-fav]');
    estado.fav.has(p.id) ? estado.fav.delete(p.id) : estado.fav.add(p.id);
    gravarFav(estado.fav);
    btn.setAttribute('aria-pressed', String(estado.fav.has(p.id)));
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    if (estado.cat === 'Favoritos') setTimeout(render, 450);
  }
  if (e.target.closest('[data-share]')) {
    const un = p.unidade && p.unidade !== 'un' ? ` o ${p.unidade}` : '';
    const texto = `🛒 ${p.nome} por ${brl(p.preco)}${un} no Nonatão Supermercados!\nVeja mais ofertas: ${location.origin}/panfleto`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ text: texto }).catch(() => {});
    else open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }
});

/* ---------- deslizar para trocar de dia (celular) ---------- */
let x0 = null, y0 = 0;
const gridEl = $('#grid');
gridEl.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
gridEl.addEventListener('touchend', (e) => {
  if (x0 == null) return;
  const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
  const ordem = [...DIAS.map((d) => String(d.n)), 'semana'];
  const i = ordem.indexOf(estado.aba) + (dx < 0 ? 1 : -1);
  if (i < 0 || i >= ordem.length) return;
  estado.aba = ordem[i]; marcarAba(); render();
}, { passive: true });

/* ---------- carregar ---------- */
$('#grid').innerHTML = Array.from({ length: 6 }, () => '<div class="skel"></div>').join('');
marcarAba();
listarProdutos().then((lista) => {
  estado.produtos = lista; montarCats(); render();
}).catch(() => {
  $('#grid').innerHTML = '<div class="vazio"><div class="big">📡</div><h3>Não foi possível carregar o panfleto</h3><p>Verifique sua internet e tente de novo.</p><button class="btn btn--blue" onclick="location.reload()">Tentar novamente</button></div>';
});
