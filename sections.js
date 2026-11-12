// Behaviour for the sections below the hero, ported from Aller's components:
// image glitch on hover, the process board loop, the lime button shader, the footer wordmark
// crossfade, the dust rising above the footer, and the inline cal.com booker.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const visible = (el, cb, opts) => { const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), opts); io.observe(el); return io; };

  // ---------- 1. RGB glitch on image stacks (industry cards, project cards)
  // a stack = an image followed by 4 slice copies and 2 tinted copies (red, blue)
  if (!reduced) document.querySelectorAll('div[aria-hidden="true"]').forEach((box) => {
    const layers = [...box.children].filter((c) => c.tagName === 'DIV' && c.classList.contains('invisible'));
    if (layers.length !== 6) return;
    const trigger = box.closest('li, a, article') || box;
    let raf = 0, last = 0;
    const slice = (el, t, x) => {
      const s = Math.random() * t * 100 + 0.5, n = 100 * Math.random();
      el.style.clipPath = `inset(${n}% 0 ${Math.max(0, 100 - n - s)}% 0)`;
      el.style.transform = `translateX(${x}px)`; el.style.visibility = 'visible';
    };
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / 31) return;
      last = now;
      for (let i = 0; i < 4; i++) slice(layers[i], 1 / 8, (Math.random() - 0.5) * 50);
      const [r, b] = [layers[4], layers[5]];
      if (Math.random() < 0.3) { slice(r, 1 / 6, 5); b.style.clipPath = r.style.clipPath; b.style.transform = 'translateX(-5px)'; b.style.visibility = 'visible'; }
      else { r.style.visibility = 'hidden'; b.style.visibility = 'hidden'; }
    };
    trigger.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !raf) raf = requestAnimationFrame(tick); });
    trigger.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); raf = 0; layers.forEach((l) => (l.style.visibility = 'hidden')); });
  });

  // ---------- 2. process board: a lead runs each connector, the cards light up in turn, the key presses
  const wrap = document.querySelector('._3N0scq_wrap');
  if (wrap) {
    const board = wrap.querySelector('._3N0scq_board');
    new ResizeObserver(() => wrap.style.setProperty('--s', wrap.clientWidth / 954)).observe(wrap);
    wrap.style.setProperty('--s', wrap.clientWidth / 954);
    const paths = [...board.querySelectorAll('._3N0scq_progress')], leads = [...board.querySelectorAll('._3N0scq_lead')];
    const cards = [...board.querySelectorAll('._3N0scq_card')], nodes = [...board.querySelectorAll('._3N0scq_node')];
    const key = board.querySelector('._3N0scq_key'), halo = board.querySelector('._3N0scq_halo'), ring = board.querySelector('._3N0scq_ring');
    const travel = [450, 700, 450], OUT = 'cubic-bezier(.16,1,.3,1)', INOUT = 'cubic-bezier(.37,0,.63,1)';
    const C0 = { active: 0, drawn: 0, traveling: null, complete: false, resetting: false };
    let st = { ...C0 }, hover = null;
    const set = (a) => { const on = (el, k, v) => (v ? el.setAttribute(k, '') : el.removeAttribute(k));
      const act = hover ?? st.active, E = (i) => st.drawn > i || st.traveling === i;
      on(board, 'data-complete', st.complete); on(board, 'data-resetting', st.resetting);
      paths.forEach((p, i) => on(p, 'data-on', E(i)));
      cards.forEach((c, i) => on(c, 'data-active', act === i || st.complete));
      nodes.forEach((n, j) => on(n, 'data-on', j % 2 ? st.drawn > (j >> 1) : E(j >> 1)));
    };
    const state = (patch) => { st = typeof patch === 'function' ? patch(st) : { ...st, ...patch }; set(); };
    cards.forEach((c, i) => { c.addEventListener('mouseenter', () => { hover = i; set(); }); c.addEventListener('mouseleave', () => { hover = null; set(); }); });
    set();
    const press = (big) => {
      key?.animate(big
        ? [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(4px) scale(.92)', offset: 0.25, easing: OUT }, { transform: 'translateY(-2px) scale(1.03)', offset: 0.55, easing: INOUT }, { transform: 'translateY(0) scale(1)' }]
        : [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(1.5px) scale(.965)', offset: 0.3, easing: OUT }, { transform: 'translateY(0) scale(1)' }],
      { duration: big ? 900 : 520, easing: INOUT });
      halo?.animate([{ opacity: 0.8, transform: 'scale(1)' }, { opacity: 1, transform: `scale(${big ? 1.35 : 1.08})`, offset: 0.35 }, { opacity: 0.8, transform: 'scale(1)' }], { duration: big ? 1400 : 900, easing: INOUT });
      if (big) ring?.animate([{ opacity: 0.9, transform: 'scale(.95)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 900, easing: OUT });
    };
    const lead = (i) => leads[i]?.animate([{ offsetDistance: '0%', opacity: 0 }, { opacity: 1, offset: 0.12 }, { offsetDistance: '100%', opacity: 1, offset: 0.88 }, { offsetDistance: '100%', opacity: 0 }], { duration: travel[i] + 250, easing: INOUT });
    let run = 0;
    const loop = async (id) => {
      // a wait that pauses while a card is hovered, and stops when the loop is replaced
      const wait = (ms) => new Promise((res, rej) => { let left = ms, t0 = performance.now();
        const f = (t) => { if (run !== id) return rej(0); if (hover === null) left -= t - t0; t0 = t; left <= 0 ? res() : requestAnimationFrame(f); };
        requestAnimationFrame(f); });
      try {
        let first = true;
        for (;;) {
          state(C0); await wait(first ? 400 : 700); first = false;
          for (let e = 0; e < 3; e++) {
            state({ traveling: e }); press(false); lead(e); await wait(travel[e]);
            state({ traveling: null, drawn: e + 1, active: e + 1 }); await wait(700);   // quicker than Aller (1700): less waiting per card
          }
          state({ complete: true }); press(true); await wait(1000);
          state({ complete: false, resetting: true }); await wait(400);
        }
      } catch { /* replaced */ }
    };
    if (!reduced) visible(wrap, (on) => { run++; if (on) loop(run); else state(C0); }, { threshold: 0.1 });
  }

  // ---------- 3. the lime button shader (an animated lime-to-black flow inside .btn-lime)
  const VERT = "#version 300 es\nin vec2 a_pos;\nout vec2 v_uv;\nvoid main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }", FRAG = "#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform vec2 u_resolution;\nuniform float u_time;\nuniform float u_pixelRatio;\nuniform vec3 u_colors[4];\nuniform vec3 u_seed1;\nuniform vec3 u_seed2;\n\nconst float TAU = 6.28318530;\nconst float SCALE = 0.4, TURB_AMP = 0.6, TURB_FREQ = 0.1, WAVE_FREQ = 2.4;\n// Exposure and contrast at 1: Framer's 1.1 pushed the brand lime toward white\nconst float DITHER = 0.2, EXPOSURE = 1.0, CONTRAST = 1.0;\nconst int TURB_ITER = 4;\n\nvec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }\nvec3 toSrgb(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(0.4545)); }\nvec3 linearToOklab(vec3 c) {\n  float l = pow(max(0.4122214708*c.r + 0.5363325363*c.g + 0.0514459929*c.b, 0.0), 1.0/3.0);\n  float m = pow(max(0.2119034982*c.r + 0.6806995451*c.g + 0.1073969566*c.b, 0.0), 1.0/3.0);\n  float s = pow(max(0.0883024619*c.r + 0.2817188376*c.g + 0.6299787005*c.b, 0.0), 1.0/3.0);\n  return vec3(0.2104542553*l + 0.7936177850*m - 0.0040720468*s,\n              1.9779984951*l - 2.4285922050*m + 0.4505937099*s,\n              0.0259040371*l + 0.7827717662*m - 0.8086757660*s);\n}\nvec3 oklabToLinear(vec3 c) {\n  float l = c.x + 0.3963377774*c.y + 0.2158037573*c.z;\n  float m = c.x - 0.1055613458*c.y - 0.0638541728*c.z;\n  float s = c.x - 0.0894841775*c.y - 1.2914855480*c.z;\n  l = l*l*l; m = m*m*m; s = s*s*s;\n  return vec3( 4.0767416621*l - 3.3077115913*m + 0.2309699292*s,\n              -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,\n              -0.0041960863*l - 0.7034186147*m + 1.7076147010*s);\n}\n// Blend two Oklab colours through LCh, taking the short way round the hue circle\nvec3 mixLch(vec3 a, vec3 b, float t) {\n  vec3 p = vec3(a.x, length(a.yz), atan(a.z, a.y));\n  vec3 q = vec3(b.x, length(b.yz), atan(b.z, b.y));\n  if (p.y < 0.05) p.z = q.z;\n  if (q.y < 0.05) q.z = p.z;\n  float dh = q.z - p.z;\n  if (dh > 3.14159265) dh -= TAU;\n  if (dh < -3.14159265) dh += TAU;\n  float h = p.z + dh * t, C = mix(p.y, q.y, t);\n  return vec3(mix(p.x, q.x, t), C * cos(h), C * sin(h));\n}\nvec3 palette(float t) {\n  t = clamp(t, 0.0, 1.0) * 3.0;\n  int i = min(int(floor(t)), 2);\n  return oklabToLinear(mixLch(linearToOklab(toLinear(u_colors[i])), linearToOklab(toLinear(u_colors[i + 1])), t - float(i)));\n}\n// Interleaved gradient noise: an even, fine dither that hides banding\nfloat ign(vec2 uv) { return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715)))); }\nvec3 gamutMap(vec3 rgb) {\n  if (min(rgb.r, min(rgb.g, rgb.b)) >= 0.0 && max(rgb.r, max(rgb.g, rgb.b)) <= 1.0) return rgb;\n  vec3 lab = linearToOklab(max(rgb, 0.0));\n  float L = clamp(lab.x, 0.0, 1.0), C = length(lab.yz), h = atan(lab.z, lab.y);\n  float maxC = 0.4 * (1.0 - pow(abs(2.0 * L - 1.0), 2.0)), knee = maxC * 0.7;\n  if (C > knee) C = knee + (maxC - knee) * tanh((C - knee) / (maxC - knee + 0.001));\n  return clamp(oklabToLinear(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);\n}\n\nvoid main() {\n  vec2 frag = v_uv * u_resolution;\n  vec2 p = (frag * 2.0 - u_resolution) / u_resolution.y;\n  float ang = 76.798822;\n  p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;\n  vec2 phase = (u_seed2.xy - 0.5) * TAU;\n  float t = u_time * 0.3 * 1.60;\n  float freq = 1.0 / TURB_FREQ;\n\n  float total = 0.0, weights = 0.0;\n  for (float i = 0.0; i < 4.0; i++) {\n    float e = i / 4.0;\n    vec2 q = p * SCALE;\n    float a = phase.x, d = phase.y;\n    for (int j = 2; j < TURB_ITER; j++) {\n      float fj = float(j);\n      q += TURB_AMP * sin(q.yx / freq * fj + t + vec2(a, d) + u_seed1.xy * fj) / fj;\n      a += cos(fj + d * 1.2 + q.x * 2.0 - t + u_seed2.z);\n      d += sin(fj * q.y + a + u_seed1.z + t + u_seed2.y);\n    }\n    float v = 0.5 + 0.5 * sin(length(q.yx + vec2(a, d) * 0.2) * WAVE_FREQ + i * i + u_seed1.x);\n    float w = smoothstep(0.0, 0.5, e) * smoothstep(1.0, 0.5, e);\n    total += v * w;\n    weights += w;\n  }\n  float val = clamp((total / weights - 0.3) / 0.4, 0.0, 1.0);\n  val = clamp(val + (ign(floor(frag / u_pixelRatio)) - 0.5) * DITHER, 0.0, 1.0);\n\n  vec3 lab = linearToOklab(palette(val) * EXPOSURE);\n  lab.x = clamp((lab.x - 0.5) * CONTRAST + 0.5, 0.0, 1.0);\n  fragColor = vec4(toSrgb(gamutMap(oklabToLinear(lab))), 1.0);\n}";
  const PAL = [[18, 18, 18], [38, 47, 0], [166, 201, 0], [213, 254, 0]].map((c) => c.map((v) => v / 255)).flat();
  const seed = (e) => { const f = new Float32Array(3), u = new Uint32Array(f.buffer); f[0] = e; f[1] = 1.5 * e + 7.31; f[2] = 2.7 * e + 13.37;
    const s = Array.from(u), m = (a, b) => Math.imul(a, b) >>> 0, r = () => { s[0] = s[0] + m(s[1], s[2]) >>> 0; s[1] = s[1] + m(s[2], s[0]) >>> 0; s[2] = s[2] + m(s[0], s[1]) >>> 0; };
    for (let i = 0; i < 3; i++) s[i] = m(s[i], 1664525) + 0x3c6ef35f >>> 0; r(); for (let i = 0; i < 3; i++) s[i] = (s[i] ^ s[i] >>> 16) >>> 0; r(); return s.map((v) => v / 0xffffffff); };
  document.querySelectorAll('.btn-lime').forEach((btn) => {
    if (btn.querySelector('.btn-shader')) return;
    btn.querySelector('.glow')?.remove();
    const cv = document.createElement('canvas'); cv.className = 'btn-shader'; cv.setAttribute('aria-hidden', 'true');
    const glow = document.createElement('span'); glow.className = 'btn-shader-glow'; glow.setAttribute('aria-hidden', 'true');
    btn.prepend(cv, glow);
    let g, raf = 0, shown = false; const t0 = performance.now(), off = 100 * Math.random();
    const init = () => {
      const gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' }); if (!gl) return null;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(p, 'a_pos'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3fv(gl.getUniformLocation(p, 'u_colors'), PAL); gl.uniform3fv(gl.getUniformLocation(p, 'u_seed1'), seed(32)); gl.uniform3fv(gl.getUniformLocation(p, 'u_seed2'), seed(132));
      cv.dataset.ready = '';
      return { gl, time: gl.getUniformLocation(p, 'u_time'), res: gl.getUniformLocation(p, 'u_resolution'), pr: gl.getUniformLocation(p, 'u_pixelRatio') };
    };
    const draw = (now) => { const { gl } = g, d = Math.min(devicePixelRatio || 1, 2), w = Math.max(1, Math.round(cv.clientWidth * d)), h = Math.max(1, Math.round(cv.clientHeight * d));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(g.res, w, h); gl.uniform1f(g.pr, d); gl.uniform1f(g.time, off + (now - t0) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const frame = (now) => { draw(now); raf = requestAnimationFrame(frame); };
    const sync = () => { const go = shown && !document.hidden; if (go && g === undefined) g = init(); cancelAnimationFrame(raf); raf = 0;
      if (go && g) reduced ? draw(performance.now()) : (raf = requestAnimationFrame(frame)); };
    visible(cv, (on) => { shown = on; sync(); });
    document.addEventListener('visibilitychange', sync);
  });

  // ---------- 4. footer wordmark: WHITESTONE and LABS melt into each other through a threshold filter
  const mark = document.querySelector('footer .mix-blend-overlay');
  if (mark && !reduced) {
    const pair = [...mark.querySelectorAll(':scope > div > div')].slice(0, 2);
    if (pair.length === 2) {
      let cur = 0, prog = 0, hold = 0.5, last = 0, raf = 0;
      const rest = () => { const [a, b] = [pair[cur], pair[1 - cur]]; a.style.filter = 'none'; a.style.opacity = '1'; b.style.filter = 'none'; b.style.opacity = '0'; };
      const tick = (t) => {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(Math.max(t - last, 0) / 1000, 0.1); last = t;
        if (hold > 0) { if ((hold -= dt) <= 0) prog = 0; return; }
        const k = (prog += dt) / 1.5;
        if (k >= 1) { cur = 1 - cur; hold = 0.5; rest(); return; }
        const [a, b] = [pair[cur], pair[1 - cur]], i = 1 - k;
        a.style.filter = `blur(${Math.min(8 / i - 8, 16)}px)`; a.style.opacity = `${i ** 0.4 * 100}%`;
        b.style.filter = `blur(${Math.min(8 / k - 8, 16)}px)`; b.style.opacity = `${k ** 0.4 * 100}%`;
      };
      rest();
      visible(mark, (on) => { cancelAnimationFrame(raf); raf = 0; if (on) { last = performance.now(); raf = requestAnimationFrame(tick); } });
    }
  }

  // ---------- 5. dust rising off the top of the footer, pushed by the cursor and by scrolling
  const dust = document.querySelector('canvas[data-dust]');
  if (dust && !reduced) {
    const ctx = dust.getContext('2d'), H = touch ? 160 : 260;
    let W = 0, dpr = 1;
    const size = () => { W = dust.clientWidth; dpr = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2); dust.width = Math.round(W * dpr); dust.height = Math.round(H * dpr); };
    size();
    const ps = [], m = { x: -1e4, y: -1e4, vx: 0, vy: 0 };
    let acc = 0, vel = 0, lastY = scrollY, raf = 0, prev = 0, on = false;
    const spawn = (n, at) => { for (let i = 0; i < n && ps.length < (touch ? 220 : 700); i++) {
      const sq = Math.random() < 0.12, c = Math.random(), d = Math.random() < 0.45 ? 0.35 : Math.random() < 0.7 ? 0.7 : 1;
      ps.push({ x: at === undefined ? Math.random() * W : at + (Math.random() - 0.5) * 120, y: H - 3 * Math.random(),
        vx: (0.3 + 1.6 * Math.random()) * (0.5 + 0.5 * d), vy: -(0.6 + 1.8 * Math.random()) * (0.5 + 0.5 * d), life: 0.7 + 1.3 * Math.random(), age: 0,
        size: (sq ? 2 + 3 * Math.random() : 0.8 + 1.3 * Math.random()) * (0.55 + 0.45 * d),
        color: c < 0.05 ? 'rgba(213,254,0,0.95)' : `rgba(${18 + 60 * c},${18 + 60 * c},${18 + 60 * c},${(0.55 + 0.4 * (1 - c)) * (0.45 + 0.55 * d)})`,
        square: sq, depth: d, phase: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6, angle: Math.random() * Math.PI }); } };
    addEventListener('pointermove', (e) => { const r = dust.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (m.x > -1e3) { m.vx += (x - m.x - m.vx) * 0.5; m.vy += (y - m.y - m.vy) * 0.5; } m.x = x; m.y = y; }, { passive: true });
    const frame = (now) => {
      const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 1 / 60; prev = now;
      const y = scrollY; vel += (y - lastY - vel) * 0.2; lastY = y;
      const n = Math.floor(acc += dt * ((touch ? 24 : 60) + Math.abs(vel) * (touch ? 12 : 30))); acc -= n; spawn(n);
      if (m.y > H - 90 && m.y < H + 60 && !touch) spawn(+(Math.random() < dt * (20 + 6 * Math.hypot(m.vx, m.vy))), m.x);
      m.vx *= 0.9; m.vy *= 0.9;
      const s = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt; if (p.age >= p.life) { ps.splice(i, 1); continue; }
        const sway = 0.6 * Math.sin(2.1 * s + p.phase) + 0.3 * Math.sin(3.7 * s + 1.7 * p.phase);
        p.x += (p.vx + sway * p.depth) * dt * 60; p.y += (p.vy + 0.25 * Math.cos(1.6 * s + p.phase)) * dt * 60; p.vy *= 0.99;
        const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < 6400) { const f = (1 - d2 / 6400) * p.depth, d = Math.sqrt(d2) || 1; p.vx += (dx / d * 1.2 + 0.08 * m.vx) * f; p.vy += (dy / d * 1.2 + 0.08 * m.vy) * f; }
        p.vx *= 0.995; p.angle += p.spin * dt;
        const life = 1 - p.age / p.life; ctx.globalAlpha = life * life; ctx.fillStyle = p.color;
        if (p.square) { const c = Math.cos(p.angle), sn = Math.sin(p.angle); ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, p.x * dpr, p.y * dpr); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      raf = on ? requestAnimationFrame(frame) : 0;
    };
    visible(dust, (v) => { on = v; if (on && !raf) { prev = 0; lastY = scrollY; raf = requestAnimationFrame(frame); } });
    new ResizeObserver(size).observe(dust);
  }

  // ---------- 6. cal.com inline booker, loaded when the contact section is near
  const cal = document.querySelector('[data-cal]');
  if (cal) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      (function (C, A, L) { const p = (a, ar) => a.q.push(ar), d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal, ar = arguments;
        if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; }
        if (ar[0] === L) { const api = function () { p(api, arguments); }, ns = ar[1]; api.q = api.q || [];
          if (typeof ns === 'string') { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ['initNamespace', ns]); } else p(cal, ar); return; }
        p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      const NS = 'intro';
      Cal('init', NS, { origin: 'https://app.cal.com' });
      Cal.ns[NS]('inline', { elementOrSelector: cal, config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'light' }, calLink: cal.dataset.cal });
      Cal.ns[NS]('ui', { theme: 'light', cssVarsPerTheme: { light: { 'cal-brand': '#121212', 'cal-border-booker': 'transparent', 'cal-border-subtle': '#dadee2' } }, hideEventTypeDetails: false, layout: 'month_view' });
    }, { rootMargin: '800px 0px' });
    io.observe(cal);
  }
})();
