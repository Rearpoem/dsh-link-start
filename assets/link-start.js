// dsh-link-start overlay runtime. Injected as a classic body script before the DSH shell mounts.
// The Host replaces the settings placeholder below with a JSON object.
// Scene order and pacing follow the anime's connection sequence (about 18 s); every visual is drawn here.
// The checks, language, log-in and confirmation scenes show this DSH's own state (settings.dsh).
(() => {
  'use strict';
  const raw = "__LINK_START_SETTINGS__";
  const settings = raw && typeof raw === 'object' ? raw : { account: 'Player', welcome: 'Welcome to\nDeepSeek Harness !', everyReload: false };
  const PLAYED = 'dsh-link-start:played';
  try {
    if (!settings.everyReload && sessionStorage.getItem(PLAYED)) return;
    sessionStorage.setItem(PLAYED, '1');
  } catch { /* storage unavailable: play anyway */ }

  const doc = document;
  // motion: 'auto' follows the system's reduced-motion setting (Windows turns it on together with
  // "Animation effects: off"), 'full' always plays the dive, 'gentle' always plays the calm version.
  const motion = settings.motion === 'full' || settings.motion === 'gentle' ? settings.motion : 'auto';
  const calm = motion === 'gentle' || (motion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dsh = settings.dsh && typeof settings.dsh === 'object' ? settings.dsh : {};
  // The DSH language preference wins; without one DSH follows the browser, and so do we.
  const locale = String(dsh.locale || navigator.language || 'en');
  const lang = locale.toLowerCase();
  const NATIVE = { zh: '简体中文', 'zh-cn': '简体中文', 'zh-hans': '简体中文', 'zh-tw': '繁體中文', 'zh-hk': '繁體中文', 'zh-hant': '繁體中文', ja: '日本語', en: 'English', ko: '한국어' };
  // The language's own name, without region ("en-US" → English); Chinese keeps its script.
  function nativeName() {
    const base = lang.split('-')[0];
    const known = NATIVE[lang] || (base === 'zh' ? undefined : NATIVE[base]);
    if (known) return known;
    const tag = base === 'zh' ? locale : base;
    try {
      const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag);
      if (name && name.toLowerCase() !== tag.toLowerCase()) return name;
    } catch { /* unknown tag */ }
    return NATIVE[base] || locale;
  }
  const COPY = lang.startsWith('zh') ? {
    resume: { title: '工作区确认', message: ['检测到上次使用的工作区，', '是否继续？'] },
    saved: { title: '角色登录', message: ['检测到之前登录时保存的数据，', '是否继续使用？'] },
    skip: '点击或按任意键跳过',
  } : lang.startsWith('ja') ? {
    resume: { title: 'ワークスペース確認', message: ['前回のワークスペースが見つかりました。', '続きから再開しますか？'] },
    saved: { title: 'キャラクター登録', message: ['前回のログインで保存されたデータがあります。', 'このデータを使用しますか？'] },
    skip: 'クリックまたは任意のキーでスキップ',
  } : {
    resume: { title: 'Workspace', message: ['Your last workspace was found.', 'Continue where you left off?'] },
    saved: { title: 'Character Registration', message: ['Saved data from a previous session was found.', 'Do you want to use it?'] },
    skip: 'Click or press any key to skip',
  };
  const confirm = dsh.workspace ? COPY.resume : COPY.saved;

  function el(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---- HUD disc artwork (inline SVG, seeded so every launch looks the same) ----------------
  let seed = 20221106;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const PALETTES = {
    cyan: { fill: '#4fc6f0', edge: '#159fdc', a: '#a08cf0', b: '#a9b89b', c: '#36c4f0', core: '#0fa4df', dot: '#0b86c9' },
    violet: { fill: 'rgba(222,230,255,.6)', edge: '#3ab0ec', a: '#b494f2', b: '#f0a8ee', c: '#7fd0f6', core: '#1497df', dot: '#7aa7e6' },
    green: { fill: 'rgba(70,225,95,.88)', edge: '#14b830', a: '#2fd84c', b: '#b5f5bd', c: '#1fc845', core: '#12b534', dot: '#0f9e2b' },
  };
  function ring(r, width, color, opacity = 1) {
    const dashes = [];
    let left = 100;
    while (left > 0) {
      const on = Math.min(left, 4 + rnd() * 22);
      const off = Math.max(0, Math.min(left - on, 2 + rnd() * 9));
      dashes.push(on.toFixed(1), off.toFixed(1));
      left -= on + off;
    }
    return `<circle r="${r}" fill="none" stroke="${color}" stroke-width="${width}" pathLength="100" stroke-dasharray="${dashes.join(' ')}"`
      + ` opacity="${opacity}" transform="rotate(${Math.round(rnd() * 360)})"/>`;
  }
  function hud(name, core) {
    const p = PALETTES[name];
    let s = '<svg viewBox="-100 -100 200 200" aria-hidden="true">'
      + `<circle r="98" fill="${p.fill}"/><circle r="99" fill="none" stroke="${p.edge}" stroke-width="2.2"/>` + ring(93, 4, p.edge)
      + `<g class="spin">${ring(84, 10, p.a, 0.9)}${ring(73, 7, p.b, 0.85)}</g>`
      + `<g class="spin rev">${ring(64, 4, p.c)}</g>`
      + '<circle r="56" fill="none" stroke="#fff" stroke-width="1.4" opacity=".75"/>';
    for (let i = 0; i < 8; i++) {
      const angle = rnd() * Math.PI * 2, radius = 60 + rnd() * 30;
      s += `<circle cx="${(Math.cos(angle) * radius).toFixed(1)}" cy="${(Math.sin(angle) * radius).toFixed(1)}" r="1.9" fill="${p.dot}"/>`;
    }
    s += `<circle r="44" fill="${p.core}" stroke="${p.edge}" stroke-width="3"/>`;
    if (core === 'bar') s += '<circle r="31" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/><rect x="-19" y="-6" width="38" height="12" rx="2" fill="#fff"/>';
    return s + '</svg>';
  }
  function icon(className, layers, dots) {
    const node = el('div', `sao-icon ${className}`);
    node.innerHTML = layers;
    if (dots) { const d = el('div', 'sao-dots'); d.innerHTML = '<i></i><i></i><i></i>'; node.append(d); }
    return node;
  }

  // ---- DOM -------------------------------------------------------------------------------
  const root = el('div', calm ? 'sao-calm' : '');
  root.id = 'sao-ls';
  root.setAttribute('aria-hidden', 'true');
  root.dataset.scene = 'open';
  const layer = name => el('div', `sao-layer sao-${name}`);

  const room = layer('room');
  const gray = layer('gray');
  const canvas = doc.createElement('canvas');

  const open = layer('open');
  open.append(el('span', '', 'Link Start!'));

  const hudLayer = layer('hud');
  const seedWrap = el('div', 'sao-seedwrap');
  const seedIcon = icon('sao-seed', hud('violet', 'bar'), true);
  seedWrap.append(seedIcon);
  // The original checks the five senses; DSH checks the five things a session needs.
  const CHECKS = [
    ['Host', -0.9, dsh.profile],
    ['Plugins', 0.45, dsh.plugins],
    ['Model', 2.5, dsh.model],
    ['Workspaces', -2.35, dsh.workspaces],
    ['Sessions', 1.45, dsh.sessions],
  ];
  const discs = CHECKS.map(([label, angle]) => {
    const disc = icon('sao-disc', hud('cyan'), false);
    disc.append(el('div', 'sao-chip tag', label), el('div', 'sao-chip ok', 'OK'));
    return { disc, angle };
  });
  hudLayer.append(seedWrap, ...discs.map(d => d.disc));

  const stack = layer('stack');
  const column = el('div', 'sao-column');
  const minis = CHECKS.map(([label, , value], i) => {
    const mini = icon('sao-mini', `<div class="violet">${hud('violet', 'bar')}</div><div class="green">${hud('green', 'bar')}</div>`, true);
    for (const part of mini.querySelectorAll('.violet,.green')) part.style.cssText = 'position:absolute;inset:0';
    const cap = el('div', 'sao-cap');
    cap.append(el('b', '', label));
    if (value !== undefined && value !== null && value !== '') cap.append(el('span', '', String(value)));
    mini.append(cap);
    mini.style.setProperty('--i', String(i));
    column.append(mini);
    return mini;
  });
  stack.append(column);

  const langLayer = layer('lang');
  const langRow = el('div', 'sao-langrow');
  const langVal = el('div', 'sao-pill sao-langval');
  langVal.append(el('i', 'sao-tri'), nativeName());
  langRow.append(el('div', 'sao-pill sao-langkey', 'Language'), langVal);
  langLayer.append(langRow);

  const loginLayer = layer('login');
  const loginBox = el('div', 'sao-panel sao-loginbox');
  const fields = el('div', 'sao-fields');
  const account = el('div', 'sao-input');
  const apiKey = el('div', 'sao-input');
  fields.append(el('span', '', ':account'), account, el('span', '', ':api key'), apiKey);
  loginBox.append(el('h2', '', 'Log in_::'), fields);
  loginLayer.append(loginBox);

  const regLayer = layer('register');
  const regWrap = el('div', 'sao-regwrap');
  const regBody = el('div', 'sao-panel sao-regbody');
  const message = el('p');
  confirm.message.forEach((line, i) => { if (i) message.append(el('br')); message.append(line); });
  const choices = el('div', 'sao-choices');
  const yes = el('div', 'sao-choice', 'YES');
  choices.append(yes, el('div', 'sao-choice', 'NO'));
  regBody.append(message, el('div', 'sao-name', dsh.workspace || settings.account), choices);
  regWrap.append(el('div', 'sao-regtitle', confirm.title), regBody);
  regLayer.append(regWrap);

  const welcome = layer('welcome');
  const words = el('p');
  for (const line of String(settings.welcome).split('\n')) words.append(el('span', '', line));
  welcome.append(words);

  const white = layer('white');
  const skip = el('div', 'sao-skip', COPY.skip);
  root.append(room, gray, canvas, hudLayer, stack, langLayer, loginLayer, regLayer, welcome, open, white, skip);
  (doc.body || doc.documentElement).append(root);

  // ---- Timeline ----------------------------------------------------------------------------
  // Scenes run on a stall-proof clock. It follows real time but moves at most CAP ms per tick, so
  // when the DSH shell's boot blocks the main thread for seconds on a slow machine, the sequence
  // pauses there instead of jumping straight to whichever scene is due when the thread comes back.
  const CAP = 100;
  const born = performance.now();
  const queue = [];
  let clock = 0, wall = born, ticker = 0, finished = false, beat = 0;
  const later = (ms, fn) => { queue.push({ at: clock + ms, fn }); queue.sort((a, b) => a.at - b.at); };
  function tick() {
    const now = performance.now();
    clock += Math.min(now - wall, CAP);
    wall = now;
    while (!finished && queue.length && queue[0].at <= clock) {
      const { fn } = queue.shift();
      try { fn(); } catch (error) { console.error('[dsh-link-start]', error); }
    }
    // A paused sequence can outlast the CSS failsafe; keep it 26 s past the last tick, so it
    // still fires if this runtime ever stops ticking.
    const second = Math.floor((now - born) / 1000);
    if (second !== beat) { beat = second; root.style.animationDelay = `${second + 26}s`; }
    if (!finished) ticker = setTimeout(tick, 16);
  }
  const scene = name => { if (!finished) root.dataset.scene = name; };
  const fx = calm ? null : createFx(canvas, settings.quality);

  function type(target, text, step, done) {
    let index = 0;
    const tick = () => {
      if (finished) return;
      target.textContent = text.slice(0, ++index);
      if (index < text.length) later(step, tick); else done?.();
    };
    later(step, tick);
  }

  function shellMounted() {
    const shell = doc.getElementById('root');
    return !!shell && shell.childElementCount > 0;
  }

  // Hold the last frame until the shell has rendered something, at most four more seconds.
  function leaveWhenReady(waited = 0) {
    if (shellMounted() || waited >= 4000) finish();
    else later(120, () => leaveWhenReady(waited + 120));
  }

  // Hold "Link Start!" until the shell has started rendering (at most 5 s of unblocked time), so
  // the heavy scenes don't compete with its boot for the main thread.
  function whenShellStarts(go, waited = 0) {
    if (shellMounted() || waited >= 5000) go();
    else later(100, () => whenShellStarts(go, waited + 100));
  }

  function finish() {
    if (finished) return;
    finished = true;
    root.classList.add('sao-out');
    clearTimeout(ticker);
    queue.length = 0;
    removeEventListener('keydown', onKey, true);
    root.removeEventListener('pointerdown', onPointer);
    setTimeout(() => { fx?.stop(); root.remove(); }, 750);
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return; // leave app shortcuts (quit, reload…) alone
    // Once the CSS failsafe has hidden the overlay, let the key through to the app.
    if (getComputedStyle(root).visibility !== 'hidden') { event.preventDefault(); event.stopPropagation(); }
    finish();
  }
  function onPointer(event) { event.preventDefault(); finish(); }
  addEventListener('keydown', onKey, true);
  root.addEventListener('pointerdown', onPointer);

  // The camera flies past five big discs; each turns its label into OK on the way.
  function flyDiscs() {
    seedIcon.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(2.6)', opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'forwards' });
    discs.forEach(({ disc, angle }, i) => later(i * 330, () => {
      const [x0, y0, x1, y1] = [Math.cos(angle) * 6, Math.sin(angle) * 6, Math.cos(angle) * 95, Math.sin(angle) * 95];
      disc.classList.add('go');
      disc.animate([
        { transform: `translate(${x0}vmin, ${y0}vmin) scale(.18) rotate(-8deg)`, opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: `translate(${x1}vmin, ${y1}vmin) scale(2.7) rotate(22deg)`, opacity: 1 },
      ], { duration: 1500, easing: 'cubic-bezier(.5,0,.85,.55)', fill: 'forwards' });
    }));
  }

  function scatterMinis() {
    minis.forEach((mini, i) => mini.animate([
      { transform: 'none', opacity: 1 },
      { opacity: 1, offset: 0.65 },
      { transform: `translate(${-(16 + rnd() * 42)}vw, ${(rnd() - 0.5) * 44}vh) scale(1.15)`, opacity: 0 },
    ], { duration: 520, delay: i * 40, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }));
  }

  const accountName = String(settings.account);
  // [ms, step, motion-only]. The calm version keeps every scene that shows this DSH's state and
  // drops what flies, spins or flashes: the colour burst, the discs, the scatter and the blue dive.
  const end = calm ? 15600 : 18000;
  const TIMELINE = [
    [800, () => { scene('rays'); fx.rays(); }, true],
    [4000, () => { fx.stop(); scene('hud'); }, true],
    [4650, flyDiscs, true],
    [7000, () => scene('stack')],
    [7700, () => minis.forEach(mini => mini.classList.add('ok'))],
    [8000, scatterMinis, true],
    [8500, () => scene('lang')],
    [9800, () => {
      scene('login');
      later(250, () => type(account, accountName, Math.min(65, 520 / accountName.length), () => later(120, () => type(apiKey, `sk-${'*'.repeat(12)}`, 45))));
    }],
    [11350, () => scene('register')],
    [12000, () => yes.classList.add('on')],
    [12800, () => scene('gray')],
    [13300, () => scene('welcome')],
    [15600, () => { scene('blue'); fx.blue(); }, true],
    [end, () => { fx?.stop(); scene('white'); }],
    [end + 250, () => leaveWhenReady()],
  ];
  const first = calm ? 7000 : 800;
  later(calm ? 1400 : 800, () => whenShellStarts(() => {
    for (const [ms, step, motionOnly] of TIMELINE) if (!(calm && motionOnly)) later(ms - first, step);
  }));
  tick();

  // ---- Canvas effects: the colour burst on white, and the blue dive at the end -------------
  // quality: 'high' and 'low' pin a level; 'auto' starts each effect high and steps down as soon as
  // frames run slow (a weak GPU, or no GPU and the canvas drawn in software).
  function createFx(target, quality) {
    const g = target.getContext('2d');
    if (!g) return { rays() {}, blue() {}, stop() {} };
    // 2: full resolution, bloom and grain. 1: one canvas pixel per CSS pixel, no bloom or grain.
    // 0: half resolution and about half the particles.
    let level = quality === 'low' ? 0 : 2;
    const pinned = quality === 'high' || quality === 'low';
    const scaleAt = l => (l === 0 ? 0.5 : Math.min(devicePixelRatio || 1, l === 1 ? 1 : 2));
    const TAU = Math.PI * 2;
    const pick = list => list[(Math.random() * list.length) | 0];
    const between = (lo, hi) => lo + Math.random() * (hi - lo);
    const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
    const smooth = x => { const k = clamp01(x); return k * k * (3 - 2 * k); };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const RAY_COLORS = ['#d81ed8', '#d81ed8', '#d81ed8', '#19c6d6', '#19c6d6', '#d2d228', '#d2d228', '#1cc41c', '#1cc41c', '#d42020', '#151515', '#151515', '#707070', '#707070'];
    const resetRay = (r, z) => Object.assign(r, { a: Math.random() * TAU, w: 0.03 + Math.random() * 0.065, z, len: 1.2 + Math.random() * 3.2, v: 0.75 + Math.random() * 0.5, c: pick(RAY_COLORS) });
    const rays = Array.from({ length: 170 }, () => resetRay({}, 5 + Math.random() * 5));
    let width = 0, height = 0, raf = 0, mode = '', elapsed = 0, last = 0, slow = 0;

    // Bloom: a small blurred copy of each blue frame, screened back on top, softens every edge.
    const bloom = doc.createElement('canvas');
    const b = bloom.getContext('2d');
    let grain = null;

    function resize() {
      const ratio = scaleAt(level);
      width = innerWidth; height = innerHeight;
      target.width = Math.round(width * ratio); target.height = Math.round(height * ratio);
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      bloom.width = Math.max(1, Math.ceil(width / 6)); bloom.height = Math.max(1, Math.ceil(height / 6));
    }

    // Film grain tile, laid over the blue at a random offset each frame.
    function makeGrain() {
      const tile = doc.createElement('canvas');
      tile.width = tile.height = 128;
      const t = tile.getContext('2d');
      if (!t) return null;
      const image = t.createImageData(128, 128);
      for (let i = 0; i < image.data.length; i += 4) {
        image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.random() < 0.5 ? 0 : 255;
        image.data[i + 3] = (Math.random() * 255) | 0;
      }
      t.putImageData(image, 0, 0);
      return g.createPattern(tile, 'repeat');
    }

    // Thick paint-like wedges with rounded heads, opaque, on the white room.
    function drawRays(t, dt) {
      g.clearRect(0, 0, width, height);
      const cx = width / 2, cy = height / 2, reach = Math.hypot(width, height) / 2, focal = reach * 0.2;
      if (t < 0.75) {
        g.lineWidth = 1.6;
        const radius = 4 + t * 7;
        ['#8796ab', '#c3ccd8', '#a7b3c4'].forEach((color, k) => {
          g.strokeStyle = color; g.beginPath(); g.arc(cx, cy, radius, t * 9 + k * 2.1, t * 9 + k * 2.1 + 1.3); g.stroke();
        });
      }
      const u = t - 0.55;
      if (u <= 0) return;
      const active = Math.min(rays.length, 6 + Math.floor(u * 110));
      const speed = Math.min(30, 1.6 + 12 * u * u);
      for (let i = 0; i < active; i++) {
        const r = rays[i];
        r.z -= speed * r.v * dt;
        if (r.z + r.len <= 0.12) { resetRay(r, 4 + Math.random() * 5); continue; }
        const head = focal / Math.max(r.z, 0.12), tail = focal / (r.z + r.len);
        if (tail > reach * 1.2) continue;
        const a = r.a, hx = cx + Math.cos(a) * head, hy = cy + Math.sin(a) * head;
        const cap = head * Math.sin(r.w), narrow = r.w * 0.12, side = Math.PI / 2;
        g.fillStyle = r.c;
        g.beginPath();
        g.moveTo(cx + Math.cos(a - narrow) * tail, cy + Math.sin(a - narrow) * tail);
        g.lineTo(hx + Math.cos(a - side) * cap, hy + Math.sin(a - side) * cap);
        g.arc(hx, hy, cap, a - side, a + side);
        g.lineTo(cx + Math.cos(a + narrow) * tail, cy + Math.sin(a + narrow) * tail);
        g.closePath();
        g.fill();
      }
    }

    // ---- Blue dive ----
    // Order of events (seconds): a spiky star and blue blades shoot out over the grey room (0–0.9),
    // blue floods out from the centre (0.4–0.8), a glowing ray field with speed lines, sparks and
    // shock rings runs at full strength, then it bleaches to lavender-white (1.55–2.1) and white (2.0–2.3).
    const DEEP = [14, 36, 178], ROYAL = [28, 66, 226], MID = [42, 128, 246], CYAN = [64, 206, 255], ICE = [196, 240, 255], WHITE = [255, 255, 255];
    const DARK = new Set([DEEP, ROYAL]);
    const resetDash = (d, s = 0) => Object.assign(d, { a: Math.random() * TAU, s, len: between(0.08, 0.3), v: between(0.5, 1.2), half: between(0.6, 2.2), c: pick([ICE, ICE, WHITE, CYAN]) });
    const resetMote = (m, s = 0) => Object.assign(m, { a: Math.random() * TAU, s, v: between(0.25, 0.8), size: between(0.8, 2.4), c: pick([WHITE, ICE, CYAN]) });
    let field = null;
    function initField() {
      const n = count => (level === 0 ? Math.ceil(count * 0.55) : count);
      return {
        spikes: Array.from({ length: n(40) },() => ({ a: Math.random() * TAU, t0: between(0.08, 0.6), v: between(0.9, 1.6), len: between(0.2, 0.45), half: between(0.02, 0.06), c: pick([DEEP, DEEP, ROYAL, MID, CYAN, CYAN, ICE]) })),
        fan: Array.from({ length: n(64) },() => ({ a: Math.random() * TAU, w: between(0.012, 0.075), drift: between(-0.05, 0.05), alpha: between(0.35, 0.9), phase: Math.random() * TAU, c: pick([DEEP, DEEP, ROYAL, ROYAL, MID, CYAN, CYAN, CYAN, ICE, WHITE]) })),
        dashes: Array.from({ length: n(80) }, () => resetDash({}, Math.random() * 0.9)),
        motes: Array.from({ length: n(55) }, () => resetMote({}, Math.random() * 0.9)),
        sparks: [],
      };
    }

    // A blade along angle a from radius r0 to r1, widest at `peak`; both ends fade like motion blur.
    function blade(cx, cy, a, r0, r1, half, peak, color, alpha) {
      if (r1 <= r0 || alpha <= 0.003) return;
      const ux = Math.cos(a), uy = Math.sin(a), rm = r0 + (r1 - r0) * peak;
      const fill = g.createLinearGradient(cx + ux * r0, cy + uy * r0, cx + ux * r1, cy + uy * r1);
      fill.addColorStop(0, rgba(color, 0));
      fill.addColorStop(peak * 0.7, rgba(color, alpha));
      fill.addColorStop(peak + (1 - peak) * 0.5, rgba(color, alpha * 0.85));
      fill.addColorStop(1, rgba(color, 0));
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(cx + ux * r0, cy + uy * r0);
      g.lineTo(cx + ux * rm - uy * half, cy + uy * rm + ux * half);
      g.lineTo(cx + ux * r1, cy + uy * r1);
      g.lineTo(cx + ux * rm + uy * half, cy + uy * rm - ux * half);
      g.closePath();
      g.fill();
    }

    // A long ray from the centre past the screen edge; the fill style carries its radial fade.
    function ray(cx, cy, a, w, r0, r1) {
      g.beginPath();
      g.moveTo(cx + Math.cos(a - w * 0.1) * r0, cy + Math.sin(a - w * 0.1) * r0);
      g.lineTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1);
      g.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1);
      g.lineTo(cx + Math.cos(a + w * 0.1) * r0, cy + Math.sin(a + w * 0.1) * r0);
      g.closePath();
      g.fill();
    }

    function makeSpark(reach) {
      const a = Math.random() * TAU, r = between(0.12, 0.7) * reach;
      let x = Math.cos(a) * r, y = Math.sin(a) * r, dir = a + Math.PI / 2 + between(-0.8, 0.8);
      const points = [[x, y]];
      for (let i = 0; i < 7; i++) {
        dir += between(-1.1, 1.1);
        const step = between(5, 14);
        x += Math.cos(dir) * step; y += Math.sin(dir) * step;
        points.push([x, y]);
      }
      return { points, life: between(0.06, 0.13) };
    }

    function drawBlue(t, dt) {
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.clearRect(0, 0, width, height);
      const cx = width / 2, cy = height / 2, reach = Math.hypot(width, height) / 2;
      const spin = t * 0.07;
      const flood = smooth((t - 0.38) / 0.42);
      const ramp = smooth((t - 0.5) / 0.35);

      if (flood > 0) {
        const sea = g.createRadialGradient(cx, cy, 0, cx, cy, reach * (0.05 + 1.3 * flood));
        sea.addColorStop(0, rgba([84, 168, 255], 1));
        sea.addColorStop(0.3, rgba(MID, 1));
        sea.addColorStop(0.62, rgba(ROYAL, 1));
        sea.addColorStop(0.86, rgba(DEEP, 1));
        sea.addColorStop(1, rgba(DEEP, 0));
        g.fillStyle = sea;
        g.fillRect(0, 0, width, height);
      }

      const r0 = reach * 0.02, r1 = reach * 1.25;
      const shades = new Map();
      const shade = c => {
        if (!shades.has(c)) {
          const s = g.createRadialGradient(cx, cy, 0, cx, cy, r1);
          s.addColorStop(0, rgba(c, 0)); s.addColorStop(0.07, rgba(c, 0)); s.addColorStop(0.2, rgba(c, 1));
          s.addColorStop(0.8, rgba(c, 0.9)); s.addColorStop(1, rgba(c, 0.55));
          shades.set(c, s);
        }
        return shades.get(c);
      };
      const fanPass = dark => {
        if (ramp <= 0) return;
        for (const f of field.fan) {
          if (DARK.has(f.c) !== dark) continue;
          const a = f.a + spin + f.drift * t, flicker = 0.75 + 0.25 * Math.sin(t * 23 + f.phase);
          g.fillStyle = shade(f.c);
          g.globalAlpha = f.alpha * flicker * ramp * 0.3;
          ray(cx, cy, a, f.w * 2.4, r0, r1);
          g.globalAlpha = f.alpha * flicker * ramp;
          ray(cx, cy, a, f.w, r0, r1);
        }
        g.globalAlpha = 1;
      };

      fanPass(true);

      for (const s of field.spikes) {
        const age = t - s.t0;
        if (age <= 0) continue;
        const head = Math.pow(age * s.v, 1.5) * reach * 1.6 + reach * 0.03;
        const tail = Math.max(reach * 0.015, head - s.len * reach * (0.6 + head / reach));
        if (tail > reach * 1.25) continue;
        blade(cx, cy, s.a + spin, tail, head, s.half * head + 2, 0.62, s.c, 0.95);
      }

      g.globalCompositeOperation = 'screen';
      fanPass(false);

      for (const d of field.dashes) {
        d.s += d.v * (0.35 + d.s * 2.4) * dt;
        if (d.s > 1.3) resetDash(d);
        const from = d.s * reach;
        blade(cx, cy, d.a + spin, from, from + d.len * reach * (0.25 + d.s * 1.5), d.half * (1 + d.s * 3), 0.7, d.c, 0.85 * ramp);
      }

      for (const at of [0.62, 0.98, 1.36]) {
        const age = t - at;
        if (age <= 0 || age > 0.75) continue;
        const k = age / 0.75;
        g.strokeStyle = rgba(ICE, 0.16 * (1 - k) * ramp);
        g.lineWidth = 14 + 60 * k;
        g.beginPath();
        g.arc(cx, cy, reach * (0.06 + 1.05 * (1 - Math.pow(1 - k, 2.2))), 0, TAU);
        g.stroke();
      }

      const star = clamp01(t / 0.25) * (1 - smooth((t - 0.55) / 0.3));
      g.globalCompositeOperation = 'lighter';
      if (star > 0) {
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12 + t * 1.8 + (i % 2) * 0.13;
          const len = (i % 2 ? 10 : 22 + 26 * t) * (0.6 + 0.4 * Math.sin(t * 30 + i)) * (1 + t * 2);
          blade(cx, cy, a, 0, len, 1.4 + t * 2.5, 0.25, i % 3 ? CYAN : WHITE, star);
        }
      }

      for (const m of field.motes) {
        m.s += m.v * (0.3 + m.s * 2) * dt;
        if (m.s > 1.2) resetMote(m);
        const r = m.s * reach, a = m.a + spin, size = m.size * (0.5 + m.s * 1.6);
        const fade = ramp * clamp01(m.s * 6);
        blade(cx, cy, a, Math.max(0, r - size * 9), r, size * 0.7, 0.85, m.c, 0.5 * fade);
        g.globalAlpha = fade;
        g.fillStyle = rgba(m.c, 0.9);
        g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }

      if (ramp > 0.5 && Math.random() < dt * 9) field.sparks.push(makeSpark(reach));
      field.sparks = field.sparks.filter(sp => (sp.life -= dt) > 0);
      g.lineJoin = 'round';
      for (const sp of field.sparks) {
        for (const [lineWidth, color, alpha] of [[3.2, CYAN, 0.35], [1.1, WHITE, 0.95]]) {
          g.lineWidth = lineWidth;
          g.strokeStyle = rgba(color, alpha * ramp);
          g.beginPath();
          sp.points.forEach(([x, y], i) => (i ? g.lineTo(cx + x, cy + y) : g.moveTo(cx + x, cy + y)));
          g.stroke();
        }
      }

      const pulse = 1 + 0.05 * Math.sin(t * 37) + 0.03 * Math.sin(t * 59);
      const heat = clamp01(t / 0.5);
      g.globalCompositeOperation = 'screen';
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, reach * 0.6 * pulse);
      halo.addColorStop(0, rgba(WHITE, 0.9 * heat));
      halo.addColorStop(0.05, rgba(WHITE, 0.55 * heat));
      halo.addColorStop(0.14, rgba(ICE, 0.38 * heat));
      halo.addColorStop(0.35, rgba(CYAN, 0.16 * heat * ramp));
      halo.addColorStop(1, rgba(CYAN, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, width, height);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const a = i * TAU / 18 + Math.sin(i * 7.3) * 0.2 - spin * 2;
        const len = reach * heat * (0.06 + 0.16 * (0.5 + 0.5 * Math.sin(t * 19 + i * 2.4))) * (i % 3 ? 0.7 : 1.4);
        blade(cx, cy, a, 0, len, 1.2 + len * 0.025, 0.2, i % 2 ? WHITE : ICE, 0.75 * heat);
      }
      const hot = g.createRadialGradient(cx, cy, 0, cx, cy, reach * (0.012 + 0.03 * heat) * pulse);
      hot.addColorStop(0, rgba(WHITE, 0.95));
      hot.addColorStop(0.5, rgba(WHITE, 0.45));
      hot.addColorStop(1, rgba(WHITE, 0));
      g.fillStyle = hot;
      g.fillRect(0, 0, width, height);

      // Bleach toward lavender-white; the bright rays still show through.
      const pale = smooth((t - 1.55) / 0.55);
      if (pale > 0) {
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = rgba([232, 236, 255], pale * 0.78);
        g.fillRect(0, 0, width, height);
      }

      if (b && level === 2) {
        b.clearRect(0, 0, bloom.width, bloom.height);
        b.filter = 'blur(2px)';
        b.drawImage(target, 0, 0, bloom.width, bloom.height);
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'screen';
        g.globalAlpha = 0.5;
        g.drawImage(bloom, 0, 0, target.width, target.height);
        g.restore();
      }

      const out = smooth((t - 2.0) / 0.32);
      if (out > 0) {
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = rgba(WHITE, out);
        g.fillRect(0, 0, width, height);
      }

      if (grain && level === 2) {
        g.save();
        g.globalCompositeOperation = 'source-atop';
        g.globalAlpha = 0.07 * (1 - out) * clamp01(t / 0.4);
        g.translate(-Math.random() * 128, -Math.random() * 128);
        g.fillStyle = grain;
        g.fillRect(0, 0, width + 128, height + 128);
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';
    }

    function frame(now) {
      const gap = last ? now - last : 0;
      last = now;
      // A stall longer than the timeline's CAP pauses the effect too, so it stays in step with the scenes.
      elapsed += Math.min(gap, CAP) / 1000;
      if (width && height) (mode === 'rays' ? drawRays : drawBlue)(elapsed, Math.min(0.05, gap / 1000));
      else resize(); // the window had no size yet
      // Software rendering shows up as one very slow frame: go straight to the lowest level.
      // Otherwise two slow frames in a row drop one level; a single hitch (GC, the shell) does not.
      slow = gap > 45 ? slow + 1 : 0;
      const drop = gap > 120 ? level : slow >= 2 ? 1 : 0;
      if (!pinned && drop && level > 0) {
        level = Math.max(0, level - drop); slow = 0; resize();
        if (level === 0 && field) for (const key of ['spikes', 'fan', 'dashes', 'motes']) field[key].length = Math.ceil(field[key].length * 0.55);
      }
      raf = requestAnimationFrame(frame);
    }
    function run(next) {
      cancelAnimationFrame(raf);
      mode = next; elapsed = 0; last = 0; slow = 0;
      if (!pinned) level = 2; // each effect gets its own chance at full quality
      if (next === 'blue') { field = initField(); grain ??= makeGrain(); }
      resize();
      addEventListener('resize', resize);
      raf = requestAnimationFrame(frame);
    }
    return {
      rays: () => run('rays'),
      blue: () => run('blue'),
      stop() { cancelAnimationFrame(raf); raf = 0; removeEventListener('resize', resize); g.clearRect(0, 0, width, height); },
    };
  }
})();
