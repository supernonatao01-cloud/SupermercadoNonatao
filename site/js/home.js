/* Prévia do panfleto e dos sorteios na home. Se não houver dados, a seção mostra só os atalhos. */
import { DEMO, agora, esc, listarPanfletos, panfletoVigente, listarSorteios, statusSorteio } from './api.js';

const mini = document.getElementById('mini');
const pill = document.getElementById('pill-sorteios');
const demoTag = document.getElementById('demo-home');
if (DEMO && demoTag) demoTag.hidden = false;

const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/');
listarPanfletos().then((pfs) => {
  const hoje = agora().iso;
  const lista = pfs.filter((p) => panfletoVigente(p, hoje) && (p.imagens || []).length)
    .sort((a, b) => (a.ordem - b.ordem) || String(b.valido_de || '').localeCompare(String(a.valido_de || ''))).slice(0, 4);
  if (!lista.length) { mini.hidden = true; return; }
  mini.className = 'pf-cards';
  mini.innerHTML = lista.map((p, i) => {
    const txt = p.valido_ate === hoje ? 'Termina hoje' : p.valido_ate ? `Válido até ${dm(p.valido_ate)}` : 'No ar agora';
    return `<a class="pf-card" href="panfleto?p=${encodeURIComponent(p.id)}" style="--i:${i}"><img src="${esc(p.imagens[0])}" alt="Capa do panfleto ${esc(p.titulo)}" loading="lazy" width="360" height="450">
      <div><b>${esc(p.titulo)}</b><span>${esc(txt)}</span></div></a>`;
  }).join('');
  mini.hidden = false;
}).catch(() => { mini.hidden = true; });

listarSorteios().then((lista) => {
  const n = lista.filter((s) => statusSorteio(s) === 'ativo').length;
  if (n && pill) { pill.textContent = n === 1 ? '1 sorteio rolando agora' : `${n} sorteios rolando agora`; pill.hidden = false; }
}).catch(() => {});
