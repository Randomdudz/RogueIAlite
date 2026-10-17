/* ============================================================
   NEXUS : Réveil — HUD
   Barres de vie/XP, minuterie, armes, objets, barre de boss.
   Construit une fois, puis mis à jour chaque frame (écritures directes).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, h = NX.h, M = NX.M;
  let el = null, refs = null, weaponSig = '', itemSig = '';

  function bind(ref, sel) { ref[sel] = el.querySelector(sel); }

  function mount(run) {
    el = document.getElementById('hud');
    NX.clear(el);
    el.classList.remove('hidden');
    const novice = NX.profile.d;
    const root = h('div', { class: 'hud-wrap', style: 'display:flex;flex-direction:column;justify-content:space-between;height:100%;padding:12px 16px' },
      h('div', { class: 'hud-top' },
        h('div'),
        h('div', { style: 'text-align:center' },
          h('div', { class: 'hud-timer' }, '00:00'),
          h('div', { class: 'mut timer-sub', style: 'font-size:11px' }, '')
        ),
        h('div', { class: 'hud-stats' },
          h('div', { class: 'hs1' }),
          h('div', { class: 'mut hs2' })
        )
      ),
      h('div', { class: 'hud-mid' }, h('div', { class: 'bossbar' })),
      h('div', { class: 'hud-bot' },
        h('div', { class: 'slots' }),
        h('div', { class: 'grow' }),
        h('div', { class: 'hud-items', style: 'display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:520px' }),
        h('div', { class: 'hud-right mut', style: 'text-align:right;font-size:12px' },
          h('div', { class: 'hr1', style: 'color:#ffd479;font-weight:600' }),
          h('div', { class: 'hr2' }),
          h('div', { class: 'hr3' })
        )
      )
    );
    el.appendChild(root);
    refs = {
      timer: el.querySelector('.hud-timer'), sub: el.querySelector('.timer-sub'),
      stats: el.querySelector('.hud-stats'), slots: el.querySelector('.slots'),
      boss: el.querySelector('.bossbar'), items: el.querySelector('.hud-items'), right: el.querySelector('.hud-right'),
      hs1: el.querySelector('.hs1'), hs2: el.querySelector('.hs2'),
      hr1: el.querySelector('.hr1'), hr2: el.querySelector('.hr2'), hr3: el.querySelector('.hr3'),
      _s1: '', _s2: '', _r1: '', _r2: '', _r3: '', _timer: '', _sub: ''
    };
    weaponSig = ''; itemSig = '';
  }

  function update(run) {
    if (!el || !refs) return;
    const p = run.player, st = run.stats;

    const remaining = run.bossSpawned ? 0 : Math.max(0, run.level.dur - run.time);
    const timerTxt = M.clock(run.bossSpawned ? run.time : remaining);
    if (timerTxt !== refs._timer) { refs._timer = timerTxt; refs.timer.textContent = timerTxt; }
    const subTxt = run.bossSpawned ? 'ÉLIMINEZ LE BOSS' : (run.time >= run.level.dur ? 'BOSS IMMINENT' : 'survie — niveau ' + run.reached + '/20');
    if (subTxt !== refs._sub) { refs._sub = subTxt; refs.sub.textContent = subTxt; }

    // textes mis à jour uniquement lorsqu'ils changent (évite de recréer des
    // nœuds DOM à chaque frame → pression sur le ramasse-miettes)
    const s1 = '☠ ' + run.kills + '   ₡ ' + M.short(run.goldRun) + '   ⌁ ' + M.short(run.xpRun) + ' data';
    if (s1 !== refs._s1) { refs._s1 = s1; refs.hs1.textContent = s1; }
    const s2 = 'Armes ' + p.weapons.length + '/4   Dégâts x' + (st.dmgMul).toFixed(2) + '   Zone x' + st.areaMul.toFixed(2) + '   Crit ' + Math.round(st.crit) + '%';
    if (s2 !== refs._s2) { refs._s2 = s2; refs.hs2.textContent = s2; }

    // armes
    const sig = p.weapons.map(w => w.id + ':' + w.variant + ':' + w.lvl).join('|');
    if (sig !== weaponSig) {
      weaponSig = sig;
      NX.clear(refs.slots);
      p.weapons.forEach(w => {
        const def = NX.WEAPONS[w.id];
        const res = NX.resolveWeapon(w.id, w.variant, w.lvl, st);
        const vname = w.variant && NX.WVARIANT[w.variant] ? NX.WVARIANT[w.variant].n : null;
        const slot = h('div', { class: 'slot' + (w.lvl >= 8 ? ' max' : ''), title: def.n + (vname ? ' — ' + vname : '') + ' (niv.' + w.lvl + ')' + '\n' + def.desc },
          h('div', { class: 'ic' }, def.ic), h('div', { class: 'lv' }, 'n' + w.lvl), h('div', { class: 'cd' }));
        refs.slots.appendChild(slot);
      });
    }
    // cooldowns (parcours simple, l'ordre correspond aux slots)
    const slotEls = refs.slots.children;
    p.weapons.forEach((w, i) => {
      const s = slotEls[i]; if (!s) return;
      const def = NX.WEAPONS[w.id];
      const cd = s.querySelector('.cd');
      const total = (w._res || NX.resolveWeapon(w.id, w.variant, w.lvl, st)).cd || 1;
      const ratio = M.clamp(w.t / total, 0, 1);
      cd.style.transform = 'scaleY(' + ratio + ')';
    });

    // objets
    const isig = Object.keys(p.items).map(k => k + ':' + p.items[k]).join('|');
    if (isig !== itemSig) {
      itemSig = isig;
      NX.clear(refs.items);
      Object.keys(p.items).forEach(k => {
        const it = NX.ITEMS[k];
        refs.items.appendChild(h('div', { class: 'item', style: 'padding:4px 6px;min-width:auto', title: it.n + ' x' + p.items[k] },
          h('span', { style: 'font-size:16px' }, it.ic), p.items[k] > 1 ? h('span', { style: 'font-size:10px;color:#ffd479' }, ' x' + p.items[k]) : null));
      });
    }

    // boss
    const b = run.boss;
    if (b && !b.dead) {
      if (!refs._bname || refs._bname !== b.name) {
        NX.clear(refs.boss);
        refs.boss.appendChild(h('div', { style: 'text-align:center;font-family:Consolas,monospace;letter-spacing:2px;color:#ff4d94;margin-bottom:4px' }, '⚠ ' + b.name));
        refs.boss.appendChild(h('div', { class: 'bar boss', style: 'height:20px' }, h('i'), h('span', { class: 'bt' })));
        refs._bname = b.name; refs._bi = refs.boss.querySelector('.bar.boss i'); refs._bt = refs.boss.querySelector('.bt');
      }
      refs._bi.style.width = (M.clamp(b.hp / b.maxHp, 0, 1) * 100) + '%';
      refs._bt.textContent = M.short(Math.max(0, b.hp)) + ' / ' + M.short(b.maxHp);
    } else if (refs._bname) { NX.clear(refs.boss); refs._bname = null; }

    const r1 = '₡ ' + M.short(run.goldRun) + ' butin';
    if (r1 !== refs._r1) { refs._r1 = r1; refs.hr1.textContent = r1; }
    const r2 = '₡ ' + M.short(NX.profile.d.credits) + ' compte';
    if (r2 !== refs._r2) { refs._r2 = r2; refs.hr2.textContent = r2; }
    const r3 = 'MODE ' + (run.nightmare ? 'CAUCHEMAR' : 'NORMAL');
    if (r3 !== refs._r3) { refs._r3 = r3; refs.hr3.textContent = r3; }
  }

  function clear() { if (el) el.classList.add('hidden'); }
  NX.hud = { mount, update, clear };
})();
