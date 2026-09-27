/* Corpus — interactions
   Everything here is progressive enhancement: the page reads fine without it. */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /* ------------------------------------------------------------------
     Liturgical season (Roman calendar, simplified)
     ------------------------------------------------------------------ */

  const SEASONS = {
    advent: { name: 'Advent', latin: 'Tempus Adventus' },
    christmas: { name: 'Christmas', latin: 'Tempus Nativitatis' },
    ordinary: { name: 'Ordinary Time', latin: 'Tempus per annum' },
    lent: { name: 'Lent', latin: 'Tempus Quadragesimæ' },
    triduum: { name: 'Paschal Triduum', latin: 'Triduum Paschale' },
    easter: { name: 'Easter', latin: 'Tempus Paschale' },
  };

  const day = (y, m, d) => new Date(y, m, d);
  const addDays = (date, n) => day(date.getFullYear(), date.getMonth(), date.getDate() + n);
  const nextSunday = (date) => addDays(date, (7 - date.getDay()) % 7); // on or after

  // Easter Sunday (anonymous Gregorian algorithm)
  function easterSunday(y) {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const date = ((h + l - 7 * m + 114) % 31) + 1;
    return day(y, month - 1, date);
  }

  function liturgicalSeason(now = new Date()) {
    const today = day(now.getFullYear(), now.getMonth(), now.getDate());
    const y = today.getFullYear();
    const easter = easterSunday(y);
    const adventStart = nextSunday(day(y, 10, 27)); // Sunday nearest St Andrew (27 Nov – 3 Dec)
    const christmas = day(y, 11, 25);
    const baptismOfTheLord = nextSunday(day(y, 0, 7)); // Sunday after Epiphany

    if (today >= adventStart && today < christmas) return 'advent';
    if (today >= christmas || today <= baptismOfTheLord) return 'christmas';
    if (today >= addDays(easter, -46) && today < addDays(easter, -3)) return 'lent';
    if (today >= addDays(easter, -3) && today < easter) return 'triduum';
    if (today >= easter && today <= addDays(easter, 49)) return 'easter';
    return 'ordinary';
  }

  function toRoman(n) {
    const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
      [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    return map.reduce((out, [v, s]) => {
      while (n >= v) { out += s; n -= v; }
      return out;
    }, '');
  }

  const seasonKey = liturgicalSeason();
  const season = SEASONS[seasonKey];
  root.dataset.season = seasonKey;
  $$('[data-season-name]').forEach((el) => { el.textContent = season.name; });
  $$('[data-season-latin]').forEach((el) => { el.textContent = season.latin; });
  $$('[data-roman-year]').forEach((el) => { el.textContent = toRoman(new Date().getFullYear()); });
  $$('[data-year-now]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  $$(`[data-season-key="${seasonKey}"]`).forEach((el) => el.classList.add('is-now'));

  /* ------------------------------------------------------------------
     Opening animation: gold dot field behind the glowing word.
     The inline script in <head> decides whether it plays (intro-active).
     ------------------------------------------------------------------ */

  const intro = $('[data-intro]');
  if (intro && !root.classList.contains('intro-active')) {
    intro.remove();
  } else if (intro) {
    const LEAVE_ON = ['pointerdown', 'keydown', 'wheel', 'touchmove'];
    let stopDots = null;
    let finished = false;

    import('./intro-dots.js')
      .then(({ startDots }) => {
        if (finished) return;
        const el = $('[data-intro-dots]', intro);
        stopDots = startDots(el, { color: 0xf3e3bb, background: 0x0b0806 });
        requestAnimationFrame(() => el.classList.add('is-ready'));
        watchFrameRate(el);
      })
      .catch(() => { /* no WebGL or the CDN is unreachable: the gold word still plays */ });

    // On a device too slow to render the field smoothly, drop it; the word carries on.
    function watchFrameRate(el) {
      let last = performance.now();
      let slow = 0;
      const tick = (now) => {
        if (finished || !stopDots) return;
        slow = now - last > 120 ? slow + 1 : 0;
        last = now;
        if (slow >= 3) {
          stopDots();
          stopDots = null;
          el.classList.remove('is-ready');
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    const leave = () => {
      // Skip early, unless the overlay is already fading out on its own.
      if (parseFloat(getComputedStyle(intro).opacity) < 1) return;
      intro.classList.add('is-leaving');
    };
    LEAVE_ON.forEach((type) => window.addEventListener(type, leave, { passive: true }));

    intro.addEventListener('animationend', (e) => {
      if (e.target !== intro || e.animationName !== 'intro-out') return;
      finished = true;
      stopDots?.();
      LEAVE_ON.forEach((type) => window.removeEventListener(type, leave));
      intro.remove();
      root.classList.remove('intro-active');
    });
  }

  /* ------------------------------------------------------------------
     Navigation
     ------------------------------------------------------------------ */

  const nav = $('[data-nav]');
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');

  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.querySelector('.sr-only')?.replaceChildren(open ? 'Close menu' : 'Menu');
  }
  toggle?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle?.focus(); }
  });

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */

  const revealables = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------
     Statement: light the words as they scroll past
     ------------------------------------------------------------------ */

  function splitWords(el) {
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            words.push(span);
            frag.append(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    return words;
  }

  const wordBlocks = $$('[data-words]').map((el) => ({ el, words: splitWords(el) }));

  function updateWords(vh) {
    wordBlocks.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = clamp((vh * 0.85 - r.top) / (vh * 0.4 + r.height));
      const lit = p * words.length;
      words.forEach((w, i) => w.style.setProperty('--o', (0.16 + 0.84 * clamp(lit - i)).toFixed(3)));
    });
  }

  /* ------------------------------------------------------------------
     Liturgical year: sticky scroll story
     ------------------------------------------------------------------ */

  const year = $('[data-year]');
  const seasons = year ? $$('[data-season-key]', year) : [];
  const wheelArcs = year ? $$('[data-wheel] circle:not(.ring)', year) : [];
  const wheel = year ? $('[data-wheel]', year) : null;
  const bars = year ? $$('.year__progress i', year) : [];
  let activeSeason = -1;

  function updateYear(vh) {
    if (!year || !seasons.length) return;
    const r = year.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const total = year.offsetHeight - vh;
    const p = clamp(-r.top / total, 0, 0.9999);
    const pos = p * seasons.length;
    const i = Math.floor(pos);

    wheel?.style.setProperty('--rot', `${(-90 - 60 * pos).toFixed(2)}deg`);
    bars.forEach((bar, j) => bar.style.setProperty('--p', clamp(pos - j).toFixed(3)));

    if (i === activeSeason) return;
    activeSeason = i;
    seasons.forEach((el, j) => el.classList.toggle('is-active', j === i));
    wheelArcs.forEach((arc, j) => arc.classList.toggle('is-active', j === i));
    year.style.setProperty('--glow', `var(--${seasons[i].dataset.color})`);
  }

  /* ------------------------------------------------------------------
     Hero: gentle parallax as it scrolls away
     ------------------------------------------------------------------ */

  const hero = $('[data-hero]');

  function updateHero(vh) {
    if (!hero || reduceMotion.matches) return;
    const p = clamp(window.scrollY / (vh * 0.9));
    hero.style.setProperty('--hero-p', p.toFixed(3));
  }

  /* ------------------------------------------------------------------
     One rAF-throttled scroll loop for everything above
     ------------------------------------------------------------------ */

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = window.innerHeight;
      nav?.classList.toggle('is-scrolled', window.scrollY > 8);
      updateHero(vh);
      updateWords(vh);
      updateYear(vh);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // Deep links into the scroll story (#year) land on the first season.
  if (year && !seasons.some((s) => s.classList.contains('is-active'))) {
    seasons[0]?.classList.add('is-active');
  }

  /* ------------------------------------------------------------------
     Carousel buttons
     ------------------------------------------------------------------ */

  $$('[data-carousel]').forEach((carousel) => {
    const track = $('[data-carousel-track]', carousel);
    const prev = $('[data-carousel-prev]', carousel);
    const next = $('[data-carousel-next]', carousel);
    if (!track) return;

    const step = () => {
      const item = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const behavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
    const update = () => {
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };

    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: behavior() }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: behavior() }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ------------------------------------------------------------------
     Prayer language toggle
     ------------------------------------------------------------------ */

  $$('[data-lang-toggle]').forEach((group) => {
    const scope = group.closest('section') || document;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      const lang = btn.dataset.lang;
      group.dataset.active = lang;
      $$('button[data-lang]', group).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      $$('[data-lang-panel]', scope).forEach((panel) => { panel.hidden = panel.dataset.langPanel !== lang; });
    });
  });

  /* ------------------------------------------------------------------
     Table of contents: highlight the current section (chapter page)
     ------------------------------------------------------------------ */

  const tocLinks = $$('[data-toc] a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const tocIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.remove('is-current'));
        byId.get(entry.target.id)?.classList.add('is-current');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) tocIo.observe(el); });
  }

  /* ------------------------------------------------------------------
     Dust motes drifting through the hero's shaft of light
     ------------------------------------------------------------------ */

  const canvas = $('[data-motes]');
  if (canvas && !reduceMotion.matches) {
    const ctx = canvas.getContext('2d');
    const COUNT = 70;
    const TILT = Math.tan((9 * Math.PI) / 180); // matches .hero__light rotation
    let w = 0;
    let h = 0;
    let motes = [];
    let raf = 0;
    let visible = true;

    const spawn = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.4,
      vx: 0.05 + Math.random() * 0.18,
      vy: -0.04 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: COUNT }, spawn);
    };

    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      const band = h * 0.17;
      motes.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy + Math.sin(t / 2400 + m.phase) * 0.06;
        if (m.x > w + 4) m.x = -4;
        if (m.y < -4) m.y = h + 4;
        if (m.y > h + 4) m.y = -4;
        const centre = h * 0.19 + m.x * TILT;
        const d = Math.abs(m.y - centre) / band;
        const inBeam = Math.max(0, 1 - d * d);
        const twinkle = 0.65 + 0.35 * Math.sin(t / 900 + m.phase * 3);
        const alpha = (0.04 + 0.6 * inBeam) * twinkle;
        if (alpha < 0.02) return;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 228, 184, ${alpha.toFixed(3)})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      }).observe(canvas);
    }
    start();
  }
})();
