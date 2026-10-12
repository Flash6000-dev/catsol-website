/* CATSOL — scroll-linked scenes
   Costs · FAB-OS overview · Journey · Production tracking · Roadmap
   · Page atmosphere · Mission & vision · Closing

   Every scene is a pure function of scroll position. Each registers with the single shared
   scroll handler in main.js (window.CATSOL.scenes), writes CSS custom properties, and lets CSS
   do the drawing. No timers drive any scene, nothing snaps, scrolling is never intercepted,
   and everything runs in both directions. Under prefers-reduced-motion each scene is set once
   to its final, fully readable state. */
(() => {
  'use strict';
  const C = window.CATSOL;
  if (!C) return;
  const { reduced, clamp, smooth } = C;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const f4 = (v) => (+v).toFixed(4);
  const win = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  const pad = (n) => String(n).padStart(2, '0');

  /** 0 → 1 across a tall pinned section (sticky stage inside a taller wrapper). */
  const pinProgress = (el, vh) => {
    const r = el.getBoundingClientRect();
    const range = r.height - vh;
    return range > 0 ? clamp(-r.top / range) : 0;
  };
  /** 0 → 1 as an in-flow block travels up through the viewport. */
  const viewProgress = (el, vh, start = 0.9, span = 0.7) => {
    const r = el.getBoundingClientRect();
    return clamp((vh * start - r.top) / (r.height * span + vh * 0.25));
  };
  /** Cheap visibility gate so off-screen scenes cost nothing per frame. */
  const near = (el, vh) => {
    const r = el.getBoundingClientRect();
    return r.bottom > -vh && r.top < vh * 2;
  };

  /* ------------------------------------------------------------------ 1. What it costs */
  const costs = $('#costs');
  if (costs && !reduced) {
    const lines = $$('.cs', costs);
    const bridge = $('.costs__bridge', costs);
    //        in: start end   out: start end
    // sequential: each statement has finished leaving before the next begins to wipe in, so no two overlap
    const W = [[0.02, 0.12, 0.20, 0.26], [0.27, 0.37, 0.43, 0.49], [0.50, 0.60, 0.66, 0.72], [0.73, 0.83, 9, 10]];
    C.scenes.push((vh) => {
      if (!near(costs, vh)) return;
      const p = pinProgress(costs, vh);
      // disorder rises, peaks, then the composition returns to register under the closing line
      const s = smooth(0.05, 0.4, p) * (1 - smooth(0.62, 0.82, p));
      costs.style.setProperty('--s', f4(s));
      lines.forEach((el, i) => {
        const w = W[i];
        el.style.setProperty('--in', f4(smooth(w[0], w[1], p)));
        el.style.setProperty('--out', f4(smooth(w[2], w[3], p)));
      });
      bridge.style.setProperty('--b', f4(smooth(0.86, 0.96, p)));
    });
  }

  /* ------------------------------------------------------------------ 2. FAB-OS overview */
  const formation = $('#formation');
  if (formation) {
    const host = $('#formDocs');
    // deterministic scatter so the composition is identical on every visit
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const COUNT = 14;
    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('i');
      el.className = 'doc';
      const st = el.style;
      st.setProperty('--i', i);
      st.setProperty('--bz', i % 3);
      st.setProperty('--bx', (24 + ((i * 53) % 262)) + 'px');
      st.setProperty('--by', (34 + ((i * 37) % 150)) + 'px');
      st.setProperty('--ax', Math.round(-440 + rnd() * 1180) + 'px');
      st.setProperty('--ay', Math.round(-400 + rnd() * 980) + 'px');
      st.setProperty('--az', Math.round(180 + rnd() * 300) + 'px');
      st.setProperty('--ar', Math.round((rnd() - 0.5) * 240) + 'deg');
      st.setProperty('--arx', Math.round((rnd() - 0.5) * 140) + 'deg');
      host.appendChild(el);
    }
    if (reduced || !('IntersectionObserver' in window)) {
      formation.classList.add('is-formed');
    } else {
      // one-shot reveal that can replay: form on entry, reset only once fully out of view
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio >= 0.35) formation.classList.add('is-formed');
          else if (e.intersectionRatio === 0) formation.classList.remove('is-formed');
        });
      }, { threshold: [0, 0.35] }).observe(formation);
    }
    $$('.fnote', formation).forEach((n) => {
      n.addEventListener('pointerenter', () => { formation.dataset.hot = n.dataset.plane; });
      n.addEventListener('pointerleave', () => { delete formation.dataset.hot; });
    });
  }

  /* ------------------------------------------------------------------ 3. Journey (pinned, horizontal) */
  const journey = $('#workflow');
  if (journey) {
    const pinEl = $('.journey__pin', journey);
    const stops = $$('.stop', journey);
    const N = stops.length;
    const marks = $$('.rail__marks li', journey);
    const read = $('#railRead');
    const names = stops.map((s) => s.dataset.name);
    let idx = -1;
    let wasPinned = null;
    const setIndex = (i) => {
      if (i === idx) return;
      idx = i;
      marks.forEach((m, k) => { m.classList.toggle('is-on', k === i); m.classList.toggle('is-done', k < i); });
      if (read) read.textContent = pad(i + 1) + ' / ' + pad(N) + ' · ' + names[i];
    };

    if (reduced) {
      stops.forEach((s) => s.classList.add('is-in'));
    } else {
      // stacked layout (phones): each station lights as it enters the viewport
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((en) => en.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting)), { rootMargin: '0px 0px -18% 0px', threshold: 0.15 });
        stops.forEach((s) => io.observe(s));
      }
      C.scenes.push((vh) => {
        const pinned = getComputedStyle(pinEl).position === 'sticky';
        if (!pinned) {
          if (wasPinned !== false) {            // leaving the pinned layout: hand control back to CSS
            stops.forEach((s) => s.style.removeProperty('--d'));
            journey.style.removeProperty('--p');
            wasPinned = false;
          }
          return;
        }
        wasPinned = true;
        if (!near(journey, vh)) return;
        const raw = pinProgress(journey, vh);
        const p = clamp((raw - 0.04) / 0.92);   // short dwell on the first and last station
        const f = p * (N - 1);
        journey.style.setProperty('--p', f4(p));
        stops.forEach((s, i) => s.style.setProperty('--d', Math.min(Math.abs(f - i), 1.6).toFixed(3)));
        setIndex(Math.round(f));
      });
    }
    setIndex(0);
  }

  /* ------------------------------------------------------------------ 4. Production tracking (status dial) */
  const dial = $('#dial');
  if (dial) {
    const NS = 'http://www.w3.org/2000/svg';
    const COUNT = 6, R = 250, RI = 172;
    const nodesG = $('#dialNodes', dial), spokesG = $('#dialSpokes', dial);
    const nodes = [], spokes = [];
    for (let i = 0; i < COUNT; i++) {
      const a = (-90 + i * (360 / COUNT)) * Math.PI / 180;
      const sp = document.createElementNS(NS, 'line');
      sp.setAttribute('class', 'd-spoke');
      sp.setAttribute('x1', (R * Math.cos(a)).toFixed(1)); sp.setAttribute('y1', (R * Math.sin(a)).toFixed(1));
      sp.setAttribute('x2', (RI * Math.cos(a)).toFixed(1)); sp.setAttribute('y2', (RI * Math.sin(a)).toFixed(1));
      spokesG.appendChild(sp); spokes.push(sp);
      const n = document.createElementNS(NS, 'circle');
      n.setAttribute('class', 'd-node');
      n.setAttribute('cx', (R * Math.cos(a)).toFixed(1)); n.setAttribute('cy', (R * Math.sin(a)).toFixed(1)); n.setAttribute('r', 11);
      nodesG.appendChild(n); nodes.push(n);
    }
    const themes = $$('#themes li');
    let lastLit = -2, lastTheme = -2;
    const apply = (p) => {
      dial.style.setProperty('--p', f4(p));
      const deg = p * 360;
      const lit = Math.min(COUNT - 1, Math.floor((deg + 0.5) / (360 / COUNT)));
      if (lit !== lastLit) {
        lastLit = lit;
        nodes.forEach((n, i) => { const on = deg >= i * (360 / COUNT) - 0.5; n.classList.toggle('is-lit', on); spokes[i].classList.toggle('is-lit', on); });
      }
      const ti = Math.min(themes.length - 1, Math.floor(p * themes.length));
      if (ti !== lastTheme) {
        lastTheme = ti;
        themes.forEach((t, k) => { t.classList.toggle('is-on', k === ti); t.classList.toggle('is-past', k < ti); });
      }
    };
    if (reduced) {
      apply(1);
      nodes.forEach((n) => n.classList.add('is-lit')); spokes.forEach((s) => s.classList.add('is-lit'));
      themes.forEach((t) => { t.classList.add('is-on'); });
    } else {
      apply(0);
      C.scenes.push((vh) => { if (near(dial, vh)) apply(viewProgress(dial, vh, 0.9, 0.75)); });
    }
  }

  /* ------------------------------------------------------------------ 6. Roadmap (light-table overlays) */
  const bp = $('#bp');
  if (bp) {
    const legend = $$('#roadLegend li');
    let lastKey = '';
    const apply = (p) => {
      const p0 = win(p, 0, 0.35), p1 = ease(win(p, 0.25, 0.7)), p2 = ease(win(p, 0.55, 1));
      bp.style.setProperty('--p0', f4(p0));
      bp.style.setProperty('--p1', f4(p1));
      bp.style.setProperty('--p2', f4(p2));
      const key = (p1 > 0.04 ? 1 : 0) + '' + (p2 > 0.04 ? 1 : 0);
      if (key !== lastKey) {
        lastKey = key;
        legend.forEach((li, i) => li.classList.toggle('is-lit', i === 0 || (i === 1 && p1 > 0.04) || (i === 2 && p2 > 0.04)));
      }
    };
    if (reduced) { apply(1); legend.forEach((li) => li.classList.add('is-lit')); }
    else { apply(0); C.scenes.push((vh) => { if (near(bp, vh)) apply(viewProgress(bp, vh, 0.9, 0.7)); }); }
  }

  /* ------------------------------------------------------------------ 7. Page atmosphere */
  /* One fixed layer behind every section after the hero (the hero stage is opaque).
     - two technical grids that drift at different rates (parallax against the content)
     - one soft accent light that wanders slowly with page progress
     - a datum spine whose nodes light as each chapter is reached
     - a "tone" per chapter: scenes that carry their own grid ask the global one to step back
     Everything is a pure function of scroll position; nothing runs when the page is still. */
  const atmos = $('#atmos');
  if (atmos) {
    const TONE = { about: 1, purpose: 0.35, gap: 0.8, costs: 0.3, 'fab-os': 0.85, workflow: 0.15, tracking: 0.7, 'material-planning': 0.3, roadmap: 0.3, news: 1, contact: 1, closing: 0.4 };
    const chapters = Object.keys(TONE).map((id) => ({ id, el: document.getElementById(id) })).filter((c) => c.el);
    const spine = $('.atmos__spine', atmos);
    const nodes = chapters.map(() => {
      const n = document.createElement('i');
      spine.appendChild(n);
      return n;
    });
    let tops = [], docMax = 1;
    const measure = () => {
      const y = window.scrollY;
      docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      tops = chapters.map((c) => c.el.getBoundingClientRect().top + y);
      nodes.forEach((n, i) => { n.style.top = (clamp(tops[i] / docMax) * 100).toFixed(2) + '%'; });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', () => { measure(); C.requestUpdate(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); C.requestUpdate(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); C.requestUpdate(); }).observe(document.body);

    if (!reduced) {
      const last = {};
      const put = (k, v, q) => {
        if (last[k] === undefined || Math.abs(last[k] - v) >= q) { last[k] = v; atmos.style.setProperty(k, v.toFixed(4)); }
      };
      let lastLit = -1;
      C.scenes.push(() => {
        const y = window.scrollY;
        const pg = clamp(y / docMax);
        put('--g1', -((y * 0.22) % 72), 0.25);
        put('--g2', -((y * 0.09) % 288), 0.25);
        put('--pg', pg, 0.001);
        put('--gx', 34 + 30 * Math.sin(pg * 6.0), 0.15);
        put('--gz', 8 + 26 * (0.5 - 0.5 * Math.cos(pg * 9.4)), 0.15);
        const mid = y + window.innerHeight * 0.5;
        let cur = -1;
        for (let i = 0; i < tops.length; i++) if (mid >= tops[i]) cur = i;
        put('--tone', cur >= 0 ? TONE[chapters[cur].id] : 1, 0.01);
        const lit = tops.reduce((n, t) => n + (y + window.innerHeight * 0.4 >= t ? 1 : 0), 0);
        if (lit !== lastLit) { lastLit = lit; nodes.forEach((n, i) => n.classList.toggle('is-lit', i < lit)); }
      });
    }

    // section datum lines: draw across once, when a chapter first comes into view
    const edgeEls = $$('.section, .gap, .costs, .journey, .pv, .closing, .footer').filter((el) => !el.classList.contains('careers'));
    edgeEls.forEach((el) => el.classList.add('edge'));
    if (reduced || !('IntersectionObserver' in window)) {
      edgeEls.forEach((el) => el.classList.add('is-edge'));
    } else {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-edge'); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -10% 0px', threshold: 0 });
      edgeEls.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------------------------------------------ 8. Mission & vision */
  /* Two compositions, two treatments, one grammar (ruled lines + a statement read in sequence).
     Mission: a six-column grid draws down, the statement settles onto it, words light in order.
     Vision:  layered frames open outward behind the statement and pass through the field.
     In-view scrubs only (no pinning). Phones and reduced motion get the finished, fully readable state. */
  const mission = $('#mission');
  const vision = $('#vision');
  if (mission && vision) {
    const splitWords = (el) => {
      const parts = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      return parts.map((word, i) => {
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = word;
        el.appendChild(s);
        if (i < parts.length - 1) el.appendChild(document.createTextNode(' '));
        return s;
      });
    };
    const mWords = splitWords($('.m-text', mission));
    const vWords = splitWords($('.v-text', vision));
    const setWords = (ws, v) => ws.forEach((w) => { w._l = v; w.style.setProperty('--l', v); });
    const lightWords = (ws, p, from, to) => ws.forEach((w, i) => {
      const a = from + (i / ws.length) * (to - from);
      const l = Math.round((0.22 + 0.78 * smooth(a, a + 0.1, p)) * 50) / 50;
      if (w._l !== l) { w._l = l; w.style.setProperty('--l', l); }
    });
    const phone = window.matchMedia('(max-width: 760px)');

    if (reduced) {
      setWords(mWords, 1); setWords(vWords, 1);
    } else {
      let mode = '';
      const rest = () => {                      // simplified, fully readable state (phones)
        setWords(mWords, 1); setWords(vWords, 1);
        mission.style.setProperty('--m', '1');
        vision.style.setProperty('--v', '0.85');
      };
      setWords(mWords, 0.22); setWords(vWords, 0.22);
      mission.style.setProperty('--m', '0');
      vision.style.setProperty('--v', '0');
      C.scenes.push((vh) => {
        if (phone.matches) { if (mode !== 'phone') { mode = 'phone'; rest(); } return; }
        mode = 'full';
        if (near(mission, vh)) {
          const p = viewProgress(mission, vh, 0.9, 0.62);
          mission.style.setProperty('--m', f4(ease(win(p, 0, 0.55))));
          lightWords(mWords, p, 0.16, 0.86);
        }
        if (near(vision, vh)) {
          const p = viewProgress(vision, vh, 0.9, 0.62);
          vision.style.setProperty('--v', f4(ease(win(p, 0, 0.9))));
          lightWords(vWords, p, 0.14, 0.84);
        }
      });
    }
  }

  /* ------------------------------------------------------------------ 9. Closing (flat blank → formed part) */
  /* A bent-sheet-metal metaphor that nothing above uses: four walls fold up from a flat blank, one after
     another, and the finished part catches the accent light. Scroll-driven, reversible, never timed. */
  const fold = $('#fold');
  if (fold && !reduced) {
    const apply = (p) => {
      const s = fold.style;
      s.setProperty('--f', f4(ease(win(p, 0.04, 0.9))));
      s.setProperty('--fb', f4(ease(win(p, 0.06, 0.46))));
      s.setProperty('--fl', f4(ease(win(p, 0.2, 0.62))));
      s.setProperty('--fr', f4(ease(win(p, 0.28, 0.7))));
      s.setProperty('--ff', f4(ease(win(p, 0.44, 0.88))));
      s.setProperty('--e', f4(smooth(0.78, 1, p)));
    };
    apply(0);
    C.scenes.push((vh) => { if (near(fold, vh)) apply(viewProgress(fold, vh, 0.95, 0.7)); });
  }

  C.requestUpdate();
})();
