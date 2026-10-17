/* Test headless : simulateur de LONGUE run pour vérifier que le jeu ne
   « rame » pas au bout de quelques minutes.
   On vérifie que les tableaux d'entités restent BORNÉS (ennemis, projectiles,
   pickups, effets) et que le coût par frame ne dérive pas de façon folle.

   Usage : node tools/test-perf.js [niveau] [secondes]                    */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const order = [
  'js/core.js', 'js/art.js',
  'js/data/keywords.js', 'js/data/classes.js', 'js/data/weapons.js', 'js/data/items.js',
  'js/data/talents.js', 'js/data/monsters.js', 'js/data/levels.js', 'js/data/story.js',
  'js/profile.js', 'js/net.js',
  'js/game/stats.js', 'js/game/entities.js', 'js/game/behaviors.js', 'js/game/run.js'
];

const listeners = {}, storeData = {};
const sandbox = {
  console, Math, JSON, Date, Set, Map, Array, Object, String, Number, Boolean, isNaN, parseInt, parseFloat, Infinity, NaN,
  performance: { now: () => Number(process.hrtime.bigint() / 1000000n) },
  setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { },
  requestAnimationFrame: () => 0,
  localStorage: {
    getItem: k => (k in storeData ? storeData[k] : null),
    setItem: (k, v) => { storeData[k] = String(v); },
    removeItem: k => { delete storeData[k]; }
  },
  Image: function () { this.onload = null; this.onerror = null; },
  NX_CLOUD: { backend: 'local', url: '', game: 'nexus-reveil' }
};
sandbox.window = sandbox;
sandbox.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => null, style: {}, classList: { add() { }, remove() { } }, appendChild() { }, addEventListener() { } }),
  addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  head: { appendChild() { } }, scripts: [], readyState: 'complete'
};
sandbox.addEventListener = sandbox.document.addEventListener;
vm.createContext(sandbox);
for (const f of order) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
const NX = sandbox.window.NX;

NX.profile.load();
NX.profile.d.user = { id: 'guest', name: 'Perf', guest: true };
NX.profile.d.points = 0;   // joueur SANS talents : les ennemis s'accumulent (pire cas)

const levelIndex = parseInt(process.argv[2] || '10', 10);
const SECONDS = parseInt(process.argv[3] || '470', 10);
const DT = 1 / 60;

const run = new NX.Run(levelIndex, 'compilateur', {});
run.player.xpNeed = 1e12;   // pas de montées de niveau : on garde le loadout initial

// charge de tir maximale : 4 armes à projectiles au niveau max + bonus de
// projectiles/objets (reproduit un build « fin de partie » saturé)
run.player.weapons.length = 0;
const projW = NX.weaponPool().filter(id => ['shot', 'beam', 'chain', 'nova'].indexOf(NX.WEAPONS[id].mode) >= 0).slice(0, 4);
projW.forEach(id => run.addWeapon(id, null, 8));
['hyperthread', 'swapfile', 'backplane', 'scheduler'].forEach(id => { run.addItem(id); run.extraPicks.push({ type: 'item', id }); });
run.rebuildStats();
// joueur invincible : on veut observer la CHARGE maximale (les ennemis
// s'accumulent jusqu'au plafond de spawn) et non la survie
run.hurtPlayer = function () { };

const MAX = { enemies: 300, projs: 900, pickups: 420, fx: 620 };
const peak = { enemies: 0, projs: 0, eshots: 0, pickups: 0, fx: 0, zones: 0 };
const marks = [];
let worstFrame = 0, worstAt = 0;

const steps = Math.round(SECONDS / DT);
let sim = 0;
for (let i = 0; i < steps; i++) {
  if (run.state === 'levelup') { run.applyChoice(run.choices[0]); continue; }
  if (run.state !== 'play') break;
  const t0 = process.hrtime.bigint();
  run.update(DT);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (ms > worstFrame) { worstFrame = ms; worstAt = run.time; }
  sim += DT;

  peak.enemies = Math.max(peak.enemies, run.enemies.length);
  peak.projs = Math.max(peak.projs, run.projs.length);
  peak.eshots = Math.max(peak.eshots, run.eshots.length);
  peak.pickups = Math.max(peak.pickups, run.pickups.length);
  peak.fx = Math.max(peak.fx, NX.fx.list.length);
  peak.zones = Math.max(peak.zones, run.zones.length + run.fields.length + run.mines.length);

  if (i % Math.round(60 / DT) === 0) marks.push({ t: run.time, en: run.enemies.length, pj: run.projs.length, pk: run.pickups.length, fx: NX.fx.list.length });
}

console.log('=== TEST PERF (simulation longue run) ===');
console.log('niveau', levelIndex, '· durée simulée', sim.toFixed(1) + 's · état', run.state, '· kills', run.kills, '· niveau héros', run.player.level);
console.log('\n-- pics d’entités --');
console.log('  ennemis   ', peak.enemies, '/ plafond', MAX.enemies);
console.log('  projectiles', peak.projs, '/ plafond', MAX.projs);
console.log('  tirs ennemis', peak.eshots);
console.log('  pickups   ', peak.pickups, '/ plafond', MAX.pickups);
console.log('  effets fx ', peak.fx, '/ plafond', MAX.fx);
console.log('  zones/mines/champs', peak.zones);
console.log('\n-- évolution toutes les minutes --');
marks.forEach(m => console.log('  t=' + m.t.toFixed(0).padStart(4) + 's  ennemis=' + String(m.en).padStart(4) + '  proj=' + String(m.pj).padStart(4) + '  pickups=' + String(m.pk).padStart(4) + '  fx=' + String(m.fx).padStart(4)));
console.log('\npire frame : ' + worstFrame.toFixed(2) + ' ms à t=' + worstAt.toFixed(0) + 's');

let fail = 0;
function check(name, cond) { if (cond) console.log('  ok    ' + name); else { console.log('  FAIL  ' + name); fail++; } }
console.log('');
check('ennemis bornés (<= ' + MAX.enemies + ')', peak.enemies <= MAX.enemies);
check('projectiles bornés (<= ' + MAX.projs + ')', peak.projs <= MAX.projs);
check('pickups bornés (<= ' + MAX.pickups + ')', peak.pickups <= MAX.pickups);
check('effets bornés (<= ' + MAX.fx + ')', peak.fx <= MAX.fx);
check('tirs ennemis bornés (< 400)', peak.eshots < 400);
check('aucune gigue mémoire : pickups en fin de run < 400', run.pickups.length < 400);

// la phase saturée (fin de run) ne doit pas croître : garde-fou grossier
// contre une fuite (accumulation d'entités/effets)
const m1 = marks[marks.length - 3], m2 = marks[marks.length - 1];
if (m1 && m2) {
  const growth = m2.en / Math.max(1, m1.en);
  check('population d’ennemis stabilisée (×' + growth.toFixed(2) + ' entre t=' + m1.t.toFixed(0) + 's et t=' + m2.t.toFixed(0) + 's)', growth <= 3.5);
}

console.log('\nerreurs : ' + fail);
console.log('\n' + (fail ? '=== PERF KO ===' : '=== PERF OK ==='));
process.exit(fail ? 1 : 0);
