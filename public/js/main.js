/* CATSOL — page interactions (no dependencies) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduced = root.classList.contains('reduced');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  // shared registry: scroll-linked scenes in js/scenes.js plug into the single handler below
  const C = (window.CATSOL = { reduced, clamp, smooth, scenes: [] });

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    menu.hidden = !open;
    nav.classList.toggle('is-stuck', open || window.scrollY > 8);
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  /* ---------- scroll-linked state (single rAF-throttled handler) ---------- */
  const hero = $('#top');
  const gap = $('#gap');
  const gapPin = $('.gap__pin');
  const gapStage = $('.gap__stage');
  const navLinks = $$('.nav__links a');
  // section id -> nav link it should highlight
  const NAV_FOR = { about: 'about', purpose: 'about', gap: 'gap', costs: 'gap', 'fab-os': 'fab-os', workflow: 'workflow', tracking: 'workflow', 'material-planning': 'workflow', roadmap: 'fab-os', news: '', contact: 'contact', closing: 'contact' };
  const watched = Object.keys(NAV_FOR).map((id) => document.getElementById(id));
  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    nav.classList.toggle('is-stuck', window.scrollY > 8 || !menu.hidden);
    for (const scene of C.scenes) scene(vh);

    if (!reduced) {
      // Hero: pinned exploded-view scrub
      const range = hero.offsetHeight - vh;
      const hp = range > 0 ? clamp(-hero.getBoundingClientRect().top / range) : 0;
      hero.style.setProperty('--p', hp.toFixed(4));
      hero.style.setProperty('--a1', (1 - smooth(0.1, 0.4, hp)).toFixed(3));
      hero.style.setProperty('--a2', smooth(0.46, 0.72, hp).toFixed(3));

      // Operational gap: pinned scrub on desktop, in-view scrub on small screens
      const pinned = getComputedStyle(gapPin).position === 'sticky';
      let gp;
      if (pinned) {
        const gr = gap.offsetHeight - vh;
        gp = clamp(-gap.getBoundingClientRect().top / gr, 0, 1);
        gp = smooth(0.08, 0.82, gp);
      } else {
        const r = gapStage.getBoundingClientRect();
        gp = smooth(0, 1, clamp((vh * 0.92 - r.top) / (vh * 0.5)));
      }
      gap.style.setProperty('--p', gp.toFixed(4));
    }

    // Current section in nav
    let current = null;
    for (const el of watched) { if (el && el.getBoundingClientRect().top <= vh * 0.35) current = el.id; }
    const target = current ? NAV_FOR[current] : null;
    navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + target));
  }
  const requestUpdate = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  C.requestUpdate = requestUpdate;
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();

  /* ---------- reveal on scroll ---------- */
  if (!reduced && 'IntersectionObserver' in window) {
    document.body.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  }

  /* ---------- card spotlight + magnetic primary buttons ---------- */
  if (finePointer) {
    $$('.spot').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
    if (!reduced) {
      $$('.btn--primary').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) / r.width;
          const y = (e.clientY - (r.top + r.height / 2)) / r.height;
          el.style.transform = `translate(${(x * 8).toFixed(1)}px, ${(y * 6).toFixed(1)}px)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
    }
  }

  /* ---------- misc ---------- */
  $('#year').textContent = new Date().getFullYear();

  // If the WebGL hero has not come alive shortly after load, show the static line drawing instead.
  const gl = $('#heroGl');
  setTimeout(() => { if (!gl.classList.contains('is-live')) gl.classList.add('no-webgl'); }, 5000);
})();
