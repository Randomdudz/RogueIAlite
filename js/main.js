/* ============================================================
   NEXUS : Réveil — DÉMARRAGE
   Amorce du profil, audio procédural, cycle de vie des runs,
   routeur d'écrans, cinématiques de progression, boucle de jeu.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, M = NX.M;

  /* ---------------- Audio procédural (WebAudio) ---------------- */
  const audio = {
    ctx: null, ready: false, music: null,
    init() {
      if (this.ready) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.ready = true; } catch (e) { this.ready = false; }
    },
    blip(freq, dur, type, vol, slide) {
      if (!this.ready) return;
      const s = NX.profile.d.settings, v = (s.sfx || 0) * (vol || 0.3); if (v <= 0) return;
      const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    play(n) {
      if (!NX.profile.d.settings.sfx) return;
      switch (n) {
        case 'shot': this.blip(680, 0.06, 'square', 0.12, 420); break;
        case 'eshot': this.blip(300, 0.09, 'sawtooth', 0.1, 180); break;
        case 'melee': this.blip(180, 0.12, 'triangle', 0.18, 80); break;
        case 'nova': this.blip(120, 0.3, 'sine', 0.25, 60); break;
        case 'chain': this.blip(900, 0.1, 'square', 0.12, 1400); break;
        case 'field': this.blip(400, 0.2, 'sine', 0.15, 700); break;
        case 'boom': this.blip(90, 0.28, 'sawtooth', 0.26, 40); break;
        case 'laser': this.blip(1200, 0.18, 'sawtooth', 0.14, 300); break;
        case 'hurt': this.blip(160, 0.16, 'square', 0.24, 70); break;
        case 'dash': this.blip(500, 0.12, 'sine', 0.14, 900); break;
        case 'levelup': [660, 880, 1180].forEach((f, i) => setTimeout(() => this.blip(f, 0.14, 'square', 0.16), i * 80)); break;
        case 'evolve': [520, 660, 880, 1320].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'triangle', 0.2), i * 90)); break;
        case 'boss': [110, 90, 70].forEach((f, i) => setTimeout(() => this.blip(f, 0.5, 'sawtooth', 0.3), i * 180)); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.24, 'triangle', 0.22), i * 130)); break;
        case 'revive': [300, 500, 800].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sine', 0.25), i * 110)); break;
        case 'chest': this.blip(900, 0.1, 'square', 0.16, 1500); break;
      }
    }
  };
  NX.audio = audio;

  /* ---------------- état de la partie ---------------- */
  const main = {
    run: null, over: false, paused: false, booted: false,
    canvas: null, ctx: null,

    init() {
      this.canvas = document.getElementById('game');
      NX.render.init(this.canvas);
      NX.input.init(this.canvas);
      NX.profile.load();
      if (!NX.profile.d.user) NX.profile.d.user = { id: 'guest', name: 'Invité', guest: true };

      // premier lancement : un invité, réglages par défaut
      if (!NX.profile.d.settings.particles) NX.profile.d.settings.particles = 1;

      this.bindEvents();
      document.addEventListener('pointerdown', () => audio.init(), { once: true });
      document.addEventListener('keydown', () => audio.init(), { once: true });

      NX.loop.start(dt => this.update(dt), dt => this.render(dt));

      // écran de démarrage puis histoire
      setTimeout(() => {
        document.getElementById('boot').classList.add('done');
        this.booted = true;
        if (!NX.profile.d.story.boot) NX.screens.cinematic('boot', () => NX.screens.menu());
        else NX.screens.menu();
      }, 700);
    },

    bindEvents() {
      NX.bus.on('run:levelup', run => { });      // géré dans update()
      NX.bus.on('run:boss', b => { });
      NX.bus.on('run:won', run => this.onWin(run));
      NX.bus.on('run:dead', run => this.onDead(run));
      NX.bus.on('account:levelup', d => NX.toast('Niveau de compte ' + d.level + ' ! +1 point de talent', 'gold'));
      NX.bus.on('unlock', feat => NX.toast('Débloqué : ' + ({
        talents: 'Arbre de talents (Claude)', shop: 'Marchand (Gemini)', forge: 'Forgeron (Copilot)',
        variants: 'Variantes de sorts (Mistral)', loadout: 'Équipement avant run (Llama)', nightmare: 'Mode Cauchemar + Classement (Deepseek)', true_end: 'Fin secrète'
      }[feat] || feat), 'gold'));
      NX.bus.on('talent:points', n => { });
      window.addEventListener('keydown', e => {
        if (!this.run || this.over) return;
        const b = NX.input.bind.pause || [];
        if (b.indexOf(e.code) >= 0 && this.run.state === 'play') { e.preventDefault(); this.togglePause(); }
      });
      window.addEventListener('blur', () => { if (this.run && !this.over && this.run.state === 'play') this.togglePause(); });
    },

    /* ---------------- démarrage d'une run ---------------- */
    startRun(levelIndex, cls, opts) {
      audio.init();
      this.over = false; this.paused = false;
      NX.screens.hide();
      const level = NX.LEVELS[levelIndex - 1];
      const begin = () => {
        this.run = new NX.Run(levelIndex, cls, Object.assign({ particles: NX.profile.d.settings.particles, speed: 1 }, opts || {}));
        NX.render.cam.x = this.run.player.x; NX.render.cam.y = this.run.player.y;
        NX.render.cam.tx = NX.render.cam.x; NX.render.cam.ty = NX.render.cam.y;
        NX.hud.mount(this.run);
        NX.toast('Niveau ' + levelIndex + ' — ' + (opts && opts.nightmare ? 'CAUCHEMAR' : 'survis ' + M.clock(level.dur)), 'gold');
      };
      // cinématique d'intro (une seule fois)
      const introKey = level.intro;
      if (!NX.profile.d.story[introKey] && NX.STORY[introKey]) {
        NX.screens.cinematic(introKey, scene => { this._afterScene(scene); begin(); });
      } else begin();
    },
    _afterScene(scene) {
      if (!scene) return;
      const key = Object.keys(NX.STORY).find(k => NX.STORY[k] === scene);
      if (key) NX.profile.seeStory(key);
      if (scene.effect && scene.effect.unlock) NX.profile.unlock(scene.effect.unlock);
    },

    togglePause() {
      if (this.paused) { NX.screens.hide(); this.paused = false; }
      else { this.paused = true; NX.screens.pause(this.run, () => { NX.screens.hide(); this.paused = false; }, () => this.quitRun()); }
    },
    quitRun() {
      const run = this.run;
      if (run) { run.state = 'dead'; NX.screens.runOver(run); }
      this.run = null; this.over = true;
    },

    onWin(run) {
      if (this.over) return; this.over = true;
      const level = run.level;
      const outroKey = level.outro;
      const finish = () => { NX.hud.clear(); NX.screens.runOver(run); this.run = run; };
      if (!NX.profile.d.story[outroKey] && NX.STORY[outroKey]) {
        NX.screens.cinematic(outroKey, scene => {
          NX.profile.seeStory(outroKey);
          if (scene && scene.effect && scene.effect.unlock) NX.profile.unlock(scene.effect.unlock);
          finish();
        });
      } else finish();
    },
    onDead(run) {
      if (this.over) return; this.over = true;
      NX.hud.clear();
      NX.screens.runOver(run);
    },

    /* ---------------- boucle ---------------- */
    update(dt) {
      if (!this.booted) return;
      if (!this.run || this.over || this.paused) return;
      const run = this.run;
      if (run.state === 'levelup') {
        if (!run._lvShown) { run._lvShown = true; NX.screens.levelup(run, run.choices, c => { NX.screens.closeLevelup(); run.applyChoice(c); run._lvShown = false; }); }
        return;
      }
      run.update(dt * (run.speed || 1));
      // dégâts de zone visuels + effets d'écran gérés dans run
    },
    render(dt) {
      if (this.run) NX.render.frame(this.run, dt);
      else { // fond d'attente
        const ctx = NX.render.ctx; if (!ctx) return;
        const g = ctx.createLinearGradient(0, 0, 0, NX.render.H);
        g.addColorStop(0, '#070c14'); g.addColorStop(1, '#04060b');
        ctx.fillStyle = g; ctx.fillRect(0, 0, NX.render.W, NX.render.H);
      }
      if (this.run) NX.hud.update(this.run);
      if (NX.profile.d.settings.showFps) {
        const ctx = NX.render.ctx;
        ctx.save(); ctx.fillStyle = '#4dff9f'; ctx.font = '12px Consolas, monospace'; ctx.fillText(Math.round(NX.loop.fps) + ' fps · ' + (this.run ? this.run.enemies.length + ' ennemis · ' + this.run.projs.length + ' proj' : ''), 10, 16); ctx.restore();
      }
    }
  };
  NX.main = main;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => main.init());
  else main.init();
})();
