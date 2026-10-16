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

  /* ---------------- fond ---------------- */
  function drawBg(run) {
    const env = NX.ENVS[run.level.env] || NX.ENVS.office;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, env.g1); g.addColorStop(1, env.g2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // grille
    const cell = 64, ox = ((-cam.x % cell) + cell) % cell, oy = ((-cam.y % cell) + cell) % cell;
    ctx.strokeStyle = M.rgba(env.accent, 0.06); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox % cell; x < W; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = oy % cell; y < H; y += cell) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // halo central
    const rg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 620);
    rg.addColorStop(0, M.rgba(env.accent, 0.05)); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
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
    }
    if (glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.5, 0, TAU); ctx.fill(); ctx.restore(); }
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
      if (e.spawn > 0) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = e.col; ctx.beginPath(); ctx.arc(s.x, s.y, e.r * (2 - e.spawn), 0, TAU); ctx.stroke(); ctx.restore(); return; }
      // ombre
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + e.r * 0.85, e.r * 0.95, e.r * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore();
      // gel / statut
      let col = e.col, acc = e.acc;
      if (e.buffT > 0) acc = '#ffb03a';
      const frame = Math.floor(e.anim * 8) % 8;
      const shape = (e.copyT > 0 && e.def2) ? e.def2.shape : (e.def ? e.def.shape : 'bot');
      drawSprite(e, shape, col, acc, frame, e.illusion ? 0.9 : 1, e.hitFlash > 0 ? 0.5 : 0, e.elite ? e.acc : null);
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
      ctx.save(); ctx.globalAlpha = 0.25 + 0.1 * Math.sin(z.t * 6);
      ctx.fillStyle = z.hostile ? '#ff5d6c' : (z.color || '#ff9a55');
      ctx.beginPath(); ctx.arc(s.x, s.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.6; ctx.strokeStyle = z.hostile ? '#ff5d6c' : (z.color || '#ff9a55'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, z.r * (0.6 + 0.4 * ((z.t * 2) % 1)), 0, TAU); ctx.stroke(); ctx.restore();
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
  function updateMines(run, dt) {
    run.mines.forEach(m => {
      m.t += dt;
      for (const e of run.enemies) {
        if (e.dead) continue;
        if (M.dist2(e.x, e.y, m.x, m.y) < (e.r + 16) ** 2) {
          run.explode(m.x, m.y, m.res.explode || 80, m.res.dmg, m.res.dmgType); m.dead = true;
          if (m.res.chainMines) { run.addZone({ x: m.x, y: m.y, r: 60, dmg: m.res.dmg * 0.3, tickT: 0.5, life: 2, hostile: false, color: '#c48bff', dmgType: m.res.dmgType }); }
          break;
        }
      }
    });
    run.mines = run.mines.filter(m => !m.dead && m.res);
  }

  /* ---------------- pickups ---------------- */
  function drawPickups(run) {
    run.pickups.forEach(k => {
      const s = toScreen(k.x, k.y);
      const bob = Math.sin(k.anim * 4) * 3;
      ctx.save();
      if (k.kind === 'xp') { ctx.fillStyle = '#39e6ff'; ctx.shadowColor = '#39e6ff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(s.x, s.y + bob, 5, 0, TAU); ctx.fill(); }
      else if (k.kind === 'gold') { ctx.fillStyle = '#ffd479'; ctx.shadowColor = '#ffd479'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(s.x, s.y + bob, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a5a12'; ctx.font = '9px monospace'; ctx.fillText('₡', s.x - 3, s.y + bob + 3); }
      else if (k.kind === 'hp') { ctx.fillStyle = '#4dff9f'; ctx.shadowColor = '#4dff9f'; ctx.shadowBlur = 12; ART.rr(ctx, s.x - 6, s.y + bob - 6, 12, 12, 3); ctx.fill(); ctx.fillStyle = '#0a111c'; ctx.fillRect(s.x - 4, s.y + bob - 1.5, 8, 3); ctx.fillRect(s.x - 1.5, s.y + bob - 4, 3, 8); }
      else if (k.kind === 'magnet') { ctx.fillStyle = '#7ff0ff'; ctx.shadowColor = '#7ff0ff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(s.x, s.y + bob, 7, 0.4, TAU - 0.4); ctx.lineWidth = 4; ctx.strokeStyle = '#7ff0ff'; ctx.stroke(); }
      else if (k.kind === 'chest') { ctx.fillStyle = '#ffd479'; ctx.shadowColor = '#ffd479'; ctx.shadowBlur = 16; ART.rr(ctx, s.x - 11, s.y + bob - 8, 22, 16, 4); ctx.fill(); ctx.fillStyle = '#8a5a12'; ctx.fillRect(s.x - 11, s.y + bob - 2, 22, 3); }
      ctx.restore();
    });
  }

  /* ---------------- projectiles ---------------- */
  function drawProjectiles(run) {
    run.projs.forEach(p => {
      const s = toScreen(p.x, p.y);
      const col = NX.DMSG[p.dmgType] ? NX.DMSG[p.dmgType].c : '#fff';
      if (p.beam) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = p.size; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(s.x - p.vx * 0.02, s.y - p.vy * 0.02); ctx.lineTo(s.x + p.vx * 0.03, s.y + p.vy * 0.03); ctx.stroke(); ctx.restore(); return; }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(s.x, s.y, p.size * 0.9, 0, TAU); ctx.fill();
      ctx.restore();
    });
    run.eshots.forEach(p => {
      const s = toScreen(p.x, p.y);
      ctx.save(); ctx.fillStyle = p.color || '#ff5d6c'; ctx.shadowColor = p.color || '#ff5d6c'; ctx.shadowBlur = 8;
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
      const res = NX.resolveWeapon(w.id, w.variant, w.lvl, run.stats);
      const col = NX.DMSG[res.dmgType] ? NX.DMSG[res.dmgType].c : '#8bff6b';
      if (def.mode === 'aura') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.12 + 0.05 * Math.sin(run.time * 5);
        const g = ctx.createRadialGradient(ps.x, ps.y, res.size * 0.3, ps.x, ps.y, res.size);
        g.addColorStop(0, M.rgba(col, 0.02)); g.addColorStop(1, M.rgba(col, pulse));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ps.x, ps.y, res.size, 0, TAU); ctx.fill();
        ctx.strokeStyle = M.rgba(col, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ps.x, ps.y, res.size, 0, TAU); ctx.stroke(); ctx.restore();
      } else if (def.mode === 'orbit') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < res.count; k++) {
          const a = w.ang + k * TAU / res.count;
          const ox = ps.x + Math.cos(a) * res.range, oy = ps.y + Math.sin(a) * res.range;
          ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(ox, oy, res.size * 0.5, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(ox, oy, res.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
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
    const hg = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 46);
    hg.addColorStop(0, 'rgba(57,230,255,0.5)'); hg.addColorStop(1, 'rgba(57,230,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(s.x, s.y, 46, 0, TAU); ctx.fill();
    // anneau au sol
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#39e6ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 14, 16, 6, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 15, 14, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
    const frame = Math.floor(p.anim * 8) % 8;
    drawSprite({ x: p.x, y: p.y, r: p.r, id: 'raz' }, 'raz', '#7ff0ff', '#39e6ff', frame, 1, p.hitFlash > 0 ? 0.6 : 0, null);
    if (p.stunT > 0) { ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = '#ccd6e0'; ctx.font = '16px sans-serif'; ctx.fillText('⛔', s.x - 8, s.y - 40); ctx.restore(); }
  }

  /* ---------------- effets ---------------- */
  function drawFx() {
    const read = NX.profile.d.settings.readability;
    const parts = NX.profile.d.settings.particles;
    fx.list.forEach(f => {
      const t = f.t / f.dur;
      if (read && (f.kind === 'spark' || f.kind === 'boom')) return;
      const s = toScreen(f.x, f.y);
      ctx.save();
      if (f.kind === 'slash' || f.kind === 'arc') {
        ctx.globalAlpha = 1 - t; ctx.translate(s.x, s.y); ctx.rotate(f.ang || 0);
        ctx.strokeStyle = f.color; ctx.lineWidth = 6 * (1 - t * 0.6);
        const arc = f.kind === 'arc' ? (f.arc || 1.6) : 1.9;
        ctx.beginPath(); ctx.arc(0, 0, (f.size || 60) * (0.7 + t * 0.4), -arc / 2, arc / 2); ctx.stroke();
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
        (f.seg || []).forEach((pt, i) => { const q = toScreen(pt.x, pt.y); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
        ctx.stroke();
      } else if (f.kind === 'beam') {
        ctx.globalAlpha = (1 - t) * 0.9; ctx.globalCompositeOperation = 'lighter';
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(f.ang || 0);
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
      ctx.restore();
    });
    void parts;
  }

  /* ---------------- vignette (lisibilité) ---------------- */
  function vignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 720);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
      updateMines(run, dt);
      drawPickups(run);
      drawEnemies(run);
      drawAuras(run);
      drawProjectiles(run);
      drawSummons(run);
      drawPlayer(run);
      drawFx();
      vignette();
    },
    toScreen
  };
  NX.render = render;
})();
