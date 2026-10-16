/* Test de fumée « navigateur » : DOM simulé (Proxy) + boucle pilotée.
   Charge TOUS les scripts comme index.html, puis exerce chaque écran.
   Usage : node tools/test-dom.js                                          */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

/* ---------------- faux DOM ---------------- */
const errors = [];
let now = 0;
let timers = [], tid = 1;

function ctxStub(canvasEl) {
  const base = { canvas: canvasEl, fillStyle: '', strokeStyle: '', font: '', globalAlpha: 1, lineWidth: 1, lineCap: '', lineJoin: '', textAlign: '', textBaseline: '', shadowBlur: 0, shadowColor: '', globalCompositeOperation: '', filter: '', imageSmoothingEnabled: true };
  return new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createConicGradient') return () => ({ addColorStop() { } });
      if (p === 'measureText') return () => ({ width: 40 });
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (p === 'createPattern') return () => ({});
      if (typeof p === 'symbol') return undefined;
      return () => { };
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}

function makeEl(tag) {
  tag = (tag || 'div').toLowerCase();
  const el = {
    tagName: tag.toUpperCase(), nodeType: 1, id: '', children: [], style: {}, dataset: {},
    textContent: '', value: '', disabled: false, checked: false,
    width: 1280, height: 720, clientWidth: 1280, clientHeight: 720,
    offsetWidth: 1280, offsetHeight: 720, scrollTop: 0, scrollHeight: 720,
    parentNode: null, _cls: new Set(), _attrs: {}, _ev: {}, _html: ''
  };
  el.classList = {
    add: (...c) => c.forEach(x => x && el._cls.add(x)),
    remove: (...c) => c.forEach(x => el._cls.delete(x)),
    toggle: (c, f) => { const on = f === undefined ? !el._cls.has(c) : !!f; on ? el._cls.add(c) : el._cls.delete(c); return on; },
    contains: c => el._cls.has(c)
  };
  el.appendChild = c => { c.parentNode = el; el.children.push(c); return c; };
  el.removeChild = c => { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; };
  el.insertBefore = (c, ref) => { const i = el.children.indexOf(ref); i < 0 ? el.children.push(c) : el.children.splice(i, 0, c); c.parentNode = el; return c; };
  el.remove = () => { if (el.parentNode) el.parentNode.removeChild(el); };
  el.setAttribute = (k, v) => { el._attrs[k] = String(v); if (k === 'id') el.id = String(v); };
  el.getAttribute = k => (k in el._attrs ? el._attrs[k] : null);
  el.hasAttribute = k => (k in el._attrs);
  el.addEventListener = (t, f) => { (el._ev[t] = el._ev[t] || []).push(f); };
  el.removeEventListener = (t, f) => { if (el._ev[t]) el._ev[t] = el._ev[t].filter(x => x !== f); };
  el.dispatchEvent = ev => {
    const type = (ev && ev.type) || 'click';
    const fns = (el._ev[type] || []).slice();
    if (type === 'click' && typeof el.onclick === 'function') fns.push(el.onclick);
    fns.forEach(f => { try { f(ev || { type: 'click', preventDefault() { } }); } catch (e) { errors.push('event: ' + (e && e.stack || e)); } });
    return true;
  };
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720, x: 0, y: 0 });
  el.focus = () => { }; el.blur = () => { }; el.click = () => el.dispatchEvent({ type: 'click', preventDefault() { } });
  el.closest = () => null; el.contains = () => false; el.scrollIntoView = () => { };
  el.querySelector = sel => find(el, sel);
  el.querySelectorAll = sel => findAll(el, sel);
  el.getContext = () => (el._ctx = el._ctx || ctxStub(el));
  el.setPointerCapture = () => { }; el.releasePointerCapture = () => { };
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'lastChild', { get: () => el.children[el.children.length - 1] || null });
  Object.defineProperty(el, 'parentElement', { get: () => el.parentNode || null });
  Object.defineProperty(el, 'nextSibling', { get: () => null });
  Object.defineProperty(el, 'firstElementChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'innerHTML', { get: () => el._html, set: v => { el._html = String(v); if (el._html === '') el.children.length = 0; } });
  Object.defineProperty(el, 'className', { get: () => [...el._cls].join(' '), set: v => { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  return el;
}
function matches(el, tok) {
  if (!tok || !el || !el.tagName) return false;
  if (tok[0] === '.') return !!(el._cls && el._cls.has(tok.slice(1)));
  if (tok[0] === '#') return el.id === tok.slice(1);
  return el.tagName === tok.toUpperCase();
}
function walk(el, fn) { for (const c of el.children) { fn(c); walk(c, fn); } }
function find(root, sel) { const tok = String(sel).trim().split(/\s+/).pop(); let r = null; walk(root, c => { if (!r && matches(c, tok)) r = c; }); return r; }
function findAll(root, sel) { const tok = String(sel).trim().split(/\s+/).pop(); const out = []; walk(root, c => { if (matches(c, tok)) out.push(c); }); return out; }
function hasClick(root) { let r = null; walk(root, c => { if (!r && ((c._ev.click && c._ev.click.length) || typeof c.onclick === 'function')) r = c; }); return r; }

const registry = {};
const document = {
  readyState: 'complete', documentElement: makeEl('html'), body: makeEl('body'), head: makeEl('head'),
  getElementById: id => registry[id] || null,
  createElement: makeEl,
  createTextNode: t => { const e = makeEl('span'); e.tagName = '#TEXT'; e.nodeType = 3; e.textContent = String(t); return e; },
  addEventListener: (t, f) => { (document._ev = document._ev || {})[t] = ((document._ev || {})[t] || []).concat(f); },
  removeEventListener: (t, f) => { if (document._ev && document._ev[t]) document._ev[t] = document._ev[t].filter(x => x !== f); },
  dispatch: (t, ev) => ((document._ev || {})[t] || []).slice().forEach(f => f(ev)),
  querySelector: sel => find(document.body, sel),
  querySelectorAll: sel => findAll(document.body, sel)
};
['app', 'game', 'ui', 'hud', 'levelup', 'overlay', 'cine', 'toast', 'boot'].forEach(id => { const e = makeEl(id === 'game' ? 'canvas' : 'div'); e.id = id; registry[id] = e; document.body.appendChild(e); });

const winListeners = {};
const sandbox = {
  console, Math, JSON, Date, Set, Map, Array, Object, String, Number, Boolean, isNaN, parseInt, parseFloat, Infinity, NaN,
  Uint8ClampedArray, Float32Array, Int32Array, Promise, Error, RegExp, Symbol, Function, WeakMap,
  performance: { now: () => now },
  requestAnimationFrame: cb => { pending.push(cb); return pending.length; },
  cancelAnimationFrame: () => { },
  setTimeout: (cb, ms) => { const id = tid++; timers.push({ id, t: now + (ms || 0), cb, every: 0 }); return id; },
  clearTimeout: id => { timers = timers.filter(x => x.id !== id); },
  setInterval: (cb, ms) => { const id = tid++; timers.push({ id, t: now + (ms || 16), cb, every: ms || 16 }); return id; },
  clearInterval: id => { timers = timers.filter(x => x.id !== id); },
  // DOM
  document,
  navigator: { userAgent: 'node-smoke', language: 'fr-FR' },
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  AudioContext: function () { return { currentTime: 0, destination: {}, createOscillator: () => ({ type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { }, start() { }, stop() { } }), createGain: () => ({ gain: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { } }) }; },
  Image: function () { this.onload = null; this.onerror = null; this.width = 0; this.height = 0; },
  ResizeObserver: function () { return { observe() { }, unobserve() { }, disconnect() { } }; },
  matchMedia: () => ({ matches: false, addEventListener() { }, removeEventListener() { } }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener: (t, f) => { (winListeners[t] = winListeners[t] || []).push(f); },
  removeEventListener: (t, f) => { if (winListeners[t]) winListeners[t] = winListeners[t].filter(x => x !== f); },
  dispatch: (t, ev) => (winListeners[t] || []).slice().forEach(f => { try { f(ev); } catch (e) { errors.push('window.' + t + ': ' + (e && e.stack || e)); } }),
  // stockage
  localStorage: (() => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; }, clear: () => { for (const k in d) delete d[k]; } }; })(),
  NX_CLOUD: { backend: 'local', game: 'nexus-reveil' },
  alert: () => { }, confirm: () => true, prompt: () => null,
  location: { href: 'file:///C:/Users/marlon/Jeu%20roguelite%20IA/index.html', protocol: 'file:', search: '' },
  history: { pushState() { }, replaceState() { } },
  fetch: () => Promise.reject(new Error('offline')),
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
let pending = [];
vm.createContext(sandbox);

/* ---------------- pilotage ---------------- */
function drainTimers() {
  let guard = 0;
  for (;;) {
    const due = timers.filter(x => x.t <= now).sort((a, b) => a.t - b.t)[0];
    if (!due || guard++ > 4000) break;
    if (due.every) due.t = now + due.every; else timers = timers.filter(x => x !== due);
    try { due.cb(); } catch (e) { errors.push('timer: ' + (e && e.stack || e)); }
  }
}
function frame(dtms) {
  now += dtms;
  drainTimers();
  const cbs = pending; pending = [];
  for (const cb of cbs) {
    try { cb(now); } catch (e) { errors.push('frame: ' + (e && e.stack || e)); }
  }
}
function frames(n, dtms) { for (let i = 0; i < n; i++) frame(dtms || 16.7); }

/* ---------------- chargement ---------------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
console.log('scripts index.html : ' + files.length);
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { vm.runInContext(code, sandbox, { filename: f }); }
  catch (e) { errors.push('load ' + f + ' : ' + (e && e.stack || e)); }
}
const NX = sandbox.window.NX;
console.log('NX chargé : ' + (NX ? 'oui' : 'NON'));

/* ---------------- tests d'écrans ---------------- */
const results = [];
function step(name, fn) {
  const before = errors.length;
  try { fn(); } catch (e) { errors.push(name + ' : ' + (e && e.stack || e)); }
  try { frame(16.7); } catch (e) { errors.push('frame ' + name + ' : ' + (e && e.stack || e)); }
  const r = (errors.length > before ? 'ÉCHEC ' : 'ok    ') + name;
  results.push(r);
  console.log('  ' + r);
  errors.slice(before, before + 3).forEach(e => console.log('        !! ' + e));
}
function advanceCinematic(max) {
  for (let i = 0; i < (max || 60); i++) {
    if (currentScreen() !== 'cine') return;
    registry.cine.dispatchEvent({ type: 'click', preventDefault() { } });
    frame(16.7);
  }
}
function currentScreen() {
  if (registry.cine.children.length && !registry.cine._cls.has('hidden')) return 'cine';
  const ov = registry.overlay;
  if (ov.children.length && !ov.children[ov.children.length - 1]._cls.has('hidden')) return 'screen';
  if (registry.levelup.children.length && !registry.levelup._cls.has('hidden')) return 'levelup';
  return 'none';
}

// démarrage
console.log('phase : amorce');
frame(16.7); frames(6);            // amorce
now += 800; frame(16.7);          // dépasse le setTimeout(700) du boot
advanceCinematic(60);
console.log('phase : écrans');
step('écran menu', () => NX.screens.menu());
step('écran compte', () => NX.screens.account());
step('écran nouveau profil invité', () => NX.profile.setName && NX.profile.setName('Test'));
step('écran choix de classe', () => NX.screens.classSelect('compilateur'));
step('écran carte', () => NX.screens.map('compilateur'));
step('écran équipement', () => NX.screens.loadout('compilateur'));
step('écran talents', () => NX.screens.talents('compilateur'));
step('écran boutique', () => NX.screens.shop('compilateur'));
step('écran forge', () => NX.screens.forge('compilateur'));
step('écran codex', () => NX.screens.codex());
step('écran classement', () => NX.screens.leaderboard());
step('écran options', () => NX.screens.settings());
['a1_intro', 'a1_outro', 'a2_mid', 'a2_outro', 'a3_mid', 'a3_outro', 'a4_outro', 'a5_climax', 'a5_outro', 'mentor_copilot', 'end_choice', 'ending_lib', 'ending_asc', 'ending_eff', 'ending_secret'].forEach(k => step('cinématique ' + k, () => NX.screens.cinematic(k, () => { })));
for (let i = 1; i <= 4; i++) step('écran de fin ' + i, () => NX.screens.endingResult(i));

// talents : alloc + respec
step('allocation talent', () => { NX.profile.unlock('talents'); NX.profile.d.points = 20; const id = NX.TALENTS.all.find(x => NX.scopeOf(x) === 'core'); NX.profile.allocate('core', id); });
step('respec', () => NX.profile.respec('core'));

// une vraie partie
function autoPick() {
  const el = registry.levelup;
  if (el.children.length && !el._cls.has('hidden')) { const b = hasClick(el); if (b) b.dispatchEvent({ type: 'click', preventDefault() { } }); }
}
function play(n) { for (let i = 0; i < n; i++) { frame(16.7); autoPick(); } }
step('démarrage run niv.1', () => NX.main.startRun(1, 'compilateur'));
advanceCinematic(60);
frame(16.7);
step('run créée', () => { if (!NX.main.run) throw new Error('aucune run'); });
step('20 s de jeu', () => {
  NX.input.down.add('KeyD'); NX.input.down.add('KeyS');
  play(1200);
  NX.input.down.clear();
});
step('montée de niveau forcée', () => { const r = NX.main.run; r.pending += 1; r.openLevelUp(); });
frame(16.7);
step('interface de montée de niveau', () => { const el = registry.levelup; if (!el || !el.children.length) throw new Error('interface vide'); });
step('choix d’une amélioration', () => { const el = registry.levelup; const b = hasClick(el); if (!b) throw new Error('aucun choix cliquable'); b.dispatchEvent({ type: 'click', preventDefault() { } }); });
step('pause', () => NX.main.togglePause());
step('reprise', () => NX.main.togglePause());
step('30 s après montée', () => play(1800));
step('boss', () => { const r = NX.main.run; if (!r) throw new Error('pas de run'); r.time = r.level.dur - 0.05; play(20); if (!r.bossSpawned) throw new Error('boss non apparu (état=' + r.state + ' t=' + r.time.toFixed(1) + ' dur=' + r.level.dur + ')'); });
step('écran de fin de run (victoire)', () => { const r = NX.main.run; r.state = 'won'; NX.main.onWin(r); });
advanceCinematic(60);
step('écran de fin de run (mort)', () => { const r = NX.main.run; r.state = 'dead'; NX.main.onDead(r); });
step('abandon de run', () => NX.main.quitRun());

// audio
step('audio', () => { NX.audio.init(); NX.audio.play('shot'); NX.audio.play('levelup'); });

/* ---------------- rapport ---------------- */
console.log('\n--- écrans / fonctions ---');
results.forEach(r => console.log('  ' + r));
console.log('\nerreurs : ' + errors.length);
errors.slice(0, 20).forEach(e => console.log('  !! ' + e));
console.log(errors.length ? '\n=== ÉCHEC ===' : '\n=== DOM OK ===');
