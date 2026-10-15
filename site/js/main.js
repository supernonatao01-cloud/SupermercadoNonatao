/* Nonatão Digital · interações da landing (sem dependências) */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- títulos palavra por palavra ---- */
  const splitWords = (el) => {
    let n = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.textContent = part;
            i.style.setProperty('--n', n++);
            w.append(i);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
  };
  $$('[data-words]').forEach(splitWords);

  /* ---- revelação ao entrar na tela ---- */
  $$('.reveal').forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 80}ms`));
  const inObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); inObs.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, [data-words]').forEach((el) => {
    if (el.closest('.hero')) return;
    inObs.observe(el);
  });
  // hero entra assim que a página carrega
  setTimeout(() => $$('.hero [data-words]').forEach((el) => {
    el.style.setProperty('--base', '350ms');
    el.classList.add('is-in');
  }), 60);

  /* ---- cabeçalho inteligente ---- */
  const bar = $('#topbar');
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    bar.classList.toggle('is-compact', y > 40);
    if (y > 160 && y > lastY + 4) bar.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 160) bar.classList.remove('is-hidden');
    lastY = y;

    if (!reduce) {
      const hero = $('.hero');
      const h = hero.offsetHeight;
      if (y < h) {
        const p = y / h;
        const stage = $('.hero__stage');
        stage.style.translate = `0 ${y * 0.10}px`;
        stage.style.scale = String(1 - p * 0.08);
        $('.hero__copy').style.translate = `0 ${y * -0.06}px`;
        $('.hero__mark').style.translate = `0 ${y * 0.18}px`;
      }
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---- aba ativa na barra inferior ---- */
  const tabs = $$('.tabbar a[data-tab]');
  const sections = ['inicio', 'lojas'].map((id) => document.getElementById(id));
  const tabObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      tabs.forEach((t) => t.setAttribute('aria-current', String(t.dataset.tab === e.target.id)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => s && tabObs.observe(s));

  /* ---- pausa animações fora da tela ---- */
  const pauseObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting));
  });
  $$('.hero, .ribbon').forEach((el) => pauseObs.observe(el));

  /* ---- parallax por mouse (desktop) ---- */
  if (finePointer && !reduce) {
    const stage = $('[data-stage]');
    const items = $$('[data-depth]', stage);
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      items.forEach((el) => {
        const d = Number(el.dataset.depth);
        el.style.translate = `${cx * d}px ${cy * d}px`;
      });
      stage.style.rotate = '';
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(loop) : 0;
    };
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    /* inclinação 3D dos cards de loja */
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---- toque: feedback de pressão ---- */
  $$('[data-press]').forEach((b) => {
    const on = () => b.classList.add('is-pressed');
    const off = () => b.classList.remove('is-pressed');
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
  });

  /* ---- seletor de loja (WhatsApp) ---- */
  const sheet = $('#sheet');
  $$('[data-open-whats]').forEach((b) => b.addEventListener('click', () => sheet.showModal()));
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  /* ---- aberto agora (horário de Uiraúna) ---- */
  // dia da semana: 0 = domingo ... 6 = sábado; [abre, fecha] em horas
  const HORARIOS = {
    1: { 1: [7, 19], 2: [7, 19], 3: [7, 19], 4: [7, 19], 5: [7, 19], 6: [7, 19] },
    2: { 0: [6, 13], 1: [6, 20], 2: [6, 20], 3: [6, 20], 4: [6, 20], 5: [6, 20], 6: [6, 20] },
  };
  const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Fortaleza', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
  const atualizarStatus = () => {
    const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
    const dia = DIAS[p.weekday];
    const hora = Number(p.hour) + Number(p.minute) / 60;
    $$('[data-status]').forEach((el) => {
      const faixa = HORARIOS[el.dataset.status][dia];
      if (!faixa) { el.hidden = true; return; } // sem horário informado para esse dia
      const aberto = hora >= faixa[0] && hora < faixa[1];
      el.hidden = false;
      el.classList.toggle('is-closed', !aberto);
      el.textContent = aberto ? `Aberto agora · fecha às ${faixa[1]}h` : 'Fechado agora';
    });
  };
  atualizarStatus();
  setInterval(atualizarStatus, 60000);

  /* ---- ano do rodapé ---- */
  $('#ano').textContent = new Date().getFullYear();

  /* ---- PWA ---- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
