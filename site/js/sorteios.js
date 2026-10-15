import { DEMO, esc, emojiDe, listarSorteios, statusSorteio } from './api.js';
import { montarShell } from './shell.js';

montarShell('sorteios');
if (DEMO) document.getElementById('demo').hidden = false;

const raiz = document.getElementById('conteudo-sorteios');
const dataBR = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: 'long', year: 'numeric' });

const arte = (s) => (s.imagem_url
  ? `<a href="${esc(s.imagem_url)}" target="_blank" rel="noopener" aria-label="Abrir a arte do sorteio ${esc(s.titulo)} em tamanho real"><img src="${esc(s.imagem_url)}" alt="Arte do sorteio: ${esc(s.titulo)}" loading="lazy"></a>`
  : `<div class="ph" aria-hidden="true">🎁</div>`);

function acoes(s) {
  const link = s.regulamento_url ? `<a class="btn btn--outline" target="_blank" rel="noopener" href="${esc(s.regulamento_url)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-doc"/></svg>Regulamento</a>` : '';
  const video = s.video_url ? `<a class="btn btn--blue" target="_blank" rel="noopener" href="${esc(s.video_url)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-play"/></svg>Assistir ao sorteio</a>` : '';
  return `<div class="acoes">${video}${link}<button class="btn btn--whats" data-share="${esc(s.id)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#i-share"/></svg>Compartilhar</button></div>`;
}

function cardAtivo(s, i) {
  const st = statusSorteio(s);
  const contagem = st === 'ativo' && s.data_sorteio
    ? `<div class="contagem" data-fim="${esc(s.data_sorteio)}" role="timer" aria-label="Tempo até o sorteio">
         <div><b data-u="d">00</b><span>dias</span></div><div><b data-u="h">00</b><span>horas</span></div><div><b data-u="m">00</b><span>min</span></div><div><b data-u="s">00</b><span>seg</span></div>
       </div>` : '';
  const quando = s.data_sorteio ? `<p class="data-sorteio">${st === 'apuracao' ? 'Sorteio realizado em' : 'Sorteio em'} <b>${esc(dataBR(s.data_sorteio))}</b></p>` : (st === 'ativo' ? '<p class="data-sorteio">Data do sorteio: <b>a definir</b></p>' : '');
  const como = s.como_participar ? `<details class="como"><summary>Como participar</summary><p>${esc(s.como_participar)}</p></details>` : '';
  return `<article class="sorteio" style="--i:${i}">
    <div class="sorteio__arte">${arte(s)}<span class="status ${st === 'apuracao' ? 'status--apuracao' : ''}">${st === 'apuracao' ? 'Apurando resultado' : 'Rolando agora'}</span></div>
    <div class="sorteio__body">
      <p class="kicker">${esc(s.titulo)}</p>
      <h3>${esc(s.premio)}</h3>
      ${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}
      ${contagem}${quando}${como}${acoes(s)}
    </div>
  </article>`;
}

function cardEncerrado(s, i) {
  const gan = `<div class="ganhador">${s.ganhador_foto_url ? `<img src="${esc(s.ganhador_foto_url)}" alt="Foto do ganhador" loading="lazy">` : '<div class="av" aria-hidden="true">🏆</div>'}
    <div><small>Ganhador(a)</small><b>${esc(s.ganhador_nome)}</b></div></div>`;
  return `<article class="sorteio" style="--i:${i}">
    <div class="sorteio__arte">${arte(s)}<span class="status status--encerrado">Encerrado</span></div>
    <div class="sorteio__body">
      <p class="kicker">${esc(s.titulo)}</p>
      <h3>${esc(s.premio)}</h3>
      ${s.data_sorteio ? `<p class="data-sorteio">Sorteado em <b>${esc(dataCurta(s.data_sorteio))}</b></p>` : ''}
      ${gan}${acoes(s)}
    </div>
  </article>`;
}

let lista = [];
function render() {
  const ativos = lista.filter((s) => statusSorteio(s) === 'ativo');
  const apurando = lista.filter((s) => statusSorteio(s) === 'apuracao');
  const enc = lista.filter((s) => statusSorteio(s) === 'encerrado');
  if (!lista.length) {
    raiz.innerHTML = `<div class="vazio" style="margin-top:34px"><div class="big">🎁</div><h3>Nenhum sorteio no momento</h3>
      <p>Fique de olho: assim que um novo sorteio começar, ele aparece aqui. Entre no clube de ofertas para ser avisado.</p>
      <a class="btn btn--whats" target="_blank" rel="noopener" href="https://chat.whatsapp.com/Lcsv8LEJewk5SvZZ7n6JXw?s=cl&p=i&mlu=0&ilr=4">Entrar no clube de ofertas</a></div>`;
    return;
  }
  raiz.innerHTML = [
    ativos.length ? `<h2 class="sec-title"><span class="dot"></span>Rolando agora</h2><div class="sorteios sorteios--ativos">${ativos.map(cardAtivo).join('')}</div>` : '',
    apurando.length ? `<h2 class="sec-title"><span class="dot dot--y"></span>Aguardando resultado</h2><div class="sorteios sorteios--ativos">${apurando.map(cardAtivo).join('')}</div>` : '',
    enc.length ? `<h2 class="sec-title"><span class="dot dot--g"></span>Já sorteados</h2><div class="sorteios sorteios--enc">${enc.map(cardEncerrado).join('')}</div>` : '',
    !ativos.length && !apurando.length ? '<p class="hint" style="margin-top:24px">Não há sorteios rolando agora. Veja abaixo os últimos ganhadores e volte em breve!</p>' : '',
  ].join('');
  tic();
}

/* contagem regressiva */
const dois = (n) => String(n).padStart(2, '0');
let timer;
function tic() {
  const els = raiz.querySelectorAll('.contagem');
  let virou = false;
  els.forEach((el) => {
    const falta = Math.max(0, new Date(el.dataset.fim).getTime() - Date.now());
    if (!falta) { virou = true; return; }
    const s = Math.floor(falta / 1000);
    el.querySelector('[data-u=d]').textContent = dois(Math.floor(s / 86400));
    el.querySelector('[data-u=h]').textContent = dois(Math.floor(s % 86400 / 3600));
    el.querySelector('[data-u=m]').textContent = dois(Math.floor(s % 3600 / 60));
    el.querySelector('[data-u=s]').textContent = dois(s % 60);
  });
  clearTimeout(timer);
  if (virou) { render(); return; } // o sorteio chegou na hora: passa para "aguardando resultado"
  if (els.length && !document.hidden) timer = setTimeout(tic, 1000);
}
document.addEventListener('visibilitychange', tic);

raiz.addEventListener('click', (e) => {
  const b = e.target.closest('[data-share]'); if (!b) return;
  const s = lista.find((x) => x.id === b.dataset.share); if (!s) return;
  const texto = `🎁 ${s.titulo}: concorra a ${s.premio} no Nonatão Supermercados!\nSaiba como participar: ${location.origin}/sorteios`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ text: texto }).catch(() => {});
  else open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});

raiz.innerHTML = '<div class="grid"><div class="skel"></div><div class="skel"></div></div>';
listarSorteios().then((l) => { lista = l; render(); }).catch(() => {
  raiz.innerHTML = '<div class="vazio" style="margin-top:34px"><div class="big">📡</div><h3>Não foi possível carregar os sorteios</h3><p>Verifique sua internet e tente de novo.</p><button class="btn btn--blue" onclick="location.reload()">Tentar novamente</button></div>';
});
