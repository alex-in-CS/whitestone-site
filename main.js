// Clocks, theme, and Aller's reveals: fade / up on entering view, and headings that split into
// lines and arrive through a short RGB "signal" glitch.
(() => {
  // ---- live clocks in the nav tray
  const clocks = document.querySelectorAll('[data-clock]');
  const fmt = (tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  const zone = (tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const labels = [...clocks].map((el) => el.textContent.trim());
  const tick = () => clocks.forEach((el, i) => {
    const tz = el.dataset.clock;
    el.textContent = `${labels[i]} | ${fmt(tz).format(new Date())} ${tz === 'Asia/Kolkata' ? 'IST' : zone(tz)}`;
  });
  tick(); setInterval(tick, 15000);

  // ---- light / dark
  const root = document.documentElement, btn = document.getElementById('theme-btn');
  const label = () => btn.setAttribute('aria-label', root.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  label();
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next; localStorage.setItem('theme', next); label();
    dispatchEvent(new CustomEvent('themechange', { detail: next }));
  });

  // ---- split headings into lines
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function words(el) {
    const out = [];
    const walk = (node, cls) => node.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/\s+/).forEach((w) => w && out.push({ text: w, cls }));
      else if (n.nodeName === 'BR') out.push('br');
      else if (n.nodeType === 1) walk(n, n.className || cls);
    });
    walk(el, '');
    return out;
  }
  const wordHTML = (w) => w.cls ? `<span class="${w.cls}">${w.text}</span>` : w.text;
  function split(el) {
    const list = el._words || (el._words = words(el));
    el.innerHTML = list.map((w) => w === 'br' ? '<br>' : `<span data-w${w.cls ? ` class="${w.cls}"` : ''}>${w.text}</span> `).join('');
    const lines = []; let top = null, i = 0;
    el.querySelectorAll('[data-w]').forEach((s) => {
      while (list[i] === 'br') { top = null; i++; }
      if (top === null || Math.abs(s.offsetTop - top) > 2) lines.push([]);
      top = s.offsetTop; lines[lines.length - 1].push(list[i]); i++;
    });
    el.innerHTML = lines.map((ln, n) => `<span class="reveal-line"><span style="--line:${n}">${ln.map(wordHTML).join(' ')}</span> </span>`).join('');
    el.dataset.split = '';
  }
  const heads = [...document.querySelectorAll('[data-reveal=lines]')];
  const resplit = () => heads.forEach((h) => { if (!h.dataset.signal) split(h); });
  resplit();
  document.fonts?.ready.then(resplit);
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; resplit(); } });

  // ---- their "signal" arrival: seven horizontal slices, each with cyan/magenta/yellow copies
  // that jitter sideways in steps, then the real text fades in
  const cuts = [0, .18, .31, .38, .61, .68, .86, 1], kick = [-.8, .55, -1, .18, .9, -.35, .55], wait = [0, .12, .03, .2, .08, 0, .15];
  function ghost(el, color) {
    const n = el.cloneNode(true);
    n.querySelectorAll('[data-signal-layer]').forEach((x) => x.remove());
    n.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    ['id', 'data-reveal', 'data-revealed', 'data-signal', 'data-split'].forEach((a) => n.removeAttribute(a));
    if (color) { n.style.color = color; n.querySelectorAll('*').forEach((x) => (x.style.color = 'inherit')); }
    n.setAttribute('aria-hidden', 'true'); n.setAttribute('inert', '');
    Object.assign(n.style, { position: 'absolute', margin: '0', visibility: 'visible', opacity: '1', pointerEvents: 'none' });
    return n;
  }
  function signal(el) {
    const cs = getComputedStyle(el), W = el.offsetWidth, Hh = el.offsetHeight;
    const amp = Math.min(14, .17 * parseFloat(cs.fontSize));
    const darkest = [el, ...el.querySelectorAll('.reveal-line *')]
      .map((x) => (getComputedStyle(x).color.match(/[\d.]+/g) ?? ['18', '18', '18']).slice(0, 3).map(Number))
      .reduce((a, b) => (b[0] + b[1] + b[2] < a[0] + a[1] + a[2] ? b : a));
    const tints = [`rgb(${darkest[0]},255,255)`, `rgb(255,${darkest[1]},255)`, `rgb(255,255,${darkest[2]})`];
    if (cs.position === 'static') el.style.position = 'relative';
    const layer = document.createElement('div');
    layer.dataset.signalLayer = ''; layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = `position:absolute;isolation:isolate;pointer-events:none;left:${-18 - el.clientLeft}px;top:${-18 - el.clientTop}px;width:${W + 36}px;height:${Hh + 36}px;`;
    const place = (g) => { Object.assign(g.style, { left: '18px', top: '18px', width: `${W}px`, boxSizing: 'border-box' }); return g; };
    const anims = [], run = (node, frames) => { const an = node.animate(frames, { duration: 1100, fill: 'both' }); anims.push(an); return an; };
    for (let i = 0; i < cuts.length - 1; i++) {
      const slice = document.createElement('div');
      slice.style.cssText = 'position:absolute;inset:0;';
      const top = i === 0 ? 0 : 18 + cuts[i] * Hh, bot = i === cuts.length - 2 ? 0 : 18 + (1 - cuts[i + 1]) * Hh;
      slice.style.clipPath = `inset(${top}px 0 ${bot}px 0)`;
      layer.appendChild(slice);
      const hx = kick[i] * amp, w0 = wait[i];
      run(slice, [
        { offset: 0, opacity: +!w0, transform: `translateX(${hx}px)`, easing: 'steps(1,end)' },
        { offset: w0 || .01, opacity: 1, transform: `translateX(${hx}px)`, easing: 'steps(1,end)' },
        { offset: .3, opacity: 1, transform: `translateX(${-.32 * hx}px)`, easing: 'steps(1,end)' },
        { offset: .49, opacity: 1, transform: `translateX(${.12 * hx}px)`, easing: 'ease-out' },
        { offset: .73, opacity: 1, transform: 'translateX(0px)' },
        { offset: .88, opacity: 0, transform: 'translateX(0px)' },
        { offset: 1, opacity: 0, transform: 'translateX(0px)' },
      ]);
      tints.forEach((tint, n) => {
        const g = place(ghost(el, tint));
        g.style.mixBlendMode = 'multiply';
        slice.appendChild(g);
        const lx = (n - 1) * amp * (i % 3 === 1 ? .55 : .23);
        run(g, [
          { offset: 0, transform: `translateX(${lx}px)`, easing: 'steps(1,end)' },
          { offset: .3, transform: `translateX(${-.6 * lx}px)`, easing: 'steps(1,end)' },
          { offset: .49, transform: `translateX(${.24 * lx}px)`, easing: 'ease-out' },
          { offset: .73, transform: 'translateX(0px)' },
          { offset: 1, transform: 'translateX(0px)' },
        ]);
      });
    }
    const real = place(ghost(el, null));
    layer.appendChild(real);
    const last = run(real, [{ offset: 0, opacity: 0 }, { offset: .69, opacity: 0 }, { offset: .88, opacity: 1 }, { offset: 1, opacity: 1 }]);
    el.dataset.signal = ''; el.appendChild(layer);
    const done = () => { anims.forEach((an) => an.cancel()); layer.remove(); delete el.dataset.signal; };
    last.finished.then(done, done);
  }

  // ---- reveal on entering view
  const items = document.querySelectorAll('[data-reveal]');
  if (reduced) { items.forEach((el) => (el.dataset.revealed = '')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target; io.unobserve(el);
    requestAnimationFrame(() => {
      el.dataset.revealed = '';
      if (el.dataset.reveal === 'lines' && document.documentElement.dataset.theme !== 'dark') signal(el);
      el.addEventListener('transitionend', () => (el.dataset.revealDone = ''), { once: true });
    });
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
})();
