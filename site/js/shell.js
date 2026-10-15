/* Cabeçalho, barra inferior, seletor de WhatsApp e rodapé das páginas internas. */
const ic = (id, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
const CLUBE = 'https://chat.whatsapp.com/Lcsv8LEJewk5SvZZ7n6JXw?s=cl&p=i&mlu=0&ilr=4';

export function montarShell(ativa) {
  const cur = (k) => (ativa === k ? ' aria-current="page"' : '');
  document.body.insertAdjacentHTML('afterbegin', `
    <a class="skip" href="#conteudo">Pular para o conteúdo</a>
    <header class="topbar" id="topbar">
      <div class="topbar__inner glass">
        <a class="brand" href="./" aria-label="Nonatão Supermercados, início">
          <img src="assets/logo-branco.png" alt="" width="40" height="37"><span class="brand__txt">nonatão</span>
        </a>
        <nav class="nav" aria-label="Principal">
          <a href="ofertas"${cur('ofertas')}>Ofertas</a>
          <a href="sorteios"${cur('sorteios')}>Sorteios</a>
          <a href="./#lojas">Nossas lojas</a>
        </nav>
        <button class="btn btn--yellow btn--sm" type="button" data-open-whats>${ic('i-whats')}Fale conosco</button>
      </div>
    </header>`);

  document.body.insertAdjacentHTML('beforeend', `
    <footer class="footer footer--slim">
      <div class="wrap footer__row">
        <a class="brand" href="./"><img src="assets/logo-branco.png" alt="" width="40" height="37" loading="lazy"><span class="brand__txt">nonatão</span></a>
        <p>No coração da cidade e do povo.</p>
        <a class="insta" target="_blank" rel="noopener" href="https://www.instagram.com/nonatao_redesuperlegal/">${ic('i-insta')}@nonatao_redesuperlegal</a>
      </div>
      <p class="footer__legal wrap">© ${new Date().getFullYear()} Nonatão Supermercados · Uiraúna-PB</p>
    </footer>

    <nav class="tabbar glass tabbar--5" aria-label="Navegação rápida">
      <a href="./">${ic('i-home')}<span>Início</span></a>
      <a href="ofertas"${ativa === 'ofertas' ? ' aria-current="true"' : ''}>${ic('i-tag')}<span>Ofertas</span></a>
      <a href="sorteios"${ativa === 'sorteios' ? ' aria-current="true"' : ''}>${ic('i-gift')}<span>Sorteios</span></a>
      <a href="./#lojas">${ic('i-pin')}<span>Lojas</span></a>
      <button type="button" data-open-whats>${ic('i-whats')}<span>WhatsApp</span></button>
    </nav>

    <button class="fab" type="button" data-open-whats aria-label="Falar com o Nonatão no WhatsApp">${ic('i-whats')}</button>

    <dialog class="sheet" id="sheet" aria-labelledby="sheet-title">
      <form method="dialog" class="sheet__close"><button aria-label="Fechar">×</button></form>
      <h2 id="sheet-title">Falar com qual loja?</h2>
      <p>Escolha a unidade e continue a conversa no WhatsApp.</p>
      <a class="sheet__opt" target="_blank" rel="noopener" href="https://wa.me/5583999424770?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20Nonat%C3%A3o%20(Loja%201).">
        <b>Loja 1</b><span>R. João Pinto, 56</span>${ic('i-whats')}</a>
      <a class="sheet__opt" target="_blank" rel="noopener" href="https://wa.me/5583996563130?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20Nonat%C3%A3o%20(Loja%202).">
        <b>Loja 2</b><span>Rua José Barbosa, nº 76, Bairro São José</span>${ic('i-whats')}</a>
      <a class="sheet__opt sheet__opt--club" target="_blank" rel="noopener" href="${CLUBE}">
        <b>Clube de ofertas</b><span>Grupo com as promoções da semana</span>${ic('i-tag')}</a>
    </dialog>`);

  const sheet = document.getElementById('sheet');
  document.querySelectorAll('[data-open-whats]').forEach((b) => b.addEventListener('click', () => sheet.showModal()));
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  // cabeçalho inteligente
  const bar = document.getElementById('topbar'); let last = scrollY, tick = false;
  addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const y = scrollY; bar.classList.toggle('is-compact', y > 40);
      if (y > 160 && y > last + 4) bar.classList.add('is-hidden'); else if (y < last - 4 || y < 160) bar.classList.remove('is-hidden');
      last = y; tick = false;
    });
  }, { passive: true });
}
