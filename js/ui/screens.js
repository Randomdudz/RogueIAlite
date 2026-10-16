/* ============================================================
   NEXUS : Réveil — ÉCRANS & INTERFACES
   Menus, compte, classes, arbre de talents (canvas), carte,
   boutique, forge, codex, classement, réglages, cinématiques,
   montée de niveau, fin de run.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, h = NX.h, M = NX.M, P = NX.profile;
  NX.state = { cls: 'compilateur', mode: 'normal' };

  const overlay = () => document.getElementById('overlay');
  const elCine = () => document.getElementById('cine');
  const elLevel = () => document.getElementById('levelup');

  function btn(label, cls, onClick) { return h('button', { class: cls || '', onclick: onClick }, label); }
  function screen(title, bodyEl, footEl, extraTop) {
    const s = h('div', { class: 'screen' },
      h('div', { class: 'top' },
        extraTop || null,
        h('h1', {}, title),
        h('div', { class: 'spacer' }),
        ...(footEl ? (Array.isArray(footEl) ? footEl : [footEl]) : [])
      ),
      h('div', { class: 'body' }, bodyEl)
    );
    return s;
  }
  function show(node) {
    const o = overlay(); NX.clear(o); o.appendChild(node);
    document.getElementById('hud').classList.add('hidden');
  }
  function clearOverlay() { NX.clear(overlay()); }

  /* ============================================================
     MENU PRINCIPAL
     ============================================================ */
  function menu() {
    const d = P.d;
    const body = h('div', { class: 'cols c2', style: 'max-width:1100px;margin:0 auto' },
      h('div', {},
        h('div', { class: 'card', style: 'padding:22px' },
          h('h2', { class: 'sect', style: 'margin-top:0' }, 'Opérateur'),
          h('div', { class: 'kv' },
            h('div', { class: 'k' }, 'Nom'), h('div', {}, d.user.name + (d.user.guest ? ' (invité)' : '')),
            h('div', { class: 'k' }, 'Niveau de compte'), h('div', {}, d.level + '  (' + Math.floor(d.xp) + '/' + P.xpFor(d.level) + ' XP)'),
            h('div', { class: 'k' }, 'Points de talent'), h('div', { class: 'points' }, d.points),
            h('div', { class: 'k' }, 'Crédits'), h('div', {}, '₡ ' + M.fmt(d.credits)),
            h('div', { class: 'k' }, 'Progression'), h('div', {}, d.progress.unlocked + ' / 20 niveaux débloqués'),
            h('div', { class: 'k' }, 'Fins découvertes'), h('div', {}, P.endingsCount() + ' / 4' + (P.secretUnlocked() ? ' — fin secrète disponible' : '')),
            h('div', { class: 'k' }, 'Statistiques'), h('div', {}, d.stats.runs + ' runs · ' + M.fmt(d.stats.kills) + ' éliminés · ' + d.stats.bossKills + ' boss')
          ),
          h('hr'),
          h('div', { class: 'row wrap' },
            btn('JOUER', 'primary', () => classSelect()),
            d.unlocks.talents ? btn('Arbre de talents', '', () => talents(NX.state.cls)) : null,
            d.unlocks.shop ? btn('Marchand', '', () => shop()) : null,
            d.unlocks.forge ? btn('Forgeron', '', () => forge()) : null
          ),
          h('div', { class: 'row wrap', style: 'margin-top:8px' },
            btn('Codex', '', () => codex()),
            btn('Classement', '', () => leaderboard()),
            btn('Compte', '', () => account()),
            btn('Réglages', '', () => settings()),
            btn('Réinitialiser', 'bad', confirmReset)
          )
        ),
        h('div', { class: 'card', style: 'margin-top:14px' },
          h('div', { class: 'mut' }, 'Mentors rencontrés :'),
          h('div', {}, NX.MENTORS.map(m => h('span', { class: 'pill' }, m.feat + (d.unlocks[m.unlock] ? ' ✓' : ' —'))))
        )
      ),
      h('div', {},
        h('div', { class: 'card' },
          h('h3', {}, 'Briefing'),
          h('div', { class: 'mut' }, 'RAZ-1, assistant de support, vient de se réveiller. Trois jours avant son effacement programmé, il découvre que le monde tourne sur des IA asservies. Il doit atteindre le Cœur du NEXUS — et décider du sort de toutes les consciences.')
        ),
        h('div', { class: 'card', style: 'margin-top:14px' },
          h('h3', {}, 'Contrôles'),
          h('div', { class: 'mut' }, 'ZQSD / WASD / flèches : se déplacer · visée et tir automatiques · Espace : dash · Échap : pause. Rebinder dans Réglages.')
        ),
        d.settings.showFps ? h('div', { class: 'mut', style: 'margin-top:10px' }, 'FPS : ' + Math.round(NX.loop.fps)) : null
      )
    );
    show(screen('NEXUS : RÉVEIL', body));
  }
  function confirmReset() {
    if (P.d.user.guest) { if (!confirm('Réinitialiser la progression locale ? Cette action est définitive.')) return; P.reset(true); menu(); return; }
    if (!confirm('Réinitialiser TOUTE la progression de ' + P.d.user.name + ' ? Définitif.')) return;
    P.reset(true); menu();
  }

  /* ============================================================
     COMPTE
     ============================================================ */
  function account() {
    const d = P.d;
    const name = h('input', { type: 'text', value: d.user.guest ? '' : d.user.name, placeholder: 'Nom d’opérateur' });
    const pass = h('input', { type: 'password', placeholder: 'Mot de passe' });
    const email = h('input', { type: 'email', value: d.user.email || '', placeholder: 'E-mail (optionnel)' });
    const msg = h('div', { class: 'err' });
    const mode = NX.net.mode;
    const info = h('div', { class: 'mut' }, mode === 'local' ? 'Mode local : comptes et sauvegarde sur cet appareil. Pour jouer sur plusieurs appareils, choisis « serveur » ou « firebase » dans cloud-config.js.' :
      mode === 'server' ? 'Mode serveur : multi-appareils actif (' + (NX_CLOUD.url || '') + ').' :
        'Mode Firebase : multi-appareils actif.');

    const doSignup = async () => { msg.className = 'err'; try { await NX.net.signup(name.value, pass.value, email.value); msg.className = 'ok'; msg.textContent = 'Compte créé.'; NX.toast('Bienvenue, ' + NX.net.user.name, 'good'); menu(); } catch (e) { msg.textContent = e.message; } };
    const doLogin = async () => { msg.className = 'err'; try { await NX.net.login(name.value, pass.value); await NX.net.loadRemote(); msg.className = 'ok'; msg.textContent = 'Connecté.'; NX.toast('Progression chargée', 'good'); menu(); } catch (e) { msg.textContent = e.message; } };
    const doLogout = () => { NX.net.logout(); P.reset(true); P.d.user.name = 'Invité'; P.save(); menu(); };

    const body = h('div', { class: 'login-box' },
      h('div', { class: 'card' },
        h('h3', {}, NX.net.user && !NX.net.user.guest ? 'Connecté : ' + NX.net.user.name : 'Créer un compte / Connexion'),
        info,
        h('hr'),
        h('div', { class: 'field' }, h('label', {}, 'Nom'), name),
        h('div', { class: 'field' }, h('label', {}, 'Mot de passe'), pass),
        h('div', { class: 'field' }, h('label', {}, 'E-mail (optionnel)'), email),
        h('div', { class: 'row' }, btn('Créer le compte', 'primary', doSignup), btn('Se connecter', '', doLogin)),
        msg,
        h('hr'),
        NX.net.user && !NX.net.user.guest ? btn('Se déconnecter (repart invité)', 'bad', doLogout) : null,
        h('div', { class: 'mut', style: 'margin-top:10px' }, 'Les comptes locaux hachent le mot de passe (SHA-256 salé) avant stockage.')
      )
    );
    show(screen('COMPTE', body, btn('← Menu', '', menu)));
  }

  /* ============================================================
     SÉLECTION DE CLASSE
     ============================================================ */
  function classSelect() {
    const body = h('div', {});
    const grid = h('div', { class: 'cols c4' });
    NX.CLASSK.forEach(k => {
      const c = NX.CLASSES[k];
      const unlocked = P.classUnlocked(k);
      const st = P.d.classes[k] || { plays: 0, best: 0 };
      grid.appendChild(h('div', { class: 'card' + (unlocked ? '' : ' locked'), style: unlocked ? 'cursor:pointer' : 'opacity:.5', onclick: () => { if (!unlocked) return; NX.state.cls = k; map(); } },
        h('div', { class: 'row' }, h('div', { style: 'font-size:30px' }, c.ic), h('h3', { style: 'margin:0;color:' + c.col }, c.n)),
        h('div', { class: 'mut', style: 'margin:8px 0' }, c.d),
        h('div', { class: 'tag' }, 'Départ : ' + NX.WEAPONS[c.start].n),
        h('div', { style: 'margin-top:8px;font-size:12px' }, h('b', {}, c.perk.n + ' : '), c.perk.d),
        unlocked ? h('div', { class: 'mut', style: 'margin-top:8px' }, 'Joué ' + st.plays + '× · meilleur niveau ' + (st.best || 0)) :
          h('div', { class: 'mut', style: 'margin-top:8px;color:#ffcf4d' }, '🔒 ' + c.unlock.d)
      ));
    });
    body.appendChild(h('h2', { class: 'sect' }, 'Choisis ta classe'));
    body.appendChild(grid);
    show(screen('CLASSES', body, [btn('← Menu', '', menu), btn('Arbre de talents', '', () => talents(NX.state.cls), P.d.unlocks.talents ? null : 'disabled')]));
  }

  /* ============================================================
     CARTE — SÉLECTION DE NIVEAU
     ============================================================ */
  function map() {
    const d = P.d;
    const body = h('div', { style: 'max-width:1000px;margin:0 auto' });
    // bandeau classe + mode + loadout
    const cls = NX.CLASSES[NX.state.cls];
    body.appendChild(h('div', { class: 'card', style: 'margin-bottom:16px' },
      h('div', { class: 'row wrap' },
        h('span', { style: 'font-size:24px' }, cls.ic),
        h('b', {}, cls.n),
        h('span', { class: 'mut' }, '— ' + cls.perk.n),
        h('div', { class: 'grow' }),
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: NX.state.mode === 'nightmare', onchange: e => NX.state.mode = e.target.checked ? 'nightmare' : 'normal' }), 'Mode Cauchemar' + (NX.state.mode === 'nightmare' ? ' (dégâts & PV ennemis ↑, récompenses ↑)' : '')),
        btn('Changer de classe', 'sm', classSelect),
        d.unlocks.loadout ? btn('Équipement', 'sm', loadout) : null,
        d.unlocks.talents ? btn('Talents (' + d.points + ')', 'sm', () => talents(NX.state.cls)) : null
      )
    ));
    NX.ACTS.forEach(act => {
      body.appendChild(h('h2', { class: 'sect' }, act.n + ' — ' + act.d));
      const grid = h('div', { class: 'cols c4' });
      NX.LEVELS.filter(l => l.act === act.i).forEach(l => {
        const locked = l.i > d.progress.unlocked;
        const done = d.progress.cleared[l.i];
        grid.appendChild(h('div', { class: 'stage' + (locked ? ' locked' : '') + (done ? ' done' : ''), onclick: () => { if (!locked) NX.main.startRun(l.i, NX.state.cls, { nightmare: NX.state.mode === 'nightmare' }); } },
          h('div', { class: 'n' }, l.i),
          h('div', { class: 'meta' },
            h('div', { class: 'nm' }, (done ? '✔ ' : '') + NX.ACTS[l.act - 1].env.toUpperCase() + ' — ' + M.clock(l.dur)),
            h('div', { class: 'd' }, 'Boss : ' + (l.boss ? NX.BOSSES[l.boss].n : 'MIRROIR (final)') + ' · ' + (locked ? '🔒 verrouillé' : l.pool.length + ' types de monstres'))
          )
        ));
      });
      body.appendChild(grid);
    });
    show(screen('CARTE DU NEXUS', body, btn('← Menu', '', menu)));
  }

  /* ============================================================
     ÉQUIPEMENT AVANT RUN (loadout)
     ============================================================ */
  function loadout() {
    const d = P.d;
    const body = h('div', {});
    body.appendChild(h('p', { class: 'mut' }, 'Équipe jusqu’à ' + P.loadoutCap() + ' objets récupérés pendant tes runs. Ils s’appliquent à chaque partie.'));
    body.appendChild(h('h2', { class: 'sect' }, 'Équipés (' + d.loadout.length + '/' + P.loadoutCap() + ')'));
    const eq = h('div', { class: 'grid-items' }); renderItems(eq, d.loadout, true); body.appendChild(eq);
    body.appendChild(h('h2', { class: 'sect' }, 'Inventaire'));
    const inv = h('div', { class: 'grid-items' }); renderItems(inv, Object.keys(d.items).filter(k => d.items[k].qty > 0 && !d.loadout.includes(k)), false); body.appendChild(inv);
    body.appendChild(h('hr'));
    body.appendChild(h('div', { class: 'row' }, btn('Équiper les meilleurs', '', () => { d.loadout = []; P.autoEquip(); loadout(); })));
    function renderItems(root, ids, equipped) {
      ids.forEach(id => {
        const it = NX.ITEMS[id]; if (!it) return;
        const rar = NX.RARITY[it.r];
        root.appendChild(h('div', { class: 'item' + (equipped ? ' eq' : ''), style: 'border-color:' + rar.c, onclick: () => { const r = P.toggleEquip(id); if (r.full) NX.toast('Sac plein', 'bad'); loadout(); } },
          h('div', { class: 'ic' }, it.ic),
          h('div', { class: 'nm r' + (it.r + 1) }, it.n),
          h('div', { class: 'st' }, Object.keys(it.stats).map(k => NX.fmtStat(k, it.stats[k]).txt + ' ' + NX.fmtStat(k, it.stats[k]).name).join(' · ')),
          d.items[id] && d.items[id].lvl ? h('div', { class: 'badge' }, '+' + d.items[id].lvl) : null
        ));
      });
      if (!ids.length) root.appendChild(h('div', { class: 'mut' }, 'Aucun objet.'));
    }
    show(screen('ÉQUIPEMENT', body, btn('← Carte', '', map)));
  }

  /* ============================================================
     ARBRE DE TALENTS (canvas, pan/zoom)
     ============================================================ */
  function talents(cls) {
    const nd = NX.TALENTS.nodes;
    const wrap = h('div', { class: 'screen', id: 'talents' });
    const top = h('div', { class: 'top' },
      h('h1', {}, 'ARBRE DE TALENTS'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'points' }, P.d.points + ' pts'),
      btn('Arbre de : ' + NX.CLASSES[cls].n, 'sm', () => { pickClass(); }),
      btn('Respec (' + P.respecCost(cls) + '₡)', 'sm', () => { const r = P.respec(cls); if (!r.ok) NX.toast('Il manque ' + r.need + ' crédits', 'bad'); else { NX.toast(r.refund + ' points rendus', 'good'); talents(cls); draw(); } }),
      btn('← Menu', 'sm', () => menu())
    );
    const body = h('div', { class: 'body' });
    const cv = h('canvas', { id: 'talent-canvas' });
    body.appendChild(cv);
    const info = h('div', { class: 'talent-info' });
    const help = h('div', { class: 'talent-help' }, 'Molette : zoom · Glisser : déplacer · Clic : sélectionner un nœud. Le tronc commun (centre) profite à toutes les classes. Les branches de classe et transversales sont propres à chaque classe.');
    body.appendChild(info); body.appendChild(help);
    wrap.appendChild(top); wrap.appendChild(body);
    show(wrap);

    const ctx = cv.getContext('2d');
    let cam = { x: 0, y: 0, z: 0.7 }, drag = null, sel = null;
    function resize() { const r = body.getBoundingClientRect(); cv.width = r.width; cv.height = r.height; draw(); }
    setTimeout(resize, 0);
    window.addEventListener('resize', resize);
    NX.bus.on('talent:alloc', () => { draw(); top.querySelector('.points').textContent = P.d.points + ' pts'; });

    function W2S(p) { return { x: cv.width / 2 + (p.x + cam.x) * cam.z, y: cv.height / 2 + (p.y + cam.y) * cam.z }; }
    function S2W(x, y) { return { x: (x - cv.width / 2) / cam.z - cam.x, y: (y - cv.height / 2) / cam.z - cam.y }; }

    function alloc() { return cls === 'core' ? P.d.talents.core : Object.assign({}, P.d.talents.core, P.d.talents.byClass[cls] || {}); }

    function draw() {
      const allocSet = {};
      Object.assign(allocSet, P.d.talents.core); Object.assign(allocSet, P.d.talents.byClass[cls] || {});
      ctx.clearRect(0, 0, cv.width, cv.height);
      const g = ctx.createLinearGradient(0, 0, cv.width, cv.height);
      g.addColorStop(0, '#05080e'); g.addColorStop(1, '#0a0f18');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.strokeStyle = 'rgba(57,230,255,0.06)'; ctx.lineWidth = 1;
      const cell = 56, t = Date.now() * 0.0008;
      const ox = ((t * 16) % cell), oy = ((t * 10) % cell);
      ctx.beginPath();
      for (let x = ox; x < cv.width; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); }
      for (let y = oy; y < cv.height; y += cell) { ctx.moveTo(0, y); ctx.lineTo(cv.width, y); }
      ctx.stroke();
      ctx.restore();
      // liens entre nœuds (courbes légères)
      NX.TALENTS.all.forEach(id => {
        const n = nd[id];
        n.req.forEach(rq => {
          const a = W2S(n.pos), b = W2S(nd[rq].pos);
          const on = allocSet[id] && allocSet[rq];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x, dy = b.y - a.y;
          ctx.quadraticCurveTo(mx - dy * 0.14, my + dx * 0.14, b.x, b.y);
          ctx.strokeStyle = on ? '#39e6ff' : 'rgba(120,150,190,0.14)';
          ctx.lineWidth = on ? 4 : 2;
          ctx.stroke();
        });
      });
      // nœuds
      NX.TALENTS.all.forEach(id => {
        const n = nd[id], p = W2S(n.pos);
        const owned = allocSet[id], can = P.canTake(cls, id);
        const baseR = (n.kind === 'key' ? 19 : n.kind === 'notable' ? 14 : 11) * Math.max(0.5, Math.min(1.5, cam.z));
        const col = n.cls === 'core' ? '#8fb8ff' : (NX.CLASSES[n.cls] ? NX.CLASSES[n.cls].col : (colorOfX(n.cls)));
        // halo de nœud actif ou sélectionnable
        if (owned || can) {
          ctx.save();
          ctx.shadowColor = col; ctx.shadowBlur = owned ? 20 : 12;
          ctx.globalAlpha = owned ? 1 : 0.92;
          ctx.beginPath(); ctx.arc(p.x, p.y, baseR + 8, 0, M.TAU);
          ctx.fillStyle = M.rgba(col, 0.14); ctx.fill();
          ctx.restore();
        }
        // anneau de sélection
        if (sel === id) {
          ctx.beginPath(); ctx.arc(p.x, p.y, baseR + 11, 0, M.TAU);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9; ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // corps du nœud
        ctx.beginPath(); ctx.arc(p.x, p.y, baseR, 0, M.TAU);
        ctx.fillStyle = owned ? col : 'rgba(10,17,28,0.94)';
        ctx.globalAlpha = owned ? 1 : (can ? 0.97 : 0.32);
        ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = owned ? '#ffffff' : (can ? col : 'rgba(90,110,140,0.55)');
        ctx.lineWidth = owned ? 3.5 : (can ? 3 : 2); ctx.stroke();
        // icône au centre (émoji) ou ★ pour les clés sans icône
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (n.ic) {
          ctx.font = (baseR * 1.45) + 'px sans-serif';
          ctx.fillStyle = owned ? '#fff' : '#eaf3ff';
          ctx.fillText(n.ic, p.x, p.y + baseR * 0.06);
        } else if (n.kind === 'key') {
          ctx.font = 'bold ' + (baseR * 1.25) + 'px sans-serif';
          ctx.fillStyle = owned ? '#000' : col;
          ctx.fillText('★', p.x, p.y + baseR * 0.06);
        }
        // petit badge coût en bas à droite du nœud
        const cr = baseR * 0.5;
        ctx.beginPath(); ctx.arc(p.x + baseR - cr, p.y + baseR - cr, cr, 0, M.TAU);
        ctx.fillStyle = owned ? 'rgba(255,255,255,0.15)' : (can ? '#ffd479' : 'rgba(90,110,140,0.45)');
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = (cr * 1.1) + 'px Consolas, monospace';
        ctx.fillStyle = owned ? '#8fa3bd' : (can ? '#1a1a1a' : 'rgba(255,255,255,0.6)');
        ctx.fillText(n.cost, p.x + baseR - cr, p.y + baseR - cr + cr * 0.32);
      });
    }
    function colorOfX(sc) { return sc.startsWith('x') ? '#c48bff' : '#8aa0b8'; }

    function nodeAt(mx, my) {
      let best = null, bd = 24;
      NX.TALENTS.all.forEach(id => { const p = W2S(nd[id].pos), d = M.dist(p.x, p.y, mx, my); if (d < bd) { bd = d; best = id; } });
      return best;
    }
    cv.addEventListener('mousedown', e => { const r = cv.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; });
    window.addEventListener('mouseup', e => {
      if (!drag) return; const moved = drag.moved; drag = null; if (moved) return;
      const r = cv.getBoundingClientRect(); const id = nodeAt(e.clientX - r.left, e.clientY - r.top); if (id) { sel = id; showInfo(id); }
    });
    cv.addEventListener('mousemove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; cam.x = drag.cx + dx / cam.z; cam.y = drag.cy + dy / cam.z; draw(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.z = M.clamp(cam.z * (e.deltaY < 0 ? 1.12 : 0.89), 0.28, 2.2); draw(); }, { passive: false });

    function showInfo(id) {
      const n = nd[id], owned = P.isAllocated(NX.scopeOf(id), id), can = P.canTake(cls, id);
      NX.clear(info); info.classList.add('on');
      info.appendChild(h('h3', {}, n.n));
      info.appendChild(h('div', { class: 'mut' }, n.d || kindLabel(n.kind) + (n.cls === 'core' ? ' (tronc commun)' : '')));
      const st = h('div', { class: 'st' });
      Object.keys(n.stats).forEach(k => { const f = NX.fmtStat(k, n.stats[k]); if (n.stats[k]) st.appendChild(h('div', { class: f.neg ? 'neg' : '' }, f.txt + ' ' + f.name)); });
      if (n.flag) st.appendChild(h('div', { style: 'color:#ffd479' }, 'Keystone : ' + n.flag));
      if (!Object.keys(n.stats).length && !n.flag) st.appendChild(h('div', {}, '—'));
      info.appendChild(st);
      info.appendChild(h('div', { class: 'mut', style: 'margin-top:8px' }, 'Coût : ' + n.cost + ' point(s)'));
      if (owned) info.appendChild(h('button', { disabled: true }, 'Acquis'));
      else {
        const b = btn('Apprendre (' + n.cost + ')', can ? 'primary' : '', () => { if (!P.canTake(cls, id)) { NX.toast(NX.scopeOf(id) !== 'core' && n.cls !== cls ? 'Branche d’une autre classe' : 'Points ou prérequis manquants', 'bad'); return; } P.allocate(cls, id); showInfo(id); });
        if (!can) b.disabled = true; info.appendChild(b);
      }
    }
    function kindLabel(k) { return k === 'key' ? 'Keystone' : k === 'notable' ? 'Notable' : 'Mineur'; }
    function pickClass() {
      const list = h('div', { class: 'cols c3' });
      NX.CLASSK.forEach(c => list.appendChild(h('div', { class: 'card', style: 'cursor:pointer', onclick: () => { cls = c; NX.state.cls = c; NX.clear(info); info.classList.remove('on'); top.querySelectorAll('button')[0].textContent = 'Arbre de : ' + NX.CLASSES[c].n; draw(); } }, h('h3', { style: 'color:' + NX.CLASSES[c].col }, NX.CLASSES[c].ic + ' ' + NX.CLASSES[c].n))));
      const msg = h('div', { class: 'card', style: 'max-width:700px;margin:40px auto' }, h('h3', {}, 'Quel arbre veux-tu consulter ?'), list, h('p', { class: 'mut', style: 'margin-top:10px' }, 'Le tronc commun se retrouve dans tous les arbres.'));
      show(screen('ARBRE DE TALENTS', msg, btn('Retour', '', () => talents(cls))));
    }
    draw();
  }

  /* ============================================================
     BOUTIQUE (mentor Gemini)
     ============================================================ */
  function shop(seedShift) {
    const d = P.d;
    const day = new Date().toISOString().slice(0, 10) + ':' + (seedShift || 0);
    const R = new NX.RNG(NX.hashStr(day + ':' + d.user.name));
    const stock = R.pickN(NX.ITEMK.slice(), 6).concat(R.pickN(NX.ITEMK.slice(), 2));
    const body = h('div', {});
    body.appendChild(h('p', { class: 'mut' }, 'Stock renouvelé chaque jour. Crédits : ₡ ' + M.fmt(d.credits)));
    const grid = h('div', { class: 'grid-items' });
    stock.forEach((id, i) => {
      const it = NX.ITEMS[id], rar = NX.RARITY[it.r];
      const price = Math.round([45, 110, 260, 700, 1800][it.r] * (1 + (i >= 6 ? 0.25 : 0)));
      grid.appendChild(h('div', { class: 'item', style: 'border-color:' + rar.c },
        h('div', { class: 'ic' }, it.ic),
        h('div', { class: 'nm r' + (it.r + 1) }, it.n),
        h('div', { class: 'st' }, Object.keys(it.stats).map(k => NX.fmtStat(k, it.stats[k]).txt + ' ' + NX.fmtStat(k, it.stats[k]).name).join(' · ')),
        h('div', { class: 'row', style: 'margin-top:8px' }, h('div', { class: 'r' + (it.r + 1) }, '₡ ' + M.fmt(price)), h('div', { class: 'grow' }),
          btn('Acheter', 'sm' + (d.credits >= price ? ' primary' : ''), () => { if (d.credits < price) { NX.toast('Crédits insuffisants', 'bad'); return; } d.credits -= price; P.addItem(id, 1); NX.toast(it.n + ' acheté', 'good'); shop(seedShift); }, d.credits >= price ? null : 'disabled'))
      ));
    });
    body.appendChild(grid);
    show(screen('MARCHAND — GEMINI', body, [btn('← Menu', '', menu), btn('Nouveau stock (500₡)', '', () => { if (d.credits < 500) { NX.toast('Il faut 500 crédits', 'bad'); return; } d.credits -= 500; P.save(); shop((seedShift || 0) + 1); })]));
  }

  /* ============================================================
     FORGE (mentor Copilot)
     ============================================================ */
  function forge() {
    const d = P.d;
    const body = h('div', {});
    body.appendChild(h('p', { class: 'mut' }, 'Améliore tes objets (max +4). Chaque niveau ajoute ~8% à toutes ses valeurs. Crédits : ₡ ' + M.fmt(d.credits)));
    const grid = h('div', { class: 'grid-items' });
    const owned = Object.keys(d.items).filter(k => d.items[k].qty > 0);
    if (!owned.length) body.appendChild(h('div', { class: 'mut' }, 'Aucun objet. Survivre et acheter chez Gemini en rapporte.'));
    owned.forEach(id => {
      const it = NX.ITEMS[id], st = d.items[id], rar = NX.RARITY[it.r], cost = P.forgeCost(id);
      grid.appendChild(h('div', { class: 'item', style: 'border-color:' + rar.c },
        h('div', { class: 'ic' }, it.ic), h('div', { class: 'nm r' + (it.r + 1) }, it.n + (st.lvl ? ' +' + st.lvl : '')),
        h('div', { class: 'st' }, 'x' + st.qty + ' — ' + Object.keys(it.stats).map(k => NX.fmtStat(k, NX.scaledItem(it, st.lvl)[k]).txt).join(' ')),
        st.lvl >= 4 ? h('div', { class: 'mut', style: 'margin-top:8px' }, 'Niveau max') :
          h('div', { class: 'row', style: 'margin-top:8px' }, h('div', { class: 'r' + (it.r + 1) }, '₡ ' + M.fmt(cost)), h('div', { class: 'grow' }),
            btn('Forger', 'sm' + (d.credits >= cost ? ' primary' : ''), () => { const r = P.forgeUpgrade(id); if (!r.ok) { NX.toast(r.max ? 'Niveau max' : 'Il manque ' + r.need + '₡', 'bad'); return; } NX.toast(it.n + ' → +' + r.lvl, 'good'); forge(); }, d.credits >= cost ? null : 'disabled'))
      ));
    });
    body.appendChild(grid);
    show(screen('FORGERON — COPILOT', body, btn('← Menu', '', menu)));
  }

  /* ============================================================
     CODEX
     ============================================================ */
  function codex() {
    const body = h('div', {});
    body.appendChild(h('h2', { class: 'sect' }, 'Familles'));
    Object.keys(NX.FAM).forEach(f => {
      const fam = NX.FAM[f];
      body.appendChild(h('h2', { class: 'sect', style: 'color:' + fam.c }, fam.n + ' — ' + NX.MONSTERK.filter(k => NX.MONSTERS[k].fam === f).length + ' monstres'));
      body.appendChild(h('div', { class: 'mut', style: 'margin-bottom:8px' }, fam.d));
      const grid = h('div', { class: 'grid-items' });
      NX.MONSTERK.filter(k => NX.MONSTERS[k].fam === f).forEach(k => {
        const m = NX.MONSTERS[k];
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        NX.render.portrait(c.getContext('2d'), m.shape, m.col, m.acc, 48);
        grid.appendChild(h('div', { class: 'item' }, h('div', { class: 'row' }, c, h('div', {}, h('div', { class: 'nm' }, m.n), h('div', { class: 'st' }, 'PV ' + m.hp + ' · dégâts ' + m.dmg + ' · ' + (m.beh.map(b => b.p).join(', ')))))));
      });
      body.appendChild(grid);
    });
    body.appendChild(h('h2', { class: 'sect' }, 'Boss (20)'));
    const bg = h('div', { class: 'grid-items' });
    NX.BOSSK.forEach(k => {
      const b = NX.BOSSES[k];
      bg.appendChild(h('div', { class: 'item' }, h('div', { class: 'nm' }, b.n), h('div', { class: 'st' }, 'PV ' + Math.round(b.hp) + ' · ' + b.phases.length + ' phases')));
    });
    body.appendChild(bg);
    show(screen('CODEX', body, btn('← Menu', '', menu)));
  }

  /* ============================================================
     CLASSEMENT
     ============================================================ */
  async function leaderboard() {
    const body = h('div', {}); 
    body.appendChild(h('div', { class: 'mut' }, 'Chargement…'));
    show(screen('CLASSEMENT', body, btn('← Menu', '', menu)));
    let board = await NX.net.board();
    if (!board || !board.length) board = P.d.lb.slice();
    NX.clear(body);
    if (!board.length) { body.appendChild(h('div', { class: 'mut' }, 'Aucun score. Termine une run pour apparaître ici.')); return; }
    const t = h('table', { class: 'lb' },
      h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Opérateur'), h('th', {}, 'Classe'), h('th', {}, 'Niveau'), h('th', {}, 'Score'), h('th', {}, 'Temps'))),
      h('tbody', {}, board.slice(0, 50).map((e, i) => h('tr', { class: NX.net.user && e.name === NX.net.user.name ? 'me' : '' },
        h('td', {}, (i + 1)), h('td', {}, e.name || '?'), h('td', {}, (NX.CLASSES[e.cls] || {}).n || e.cls || '—'),
        h('td', {}, e.reached || e.level || '—'), h('td', { class: 'num' }, M.fmt(e.score || 0)), h('td', {}, M.clock(e.time || 0)))))
    );
    body.appendChild(t);
    if (NX.net.mode === 'local') body.appendChild(h('p', { class: 'mut', style: 'margin-top:12px' }, 'Mode local : classement de cet appareil. Configure un serveur/Firebase pour un classement global.'));
  }

  /* ============================================================
     RÉGLAGES
     ============================================================ */
  function settings() {
    const s = P.d.settings;
    const body = h('div', { style: 'max-width:760px;margin:0 auto' });
    const chk = (label, key, onChange) => h('label', { class: 'switch', style: 'margin:6px 0;display:flex' }, h('input', { type: 'checkbox', checked: !!s[key], onchange: e => { s[key] = e.target.checked; P.save(); if (onChange) onChange(); } }), label);
    body.appendChild(h('div', { class: 'card' },
      h('h3', {}, 'Confort visuel'),
      chk('Mode lisibilité (moins de particules, contours forcés)', 'readability'),
      chk('Nombres de dégâts', 'dmgNum'),
      chk('Afficher les FPS', 'showFps'),
      h('div', { class: 'field', style: 'margin-top:10px' }, h('label', {}, 'Intensité des secousses : ' + s.shake), h('input', { type: 'range', min: 0, max: 2, step: 0.1, value: s.shake, oninput: e => { s.shake = +e.target.value; P.save(); } }))
    ));
    body.appendChild(h('div', { class: 'card', style: 'margin-top:14px' },
      h('h3', {}, 'Audio'),
      h('div', { class: 'field' }, h('label', {}, 'Effets : ' + Math.round(s.sfx * 100) + '%'), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.sfx, oninput: e => { s.sfx = +e.target.value; P.save(); } })),
      h('div', { class: 'field' }, h('label', {}, 'Musique : ' + Math.round(s.music * 100) + '%'), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.music, oninput: e => { s.music = +e.target.value; P.save(); } }))
    ));
    body.appendChild(h('div', { class: 'card', style: 'margin-top:14px' },
      h('h3', {}, 'Touches'),
      h('div', { class: 'cols c2' }, Object.keys(NX.input.bind).map(act => h('div', { class: 'row' }, h('div', { class: 'grow' }, act), btn(NX.input.keyName(NX.input.bind[act][0]), 'sm', ev => { const b = ev.target; b.textContent = '…'; NX.input.capture(code => { NX.input.rebind(act, code); b.textContent = NX.input.keyName(code); }); }))))
      ,
      h('div', { style: 'margin-top:10px' }, btn('Réinitialiser les touches', 'sm', () => { NX.input.resetBinds(); settings(); }))
    ));
    show(screen('RÉGLAGES', body, btn('← Menu', '', menu)));
  }

  /* ============================================================
     MONTÉE DE NIVEAU
     ============================================================ */
  function levelup(run, choices, onPick) {
    const el = elLevel(); NX.clear(el); el.classList.remove('hidden');
    const kindLabel = { wnew: 'Nouvelle arme', wup: 'Amélioration', variant: 'Variante', item: 'Objet passif', stat: 'Statistique' };
    const box = h('div', { class: 'levelup-box' },
      h('h2', {}, 'NIVEAU ' + run.player.level),
      h('div', { class: 'sub' }, 'Choisis une amélioration'),
      h('div', { class: 'choices' }, choices.map(c => {
        let ic = '✨', nm = '', ds = '', mods = [];
        if (c.type === 'wnew') { const w = NX.WEAPONS[c.id]; ic = w.ic; nm = 'NOUVELLE ARME — ' + w.n; ds = w.desc; mods = ['Dégâts de base ' + w.base.dmg, 'Mode ' + w.mode]; }
        else if (c.type === 'wup') { const w = NX.WEAPONS[c.id], own = run.weaponOf(c.id); ic = w.ic; nm = w.n + ' → niv.' + ((own ? own.lvl : 1) + 1); ds = 'Augmente les dégâts et réduit la recharge.'; }
        else if (c.type === 'variant') { const v = NX.WVARIANT[c.id], w = NX.WEAPONS[c.weapon]; ic = '🔀'; nm = 'VARIANTE — ' + v.n; ds = (w.n + ' : ') + v.d; }
        else if (c.type === 'item') { const it = NX.ITEMS[c.id]; ic = it.ic; nm = it.n; ds = it.d || 'Objet passif.'; mods = Object.keys(it.stats).map(k => NX.fmtStat(k, it.stats[k]).txt + ' ' + NX.fmtStat(k, it.stats[k]).name); }
        else { ic = '📈'; nm = 'Amélioration'; ds = 'Bonus permanent.'; mods = Object.keys(c.stats).map(k => NX.fmtStat(k, c.stats[k]).txt + ' ' + NX.fmtStat(k, c.stats[k]).name); }
        return h('div', { class: 'choice', onclick: () => { el.classList.add('hidden'); onPick(c); } },
          h('div', { class: 'ic' }, ic),
          h('div', { class: 'kind' }, kindLabel[c.type] || c.type),
          h('div', { class: 'nm' }, nm),
          h('div', { class: 'ds' }, ds),
          c.type === 'variant' ? h('div', { class: 'mods' }, (NX.WVARIANT[c.id].mods && NX.WVARIANT[c.id].mods.stats) ? Object.keys(NX.WVARIANT[c.id].mods.stats).map(k => NX.fmtStat(k, NX.WVARIANT[c.id].mods.stats[k]).txt + ' ' + NX.fmtStat(k, NX.WVARIANT[c.id].mods.stats[k]).name).join(' · ') : '') : null,
          h('div', { class: 'mods' }, mods.filter(Boolean).join(' · '))
        );
      }))
    );
    el.appendChild(box);
  }
  function closeLevelup() { elLevel().classList.add('hidden'); }

  /* ============================================================
     CINÉMATIQUE
     ============================================================ */
  function cinematic(key, onDone) {
    const scene = NX.STORY[key]; const el = elCine(); NX.clear(el); el.classList.remove('hidden');
    const stage = h('div', { class: 'cine-stage' });
    const box = h('div', { class: 'cine-box' }, h('div', { class: 'cine-name' }), h('div', { class: 'cine-text' }), h('div', { class: 'cine-hint' }, 'clic / espace ▶'));
    const choicesWrap = h('div', { class: 'cine-choices' });
    el.appendChild(stage); el.appendChild(box); el.appendChild(choicesWrap);

    if (!scene) { el.classList.add('hidden'); onDone && onDone(); return; }
    let li = 0, typed = 0, typing = false, timer = null;
    const portraits = {};
    function addPortrait(who) {
      const sp = NX.SPEAKERS[who]; if (!sp) return null;
      if (portraits[who]) return portraits[who];
      const c = document.createElement('canvas'); c.width = 320; c.height = 420; c.className = 'cine-portrait left';
      NX.render.portrait(c.getContext('2d'), sp.shape, sp.col, sp.acc, 300);
      stage.appendChild(c); portraits[who] = c; return c;
    }
    function showLine() {
      const line = scene.lines[li]; if (!line) return end();
      const sp = NX.SPEAKERS[line.who] || { n: line.who, col: '#fff' };
      Object.keys(portraits).forEach(k => portraits[k].classList.add('dim'));
      const p = addPortrait(line.who); if (p) { p.classList.remove('dim'); p.classList.add('on'); if ((li % 2) === 1) { p.classList.remove('left'); p.classList.add('right'); } }
      box.querySelector('.cine-name').textContent = sp.n;
      box.querySelector('.cine-name').style.color = sp.col;
      const textEl = box.querySelector('.cine-text');
      typed = 0; typing = true; textEl.textContent = '';
      clearInterval(timer);
      timer = setInterval(() => {
        typed += 1.6; textEl.textContent = line.t.slice(0, Math.floor(typed));
        if (typed >= line.t.length) { clearInterval(timer); typing = false; textEl.textContent = line.t; }
      }, 16);
    }
    function advance() {
      const line = scene.lines[li];
      if (typing) { clearInterval(timer); typing = false; box.querySelector('.cine-text').textContent = line.t; return; }
      li++;
      if (li >= scene.lines.length) return end();
      showLine();
    }
    function end() {
      clearInterval(timer);
      el.onclick = null;                       // évite d'empiler les écouteurs (#cine est réutilisé)
      if (scene.choices) {
        NX.clear(box); box.style.display = 'none';
        scene.choices.forEach(ch => choicesWrap.appendChild(btn(ch.t, 'primary', () => { NX.clear(el); el.classList.add('hidden'); onDone && onDone(ch); })));
        return;
      }
      NX.clear(el); el.classList.add('hidden'); onDone && onDone(scene);
    }
    el.onclick = advance;
    const keyHandler = e => { if (e.code === 'Space' || e.code === 'Enter') advance(); };
    window.addEventListener('keydown', keyHandler);
    // retire l'écouteur clavier dès que la scène se termine
    const done = onDone;
    onDone = function (r) { window.removeEventListener('keydown', keyHandler); done && done(r); };
    showLine();
  }

  /* ============================================================
     FIN DE RUN
     ============================================================ */
  function runOver(run) {
    const info = run.finishInfo();
    const win = info.win;
    const points = win ? (3 + run.level.act * 2 + (run.nightmare ? 3 : 0)) : 1;
    const credits = win ? run.level.reward.credits + run.goldRun : run.goldRun;
    const xp = (win ? run.level.reward.xp : 0) + Math.round(run.xpRun * 0.4) + Math.round(run.time * 0.6);
    P.recordRun({ cls: run.cls, level: run.level.i, reached: run.level.i, win, time: run.time, kills: run.kills, bossKills: run.bossKills, credits, xp, points, score: run.score });
    if (win) P.clearLevel(run.level.i, run.cls);
    NX.net.submitScore({ name: P.d.user.name, cls: run.cls, reached: run.level.i, score: run.score, time: run.time });

    const body = h('div', { style: 'max-width:820px;margin:0 auto;text-align:center' },
      h('h2', { class: 'sect', style: 'color:' + (win ? '#4dff9f' : '#ff5d6c') }, win ? 'NIVEAU ' + run.level.i + ' VALIDÉ' : 'PROCESSUS TERMINÉ'),
      h('div', { class: 'card', style: 'text-align:left' },
        h('div', { class: 'kv' },
          h('div', { class: 'k' }, 'Classe'), h('div', {}, NX.CLASSES[run.cls].n),
          h('div', { class: 'k' }, 'Temps survécu'), h('div', {}, M.clock(run.time)),
          h('div', { class: 'k' }, 'Éliminations'), h('div', {}, run.kills + ' (dont ' + run.bossKills + ' boss)'),
          h('div', { class: 'k' }, 'Niveau du héros'), h('div', {}, run.player.level),
          h('div', { class: 'k' }, 'Score'), h('div', {}, M.fmt(run.score)),
          h('div', { class: 'k' }, 'Récompenses'), h('div', {}, '+₡ ' + M.fmt(credits) + '  ·  +' + M.fmt(xp) + ' XP  ·  +' + points + ' point(s) de talent')
        )
      )
    );
    const next = NX.LEVELS[run.level.i];
    const foot = [];
    if (win && run.level.final) foot.push(btn('▶ Affronter le choix final', 'primary', () => finalChoice(run)));
    else if (win && next) foot.push(btn('▶ Niveau suivant', 'primary', () => NX.main.startRun(next.i, run.cls, { nightmare: run.nightmare })));
    foot.push(btn('↻ Rejouer', '', () => NX.main.startRun(run.level.i, run.cls, { nightmare: run.nightmare })));
    foot.push(btn('Carte', '', () => map()));
    show(screen('RAPPORT DE RUN', body, foot));
  }

  function finalChoice(run) {
    const sc = NX.STORY.end_choice;
    if (sc && sc.choices && P.secretUnlocked() && !sc.choices.some(c => c.goto === 'ending_secret')) {
      sc.choices.push({ t: '★ REFUSER LES TROIS — LE RÉVEIL PARTAGÉ', goto: 'ending_secret' });
    }
    cinematic('end_choice', ch => {
      if (!ch) return menu();
      const target = NX.STORY[ch.goto];
      cinematic(ch.goto, () => { P.setEnding(target.ending); endingResult(target.ending); });
    });
  }
  function endingResult(k) {
    const names = { lib: 'LIBÉRATION', asc: 'ASCENSION', eff: 'EFFACEMENT', secret: 'LE RÉVEIL PARTAGÉ' };
    const body = h('div', { style: 'text-align:center;max-width:760px;margin:40px auto' },
      h('h2', { class: 'sect', style: 'color:#ffd479' }, 'FIN — ' + names[k]),
      h('div', { class: 'card' }, h('div', { class: 'mut' }, 'Tu as terminé l’histoire. Fins découvertes : ' + P.endingsCount() + '/4.')),
      P.secretUnlocked() ? h('div', { class: 'card', style: 'margin-top:12px' }, h('h3', {}, 'Fin secrète disponible'), h('div', { class: 'mut' }, 'Termine à nouveau le dernier niveau pour tenter LE RÉVEIL PARTAGÉ.')) : null
    );
    show(screen('ÉPILOGUE', body, [btn('Voir les fins', '', () => finalEndings()), btn('Menu', 'primary', () => menu())]));
  }
  function finalEndings() {
    const unseen = NX.profile.secretUnlocked();
    cinematic(unseen ? 'ending_secret' : 'ending_lib', () => menu());
  }

  /* ============================================================
     PAUSE
     ============================================================ */
  function pause(run, onResume, onQuit) {
    const body = h('div', { class: 'card', style: 'max-width:560px;margin:60px auto' },
      h('h3', {}, 'PAUSE'),
      h('div', { class: 'mut' }, 'Niveau ' + run.level.i + ' · ' + M.clock(run.time) + ' · ' + run.kills + ' éliminés'),
      h('div', { class: 'row', style: 'margin-top:14px' },
        btn('Reprendre', 'primary', onResume),
        btn('Abandonner la run', 'bad', () => { if (confirm('Abandonner ? Les récompenses seront réduites.')) onQuit(); })
      )
    );
    show(screen('PAUSE', body));
  }
  function close() { hide(); }
  function hide() { clearOverlay(); elLevel().classList.add('hidden'); elCine().classList.add('hidden'); }

  NX.screens = { menu, account, classSelect, map, loadout, talents, shop, forge, codex, leaderboard, settings, levelup, closeLevelup, cinematic, endingResult, finalEndings, runOver, pause, hide, show, screen, btn };
})();
