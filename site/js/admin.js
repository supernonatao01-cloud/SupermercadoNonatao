import {
  DEMO, SEM_BANCO, DIAS, CATEGORIAS, UNIDADES, brl, esc, emojiDe, paraNumero,
  login, logout, sessaoAtual, ehAdmin, demoRestaurar,
  listarProdutos, salvarProduto, removerProduto, listarSorteios, salvarSorteio, removerSorteio, enviarImagem, statusSorteio,
  listarPanfletos, salvarPanfleto, removerPanfleto, ESTILOS, reduzirImagem, enviarBlob,
} from './api.js';
import { tirarFundoLiso, tirarFundoIA } from './imagem.js';

const app = document.getElementById('app');
const $ = (s, c = document) => c.querySelector(s);
const ic = (id) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;

const S = { aba: 'promos', produtos: [], sorteios: [], panfletos: [], filtro: 'todos' };

function toast(msg, erro = false) {
  const t = document.createElement('div'); t.className = 'toast' + (erro ? ' toast--err' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}
const pedir = async (fn, ok) => { try { await fn(); if (ok) toast(ok); return true; } catch (e) { toast(String(e.message || e).slice(0, 140), true); return false; } };

/* ============ LOGIN ============ */
function telaLogin(msg = '') {
  app.innerHTML = `<main class="ad-login"><form class="ad-card" id="f-login" novalidate>
    <img src="assets/logo.png" alt="Nonatão Supermercados">
    <h1>Painel do Nonatão</h1>
    ${SEM_BANCO ? '<p class="erro">O painel ainda não está conectado ao banco de dados. Configure o Supabase (passo a passo no README do projeto) e tente de novo.</p>' : ''}
    ${DEMO ? '<p class="hint">Modo demonstração: nada aqui é salvo na internet. Os dados ficam só neste navegador.</p>' : '<p>Entre com seu e-mail e senha.</p>'}
    ${DEMO || SEM_BANCO ? '' : `<label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="username" inputmode="email" required></label>
    <label class="field"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" required></label>`}
    <div class="erro" id="erro" ${msg ? '' : 'hidden'}>${esc(msg)}</div>
    <button class="btn btn--blue btn--lg" type="submit" ${SEM_BANCO ? 'disabled' : ''}>${DEMO ? 'Entrar no modo demonstração' : 'Entrar'}</button>
    <a href="./" style="color:var(--muted);font-weight:600;font-size:.9rem">← Voltar para o site</a>
  </form></main>`;
  $('#f-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), erro = $('#erro'), btn = e.submitter; erro.hidden = true; btn.disabled = true;
    try {
      await login(f.get('email'), f.get('senha'));
      if (!(await ehAdmin())) { logout(); throw new Error('Este usuário não tem permissão para usar o painel.'); }
      iniciar();
    } catch (err) { erro.textContent = /invalid/i.test(err.message) ? 'E-mail ou senha incorretos.' : err.message; erro.hidden = false; btn.disabled = false; }
  });
}

/* ============ SHELL ============ */
async function iniciar() {
  app.innerHTML = `
    <header class="ad-top"><div class="ad-top__in">
      <img src="assets/logo-branco.png" alt=""><b>Painel</b><span class="sp"></span>
      <a href="panfleto" target="_blank" rel="noopener">Ver site</a>
      <button class="lnk" id="sair">Sair</button>
    </div></header>
    ${DEMO ? '<div class="demo-banner">Modo demonstração: dados só neste navegador. <button class="lnk" id="reset" style="background:rgba(0,0,0,.12);color:#1b2a66;border:0;border-radius:999px;padding:4px 12px;font-weight:700;cursor:pointer">Restaurar exemplos</button></div>' : ''}
    <div class="ad-wrap">
      <div class="ad-tabs" role="tablist">
        <button class="chip-btn" role="tab" data-aba="promos">🏷️ Promoções</button>
        <button class="chip-btn" role="tab" data-aba="sorteios">🎁 Sorteios</button>
        <button class="chip-btn" role="tab" data-aba="panfletos">📰 Panfletos</button>
      </div>
      <div id="corpo"></div>
    </div>
    <button class="fab-add" id="novo"><span>+</span><b id="novo-t">Nova promoção</b></button>
    <dialog class="ed" id="ed"></dialog>`;
  $('#sair').onclick = () => { logout(); telaLogin(); };
  if (DEMO) $('#reset').onclick = async () => { demoRestaurar(); await carregar(); toast('Exemplos restaurados'); };
  app.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { S.aba = b.dataset.aba; desenhar(); }));
  $('#novo').onclick = () => (S.aba === 'promos' ? editorProduto() : S.aba === 'sorteios' ? editorSorteio() : editorPanfleto());
  await carregar();
}
async function carregar() {
  try {
    [S.produtos, S.sorteios, S.panfletos] = await Promise.all([listarProdutos({ admin: true }), listarSorteios({ admin: true }), listarPanfletos({ admin: true })]);
  } catch (e) {
    if (/expirada|JWT/i.test(e.message)) { logout(); telaLogin('Sua sessão expirou. Entre novamente.'); return; }
    toast('Erro ao carregar: ' + e.message, true);
  }
  desenhar();
}
function desenhar() {
  app.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === S.aba)));
  $('#novo-t').textContent = S.aba === 'promos' ? 'Nova promoção' : S.aba === 'sorteios' ? 'Novo sorteio' : 'Novo panfleto';
  if (S.aba === 'promos') desenharPromos(); else if (S.aba === 'sorteios') desenharSorteios(); else desenharPanfletos();
}

/* ============ PROMOÇÕES ============ */
const pfDe = (p) => S.panfletos.find((x) => x.id === p.panfleto_id);
/** Dias em que o produto aparece: os do panfleto (se tiver) ou os dele mesmo. */
const regraDias = (p) => { const pf = p.panfleto_id ? pfDe(p) : null; return pf ? { semana: pf.semana_toda, dias: pf.dias || [] } : { semana: p.semana_toda, dias: p.dias || [] }; };
const rotuloDias = (p) => {
  if (p.panfleto_id) { const pf = pfDe(p); return `<span class="tag tag--w">📰 ${esc(pf ? pf.titulo : 'Panfleto removido')}</span>`; }
  return p.semana_toda ? '<span class="tag tag--w">Semana toda</span>'
    : (p.dias || []).length ? DIAS.filter((d) => p.dias.includes(d.n)).map((d) => `<span class="tag">${d.s}</span>`).join('')
      : '<span class="tag tag--r">Sem dia definido</span>';
};
const valeNoFiltro = (p, f) => {
  if (f === 'todos') return true;
  if (f.startsWith('pf:')) return p.panfleto_id === f.slice(3);
  if (f === 'avulso') return !p.panfleto_id;
  const r = regraDias(p);
  return f === 'semana' ? r.semana : (r.semana || r.dias.includes(Number(f)));
};
const noFiltro = (p) => valeNoFiltro(p, S.filtro);

function desenharPromos() {
  const contar = (f) => S.produtos.filter((p) => valeNoFiltro(p, f)).length;
  const filtros = [['todos', 'Todos'], ...DIAS.map((d) => [String(d.n), d.s]), ['semana', 'Semana toda'], ...S.panfletos.map((pf) => ['pf:' + pf.id, '📰 ' + pf.titulo]), ['avulso', 'Avulsos']];
  const lista = S.produtos.filter(noFiltro);
  $('#corpo').innerHTML = `
    <div class="ad-days" role="group" aria-label="Filtrar por dia">${filtros.map(([k, n]) =>
      `<button class="chip-btn" data-f="${k}" aria-pressed="${S.filtro === k}">${n}<span class="n">${contar(k)}</span></button>`).join('')}</div>
    <div class="ad-list">${lista.length ? lista.map((p) => `
      <div class="row ${p.ativo ? '' : 'off'}" data-id="${esc(p.id)}">
        <div class="row__img">${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="">` : emojiDe(p.categoria)}</div>
        <div class="row__t"><b>${esc(p.nome)}</b><span>${brl(p.preco)}${p.unidade && p.unidade !== 'un' ? ' / ' + esc(p.unidade) : ''} · ${esc(p.categoria)}</span>
          <div class="tags">${rotuloDias(p)}${p.destaque ? '<span class="tag tag--g">Destaque</span>' : ''}${p.ativo ? '' : '<span class="tag tag--r">Oculto</span>'}</div></div>
        <div class="row__a">
          <label class="sw" title="Mostrar no site"><input type="checkbox" data-ativo ${p.ativo ? 'checked' : ''} aria-label="Mostrar ${esc(p.nome)} no site"><i></i></label>
          <button class="ibtn" data-edit aria-label="Editar ${esc(p.nome)}">✎</button>
        </div>
      </div>`).join('') : `<div class="vazio"><div class="big">🏷️</div><h3>Nenhuma promoção aqui</h3><p>Toque em “Nova promoção” para cadastrar a primeira.</p></div>`}</div>
    <div style="height:90px"></div>`;
  $('#corpo').querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { S.filtro = b.dataset.f; desenharPromos(); }));
  $('#corpo').querySelectorAll('.row').forEach((r) => {
    const p = S.produtos.find((x) => x.id === r.dataset.id);
    r.querySelector('[data-edit]').onclick = () => editorProduto(p);
    r.querySelector('[data-ativo]').onchange = async (e) => {
      p.ativo = e.target.checked;
      if (await pedir(() => salvarProduto({ id: p.id, ativo: p.ativo }))) desenharPromos(); else e.target.checked = !p.ativo;
    };
  });
}

function editorProduto(p = null) {
  const novo = !p;
  const filtroDia = /^[0-6]$/.test(S.filtro);
  const v = p ? { ...p, dias: [...(p.dias || [])] } : { nome: '', descricao: '', categoria: 'Mercearia', preco: '', preco_antigo: '', unidade: 'un', foto_url: '', dias: filtroDia ? [Number(S.filtro)] : [], semana_toda: S.filtro === 'semana', valido_ate: '', destaque: false, ativo: true, panfleto_id: S.filtro.startsWith('pf:') ? S.filtro.slice(3) : null };
  const dlg = $('#ed');
  dlg.innerHTML = `
    <div class="ed__h"><h2>${novo ? 'Nova promoção' : 'Editar promoção'}</h2><button class="ibtn" type="button" data-fechar aria-label="Fechar">×</button></div>
    <form class="ed__b" id="f-p" novalidate>
      <div class="foto">
        <div class="foto__p" id="prev">${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="">` : emojiDe(v.categoria)}</div>
        <div><label class="btn btn--blue"><input type="file" accept="image/*" id="arq">${ic('i-search')} ${v.foto_url ? 'Trocar foto' : 'Tirar ou escolher foto'}</label>
          <small style="color:var(--muted);display:block;margin-top:6px">A foto é reduzida automaticamente.</small>
          <div class="chips" id="bgbtns" style="margin-top:8px" ${v.foto_url ? '' : 'hidden'}>
            <button type="button" class="chip-btn" id="bg-liso" title="Apaga o fundo branco ou de uma cor só">✂ Tirar fundo liso</button>
            <button type="button" class="chip-btn" id="bg-ia" title="Recorta o produto com inteligência artificial (baixa ~30 MB na 1ª vez)">✨ Remover fundo (IA)</button>
          </div></div>
      </div>
      <label class="field"><span>Nome do produto</span><input name="nome" value="${esc(v.nome)}" placeholder="Ex.: Arroz tipo 1 – 5 kg" required maxlength="80"></label>
      <div><span class="lbl">Categoria</span><div class="chips" id="cats" style="margin-top:6px">${CATEGORIAS.map((c) => `<button type="button" class="chip-btn" data-cat="${esc(c.nome)}" aria-pressed="${v.categoria === c.nome}">${c.emoji} ${c.nome}</button>`).join('')}</div></div>
      <div class="two">
        <label class="field"><span>Preço (R$)</span><input name="preco" inputmode="decimal" placeholder="0,00" value="${v.preco !== '' ? String(v.preco).replace('.', ',') : ''}" required></label>
        <label class="field"><span>Preço antigo <small>(opcional)</small></span><input name="preco_antigo" inputmode="decimal" placeholder="0,00" value="${v.preco_antigo ? String(v.preco_antigo).replace('.', ',') : ''}"></label>
      </div>
      <div><span class="lbl">Vendido por</span><div class="chips" id="uni" style="margin-top:6px">${UNIDADES.map((u) => `<button type="button" class="chip-btn" data-un="${u}" aria-pressed="${v.unidade === u}">${u}</button>`).join('')}</div></div>
      <div><span class="lbl">Em qual panfleto?</span>
        <div class="chips" id="pfs" style="margin-top:6px"><button type="button" class="chip-btn" data-pf="" aria-pressed="${!v.panfleto_id}">Avulso (só pelos dias)</button>${S.panfletos.map((pf) => `<button type="button" class="chip-btn" data-pf="${esc(pf.id)}" aria-pressed="${v.panfleto_id === pf.id}">📰 ${esc(pf.titulo)}</button>`).join('')}</div>
        <small style="color:var(--muted);display:block;margin-top:4px">Produto de panfleto aparece nos dias e no visual do panfleto escolhido.</small></div>
      <div id="bloco-dias" ${v.panfleto_id ? 'hidden' : ''}>
        <span class="lbl">Quais dias vale a promoção?</span>
        <div class="chips" id="dias" style="margin-top:6px">${DIAS.map((d) => `<button type="button" class="chip-btn" data-dia="${d.n}" aria-pressed="${v.dias.includes(d.n)}">${d.s}</button>`).join('')}</div>
        <label class="toggle-row" style="margin-top:10px"><span>Vale a semana toda<small>Aparece em todos os dias</small></span><span class="sw"><input type="checkbox" name="semana_toda" ${v.semana_toda ? 'checked' : ''}><i></i></span></label>
      </div>
      <label class="field"><span>Descrição <small>(opcional)</small></span><input name="descricao" value="${esc(v.descricao || '')}" placeholder="Ex.: Fresquinho, direto do produtor" maxlength="120"></label>
      <div class="two">
        <label class="field"><span>Válido até <small>(opcional)</small></span><input name="valido_ate" type="date" value="${esc(v.valido_ate || '')}"></label>
        <label class="toggle-row" style="align-self:end;min-height:50px"><span>Destaque</span><span class="sw"><input type="checkbox" name="destaque" ${v.destaque ? 'checked' : ''}><i></i></span></label>
      </div>
      <label class="toggle-row"><span>Mostrar no site<small>Desligue para esconder sem apagar</small></span><span class="sw"><input type="checkbox" name="ativo" ${v.ativo ? 'checked' : ''}><i></i></span></label>
      <div class="erro" id="e-p" hidden></div>
    </form>
    <div class="ed__f">${novo ? '' : '<button class="btn btn--outline" type="button" id="del" style="flex:0 0 auto;color:#b30f24">Apagar</button>'}
      ${novo ? '<button class="btn btn--outline" type="button" id="salvar-novo">Salvar e adicionar outro</button>' : ''}
      <button class="btn btn--whats" type="button" id="salvar">Salvar</button></div>`;
  dlg.showModal();

  const f = $('#f-p', dlg), erro = $('#e-p', dlg);
  let foto = v.foto_url || '';
  const chipsUnico = (id, attr, set) => dlg.querySelector(id).addEventListener('click', (e) => {
    const b = e.target.closest(`[data-${attr}]`); if (!b) return;
    dlg.querySelectorAll(`${id} .chip-btn`).forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); set(b.dataset[attr]);
  });
  chipsUnico('#cats', 'cat', (c) => { v.categoria = c; if (!foto) $('#prev', dlg).textContent = emojiDe(c); });
  chipsUnico('#uni', 'un', (u) => { v.unidade = u; });
  $('#pfs', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('[data-pf]'); if (!b) return;
    dlg.querySelectorAll('#pfs .chip-btn').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
    v.panfleto_id = b.dataset.pf || null; $('#bloco-dias', dlg).hidden = !!v.panfleto_id;
  });
  $('#dias', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]'); if (!b) return;
    const n = Number(b.dataset.dia); const i = v.dias.indexOf(n);
    i >= 0 ? v.dias.splice(i, 1) : v.dias.push(n); b.setAttribute('aria-pressed', String(i < 0));
  });
  // foto atual como Blob (para poder tirar o fundo); se já existe foto salva, baixa só quando precisar
  let blobAtual = null;
  const obterBlob = async () => {
    if (blobAtual) return blobAtual;
    if (!foto) throw new Error('Envie uma foto primeiro.');
    blobAtual = await (await fetch(foto)).blob();
    return blobAtual;
  };
  const mostrar = (url) => { $('#prev', dlg).innerHTML = `<img src="${esc(url)}" alt="" style="background:repeating-conic-gradient(#e3e9fb 0 25%,#fff 0 50%) 0 0/16px 16px">`; };
  const enviar = async (blob, rotulo) => {
    $('#prev', dlg).innerHTML = `<span style="font-size:.8rem;font-weight:700">${rotulo}</span>`;
    foto = await enviarBlob(blob, 'produtos'); blobAtual = blob; mostrar(foto); $('#bgbtns', dlg).hidden = false;
  };
  $('#arq', dlg).addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { await enviar(await reduzirImagem(file, 900), 'Enviando…'); }
    catch (err) { foto = v.foto_url || ''; $('#prev', dlg).innerHTML = foto ? `<img src="${esc(foto)}" alt="">` : emojiDe(v.categoria); toast(err.message, true); }
  });
  const tratar = (id, fn, rotulo) => $(id, dlg).addEventListener('click', async (e) => {
    const btn = e.currentTarget, txt = btn.textContent; btn.disabled = true;
    try {
      const original = await obterBlob();
      btn.textContent = rotulo;
      const pronto = await fn(original, (k, a, t) => { if (t) btn.textContent = `${rotulo} ${Math.round((a / t) * 100)}%`; });
      await enviar(pronto, 'Enviando…'); toast('Fundo removido!');
    } catch (err) { toast(String(err.message || err).slice(0, 160), true); if (foto) mostrar(foto); }
    btn.disabled = false; btn.textContent = txt;
  });
  tratar('#bg-liso', (b) => tirarFundoLiso(b), 'Tirando…');
  tratar('#bg-ia', (b, p) => tirarFundoIA(b, p), 'Recortando…');
  $('[data-fechar]', dlg).onclick = () => dlg.close();

  const coletar = () => {
    const d = Object.fromEntries(new FormData(f));
    const preco = paraNumero(d.preco), antigo = paraNumero(d.preco_antigo);
    const semana = f.elements.semana_toda.checked;
    if (!d.nome.trim()) return 'Digite o nome do produto.';
    if (!(preco > 0)) return 'Digite um preço válido, como 7,99.';
    if (antigo != null && antigo <= preco) return 'O preço antigo precisa ser maior que o preço atual (ou deixe em branco).';
    if (!v.panfleto_id && !semana && !v.dias.length) return 'Marque pelo menos um dia, ou “Vale a semana toda”, ou escolha um panfleto.';
    return {
      ...(p ? { id: p.id } : {}), nome: d.nome.trim(), descricao: d.descricao.trim() || null, categoria: v.categoria, preco, preco_antigo: antigo, unidade: v.unidade,
      foto_url: foto || null, panfleto_id: v.panfleto_id || null, dias: v.panfleto_id || semana ? [] : [...v.dias].sort(), semana_toda: !v.panfleto_id && semana, valido_ate: d.valido_ate || null,
      destaque: f.elements.destaque.checked, ativo: f.elements.ativo.checked,
    };
  };
  const gravar = (outro) => async (e) => {
    const dados = coletar(); erro.hidden = typeof dados !== 'string';
    if (typeof dados === 'string') { erro.textContent = dados; erro.hidden = false; return; }
    e.currentTarget.disabled = true;
    if (await pedir(() => salvarProduto(dados), 'Promoção salva!')) {
      await carregar();
      if (outro) editorProduto(null); else dlg.close();
    } else e.currentTarget.disabled = false;
  };
  $('#salvar', dlg).onclick = gravar(false);
  const sn = $('#salvar-novo', dlg); if (sn) sn.onclick = gravar(true);
  const del = $('#del', dlg);
  if (del) del.onclick = async () => {
    if (!confirm(`Apagar “${p.nome}”? Isso não pode ser desfeito.`)) return;
    if (await pedir(() => removerProduto(p.id), 'Promoção apagada')) { dlg.close(); carregar(); }
  };
}

/* ============ SORTEIOS ============ */
const paraInputData = (iso) => {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};
const deInputData = (v) => (v ? new Date(`${v}:00-03:00`).toISOString() : null); // Uiraúna = UTC-3

function desenharSorteios() {
  const rot = { ativo: ['Rolando', 'tag--g'], apuracao: ['Aguardando resultado', 'tag--w'], encerrado: ['Encerrado', ''] };
  $('#corpo').innerHTML = `<div class="ad-list">${S.sorteios.length ? S.sorteios.map((s) => {
    const st = statusSorteio(s);
    return `<div class="row ${s.ativo ? '' : 'off'}" data-id="${esc(s.id)}">
      <div class="row__img">${s.imagem_url ? `<img src="${esc(s.imagem_url)}" alt="">` : '🎁'}</div>
      <div class="row__t"><b>${esc(s.premio)}</b><span>${esc(s.titulo)}${s.data_sorteio ? ' · ' + new Date(s.data_sorteio).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }) : ''}</span>
        <div class="tags"><span class="tag ${rot[st][1]}">${rot[st][0]}</span>${s.ganhador_nome ? `<span class="tag">🏆 ${esc(s.ganhador_nome)}</span>` : ''}${s.ativo ? '' : '<span class="tag tag--r">Oculto</span>'}</div></div>
      <div class="row__a">
        <label class="sw" title="Mostrar no site"><input type="checkbox" data-ativo ${s.ativo ? 'checked' : ''} aria-label="Mostrar ${esc(s.titulo)} no site"><i></i></label>
        <button class="ibtn" data-edit aria-label="Editar ${esc(s.titulo)}">✎</button>
      </div></div>`;
  }).join('') : '<div class="vazio"><div class="big">🎁</div><h3>Nenhum sorteio cadastrado</h3><p>Toque em “Novo sorteio” para criar o primeiro.</p></div>'}</div><div style="height:90px"></div>`;
  $('#corpo').querySelectorAll('.row').forEach((r) => {
    const s = S.sorteios.find((x) => x.id === r.dataset.id);
    r.querySelector('[data-edit]').onclick = () => editorSorteio(s);
    r.querySelector('[data-ativo]').onchange = async (e) => {
      s.ativo = e.target.checked;
      if (await pedir(() => salvarSorteio({ id: s.id, ativo: s.ativo }))) desenharSorteios(); else e.target.checked = !s.ativo;
    };
  });
}

function editorSorteio(s = null) {
  const novo = !s;
  const v = s ? { ...s } : { titulo: '', premio: '', descricao: '', imagem_url: '', como_participar: '', regulamento_url: '', data_sorteio: null, ganhador_nome: '', ganhador_foto_url: '', video_url: '', ativo: true };
  const dlg = $('#ed');
  dlg.innerHTML = `
    <div class="ed__h"><h2>${novo ? 'Novo sorteio' : 'Editar sorteio'}</h2><button class="ibtn" type="button" data-fechar aria-label="Fechar">×</button></div>
    <form class="ed__b" id="f-s" novalidate>
      <div class="foto">
        <div class="foto__p" id="prev">${v.imagem_url ? `<img src="${esc(v.imagem_url)}" alt="">` : '🎁'}</div>
        <div><label class="btn btn--blue"><input type="file" accept="image/*" id="arq">${ic('i-search')} ${v.imagem_url ? 'Trocar arte' : 'Enviar arte do sorteio'}</label>
          <small style="color:var(--muted);display:block;margin-top:6px">Use a imagem da campanha (a do Instagram serve).</small></div>
      </div>
      <label class="field"><span>Nome da campanha</span><input name="titulo" value="${esc(v.titulo)}" placeholder="Ex.: Concorra a uma moto elétrica" required maxlength="80"></label>
      <label class="field"><span>Prêmio</span><input name="premio" value="${esc(v.premio)}" placeholder="Ex.: Uma moto 100% elétrica" required maxlength="80"></label>
      <label class="field"><span>Data e hora do sorteio</span><input name="data" type="datetime-local" value="${paraInputData(v.data_sorteio)}"><small>Hora de Uiraúna. O site faz a contagem regressiva sozinho.</small></label>
      <label class="field"><span>Como participar</span><textarea name="como" placeholder="Ex.: Na compra de 1 produto participante, você recebe seu cupom.">${esc(v.como_participar || '')}</textarea></label>
      <label class="field"><span>Link do regulamento <small>(opcional)</small></span><input name="reg" type="url" inputmode="url" value="${esc(v.regulamento_url || '')}" placeholder="https://..."></label>
      <label class="field"><span>Descrição curta <small>(opcional)</small></span><input name="descricao" value="${esc(v.descricao || '')}" maxlength="140"></label>
      <hr class="sep">
      <p class="hint"><b>Depois do sorteio</b>, preencha o ganhador. O sorteio passa sozinho para “Já sorteados”.</p>
      <label class="field"><span>Nome do ganhador</span><input name="gan" value="${esc(v.ganhador_nome || '')}" placeholder="Ex.: Maria da Silva" maxlength="80"></label>
      <div class="foto">
        <div class="foto__p" id="prev2">${v.ganhador_foto_url ? `<img src="${esc(v.ganhador_foto_url)}" alt="">` : '🏆'}</div>
        <div><label class="btn btn--outline"><input type="file" accept="image/*" id="arq2">Foto do ganhador</label></div>
      </div>
      <label class="field"><span>Link do vídeo do sorteio <small>(opcional)</small></span><input name="video" type="url" inputmode="url" value="${esc(v.video_url || '')}" placeholder="https://instagram.com/..."></label>
      <label class="toggle-row"><span>Mostrar no site<small>Desligue para esconder sem apagar</small></span><span class="sw"><input type="checkbox" name="ativo" ${v.ativo ? 'checked' : ''}><i></i></span></label>
      <div class="erro" id="e-s" hidden></div>
    </form>
    <div class="ed__f">${novo ? '' : '<button class="btn btn--outline" type="button" id="del" style="flex:0 0 auto;color:#b30f24">Apagar</button>'}<button class="btn btn--whats" type="button" id="salvar">Salvar</button></div>`;
  dlg.showModal();

  const f = $('#f-s', dlg), erro = $('#e-s', dlg);
  let arte = v.imagem_url || '', fotoG = v.ganhador_foto_url || '';
  const subir = (inputId, prevId, pasta, atual, setar, vazio) => $(inputId, dlg).addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    $(prevId, dlg).innerHTML = '<span style="font-size:.8rem;font-weight:700">Enviando…</span>';
    try { const url = await enviarImagem(file, pasta); setar(url); $(prevId, dlg).innerHTML = `<img src="${esc(url)}" alt="">`; }
    catch (err) { $(prevId, dlg).innerHTML = atual() ? `<img src="${esc(atual())}" alt="">` : vazio; toast(err.message, true); }
  });
  subir('#arq', '#prev', 'sorteios', () => arte, (u) => { arte = u; }, '🎁');
  subir('#arq2', '#prev2', 'ganhadores', () => fotoG, (u) => { fotoG = u; }, '🏆');
  $('[data-fechar]', dlg).onclick = () => dlg.close();

  $('#salvar', dlg).onclick = async (e) => {
    const d = Object.fromEntries(new FormData(f));
    if (!d.titulo.trim() || !d.premio.trim()) { erro.textContent = 'Preencha o nome da campanha e o prêmio.'; erro.hidden = false; return; }
    const dados = {
      ...(s ? { id: s.id } : {}), titulo: d.titulo.trim(), premio: d.premio.trim(), descricao: d.descricao.trim() || null, imagem_url: arte || null,
      como_participar: d.como.trim() || null, regulamento_url: d.reg.trim() || null, data_sorteio: deInputData(d.data), ganhador_nome: d.gan.trim() || null,
      ganhador_foto_url: fotoG || null, video_url: d.video.trim() || null, ativo: f.elements.ativo.checked,
    };
    e.currentTarget.disabled = true;
    if (await pedir(() => salvarSorteio(dados), 'Sorteio salvo!')) { dlg.close(); carregar(); } else e.currentTarget.disabled = false;
  };
  const del = $('#del', dlg);
  if (del) del.onclick = async () => {
    if (!confirm(`Apagar o sorteio “${s.titulo}”? Isso não pode ser desfeito.`)) return;
    if (await pedir(() => removerSorteio(s.id), 'Sorteio apagado')) { dlg.close(); carregar(); }
  };
}

/* ============ PANFLETOS ============ */
const quando = (pf) => {
  if (pf.semana_toda) return 'Todos os dias';
  return (pf.dias || []).length ? DIAS.filter((d) => pf.dias.includes(d.n)).map((d) => d.s).join(', ') : 'Sem dia definido';
};
function desenharPanfletos() {
  $('#corpo').innerHTML = `<p class="hint" style="margin-bottom:14px">Cada <b>panfleto</b> é um encarte com título/logo, visual, dias e validade próprios (ex.: “Quinta da Carne”, “Outubro Rosa”). Depois, ao cadastrar um produto, escolha em qual panfleto ele entra.</p>
    <div class="ad-list">${S.panfletos.length ? S.panfletos.map((pf) => {
      const n = S.produtos.filter((p) => p.panfleto_id === pf.id).length;
      const est = ESTILOS.find((e) => e.id === pf.estilo) || ESTILOS[0];
      return `<div class="row ${pf.ativo ? '' : 'off'}" data-id="${esc(pf.id)}"><div class="row__img">${pf.titulo_arte_url ? `<img src="${esc(pf.titulo_arte_url)}" alt="" style="object-fit:contain">` : '📰'}</div>
        <div class="row__t"><b>${esc(pf.titulo)}</b><span>${esc(quando(pf))}${pf.valido_de || pf.valido_ate ? ` · ${pf.valido_de ? pf.valido_de.split('-').reverse().join('/') : '…'} a ${pf.valido_ate ? pf.valido_ate.split('-').reverse().join('/') : '…'}` : ''}</span>
          <div class="tags"><span class="tag">${esc(est.nome)}</span><span class="tag tag--g">${n} produto${n === 1 ? '' : 's'}</span>${pf.ativo ? '' : '<span class="tag tag--r">Oculto</span>'}</div></div>
        <div class="row__a"><label class="sw" title="Mostrar no site"><input type="checkbox" data-ativo ${pf.ativo ? 'checked' : ''} aria-label="Mostrar ${esc(pf.titulo)} no site"><i></i></label>
          <button class="ibtn" data-edit aria-label="Editar ${esc(pf.titulo)}">✎</button></div></div>`;
    }).join('') : '<div class="vazio"><div class="big">📰</div><h3>Nenhum panfleto ainda</h3><p>Toque em “Novo panfleto” para criar o primeiro. Enquanto isso, o site usa os produtos avulsos de cada dia.</p></div>'}</div><div style="height:90px"></div>`;
  $('#corpo').querySelectorAll('.row').forEach((r) => {
    const pf = S.panfletos.find((x) => x.id === r.dataset.id);
    r.querySelector('[data-edit]').onclick = () => editorPanfleto(pf);
    r.querySelector('[data-ativo]').onchange = async (e) => {
      pf.ativo = e.target.checked;
      if (await pedir(() => salvarPanfleto({ id: pf.id, ativo: pf.ativo }))) desenharPanfletos(); else e.target.checked = !pf.ativo;
    };
  });
}

function editorPanfleto(pf = null) {
  const novo = !pf;
  const v = pf ? { ...pf, dias: [...(pf.dias || [])] } : { titulo: '', subtitulo: '', estilo: 'azul', cor_a: null, cor_b: null, fundo_url: '', titulo_arte_url: '', rodape: '', dias: [], semana_toda: false, valido_de: '', valido_ate: '', ordem: S.panfletos.length, ativo: true };
  const HEX = /^#[0-9a-f]{6}$/i;
  const corA = HEX.test(v.cor_a || '') ? v.cor_a : '#1f5be0', corB = HEX.test(v.cor_b || '') ? v.cor_b : '#041c63';
  const dlg = $('#ed');
  dlg.innerHTML = `
    <div class="ed__h"><h2>${novo ? 'Novo panfleto' : 'Editar panfleto'}</h2><button class="ibtn" type="button" data-fechar aria-label="Fechar">×</button></div>
    <form class="ed__b" id="f-t" novalidate>
      <label class="field"><span>Título</span><input name="titulo" value="${esc(v.titulo)}" maxlength="40" placeholder="Ex.: Quinta da Carne" required><small>Se você enviar a logo 3D abaixo, ela aparece no lugar do texto.</small></label>
      <label class="field"><span>Subtítulo <small>(opcional)</small></span><input name="subtitulo" value="${esc(v.subtitulo || '')}" maxlength="110" placeholder="Ex.: É dia de churrasco! Confira nossas ofertas!"></label>
      <div class="foto"><div class="foto__p" id="prev-a">${v.titulo_arte_url ? `<img src="${esc(v.titulo_arte_url)}" alt="" style="object-fit:contain">` : '🔤'}</div>
        <div><label class="btn btn--outline"><input type="file" accept="image/*" id="arq-a">Logo 3D do panfleto</label>
        <small style="color:var(--muted);display:block;margin-top:4px">PNG/WebP sem fundo fica melhor.</small>
        ${v.titulo_arte_url ? '<button type="button" class="btn btn--outline" id="rm-a" style="margin-top:8px;color:#b30f24">Tirar logo</button>' : ''}</div></div>
      <div><span class="lbl">Visual</span><div class="chips" id="estilos" style="margin-top:6px">${ESTILOS.map((e) => `<button type="button" class="chip-btn" data-est="${e.id}" aria-pressed="${v.estilo === e.id}">${e.nome}</button>`).join('')}</div></div>
      <div>
        <span class="lbl">Em quais dias aparece?</span>
        <div class="chips" id="dias" style="margin-top:6px">${DIAS.map((d) => `<button type="button" class="chip-btn" data-dia="${d.n}" aria-pressed="${v.dias.includes(d.n)}">${d.s}</button>`).join('')}</div>
        <label class="toggle-row" style="margin-top:10px"><span>Todos os dias<small>Campanha: aparece em todos os dias e na aba “Semana toda”</small></span><span class="sw"><input type="checkbox" name="semana_toda" ${v.semana_toda ? 'checked' : ''}><i></i></span></label>
      </div>
      <div class="two">
        <label class="field"><span>Começa em <small>(opcional)</small></span><input name="valido_de" type="date" value="${esc(v.valido_de || '')}"></label>
        <label class="field"><span>Termina em <small>(opcional)</small></span><input name="valido_ate" type="date" value="${esc(v.valido_ate || '')}"><small>Depois dessa data o panfleto some sozinho.</small></label>
      </div>
      <label class="field"><span>Rodapé <small>(opcional)</small></span><textarea name="rodape" placeholder="Ofertas válidas {data}. Sujeitas à disponibilidade de estoque. Imagens ilustrativas.">${esc(v.rodape || '')}</textarea><small>Use <b>{data}</b> onde a validade deve aparecer (vira “somente dia 16/10/2026” ou “de 14 a 17/10/2026”).</small></label>
      <hr class="sep">
      <div class="foto"><div class="foto__p" id="prev-f">${v.fundo_url ? `<img src="${esc(v.fundo_url)}" alt="">` : '🖼️'}</div>
        <div><label class="btn btn--outline"><input type="file" accept="image/*" id="arq-f">Imagem de fundo <small>(opcional)</small></label>
        ${v.fundo_url ? '<button type="button" class="btn btn--outline" id="rm-f" style="margin-top:8px;color:#b30f24">Tirar fundo próprio</button>' : ''}</div></div>
      <div class="two">
        <label class="field"><span>Cor 1 <small>(opcional)</small></span><input name="cor_a" type="color" value="${corA}" style="padding:4px"></label>
        <label class="field"><span>Cor 2 <small>(opcional)</small></span><input name="cor_b" type="color" value="${corB}" style="padding:4px"></label>
      </div>
      <label class="toggle-row"><span>Usar minhas cores<small>Desligado: usa as cores do visual escolhido</small></span><span class="sw"><input type="checkbox" name="usar_cores" ${v.cor_a || v.cor_b ? 'checked' : ''}><i></i></span></label>
      <label class="field"><span>Ordem na página</span><input name="ordem" type="number" inputmode="numeric" value="${Number(v.ordem) || 0}"><small>Menor número aparece primeiro quando há mais de um panfleto no dia.</small></label>
      <label class="toggle-row"><span>Mostrar no site<small>Desligue para esconder sem apagar</small></span><span class="sw"><input type="checkbox" name="ativo" ${v.ativo ? 'checked' : ''}><i></i></span></label>
      <div class="erro" id="e-t" hidden></div>
    </form>
    <div class="ed__f">${novo ? '' : '<button class="btn btn--outline" type="button" id="del" style="flex:0 0 auto;color:#b30f24">Apagar</button>'}<button class="btn btn--whats" type="button" id="salvar">Salvar panfleto</button></div>`;
  dlg.showModal();
  const f = $('#f-t', dlg), erro = $('#e-t', dlg);
  let fundo = v.fundo_url || '', arte = v.titulo_arte_url || '';
  $('#estilos', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('[data-est]'); if (!b) return;
    dlg.querySelectorAll('#estilos .chip-btn').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); v.estilo = b.dataset.est;
  });
  $('#dias', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]'); if (!b) return;
    const n = Number(b.dataset.dia); const i = v.dias.indexOf(n);
    i >= 0 ? v.dias.splice(i, 1) : v.dias.push(n); b.setAttribute('aria-pressed', String(i < 0));
  });
  const subir = (inp, prev, pasta, setar, vazio) => $(inp, dlg).addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    $(prev, dlg).innerHTML = '<span style="font-size:.8rem;font-weight:700">Enviando…</span>';
    try { const url = await enviarImagem(file, pasta); setar(url); $(prev, dlg).innerHTML = `<img src="${esc(url)}" alt="" style="object-fit:contain">`; }
    catch (err) { $(prev, dlg).textContent = vazio; toast(err.message, true); }
  });
  subir('#arq-f', '#prev-f', 'temas', (u) => { fundo = u; }, '🖼️');
  subir('#arq-a', '#prev-a', 'temas', (u) => { arte = u; }, '🔤');
  const rf = $('#rm-f', dlg); if (rf) rf.onclick = () => { fundo = ''; $('#prev-f', dlg).textContent = '🖼️'; };
  const ra = $('#rm-a', dlg); if (ra) ra.onclick = () => { arte = ''; $('#prev-a', dlg).textContent = '🔤'; };
  $('[data-fechar]', dlg).onclick = () => dlg.close();
  $('#salvar', dlg).onclick = async (e) => {
    const d = Object.fromEntries(new FormData(f));
    const todos = f.elements.semana_toda.checked;
    if (!d.titulo.trim()) { erro.textContent = 'Digite o título do panfleto.'; erro.hidden = false; return; }
    if (!todos && !v.dias.length) { erro.textContent = 'Marque pelo menos um dia, ou “Todos os dias”.'; erro.hidden = false; return; }
    if (d.valido_de && d.valido_ate && d.valido_ate < d.valido_de) { erro.textContent = 'A data final não pode ser antes da inicial.'; erro.hidden = false; return; }
    const usar = f.elements.usar_cores.checked;
    e.currentTarget.disabled = true;
    const dados = { ...(pf ? { id: pf.id } : {}), titulo: d.titulo.trim(), subtitulo: d.subtitulo.trim() || null, estilo: v.estilo || 'azul',
      cor_a: usar ? d.cor_a : null, cor_b: usar ? d.cor_b : null, fundo_url: fundo || null, titulo_arte_url: arte || null, rodape: d.rodape.trim() || null,
      dias: todos ? [] : [...v.dias].sort(), semana_toda: todos, valido_de: d.valido_de || null, valido_ate: d.valido_ate || null, ordem: Number(d.ordem) || 0, ativo: f.elements.ativo.checked };
    if (await pedir(() => salvarPanfleto(dados), 'Panfleto salvo!')) { dlg.close(); carregar(); } else e.currentTarget.disabled = false;
  };
  const del = $('#del', dlg);
  if (del) del.onclick = async () => {
    const n = S.produtos.filter((p) => p.panfleto_id === pf.id).length;
    if (!confirm(`Apagar o panfleto “${pf.titulo}”?${n ? ` Os ${n} produtos dele não serão apagados: ficam avulsos.` : ''}`)) return;
    if (await pedir(() => removerPanfleto(pf.id), 'Panfleto apagado')) { dlg.close(); carregar(); }
  };
}

/* ============ início ============ */
(async () => {
  if (DEMO) { telaLogin(); return; }
  if (sessaoAtual() && (await ehAdmin())) iniciar(); else telaLogin();
})();
