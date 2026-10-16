/* ============================================================
   NEXUS : Réveil — NOYAU
   RNG · maths · bus d'événements · entrées · boucle · stockage · DOM
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX = window.NX || {};
  NX.VERSION = '0.9.0';

  /* ---------------- RNG (déterministe, rejouable) ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  class RNG {
    constructor(seed) { this.seed = (seed >>> 0) || (Math.random() * 4294967296) >>> 0; this._f = mulberry32(this.seed); this.n = 0; }
    f() { this.n++; return this._f(); }
    int(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.floor(this.f() * (b - a + 1)); }
    range(a, b) { return a + this.f() * (b - a); }
    chance(p) { return this.f() < p; }
    pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
    pickN(arr, k) { const c = arr.slice(); const o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(this.f() * c.length), 1)[0]); return o; }
    weighted(list, wf) { let t = 0; for (const it of list) t += Math.max(0, wf(it)); if (t <= 0) return this.pick(list); let r = this.f() * t; for (const it of list) { r -= Math.max(0, wf(it)); if (r <= 0) return it; } return list[list.length - 1]; }
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    fork(tag) { return new RNG((Math.imul(this.seed ^ hashStr(String(tag)), 2654435761) >>> 0)); }
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  NX.RNG = RNG; NX.hashStr = hashStr;
  NX.rng = new RNG();               // RNG global (cosmétique / non critique)

  /* ---------------- Maths ---------------- */
  const TAU = Math.PI * 2;
  const M = {
    TAU,
    clamp: (v, a, b) => v < a ? a : v > b ? b : v,
    lerp: (a, b, t) => a + (b - a) * t,
    inv: (a, b, v) => b === a ? 0 : (v - a) / (b - a),
    dist2: (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    ang: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    approach: (a, b, dt) => a < b ? Math.min(a + dt, b) : Math.max(a - dt, b),
    deg: d => d * Math.PI / 180,
    rand: (a, b) => a + Math.random() * (b - a),
    // enveloppe douce 0→1→0
    pulse: (t, p) => Math.sin(M.clamp(t / p, 0, 1) * Math.PI),
    easeOut: t => 1 - Math.pow(1 - t, 3),
    easeIn: t => t * t * t,
    fmt: (n, dec) => n.toLocaleString('fr-FR', { maximumFractionDigits: dec == null ? 0 : dec }),
    // notation compacte : 1250 → 1,2 k
    short(n) { n = Math.round(n); if (Math.abs(n) < 1000) return '' + n; const u = ['k', 'M', 'G', 'T']; let i = -1; while (Math.abs(n) >= 1000 && i < u.length - 1) { n /= 1000; i++; } return n.toFixed(n < 10 ? 1 : 0).replace('.', ',') + u[i]; },
    clock(s) { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); },
    hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; },
    rgba(h, a) { const c = M.hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
    mix(h1, h2, t) { const a = M.hex2rgb(h1), b = M.hex2rgb(h2); return `rgb(${Math.round(M.lerp(a[0], b[0], t))},${Math.round(M.lerp(a[1], b[1], t))},${Math.round(M.lerp(a[2], b[2], t))})`; }
  };
  NX.M = M;

  /* ---------------- Bus d'événements ---------------- */
  const bus = {
    _m: new Map(),
    on(ev, fn) { (this._m.get(ev) || this._m.set(ev, []).get(ev)).push(fn); return () => this.off(ev, fn); },
    off(ev, fn) { const a = this._m.get(ev); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    emit(ev, data) { const a = this._m.get(ev); if (!a) return; for (let i = 0; i < a.length; i++) { try { a[i](data); } catch (e) { console.error('[bus]', ev, e); } } }
  };
  NX.bus = bus;

  /* ---------------- Stockage local (JSON) ---------------- */
  const store = {
    get(k, def) { try { const v = localStorage.getItem('nx.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('nx.' + k, JSON.stringify(v)); } catch (e) { /* quota */ } },
    del(k) { try { localStorage.removeItem('nx.' + k); } catch (e) { } },
    has(k) { try { return localStorage.getItem('nx.' + k) != null; } catch (e) { return false; } }
  };
  NX.store = store;

  /* ---------------- DOM helper  h('div',{class},...children) ---------------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else Object.assign(el.style, v); }
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = c => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  }
  NX.h = h;
  NX.clear = el => { while (el && el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------------- Entrées : ZQSD / QWASD / flèches, souris, rebinding ---------
     Astuce clavier : on indexe par e.code (indépendant de la disposition).
     Sur AZERTY la touche « Z » est physiquement KeyW → ZQSD et WASD partagent
     donc les mêmes codes. On accepte aussi e.key en secours.                */
  const DEF_BIND = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    dash: ['Space', 'ShiftLeft'], pause: ['Escape', 'KeyP'],
    a1: ['KeyE', 'Digit1'], a2: ['KeyR', 'Digit2'], a3: ['KeyF', 'Digit3'], a4: ['KeyG', 'Digit4'],
    map: ['Tab'], pause2: ['KeyP']
  };
  const input = {
    bind: store.get('binds', null) || JSON.parse(JSON.stringify(DEF_BIND)),
    down: new Set(), pressed: new Set(), released: new Set(),
    mouse: { x: 640, y: 360, wx: 0, wy: 0, down: false, right: false, inside: true },
    _capture: null,
    init(canvas) {
      this.canvas = canvas;
      addEventListener('keydown', e => {
        if (this._capture) { e.preventDefault(); this._capture(e.code); this._capture = null; return; }
        const c = e.code, k = (e.key || '').toLowerCase();
        if (!this.down.has(c) && !this.down.has(k)) this.pressed.add(c), this.pressed.add(k);
        this.down.add(c); this.down.add(k);
        // empêche le scroll / la sélection sur les touches de jeu
        if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
        bus.emit('key', { code: c, key: k, down: true, ev: e });
      });
      addEventListener('keyup', e => {
        const c = e.code, k = (e.key || '').toLowerCase();
        this.down.delete(c); this.down.delete(k); this.released.add(c); this.released.add(k);
        bus.emit('key', { code: c, key: k, down: false, ev: e });
      });
      addEventListener('blur', () => { this.down.clear(); });
      canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) * canvas.width / r.width; this.mouse.y = (e.clientY - r.top) * canvas.height / r.height; });
      canvas.addEventListener('mousedown', e => { if (e.button === 0) this.mouse.down = true; if (e.button === 2) this.mouse.right = true; e.preventDefault(); });
      addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; if (e.button === 2) this.mouse.right = false; });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      canvas.addEventListener('mouseenter', () => this.mouse.inside = true);
      canvas.addEventListener('mouseleave', () => this.mouse.inside = false);
    },
    isDown(act) { const b = this.bind[act]; if (!b) return false; for (const k of b) if (this.down.has(k) || this.down.has(k.toLowerCase())) return true; return false; },
    isPressed(act) { const b = this.bind[act]; if (!b) return false; for (const k of b) if (this.pressed.has(k) || this.pressed.has(k.toLowerCase())) return true; return false; },
    axis() { let x = 0, y = 0; if (this.isDown('left')) x--; if (this.isDown('right')) x++; if (this.isDown('up')) y--; if (this.isDown('down')) y++; if (x && y) { const n = Math.SQRT1_2; x *= n; y *= n; } return { x, y }; },
    capture(fn) { this._capture = fn; },
    keyName(code) { return String(code).replace('Key', '').replace('Arrow', '↟ ').replace('Digit', '').replace('ShiftLeft', 'Maj').replace('Space', 'Espace') || code; },
    rebind(act, code) {
      const cur = this.bind[act];
      if (!cur) return;
      if (cur.includes(code)) return;
      cur[0] = code;
      store.set('binds', this.bind);
      bus.emit('binds', this.bind);
    },
    resetBinds() { this.bind = JSON.parse(JSON.stringify(DEF_BIND)); store.set('binds', this.bind); bus.emit('binds', this.bind); },
    /* fin de frame : à appeler après update() */
    flush() { this.pressed.clear(); this.released.clear(); }
  };
  NX.input = input;

  /* ---------------- Boucle de jeu à pas fixe ---------------- */
  const loop = {
    running: false, acc: 0, step: 1 / 60, last: 0, t: 0, fps: 60, _f: 0, _ft: 0,
    start(update, render) {
      this.update = update; this.render = render; this.running = true; this.last = performance.now();
      const tick = now => {
        if (!this.running) return;
        requestAnimationFrame(tick);
        let dt = (now - this.last) / 1000; this.last = now;
        if (dt > 0.25) dt = 0.25;                 // anti « onglet en arrière-plan »
        this.t += dt;
        this.acc += dt;
        let steps = 0;
        while (this.acc >= this.step && steps < 5) { update(this.step); this.acc -= this.step; steps++; }
        if (steps === 5) this.acc = 0;
        // FPS lissé
        this._f++; this._ft += dt; if (this._ft >= 0.5) { this.fps = this._f / this._ft; this._f = 0; this._ft = 0; }
        render(dt);
        input.flush();
      };
      requestAnimationFrame(tick);
    },
    stop() { this.running = false; }
  };
  NX.loop = loop;

  /* ---------------- Toasts ---------------- */
  NX.toast = function (msg, kind) {
    const root = document.getElementById('toast'); if (!root) return;
    const el = h('div', { class: 'toast ' + (kind || '') }, msg);
    root.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2600);
  };

  /* ---------------- Utilitaires divers ---------------- */
  NX.uid = (() => { let i = 0; return (p) => (p || 'u') + (++i) + '-' + (Date.now() % 100000); })();
  NX.deep = o => JSON.parse(JSON.stringify(o));
  NX.now = () => Date.now();
  NX.days = ms => ms / 86400000;
})();
