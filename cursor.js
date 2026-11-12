// Cursor field: a ring of monospace characters on a 10px grid around the mouse, drawn only over empty
// page background (never over text, pictures, canvases, form fields, solid panels or the nav). Dense
// characters near the cursor, sparse at the edge, a few cells in violet, lime or ink, and a shimmer
// that runs while the mouse moves. Desktop pointers only; off for reduced motion.
(() => {
  const MQ = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
  if (!matchMedia(MQ).matches) return;

  const CHARS = '.:-=+*#%@', CELL = 10, RADIUS = 200;
  const ACCENTS = [{ color: '#646aed', share: 0.01 }, { color: '#d5fe00', share: 0.02 }, { ink: true, share: 0.1 }];
  // grid offsets inside the radius, nearest first, so hit testing resolves the middle of the ring first
  const RING = [];
  for (let i = -RADIUS / CELL - 1; i <= RADIUS / CELL + 1; i++) for (let j = -RADIUS / CELL - 1; j <= RADIUS / CELL + 1; j++) RING.push([i, j, Math.hypot(i, j)]);
  RING.sort((a, b) => a[2] - b[2]);
  const hash = (a, b, c) => { const v = 43758.5453 * Math.sin(127.1 * a + 311.7 * b + 74.7 * c); return v - Math.floor(v); };

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:35';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let dpr = 1;
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); };
  size();

  // which cells are open background: cached per cell, recomputed when the page changes
  let cache = new Map(), gen = 0, solid = new WeakMap(), genAt = performance.now(), budgetEnd = 0, skipRects = [];
  const invalidate = () => { gen++; solid = new WeakMap(); genAt = performance.now(); };
  const hasSolidBg = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      let v = solid.get(n);
      if (v === undefined) {
        const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
        v = (m ? Number(m[1].split(/[,/ ]+/).filter(Boolean)[3] ?? 1) : 0) > 0.5;
        solid.set(n, v);
      }
      if (v) return true;
    }
    return false;
  };
  const onGlyph = (x, y) => {
    let node = null, off = 0;
    if ('caretPositionFromPoint' in document) { const p = document.caretPositionFromPoint(x, y); node = p?.offsetNode ?? null; off = p?.offset ?? 0; }
    else { const r = document.caretRangeFromPoint?.(x, y); node = r?.startContainer ?? null; off = r?.startOffset ?? 0; }
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const len = node.textContent?.length ?? 0, range = document.createRange();
    for (const i of [off - 1, off]) {
      if (i < 0 || i >= len) continue;
      range.setStart(node, i); range.setEnd(node, i + 1);
      const b = range.getBoundingClientRect();
      if (x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 2 && y <= b.bottom + 2) return true;
    }
    return false;
  };
  const open = (gx, gy, x, y) => {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    if (skipRects.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return false;
    const key = 100003 * gx + gy, hit = cache.get(key);
    if (hit?.gen === gen) return hit.value;
    if (performance.now() > budgetEnd) return hit?.value;   // out of time this frame: reuse the stale answer
    const el = document.elementFromPoint(x, y);
    const value = !(el && (el.closest('img, video, svg, canvas, iframe, input, textarea, select') || hasSolidBg(el))) && !onGlyph(x, y);
    if (cache.size > 6e4) cache.clear();
    cache.set(key, { value, gen });
    return value;
  };

  let mx = -1e4, my = -1e4, inside = false, presence = 0, raf = 0, last = performance.now(), movedAt = 0, motion = 0, phase = 0;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(Math.max(now - last, 0) / 1000, 0.1);
    last = Math.max(now, last);
    presence += (+inside - presence) * (1 - Math.exp(-dt * (inside ? 10 : 3)));
    presence = Math.min(Math.max(presence, 0), 1);
    const moving = now - movedAt < 120;
    motion += (+moving - motion) * (1 - Math.exp(-dt * (moving ? 20 : 8)));
    phase += 12 * dt * motion;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (presence < 0.002 && !inside) return;
    if (performance.now() - genAt > 2000) invalidate();
    budgetEnd = performance.now() + 5;   // at most 5ms of hit testing per frame
    skipRects = [...document.querySelectorAll('header, [data-cursor-skip]')].map((e) => e.getBoundingClientRect());
    const dark = document.documentElement.dataset.theme === 'dark';
    const base = dark ? '#2c2e33' : '#dadee2', ink = dark ? '#f2f2f0' : '#121212';
    ctx.font = '500 8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let pending = false;
    const px = mx + scrollX, py = my + scrollY;
    const cx0 = Math.round(px / CELL), cy0 = Math.round(py / CELL);
    for (const [oi, oj] of RING) {
      { const gx = cx0 + oi, gy = cy0 + oj;
        const dx = CELL * gx - px, dy = CELL * gy - py, d = Math.hypot(dx, dy);
        if (d >= RADIUS) continue;
        // hit testing is costly on this page, so one test covers a 2x2 block of cells
        const bx = Math.floor(gx / 2), by = Math.floor(gy / 2);
        const ok = open(bx, by, CELL * (2 * bx + 0.5) - scrollX, CELL * (2 * by + 0.5) - scrollY);
        if (ok === undefined) pending = true;
        if (!ok) continue;
        const u = 1 - d / RADIUS, w = u * u * (3 - 2 * u) * presence;
        const tick = Math.floor(phase * (0.5 + hash(gx, gy, 7)) + 10 * hash(gx, gy, 8));
        let ci = Math.round(w * (CHARS.length - 1));
        const r = hash(gx, gy, tick);
        if (r < 0.07) ci = Math.floor(hash(gx, gy, tick + 0.3) * CHARS.length);
        else if (r < 0.35) ci += Math.round((hash(gx, gy, tick + 0.6) - 0.5) * 4);
        ci = Math.min(Math.max(ci, 0), CHARS.length - 1);
        let color = base, pick = hash(gx, gy, tick + 0.9);
        for (const a of ACCENTS) { if (pick < a.share) { color = a.ink ? ink : a.color; break; } pick -= a.share; }
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(1, 1.4 * w);
        ctx.fillText(CHARS[ci], px - scrollX + dx, py - scrollY + dy);
      }
    }
    ctx.globalAlpha = 1;
    if (!(inside && !pending && motion < 0.01 && presence > 0.995)) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; movedAt = performance.now(); inside = true; kick(); }, { passive: true });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) { inside = false; kick(); } });
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { size(); invalidate(); kick(); });
  addEventListener('themechange', () => { invalidate(); kick(); });
  let t = 0;
  const soon = () => { clearTimeout(t); t = setTimeout(invalidate, 100); };
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('toggle', soon, true);
})();
