/* ============================================================
   NEXUS : Réveil — SYSTÈME DE STATISTIQUES
   Agrège : stats de classe + talents (tronc commun, classe,
   transversaux) + objets (loadout + ramassés en run) + choix de
   montée de niveau. Produit un objet Stats avec des multiplicateurs
   prêts à l'emploi, et résout les armes (variante + niveau).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M;
  NX.BASE = { hp: 124, speed: 208, crit: 5, critDmg: 150, regen: 0.8 };

  const FLAT = { hp: 1, armor: 1, thorns: 1, regen: 1, count: 1, revive: 1, magnetDur: 1 };

  function bag() { return { s: {}, flags: {}, items: 0 }; }
  function add(b, mods) {
    if (!mods) return b;
    for (const k in mods) {
      if (k === 'flags') { for (const f in mods.flags) b.flags[f] = (b.flags[f] || 0) + mods.flags[f]; continue; }
      if (k === 'flag') { b.flags[mods[k]] = (b.flags[mods[k]] || 0) + 1; continue; }
      if (typeof mods[k] === 'number') b.s[k] = (b.s[k] || 0) + mods[k];
    }
    return b;
  }

  /* ---------- Construit les stats d'une run ----------
     classId : classe jouée
     picks   : [{type:'weapon'|'variant'|'item'|'stat', id, stats?}] (ramassés pendant la run)
     opts    : { nightmare, loadoutOverride } */
  NX.buildStats = function (classId, picks, opts) {
    opts = opts || {};
    const cls = NX.CLASSES[classId];
    const b = bag();
    const p = NX.profile.d;

    // 1) classe
    b.base = Object.assign({}, NX.BASE, cls.base || {});
    const clsSpeed = (cls.base && cls.base.speed) || 100;

    // 2) perk de classe
    if (cls.perk && cls.perk.stats) add(b, cls.perk.stats);
    if (cls.perk && cls.perk.flag) b.flags[cls.perk.flag] = 1;

    // 3) talents : tronc commun (global) + branche de classe + transversaux (par classe)
    const addAlloc = (scope) => {
      const alloc = scope === 'core' ? p.talents.core : (p.talents.byClass[scope] || {});
      for (const id in alloc) { const nd = NX.TALENTS.nodes[id]; if (nd) { add(b, nd.stats); if (nd.flag) b.flags[nd.flag] = (b.flags[nd.flag] || 0) + 1; } }
    };
    addAlloc('core');
    addAlloc(classId);
    addAlloc('x');   // branches transversales (globales)

    // 4) objets équipés (loadout) + ramassés en run
    const gear = (opts.loadoutOverride || p.loadout || []);
    gear.forEach(id => { const it = NX.ITEMS[id]; if (it) { add(b, scaledItem(it, p.items[id] ? p.items[id].lvl : 0)); b.items++; } });
    picks.forEach(k => {
      if (k.type === 'item') { const it = NX.ITEMS[k.id]; if (it) { add(b, it.stats); b.items++; } }
      else if (k.type === 'stat' && k.stats) add(b, k.stats);
    });

    const s = b.s;
    const F = b.flags;

    // 5) flags de keystone → effets réels
    let dmgMul = 1 + (s.dmg || 0) / 100;
    let dmgTaken = 1;
    if (F.gc) dmgMul *= (1 + 0.02 * Math.min(30, b.items));
    if (F.hyperthread) dmgMul *= 0.8;
    if (F.sandbox) { dmgMul *= 0.8; }
    if (F.overclock) dmgTaken *= 1.25;

    const st = {
      cls: classId, base: b.base, raw: s, flags: F, itemCount: b.items,
      maxHp: (b.base.hp + (s.hp || 0)) * (1 + (s.hpPct || 0) / 100),
      regen: (b.base.regen || 0) + (s.regen || 0),
      armor: (b.base.armor || 0) + (s.armor || 0),
      thorns: (s.thorns || 0),
      lifesteal: (s.lifesteal || 0) / 100,
      dodge: M.clamp((s.dodge || 0) / 100, 0, 0.75),
      revives: (s.revive || 0),
      speedMul: (clsSpeed / 100) * (1 + (s.speed || 0) / 100),
      dmgMul: dmgMul,
      dmgTakenMul: dmgTaken,
      areaMul: 1 + (s.area || 0) / 100,
      cdMul: 1 / (1 + (s.cd || 0) / 100),
      projSpeedMul: 1 + (s.projSpeed || 0) / 100,
      durMul: 1 + (s.dur || 0) / 100,
      crit: M.clamp((b.base.crit || 0) + (s.crit || 0), 0, 100),
      critDmg: ((b.base.critDmg || 150) + (s.critDmg || 0)) / 100,
      pickupMul: 1 + (s.pickup || 0) / 100,
      xpMul: 1 + (s.xpGain || 0) / 100,
      goldMul: 1 + (s.goldGain || 0) / 100,
      luckMul: 1 + (s.luck || 0) / 100,
      countBonus: (s.count || 0),
      statusChance: (s.statusChance || 0) / 100,
      statusDur: 1 + (s.dur || 0) / 100,
      summonMul: 1 + (s.summonDmg || 0) / 100,
      magnetDur: (s.magnetDur || 0),
      summonCap: 4 + (F['summonCap+1'] ? 1 : 0) + (F['summonCap+2'] ? 2 : 0) + (F.autoscale ? 2 : 0),
      levelupChoices: 3 + (F['levelup+1'] ? 1 : 0) + (cls.perk && cls.perk.flag === 'levelup+1' ? 0 : 0)
    };
    if (F.recursive) { st.aoeMul = 1.6; st.singleMul = 0.7; }
    st.typeMul = t => 1 + ((s['dmg_' + t] || 0) / 100);
    st.summary = () => statLines(st);
    return st;
  };

  /** Objet forgé : chaque niveau de forge ajoute ~8% à ses valeurs. */
  function scaledItem(it, lvl) {
    if (!lvl) return it.stats;
    const out = {};
    for (const k in it.stats) out[k] = Math.round(it.stats[k] * (1 + 0.08 * lvl) * 10) / 10;
    return out;
  }
  NX.scaledItem = scaledItem;

  function statLines(st) {
    const L = [];
    const push = (n, v, pct) => { if (Math.abs(v) > 0.001) L.push({ n, txt: (v > 0 ? '+' : '') + (Math.round(v * 10) / 10) + (pct ? '%' : ''), neg: v < 0 }); };
    push('Dégâts', Math.round((st.dmgMul - 1) * 100), true);
    push('PV', Math.round(st.maxHp));
    push('Vitesse d’attaque', Math.round((1 / st.cdMul - 1) * 100), true);
    push('Zone', Math.round((st.areaMul - 1) * 100), true);
    push('Vitesse de déplacement', Math.round((st.speedMul - 1) * 100), true);
    push('Critique', Math.round(st.crit), true);
    push('Dégâts critiques', Math.round((st.critDmg - 1) * 100), true);
    push('Armure', Math.round(st.armor));
    push('Régénération', Math.round(st.regen * 10) / 10);
    push('Esquive', Math.round(st.dodge * 100), true);
    push('Vol de vie', Math.round(st.lifesteal * 100), true);
    push('Data', Math.round((st.xpMul - 1) * 100), true);
    push('Crédits', Math.round((st.goldMul - 1) * 100), true);
    push('Chance de statut', Math.round(st.statusChance * 100), true);
    push('Projectiles', Math.round(st.countBonus));
    return L;
  }
  NX.statLines = statLines;

  /* ============================================================
     RÉSOLUTION D'ARME : variante + niveau → valeurs effectives
     ============================================================ */
  const PCT_KEYS = { dmg: 1, cd: 1, size: 1, speed: 1, spread: 1, range: 1, dur: 1, life: 1, tick: 1, knock: 1, heal: 1 };
  const FLAT_KEYS = { count: 1, pierce: 1, bounce: 1, chain: 1, maxAdd: 1, onHitBurst: 1, onDeathBurst: 1, explode: 1 };

  function applyMods(base, mods) {
    if (!mods) return base;
    for (const k in mods) {
      const v = mods[k];
      if (k === 'stats' || k === 'status' || k === 'spread') { if (k === 'spread') { /* traité comme % */ } }
      if (k === 'stats') continue;
      if (k === 'explodeSizePct') { base.explode = (base.explode || 60) * (1 + v / 100); continue; }
      if (k === 'maxAdd') { base.max = (base.max || 4) + v; continue; }
      if (FLAT_KEYS[k]) { base[k] = (base[k] || 0) + v; continue; }
      if (PCT_KEYS[k] || true) { base[k] = (base[k] || 0) * (1 + v / 100); }
    }
    return base;
  }
  NX.applyMods = applyMods;

  NX.resolveWeapon = function (wid, variantId, lvl, st) {
    const w = NX.WEAPONS[wid]; if (!w) return null;
    const base = Object.assign({}, w.base);
    const v = variantId ? NX.WVARIANT[variantId] : null;
    if (v && v.mods) applyMods(base, v.mods);
    const L = Math.max(1, lvl || 1);
    const lvlDmg = 1 + 0.19 * (L - 1);
    const lvlCd = Math.max(0.62, 1 - 0.035 * (L - 1));
    // multiplicateurs joueur (les invocations profitent de summonMul)
    const isSummon = w.mode === 'summon';
    const pmul = st.dmgMul * (isSummon ? st.summonMul : 1) * st.typeMul(w.dmg || 'kinetic');
    const out = {
      id: wid, lvl: L, variant: variantId,
      mode: w.mode, dmgType: w.dmg, tags: (w.tags || []).slice(),
      name: w.n, ic: w.ic,
      dmg: (base.dmg || 0) * lvlDmg * pmul,
      cd: Math.max(0.06, (base.cd || 1) * st.cdMul * lvlCd),
      count: Math.max(1, Math.round((base.count || 1) + (base.count ? st.countBonus : 0))),
      spread: base.spread || 0,
      speed: (base.speed || 0) * st.projSpeedMul,
      pierce: Math.max(0, Math.round(base.pierce || 0)),
      bounce: Math.max(0, Math.round(base.bounce || 0)),
      chain: Math.max(0, Math.round(base.chain || 0)),
      size: (base.size || 10) * st.areaMul,
      range: (base.range || 200) * st.areaMul,
      dur: (base.dur || 0) * st.durMul,
      life: (base.life || 1),
      tick: (base.tick || 0) * (1 / Math.max(0.5, st.cdMul)) ,
      knock: base.knock || 0,
      explode: base.explode ? base.explode * st.areaMul : 0,
      explodeDmg: base.explodeDmg || 1,
      heal: base.heal || 0,
      heroHeal: base.heroHeal || 0,
      max: base.max || 3,
      status: (v && v.mods && v.mods.status) || base.status || null,
      spreadShot: v && v.mods && v.mods.spreadShot,
      onHitBurst: (v && v.mods && v.mods.onHitBurst) || base.onHitBurst || 0,
      onDeathBurst: (v && v.mods && v.mods.onDeathBurst) || base.onDeathBurst || 0,
      homing: base.homing || 0, sweep: base.sweep || 0, pull: base.pull || 0,
      block: base.block || 0, mirror: base.mirror || 0, phase: base.phase || 0,
      falloff: base.falloff || 0, spreadRad: (base.spread || 0)
    };
    // critique moyen ajouté au dmg (les critiques sont tirés au moment du coup ; on expose les chances)
    out.crit = st.crit / 100; out.critDmg = st.critDmg;
    return out;
  };
})();
