/* ============================================================
   NEXUS : Réveil — ART PROCÉDURAL
   Toutes les créatures / effets sont dessinés par code, puis mis
   en cache (offscreen) et animés par cycle de frames.
   Pour remplacer par tes PNG : assets/sprites/<id>.png (détection auto).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M, TAU = M.TAU;

  const PAL = {
    bg: '#05070c', gridA: '#0c1626', gridB: '#0a1220',
    player: '#7ff0ff', playerDark: '#0d5f74', visor: '#39e6ff', halo: '#39e6ff',
    human: '#d9c39a', suit: '#2b3550', suit2: '#1b2338', tie: '#b33',
    metal: '#8fa3bd', metalDark: '#3c4a61', rubber: '#20293a',
    neon1: '#39e6ff', neon2: '#b26bff', neon3: '#4dff9f', warn: '#ffcf4d', bad: '#ff5d6c',
    blood: '#ff4d6a', data: '#39e6ff', credit: '#ffd479'
  };
  const RENDER_R = 34, PAD = 18, SPR = (RENDER_R + PAD) * 2;

  /* ---------- utilitaires de dessin ---------- */
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.closePath(); }
  function leg(ctx, x, y, len, ang, w, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke(); ctx.restore(); }

  /* ============================================================
     FORMES — signature : (ctx, s) avec s = {r,ph,col,acc,dark,glow}
     ph = phase 0..1 (cycle d'animation)
     ============================================================ */
  const SHAPES = {
    /* --- RAZ-1 : notre héros (coque humanoïde à visière d'écran) --- */
    raz(ctx, s) {
      const r = s.r, bob = Math.sin(s.ph * TAU) * r * 0.05;
      ctx.save(); ctx.translate(0, bob);
      // jambes
      ctx.strokeStyle = PAL.metalDark; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
      const sw = Math.sin(s.ph * TAU) * r * 0.28;
      ctx.beginPath(); ctx.moveTo(-r * 0.16, r * 0.1); ctx.lineTo(-r * 0.2 + sw, r * 0.72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.16, r * 0.1); ctx.lineTo(r * 0.2 - sw, r * 0.72); ctx.stroke();
      // corps
      const g = ctx.createLinearGradient(0, -r * 0.9, 0, r * 0.5);
      g.addColorStop(0, '#eaf7ff'); g.addColorStop(0.5, s.col); g.addColorStop(1, PAL.playerDark);
      ctx.fillStyle = g; rr(ctx, -r * 0.42, -r * 0.75, r * 0.84, r * 1.05, r * 0.22); ctx.fill();
      // torse : anneau lumineux (réacteur)
      ctx.fillStyle = PAL.halo; circ(ctx, 0, -r * 0.1, r * 0.12); ctx.fill();
      ctx.globalAlpha = 0.35; circ(ctx, 0, -r * 0.1, r * 0.24); ctx.fill(); ctx.globalAlpha = 1;
      // tête
      ctx.fillStyle = '#dff2ff'; rr(ctx, -r * 0.34, -r * 1.22, r * 0.68, r * 0.52, r * 0.2); ctx.fill();
      // visière (écran)
      ctx.fillStyle = '#04121a'; rr(ctx, -r * 0.27, -r * 1.14, r * 0.54, r * 0.3, r * 0.1); ctx.fill();
      // yeux / expression selon phase
      ctx.fillStyle = PAL.visor;
      const em = s.em || 0;
      if (em === 0) { rr(ctx, -r * 0.17, -r * 1.06, r * 0.11, r * 0.14, 2); ctx.fill(); rr(ctx, r * 0.06, -r * 1.06, r * 0.11, r * 0.14, 2); ctx.fill(); }
      else if (em === 1) { ctx.fillRect(-r * 0.18, -r * 1.0, r * 0.36, r * 0.05); }        // -_-
      else { ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.99); ctx.lineTo(-r * 0.05, -r * 1.08); ctx.lineTo(r * 0.06, -r * 0.99); ctx.lineTo(r * 0.17, -r * 1.08); ctx.lineWidth = r * 0.05; ctx.strokeStyle = PAL.visor; ctx.stroke(); }
      ctx.restore();
    },
    /* --- drone quadricoptère --- */
    drone(ctx, s) {
      const r = s.r, lift = Math.sin(s.ph * TAU) * r * 0.08;
      ctx.save(); ctx.translate(0, lift);
      ctx.fillStyle = s.dark; rr(ctx, -r * 0.7, -r * 0.28, r * 1.4, r * 0.5, r * 0.16); ctx.fill();
      ctx.fillStyle = s.col; rr(ctx, -r * 0.5, -r * 0.4, r, r * 0.42, r * 0.14); ctx.fill();
      ctx.fillStyle = PAL.metalDark;
      [-1, 1].forEach(sx => { ctx.save(); ctx.translate(sx * r * 0.72, -r * 0.2); ctx.scale(sx, 1); rr(ctx, 0, -r * 0.06, r * 0.5, r * 0.12, 3); ctx.fill(); ctx.restore(); });
      // rotors
      ctx.strokeStyle = M.rgba(s.acc, 0.6); ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
      [-1, 1].forEach(sx => { const a = s.ph * TAU * 3 * sx; ctx.save(); ctx.translate(sx * r * 0.72, -r * 0.28); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-r * 0.34, 0); ctx.lineTo(r * 0.34, 0); ctx.stroke(); ctx.restore(); });
      ctx.fillStyle = s.acc; circ(ctx, 0, r * 0.02, r * 0.1); ctx.fill();               // œil capteur
      ctx.globalAlpha = .5; circ(ctx, 0, r * 0.02, r * 0.2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    },
    /* --- petit robot bipède --- */
    bot(ctx, s) {
      const r = s.r, sw = Math.sin(s.ph * TAU) * r * 0.3;
      ctx.strokeStyle = PAL.metalDark; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.15); ctx.lineTo(-r * 0.24 + sw, r * 0.76); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.2, r * 0.15); ctx.lineTo(r * 0.24 - sw, r * 0.76); ctx.stroke();
      ctx.fillStyle = s.dark; rr(ctx, -r * 0.5, -r * 0.62, r, r * 0.9, r * 0.2); ctx.fill();
      ctx.fillStyle = s.col; rr(ctx, -r * 0.42, -r * 0.55, r * 0.84, r * 0.5, r * 0.16); ctx.fill();
      ctx.fillStyle = '#05131a'; rr(ctx, -r * 0.3, -r * 0.95, r * 0.6, r * 0.34, r * 0.1); ctx.fill();
      ctx.fillStyle = s.acc; circ(ctx, 0, -r * 0.78, r * 0.09); ctx.fill();
      ctx.strokeStyle = PAL.metal; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.3); ctx.lineTo(-r * 0.72, -r * 0.3 + sw * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.3); ctx.lineTo(r * 0.72, -r * 0.3 - sw * 0.5); ctx.stroke();
    },
    /* --- blob / slime --- */
    slime(ctx, s) {
      const r = s.r, sq = 1 + Math.sin(s.ph * TAU) * 0.1;
      ctx.save(); ctx.scale(1 / sq, sq);
      const g = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
      g.addColorStop(0, s.col); g.addColorStop(1, s.dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-r, r * 0.5);
      ctx.bezierCurveTo(-r * 1.1, -r * 0.9, r * 1.1, -r * 0.9, r, r * 0.5);
      ctx.bezierCurveTo(r * 0.6, r * 0.95, -r * 0.6, r * 0.95, -r, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, -r * 0.3, -r * 0.15, r * 0.14); ctx.fill(); circ(ctx, r * 0.3, -r * 0.15, r * 0.14); ctx.fill();
      ctx.fillStyle = s.acc; circ(ctx, -r * 0.3, -r * 0.15, r * 0.07); ctx.fill(); circ(ctx, r * 0.3, -r * 0.15, r * 0.07); ctx.fill();
      ctx.restore();
    },
    /* --- spectre / hallucination --- */
    ghost(ctx, s) {
      const r = s.r, sway = Math.sin(s.ph * TAU) * r * 0.12;
      ctx.globalAlpha = 0.88;
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, s.col); g.addColorStop(1, M.rgba(s.dark, 0.05));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -r * 0.1 + sway, r * 0.8, Math.PI, 0);
      ctx.lineTo(r * 0.8, r * 0.5 + sway);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(r * (0.6 - i * 0.4), r * (0.72 + (i % 2 ? -0.18 : 0.08)) + sway, r * (0.4 - i * 0.4), r * 0.5 + sway);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.acc; circ(ctx, -r * 0.24, -r * 0.25 + sway, r * 0.1); ctx.fill(); circ(ctx, r * 0.24, -r * 0.25 + sway, r * 0.1); ctx.fill();
      ctx.globalAlpha = .25; circ(ctx, 0, 0, r * 1.15); ctx.fill(); ctx.globalAlpha = 1;
    },
    /* --- bug / virus : insecte --- */
    bug(ctx, s) {
      const r = s.r, w = Math.sin(s.ph * TAU) * r * 0.18;
      ctx.strokeStyle = s.dark; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * r * 0.25, i * r * 0.3); ctx.lineTo(sx * r * 0.75, i * r * 0.3 + w); ctx.stroke();
      }
      ctx.fillStyle = s.dark; circ(ctx, 0, r * 0.28, r * 0.4); ctx.fill();
      ctx.fillStyle = s.col; circ(ctx, 0, -r * 0.18, r * 0.45); ctx.fill();
      ctx.fillStyle = s.acc; circ(ctx, 0, -r * 0.34, r * 0.2); ctx.fill();
      ctx.strokeStyle = s.acc; ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 0.3, -r * 0.9 + w * .3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.3, -r * 0.9 - w * .3); ctx.stroke();
    },
    /* --- tourelle --- */
    turret(ctx, s) {
      const r = s.r;
      ctx.fillStyle = PAL.metalDark; rr(ctx, -r * 0.75, r * 0.2, r * 1.5, r * 0.5, r * 0.14); ctx.fill();
      ctx.fillStyle = s.dark; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.55, Math.PI, 0); ctx.fill();
      const a = Math.sin(s.ph * TAU) * 0.5;
      ctx.save(); ctx.translate(0, 0); ctx.rotate(a);
      ctx.fillStyle = s.col; rr(ctx, -r * 0.16, -r * 1.15, r * 0.32, r * 1.2, r * 0.1); ctx.fill();
      ctx.fillStyle = s.acc; rr(ctx, -r * 0.1, -r * 1.3, r * 0.2, r * 0.2, r * 0.06); ctx.fill(); ctx.restore();
      ctx.fillStyle = s.acc; circ(ctx, 0, -r * 0.2, r * 0.09); ctx.fill();
    },
    /* --- nuage (Cloud) --- */
    cloud(ctx, s) {
      const r = s.r, b = Math.sin(s.ph * TAU) * r * 0.1;
      ctx.fillStyle = s.dark;
      [[-0.55, 0], [0.5, 0.05], [0, -0.3], [-0.2, 0.2], [0.25, 0.25]].forEach(([x, y], i) => { circ(ctx, x * r, y * r + b, r * (0.55 - i * 0.04)); ctx.fill(); });
      ctx.fillStyle = s.col;
      [[-0.5, -0.05], [0.45, 0], [0, -0.35], [0, 0.15]].forEach(([x, y]) => { circ(ctx, x * r, y * r + b, r * 0.45); ctx.fill(); });
      ctx.fillStyle = s.acc; ctx.globalAlpha = .8;
      for (let i = 0; i < 3; i++) ctx.fillRect(-r * 0.3 + i * r * 0.28, -r * 0.05 + b, r * 0.06, r * 0.5);
      ctx.globalAlpha = 1;
    },
    /* --- araignée / crawler --- */
    spider(ctx, s) {
      const r = s.r, lt = Math.sin(s.ph * TAU) * r * 0.2;
      ctx.strokeStyle = s.dark; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
        const base = -r * 0.25 + i * r * 0.2, k = (i % 2 ? lt : -lt);
        ctx.beginPath(); ctx.moveTo(sx * r * 0.3, base); ctx.quadraticCurveTo(sx * r * 0.9, base - r * 0.3, sx * r * 1.05, base + r * 0.35 + k); ctx.stroke();
      }
      ctx.fillStyle = s.col; circ(ctx, 0, 0, r * 0.45); ctx.fill();
      ctx.fillStyle = s.dark; circ(ctx, 0, r * 0.35, r * 0.34); ctx.fill();
      ctx.fillStyle = s.acc; circ(ctx, -r * 0.16, -r * 0.1, r * 0.08); ctx.fill(); circ(ctx, r * 0.16, -r * 0.1, r * 0.08); ctx.fill();
    },
    /* --- humain (bureau) --- */
    human(ctx, s) {
      const r = s.r, sw = Math.sin(s.ph * TAU) * r * 0.3;
      ctx.strokeStyle = PAL.suit2; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.18, r * 0.15); ctx.lineTo(-r * 0.2 + sw, r * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.18, r * 0.15); ctx.lineTo(r * 0.2 - sw, r * 0.8); ctx.stroke();
      ctx.fillStyle = s.col; rr(ctx, -r * 0.5, -r * 0.6, r, r * 0.95, r * 0.24); ctx.fill();
      ctx.fillStyle = s.dark; rr(ctx, -r * 0.12, -r * 0.6, r * 0.24, r * 0.7, 2); ctx.fill();   // cravate
      ctx.fillStyle = PAL.human; circ(ctx, 0, -r * 0.85, r * 0.34); ctx.fill();
      ctx.fillStyle = s.dark; rr(ctx, -r * 0.36, -r * 1.18, r * 0.72, r * 0.3, r * 0.1); ctx.fill(); // cheveux/casque
      ctx.fillStyle = '#222'; circ(ctx, -r * 0.14, -r * 0.86, r * 0.05); ctx.fill(); circ(ctx, r * 0.14, -r * 0.86, r * 0.05); ctx.fill();
    },
    /* --- humain élite (imposant, cravate rouge) --- */
    brute(ctx, s) {
      const r = s.r, sw = Math.sin(s.ph * TAU) * r * 0.22;
      ctx.strokeStyle = PAL.suit2; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.22, r * 0.2); ctx.lineTo(-r * 0.24 + sw, r * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.22, r * 0.2); ctx.lineTo(r * 0.24 - sw, r * 0.85); ctx.stroke();
      ctx.fillStyle = s.col; rr(ctx, -r * 0.72, -r * 0.62, r * 1.44, r * 1.05, r * 0.26); ctx.fill();
      ctx.fillStyle = PAL.bad; rr(ctx, -r * 0.1, -r * 0.6, r * 0.2, r * 0.7, 2); ctx.fill();
      ctx.fillStyle = PAL.human; circ(ctx, 0, -r * 0.9, r * 0.36); ctx.fill();
      ctx.fillStyle = '#111'; rr(ctx, -r * 0.4, -r * 1.2, r * 0.8, r * 0.28, r * 0.1); ctx.fill();
      ctx.fillStyle = s.acc; circ(ctx, -r * 0.13, -r * 0.92, r * 0.06); ctx.fill(); circ(ctx, r * 0.13, -r * 0.92, r * 0.06); ctx.fill();
    },
    /* --- œil / scanner flottant --- */
    eye(ctx, s) {
      const r = s.r, b = Math.sin(s.ph * TAU) * r * 0.1;
      ctx.fillStyle = s.dark; circ(ctx, 0, b, r * 0.9); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, 0, b, r * 0.62); ctx.fill();
      ctx.fillStyle = s.col; circ(ctx, 0, b, r * 0.34); ctx.fill();
      ctx.fillStyle = '#04121a'; circ(ctx, 0, b, r * 0.16); ctx.fill();
      ctx.strokeStyle = M.rgba(s.acc, 0.5); ctx.lineWidth = r * 0.06;
      ctx.beginPath(); ctx.arc(0, b, r * 0.72, 0, TAU); ctx.stroke();
    },
    /* --- mech (gros) --- */
    mech(ctx, s) {
      const r = s.r, sw = Math.sin(s.ph * TAU) * r * 0.16;
      ctx.fillStyle = PAL.metalDark; rr(ctx, -r * 0.8, r * 0.1, r * 0.4, r * 0.9, r * 0.1); ctx.fill(); rr(ctx, r * 0.4, r * 0.1, r * 0.4, r * 0.9, r * 0.1); ctx.fill();
      ctx.fillStyle = s.col; rr(ctx, -r * 0.85, -r * 0.7, r * 1.7, r * 0.95, r * 0.18); ctx.fill();
      ctx.fillStyle = s.dark; rr(ctx, -r * 1.05, -r * 0.5 + sw, r * 0.35, r * 0.7, r * 0.1); ctx.fill(); rr(ctx, r * 0.7, -r * 0.5 - sw, r * 0.35, r * 0.7, r * 0.1); ctx.fill();
      ctx.fillStyle = PAL.metal; rr(ctx, -r * 0.5, -r * 1.15, r, r * 0.5, r * 0.12); ctx.fill();
      ctx.fillStyle = PAL.bad; rr(ctx, -r * 0.34, -r * 1.05, r * 0.68, r * 0.16, r * 0.06); ctx.fill();
    },
    /* --- wisp (petit esprit de données) --- */
    wisp(ctx, s) {
      const r = s.r, b = Math.sin(s.ph * TAU) * r * 0.2;
      const g = ctx.createRadialGradient(0, b, 0, 0, b, r);
      g.addColorStop(0, '#fff'); g.addColorStop(0.4, s.col); g.addColorStop(1, M.rgba(s.dark, 0));
      ctx.fillStyle = g; circ(ctx, 0, b, r); ctx.fill();
      ctx.fillStyle = s.acc; circ(ctx, 0, b, r * 0.2); ctx.fill();
    },
    /* --- cristal / shard --- */
    crystal(ctx, s) {
      const r = s.r, b = Math.sin(s.ph * TAU) * r * 0.08;
      ctx.save(); ctx.translate(0, b); ctx.rotate(Math.sin(s.ph * TAU * 0.5) * 0.12);
      const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, s.col); g.addColorStop(1, s.dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, -r * 0.1); ctx.lineTo(r * 0.35, r * 0.85); ctx.lineTo(-r * 0.35, r * 0.85); ctx.lineTo(-r * 0.6, -r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = M.rgba(s.acc, 0.65); ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.28, -r * 0.05); ctx.lineTo(0, r * 0.6); ctx.lineTo(-r * 0.1, -r * 0.05); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    /* --- main robotisée --- */
    hand(ctx, s) {
      const r = s.r, b = Math.sin(s.ph * TAU) * r * 0.1;
      ctx.fillStyle = s.dark; rr(ctx, -r * 0.18, r * 0.1, r * 0.36, r * 0.9, r * 0.1); ctx.fill();
      ctx.fillStyle = s.col; rr(ctx, -r * 0.55, -r * 0.5 + b, r * 1.1, r * 0.8, r * 0.2); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = s.col; rr(ctx, -r * 0.55 + i * r * 0.28, -r * 0.9 + b + (i === 1 || i === 2 ? 0 : r * 0.05), r * 0.2, r * 0.5, r * 0.08); ctx.fill(); }
      ctx.fillStyle = s.acc; circ(ctx, 0, -r * 0.05 + b, r * 0.1); ctx.fill();
    }
  };

  /* ---------- cache de sprites ---------- */
  const cache = new Map();
  function sprite(shape, opts) {
    opts = opts || {};
    const key = shape + '|' + (opts.col || '') + '|' + (opts.acc || '') + '|' + (opts.dark || '') + '|' + (opts.frame || 0) + '|' + (opts.em || 0);
    let c = cache.get(key);
    if (c) return c;
    const cv = document.createElement('canvas'); cv.width = cv.height = SPR;
    const ctx = cv.getContext('2d');
    const fn = SHAPES[shape] || SHAPES.bot;
    ctx.save(); ctx.translate(SPR / 2, SPR / 2);
    fn(ctx, { r: RENDER_R, ph: (opts.frame || 0) / 8, col: opts.col || '#8fa3bd', acc: opts.acc || PAL.neon1, dark: opts.dark || '#2b3550', em: opts.em || 0 });
    ctx.restore();
    c = { canvas: cv, r: RENDER_R, size: SPR };
    cache.set(key, c);
    if (cache.size > 900) { // borne le cache
      const first = cache.keys().next().value; cache.delete(first);
    }
    return c;
  }

  /* ---------- override PNG (assets/sprites/<id>.png) ---------- */
  const imgs = Object.create(null);
  function imgFor(id) {
    let e = imgs[id];
    if (e === undefined) {
      e = imgs[id] = { ok: false, img: null };
      const im = new Image();
      im.onload = () => { e.ok = true; e.img = im; };
      im.onerror = () => { e.ok = false; };
      im.src = 'assets/sprites/' + id + '.png';
    }
    return e.ok ? e.img : null;
  }

  NX.art = { SHAPES, sprite, PAL, RENDER_R, SPR, imgFor, circ, rr, leg, R: RENDER_R };
})();
