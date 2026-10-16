/* ============================================================
   NEXUS : Réveil — COMPORTEMENTS D'IA DES MONSTRES
   Chaque comportement a un identifiant p. Ils tournent en continu
   et utilisent un minuteur par (ennemi, index de comportement).
   run.js appelle updateEnemy(run, e, dt).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M;

  function timer(e, i) { const k = 'b' + i; e.bt[k] = (e.bt[k] == null ? Math.random() * 0.6 : e.bt[k]) - (e.bt.__dt || 0); return e.bt[k]; }
  function reset(e, i, cd) { e.bt['b' + i] = cd; }

  const BEH = {
    /* Poursuite simple (avec zigzag optionnel) */
    chase(run, e, b, i, dt) {
      const p = run.player;
      let ang = M.ang(e.x, e.y, p.x, p.y);
      if (b.zigzag) { e.zig += dt * (3 + b.zigzag * 3); ang += Math.sin(e.zig) * 0.5 * b.zigzag; }
      const sp = e.speed * (b.fast ? 1.6 : 1) * (e.slowAmt ? (1 - e.slowAmt) : 1);
      e.dir = ang; e.vx += Math.cos(ang) * sp * dt * 6; e.vy += Math.sin(ang) * sp * dt * 6;
      clampsp(e, sp);
    },
    /* Tire des projectiles */
    shoot(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      const p = run.player, base = M.ang(e.x, e.y, p.x, p.y), n = b.count || 1, sp = b.spread || 0;
      for (let k = 0; k < n; k++) {
        const a = base + (n > 1 ? (k / (n - 1) - 0.5) * sp : 0);
        run.spawnEnemyShot(e, a, b);
      }
      run.sound('eshot');
    },
    /* Spirale */
    spiral(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      e.spiral = (e.spiral || 0) + 0.5;
      const n = b.n || 8;
      for (let k = 0; k < n; k++) run.spawnEnemyShot(e, e.spiral + k * M.TAU / n, b);
    },
    /* Charge */
    charge(run, e, b, i, dt) {
      e.bt.__dt = dt;
      if (e.chargeT > 0) {
        e.chargeT -= dt;
        const sp = e.speed * (b.speedMul || 3);
        e.vx = e.chargeX * sp; e.vy = e.chargeY * sp;
        e.dir = Math.atan2(e.chargeY, e.chargeX);
        if (e.chargeT <= 0) reset(e, i, b.cd || 3);
        return;
      }
      timer(e, i); if (e.bt['b' + i] > 0) return;
      const p = run.player, a = M.ang(e.x, e.y, p.x, p.y);
      e.chargeX = Math.cos(a); e.chargeY = Math.sin(a); e.chargeT = b.dur || 0.5;
      e.chargeDmg = b.dmg || e.dmg;
    },
    /* Orbe qui tourne autour de l'ennemi et blesse au contact */
    orbit(run, e, b, i, dt) {
      e.orbA = (e.orbA || 0) + (b.spd || 2) * dt * 2;
      const n = b.count || 1;
      for (let k = 0; k < n; k++) {
        const a = e.orbA + k * M.TAU / n;
        const ox = e.x + Math.cos(a) * (b.r || 60), oy = e.y + Math.sin(a) * (b.r || 60);
        run.contactDamage(ox, oy, 14, e.dmg * 0.6, e);
      }
    },
    /* Explose à la mort */
    explode(run, e, b, i, dt) { /* géré dans run.killEnemy */ },
    /* Se divise à la mort */
    split(run, e, b, i, dt) { /* géré dans run.killEnemy */ },
    /* Invoque des sbires */
    summon(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      for (let k = 0; k < (b.n || 1); k++) {
        const a = Math.random() * M.TAU, r = 40 + Math.random() * 40;
        run.spawnMinion(e, b.minion, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
      }
      NX.fx.ring(e.x, e.y, 40, '#c48bff', 0.5);
    },
    /* Téléportation vers une position proche du joueur */
    teleport(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      const p = run.player, a = Math.random() * M.TAU, r = 120 + Math.random() * 160;
      NX.fx.ring(e.x, e.y, 26, '#c48bff', 0.3);
      e.x = p.x + Math.cos(a) * r; e.y = p.y + Math.sin(a) * r;
      NX.fx.ring(e.x, e.y, 30, '#c48bff', 0.3);
    },
    /* Laser télégraphié */
    laser(run, e, b, i, dt) {
      e.bt.__dt = dt;
      if (e.laserT > 0) {
        e.laserT -= dt;
        if (e.laserT <= 0) {
          const p = run.player, base = e.laserAng;
          const n = b.count || 1, sp = b.spread || 0;
          for (let k = 0; k < n; k++) {
            const a = base + (n > 1 ? (k / (n - 1) - 0.5) * sp : 0);
            run.fireHazardBeam(e, a, b);
          }
          run.sound('laser'); reset(e, i, b.cd);
        }
        return;
      }
      timer(e, i); if (e.bt['b' + i] > 0) return;
      e.laserAng = M.ang(e.x, e.y, run.player.x, run.player.y);
      e.laserT = b.telegraph || 0.6;
      e.laserLen = b.len || 400; e.laserW = b.size || 12; e.laserDmg = b.dmg || 12;
    },
    /* Bouclier régénérant */
    shield(run, e, b, i, dt) {
      if (e.shieldMax === 0) { e.shieldMax = b.amount || 30; e.shield = e.shieldMax; }
      if (e.shield < e.shieldMax) e.shield = Math.min(e.shieldMax, e.shield + (b.regen || 1) * dt);
    },
    /* Projectile guidé */
    homing(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      const n = b.count || 1;
      for (let k = 0; k < n; k++) {
        const a = M.ang(e.x, e.y, run.player.x, run.player.y) + (k - (n - 1) / 2) * 0.3;
        run.spawnEnemyShot(e, a, { dmg: b.dmg, spd: b.spd, homing: 1, turn: 2.2 });
      }
    },
    /* Soigne les alliés autour */
    healer(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      let healed = 0;
      run.enemies.forEach(o => {
        if (o === e || o.dead) return;
        if (M.dist2(o.x, o.y, e.x, e.y) < (b.radius || 150) ** 2 && o.hp < o.maxHp) {
          o.hp = Math.min(o.maxHp, o.hp + (b.amount || 12)); healed++;
          NX.fx.add('heal', o.x, o.y, { size: 14, color: '#4dff9f', dur: 0.5 });
        }
      });
      if (healed) NX.fx.ring(e.x, e.y, b.radius || 150, '#4dff9f', 0.4);
    },
    /* Buff d'équipe */
    buff(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      e.buffGiven = 0;
      run.enemies.forEach(o => {
        if (o.dead) return;
        if (M.dist2(o.x, o.y, e.x, e.y) < (b.radius || 160) ** 2) {
          o.buffT = 3; o.buffStats = b.stats || {}; e.buffGiven++;
        }
      });
      NX.fx.ring(e.x, e.y, b.radius || 160, '#ffb03a', 0.5);
    },
    /* Aura de dégâts permanente */
    aura(run, e, b, i, dt) {
      e.auraT = (e.auraT || 0) + dt;
      if (e.auraT >= (b.tick || 0.5)) {
        e.auraT = 0;
        run.areaDamage(e.x, e.y, b.radius || 60, b.dmg || 5, e);
      }
    },
    /* Ralentissement autour */
    slowaura(run, e, b, i, dt) {
      const p = run.player;
      if (M.dist2(p.x, p.y, e.x, e.y) < (b.radius || 90) ** 2) p.slowT = 0.3;
    },
    /* Étourdit le joueur */
    stun(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      const p = run.player;
      if (M.dist2(p.x, p.y, e.x, e.y) < (b.radius || 110) ** 2) { p.stunT = Math.max(p.stunT || 0, b.dur || 1); NX.fx.ring(e.x, e.y, b.radius || 110, '#ccd6e0', 0.4); }
    },
    /* Zone au sol */
    zone(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd);
      const p = run.player;
      run.addZone({ x: p.x, y: p.y, r: b.size || 100, dmg: b.dmg || 8, tickT: 0.45, life: b.dur || 4, hostile: true, color: '#ff9a55' });
    },
    /* Laisse une traînée */
    trail(run, e, b, i, dt) {
      e.trailT = (e.trailT || 0) + dt;
      if (e.trailT >= 0.3) { e.trailT = 0; run.addZone({ x: e.x, y: e.y, r: b.size || 30, dmg: b.dmg || 5, tickT: 0.4, life: b.dur || 5, hostile: true, color: '#8bff6b' }); }
    },
    /* Copie un ennemi proche (Deepfake / MIRROIR) */
    copy(run, e, b, i, dt) {
      e.bt.__dt = dt; timer(e, i); if (e.bt['b' + i] > 0) return; reset(e, i, b.cd || 8);
      const p = run.player;
      // copie l'apparence d'un monstre proche, ou prend une forme dangereuse
      e.copyT = 4;
      e.def2 = run.enemies.find(o => !o.boss && !o.dead && o !== e);
      NX.fx.ring(e.x, e.y, 40, '#c48bff', 0.4);
    }
  };

  function clampsp(e, sp) {
    const v = Math.hypot(e.vx, e.vy);
    if (v > sp * 2) { e.vx = e.vx / v * sp * 2; e.vy = e.vy / v * sp * 2; }
  }

  /* ---------------- boucle d'un ennemi ---------------- */
  NX.updateEnemy = function (run, e, dt) {
    e.bt.__dt = dt;
    if (e.spawn > 0) { e.spawn -= dt; return; }               // apparition
    // phases de boss
    if (e.boss && e.def.phases) {
      const pct = e.hp / e.maxHp;
      for (let i = e.def.phases.length - 1; i >= 0; i--) {
        if (pct <= e.def.phases[i].at) { if (e.phase !== i) { e.phase = i; e.beh = e.def.phases[i].beh; e.bt = {}; e.gapT = 0; NX.fx.nova(e.x, e.y, 120, '#ff4d94'); } break; }
      }
    }
    // les boss ne se laissent pas semer : bond de rattrapage
    if (e.boss) {
      e.gapT = (e.gapT || 0) - dt;
      const dp = M.dist(e.x, e.y, run.player.x, run.player.y);
      if (dp > 360 && e.gapT <= 0) {
        e.gapT = 4.5;
        const a = M.ang(e.x, e.y, run.player.x, run.player.y);
        const step = Math.max(0, dp - 210);
        NX.fx.ring(e.x, e.y, 52, '#ff4d94', 0.45); NX.fx.ring(e.x, e.y, 26, '#ffffff', 0.3);
        e.x += Math.cos(a) * step; e.y += Math.sin(a) * step;
        NX.fx.ring(e.x, e.y, 52, '#ff4d94', 0.45);
        e.chargeT = 0.22; e.chargeX = Math.cos(a); e.chargeY = Math.sin(a);
        run.shake = Math.min(1, run.shake + 0.3);
      }
    }
    if (e.frozen > 0) { e.frozen -= dt; e.vx *= 0.8; e.vy *= 0.8; clampsp(e, 0); return; }
    if (e.fearT > 0) { // panique : fuit
      const a = M.ang(run.player.x, run.player.y, e.x, e.y);
      e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed;
      e.x += e.vx * dt; e.y += e.vy * dt; return;
    }
    // buff de vitesse/dégâts par un élite
    let spdMul = 1;
    if (e.buffT > 0) { e.buffT -= dt; const bs = e.buffStats || {}; spdMul = 1 + (bs.speed || 0) / 100; if (bs.dmg) e.dmgDyn = e.dmg * (1 + bs.dmg / 100); }
    else e.dmgDyn = e.dmg;

    // ajuste vitesse (ralenti)
    const baseSpeed = e.speed * spdMul;

    // comportements
    const beh = e.beh || [];
    for (let i = 0; i < beh.length; i++) {
      const b = beh[i], fn = BEH[b.p];
      if (fn) {
        const backup = e.speed; e.speed = baseSpeed;
        fn(run, e, b, i, dt);
        e.speed = backup;
      }
    }
    // intégration
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.knockX || e.knockY) { e.x += e.knockX * dt; e.y += e.knockY * dt; e.knockX *= 0.85; e.knockY *= 0.85; if (Math.abs(e.knockX) < 4) e.knockX = 0; if (Math.abs(e.knockY) < 4) e.knockY = 0; }
    // friction pour repartir d'une base saine chaque frame
    e.vx *= 0.72; e.vy *= 0.72;
    // animations
    e.anim += dt * (2 + Math.min(4, baseSpeed / 50));
    // collision de contact avec le joueur
    run.contactPlayer(e);
  };

  NX.BEHAVIORS = BEH;
})();
