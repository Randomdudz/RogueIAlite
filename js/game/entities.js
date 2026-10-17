/* ============================================================
   NEXUS : Réveil — ENTITÉS
   Structures de données pures + fabriques. La logique (update,
   collisions) vit dans run.js ; les comportements d'IA dans
   behaviors.js.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M;

  /* ---------------- JOUEUR ---------------- */
  NX.makePlayer = function (cls, st, x, y) {
    return {
      kind: 'player', cls, x, y, vx: 0, vy: 0, r: 15,
      face: 1, dir: -Math.PI / 2, moving: 0,
      st, hp: st.maxHp, maxHp: st.maxHp, dead: false,
      invuln: 1.0, hitFlash: 0, level: 1, xp: 0, xpNeed: NX.xpNeed(1),
      weapons: [], items: {}, revives: st.revives, dashCd: 0, dashT: 0, dashDir: { x: 0, y: 0 },
      iframes: 0, regenAcc: 0, kills: 0, gold: 0, magnetT: 0,
      anim: 0, emo: 1, emoT: 0
    };
  };
  NX.xpNeed = l => Math.floor(16 + 12 * Math.pow(l, 1.55));

  /* ---------------- ENNEMI ---------------- */
  NX.makeEnemy = function (defId, x, y, mods, opts) {
    opts = opts || {};
    const d = NX.MONSTERS[defId]; if (!d) return null;
    const eliteMul = opts.elite ? 3.2 : 1;
    const hpMul = (mods.hp || 1) * eliteMul;
    const dmgMul = (mods.dmg || 1) * (opts.elite ? 1.35 : 1);
    const e = {
      kind: 'enemy', def: d, id: defId, col: d.col, acc: d.acc, x, y, vx: 0, vy: 0, r: d.r * (opts.elite ? 1.25 : 1),
      hp: d.hp * hpMul, maxHp: d.hp * hpMul, speed: d.speed * (opts.elite ? 0.92 : 1), dmg: d.dmg * dmgMul,
      xp: d.xp * (opts.elite ? 4 : 1), elite: !!opts.elite, boss: false,
      beh: d.beh, bt: {}, atk: {}, st: {}, status: {}, shield: 0, shieldMax: 0,
      hitFlash: 0, anim: Math.random() * 8, dir: 0, dead: false, spawn: 0.35,
      phase: 0, chip: 0, frozen: 0, knockX: 0, knockY: 0, zig: Math.random() * 6.28,
      markFrom: null, illusion: defId === 'decoy'
    };
    if (d.tags) d.tags.forEach(t => e.status['tag_' + t] = 1);
    return e;
  };

  NX.makeBoss = function (defId, x, y, mods) {
    const d = NX.BOSSES[defId]; if (!d) return null;
    const hpMul = (mods.hp || 1);
    const e = {
      kind: 'enemy', def: d, id: defId, col: d.col, acc: d.acc, x, y, vx: 0, vy: 0, r: d.r,
      hp: d.hp * hpMul, maxHp: d.hp * hpMul, speed: d.speed, dmg: d.dmg * (mods.dmg || 1),
      xp: d.xp, elite: true, boss: true, name: d.n,
      beh: (d.phases[0] || {}).beh || d.beh, bt: {}, atk: {}, st: {}, status: {}, shield: 0, shieldMax: 0,
      hitFlash: 0, anim: 0, dir: 0, dead: false, spawn: 1.1, phase: 0, chip: 0, knockX: 0, knockY: 0, zig: 0
    };
    return e;
  };

  /* ---------------- STATUTS ---------------- */
  NX.applyStatus = function (e, key, dur, dmg, stacks) {
    const S = NX.STATUS[key]; if (!S || e.illusion) return;
    const cur = e.st[key];
    stacks = stacks || 1;
    if (cur) { cur.t = Math.max(cur.t, dur); cur.s = Math.min(S.stack || 1, cur.s + stacks); cur.dmg = Math.max(cur.dmg, dmg); }
    else {
      e.st[key] = { t: dur, s: Math.min(S.stack || 1, stacks), dmg: dmg || 0 };
      if (S.stun) e.frozen = Math.max(e.frozen, S.dur);
    }
    if (S.slow) e.slowT = Math.max(e.slowT || 0, dur), e.slowAmt = S.slow;
    if (S.mark) e.markT = Math.max(e.markT || 0, dur);
    if (S.amp) e.ampT = Math.max(e.ampT || 0, dur), e.ampAmt = S.amp;
    if (S.ampTaken) e.ampTakenT = Math.max(e.ampTakenT || 0, dur), e.ampTakenAmt = S.ampTaken;
    if (S.fear) e.fearT = Math.max(e.fearT || 0, dur);
  };
  /** fait avancer les statuts ; renvoie les dégâts totaux infligés (attribués au joueur) */
  NX.tickStatuses = function (e, dt, run) {
    let total = 0;
    for (const k in e.st) {
      const s = e.st[k], S = NX.STATUS[k];
      s.t -= dt;
      if (S.tick) {
        const dmg = s.dmg * S.tick * s.s * dt;
        total += dmg;
        run.damageEnemy(e, dmg, S.dmg || 'kinetic', { silent: Math.random() > 0.06, status: 1, noCrit: 1 });
      }
      if (S.onMove && (Math.abs(e.vx) + Math.abs(e.vy)) > 5) { const d = s.dmg * S.onMove * dt; total += d; run.damageEnemy(e, d, 'kinetic', { silent: true, noCrit: 1 }); }
      if (s.t <= 0) delete e.st[k];
    }
    if (e.slowT) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
    if (e.markT) e.markT -= dt;
    if (e.ampT) e.ampT -= dt;
    if (e.ampTakenT) e.ampTakenT -= dt;
    if (e.fearT) e.fearT -= dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    return total;
  };

  /* ---------------- PROJECTILES ---------------- */
  NX.makeProjectile = function (o) {
    return Object.assign({
      kind: 'proj', x: 0, y: 0, vx: 0, vy: 0, dmg: 10, dmgType: 'kinetic', size: 8, life: 1.2, maxLife: 1.2,
      pierce: 0, bounce: 0, chain: 0, hit: null, status: null, statusKey: null,
      homing: 0, homingTarget: null, from: null, weapon: null, spin: 0, trail: [], crit: 0, critDmg: 1.5,
      explosive: 0, explosiveDmg: 1, onHitBurst: 0, onDeathBurst: 0, dead: false, wave: 0, wobble: 0
    }, o);
  };

  NX.makeEnemyShot = function (o) {
    return Object.assign({
      kind: 'eshot', x: 0, y: 0, vx: 0, vy: 0, dmg: 6, size: 8, life: 3, maxLife: 3,
      homing: 0, turn: 0, target: null, mark: 0, curse: 0, chain: 0, color: '#ff5d6c', dead: false, spin: 0
    }, o);
  };

  /* ---------------- PICKUPS ----------------
     `life` : durée de vie avant disparition. Les orbes d'XP/butin
     abandonnés loin du joueur ne s'accumulent donc plus sans fin (fuite
     de performance qui faisait ramer le jeu après quelques minutes). */
  const PICKUP_LIFE = { xp: 25, gold: 40, hp: 40, magnet: 45, chest: 1e9 };
  NX.makePickup = function (kind, x, y, value) {
    return { kind, x, y, value: value || 1, r: kind === 'chest' ? 20 : 9, t: 0, vx: 0, vy: 0, pulled: false, dead: false, anim: Math.random() * 6.28, life: PICKUP_LIFE[kind] || 30 };
  };

  /* ---------------- EFFETS (visuel) ---------------- */
  const FX_MAX = 520;
  NX.fx = {
    list: [],
    _texts: 0,
    add(kind, x, y, o) {
      // borne dure : on jette les plus vieux effets par paquets (amorti)
      if (this.list.length >= FX_MAX) {
        const cut = this.list.splice(0, 80);
        for (let i = 0; i < cut.length; i++) if (cut[i].kind === 'text' && this._texts > 0) this._texts--;
      }
      this.list.push(Object.assign({ kind, x, y, t: 0, dur: 0.3, size: 20, color: '#fff', rot: 0, vx: 0, vy: 0 }, o || {}));
    },
    // sous le mode « lisibilité » les étincelles/explosions ne sont pas dessinées :
    // inutile de les créer (économie mémoire + CPU)
    _lite() { return !!(NX.profile && NX.profile.d && NX.profile.d.settings && NX.profile.d.settings.readability); },
    slash(x, y, ang, size, color) { this.add('slash', x, y, { ang, size, color, dur: 0.18 }); },
    ring(x, y, size, color, dur) { this.add('ring', x, y, { size, color, dur: dur || 0.42 }); },
    nova(x, y, size, color) { this.add('nova', x, y, { size, color, dur: 0.5 }); },
    boom(x, y, size, color) { if (this._lite()) return; this.add('boom', x, y, { size, color, dur: 0.4 }); },
    spark(x, y, color, n) { if (this._lite()) return; for (let i = 0; i < (n || 3); i++) { const a = Math.random() * M.TAU, s = 60 + Math.random() * 160; this.add('spark', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, size: 2 + Math.random() * 3, dur: 0.25 + Math.random() * 0.35 }); } },
    bolt(x1, y1, x2, y2, color) { this.add('bolt', x1, y1, { x2, y2, color, dur: 0.16, seg: zigzag(x1, y1, x2, y2) }); },
    beam(x, y, ang, len, w, color, dur) { this.add('beam', x, y, { ang, len, w: w || 8, color, dur: dur || 0.3 }); },
    // plafond de nombres de dégâts simultanés : on évite d'inonder l'écran
    // ET de saturer la liste d'effets dans les gros combats
    text(x, y, txt, color, size) { if (this._texts > 45) return; this._texts++; this.add('text', x, y, { txt, color: color || '#fff', size: size || 13, dur: 0.75, vy: -40 }); },
    update(dt) { const l = this.list; for (let i = l.length - 1; i >= 0; i--) { const f = l[i]; f.t += dt; if (f.vx) f.x += f.vx * dt; if (f.vy) f.y += f.vy * dt; if (f.vx) f.vx *= 0.94; if (f.vy) f.vy *= 0.94; if (f.t >= f.dur) { if (f.kind === 'text' && this._texts > 0) this._texts--; l.splice(i, 1); } } },
    clear() { this.list.length = 0; this._texts = 0; }
  };
  function zigzag(x1, y1, x2, y2) {
    const seg = [], n = 6, dx = x2 - x1, dy = y2 - y1;
    for (let i = 0; i <= n; i++) { const t = i / n; const off = (i === 0 || i === n) ? 0 : (Math.random() - 0.5) * 22; seg.push({ x: x1 + dx * t - dy * 0.02 * off, y: y1 + dy * t + dx * 0.02 * off }); }
    return seg;
  }

  NX.dist2 = M.dist2;
  NX.now = () => performance.now();
})();
