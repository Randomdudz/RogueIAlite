/* ============================================================
   NEXUS : Réveil — RENDU (Canvas 2D)
   Caméra qui suit le joueur, fond procédural par environnement,
   ordre de dessin pensé pour la LISIBILITÉ :
     fond → zones/champs → pickups → ennemis → balles ennemies
     → auras/orbes → projectiles → invocations → JOUEUR (toujours
     au-dessus) → effets → barres de vie → nombres de dégâts.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M, TAU = M.TAU, ART = NX.art, fx = NX.fx;
  const W = 1280, H = 720;

  const cam = { x: 0, y: 0, tx: 0, ty: 0, shakeX: 0, shakeY: 0 };
  let ctx = null, canvas = null;

  function init(cv) { canvas = cv; ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = true; NX.render.canvas = cv; NX.render.ctx = ctx; }

  function follow(run, dt) {
    const p = run.player;
    cam.tx = p.x; cam.ty = p.y;
    const k = 1 - Math.pow(0.001, dt);
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k;
    const sh = (run.shake || 0) * 8 * (NX.profile.d.settings.shake || 1);
    cam.shakeX = (Math.random() - 0.5) * sh; cam.shakeY = (Math.random() - 0.5) * sh;
  }
  function toScreen(x, y) { return { x: x - cam.x + W / 2 + cam.shakeX, y: y - cam.y + H / 2 + cam.shakeY }; }

  /* Halo bon marché : deux disques translucides en mode additif.
     `ctx.shadowBlur` est bien plus joli mais extrêmement coûteux en Canvas 2D
     (un flou par appel) — l'utiliser sur des centaines de projectiles fait
     chuter le framerate. On le remplace partout en jeu. */
  function glow(x, y, r, color, a) {
    a = a == null ? 0.3 : a;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 1.7;
    ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------------- fond ---------------- */
  function drawBg(run) {
    const env = NX.ENVS[run.level.env] || NX.ENVS.office;
    // dégradés mis en cache par environnement (createLinearGradient/Radial à
    // chaque frame est inutile : les couleurs ne changent pas)
    if (!env._g) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, env.g1); g.addColorStop(1, env.g2);
      env._g = g;
      const rg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 620);
      rg.addColorStop(0, M.rgba(env.accent, 0.05)); rg.addColorStop(1, 'rgba(0,0,0,0)');
      env._h = rg;
      const sg = ctx.createLinearGradient(0, 0, 0, 90);
      sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, M.rgba(env.accent, 0.10)); sg.addColorStop(1, 'rgba(0,0,0,0)');
      env._s = sg;
    }
    ctx.fillStyle = env._g; ctx.fillRect(0, 0, W, H);
    // grille
    const cell = 64, ox = ((-cam.x % cell) + cell) % cell, oy = ((-cam.y % cell) + cell) % cell;
    ctx.strokeStyle = M.rgba(env.accent, 0.06); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox % cell; x < W; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = oy % cell; y < H; y += cell) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // noeuds de circuit qui scintillent aux intersections de grille
    ctx.fillStyle = M.rgba(env.accent, 0.9);
    for (let x = ox % cell; x < W; x += cell * 2) {
      for (let y = oy % cell; y < H; y += cell * 2) {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin((run.time + (x + y) * 0.01) * 3));
        if (pulse > 0.7) { ctx.globalAlpha = pulse * 0.5; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
      }
    }
    ctx.globalAlpha = 1;
    // scan vertical qui descend (effet écran de données)
    const scan = (run.time * 55) % (H + 90) - 45;
    ctx.save(); ctx.translate(0, scan);
    ctx.fillStyle = env._s; ctx.fillRect(0, 0, W, 90);
    ctx.restore();
    // halo central
    ctx.fillStyle = env._h; ctx.fillRect(0, 0, W, H);
    // décor
    ctx.save();
    run.props.forEach(pr => {
      const s = toScreen(pr.x, pr.y);
      if (s.x < -120 || s.x > W + 120 || s.y < -120 || s.y > H + 120) return;
      drawProp(s.x, s.y, pr, env);
    });
    ctx.restore();
  }
  function drawProp(x, y, pr, env) {
    ctx.save(); ctx.translate(x, y); ctx.scale(pr.s, pr.s); ctx.globalAlpha = 0.5;
    ctx.strokeStyle = M.rgba(env.accent, 0.35); ctx.fillStyle = 'rgba(10,16,26,0.55)'; ctx.lineWidth = 1.5;
    const k = pr.k;
    if (k === 'office') { ART.rr(ctx, -26, -14, 52, 28, 4); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-10, 14); ctx.moveTo(10, -14); ctx.lineTo(10, 14); ctx.stroke(); }
    else if (k === 'street') { ART.rr(ctx, -30, -16, 60, 32, 8); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(-14, 16); ctx.moveTo(8, -16); ctx.lineTo(14, 16); ctx.stroke(); }
    else if (k === 'grid') { ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); }
    else if (k === 'datacenter') { ART.rr(ctx, -14, -26, 28, 52, 3); ctx.fill(); ctx.stroke(); for (let i = -18; i <= 18; i += 12) { ctx.beginPath(); ctx.moveTo(-14, i); ctx.lineTo(14, i); ctx.stroke(); } }
    else if (k === 'core') { ctx.rotate(pr.rot); ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(14, 0); ctx.lineTo(0, 24); ctx.lineTo(-14, 0); ctx.closePath(); ctx.stroke(); }
    ctx.restore();
  }

  /* ---------------- entités ---------------- */
  function drawSprite(e, shape, col, acc, frame, scale, flash, glow) {
    const s = toScreen(e.x, e.y);
    const r = e.r * (scale || 1);
    const img = ART.imgFor(e.id || shape);
    if (img) { const w = (img.width / img.height) * r * 2.2; ctx.drawImage(img, s.x - w / 2, s.y - r * 1.1, w, r * 2.2); }
    else {
      const sp = ART.sprite(shape, { col, acc, frame: frame % 8, dark: M.mix(col, '#0a0f18', 0.5) });
      const k = r / ART.RENDER_R;
      const dw = ART.SPR * k, dh = ART.SPR * k;
      ctx.drawImage(sp.canvas, s.x - dw / 2, s.y - dh / 2 - r * 0.15, dw, dh);
      /* bloom néon : on redessine le sprite plus grand, en additif, pour
         simuler une lueur sans blur gaussien (coûteux en Canvas 2D) */
      if (glow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.30;
        const g = 1.4;
        ctx.drawImage(sp.canvas, s.x - dw * g / 2, s.y - dh * g / 2 - r * 0.15, dw * g, dh * g);
        ctx.restore();
      }
    }
    if (flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash * 3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill(); ctx.restore(); }
    return s;
  }

  function outlinize(s, r, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.stroke();
  }

  function drawEnemies(run) {
    const read = NX.profile.d.settings.readability;
    run.enemies.forEach(e => {
      const s = toScreen(e.x, e.y);
      if (s.x < -60 || s.x > W + 60 || s.y < -80 || s.y > H + 60) return;
      if (e.spawn > 0) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = e.col || (e.def && e.def.col) || '#8fa3bd'; ctx.beginPath(); ctx.arc(s.x, s.y, e.r * (2 - e.spawn), 0, TAU); ctx.stroke(); ctx.restore(); return; }
      // ombre
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + e.r * 0.85, e.r * 0.95, e.r * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore();
      // gel / statut
      let col = e.col || (e.def && e.def.col) || '#8fa3bd', acc = e.acc || (e.def && e.def.acc) || '#39e6ff';
      if (e.buffT > 0) acc = '#ffb03a';
      const frame = Math.floor(e.anim * 8) % 8;
      const shape = (e.copyT > 0 && e.def2) ? e.def2.shape : (e.def ? e.def.shape : 'bot');
      drawSprite(e, shape, col, acc, frame, e.illusion ? 0.9 : 1, e.hitFlash > 0 ? 0.5 : 0, e.elite ? acc : null);
      if (e.boss) outlinize(s, e.r * 1.25, '#ff4d94', 2.5);
      else if (e.elite) outlinize(s, e.r * 1.15, '#ffb03a', 2);
      else if (read) outlinize(s, e.r * 0.95, M.rgba('#ffffff', 0.35), 1.5);
      // statuts : petits points colorés
      let si = 0;
      for (const k in e.st) { const S = NX.STATUS[k]; if (!S) continue; ctx.fillStyle = S.c; ctx.beginPath(); ctx.arc(s.x - 10 + si * 7, s.y - e.r - 12, 3, 0, TAU); ctx.fill(); si++; if (si > 3) break; }
      // barre de vie (si blessé, élite ou boss)
      if ((e.hp < e.maxHp || e.elite) && !e.illusion) drawBar(s.x, s.y - e.r - 8, e.r * 2.4, e.hp / e.maxHp, e.boss ? '#ff4d94' : e.elite ? '#ffb03a' : '#ff5d6c', e.shield / (e.shieldMax || 1));
    });
  }
  function drawBar(x, y, w, pct, color, shield) {
    const h = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * M.clamp(pct, 0, 1), h);
    if (shield > 0) { ctx.fillStyle = 'rgba(110,240,255,0.8)'; ctx.fillRect(x - w / 2, y - 4, w * M.clamp(shield, 0, 1), 3); }
  }

  /* ---------------- zones / champs / mines ---------------- */
  function drawGround(run) {
    run.zones.forEach(z => {
      const s = toScreen(z.x, z.y);
      const col = z.hostile ? '#ff5d6c' : (z.color || '#ff9a55');
      const a = 0.25 + 0.12 * Math.sin(z.t * 6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(s.x, s.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, z.r * (0.6 + 0.4 * ((z.t * 2) % 1)), 0, TAU); ctx.stroke(); ctx.restore();
      // bloom des zones hostiles
      if (z.hostile) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x, s.y, z.r * 1.35, 0, TAU); ctx.fill(); ctx.restore();
      }
    });
    run.fields.forEach(f => {
      const s = toScreen(f.x, f.y);
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = f.color || '#6ff0ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, f.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = f.color || '#6ff0ff'; ctx.beginPath(); ctx.arc(s.x, s.y, f.r, 0, TAU); ctx.fill(); ctx.restore();
    });
    run.mines.forEach(m => {
      if (m.dead) return;
      const s = toScreen(m.x, m.y);
      const blink = 0.5 + 0.5 * Math.sin(m.t * 8);
      ctx.fillStyle = '#ffcf4d'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, TAU); ctx.fill();
      ctx.globalAlpha = blink; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    });
  }
  /* ---------------- pickups ---------------- */
  function drawPickups(run) {
    run.pickups.forEach(k => {
      const s = toScreen(k.x, k.y);
      const bob = Math.sin(k.anim * 4) * 3;
      const y = s.y + bob;
      const fade = (k.life != null && k.life < 3) ? Math.max(0.1, k.life / 3) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      if (k.kind === 'xp') { glow(s.x, y, 5, '#39e6ff', 0.35); ctx.fillStyle = '#39e6ff'; ctx.beginPath(); ctx.arc(s.x, y, 5, 0, TAU); ctx.fill(); }
      else if (k.kind === 'gold') { glow(s.x, y, 6, '#ffd479', 0.4); ctx.fillStyle = '#ffd479'; ctx.beginPath(); ctx.arc(s.x, y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a5a12'; ctx.font = '9px monospace'; ctx.fillText('₡', s.x - 3, y + 3); }
      else if (k.kind === 'hp') { glow(s.x, y, 6, '#4dff9f', 0.4); ctx.fillStyle = '#4dff9f'; ART.rr(ctx, s.x - 6, y - 6, 12, 12, 3); ctx.fill(); ctx.fillStyle = '#0a111c'; ctx.fillRect(s.x - 4, y - 1.5, 8, 3); ctx.fillRect(s.x - 1.5, y - 4, 3, 8); }
      else if (k.kind === 'magnet') { glow(s.x, y, 7, '#7ff0ff', 0.45); ctx.strokeStyle = '#7ff0ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, y, 7, 0.4, TAU - 0.4); ctx.stroke(); }
      else if (k.kind === 'chest') { glow(s.x, y, 12, '#ffd479', 0.5); ctx.fillStyle = '#ffd479'; ART.rr(ctx, s.x - 11, y - 8, 22, 16, 4); ctx.fill(); ctx.fillStyle = '#8a5a12'; ctx.fillRect(s.x - 11, y - 2, 22, 3); }
      ctx.restore();
    });
  }

  /* ---------------- projectiles ---------------- */
  function drawProjectiles(run) {
    run.projs.forEach(p => {
      const s = toScreen(p.x, p.y);
      const dmg = NX.DMSG[p.dmgType] || NX.DMSG.kinetic;
      const col = dmg.c;
      // traînée pour les projectiles rapides
      if (Math.hypot(p.vx, p.vy) > 260) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = col; ctx.lineWidth = p.size * 0.5; ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(s.x - p.vx * 0.06, s.y - p.vy * 0.06); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.restore();
      }
      if (p.beam) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = p.size; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(s.x - p.vx * 0.02, s.y - p.vy * 0.02); ctx.lineTo(s.x + p.vx * 0.03, s.y + p.vy * 0.03); ctx.stroke(); ctx.restore(); return;
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // forme selon le type de dégâts
      glow(s.x, s.y, p.size * 0.65, col, 0.4);
      if (p.dmgType === 'pierce') {
        ctx.fillStyle = col;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.beginPath(); ctx.moveTo(-p.size * 0.6, -p.size * 0.5); ctx.lineTo(p.size * 0.9, 0); ctx.lineTo(-p.size * 0.6, p.size * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (p.dmgType === 'thermal') {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.6, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 1.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      } else if (p.dmgType === 'emp') {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 1.1, 0, TAU); ctx.stroke();
      } else if (p.dmgType === 'corrosion') {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.55, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#0a111c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.55, 0, TAU); ctx.stroke();
      } else if (p.dmgType === 'void') {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.9, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        // kinetic : disque métallique
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    });
    run.eshots.forEach(p => {
      const s = toScreen(p.x, p.y);
      const col = p.color || '#ff5d6c';
      ctx.save();
      glow(s.x, s.y, p.size * 0.5, col, 0.35);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(s.x, s.y, p.size, 0, TAU); ctx.fill(); ctx.restore();
    });
  }

  /* ---------------- auras & orbes (depuis les armes) ---------------- */
  function drawAuras(run) {
    const p = run.player;
    const ps = toScreen(p.x, p.y);
    run.player.weapons.forEach(w => {
      const def = NX.WEAPONS[w.id]; if (!def) return;
      const res = w._res || NX.resolveWeapon(w.id, w.variant, w.lvl, run.stats);
      const col = NX.DMSG[res.dmgType] ? NX.DMSG[res.dmgType].c : '#8bff6b';
      if (def.mode === 'aura') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + 0.5 * Math.sin(run.time * 4);
        // anneaux concentriques qui pulsent
        for (let i = 0; i < 3; i++) {
          const r = res.size * (0.5 + i * 0.25);
          const a = 0.06 + (pulse * 0.08) * (1 - i * 0.3);
          const g = ctx.createRadialGradient(ps.x, ps.y, r * 0.4, ps.x, ps.y, r);
          g.addColorStop(0, M.rgba(col, 0.04)); g.addColorStop(1, M.rgba(col, 0));
          ctx.fillStyle = g; ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(ps.x, ps.y, r, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = M.rgba(col, 0.4 + pulse * 0.3); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ps.x, ps.y, res.size, 0, TAU); ctx.stroke(); ctx.restore();
      } else if (def.mode === 'orbit') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < res.count; k++) {
          const a = w.ang + k * TAU / res.count;
          const ox = ps.x + Math.cos(a) * res.range, oy = ps.y + Math.sin(a) * res.range;
          // traînée orbitale
          ctx.beginPath(); ctx.arc(ps.x, ps.y, res.range, 0, TAU);
          ctx.strokeStyle = M.rgba(col, 0.08); ctx.lineWidth = 1; ctx.stroke();
          // orbe avec halo
          glow(ox, oy, res.size * 0.6, col, 0.4);
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(ox, oy, res.size * 0.6, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(ox, oy, res.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, oy, res.size * 0.35, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
    });
  }

  /* ---------------- invocations ---------------- */
  function drawSummons(run) {
    run.summons.forEach(s => {
      const sc = toScreen(s.x, s.y);
      const sp = ART.sprite('drone', { col: '#7d8ea8', acc: s.res.dmgType === 'emp' ? '#ffd94d' : '#6ff0ff', frame: Math.floor(s.anim * 8) % 8 });
      const r = s.res.size ? Math.max(10, s.res.size) : 12, k = r / ART.RENDER_R;
      ctx.drawImage(sp.canvas, sc.x - ART.SPR * k / 2, sc.y - ART.SPR * k / 2, ART.SPR * k, ART.SPR * k);
      ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#6ff0ff'; ctx.beginPath(); ctx.arc(sc.x, sc.y, r, 0, TAU); ctx.stroke(); ctx.restore();
    });
  }

  /* ---------------- joueur ---------------- */
  function drawPlayer(run) {
    const p = run.player, s = toScreen(p.x, p.y);
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) { /* clignote */ }
    // halo holographique (repère visuel permanent)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.45 + 0.25 * Math.abs(Math.sin(run.time * 4));
    const hg = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 52);
    hg.addColorStop(0, 'rgba(57,230,255,' + (0.45 + pulse * 0.3) + ')');
    hg.addColorStop(1, 'rgba(57,230,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(s.x, s.y, 52, 0, TAU); ctx.fill();
    // anneau au sol
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#39e6ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 14, 16, 6, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 15, 14, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
    const frame = Math.floor(p.anim * 8) % 8;
    drawSprite({ x: p.x, y: p.y, r: p.r, id: 'raz' }, 'raz', '#7ff0ff', '#39e6ff', frame, 1, p.hitFlash > 0 ? 0.6 : 0, true);

    // ---- barre de vie collée au personnage ----
    const pct = M.clamp(p.hp / p.maxHp, 0, 1);
    const bw = 72, bh = 10;
    const bx = s.x - bw / 2, by = s.y - p.r * 2.25 - bh - 9;
    ctx.save();
    ctx.fillStyle = 'rgba(3,7,13,0.92)';
    ART.rr(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ART.rr(ctx, bx, by, bw, bh, 4); ctx.fill();
    if (pct > 0) {
      const hpcol = pct > 0.5 ? '#3ddc84' : pct > 0.25 ? '#ffd479' : '#ff4d6a';
      const gg = ctx.createLinearGradient(0, by, 0, by + bh);
      gg.addColorStop(0, M.mix(hpcol, '#ffffff', 0.45)); gg.addColorStop(1, hpcol);
      ctx.fillStyle = gg;
      ART.rr(ctx, bx, by, Math.max(3, bw * pct), bh, 4); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(200,230,255,0.85)'; ctx.lineWidth = 1.5;
    ART.rr(ctx, bx - 0.5, by - 0.5, bw + 1, bh + 1, 5); ctx.stroke();
    // valeur de PV
    ctx.font = 'bold 11px Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#eaf4ff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillText(Math.max(0, Math.ceil(p.hp)) + ' / ' + Math.ceil(p.maxHp), s.x, by - 5);
    ctx.shadowBlur = 0;
    // pastille de niveau du héros à gauche de la barre
    ctx.fillStyle = '#39e6ff'; ctx.shadowColor = '#39e6ff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(bx - 13, by + bh / 2, 10, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#04121c'; ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillText(p.level, bx - 13, by + bh / 2 + 4);
    ctx.restore();

    // ---- barre d'expérience sous le personnage (fine, blanche) ----
    const xpPct = M.clamp(p.xp / p.xpNeed, 0, 1);
    const xw = 46, xh = 4;
    const xx = s.x - xw / 2, xy = s.y + p.r * 1.75;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ART.rr(ctx, xx - 1.5, xy - 1.5, xw + 3, xh + 3, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ART.rr(ctx, xx, xy, xw, xh, 2); ctx.fill();
    if (xpPct > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
      ART.rr(ctx, xx, xy, Math.max(2, xw * xpPct), xh, 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    if (p.stunT > 0) { ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = '#ccd6e0'; ctx.font = '16px sans-serif'; ctx.fillText('⛔', s.x - 8, s.y - 40); ctx.restore(); }
  }

  /* ---------------- effets ---------------- */
  function drawFx() {
    const read = NX.profile.d.settings.readability;
    const l = fx.list;
    if (!l.length) return;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (let i = 0; i < l.length; i++) {
      const f = l[i];
      if (read && (f.kind === 'spark' || f.kind === 'boom')) continue;
      const t = f.t / f.dur;
      const s = toScreen(f.x, f.y);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (f.kind === 'slash' || f.kind === 'arc') {
        ctx.save(); ctx.globalAlpha = 1 - t; ctx.translate(s.x, s.y); ctx.rotate(f.ang || 0);
        ctx.strokeStyle = f.color; ctx.lineWidth = 6 * (1 - t * 0.6);
        const arc = f.kind === 'arc' ? (f.arc || 1.6) : 1.9;
        ctx.beginPath(); ctx.arc(0, 0, (f.size || 60) * (0.7 + t * 0.4), -arc / 2, arc / 2); ctx.stroke();
        ctx.restore();
      } else if (f.kind === 'ring' || f.kind === 'nova') {
        ctx.globalAlpha = (1 - t) * 0.9; ctx.strokeStyle = f.color; ctx.lineWidth = (f.kind === 'nova' ? 8 : 4) * (1 - t);
        ctx.beginPath(); ctx.arc(s.x, s.y, (f.size || 30) * (f.kind === 'nova' ? (0.3 + t) : t), 0, TAU); ctx.stroke();
      } else if (f.kind === 'boom') {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - t) * 0.8;
        const r = (f.size || 40) * (0.4 + t * 0.9);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, M.rgba(f.color || '#fff', 0.9)); g.addColorStop(1, M.rgba(f.color || '#fff', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill();
      } else if (f.kind === 'spark') {
        ctx.globalAlpha = 1 - t; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(s.x, s.y, (f.size || 3) * (1 - t), 0, TAU); ctx.fill();
      } else if (f.kind === 'bolt') {
        ctx.globalAlpha = 1 - t; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = f.color; ctx.lineWidth = 3;
        ctx.beginPath();
        const seg = f.seg || [];
        for (let k = 0; k < seg.length; k++) { const q = toScreen(seg[k].x, seg[k].y); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
        ctx.stroke();
      } else if (f.kind === 'beam') {
        ctx.save(); ctx.globalAlpha = (1 - t) * 0.9; ctx.globalCompositeOperation = 'lighter';
        ctx.translate(s.x, s.y); ctx.rotate(f.ang || 0);
        const gg = ctx.createLinearGradient(0, 0, f.len, 0);
        gg.addColorStop(0, M.rgba(f.color, 0.9)); gg.addColorStop(1, M.rgba(f.color, 0));
        ctx.fillStyle = gg; ctx.fillRect(0, -(f.w || 8) / 2, f.len, f.w || 8); ctx.restore();
      } else if (f.kind === 'text') {
        ctx.globalAlpha = Math.min(1, (1 - t) * 1.6); ctx.fillStyle = f.color; ctx.font = (f.size || 13) + 'px Consolas, monospace';
        ctx.textAlign = 'center'; ctx.fillText(f.txt, s.x, s.y - t * 26);
      } else if (f.kind === 'heal') {
        ctx.globalAlpha = 1 - t; ctx.fillStyle = f.color; ctx.font = '16px sans-serif'; ctx.fillText('+', s.x, s.y - t * 20);
      } else if (f.kind === 'dash') {
        ctx.globalAlpha = (1 - t) * 0.5; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(s.x, s.y, 16 * (1 - t), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- vignette (lisibilité) ---------------- */
  let vigGrad = null;
  function vignette() {
    if (!vigGrad) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 720);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      vigGrad = g;
    }
    ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, W, H);
  }

  const render = {
    cam, W, H, init,
    portrait(c, shape, col, acc, size) {
      const sp = ART.sprite(shape, { col, acc, dark: M.mix(col, '#0a0f18', 0.5), frame: 0, em: 1 });
      const k = size / ART.SPR;
      c.drawImage(sp.canvas, c.canvas.width / 2 - ART.SPR * k / 2, c.canvas.height / 2 - ART.SPR * k / 2 + size * 0.05, ART.SPR * k, ART.SPR * k);
    },
    frame(run, dt) {
      if (!ctx) return;
      follow(run, dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawBg(run);
      drawGround(run);
      drawPickups(run);
      drawEnemies(run);
      drawAuras(run);
      drawProjectiles(run);
      drawSummons(run);
      drawPlayer(run);
      drawFx();
      vignette();
      // overlay écran CRT (dernière couche, par-dessus tout le jeu)
      if (NX.profile.d.settings.shake !== undefined) { /* shake déjà géré */ }
      ART.crt(ctx, W, H, run ? run.time : 0);
    },
    toScreen
  };
  NX.render = render;
})();
