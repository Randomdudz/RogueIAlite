/* Balayage d'équilibrage : les 20 niveaux, bot qui construit un build réaliste.
   Usage : node tools/test-balance.js [classe] [vet|normal|zero]                */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const order = ['js/core.js', 'js/art.js',
  'js/data/keywords.js', 'js/data/classes.js', 'js/data/weapons.js', 'js/data/items.js',
  'js/data/talents.js', 'js/data/monsters.js', 'js/data/levels.js', 'js/data/story.js',
  'js/profile.js', 'js/net.js', 'js/game/stats.js', 'js/game/entities.js', 'js/game/behaviors.js', 'js/game/run.js'];
const storeData = {};
const sandbox = { console, Math, JSON, Date, Set, Map, Array, Object, String, Number, Boolean, isNaN, parseInt, parseFloat, Infinity, NaN,
  performance: { now: () => 0 }, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { },
  requestAnimationFrame: () => 0,
  localStorage: { getItem: k => (k in storeData ? storeData[k] : null), setItem: (k, v) => { storeData[k] = String(v); }, removeItem: k => { delete storeData[k]; } },
  Image: function () { }, NX_CLOUD: { backend: 'local', game: 'nexus-reveil' } };
sandbox.window = sandbox;
sandbox.document = { getElementById: () => null, createElement: () => ({ getContext: () => null }), addEventListener: () => { }, head: { appendChild() { } }, scripts: [], readyState: 'complete' };
sandbox.addEventListener = () => { };
vm.createContext(sandbox);
for (const f of order) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
const NX = sandbox.window.NX;
NX.profile.load();
NX.profile.d.user = { id: 'guest', name: 'T', guest: true };

// Profil méta : soit débutant (tronc seul), soit vétéran (tout), pour comparer.
function setup(level) {
  NX.profile.reset(false);
  NX.profile.d.user = { id: 'guest', name: 'T', guest: true };
  NX.profile.d.points = level === 'vet' ? 9999 : (level === 'zero' ? 0 : 4);
  if (level === 'zero') return;   // profil du tout premier lancement : rien
  NX.profile.unlock('talents');
  NX.profile.unlock('variants'); NX.profile.unlock('loadout'); NX.profile.unlock('shop'); NX.profile.unlock('forge');
  const scopes = level === 'vet' ? ['core', 'compilateur', 'daemon', 'reseau', 'optimiseur', 'virus', 'materiel', 'x1', 'x2'] : ['core'];
  scopes.forEach(sc => {
    let g = 0;
    while (g++ < 500) {
      const ids = NX.TALENTS.all.filter(id => NX.scopeOf(id) === sc && !NX.profile.isAllocated(sc, id) && NX.talentAvail(id, NX.profile.scopeAlloc(sc)));
      if (!ids.length) break;
      ids.sort((a, b) => NX.TALENTS.nodes[a].cost - NX.TALENTS.nodes[b].cost);
      NX.profile.d.points += 100; NX.profile.allocate(sc, ids[0]);
    }
  });
  // objets équipés si débloqué
  if (level === 'vet') { NX.profile.d.items = {}; ['multithread', 'nvme', 'gpu_render', 'ups', 'raid', 'inductance'].forEach(id => { if (NX.ITEMS[id]) { NX.profile.d.items[id] = { qty: 1, lvl: 4 }; NX.profile.d.loadout.push(id); } }); }
}

function isCloseBuild(run) {
  return run.player.weapons.some(w => { const m = NX.WEAPONS[w.id].mode; return m === 'melee' || m === 'aura' || m === 'orbit'; });
}
function kite(run) {
  const p = run.player, down = NX.input.down; down.clear(); NX.input.pressed.clear();
  const close = isCloseBuild(run);
  const R = close ? 80 : 150;
  let bx = 0, by = 0, w = 0, near = 1e9, nearE = null;
  for (const e of run.enemies) {
    const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
    if (d2 < near) { near = d2; nearE = e; }
    if (d2 < R * R && d2 > 0.01) { const k = 1 / d2; bx += dx * k; by += dy * k; w += k; }
  }
  let ax = 0, ay = 0;
  if (close) {
    // build de contact : on tourne autour de la cible pour rester dans l'aura
    if (nearE) {
      const a = Math.atan2(p.y - nearE.y, p.x - nearE.x), d = Math.sqrt(near);
      ax = Math.cos(a + Math.PI / 2); ay = Math.sin(a + Math.PI / 2);
      const err = d - 60;
      ax -= Math.cos(a) * (err / 40); ay -= Math.sin(a) * (err / 40);
    }
  } else if (w > 0) { ax = bx / w; ay = by / w; }
  if (!ax && !ay) {
    let best = null, bd = 1e9;
    for (const k of run.pickups) { const d = (k.x - p.x) ** 2 + (k.y - p.y) ** 2; if (d < bd) { bd = d; best = k; } }
    if (best) { ax = best.x - p.x; ay = best.y - p.y; } else { ax = 1; ay = 0; }
  }
  let dxs = 0, dys = 0;
  for (const s of run.eshots) { const rx = s.x - p.x, ry = s.y - p.y, d = Math.hypot(rx, ry); if (d < 140) { dxs += -ry / (d || 1); dys += rx / (d || 1); } }
  if (dxs || dys) { const m = Math.hypot(dxs, dys); ax += dxs / m * 2.4; ay += dys / m * 2.4; }
  // évite les zones hostiles (ce que fait tout joueur humain)
  for (const z of run.zones) {
    if (!z.hostile) continue;
    const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
    if (d < z.r + 70) { const m = Math.max(1, d); ax += dx / m * 3.2; ay += dy / m * 3.2; }
  }
  const a = Math.atan2(ay, ax);
  if (Math.cos(a) > 0.25) down.add('KeyD'); else if (Math.cos(a) < -0.25) down.add('KeyA');
  if (Math.sin(a) > 0.25) down.add('KeyS'); else if (Math.sin(a) < -0.25) down.add('KeyW');
  if (near < 75 * 75) NX.input.pressed.add('Space');
}
function pick(run) {
  const c = run.choices, nW = run.player.weapons.length;
  const weapon = c.find(x => x.type === 'wnew') || c.find(x => x.type === 'wup') || c.find(x => x.type === 'variant');
  const item = c.find(x => x.type === 'item');
  if (nW < 4) return weapon || item || c[0];
  const sust = c.find(x => x.type === 'item' && NX.ITEMS[x.id] && NX.ITEMS[x.id].stats &&
    (NX.ITEMS[x.id].stats.hp || NX.ITEMS[x.id].stats.lifesteal || NX.ITEMS[x.id].stats.armor || NX.ITEMS[x.id].stats.regen || NX.ITEMS[x.id].stats.dodge));
  return sust || item || weapon || c[0];
}
function sim(levelIndex, cls, meta, maxExtra) {
  setup(meta);
  const run = new NX.Run(levelIndex, cls, { particles: 0 });
  const dt = 1 / 60; let t = 0; const cap = NX.LEVELS[levelIndex - 1].dur + (maxExtra || 60);
  while (t < cap) {
    if (run.state === 'levelup') { run.applyChoice(pick(run)); continue; }
    if (run.state !== 'play') break;
    kite(run); run.update(dt); t += dt;
  }
  return { run, t, cap };
}

const cls = process.argv[2] || 'compilateur';
const meta = process.argv[3] || 'vet';
console.log('=== balayage ' + cls + ' / méta ' + meta + ' ===');
let wins = 0;
for (const L of NX.LEVELS) {
  const r = sim(L.i, cls, meta);
  const won = r.run.state === 'won';
  if (won) wins++;
  const label = won ? 'VICTOIRE' : (r.run.state === 'play' ? 'BOSS NON TUÉ (60s)' : 'MORT t=' + r.t.toFixed(0) + 's');
  console.log('niv.' + String(L.i).padStart(2) + ' dur=' + String(L.dur).padStart(3) + 's → ' +
    label +
    '  niv.héros=' + String(r.run.player.level).padStart(2) +
    ' armes=' + r.run.player.weapons.length +
    ' items=' + String(Object.keys(r.run.player.items).length).padStart(2) +
    ' kills=' + String(r.run.kills).padStart(4) +
    ' pv=' + Math.round(r.run.player.hp) + '/' + Math.round(r.run.player.maxHp) +
    (won ? '  (boss tué en ' + (r.t - L.dur).toFixed(0) + 's)' : ''));
}
console.log('→ ' + wins + ' / ' + NX.LEVELS.length + ' niveaux franchis');
