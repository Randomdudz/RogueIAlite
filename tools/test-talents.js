/* ============================================================
   NEXUS : Réveil — TEST DE L'ARBRE DE TALENTS
   Vérifie la géométrie du layout : aucun nœud ne se chevauche
   et l'auto-cadrage laisse tous les nœuds visibles.
   Usage : node tools/test-talents.js
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

const STATS = { hp: {}, dmg: {}, area: {}, cd: {}, count: {}, projSpeed: {}, crit: {}, critDmg: {},
  dmg_pierce: {}, dmg_kinetic: {}, dmg_corrosion: {}, xpGain: {}, goldGain: {}, luck: {}, armor: {},
  regen: {}, speed: {}, dodge: {}, lifesteal: {}, summonDmg: {}, dur: {}, hpPct: {}, statusChance: {}, revive: {} };
const NXobj = { STATS, CLASSK: ['compilateur', 'daemon', 'reseau', 'optimiseur', 'virus', 'materiel'] };
const sandbox = { window: { NX: NXobj } };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/talents.js'), 'utf8'), sandbox, { filename: 'talents.js' });

const T = sandbox.window.NX.TALENTS, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nodeR = (n, z) => (n.kind === 'key' ? 21 : n.kind === 'notable' ? 15 : 12) * clamp(z, 0.45, 1.4);

let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
for (const id of T.all) { const p = T.nodes[id].pos; minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
const bw = maxx - minx, bh = maxy - miny;

console.log('=== TEST ARBRE DE TALENTS ===');
console.log('nœuds : ' + T.all.length + '  (bbox ' + bw.toFixed(0) + '×' + bh.toFixed(0) + ')');

let fail = 0;
const CANVAS = [[1280, 560], [1366, 620], [1920, 760], [1024, 480]];
for (const [cw, ch] of CANVAS) {
  const z = clamp(Math.min(cw / (bw + 180), ch / (bh + 180)), 0.38, 1.15);
  let worst = Infinity, pair = '';
  for (let i = 0; i < T.all.length; i++) for (let j = i + 1; j < T.all.length; j++) {
    const a = T.nodes[T.all[i]], b = T.nodes[T.all[j]];
    const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) * z;
    const gap = d - (nodeR(a, z) + nodeR(b, z));
    if (gap < worst) { worst = gap; pair = T.all[i] + '/' + T.all[j]; }
  }
  const clipped = T.all.filter(id => { const p = T.nodes[id].pos; const sx = cw / 2 + p.x * z, sy = ch / 2 + p.y * z; return sx < 0 || sx > cw || sy < 0 || sy > ch; });
  const ok = worst > 0 && clipped.length === 0;
  if (!ok) fail++;
  console.log((ok ? '  ok    ' : '  ÉCHEC ') + cw + '×' + ch + '  zoom=' + z.toFixed(2) + '  écart min=' + worst.toFixed(1) + 'px (' + pair + ')' + (clipped.length ? '  hors-écran=' + clipped.length : ''));
}
console.log(fail ? '\n=== ÉCHEC ===' : '\n=== ARBRE OK ===');
process.exit(fail ? 1 : 0);
