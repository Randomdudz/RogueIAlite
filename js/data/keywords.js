/* ============================================================
   NEXUS : Réveil — MÉTA-DONNÉES
   Types de dégâts, statuts, raretés, familles de monstres, stats.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;

  /* ---------- Types de dégâts ---------- */
  NX.DMSG = {
    kinetic: { n: 'Cinétique', c: '#d8e2ee', i: '⚙' },
    pierce: { n: 'Perçage', c: '#6ff0ff', i: '➤' },
    thermal: { n: 'Thermique', c: '#ff9a55', i: '🔥' },
    emp: { n: 'EMP', c: '#ffd94d', i: '⚡' },
    corrosion: { n: 'Corrosion', c: '#8bff6b', i: '☣' },
    void: { n: 'Void', c: '#c48bff', i: '✦' }
  };
  NX.DMGK = Object.keys(NX.DMSG);

  /* ---------- Statuts (effets sur la durée) ----------
     tick = dégâts par seconde (fraction des dégâts appliqués)            */
  NX.STATUS = {
    burn: { n: 'Brûlure', c: '#ff7a3c', i: '🔥', tick: 0.8, dur: 3, stack: 5, dmg: 'thermal' },
    shock: { n: 'Choc', c: '#ffd94d', i: '⚡', tick: 0.4, dur: 2.5, stack: 5, dmg: 'emp' },
    virus: { n: 'Virus', c: '#8bff6b', i: '☣', tick: 0.6, dur: 4, stack: 8, dmg: 'corrosion', spread: 1 },
    bleed: { n: 'Hémorragie', c: '#ff5d6c', i: '🩸', tick: 0.7, dur: 3, stack: 6, dmg: 'kinetic', onMove: 1.6 },
    slow: { n: 'Ralenti', c: '#7fb4ff', i: '❄', slow: 0.35, dur: 2.5, stack: 1 },
    mark: { n: 'Marqué', c: '#ff4d94', i: '◎', amp: 0.25, dur: 6, stack: 1 },
    stun: { n: 'Quarantaine', c: '#ccd6e0', i: '⛔', stun: 1, dur: 1.4, stack: 1 },
    fear: { n: 'Panique', c: '#c9a2ff', i: '😱', fear: 1, dur: 2.2, stack: 1 },
    curse: { n: 'Malédiction', c: '#a06bff', i: '👁', ampTaken: 0.2, dur: 5, stack: 3 }
  };

  /* ---------- Raretés ---------- */
  NX.RARITY = [
    { n: 'Commun', c: '#8aa0b8', cls: 'r1' },
    { n: 'Rare', c: '#5cc8ff', cls: 'r2' },
    { n: 'Épique', c: '#b26bff', cls: 'r3' },
    { n: 'Légendaire', c: '#ffb03a', cls: 'r4' },
    { n: 'Mythique', c: '#ff4d94', cls: 'r5' }
  ];

  /* ---------- Familles de monstres ---------- */
  NX.FAM = {
    bureau: { n: 'Bureaucratie', c: '#d9c39a', d: 'Humains de bureau. Mêlée, jets de dossiers, buffs d’équipe.' },
    machine: { n: 'Machines', c: '#8fa3bd', d: 'Robots et automates. Charges, rotations, explosions.' },
    reseau: { n: 'Réseau', c: '#5cc8ff', d: 'Équipements réseau. Tirs, blocages, placement.' },
    secu: { n: 'Sécurité', c: '#ff5d6c', d: 'Antivirus et sentinelles. Lasers, quarantaine, téléportation.' },
    cloud: { n: 'Cloud', c: '#9fd8ff', d: 'Serveurs et caches. Invocations, zones au sol, soins.' },
    corruption: { n: 'Corruption', c: '#8bff6b', d: 'Bugs et malwares. Division, explosion, fuites.' },
    elite: { n: 'Élites humaines', c: '#ffb03a', d: 'Ingénieurs et cadres. Buffent, soignent, invoquent.' },
    num: { n: 'Créatures numériques', c: '#c48bff', d: 'Êtres nés du réseau. Guidés, illusions, malédictions.' }
  };

  /* ---------- Statistiques (modificateurs) ----------
     flat : additionné ; pct : pourcentage (tous les autres).
     inv  : valeur « de réduction » (recharge) affichée comme telle.       */
  const ST = {
    dmg: { n: 'Dégâts', u: '%', g: 'off' },
    dmg_kinetic: { n: 'Dégâts cinétiques', u: '%', g: 'off' },
    dmg_pierce: { n: 'Dégâts de perçage', u: '%', g: 'off' },
    dmg_thermal: { n: 'Dégâts thermiques', u: '%', g: 'off' },
    dmg_emp: { n: 'Dégâts EMP', u: '%', g: 'off' },
    dmg_corrosion: { n: 'Dégâts de corrosion', u: '%', g: 'off' },
    dmg_void: { n: 'Dégâts Void', u: '%', g: 'off' },
    area: { n: 'Zone d’effet', u: '%', g: 'off' },
    cd: { n: 'Recharge', u: '%', g: 'off', inv: 1 },
    projSpeed: { n: 'Vitesse des projectiles', u: '%', g: 'off' },
    dur: { n: 'Durée des effets', u: '%', g: 'off' },
    crit: { n: 'Chance de critique', u: '%', g: 'off' },
    critDmg: { n: 'Dégâts critiques', u: '%', g: 'off' },
    count: { n: 'Projectiles', u: '', g: 'off', flat: 1 },
    statusChance: { n: 'Chance de statut', u: '%', g: 'off' },
    summonDmg: { n: 'Dégâts des invocations', u: '%', g: 'off' },
    hp: { n: 'PV', u: '', g: 'def', flat: 1 },
    hpPct: { n: 'PV', u: '%', g: 'def' },
    armor: { n: 'Armure', u: '', g: 'def', flat: 1 },
    dodge: { n: 'Esquive', u: '%', g: 'def' },
    thorns: { n: 'Épines', u: '', g: 'def', flat: 1 },
    lifesteal: { n: 'Vol de vie', u: '%', g: 'def' },
    regen: { n: 'Régénération', u: '/s', g: 'def', flat: 1 },
    revive: { n: 'Réanimation', u: '', g: 'def', flat: 1 },
    speed: { n: 'Vitesse', u: '%', g: 'util' },
    pickup: { n: 'Rayon de ramassage', u: '%', g: 'util' },
    xpGain: { n: 'Data gagnée', u: '%', g: 'util' },
    goldGain: { n: 'Crédits gagnés', u: '%', g: 'util' },
    luck: { n: 'Chance', u: '%', g: 'util' },
    magnetDur: { n: 'Aimant', u: 's', g: 'util', flat: 1 }
  };
  NX.STATS = ST;
  NX.STATK = Object.keys(ST);

  /* Formate un modificateur pour l'affichage : ['+10%','Dégâts'] */
  NX.fmtStat = function (key, val) {
    const m = ST[key] || { n: key, u: '' };
    const sign = val > 0 ? '+' : '';
    return { txt: sign + (Math.round(val * 10) / 10) + m.u, name: m.n, neg: val < 0, key };
  };
})();
