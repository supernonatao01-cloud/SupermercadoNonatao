import {
  DEMO, SEM_BANCO, DIAS, esc, agora,
  login, logout, sessaoAtual, ehAdmin, demoRestaurar,
  listarSorteios, salvarSorteio, removerSorteio, enviarImagem, statusSorteio,
  listarPanfletos, salvarPanfleto, removerPanfleto, panfletoVigente, reduzirImagem, enviarBlob,
} from './api.js';

const app = document.getElementById('app');
const $ = (s, c = document) => c.querySelector(s);
const ic = (id) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;

const S = { aba: 'panfletos', sorteios: [], panfletos: [] };

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
        <button class="chip-btn" role="tab" data-aba="panfletos">📰 Panfletos</button>
        <button class="chip-btn" role="tab" data-aba="sorteios">🎁 Sorteios</button>
      </div>
      <div id="corpo"></div>
    </div>
    <button class="fab-add" id="novo"><span>+</span><b id="novo-t">Novo panfleto</b></button>
    <dialog class="ed" id="ed"></dialog>`;
  $('#sair').onclick = () => { logout(); telaLogin(); };
  if (DEMO) $('#reset').onclick = async () => { demoRestaurar(); await carregar(); toast('Exemplos restaurados'); };
  app.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { S.aba = b.dataset.aba; desenhar(); }));
  $('#novo').onclick = () => (S.aba === 'sorteios' ? editorSorteio() : editorPanfleto());
  await carregar();
}
async function carregar() {
  try {
    [S.sorteios, S.panfletos] = await Promise.all([listarSorteios({ admin: true }), listarPanfletos({ admin: true })]);
  } catch (e) {
    if (/expirada|JWT/i.test(e.message)) { logout(); telaLogin('Sua sessão expirou. Entre novamente.'); return; }
    toast('Erro ao carregar: ' + e.message, true);
  }
  desenhar();
}
function desenhar() {
  app.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === S.aba)));
  $('#novo-t').textContent = S.aba === 'sorteios' ? 'Novo sorteio' : 'Novo panfleto';
  if (S.aba === 'sorteios') desenharSorteios(); else desenharPanfletos();
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
const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/');
const dmy = (iso) => iso.split('-').reverse().join('/');
/** Situação do panfleto hoje. */
function situacao(pf) {
  const hoje = agora().iso;
  if (pf.ativo === false) return { k: 'oculto', txt: 'Oculto', cls: 'tag--r', ordem: 3 };
  if (pf.valido_de && pf.valido_de > hoje) return { k: 'agendado', txt: `Agendado · começa ${dm(pf.valido_de)}`, cls: 'tag--w', ordem: 1 };
  if (pf.valido_ate && pf.valido_ate < hoje) return { k: 'encerrado', txt: 'Encerrado', cls: '', ordem: 2 };
  return { k: 'noar', txt: 'No ar agora', cls: 'tag--g', ordem: 0 };
}
const periodo = (pf) => (pf.valido_de && pf.valido_ate ? (pf.valido_de === pf.valido_ate ? `Só em ${dmy(pf.valido_de)}` : `De ${dmy(pf.valido_de)} a ${dmy(pf.valido_ate)}`)
  : pf.valido_ate ? `Até ${dmy(pf.valido_ate)}` : pf.valido_de ? `A partir de ${dmy(pf.valido_de)}` : 'Sem data de fim');

function desenharPanfletos() {
  const lista = [...S.panfletos].sort((a, b) => situacao(a).ordem - situacao(b).ordem || String(b.valido_de || '').localeCompare(String(a.valido_de || '')));
  $('#corpo').innerHTML = `<p class="hint" style="margin-bottom:14px">Crie a <b>promoção</b> (ex.: “Quinta da Carne”), escolha o <b>período em que fica no ar</b> e suba as <b>imagens do panfleto</b>. O cliente só vê o que está no ar no dia.</p>
    <div class="ad-list">${lista.length ? lista.map((pf) => {
      const st = situacao(pf), n = (pf.imagens || []).length;
      return `<div class="row ${pf.ativo === false ? 'off' : ''}" data-id="${esc(pf.id)}"><div class="row__img">${n ? `<img src="${esc(pf.imagens[0])}" alt="" style="object-position:top">` : '📰'}</div>
        <div class="row__t"><b>${esc(pf.titulo)}</b><span>${esc(periodo(pf))}</span>
          <div class="tags"><span class="tag ${st.cls}">${esc(st.txt)}</span><span class="tag">${n} página${n === 1 ? '' : 's'}</span></div></div>
        <div class="row__a"><label class="sw" title="Mostrar no site"><input type="checkbox" data-ativo ${pf.ativo !== false ? 'checked' : ''} aria-label="Mostrar ${esc(pf.titulo)} no site"><i></i></label>
          <button class="ibtn" data-edit aria-label="Editar ${esc(pf.titulo)}">✎</button></div></div>`;
    }).join('') : '<div class="vazio"><div class="big">📰</div><h3>Nenhum panfleto ainda</h3><p>Toque em “Novo panfleto” para criar o primeiro.</p></div>'}</div><div style="height:90px"></div>`;
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
  const hoje = agora().iso;
  const v = pf ? { ...pf, imagens: [...(pf.imagens || [])] } : { titulo: '', subtitulo: '', valido_de: hoje, valido_ate: hoje, imagens: [], ordem: S.panfletos.length, ativo: true };
  const dlg = $('#ed');
  dlg.innerHTML = `
    <div class="ed__h"><h2>${novo ? 'Novo panfleto' : 'Editar panfleto'}</h2><button class="ibtn" type="button" data-fechar aria-label="Fechar">×</button></div>
    <form class="ed__b" id="f-pf" novalidate>
      <label class="field"><span>Nome da promoção</span><input name="titulo" value="${esc(v.titulo)}" maxlength="50" placeholder="Ex.: Quinta da Carne" required></label>
      <label class="field"><span>Descrição curta <small>(opcional)</small></span><input name="subtitulo" value="${esc(v.subtitulo || '')}" maxlength="110" placeholder="Ex.: É dia de churrasco!"></label>
      <div><span class="lbl">Fica no ar</span>
        <div class="two" style="margin-top:6px">
          <label class="field"><span>A partir do dia</span><input name="valido_de" type="date" value="${esc(v.valido_de || '')}"></label>
          <label class="field"><span>Até o dia</span><input name="valido_ate" type="date" value="${esc(v.valido_ate || '')}"></label>
        </div>
        <div class="chips" style="margin-top:8px"><button type="button" class="chip-btn" id="so-hoje">Só hoje</button><button type="button" class="chip-btn" id="sem-fim">Sem data de fim</button></div>
        <small style="color:var(--muted);display:block;margin-top:6px">Para um dia só, use a mesma data nos dois campos. Depois da data final o panfleto some sozinho do site.</small></div>
      <div><span class="lbl">Páginas do panfleto</span>
        <div class="paginas" id="paginas" style="margin-top:8px"></div>
        <label class="btn btn--blue" style="margin-top:10px;width:100%"><input type="file" accept="image/*" multiple id="arq-pf" style="display:none">${ic('i-search')} Adicionar imagens do panfleto</label>
        <small style="color:var(--muted);display:block;margin-top:6px">Pode escolher várias de uma vez. Use ← → para mudar a ordem. A primeira é a capa.</small></div>
      <label class="field"><span>Ordem nas abas</span><input name="ordem" type="number" inputmode="numeric" value="${Number(v.ordem) || 0}"><small>Menor número aparece primeiro.</small></label>
      <label class="toggle-row"><span>Mostrar no site<small>Desligue para esconder sem apagar</small></span><span class="sw"><input type="checkbox" name="ativo" ${v.ativo !== false ? 'checked' : ''}><i></i></span></label>
      <div class="erro" id="e-pf" hidden></div>
    </form>
    <div class="ed__f">${novo ? '' : '<button class="btn btn--outline" type="button" id="del" style="flex:0 0 auto;color:#b30f24">Apagar</button>'}<button class="btn btn--whats" type="button" id="salvar">Salvar panfleto</button></div>`;
  dlg.showModal();
  const f = $('#f-pf', dlg), erro = $('#e-pf', dlg), area = $('#paginas', dlg);
  let enviando = 0;

  const desenharPaginas = () => {
    area.innerHTML = v.imagens.length ? v.imagens.map((u, i) => `<div class="pagina" data-i="${i}">
        <img src="${esc(u)}" alt="Página ${i + 1}"><span class="pagina__n">${i === 0 ? 'Capa' : i + 1}</span>
        <div class="pagina__a"><button type="button" data-mv="-1" aria-label="Mover para trás" ${i === 0 ? 'disabled' : ''}>←</button><button type="button" data-mv="1" aria-label="Mover para frente" ${i === v.imagens.length - 1 ? 'disabled' : ''}>→</button><button type="button" data-rm aria-label="Remover página" class="x">✕</button></div></div>`).join('')
      : '<p class="hint">Nenhuma imagem ainda.</p>';
  };
  desenharPaginas();
  area.addEventListener('click', (e) => {
    const card = e.target.closest('.pagina'); if (!card) return; const i = Number(card.dataset.i);
    const mv = e.target.closest('[data-mv]');
    if (mv) { const j = i + Number(mv.dataset.mv); if (j >= 0 && j < v.imagens.length) { [v.imagens[i], v.imagens[j]] = [v.imagens[j], v.imagens[i]]; desenharPaginas(); } }
    if (e.target.closest('[data-rm]')) { v.imagens.splice(i, 1); desenharPaginas(); }
  });
  $('#arq-pf', dlg).addEventListener('change', async (e) => {
    const arquivos = [...e.target.files]; e.target.value = '';
    for (const arq of arquivos) {
      enviando++;
      const ph = document.createElement('div'); ph.className = 'pagina pagina--env'; ph.innerHTML = '<span>Enviando…</span>'; area.append(ph);
      try {
        const blob = await reduzirImagem(arq, 1600, 0.88);
        v.imagens.push(await enviarBlob(blob, 'panfletos'));
      } catch (err) { toast(`${arq.name}: ${String(err.message || err).slice(0, 100)}`, true); }
      ph.remove(); enviando--; desenharPaginas();
    }
  });
  $('#so-hoje', dlg).onclick = () => { f.elements.valido_de.value = hoje; f.elements.valido_ate.value = hoje; };
  $('#sem-fim', dlg).onclick = () => { f.elements.valido_ate.value = ''; };
  $('[data-fechar]', dlg).onclick = () => dlg.close();

  $('#salvar', dlg).onclick = async (e) => {
    const d = Object.fromEntries(new FormData(f));
    const falha = (m) => { erro.textContent = m; erro.hidden = false; };
    if (!d.titulo.trim()) return falha('Digite o nome da promoção.');
    if (enviando) return falha('Aguarde terminar de enviar as imagens.');
    if (!v.imagens.length) return falha('Adicione pelo menos uma imagem do panfleto.');
    if (d.valido_de && d.valido_ate && d.valido_ate < d.valido_de) return falha('A data final não pode ser antes da inicial.');
    e.currentTarget.disabled = true; erro.hidden = true;
    const dados = { ...(pf ? { id: pf.id } : {}), titulo: d.titulo.trim(), subtitulo: d.subtitulo.trim() || null, valido_de: d.valido_de || null, valido_ate: d.valido_ate || null,
      imagens: v.imagens, ordem: Number(d.ordem) || 0, ativo: f.elements.ativo.checked };
    if (await pedir(() => salvarPanfleto(dados), 'Panfleto salvo!')) { dlg.close(); carregar(); } else e.currentTarget.disabled = false;
  };
  const del = $('#del', dlg);
  if (del) del.onclick = async () => {
    if (!confirm(`Apagar o panfleto “${pf.titulo}”? Isso não pode ser desfeito.`)) return;
    if (await pedir(() => removerPanfleto(pf.id), 'Panfleto apagado')) { dlg.close(); carregar(); }
  };
}

/* ============ início ============ */
(async () => {
  if (DEMO) { telaLogin(); return; }
  if (sessaoAtual() && (await ehAdmin())) iniciar(); else telaLogin();
})();
