import {
  DEMO, SEM_BANCO, DIAS, CATEGORIAS, UNIDADES, brl, esc, emojiDe, paraNumero,
  login, logout, sessaoAtual, ehAdmin, demoRestaurar,
  listarProdutos, salvarProduto, removerProduto, listarSorteios, salvarSorteio, removerSorteio, enviarImagem, statusSorteio,
} from './api.js';

const app = document.getElementById('app');
const $ = (s, c = document) => c.querySelector(s);
const ic = (id) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;

const S = { aba: 'promos', produtos: [], sorteios: [], filtro: 'todos' };

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
      </div>
      <div id="corpo"></div>
    </div>
    <button class="fab-add" id="novo"><span>+</span><b id="novo-t">Nova promoção</b></button>
    <dialog class="ed" id="ed"></dialog>`;
  $('#sair').onclick = () => { logout(); telaLogin(); };
  if (DEMO) $('#reset').onclick = async () => { demoRestaurar(); await carregar(); toast('Exemplos restaurados'); };
  app.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { S.aba = b.dataset.aba; desenhar(); }));
  $('#novo').onclick = () => (S.aba === 'promos' ? editorProduto() : editorSorteio());
  await carregar();
}
async function carregar() {
  try {
    [S.produtos, S.sorteios] = await Promise.all([listarProdutos({ admin: true }), listarSorteios({ admin: true })]);
  } catch (e) {
    if (/expirada|JWT/i.test(e.message)) { logout(); telaLogin('Sua sessão expirou. Entre novamente.'); return; }
    toast('Erro ao carregar: ' + e.message, true);
  }
  desenhar();
}
function desenhar() {
  app.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === S.aba)));
  $('#novo-t').textContent = S.aba === 'promos' ? 'Nova promoção' : 'Novo sorteio';
  S.aba === 'promos' ? desenharPromos() : desenharSorteios();
}

/* ============ PROMOÇÕES ============ */
const rotuloDias = (p) => (p.semana_toda ? '<span class="tag tag--w">Semana toda</span>'
  : (p.dias || []).length ? DIAS.filter((d) => p.dias.includes(d.n)).map((d) => `<span class="tag">${d.s}</span>`).join('')
    : '<span class="tag tag--r">Sem dia definido</span>');
const noFiltro = (p) => S.filtro === 'todos' || (S.filtro === 'semana' ? p.semana_toda : (p.semana_toda || (p.dias || []).includes(Number(S.filtro))));

function desenharPromos() {
  const contar = (f) => S.produtos.filter((p) => (f === 'todos' ? true : f === 'semana' ? p.semana_toda : (p.semana_toda || (p.dias || []).includes(Number(f))))).length;
  const filtros = [['todos', 'Todos'], ...DIAS.map((d) => [String(d.n), d.s]), ['semana', 'Semana toda']];
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
  const v = p ? { ...p, dias: [...(p.dias || [])] } : { nome: '', descricao: '', categoria: 'Mercearia', preco: '', preco_antigo: '', unidade: 'un', foto_url: '', dias: S.filtro !== 'todos' && S.filtro !== 'semana' ? [Number(S.filtro)] : [], semana_toda: S.filtro === 'semana', valido_ate: '', destaque: false, ativo: true };
  const dlg = $('#ed');
  dlg.innerHTML = `
    <div class="ed__h"><h2>${novo ? 'Nova promoção' : 'Editar promoção'}</h2><button class="ibtn" type="button" data-fechar aria-label="Fechar">×</button></div>
    <form class="ed__b" id="f-p" novalidate>
      <div class="foto">
        <div class="foto__p" id="prev">${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="">` : emojiDe(v.categoria)}</div>
        <div><label class="btn btn--blue"><input type="file" accept="image/*" id="arq">${ic('i-search')} ${v.foto_url ? 'Trocar foto' : 'Tirar ou escolher foto'}</label>
          <small style="color:var(--muted);display:block;margin-top:6px">A foto é reduzida automaticamente.</small></div>
      </div>
      <label class="field"><span>Nome do produto</span><input name="nome" value="${esc(v.nome)}" placeholder="Ex.: Arroz tipo 1 – 5 kg" required maxlength="80"></label>
      <div><span class="lbl">Categoria</span><div class="chips" id="cats" style="margin-top:6px">${CATEGORIAS.map((c) => `<button type="button" class="chip-btn" data-cat="${esc(c.nome)}" aria-pressed="${v.categoria === c.nome}">${c.emoji} ${c.nome}</button>`).join('')}</div></div>
      <div class="two">
        <label class="field"><span>Preço (R$)</span><input name="preco" inputmode="decimal" placeholder="0,00" value="${v.preco !== '' ? String(v.preco).replace('.', ',') : ''}" required></label>
        <label class="field"><span>Preço antigo <small>(opcional)</small></span><input name="preco_antigo" inputmode="decimal" placeholder="0,00" value="${v.preco_antigo ? String(v.preco_antigo).replace('.', ',') : ''}"></label>
      </div>
      <div><span class="lbl">Vendido por</span><div class="chips" id="uni" style="margin-top:6px">${UNIDADES.map((u) => `<button type="button" class="chip-btn" data-un="${u}" aria-pressed="${v.unidade === u}">${u}</button>`).join('')}</div></div>
      <div>
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
  $('#dias', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]'); if (!b) return;
    const n = Number(b.dataset.dia); const i = v.dias.indexOf(n);
    i >= 0 ? v.dias.splice(i, 1) : v.dias.push(n); b.setAttribute('aria-pressed', String(i < 0));
  });
  $('#arq', dlg).addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    $('#prev', dlg).innerHTML = '<span style="font-size:.8rem;font-weight:700">Enviando…</span>';
    try { foto = await enviarImagem(file, 'produtos'); $('#prev', dlg).innerHTML = `<img src="${esc(foto)}" alt="">`; }
    catch (err) { foto = v.foto_url || ''; $('#prev', dlg).textContent = emojiDe(v.categoria); toast(err.message, true); }
  });
  $('[data-fechar]', dlg).onclick = () => dlg.close();

  const coletar = () => {
    const d = Object.fromEntries(new FormData(f));
    const preco = paraNumero(d.preco), antigo = paraNumero(d.preco_antigo);
    const semana = f.elements.semana_toda.checked;
    if (!d.nome.trim()) return 'Digite o nome do produto.';
    if (!(preco > 0)) return 'Digite um preço válido, como 7,99.';
    if (antigo != null && antigo <= preco) return 'O preço antigo precisa ser maior que o preço atual (ou deixe em branco).';
    if (!semana && !v.dias.length) return 'Marque pelo menos um dia, ou “Vale a semana toda”.';
    return {
      ...(p ? { id: p.id } : {}), nome: d.nome.trim(), descricao: d.descricao.trim() || null, categoria: v.categoria, preco, preco_antigo: antigo, unidade: v.unidade,
      foto_url: foto || null, dias: semana ? [] : [...v.dias].sort(), semana_toda: semana, valido_ate: d.valido_ate || null,
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

/* ============ início ============ */
(async () => {
  if (DEMO) { telaLogin(); return; }
  if (sessaoAtual() && (await ehAdmin())) iniciar(); else telaLogin();
})();
