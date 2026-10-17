/* ============================================================
   NEXUS : Réveil — PROFIL JOUEUR (méta-progression)
   Persistant (local + cloud). Contient : compte, points de talent,
   objets, loadout, déblocages, progression, fins, réglages.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;
  const KEY = 'profile';
  const SCHEMA = 3;

  const DEFAULT = () => ({
    v: SCHEMA,
    user: { id: 'local', name: 'Invité', guest: true },
    createdAt: Date.now(), updatedAt: Date.now(), playtime: 0,
    level: 1, xp: 0, points: 0,
    talents: { core: {}, byClass: {} },
    classes: {},                       // { cls:{ plays, best, cleared, deepestLevel } }
    progress: { unlocked: 1, cleared: {}, endings: {} },
    unlocks: { talents: false, shop: false, forge: false, variants: false, loadout: false, nightmare: false },
    credits: 0,
    items: {},                         // { id: { qty, lvl } }
    loadout: [],                       // ids équipés avant run
    story: {},                         // { key: true } scènes vues
    endings: {},                       // { lib, asc, eff, secret }
    stats: { runs: 0, wins: 0, kills: 0, deaths: 0, bossKills: 0, time: 0, deepest: 0, bestScore: 0 },
    lb: [],                            // cache local du classement
    settings: { readability: false, particles: 1, sfx: .6, music: .35, showFps: false, dmgNum: true, autoAim: true, shake: 1 }
  });

  let data = null;
  const clampRoutes = ['progress.unlocked'];

  function ensureClass(c) {
    if (!data.classes[c]) data.classes[c] = { plays: 0, best: 0, cleared: 0, deepestLevel: 0 };
    return data.classes[c];
  }
  function migrate(p) {
    const d = DEFAULT();
    const out = Object.assign(d, p || {});
    out.talents = Object.assign({ core: {}, byClass: {} }, out.talents || {});
    out.talents.core = out.talents.core || {};
    out.talents.byClass = out.talents.byClass || {};
    out.unlocks = Object.assign(d.unlocks, out.unlocks || {});
    out.settings = Object.assign(d.settings, out.settings || {});
    out.stats = Object.assign(d.stats, out.stats || {});
    out.progress = Object.assign(d.progress, out.progress || {});
    out.progress.cleared = out.progress.cleared || {};
    out.v = SCHEMA;
    return out;
  }

  /* purge les nœuds de talent qui n'existent plus (refonte d'arbre) et rend les points */
  function pruneTalents() {
    if (!NX.TALENTS || !data) return;
    let refund = 0;
    const prune = sc => { for (const id in sc) { if (!NX.TALENTS.nodes[id]) { refund += 1; delete sc[id]; } } };
    prune(data.talents.core);
    for (const c in data.talents.byClass) prune(data.talents.byClass[c]);
    if (refund) data.points += refund;
  }
  /* ouvre la méta (talents, marchand, forge) dès la première run terminée */
  function ensureMetaUnlocks() {
    if (!data) return;
    if (data.stats.runs >= 1 || data.stats.wins >= 1) {
      ['talents', 'shop', 'forge', 'loadout'].forEach(f => { data.unlocks[f] = true; });
    }
  }

  const profile = {
    get d() { return data; },

    /* ---------- cycle de vie ---------- */
    load() { data = migrate(NX.store.get(KEY, null) || null); pruneTalents(); ensureMetaUnlocks(); return data; },
    reset(keepUser) {
      const u = data && keepUser ? data.user : null;
      data = DEFAULT(); if (u) data.user = u;
      this.save();
    },
    save() {
      if (!data) return;
      data.updatedAt = Date.now();
      NX.store.set(KEY, data);
      NX.bus.emit('profile:saved', data);
      if (NX.net && NX.net.queueSave) NX.net.queueSave();
      return data;
    },

    /* ---------- XP / niveaux de compte ---------- */
    xpFor(l) { return Math.floor(120 * Math.pow(l, 1.28)); },
    addXp(n) {
      data.xp += Math.max(0, Math.round(n));
      let up = 0;
      while (data.xp >= this.xpFor(data.level)) {
        data.xp -= this.xpFor(data.level); data.level++; up++;
        data.points += 1;                       // 1 point de talent par niveau de compte
      }
      if (up) NX.bus.emit('account:levelup', { level: data.level, points: data.points });
      return up;
    },
    addPoints(n) { data.points += Math.max(0, n); NX.bus.emit('talents:points', data.points); },
    /* conversion Crédits → point de talent (monnaie unique méta) */
    pointCost() { return 150; },
    buyTalentPoint() {
      const c = this.pointCost();
      if (data.credits < c) return { ok: false, need: c - data.credits };
      data.credits -= c; data.points += 1; this.save();
      NX.bus.emit('talents:points', data.points);
      return { ok: true };
    },

    /* ---------- arbre de talents ---------- */
    scopeAlloc(scope) { return scope === 'core' ? data.talents.core : (data.talents.byClass[scope] = data.talents.byClass[scope] || {}); },
    isAllocated(scope, id) { return !!this.scopeAlloc(scope)[id]; },
    nodeState(cls, id) {
      const nd = NX.TALENTS.nodes[id]; if (!nd) return 'unknown';
      const moves = this.nodeMoves(nd);
      return moves;
    },
    // renvoie pour chaque scope d'un nœud : 'owned' | 'avail' | 'can' | 'locked'
    nodeMoves(nd) {
      const scopes = nd.cls === 'core' ? ['core'] : [nd.cls];
      const out = {};
      scopes.forEach(sc => {
        const alloc = this.scopeAlloc(sc);
        if (alloc[nd.id]) { out[sc] = 'owned'; return; }
        out[sc] = NX.talentAvail(nd.id, alloc) ? 'can' : 'locked';
      });
      return out;
    },
    allocate(cls, id) {
      const nd = NX.TALENTS.nodes[id]; if (!nd) return false;
      const sc = NX.scopeOf(id);
      const alloc = this.scopeAlloc(sc);
      if (alloc[id]) return false;
      // une branche de classe n'est ouverte que pour SA classe
      if (nd.cls !== 'core' && nd.cls !== sc) return false;
      if (!NX.talentAvail(id, alloc)) return false;
      if (data.points < nd.cost) return false;
      data.points -= nd.cost; alloc[id] = 1; this.save();
      NX.bus.emit('talent:alloc', { id, cls }); return true;
    },
    // Vérifie qu'un nœud peut être pris côté UI (avec la classe jouée)
    canTake(cls, id) {
      const nd = NX.TALENTS.nodes[id]; if (!nd) return false;
      const sc = NX.scopeOf(id);
      if (nd.cls !== 'core' && nd.cls !== cls) return false;
      const alloc = this.scopeAlloc(sc);
      return !alloc[id] && NX.talentAvail(id, alloc) && data.points >= nd.cost;
    },
    respecCost(cls) {
      const alloc = data.talents.byClass[cls] || {};
      const spent = Object.keys(alloc).reduce((s, id) => s + (NX.TALENTS.nodes[id] ? NX.TALENTS.nodes[id].cost : 0), 0);
      return Math.round(80 + spent * 12);
    },
    respec(cls) {
      const cost = this.respecCost(cls);
      if (data.credits < cost) return { ok: false, need: cost - data.credits };
      let refund = 0;
      const alloc = data.talents.byClass[cls] || {};
      for (const id in alloc) if (NX.TALENTS.nodes[id]) refund += NX.TALENTS.nodes[id].cost;
      data.credits -= cost; data.points += refund; data.talents.byClass[cls] = {};
      this.save(); NX.bus.emit('talent:respec', { cls }); return { ok: true, refund };
    },
    spentPoints(cls) {
      const core = Object.keys(data.talents.core).reduce((s, id) => s + (NX.TALENTS.nodes[id] ? NX.TALENTS.nodes[id].cost : 0), 0);
      const bc = Object.keys(data.talents.byClass[cls] || {}).reduce((s, id) => s + (NX.TALENTS.nodes[id] ? NX.TALENTS.nodes[id].cost : 0), 0);
      return core + bc;
    },

    /* ---------- objets ---------- */
    addItem(id, n) {
      const it = data.items[id] || (data.items[id] = { qty: 0, lvl: 0 });
      it.qty += (n || 1); this.save(); return it;
    },
    itemCount(id) { return data.items[id] ? data.items[id].qty : 0; },
    forgeCost(id) { const it = data.items[id]; const l = it ? it.lvl : 0; return Math.round(60 * Math.pow(1.9, l)); },
    forgeUpgrade(id) {
      const it = data.items[id]; if (!it) return { ok: false };
      if (it.lvl >= 4) return { ok: false, max: true };
      const c = this.forgeCost(id); if (data.credits < c) return { ok: false, need: c - data.credits };
      data.credits -= c; it.lvl++; this.save(); NX.bus.emit('item:forge', { id, lvl: it.lvl }); return { ok: true, lvl: it.lvl };
    },
    autoEquip() {
      // équipe automatiquement les meilleurs objets possédés (si rien d'équipé)
      if (data.loadout.length) return;
      const owned = Object.keys(data.items).filter(k => data.items[k].qty > 0);
      owned.sort((a, b) => (NX.ITEMS[b].r - NX.ITEMS[a].r) || (data.items[b].lvl - data.items[a].lvl));
      data.loadout = owned.slice(0, this.loadoutCap());
      this.save();
    },
    loadoutCap() { return 6; },
    toggleEquip(id) {
      const i = data.loadout.indexOf(id);
      if (i >= 0) data.loadout.splice(i, 1);
      else { if (data.loadout.length >= this.loadoutCap()) return { ok: false, full: true }; data.loadout.push(id); }
      this.save(); return { ok: true };
    },

    /* ---------- déblocages / progression ---------- */
    unlock(feat) { if (!data.unlocks[feat]) { data.unlocks[feat] = true; this.save(); NX.bus.emit('unlock', feat); return true; } return false; },
    isUnlocked(feat) { return !!data.unlocks[feat]; },
    classUnlocked(cls) {
      const c = NX.CLASSES[cls]; if (!c.unlock || !c.unlock.n) return true;
      const req = NX.CLASSES[c.unlock.n];
      const st = data.classes[c.unlock.n] || { best: 0 };
      return st.best >= (c.unlock.lvl || 0);
    },
    clearLevel(i, cls) {
      data.progress.cleared[i] = 1;
      data.progress.unlocked = Math.max(data.progress.unlocked, Math.min(NX.LEVELS.length, i + 1));
      const st = ensureClass(cls); st.cleared = Math.max(st.cleared, i);
      st.deepestLevel = Math.max(st.deepestLevel || 0, i);
      this.save();
    },
    /** Enregistre une run terminée. info = {cls, level, win, time, kills, credits, xp, score, best} */
    recordRun(info) {
      const st = ensureClass(info.cls);
      st.plays++; st.best = Math.max(st.best, info.reached || 0);
      st.deepestLevel = Math.max(st.deepestLevel || 0, info.reached || 0);
      data.stats.runs++;
      if (info.win) data.stats.wins++;
      // la méta (talents, marchand, forge) s'ouvre dès la première run terminée
      if (data.stats.runs === 1) ['talents', 'shop', 'forge', 'loadout'].forEach(f => this.unlock(f));
      data.stats.kills += info.kills || 0;
      data.stats.bossKills += info.bossKills || 0;
      data.stats.time += info.time || 0;
      data.stats.deepest = Math.max(data.stats.deepest, info.reached || 0);
      data.stats.bestScore = Math.max(data.stats.bestScore, info.score || 0);
      data.playtime += (info.time || 0) * 1000;
      data.credits += Math.max(0, info.credits || 0);
      this.addXp(info.xp || 0);
      if (info.points) this.addPoints(info.points);
      this.save();
      NX.bus.emit('run:recorded', info);
    },
    seeStory(key) { if (!data.story[key]) { data.story[key] = 1; this.save(); } },
    setEnding(k) {
      data.endings[k] = 1; data.progress.endings[k] = 1;
      this.save();
      if (Object.keys(data.endings).length >= 4) this.unlock('true_end');
      NX.bus.emit('ending', k);
    },
    endingsCount() { return ['lib', 'asc', 'eff', 'secret'].filter(k => data.endings[k]).length; },
    secretUnlocked() { return ['lib', 'asc', 'eff'].every(k => data.endings[k]); },

    /* ---------- classement local ---------- */
    pushScore(entry) {
      data.lb.push(Object.assign({ name: data.user.name, date: Date.now() }, entry));
      data.lb.sort((a, b) => b.score - a.score);
      data.lb = data.lb.slice(0, 50);
      this.save();
    },

    /* ---------- fusion cloud (le plus avancé gagne) ---------- */
    mergeRemote(remote) {
      if (!remote) return false;
      const r = migrate(remote);
      // on garde le meilleur des deux sur les axes de progression
      if (r.level > data.level) { data.level = r.level; }
      if (r.xp > data.xp) data.xp = r.xp;
      if (r.points > data.points) data.points = r.points;
      data.credits = Math.max(data.credits, r.credits);
      data.progress.unlocked = Math.max(data.progress.unlocked, r.progress.unlocked);
      for (const k in r.progress.cleared) data.progress.cleared[k] = 1;
      for (const k in r.unlocks) if (r.unlocks[k]) data.unlocks[k] = 1;
      for (const k in r.story) data.story[k] = 1;
      for (const k in r.endings) data.endings[k] = 1;
      for (const k in r.progress.endings) data.progress.endings[k] = 1;
      // talents : on garde le max
      for (const k in r.talents.core) data.talents.core[k] = 1;
      for (const c in r.talents.byClass) {
        data.talents.byClass[c] = data.talents.byClass[c] || {};
        for (const k in r.talents.byClass[c]) data.talents.byClass[c][k] = 1;
      }
      // objets : on prend le meilleur
      for (const k in r.items) {
        const a = data.items[k], b = r.items[k];
        if (!a) data.items[k] = b; else { a.qty = Math.max(a.qty, b.qty); a.lvl = Math.max(a.lvl, b.lvl); }
      }
      for (const c in r.classes) {
        const a = ensureClass(c), b = r.classes[c];
        a.plays = Math.max(a.plays, b.plays); a.best = Math.max(a.best, b.best);
        a.cleared = Math.max(a.cleared, b.cleared); a.deepestLevel = Math.max(a.deepestLevel || 0, b.deepestLevel || 0);
      }
      data.stats.kills = Math.max(data.stats.kills, r.stats.kills);
      data.stats.bossKills = Math.max(data.stats.bossKills, r.stats.bossKills);
      data.stats.bestScore = Math.max(data.stats.bestScore, r.stats.bestScore);
      this.save(); return true;
    },
    serialize() { return NX.deep(data); }
  };

  // constante référencée plus haut (évite la variable morte)
  void clampRoutes;
  NX.profile = profile;
})();
