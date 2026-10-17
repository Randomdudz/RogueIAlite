/* ============================================================
   NEXUS : Réveil — ARBRE DE TALENTS (style Path of Exile)
   - Tronc COMMUN (global, appliqué à toutes les classes)
   - 6 branches de CLASSE (par classe, choix de build)
   - 4 branches TRANSVERSALES (par classe, disponibles à tous)
   ~198 nœuds. On ne peut jamais tout prendre : on spécialise.
   kind : 'minor'(1) · 'notable'(2) · 'key'(3, keystone)
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;
  const nodes = {}, root = { core: [], byClass: {} }, all = [];

  function mk(id, n, kind, stats, pos, cls, req, extra) {
    const nd = Object.assign({ id, n, kind, stats: stats || {}, pos, cls, req: req || [], cost: kind === 'key' ? 3 : kind === 'notable' ? 2 : 1 }, extra || {});
    nodes[id] = nd; all.push(id);
    return nd;
  }
  // Place une chaîne de nœuds le long d'un arc partant du centre.
  function chain(base, cls, angleDeg, r0, r1, list, spread) {
    const a = angleDeg * Math.PI / 180, ids = [];
    list.forEach((it, i) => {
      const t = list.length <= 1 ? 0 : i / (list.length - 1);
      const r = r0 + (r1 - r0) * t;
      const curve = Math.sin(t * Math.PI) * (spread || 0);
      const x = Math.cos(a) * r - Math.sin(a) * curve;
      const y = Math.sin(a) * r + Math.cos(a) * curve;
      const id = base + (i + 1);
      mk(id, it[0], it[1], it[2], { x: Math.round(x), y: Math.round(y) }, cls, i === 0 ? it[4] || [] : [base + i], it[3]);
      ids.push(id); if (it[1] === 'key') root.key = id;
    });
    return ids;
  }

  /* ---------------- TRONC COMMUN (global) ---------------- */
  const CORE = [
    ['Noyau actif', 'minor', { hp: 20 }, { ic: '🧩', d: 'Le tronc commun : garantit la progression de base à toutes les classes.' }],
    ['Boucle saine', 'minor', { dmg: 8 }],
    ['Journal système', 'minor', { xpGain: 10 }],
    ['Portefeuille', 'minor', { goldGain: 15 }],
    ['Réactivité', 'minor', { speed: 5 }],
    ['Optimisation', 'notable', { dmg: 12, cd: 5 }, { ic: '⚙️', d: 'Notable : +12% dégâts, +5% vitesse d’attaque.' }],
    ['Mémoire vive', 'notable', { hpPct: 10, regen: 0.5 }, { ic: '🧠', d: 'Notable : +10% PV, +0,5 PV/s.' }],
    ['Connaissance', 'notable', { xpGain: 20, goldGain: 20 }, { ic: '📚', d: 'Notable : +20% Data, +20% Crédits.' }],
    ['Noyau dur', 'notable', { dmg: 15, crit: 5 }, { ic: '💠', d: 'Notable : +15% dégâts, +5% critique.' }],
    ['Conscience', 'key', { hpPct: 12, dmg: 12, xpGain: 15, goldGain: 15 }, { ic: '🌌', d: 'KEESTONE : +12% PV, +12% dégâts, +15% Data et Crédits. Le point de départ de tout build.', flag: 'root' }]
  ];
  // tronc commun : chaîne verticale bien espacée au-dessus du centre de l'arbre
  chain('core', 'core', -90, 52, 52 + (CORE.length - 1) * 48, CORE, 0);
  root.core = all.slice();

  /* ---------------- BRANCHES DE CLASSE ---------------- */
  const CLASS_BRANCH = {
    compilateur: {
      angle: -72, color: '#5cc8ff', name: 'Compilation',
      minors: [{ dmg_pierce: 7 }, { area: 6 }, { cd: 4 }, { count: 0, dmg: 5 }],
      notables: [
        { n: 'Optimiseur de boucle', d: 'Notable : +18% dégâts de perçage, +10% zone.', stats: { dmg_pierce: 18, area: 10 }, ic: '🔁' },
        { n: 'JIT', d: 'Notable : +12% vitesse d’attaque, +8% vitesse des projectiles.', stats: { cd: 12, projSpeed: 8 }, ic: '⚡' },
        { n: 'Inlining', d: 'Notable : +1 projectile, −12% dégâts.', stats: { count: 1, dmg: -12 }, ic: '➕' },
        { n: 'Types statiques', d: 'Notable : +10% critique, +25% dégâts critiques.', stats: { crit: 10, critDmg: 25 }, ic: '🧬' }
      ],
      key: { n: 'Hyperthreading', d: 'KEESTONE : +1 projectile, mais −20% dégâts par projectile lancé (touche vraiment la façon de jouer).', stats: { count: 1 }, flag: 'hyperthread', ic: '🧵' }
    },
    daemon: {
      angle: 180, color: '#4dff9f', name: 'Persistance',
      minors: [{ hp: 25 }, { regen: 0.4 }, { armor: 3 }, { hpPct: 4 }],
      notables: [
        { n: 'Watchdog', d: 'Notable : +12 armure, +0,8 PV/s.', stats: { armor: 12, regen: 0.8 }, ic: '🐕' },
        { n: 'Auto-restart', d: 'Notable : +1 réanimation, +5% PV.', stats: { revive: 1, hpPct: 5 }, ic: '♻️' },
        { n: 'Nice -20', d: 'Notable : +20% PV, −6% vitesse.', stats: { hpPct: 20, speed: -6 }, ic: '🛡️' },
        { n: 'Buffer overflow', d: 'Notable : +18% PV, +8 armure.', stats: { hpPct: 18, armor: 8 }, ic: '🧱' }
      ],
      key: { n: 'Garbage Collector', d: 'KEESTONE : +2% dégâts par objet passif équipé (jusqu’à +60%). Récompense les builds à objets.', stats: {}, flag: 'gc', ic: '🗑️' }
    },
    reseau: {
      angle: 0, color: '#9fd8ff', name: 'Maillage',
      minors: [{ summonDmg: 8 }, { dur: 5 }, { count: 0, speed: 4 }, { cd: 3 }],
      notables: [
        { n: 'Load balancing', d: 'Notable : +20% dégâts des invocations, +1 max.', stats: { summonDmg: 20 }, flag: 'summonCap+1', ic: '⚖️' },
        { n: 'Multicast', d: 'Notable : +1 projectile/drone, −10% dégâts.', stats: { count: 1, dmg: -10 }, ic: '📡' },
        { n: 'Keep-alive', d: 'Notable : +30% durée des invocations, +10% vitesse.', stats: { dur: 30, speed: 10 }, ic: '💓' },
        { n: 'Switch L3', d: 'Notable : +15% dégâts, +8% critique.', stats: { dmg: 15, crit: 8 }, ic: '🔀' }
      ],
      key: { n: 'Auto-scale', d: 'KEESTONE : +2 invocations maximales et +35% dégâts des invocations.', stats: { summonDmg: 35 }, flag: 'summonCap+2', ic: '📈' }
    },
    optimiseur: {
      angle: 72, color: '#ffd479', name: 'Efficience',
      minors: [{ cd: 5 }, { area: 5 }, { luck: 5 }, { xpGain: 6 }],
      notables: [
        { n: 'Cache agressif', d: 'Notable : +14% vitesse d’attaque, +10% zone.', stats: { cd: 14, area: 10 }, ic: '🗄️' },
        { n: 'Heuristique', d: 'Notable : +18% chance, +12% Data.', stats: { luck: 18, xpGain: 12 }, ic: '🧭' },
        { n: 'Préchargement', d: 'Notable : +15% vitesse des projectiles, +8% vitesse.', stats: { projSpeed: 15, speed: 8 }, ic: '⏩' },
        { n: 'Amortissement', d: 'Notable : +18% Crédits, +10% chance.', stats: { goldGain: 18, luck: 10 }, ic: '📉' }
      ],
      key: { n: 'Récursivité', d: 'KEESTONE : +60% dégâts de ZONE, mais −30% dégâts sur les cibles uniques. Build AoE.', stats: { area: 25 }, flag: 'recursive', ic: '🌀' }
    },
    virus: {
      angle: 144, color: '#8bff6b', name: 'Contagion',
      minors: [{ statusChance: 10 }, { dur: 6 }, { dmg_corrosion: 7 }, { area: 4 }],
      notables: [
        { n: 'Mutation', d: 'Notable : +25% chance de statut, +15% durée.', stats: { statusChance: 25, dur: 15 }, ic: '🧪' },
        { n: 'Souche virulente', d: 'Notable : +20% dégâts de corrosion, +10% zone.', stats: { dmg_corrosion: 20, area: 10 }, ic: '☣️' },
        { n: 'Vecteur', d: 'Notable : +20% cadence, +10% chance de statut.', stats: { cd: 20, statusChance: 10 }, ic: '🦟' },
        { n: 'Pandémie', d: 'Notable : +30% durée, +12% dégâts.', stats: { dur: 30, dmg: 12 }, ic: '🌍' }
      ],
      key: { n: 'Zero-Day', d: 'KEESTONE : tes coups critiques appliquent Virus et Brûlure. +15% critique.', stats: { crit: 15 }, flag: 'zeroday', ic: '💥' }
    },
    materiel: {
      angle: -36, color: '#ff9a55', name: 'Force brute',
      minors: [{ dmg_kinetic: 8 }, { armor: 3 }, { hp: 20 }, { dmg: 4 }],
      notables: [
        { n: 'Servomoteurs', d: 'Notable : +20% dégâts cinétiques, +8% vitesse.', stats: { dmg_kinetic: 20, speed: 8 }, ic: '🦾' },
        { n: 'Blindage', d: 'Notable : +12 armure, +12% PV.', stats: { armor: 12, hpPct: 12 }, ic: '🛡️' },
        { n: 'Presse hydraulique', d: 'Notable : +25% dégâts cinétiques, +15% zone.', stats: { dmg_kinetic: 25, area: 15 }, ic: '🔧' },
        { n: 'Fonderie', d: 'Notable : +15% dégâts, +8% PV.', stats: { dmg: 15, hpPct: 8 }, ic: '🏭' }
      ],
      key: { n: 'Overclock', d: 'KEESTONE : +40% vitesse d’attaque, mais +25% dégâts subis. Risque/récompense.', stats: { cd: 25 }, flag: 'overclock', ic: '🔥' }
    }
  };

  /* ---------------- BRANCHES TRANSVERSALES ---------------- */
  const X_BRANCH = {
    crit: {
      angle: 36, color: '#ff4d94', name: 'Précision',
      minors: [{ crit: 5 }, { critDmg: 10 }, { dmg: 4 }],
      notables: [
        { n: 'Viseur', d: 'Notable : +12% critique, +30% dégâts critiques.', stats: { crit: 12, critDmg: 30 }, ic: '🎯' },
        { n: 'Tir calibré', d: 'Notable : +25% dégâts critiques, +8% dégâts.', stats: { critDmg: 25, dmg: 8 }, ic: '📐' }
      ],
      key: { n: 'Précision fatale', d: 'KEESTONE : +20% critique, +40% dégâts critiques, −15% dégâts normaux.', stats: { crit: 20, critDmg: 40, dmg: -15 }, flag: 'precision', ic: '💠' }
    },
    zone: {
      angle: 216, color: '#c48bff', name: 'Amplitude',
      minors: [{ area: 6 }, { dur: 5 }, { dmg: 4 }],
      notables: [
        { n: 'Onde large', d: 'Notable : +20% zone, +10% durée.', stats: { area: 20, dur: 10 }, ic: '🌊' },
        { n: 'Résilience', d: 'Notable : +15% zone, +10% dégâts.', stats: { area: 15, dmg: 10 }, ic: '🧿' }
      ],
      key: { n: 'Big Bang', d: 'KEESTONE : +60% zone, −20% vitesse des projectiles.', stats: { area: 60, projSpeed: -20 }, flag: 'bigbang', ic: '💥' }
    },
    proj: {
      angle: 108, color: '#6ff0ff', name: 'Balistique',
      minors: [{ projSpeed: 8 }, { count: 0, dmg: 4 }, { dur: 4 }],
      notables: [
        { n: 'Railgun', d: 'Notable : +25% vitesse des projectiles, +10% dégâts.', stats: { projSpeed: 25, dmg: 10 }, ic: '🛤️' },
        { n: 'Tir en salve', d: 'Notable : +1 projectile, −8% dégâts.', stats: { count: 1, dmg: -8 }, ic: '🎇' }
      ],
      key: { n: 'Salve totale', d: 'KEESTONE : +2 projectiles, −25% dégâts par projectile.', stats: { count: 2, dmg: -25 }, flag: 'salvo', ic: '🎆' }
    },
    def: {
      angle: 252, color: '#8fd6a8', name: 'Défense',
      minors: [{ armor: 3 }, { hp: 22 }, { dodge: 3 }, { lifesteal: 2 }],
      notables: [
        { n: 'Égide', d: 'Notable : +12 armure, +8% esquive.', stats: { armor: 12, dodge: 8 }, ic: '✧' },
        { n: 'Robinet de vie', d: 'Notable : +6% vol de vie, +15% PV.', stats: { lifesteal: 6, hpPct: 15 }, ic: '💚' }
      ],
      key: { n: 'Sandbox', d: 'KEESTONE : −50% dégâts subis à distance, mais −20% dégâts infligés.', stats: { dmg: -20 }, flag: 'sandbox', ic: '🏖️' }
    }
  };

  function buildBranch(id, spec, cls) {
    const list = [];
    const minors = spec.minors, n = cls === 'core' ? 0 : (spec.notables.length === 4 ? 6 : 4);
    for (let i = 0; i < n; i++) {
      const t = minors[i % minors.length];
      const scale = 1 + Math.floor(i / minors.length) * 0.4;
      const st = {}; for (const k in t) if (t[k]) st[k] = Math.round(t[k] * scale * 10) / 10;
      if (!Object.keys(st).length) st.dmg = 4;
      const label = Object.keys(st).map(k => (NX.STATS[k] ? NX.STATS[k].n : k)).slice(0, 2).join(' + ');
      list.push([label + ' ' + (i + 1), 'minor', st]);
    }
    spec.notables.forEach(nt => list.push([nt.n, 'notable', nt.stats, { ic: nt.ic, d: nt.d }]));
    list.push([spec.key.n, 'key', spec.key.stats, { ic: spec.key.ic, d: spec.key.d, flag: spec.key.flag }]);
    const step = 46, r0 = cls === 'core' ? 52 : 185;
    const r1 = r0 + (list.length - 1) * step;
    chain('t_' + id + '_', cls, spec.angle, r0, r1, list, cls === 'core' ? 0 : 58);
  }

  for (const cid in CLASS_BRANCH) { buildBranch(cid, CLASS_BRANCH[cid], cid); }
  for (const xid in X_BRANCH) { buildBranch('x' + xid, X_BRANCH[xid], 'x' + xid); }

  /* ---------------- index & helpers ---------------- */
  root.byClass = {};
  NX.CLASSK.forEach(c => root.byClass[c] = all.filter(id => nodes[id].cls === c));
  NX.XBRANCHK = Object.keys(X_BRANCH).map(x => 'x' + x);
  NX.XBRANCHK.forEach(x => root.byClass[x] = all.filter(id => nodes[id].cls === x));

  NX.TALENTS = { nodes, root, all };
  NX.KEYSTONES = all.filter(id => nodes[id].kind === 'key' && nodes[id].flag && nodes[id].flag !== 'root');

  /* Portée de stockage : 'core' = global, sinon id de classe/transversal */
  NX.scopeOf = id => nodes[id].cls === 'core' ? 'core' : nodes[id].cls;
  /* Un nœud est-il accessible selon les points alloués d'un scope ? */
  NX.talentAvail = (id, allocated) => {
    const nd = nodes[id]; if (!nd || allocated[id]) return false;
    if (!nd.req.length) return true;
    return nd.req.every(r => allocated[r]);
  };
  NX.talentCount = () => all.length;
})();
