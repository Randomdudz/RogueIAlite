/* ============================================================
   NEXUS : Réveil — RÉSEAU
   Comptes + sauvegarde + classement. Trois backends interchangeables :
     - local    : comptes et sauvegarde sur cet appareil (défaut)
     - server   : ton serveur Node (server/server.js) → multi-appareils
     - firebase : Firebase Auth + Firestore (config dans cloud-config.js)
   Le mot de passe est haché en SHA-256 salé + itéré, en pur JS
   (fonctionne même en file:// où crypto.subtle est indisponible).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX, store = NX.store;
  const CFG = Object.assign({ backend: 'local', url: '', apiKey: '', projectId: '', game: 'nexus-reveil' }, window.NX_CLOUD || {});

  /* ---------------- SHA-256 pur JS (fallback universel) ---------------- */
  const SHA = (function () {
    const K = [], H0 = [];
    (function () {
      let n = 2, i = 0;
      while (i < 64) {
        let p = true;
        for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
        if (p) { if (i < 8) H0[i] = (Math.pow(n, 1 / 2) % 1 * 4294967296) | 0; K[i] = (Math.pow(n, 1 / 3) % 1 * 4294967296) | 0; i++; }
        n++;
      }
    })();
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    return function (msg) {
      const bytes = [];
      for (let i = 0; i < msg.length; i++) {
        const c = msg.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) bytes.push(192 | c >> 6, 128 | c & 63);
        else bytes.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
      }
      const l = bytes.length * 8;
      bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
      for (let i = 7; i >= 0; i--) bytes.push((l / Math.pow(2, i * 8)) & 255);
      const H = H0.slice(), w = new Array(64);
      for (let off = 0; off < bytes.length; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
        for (let i = 16; i < 64; i++) {
          const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, hh] = H;
        for (let i = 0; i < 64; i++) {
          const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
          const ch = (e & f) ^ (~e & g);
          const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
          const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
          const mj = (a & b) ^ (a & c) ^ (b & c);
          const t2 = (S0 + mj) | 0;
          hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
      }
      return H.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
    };
  })();
  function hashPass(pass, salt, rounds) {
    let h = salt + '|' + pass;
    for (let i = 0; i < (rounds || 400); i++) h = SHA(h + i);
    return h;
  }
  NX.sha256 = SHA;

  /* ---------------- état ---------------- */
  const net = {
    mode: CFG.backend || 'local',
    user: null,                 // { id, name, email, guest }
    online: false,
    _saveTimer: null, _saving: false,
    listeners: [],

    on(fn) { this.listeners.push(fn); },
    _emit() { this.listeners.forEach(f => { try { f(this); } catch (e) { } }); },

    init() {
      const session = store.get('session', null);
      if (session) { this.user = session; this.online = this.mode !== 'local'; }
      NX.bus.on('profile:saved', () => this._emit());
      return this;
    },

    /* ---------------- inscription / connexion ---------------- */
    async signup(name, pass, email) {
      name = (name || '').trim();
      if (name.length < 3) throw new Error('Le nom doit faire au moins 3 caractères.');
      if (!pass || pass.length < 4) throw new Error('Mot de passe trop court (4 caractères minimum).');
      if (this.mode === 'server' || this.mode === 'firebase') return this._remoteAuth('signup', { name, pass, email });
      const accounts = store.get('accounts', {});
      const key = name.toLowerCase();
      if (accounts[key]) throw new Error('Ce nom est déjà pris sur cet appareil.');
      const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      accounts[key] = { name, salt, hash: hashPass(pass, salt), email: email || '', created: Date.now(), profile: null };
      store.set('accounts', accounts);
      return this._setSession({ id: 'local:' + key, name, email: email || '', guest: false, localKey: key });
    },

    async login(name, pass) {
      name = (name || '').trim();
      if (this.mode === 'server' || this.mode === 'firebase') return this._remoteAuth('login', { name, pass });
      const accounts = store.get('accounts', {});
      const key = name.toLowerCase();
      const acc = accounts[key];
      if (!acc) throw new Error('Aucun compte à ce nom sur cet appareil.');
      if (acc.hash !== hashPass(pass, acc.salt)) throw new Error('Mot de passe incorrect.');
      if (acc.profile) NX.profile.mergeRemote(acc.profile);
      return this._setSession({ id: 'local:' + key, name: acc.name, email: acc.email, guest: false, localKey: key });
    },

    guest(name) {
      const g = 'Invité-' + Math.floor(Math.random() * 9000 + 1000);
      return this._setSession({ id: 'guest', name: name || g, email: '', guest: true });
    },

    logout() {
      if (this.mode === 'firebase' && window.firebase && firebase.auth) { try { firebase.auth().signOut(); } catch (e) { } }
      this.user = null; this.online = false; store.del('session'); this._emit();
    },

    _setSession(u) { this.user = u; store.set('session', u); this.online = this.mode !== 'local'; this._emit(); return u; },

    /* ---------------- sauvegarde ---------------- */
    queueSave() {
      if (!this.user || this.user.guest) return;
      if (this.mode === 'local') {
        // passthrough direct : on écrit dans le compte local
        const accounts = store.get('accounts', {});
        const key = this.user.localKey; if (key && accounts[key]) { accounts[key].profile = NX.profile.serialize(); store.set('accounts', accounts); }
        return;
      }
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.saveNow(), 2500);
    },
    async saveNow() {
      if (!this.user || this.user.guest) return false;
      const data = NX.profile.serialize(); data.user = data.user || {};
      data.user.name = this.user.name; data.user.email = this.user.email; data.user.id = this.user.id;
      try {
        if (this.mode === 'server') {
          await this._req('/api/save', { method: 'POST', body: { profile: data } });
        } else if (this.mode === 'firebase') { await this._fbSave(data); }
        else { this.queueSave(); return true; }
        this._emit(); return true;
      } catch (e) { console.warn('[net] sauvegarde échouée', e); return false; }
    },
    async loadRemote() {
      if (!this.user || this.user.guest) return false;
      try {
        let remote = null;
        if (this.mode === 'server') remote = (await this._req('/api/load', { method: 'GET' })).profile;
        else if (this.mode === 'firebase') remote = await this._fbLoad();
        else return false;
        if (remote) { NX.profile.mergeRemote(remote); return true; }
      } catch (e) { console.warn('[net] chargement échoué', e); }
      return false;
    },

    /* ---------------- classement ---------------- */
    async submitScore(entry) {
      NX.profile.pushScore(entry);
      if (this.mode === 'server') { try { await this._req('/api/score', { method: 'POST', body: entry }); } catch (e) { } }
      else if (this.mode === 'firebase') { try { await this._fbScore(entry); } catch (e) { } }
    },
    async board(mode2) {
      if (this.mode === 'server') { try { return (await this._req('/api/board?mode=' + (mode2 || ''), { method: 'GET' })).board; } catch (e) { } }
      if (this.mode === 'firebase') { try { return await this._fbBoard(); } catch (e) { } }
      return NX.profile.d.lb.slice();
    },

    /* ---------------- backend « server » ---------------- */
    async _req(path, opts) {
      opts = opts || {};
      const url = (CFG.url || '').replace(/\/$/, '') + path;
      const token = store.get('token', '');
      const r = await fetch(url, {
        method: opts.method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json', 'X-NX-Token': token, 'X-NX-Game': CFG.game }, opts.headers || {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || ('Erreur serveur ' + r.status));
      if (j.token) store.set('token', j.token);
      return j;
    },
    async _remoteAuth(kind, creds) {
      const j = await this._req('/api/' + kind, { method: 'POST', body: creds });
      return this._setSession(j.user);
    },

    /* ---------------- backend « firebase » ---------------- */
    _fbReady() { return !!(CFG.apiKey && CFG.projectId); },
    async _fbInit() {
      if (window.firebase && firebase.apps && firebase.apps.length) return;
      if (!this._fbReady()) throw new Error('Firebase n’est pas configuré (cloud-config.js).');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
      firebase.initializeApp({ apiKey: CFG.apiKey, projectId: CFG.projectId, authDomain: CFG.projectId + '.firebaseapp.com' });
    },
    async _fbSave(data) { await this._fbInit(); await firebase.firestore().collection('nexus').doc('saves').collection(CFG.game).doc(this.user.id).set(data); },
    async _fbLoad() {
      await this._fbInit();
      const s = await firebase.firestore().collection('nexus').doc('saves').collection(CFG.game).doc(this.user.id).get();
      return s.exists ? s.data() : null;
    },
    async _fbScore(entry) {
      await this._fbInit();
      await firebase.firestore().collection('nexus').doc('board').collection(CFG.game).add(Object.assign({ uid: this.user.id, name: this.user.name, date: Date.now() }, entry));
    },
    async _fbBoard() {
      await this._fbInit();
      const q = await firebase.firestore().collection('nexus').doc('board').collection(CFG.game).orderBy('score', 'desc').limit(50).get();
      const out = []; q.forEach(d => out.push(d.data())); return out;
    }
  };

  function loadScript(src) {
    return new Promise((res, rej) => {
      if ([...document.scripts].some(s => s.src === src)) return res();
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Échec du chargement ' + src));
      document.head.appendChild(s);
    });
  }

  NX.net = net.init();
})();
