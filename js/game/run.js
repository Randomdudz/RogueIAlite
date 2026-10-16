/* ============================================================
   NEXUS : Réveil — CŒUR D'UNE RUN
   Survie, tir automatique, collisions, montées de niveau, boss,
   butin, évolutions d'armes. Le renderer ne fait que dessiner.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M, fx = NX.fx;

  const MAX_WEAPONS = 6, MAX_WLVL = 8;
  const TARGET_XP_PER_LEVEL = 1.0;

  class Run {
    constructor(levelIndex, cls, opts) {
      opts = opts || {};
      this.levelIndex = levelIndex;
      this.level = NX.LEVELS[levelIndex - 1];
      this.cls = cls;
      this.opts = opts;
      this.nightmare = !!opts.nightmare;
      this.rng = new NX.RNG(opts.seed || (Date.now() & 0xffffffff));
      this.speed = opts.speed || 1;                  // multiplicateur global de vitesse (options)
      this.extraPicks = [];

      // stats (talents + loadout) puis perks de choix
      const st = NX.buildStats(cls, this.extraPicks, { nightmare: this.nightmare });
      this.stats = st;
      this.player = NX.makePlayer(cls, st, 0, 0);

      // arme de départ
      const startW = NX.CLASSES[cls].start;
      this.addWeapon(startW, null, 1);
      // don offert par la classe Compilateur (variante)
      if (NX.CLASSES[cls].perk && NX.CLASSES[cls].perk.kind === 'variantGift' && NX.WEAPONS[startW].variants) {
        this.player.weapons[0].variant = NX.WEAPONS[startW].variants[0].id;
      }

      this.enemies = []; this.projs = []; this.eshots = []; this.pickups = [];
      this.zones = []; this.summons = []; this.orbs = []; this.fields = []; this.mines = [];

      this.time = 0; this.spawnT = 1.2; this.spawnRamp = 0;
      this.state = 'play';
      this.bossSpawned = false; this.boss = null;
      this.pending = 0; this.choices = null;
      this.kills = 0; this.bossKills = 0; this.goldRun = 0; this.xpRun = 0;
      this.shake = 0; this.hitStop = 0;
      this.score = 0; this.reached = levelIndex;
      this.warned = {};

      // obstacle décoratif (props) pour la lisibilité
      this.props = this.makeProps();
      this.magnetT = 0;
    }

    /* ================= DÉCOR ================= */
    makeProps() {
      const out = [], env = this.level.env, n = 26;
      for (let i = 0; i < n; i++) out.push({ x: (this.rng.f() - 0.5) * 2400, y: (this.rng.f() - 0.5) * 2400, s: 0.6 + this.rng.f() * 0.9, k: env, rot: this.rng.f() * M.TAU });
      return out;
    }

    /* ================= ARMES ================= */
    hasWeapon(id) { return this.player.weapons.some(w => w.id === id); }
    weaponOf(id) { return this.player.weapons.find(w => w.id === id); }
    addWeapon(id, variant, lvl) {
      const w = { id, variant: variant || null, lvl: lvl || 1, t: 0.2, ang: 0, sub: 0 };
      this.player.weapons.push(w);
      if (this.player.weapons.length > MAX_WEAPONS) this.player.weapons.pop();
      return w;
    }
    addItem(id) { this.player.items[id] = (this.player.items[id] || 0) + 1; }
    rebuildStats() {
      const ratio = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
      this.stats = NX.buildStats(this.cls, this.extraPicks, { nightmare: this.nightmare });
      this.player.st = this.stats;
      this.player.maxHp = this.stats.maxHp;
      this.player.hp = Math.min(this.player.maxHp, Math.max(this.player.hp, this.player.maxHp * ratio));
    }

    /* ================= CIBLAGE ================= */
    target(x, y, maxR) {
      let best = null, bd = maxR ? maxR * maxR : 1e9;
      const ex = x == null ? this.player.x : x, ey = y == null ? this.player.y : y;
      for (const e of this.enemies) {
        if (e.dead || e.illusion) continue;
        const d = M.dist2(ex, ey, e.x, e.y);
        const prio = e.boss ? 0.35 : e.elite ? 0.6 : 1;
        if (d * prio < bd) { bd = d * prio; best = e; }
      }
      return best;
    }
    nearestTo(x, y, exclude) {
      let best = null, bd = 1e9;
      for (const e of this.enemies) { if (e.dead || e === exclude || e.illusion) continue; const d = M.dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      return best;
    }

    /* ================= BOUCLE ================= */
    update(dt) {
      if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.25; }
      fx.update(dt);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.5);
      if (this.state === 'levelup' || this.state === 'won' || this.state === 'dead') { this.updatePickups(dt); return; }

      this.time += dt;
      this.updatePlayer(dt);
      this.updateWeapons(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateEnemyShots(dt);
      this.updateSummons(dt);
      this.updateFields(dt);
      this.updateZones(dt);
      this.updatePickups(dt);
      this.updateSpawner(dt);
      this.checkEvolutions();
    }

    /* ---------- joueur ---------- */
    updatePlayer(dt) {
      const p = this.player;
      p.anim += dt * (p.moving > 0.1 ? 9 : 3);
      if (p.emoT > 0) { p.emoT -= dt; if (p.emoT <= 0) p.emo = 1; }
      if (p.invuln > 0) p.invuln -= dt;
      if (p.iframes > 0) p.iframes -= dt;
      if (p.hitFlash > 0) p.hitFlash -= dt;
      if (p.stunT > 0) { p.stunT -= dt; p.moving = 0; return; }
      let slow = p.slowT > 0 ? 0.55 : 1; if (p.slowT > 0) p.slowT -= dt;

      const ax = NX.input.axis();
      const sp = NX.BASE.speed * this.stats.speedMul * slow * (p.dashT > 0 ? 3.4 : 1);
      if (p.dashT > 0) {
        p.dashT -= dt;
        p.x += p.dashDir.x * sp * dt; p.y += p.dashDir.y * sp * dt;
        fx.add('dash', p.x, p.y, { dur: 0.3, color: '#7ff0ff' });
      } else {
        p.x += ax.x * sp * dt; p.y += ax.y * sp * dt;
        p.moving = Math.hypot(ax.x, ax.y);
      }
      // dash
      if (p.dashCd > 0) p.dashCd -= dt;
      if (NX.input.isPressed('dash') && p.dashCd <= 0) {
        p.dashCd = 2.4; p.dashT = 0.16; p.iframes = Math.max(p.iframes, 0.3);
        const a = (ax.x || ax.y) ? Math.atan2(ax.y, ax.x) : p.dir;
        p.dashDir = { x: Math.cos(a), y: Math.sin(a) };
        this.sound('dash'); fx.ring(p.x, p.y, 26, '#7ff0ff', 0.3);
      }
      // régénération
      if (this.stats.regen) { p.regenAcc += this.stats.regen * dt; if (p.regenAcc >= 1) { const h = Math.floor(p.regenAcc); p.regenAcc -= h; p.hp = Math.min(p.maxHp, p.hp + h); } }
      // aimant
      if (p.magnetT > 0) p.magnetT -= dt;
      // dégâts des zones hostiles : on retient UNIQUEMENT la zone la plus
      // dangereuse, et on applique des ticks lents (pas de cumul par frame,
      // sinon rester 2 s dans deux flaques tue instantanément).
      let maxZone = 0;
      for (const z of this.zones) {
        if (!z.hostile) continue;
        if (M.dist2(p.x, p.y, z.x, z.y) < (z.r + p.r) ** 2) maxZone = Math.max(maxZone, z.dmg);
      }
      if (maxZone > 0) {
        p.zoneAcc = (p.zoneAcc || 0) + dt;
        if (p.zoneAcc >= 0.3) { p.zoneAcc = 0; this.hurtPlayer(maxZone * 0.3 * 1.6, null, { dot: 1 }); }
      } else p.zoneAcc = 0;
    }

    /* ---------- armes ---------- */
    updateWeapons(dt) {
      const p = this.player;
      p.weapons.forEach(w => {
        const def = NX.WEAPONS[w.id]; if (!def) return;
        const res = NX.resolveWeapon(w.id, w.variant, w.lvl, this.stats);
        if (def.mode === 'aura') { this.tickAura(w, res, dt); return; }
        if (def.mode === 'orbit') { this.tickOrbit(w, res); return; }
        if (def.mode === 'summon') { this.tickSummon(w, res, dt); return; }
        w.t -= dt;
        if (w.t > 0) return;
        w.t = res.cd;
        this.fire(w, res);
      });
    }

    fire(w, res) {
      const p = this.player, mode = res.mode;
      const tgt = this.target();
      const aim = tgt ? M.ang(p.x, p.y, tgt.x, tgt.y) : p.dir;
      p.dir = aim; p.face = Math.cos(aim) >= 0 ? 1 : -1;
      if (mode === 'melee') return this.melee(w, res, aim);
      if (mode === 'nova') return this.nova(w, res);
      if (mode === 'chain') return this.chain(w, res);
      if (mode === 'field') return this.deployField(w, res, aim);
      if (mode === 'deploy') return this.deployMine(w, res);
      return this.shootWeapon(w, res, aim);
    }

    shootWeapon(w, res, aim) {
      const p = this.player, n = res.count;
      for (let k = 0; k < n; k++) {
        const a = aim + (n > 1 ? (k / (n - 1) - 0.5) * (res.spread || 0.12) : 0) ;
        const sp = res.speed;
        const proj = NX.makeProjectile({
          x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          dmg: res.dmg, dmgType: res.dmgType, size: res.size, life: res.life, maxLife: res.life,
          pierce: res.pierce, bounce: res.bounce, status: res.status && NX.STATUS[res.status], statusKey: res.status,
          homing: res.homing, explosive: res.explode, explosiveDmg: res.explodeDmg,
          onHitBurst: res.onHitBurst, onDeathBurst: res.onDeathBurst,
          crit: this.stats.crit / 100, critDmg: this.stats.critDmg, weapon: res,
          beam: res.tags.includes('beam'), trail: [], hit: null, sweeps: res.sweep
        });
        if (res.mode === 'beam') { proj.pierce = Math.max(proj.pierce, 99); proj.life = Math.max(res.life, 0.3); fx.beam(p.x, p.y, a, res.range, res.size, NX.DMSG[res.dmgType] ? NX.DMSG[res.dmgType].c : '#fff', 0.14); }
        this.projs.push(proj);
      }
      this.sound('shot');
    }

    melee(w, res, aim) {
      const p = this.player, full = res.spread >= 6.28;
      const arc = full ? M.TAU : (res.spread || 1.6);
      const r = res.range;
      fx.slash(p.x, p.y, aim, r, NX.DMSG[res.dmgType] ? NX.DMSG[res.dmgType].c : '#fff');
      fx.add('arc', p.x, p.y, { ang: aim, arc, size: r, color: '#dff2ff', dur: 0.16 });
      const n = res.count;
      for (let k = 0; k < n; k++) {
        const a = full ? (k / n) * M.TAU + aim : aim + (n > 1 ? (k / (n - 1) - 0.5) * arc : 0);
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = M.dist(e.x, e.y, p.x, p.y);
          if (d > r + e.r) continue;
          const ea = M.ang(p.x, p.y, e.x, e.y);
          let diff = Math.abs(((ea - a + Math.PI) % M.TAU + M.TAU) % M.TAU - Math.PI);
          if (full || diff < arc / 2 + 0.2) {
            this.damageEnemy(e, res.dmg * (full ? 1 : (0.6 + 0.4 * (1 - diff / (arc / 2)))), res.dmgType, { source: 'melee' });
            if (res.knock) { e.knockX = Math.cos(ea) * res.knock * 4; e.knockY = Math.sin(ea) * res.knock * 4; }
          }
        }
      }
      this.shake = Math.min(1, this.shake + 0.15); this.sound('melee');
    }

    nova(w, res) {
      const p = this.player, n = res.count;
      const r = res.range;
      fx.nova(p.x, p.y, r, NX.DMSG[res.dmgType] ? NX.DMSG[res.dmgType].c : '#fff');
      fx.ring(p.x, p.y, r, '#ffffff', 0.4);
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = M.dist(e.x, e.y, p.x, p.y);
        if (d <= r + e.r) {
          this.damageEnemy(e, res.dmg, res.dmgType, { aoe: 1 });
          if (res.knock) { const a = M.ang(p.x, p.y, e.x, e.y); e.knockX = Math.cos(a) * res.knock * 4; e.knockY = Math.sin(a) * res.knock * 4; }
        }
      }
      this.shake = Math.min(1, this.shake + 0.25); this.sound('nova');
    }

    chain(w, res) {
      const p = this.player;
      let cur = this.target(null, null, res.range * 1.4), from = { x: p.x, y: p.y }, hops = 0, dmg = res.dmg;
      const hitSet = new Set();
      while (cur && hops <= res.chain + 1) {
        fx.bolt(from.x, from.y, cur.x, cur.y, NX.DMSG[res.dmgType] ? NX.DMSG[res.dmgType].c : '#fff');
        this.damageEnemy(cur, dmg, res.dmgType, { chain: 1 });
        if (res.status && NX.STATUS[res.status]) this.tryStatus(cur, res.status, res.dmg);
        hitSet.add(cur); from = { x: cur.x, y: cur.y };
        dmg *= (1 - (res.falloff || 10) / 100);
        cur = this.nearestTo(from.x, from.y, null);
        if (cur && (hitSet.has(cur) || M.dist(from.x, from.y, cur.x, cur.y) > res.range)) break;
        hops++;
      }
      this.sound('chain');
    }

    tickAura(w, res, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      w.t = res.tick;
      const p = this.player, r = res.size;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (M.dist2(e.x, e.y, p.x, p.y) < (r + e.r) ** 2) {
          this.damageEnemy(e, res.dmg, res.dmgType, { aoe: 1 });
          if (res.status) this.tryStatus(e, res.status, res.dmg);
        }
      }
    }

    tickOrbit(w, res) {
      const p = this.player;
      w.ang += 2.2 * dt0(w) * (res.speed || 2);
      for (let k = 0; k < res.count; k++) {
        const a = w.ang + k * M.TAU / res.count;
        const ox = p.x + Math.cos(a) * res.range, oy = p.y + Math.sin(a) * res.range;
        w.sub = (w.sub || 0);
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (M.dist2(e.x, e.y, ox, oy) < (res.size + e.r) ** 2) {
            if (!e._orbCd || e._orbCd <= 0) { this.damageEnemy(e, res.dmg, res.dmgType, { orbit: 1 }); e._orbCd = 0.35; }
          }
        }
      }
    }

    tickSummon(w, res, dt) {
      const p = this.player;
      const mine = this.summons.filter(s => s.w === w);
      const want = Math.min(this.stats.summonCap, res.count);
      w.sub -= dt;
      if (mine.length < want && w.sub <= 0) { w.sub = 0.5; this.summons.push(this.makeSummon(w, res)); }
      // les invocations manquantes expirent au bout de res.life si != 999
    }
    makeSummon(w, res) {
      const p = this.player, a = Math.random() * M.TAU;
      return { w, res, x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40, t: 0, target: null, ang: 0, anim: 0, shootT: 0 };
    }

    deployField(w, res, aim) {
      const p = this.player; let x = p.x, y = p.y;
      if (res.mode === 'field' && res.homingField) { const t = this.target(); if (t) { x = t.x; y = t.y; } }
      else { x = p.x + Math.cos(aim) * 40; y = p.y + Math.sin(aim) * 40; }
      const field = { x, y, r: res.size, life: res.dur || 4, dmg: res.dmg, tickT: res.tick || 0.4, t: 0, color: '#6ff0ff', block: res.block, pull: res.pull, homingField: res.homingField, dmgType: res.dmgType, hostile: false };
      this.fields.push(field);
      for (let k = 1; k < res.count; k++) { const a = Math.random() * M.TAU; this.fields.push(Object.assign({}, field, { x: p.x + Math.cos(a) * 50, y: p.y + Math.sin(a) * 50 })); }
      this.sound('field');
    }

    deployMine(w, res) {
      const p = this.player;
      if (this.mines.filter(m => m.w === w).length >= res.max) { const old = this.mines.find(m => m.w === w); if (old) old.dead = true; }
      this.mines.push({ w, res, x: p.x + (Math.random() - 0.5) * 40, y: p.y + (Math.random() - 0.5) * 40, t: 0, dead: false });
    }

    /* ---------- orbes / invocations / champs / mines ---------- */
    updateSummons(dt) {
      const p = this.player;
      for (const s of this.summons) {
        s.t += dt; s.anim += dt;
        // suit le joueur à distance
        const a = M.ang(s.x, s.y, p.x, p.y);
        const d = M.dist(s.x, s.y, p.x, p.y);
        if (d > 60) { s.x += Math.cos(a) * 140 * dt; s.y += Math.sin(a) * 140 * dt; }
        const t = this.target(s.x, s.y, s.res.range);
        if (t) {
          s.ang = M.ang(s.x, s.y, t.x, t.y);
          s.shootT -= dt;
          if (s.shootT <= 0) {
            s.shootT = Math.max(0.25, s.res.life && s.res.life < 5 ? 0.6 : 0.5);
            const n = s.res.count;
            for (let k = 0; k < n; k++) {
              const aa = s.ang + (n > 1 ? (k - (n - 1) / 2) * 0.2 : 0);
              this.projs.push(NX.makeProjectile({
                x: s.x, y: s.y, vx: Math.cos(aa) * 480, vy: Math.sin(aa) * 480, dmg: s.res.dmg * this.stats.summonMul,
                dmgType: s.res.dmgType, size: s.res.size, life: 0.9, maxLife: 0.9, pierce: s.res.pierce, bounce: s.res.bounce,
                onDeathBurst: s.res.onDeathBurst, homing: s.res.homing, crit: this.stats.crit / 100, critDmg: this.stats.critDmg, summon: 1
              }));
            }
          }
        }
      }
      // (les invocations ne meurent pas si life=999)
      this.summons = this.summons.filter(s => this.player.weapons.includes(s.w) && (s.res.life >= 900 || s.t < s.res.life));
    }
    updateFields(dt) {
      for (const f of this.fields) {
        f.t += dt;
        if (f.homingField) { const t = this.target(f.x, f.y, 400); if (t) { const a = M.ang(f.x, f.y, t.x, t.y); f.x += Math.cos(a) * 90 * dt; f.y += Math.sin(a) * 90 * dt; } }
        f.tick = (f.tick || 0) + dt;
        if (f.tick >= f.tickT) {
          f.tick = 0;
          for (const e of this.enemies) {
            if (e.dead) continue;
            if (M.dist2(e.x, e.y, f.x, f.y) < (f.r + e.r) ** 2) {
              this.damageEnemy(e, f.dmg, f.dmgType || 'kinetic', { aoe: 1 });
              if (f.pull) { const a = M.ang(e.x, e.y, f.x, f.y); e.knockX -= Math.cos(a) * f.pull * 4; e.knockY -= Math.sin(a) * f.pull * 4; }
            }
          }
        }
      }
      this.fields = this.fields.filter(f => (f.t < f.life));
    }

    updateZones(dt) {
      for (const z of this.zones) { z.t += dt; z.tick = (z.tick || 0) + dt; if (!z.hostile && z.tick >= (z.tickT || 0.5)) { z.tick = 0; this.aoeDamageEnemies(z.x, z.y, z.r, z.dmg, z.dmgType || 'thermal', {}); } }
      this.zones = this.zones.filter(z => z.t < z.life);
    }

    /* ---------- ennemis ---------- */
    updateEnemies(dt) {
      const list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.dead) continue;
        if (e._orbCd > 0) e._orbCd -= dt;
        NX.updateEnemy(this, e, dt);
        NX.tickStatuses(e, dt, this);
        if (e.def.id === 'decoy' || e.illusion) e.lifeT = (e.lifeT || 3) - dt;
        if (e.lifeT !== undefined && e.lifeT <= 0) { e.dead = true; }
        // morsure : contact
        // (fait dans NX.updateEnemy → run.contactPlayer)
      }
      // séparation légère pour éviter l'empilement parfait
      if (list.length < 220) {
        for (let i = 0; i < list.length; i++) {
          const a = list[i]; if (a.dead) continue;
          for (let j = i + 1; j < Math.min(list.length, i + 6); j++) {
            const b = list[j]; if (b.dead) continue;
            const dx = b.x - a.x, dy = b.y - a.y, rr = (a.r + b.r) * 0.9, d2 = dx * dx + dy * dy;
            if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) / d * 0.5; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
          }
        }
      }
      this.enemies = list.filter(e => !e.dead);
    }

    /* ---------- projectiles joueur ---------- */
    updateProjectiles(dt) {
      const P = this.projs;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.life -= dt;
        if (p.homing) { const t = this.nearestTo(p.x, p.y, null); if (t) { const want = M.ang(p.x, p.y, t.x, t.y); const cur = Math.atan2(p.vy, p.vx); let diff = ((want - cur + Math.PI) % M.TAU + M.TAU) % M.TAU - Math.PI; const turn = Math.min(Math.abs(diff), p.homing * dt * 4) * Math.sign(diff); const na = cur + turn; const sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; } }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (this.opts.particles !== 0 && p.life > 0 && Math.random() < 0.5) p.trail.push({ x: p.x, y: p.y, t: 0.25 }); if (p.trail.length > 8) p.trail.shift();
        for (const t of p.trail) t.t -= dt;
        let removed = false;
        for (const e of this.enemies) {
          if (e.dead || e.illusion) continue;
          if (p.hitSet && p.hitSet.has(e)) continue;
          const rr = (p.size * 0.5 + e.r);
          if (M.dist2(p.x, p.y, e.x, e.y) < rr * rr) {
            this.damageEnemy(e, p.dmg, p.dmgType, { proj: p });
            if (p.statusKey) this.tryStatus(e, p.statusKey, p.dmg);
            if (p.onHitBurst) this.burst(p.x, p.y, p.onHitBurst, p.dmg * 0.5, p.dmgType);
            (p.hitSet = p.hitSet || new Set()).add(e);
            if (p.explosive) { this.explode(p.x, p.y, p.explosive, p.dmg * p.explosiveDmg, p.dmgType); removed = true; break; }
            if (p.pierce > 0) { p.pierce--; }
            else if (p.bounce > 0) {
              const t = this.nearestTo(p.x, p.y, e); if (t) { p.bounce--; const a = M.ang(p.x, p.y, t.x, t.y), sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.hitSet.delete(e); }
              else removed = true;
            } else removed = true;
            if (removed) break;
          }
        }
        if (p.life <= 0 || removed) {
          if (!removed && p.onDeathBurst) this.burst(p.x, p.y, p.onDeathBurst, p.dmg * 0.5, p.dmgType);
          P.splice(i, 1);
        }
      }
    }

    /* ---------- projectiles ennemis ---------- */
    updateEnemyShots(dt) {
      const ES = this.eshots, p = this.player;
      for (let i = ES.length - 1; i >= 0; i--) {
        const s = ES[i]; s.life -= dt;
        if (s.homing) { const want = M.ang(s.x, s.y, p.x, p.y), cur = Math.atan2(s.vy, s.vx); let diff = ((want - cur + Math.PI) % M.TAU + M.TAU) % M.TAU - Math.PI; const na = cur + Math.min(Math.abs(diff), (s.turn || 2) * dt) * Math.sign(diff); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
        s.x += s.vx * dt; s.y += s.vy * dt;
        const rr = s.size * 0.5 + p.r;
        if (M.dist2(s.x, s.y, p.x, p.y) < rr * rr) {
          this.hurtPlayer(s.dmg, s, { ranged: 1 });
          if (s.mark) this.player.marked = 2;
          ES.splice(i, 1); continue;
        }
        if (s.life <= 0) ES.splice(i, 1);
      }
    }

    /* ---------- butin / pickups ---------- */
    updatePickups(dt) {
      const p = this.player;
      const pr = 96 * this.stats.pickupMul * (p.magnetT > 0 ? 3 : 1);
      const reach = p.magnetT > 0 ? 900 : 250;         // zone d'attraction douce
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const k = this.pickups[i]; k.t += dt; k.anim += dt;
        const d = M.dist(k.x, k.y, p.x, p.y);
        if (d < pr) k.pulled = true;
        if (k.pulled || d < reach) {
          k.pulled = true;
          const a = M.ang(k.x, k.y, p.x, p.y), sp = 300 + (k.t * 420);
          k.x += Math.cos(a) * sp * dt; k.y += Math.sin(a) * sp * dt;
        }
        if (d < p.r + k.r + 6) { this.collect(k); this.pickups.splice(i, 1); }
      }
    }
    collect(k) {
      if (k.kind === 'xp') this.gainXp(k.value);
      else if (k.kind === 'hp') { this.player.hp = Math.min(this.player.maxHp, this.player.hp + k.value); fx.text(this.player.x, this.player.y - 20, '+' + Math.round(k.value), '#4dff9f'); }
      else if (k.kind === 'gold') { this.goldRun += k.value; }
      else if (k.kind === 'magnet') { this.player.magnetT = 4 + this.stats.magnetDur; fx.ring(this.player.x, this.player.y, 400, '#7ff0ff', 0.6); }
      else if (k.kind === 'chest') {
        fx.nova(k.x, k.y, 60, '#ffd479'); this.sound('chest');
        // soit une arme, soit un objet
        const t = this.rng.f();
        if (t < 0.5 && this.player.weapons.length < MAX_WEAPONS) { const id = this.rng.pick(NX.weaponPool().filter(x => !this.hasWeapon(x))); if (id) { this.addWeapon(id); NX.toast('Arme trouvée : ' + NX.WEAPONS[id].n, 'gold'); } }
        else if (t < 0.85) { const id = this.rng.pick(NX.ITEMK); this.addItem(id); this.extraPicks.push({ type: 'item', id }); this.rebuildStats(); NX.toast('Objet : ' + NX.ITEMS[id].n, 'gold'); }
        else { this.player.hp = this.player.maxHp; NX.toast('Soin complet', 'good'); }
      }
    }
    dropLoot(e) {
      const n = e.boss ? 14 : e.elite ? 5 : 1;
      for (let i = 0; i < n; i++) { const a = Math.random() * M.TAU, r = Math.random() * 20; this.pickups.push(NX.makePickup('xp', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, e.xp / n)); }
      if (e.elite && Math.random() < 0.35) this.pickups.push(NX.makePickup('chest', e.x, e.y));
      if (Math.random() < 0.14) this.pickups.push(NX.makePickup('gold', e.x, e.y, Math.round((4 + this.reached * 1.6) * this.stats.goldMul)));
      if (Math.random() < 0.035) this.pickups.push(NX.makePickup('hp', e.x, e.y, 18));
      if (Math.random() < 0.012) this.pickups.push(NX.makePickup('magnet', e.x, e.y, 1));
    }

    /* ---------- XP / montées ---------- */
    gainXp(n) {
      const p = this.player; p.xp += n * this.stats.xpMul; this.xpRun += n;
      while (p.xp >= p.xpNeed) { p.xp -= p.xpNeed; p.level++; p.xpNeed = NX.xpNeed(p.level); this.pending++; }
      if (this.pending > 0 && this.state === 'play') this.openLevelUp();
    }
    openLevelUp() {
      this.pending--;
      this.choices = this.rollChoices(this.stats.levelupChoices);
      this.state = 'levelup';
      NX.bus.emit('run:levelup', this.choices);
    }
    rollChoices(n) {
      const p = this.player, R = this.rng, pool = [];
      const add = (o, w) => pool.push({ o, w });
      const fewW = p.weapons.length;
      // améliorer une arme
      p.weapons.forEach(w => { if (w.lvl < MAX_WLVL) add({ type: 'wup', id: w.id }, w.lvl <= 2 ? 135 : 105); });
      // nouvelle arme (fortement prioritaire tant qu'on a peu d'armes)
      if (p.weapons.length < MAX_WEAPONS) NX.weaponPool().forEach(id => { if (!this.hasWeapon(id)) add({ type: 'wnew', id }, fewW < 4 ? 160 : 100); });
      // variante (mentor Mistral débloqué)
      if (NX.profile.isUnlocked('variants')) p.weapons.forEach(w => {
        const def = NX.WEAPONS[w.id]; if (!def.variants) return;
        def.variants.forEach(v => { if (w.variant !== v.id) add({ type: 'variant', id: v.id, weapon: w.id }, 70); });
      });
      // objet
      NX.ITEMK.forEach(id => { const owned = p.items[id] || 0; if (owned < 6) add({ type: 'item', id }, (NX.ITEMS[id].evo ? 100 : 42) - owned * 10); });
      // stats pures (remplissage garanti)
      const stats = [{ hp: 25 }, { dmg: 10 }, { cd: 10 }, { area: 10 }, { speed: 6 }, { crit: 5 }, { armor: 4 }, { projSpeed: 12 }, { regen: 0.6 }, { statusChance: 12 }, { dur: 12 }, { pickup: 25 }];
      // chance/luck biaise les raretés (plus de items rares)
      pool.forEach(x => { if (x.o.type === 'item') x.w *= (1 + this.stats.luckMul * 0.35); });
      const out = [];
      for (let i = 0; i < n && pool.length; i++) {
        const pick = R.weighted(pool, x => x.w);
        out.push(pick.o);
        const idx = pool.indexOf(pick); if (idx >= 0) pool.splice(idx, 1);
      }
      // garanti : au moins une option d'arme tant qu'il reste de la place
      if (fewW < MAX_WEAPONS && out.every(c => c.type !== 'wnew' && c.type !== 'wup')) {
        const newW = NX.weaponPool().filter(id => !this.hasWeapon(id));
        const opt = newW.length ? { type: 'wnew', id: R.pick(newW) } : (p.weapons[0] ? { type: 'wup', id: p.weapons[0].id } : null);
        if (opt) out[out.length - 1] = opt;
      }
      // ajoute un choix de stat si peu de propositions
      while (out.length < n) out.push({ type: 'stat', stats: R.pick(stats) });
      return out;
    }
    applyChoice(c) {
      if (!c) { this.state = 'play'; return; }
      if (c.type === 'wnew') this.addWeapon(c.id);
      else if (c.type === 'wup') { const w = this.weaponOf(c.id); if (w) w.lvl = Math.min(MAX_WLVL, w.lvl + 1); }
      else if (c.type === 'variant') { const w = this.weaponOf(c.weapon); if (w) { w.variant = c.id; w.lvl = Math.min(MAX_WLVL, w.lvl + 1); } }
      else if (c.type === 'item') { this.addItem(c.id); this.extraPicks.push({ type: 'item', id: c.id }); this.rebuildStats(); }
      else if (c.type === 'stat') { this.extraPicks.push({ type: 'stat', stats: c.stats }); this.rebuildStats(); }
      this.sound('levelup');
      if (this.pending > 0) this.openLevelUp(); else this.state = 'play';
    }

    /* ---------- évolutions ---------- */
    checkEvolutions() {
      this.player.weapons.forEach(w => {
        const def = NX.WEAPONS[w.id];
        if (!def || !def.evolve) return;
        if (w.lvl >= MAX_WLVL && (this.player.items[def.evolve.item] >= 1)) {
          const nw = this.addWeapon(def.evolve.into, null, 1);
          this.player.weapons = this.player.weapons.filter(x => x !== w);
          NX.toast('ÉVOLUTION : ' + NX.WEAPONS[def.evolve.into].n, 'gold');
          fx.nova(this.player.x, this.player.y, 120, '#ffd479'); this.sound('evolve');
        }
      });
    }

    /* ---------- spawner ---------- */
    updateSpawner(dt) {
      const L = this.level;
      const prog = M.clamp(this.time / L.dur, 0, 1);
      // fin de niveau → boss
      if (this.time >= L.dur && !this.bossSpawned) { this.spawnBoss(); return; }
      if (this.bossSpawned) return;                      // plus de spawns pendant le boss
      this.spawnT -= dt;
      if (this.spawnT > 0) return;
      const interval = M.lerp(1.75, 0.52, prog) / (1 + this.reached * 0.008);
      this.spawnT = interval * (0.8 + this.rng.f() * 0.5);
      const count = 1 + Math.floor(this.rng.f() * (1 + prog * 2.6));
      for (let i = 0; i < count; i++) {
        if (this.enemies.length > 260) break;
        const id = this.rng.pick(L.pool);
        const a = this.rng.f() * M.TAU, r = 520 + this.rng.f() * 220;
        const elite = this.rng.f() < L.eliteChance * (1 + this.stats.luckMul * 0.2);
        const e = NX.makeEnemy(id, this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, L.mods, { elite });
        if (e) this.enemies.push(e);
      }
    }
    spawnBoss() {
      this.bossSpawned = true;
      const id = this.level.final ? 'b_mirror' : (this.level.boss || 'b_nexus');
      const a = this.rng.f() * M.TAU, r = 620;
      const b = NX.makeBoss(id, this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, this.level.mods);
      if (!b) { this.win(); return; }
      if (this.nightmare) { b.hp *= 1.8; b.maxHp *= 1.8; b.dmg *= 1.3; }
      this.boss = b; this.enemies.push(b);
      NX.toast('⚠ BOSS : ' + b.name, 'bad');
      NX.bus.emit('run:boss', b);
      this.shake = 1; this.sound('boss');
    }
    spawnMinion(from, id, x, y) {
      const e = NX.makeEnemy(id, x, y, this.level.mods, {});
      if (e) this.enemies.push(e);
    }
    spawnEnemyShot(e, a, b) {
      const sp = b.spd || b.speed || 280;
      this.eshots.push(NX.makeEnemyShot({
        x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg: (b.dmg || e.dmg) * (this.nightmare ? 1.3 : 1), size: b.size || 9, life: (b.life || 3),
        homing: b.homing ? 1 : 0, turn: b.turn || 0, mark: b.mark || 0, curse: b.curse || 0,
        color: e.acc || '#ff5d6c', src: e.id
      }));
    }
    fireHazardBeam(e, a, b) {
      const len = e.laserLen || b.len || 400, w = e.laserW || b.size || 12, dmg = e.laserDmg || b.dmg || 12;
      fx.beam(e.x, e.y, a, len, w, '#ff5d6c', 0.25);
      const p = this.player;
      // test : distance point-segment
      const ex1 = e.x, ey1 = e.y, ex2 = e.x + Math.cos(a) * len, ey2 = e.y + Math.sin(a) * len;
      const t = M.clamp(((p.x - ex1) * (ex2 - ex1) + (p.y - ey1) * (ey2 - ey1)) / ((ex2 - ex1) ** 2 + (ey2 - ey1) ** 2), 0, 1);
      const cx = ex1 + (ex2 - ex1) * t, cy = ey1 + (ey2 - ey1) * t;
      if (M.dist2(p.x, p.y, cx, cy) < (w * 0.6 + p.r) ** 2) this.hurtPlayer(dmg, e, { ranged: 1 });
    }

    /* ---------- dégâts ---------- */
    damageEnemy(e, amount, type, o) {
      o = o || {};
      if (e.dead) return 0;
      let dmg = amount;
      if (e.ampT > 0) dmg *= (1 + (e.ampAmt || 0));
      if (e.ampTakenT > 0) dmg *= (1 + (e.ampTakenAmt || 0));
      const st = this.stats;
      if (st.singleMul && !o.aoe && !o.chain && !o.melee) dmg *= st.singleMul;
      // critique
      let crit = false;
      if (!o.noCrit && o.source !== 'status') { crit = Math.random() < st.crit / 100; if (crit) dmg *= st.critDmg; }
      // bouclier
      if (e.shield > 0) { const abs = Math.min(e.shield, dmg); e.shield -= abs; dmg -= abs; if (dmg <= 0) { fx.spark(e.x, e.y, '#6ff0ff', 2); return 0; } }
      e.hp -= dmg; e.hitFlash = 0.12;
      if (!o.silent) fx.text(e.x + (Math.random() - .5) * 10, e.y - e.r - 4, (crit ? '' : '') + M.short(dmg), crit ? '#fff' : (NX.DMSG[type] ? NX.DMSG[type].c : '#fff'), crit ? 15 : 12);
      if (!o.silent) fx.spark(e.x, e.y, NX.DMSG[type] ? NX.DMSG[type].c : '#fff', 2);
      if (st.lifesteal > 0 && !o.status) { this.player.hp = Math.min(this.player.maxHp, this.player.hp + dmg * st.lifesteal); }
      if (crit && st.flags.zeroday) { this.tryStatus(e, 'virus', dmg); this.tryStatus(e, 'burn', dmg); }
      if (this.player.st.flags.sandbox) { }
      if (e.hp <= 0) this.killEnemy(e, o);
      return dmg;
    }
    tryStatus(e, key, dmg) {
      const S = NX.STATUS[key]; if (!S) return;
      const chance = 1 + this.stats.statusChance;      // 1 = toujours au moins une fois, +bonus
      if (Math.random() > Math.min(1, chance)) return;
      const dur = (S.dur || 3) * this.stats.statusDur;
      NX.applyStatus(e, key, dur, dmg, 1);
      // propagation (Virus / perk Virus)
      if (S.spread || (this.player.st.flags.spread)) {
        this.enemies.forEach(o2 => { if (o2 !== e && !o2.dead && M.dist2(o2.x, o2.y, e.x, e.y) < 90 * 90 && Math.random() < 0.4) NX.applyStatus(o2, key, dur * 0.7, dmg, 1); });
      }
    }
    burst(x, y, n, dmg, type) { for (let i = 0; i < n; i++) { const a = Math.random() * M.TAU, sp = 260 + Math.random() * 120; this.projs.push(NX.makeProjectile({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, dmgType: type, size: 7, life: 0.5, maxLife: 0.5, pierce: 0 })); } }
    explode(x, y, r, dmg, type) {
      fx.boom(x, y, r, NX.DMSG[type] ? NX.DMSG[type].c : '#ff9a55'); this.shake = Math.min(1, this.shake + 0.2); this.sound('boom');
      for (const e of this.enemies) { if (e.dead) continue; const d = M.dist(e.x, e.y, x, y); if (d < r + e.r) this.damageEnemy(e, dmg * (1 - 0.4 * d / r), type, { aoe: 1 }); }
    }
    aoeDamageEnemies(x, y, r, dmg, type, o) { for (const e of this.enemies) { if (e.dead) continue; if (M.dist2(e.x, e.y, x, y) < (r + e.r) ** 2) this.damageEnemy(e, dmg, type, Object.assign({ aoe: 1 }, o)); } }

    killEnemy(e, o) {
      if (e.dead) return;
      e.dead = true; this.kills++;
      const def = e.def;
      fx.boom(e.x, e.y, e.r * 1.6, e.col || '#fff');
      // comportements de mort
      (e.beh || []).concat((def && def.beh) || []).forEach(b => {
        if (b.p === 'explode' && b.on === 'death') {
          const R = b.size || 80;
          if (M.dist2(e.x, e.y, this.player.x, this.player.y) < (R + this.player.r) ** 2) this.hurtPlayer(b.dmg * (this.nightmare ? 1.3 : 1), e, { ranged: 1, explo: 1 });
          fx.boom(e.x, e.y, R, '#ffcf4d');
        }
        if (b.p === 'split' && b.on === 'death') { for (let i = 0; i < (b.n || 2); i++) { const a = Math.random() * M.TAU; this.spawnMinion(e, b.into, e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24); } }
      });
      // le boss n'explose pas au contact du joueur (déjà géré) mais libère du butin
      this.dropLoot(e);
      if (e.boss) { this.bossKills++; this.boss = null; NX.bus.emit('run:bossdead', e); this.win(); return; }
      // vies : récompense
      this.score += e.boss ? 5000 : e.elite ? 60 : 5;
    }
    contactPlayer(e) {
      const p = this.player;
      const rr = e.r + p.r;
      if (M.dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        this.hurtPlayer((e.dmgDyn || e.dmg), e, { melee: 1 });
        const a = M.ang(e.x, e.y, p.x, p.y);
        p.x += Math.cos(a) * 8; p.y += Math.sin(a) * 8;
      }
    }
    // ennemi → joueur en zone (orbes ennemis)
    contactDamage(x, y, r, dmg, source) {
      const p = this.player;
      if (M.dist2(x, y, p.x, p.y) < (r + p.r) ** 2) this.hurtPlayer(dmg, source, { ranged: 1 });
    }
    // aura ennemie
    areaDamage(x, y, r, dmg, source) {
      const p = this.player;
      if (M.dist2(x, y, p.x, p.y) < (r + p.r) ** 2) this.hurtPlayer(dmg, source, { ranged: 1 });
    }

    hurtPlayer(amount, source, o) {
      o = o || {};
      const p = this.player, st = this.stats;
      if (p.dead) return;
      let dmg = amount * st.dmgTakenMul;
      if (o.ranged && st.flags.sandbox) dmg *= 0.5;
      // armure (réduction en pourcentage plafonnée)
      dmg *= (1 - Math.min(0.75, st.armor / (st.armor + 40)));
      if (o.dot) { /* pas d'esquive sur les DoT */ }
      else if (Math.random() < st.dodge) { fx.text(p.x, p.y - 26, 'esquive', '#7ff0ff', 12); return; }
      if (!o.dot && p.iframes > 0) return;
      if (p.invuln > 0) return;
      p.hp -= dmg; p.hitFlash = 0.2;
      if (!o.dot) p.iframes = o.explo ? 0.4 : 0.55;
      this.shake = Math.min(1, this.shake + Math.min(0.5, dmg / 40));
      if (st.thorns > 0 && source && source.kind === 'enemy' && !source.dead) this.damageEnemy(source, st.thorns, 'kinetic', { thorns: 1, silent: 1 });
      fx.text(p.x, p.y - 28, '-' + M.short(dmg), '#ff5d6c', 13);
      if (p.hp <= 0) this.tryRevive(); 
      this.sound('hurt');
    }
    tryRevive() {
      const p = this.player;
      if (p.revives > 0) { p.revives--; p.hp = p.maxHp * 0.6; p.invuln = 2.5; fx.nova(p.x, p.y, 160, '#ffd479'); NX.toast('RÉANIMATION', 'gold'); this.sound('revive'); return; }
      p.dead = true; this.state = 'dead';
      NX.bus.emit('run:dead', this);
    }

    /* ---------- issue ---------- */
    win() {
      if (this.state === 'won') return;
      this.state = 'won';
      this.score += Math.round(this.time * 6 + this.kills * 5 + this.goldRun * 2 + this.reached * 400);
      this.sound('win');
      NX.bus.emit('run:won', this);
    }
    finishInfo() {
      return {
        cls: this.cls, level: this.level, reached: this.reached, win: this.state === 'won',
        time: this.time, kills: this.kills, bossKills: this.bossKills, gold: this.goldRun,
        playerLevel: this.player.level, score: this.score, state: this.state
      };
    }

    /* ---------- divers ---------- */
    addZone(z) { this.zones.push(Object.assign({ t: 0, tick: 0 }, z)); }
    sound(n) { if (NX.audio) NX.audio.play(n); }
  }

  // petit utilitaire : dt courant pour tickOrbit (evite d'ajouter une signature)
  let _dt = 1 / 60;
  function dt0() { return _dt; }
  const origUpdate = Run.prototype.update;
  Run.prototype.update = function (dt) { _dt = dt; return origUpdate.call(this, dt); };

  NX.Run = Run;
})();
