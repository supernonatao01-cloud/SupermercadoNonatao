/* Prévia do panfleto e dos sorteios na home. Se não houver dados, a seção mostra só os atalhos. */
import { DEMO, agora, brl, desconto, esc, emojiDe, listarProdutos, listarPanfletos, panfletoVigente, listarSorteios, statusSorteio } from './api.js';

const mini = document.getElementById('mini');
const pill = document.getElementById('pill-sorteios');
const demoTag = document.getElementById('demo-home');
if (DEMO && demoTag) demoTag.hidden = false;

function preco(v) {
  const [r, c] = Number(v).toFixed(2).split('.');
  return `<strong><small>R$</small>${Number(r).toLocaleString('pt-BR')}<sup>,${c}</sup></strong>`;
}

Promise.all([listarProdutos(), listarPanfletos()]).then(([lista, pfs]) => {
  const hoje = agora().dia;
  const vig = pfs.filter((p) => panfletoVigente(p));
  // panfleto em destaque: o do dia da semana de hoje; se não houver, o primeiro em vigor
  const pf = vig.find((p) => !p.semana_toda && (p.dias || []).includes(hoje)) || vig[0];
  const base = pf ? lista.filter((p) => p.panfleto_id === pf.id) : lista.filter((p) => !p.panfleto_id && (p.semana_toda || (p.dias || []).includes(hoje)));
  const doDia = [...base].sort((a, b) => Number(b.destaque) - Number(a.destaque) || desconto(b) - desconto(a)).slice(0, 4);
  if (!doDia.length) { mini.hidden = true; return; }
  const alvo = pf ? `panfleto?p=${encodeURIComponent(pf.id)}` : 'panfleto';
  mini.innerHTML = doDia.map((p, i) => {
    const off = desconto(p);
    const foto = p.foto_url ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}" loading="lazy" width="440" height="380" style="object-fit:contain">` : `<div class="ph" aria-hidden="true">${emojiDe(p.categoria)}</div>`;
    return `<a class="oferta" href="${alvo}" style="--i:${i};text-decoration:none;color:inherit">
      <div class="oferta__media">${foto}${off ? `<span class="sel sel--off">-${off}%</span>` : ''}</div>
      <div class="oferta__body"><p class="oferta__cat">${esc(pf ? pf.titulo : p.categoria)}</p><h3>${esc(p.nome)}</h3>
      <div class="preco">${p.preco_antigo && off ? `<del>${brl(p.preco_antigo)}</del>` : ''}${preco(p.preco)}<span class="un">${p.unidade && p.unidade !== 'un' ? '/' + esc(p.unidade) : 'un'}</span></div></div></a>`;
  }).join('');
  mini.hidden = false;
}).catch(() => { mini.hidden = true; });

listarSorteios().then((lista) => {
  const n = lista.filter((s) => statusSorteio(s) === 'ativo').length;
  if (n && pill) { pill.textContent = n === 1 ? '1 sorteio rolando agora' : `${n} sorteios rolando agora`; pill.hidden = false; }
}).catch(() => {});
