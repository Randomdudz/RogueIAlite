/* ============================================================
   NEXUS : Réveil — SERVEUR (optionnel)
   Comptes + sauvegarde multi-appareils + classement global.
   Zéro dépendance : node:http, node:fs, node:crypto.
   Lancement :  node server/server.js        (port 8787 par défaut)
   Puis dans cloud-config.js : backend:'server', url:'http://localhost:8787'
   Déploie ce fichier où tu veux (VPS, Render, Fly.io…). Les données
   sont dans server/data.json.
   ============================================================ */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 8787;
const FILE = path.join(__dirname, 'data.json');
const SCHEMA = 3;

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { return { users: {}, scores: [] }; }
}
let db = load();
let saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { fs.writeFileSync(FILE, JSON.stringify(db)); } catch (e) { console.error('écriture impossible', e); } }, 120);
}

function hash(pass, salt) { return crypto.pbkdf2Sync(pass, salt, 120000, 32, 'sha256').toString('hex'); }
function token() { return crypto.randomBytes(24).toString('hex'); }
function uid() { return crypto.randomBytes(8).toString('hex'); }

function body(req) {
  return new Promise(res => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 4e6) req.destroy(); });
    req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { res({}); } });
  });
}
function out(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-NX-Token, X-NX-Game',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(obj));
}
function userFrom(req) {
  const t = req.headers['x-nx-token']; if (!t) return null;
  for (const k in db.users) if (db.users[k].tokens && db.users[k].tokens.includes(t)) return { key: k, u: db.users[k] };
  return null;
}
// nettoie les vieux scores (garde le top 200 par jeu)
function trimScores() {
  const by = {};
  db.scores.forEach(s => { (by[s.game] = by[s.game] || []).push(s); });
  db.scores = [];
  for (const g in by) { by[g].sort((a, b) => b.score - a.score); db.scores.push(...by[g].slice(0, 200)); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (req.method === 'OPTIONS') return out(res, 204, {});

  try {
    if (p === '/api/ping') return out(res, 200, { ok: true, game: 'nexus-reveil', users: Object.keys(db.users).length });

    if (p === '/api/signup' && req.method === 'POST') {
      const b = await body(req);
      const name = String(b.name || '').trim(); const pass = String(b.pass || '');
      if (name.length < 3) return out(res, 400, { error: 'Nom trop court (3 caractères minimum).' });
      if (pass.length < 4) return out(res, 400, { error: 'Mot de passe trop court (4 caractères minimum).' });
      const key = name.toLowerCase();
      if (db.users[key]) return out(res, 409, { error: 'Ce nom est déjà pris.' });
      const salt = crypto.randomBytes(16).toString('hex');
      const t = token();
      db.users[key] = { id: uid(), name, salt, hash: hash(pass, salt), email: b.email || '', tokens: [t], profile: null, created: Date.now() };
      save();
      return out(res, 200, { token: t, user: { id: db.users[key].id, name, email: b.email || '', guest: false } });
    }

    if (p === '/api/login' && req.method === 'POST') {
      const b = await body(req);
      const key = String(b.name || '').trim().toLowerCase();
      const u = db.users[key];
      if (!u) return out(res, 404, { error: 'Aucun compte à ce nom.' });
      if (u.hash !== hash(String(b.pass || ''), u.salt)) return out(res, 403, { error: 'Mot de passe incorrect.' });
      const t = token(); u.tokens = (u.tokens || []).concat(t).slice(-6); save();
      return out(res, 200, { token: t, user: { id: u.id, name: u.name, email: u.email, guest: false } });
    }

    if (p === '/api/save' && req.method === 'POST') {
      const au = userFrom(req); if (!au) return out(res, 401, { error: 'Non authentifié.' });
      const b = await body(req);
      au.u.profile = b.profile || null; au.u.updated = Date.now(); save();
      return out(res, 200, { ok: true });
    }

    if (p === '/api/load' && req.method === 'GET') {
      const au = userFrom(req); if (!au) return out(res, 401, { error: 'Non authentifié.' });
      return out(res, 200, { profile: au.u.profile || null });
    }

    if (p === '/api/score' && req.method === 'POST') {
      const b = await body(req);
      const game = String(b.game || req.headers['x-nx-game'] || 'nexus-reveil');
      const entry = {
        game, name: String(b.name || 'Anonyme').slice(0, 24), cls: String(b.cls || ''), nightmare: !!b.nightmare,
        reached: +b.reached || 0, score: +b.score || 0, time: +b.time || 0, date: Date.now()
      };
      db.scores.push(entry); trimScores(); save();
      return out(res, 200, { ok: true });
    }

    if (p === '/api/board' && req.method === 'GET') {
      const game = url.searchParams.get('game') || req.headers['x-nx-game'] || 'nexus-reveil';
      const board = db.scores.filter(s => s.game === game).sort((a, b) => b.score - a.score).slice(0, 50);
      return out(res, 200, { board });
    }

    out(res, 404, { error: 'Route inconnue.' });
  } catch (e) {
    console.error(e); out(res, 500, { error: 'Erreur serveur.' });
  }
});

server.listen(PORT, () => console.log('NEXUS : Réveil — serveur sur http://localhost:' + PORT + '\n  Données : ' + FILE));
