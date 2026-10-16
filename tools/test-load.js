/* Test headless : charge le jeu hors navigateur et simule des runs.
   Usage : node tools/test-load.js                                      */
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

// --- DOM / navigateur minimal ---
const listeners = {};
const storeData = {};
const sandbox = {
  console,
  Math, JSON, Date, Set, Map, Array, Object, String, Number, Boolean, isNaN, parseInt, parseFloat, Infinity, NaN,
  performance: { now: () => Number(process.hrtime.bigint() / 1000000n) },
  setTimeout: (f) => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { },
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

let ok = true;
for (const f of order) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { ok = false; console.error('ERREUR chargement ' + f + ' : ' + e.stack); }
}
if (!ok) process.exit(1);

const NX = sandbox.window.NX;
console.log('chargé. talents =', NX.TALENTS.all.length, '· monstres =', NX.MONSTERK.length, '· boss =', NX.BOSSK.length,
  '· armes =', NX.WEAPONK.length, '· objets =', NX.ITEMK.length, '· niveaux =', NX.LEVELS.length);

// --- stats & profil ---
NX.profile.load();
NX.profile.d.user = { id: 'guest', name: 'Test', guest: true };
// alloue quelques talents du tronc commun
let alloc = 0;
for (const id of NX.TALENTS.root.core) { if (NX.profile.canTake('compilateur', id)) { NX.profile.d.points += 5; NX.profile.allocate('compilateur', id); alloc++; } }
console.log('talents du tronc alloués :', alloc, '/', NX.TALENTS.root.core.length);

function simRun(levelIndex, cls, seconds, opts, autoPick) {
  const run = new NX.Run(levelIndex, cls, opts || {});
  const dt = 1 / 60;
  let t = 0, picks = 0;
  while (t < seconds) {
    if (run.state === 'levelup') { if (autoPick !== false) { run.applyChoice(run.choices[0]); picks++; } else break; continue; }
    if (run.state === 'won' || run.state === 'dead') break;
    run.update(dt); t += dt;
  }
  return { run, t, picks };
}

// 1) run longue sur le niveau 1, avec prise de niveaux automatique
let r = simRun(1, 'compilateur', 120, {}, true);
console.log('run niv.1 : t=' + r.t.toFixed(1) + 's état=' + r.run.state + ' niv.héros=' + r.run.player.level +
  ' armes=' + r.run.player.weapons.length + ' kills=' + r.run.kills + ' ennemis=' + r.run.enemies.length + ' choix=' + r.picks);

// 2) toutes les classes, 60 s
for (const c of NX.CLASSK) {
  const rr = simRun(3, c, 60, {}, true);
  console.log('classe ' + c.padEnd(12) + ' → état=' + rr.run.state + ' kills=' + rr.run.kills + ' armes=' + rr.run.player.weapons.length + ' niv=' + rr.run.player.level);
}

// 3) chaque monstre instancié et mis à jour 5 s
let monOk = 0;
for (const id of NX.MONSTERK) {
  const run = new NX.Run(1, 'virus', { particles: 0 });
  const e = NX.makeEnemy(id, 100, 0, { hp: 1, dmg: 1 }, {});
  run.enemies.push(e);
  try { for (let i = 0; i < 300; i++) run.update(1 / 60); monOk++; }
  catch (err) { console.error('monstre KO : ' + id + ' — ' + err.message); }
}
console.log('monstres simulés sans erreur :', monOk, '/', NX.MONSTERK.length);

// 4) tous les boss, forcés, tués
let bossOk = 0;
for (const id of NX.BOSSK) {
  const run = new NX.Run(5, 'materiel', { particles: 0 });
  const b = NX.makeBoss(id, 300, 0, { hp: 0.02, dmg: 0.2 });
  run.enemies.push(b); run.boss = b; run.bossSpawned = true;
  try {
    for (let i = 0; i < 1200 && !b.dead; i++) { run.damageEnemy(b, 500, 'kinetic', { silent: 1 }); run.update(1 / 60); }
    if (b.dead) bossOk++;
  } catch (err) { console.error('boss KO : ' + id + ' — ' + err.message); }
}
console.log('boss gérés sans erreur :', bossOk, '/', NX.BOSSK.length);

// 5) toutes les armes + toutes les variantes, tirées 12 s
let wOk = 0, wTotal = 0;
for (const wid of Object.keys(NX.WEAPONS)) {
  const def = NX.WEAPONS[wid];
  const variants = [null].concat((def.variants || []).map(v => v.id));
  for (const vi of variants) {
    wTotal++;
    const run = new NX.Run(1, 'compilateur', { particles: 0 });
    run.player.weapons.length = 0;
    run.addWeapon(wid, vi, 8);
    for (let i = 0; i < 20; i++) { const a = Math.random() * 6.28; run.enemies.push(NX.makeEnemy('agent', Math.cos(a) * 120, Math.sin(a) * 120, { hp: 1, dmg: 1 }, {})); }
    try { for (let i = 0; i < 720; i++) run.update(1 / 60); wOk++; }
    catch (err) { console.error('arme KO : ' + wid + '/' + vi + ' — ' + err.message); }
  }
}
console.log('armes/variantes tirées sans erreur :', wOk, '/', wTotal);

// 6) chaque niveau : spawn du boss puis mort du boss → victoire
let lvlOk = 0;
for (const L of NX.LEVELS) {
  const run = new NX.Run(L.i, 'materiel', { particles: 0 });
  try {
    for (let i = 0; i < 120; i++) run.update(1 / 60);
    run.time = L.dur; run.update(1 / 60);                 // déclenche le boss
    if (!run.boss) { console.error('pas de boss au niveau ' + L.i); continue; }
    for (let i = 0; i < 3000 && run.state === 'play'; i++) { run.damageEnemy(run.boss, 9999, 'void', { silent: 1 }); run.update(1 / 60); }
    if (run.state === 'won') lvlOk++; else console.error('niveau ' + L.i + ' état=' + run.state);
  } catch (err) { console.error('niveau KO : ' + L.i + ' — ' + err.stack); }
}
console.log('niveaux validés (boss tué → victoire) :', lvlOk, '/', NX.LEVELS.length);

// 7) évolutions
const run2 = new NX.Run(1, 'compilateur', { particles: 0 });
run2.player.weapons.length = 0; run2.addWeapon('boucle', null, 8); run2.addItem('hyperthread'); run2.checkEvolutions();
console.log('évolution test :', run2.player.weapons.map(w => w.id).join(',') , '(attendu boucle_inf)');

console.log('\n=== TEST TERMINÉ ===');
