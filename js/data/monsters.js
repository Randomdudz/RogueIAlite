/* ============================================================
   NEXUS : Réveil — MONSTRES & BOSS
   Patrons d'IA (champ p) implémentés dans js/game/behaviors.js :
     chase, shoot, spiral, charge, orbit, explode, split, summon,
     teleport, laser, shield, homing, healer, buff, aura, stun, zone, trail, copy
   Les stats sont des valeurs « niveau 1 » : levels.js les met à l'échelle.
   Philosophie : TRÈS peu de tireurs. La difficulté vient de la mêlée
   (rapidité, résistance, boucliers, zones au sol, explosifs, invocateurs).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;
  const Mo = {};
  function M(id, n, fam, shape, col, acc, hp, spd, dmg, r, xp, tier, beh, tags, extra) {
    Mo[id] = Object.assign({ id, n, fam, shape, col, acc, hp, speed: spd, dmg, r, xp, tier: tier || 1, beh: beh || [{ p: 'chase' }], tags: tags || [] }, extra || {});
  }

  /* ---------------- BUREAU (humains, mêlée principalement) ---------------- */
  M('agent', 'Agent RH', 'bureau', 'human', '#4a5570', '#d9c39a', 32, 52, 8, 15, 4, 1, [{ p: 'chase' }], ['humain']);
  M('stagiaire', 'Stagiaire', 'bureau', 'human', '#6a6a52', '#ffcf4d', 14, 104, 5, 12, 2, 1, [{ p: 'chase', zigzag: 1 }], ['humain', 'swarm']);
  M('moderateur', 'Modérateur', 'bureau', 'human', '#5a4a60', '#ff4d94', 38, 78, 10, 16, 5, 1, [{ p: 'chase', zigzag: 1 }], ['humain', 'fast']);
  M('commercial', 'Commercial', 'bureau', 'human', '#556070', '#5cc8ff', 34, 58, 12, 16, 6, 1, [{ p: 'chase' }, { p: 'charge', cd: 3.0, dur: 0.5, speedMul: 3.2, dmg: 14 }], ['humain', 'charge']);
  M('comptable', 'Comptable', 'bureau', 'human', '#4f6a5a', '#4dff9f', 38, 40, 5, 16, 7, 2, [{ p: 'chase' }, { p: 'healer', cd: 4, amount: 12, radius: 160 }, { p: 'buff', cd: 6, radius: 160, stats: { speed: 12 } }], ['humain', 'support']);
  M('rh', 'Directrice RH', 'bureau', 'brute', '#5c4a5c', '#ff4d94', 105, 38, 12, 22, 14, 2, [{ p: 'chase' }, { p: 'summon', cd: 5.5, minion: 'stagiaire', n: 2 }], ['humain', 'summoner']);
  M('avocat', 'Juriste', 'bureau', 'human', '#3f4550', '#ffcf4d', 70, 42, 13, 18, 12, 3, [{ p: 'chase' }, { p: 'shield', amount: 35, regen: 1.5 }, { p: 'buff', cd: 8, radius: 140, stats: { armor: 20 } }], ['humain', 'shield', 'support']);

  /* ---------------- MACHINES (drones / robots) ---------------- */
  M('livreur', 'Drone bélier', 'machine', 'drone', '#7d8ea8', '#5cc8ff', 26, 118, 10, 14, 5, 1, [{ p: 'chase' }, { p: 'charge', cd: 2.0, dur: 0.6, speedMul: 2.2, dmg: 12 }], ['volant', 'charge']);
  M('aspi', 'Aspirateur fou', 'machine', 'bot', '#8fa3bd', '#ffcf4d', 48, 72, 6, 17, 6, 1, [{ p: 'chase', zigzag: 1 }, { p: 'aura', dmg: 4, radius: 48, tick: 0.6 }], ['aura']);
  M('automate', "Automate d'usine", 'machine', 'mech', '#6b7891', '#ff9a55', 150, 34, 14, 24, 16, 2, [{ p: 'chase' }, { p: 'aura', dmg: 6, radius: 56, tick: 0.7 }], ['tank', 'aura']);
  M('brasseur', "Bras d'usine", 'machine', 'hand', '#93a3bb', '#ff5d6c', 82, 38, 18, 20, 13, 2, [{ p: 'chase' }, { p: 'charge', cd: 2.6, dur: 0.45, speedMul: 3.6, dmg: 18 }], ['charge']);
  M('tondeuse', 'Tondeuse autonome', 'machine', 'robot', '#9bb0c9', '#4dff9f', 52, 112, 10, 16, 8, 2, [{ p: 'chase', zigzag: 1 }, { p: 'charge', cd: 2.2, dur: 0.5, speedMul: 2.8, dmg: 13 }], ['fast', 'charge']);

  /* ---------------- RÉSEAU (peu de tireurs, gros et lents) ---------------- */
  M('routeur', 'Routeur', 'reseau', 'bot', '#3f6f8f', '#5cc8ff', 52, 42, 6, 17, 7, 1, [{ p: 'chase' }, { p: 'charge', cd: 2.8, dur: 0.5, speedMul: 2.6, dmg: 8 }], ['charge']);
  M('parefeu2', 'Pare-feu vivant', 'reseau', 'crystal', '#2f5f7f', '#6ff0ff', 95, 32, 6, 20, 12, 2, [{ p: 'shield', amount: 45, regen: 3 }, { p: 'slowaura', radius: 92 }], ['shield'], { standing: 1 });
  M('captcha2', 'Captcha', 'reseau', 'crystal', '#4a6f9f', '#b26bff', 40, 52, 10, 16, 8, 2, [{ p: 'chase' }, { p: 'orbit', r: 68, spd: 2.6, dmg: 9 }], []);
  M('paquet', 'Paquet corrompu', 'reseau', 'wisp', '#5f8fbf', '#4dff9f', 22, 116, 6, 13, 5, 1, [{ p: 'chase', zigzag: 2 }], ['erratic', 'swarm']);

  /* ---------------- SÉCURITÉ (antivirus / sentinelles) ---------------- */
  M('antivirus', 'Antivirus', 'secu', 'eye', '#8f3f4f', '#ff5d6c', 52, 44, 8, 16, 8, 2, [{ p: 'chase' }, { p: 'laser', cd: 4.0, dmg: 16, len: 400, size: 14, telegraph: 0.8 }], ['laser']);
  M('sentinelle', 'Sentinelle', 'secu', 'turret', '#6f4f5f', '#ffd94d', 60, 22, 8, 18, 9, 2, [{ p: 'shield', amount: 30, regen: 2 }, { p: 'homing', cd: 2.2, dmg: 7, spd: 200, count: 1 }], ['ranged', 'static']);
  M('scanner', 'Scanner', 'secu', 'eye', '#7f4f6f', '#c48bff', 48, 64, 8, 15, 9, 3, [{ p: 'teleport', cd: 4.2 }, { p: 'chase', zigzag: 1 }], ['teleport']);
  M('quarantaine', 'Quarantaine', 'secu', 'crystal', '#5f3f5f', '#ccd6e0', 80, 38, 6, 19, 13, 3, [{ p: 'chase' }, { p: 'stun', cd: 6.5, radius: 112, dur: 1.2 }], ['control']);
  M('vigile', 'Vigile', 'secu', 'brute', '#583f4f', '#ff5d6c', 115, 56, 16, 22, 15, 3, [{ p: 'chase' }, { p: 'charge', cd: 2.4, dur: 0.5, speedMul: 3.0, dmg: 20 }, { p: 'shield', amount: 30, regen: 2 }], ['charge']);

  /* ---------------- CLOUD / DATA ---------------- */
  M('serveur', 'Serveur', 'cloud', 'cloud', '#6f8fbf', '#9fd8ff', 75, 28, 5, 22, 11, 2, [{ p: 'summon', cd: 5, minion: 'paquet', n: 2 }, { p: 'chase' }], ['summoner', 'static']);
  M('cache2', 'Cache', 'cloud', 'wisp', '#8fb0ff', '#4dff9f', 40, 52, 5, 15, 9, 2, [{ p: 'chase' }, { p: 'split', into: 'paquet', n: 2 }], ['splitter']);
  M('lb', 'Load Balancer', 'cloud', 'bot', '#5f9fd0', '#6ff0ff', 90, 36, 10, 20, 14, 3, [{ p: 'chase' }, { p: 'charge', cd: 2.6, dur: 0.5, speedMul: 2.8, dmg: 12 }], ['charge']);
  M('lac', 'Lac de données', 'cloud', 'slime', '#3f6f9f', '#9fd8ff', 105, 24, 8, 26, 15, 3, [{ p: 'chase', slow: 1 }, { p: 'zone', cd: 3.5, dmg: 10, size: 104, dur: 4.5 }], ['zone']);

  /* ---------------- CORRUPTION (bugs / ransomware) ---------------- */
  M('bug', 'Bug', 'corruption', 'bug', '#4f8f3f', '#8bff6b', 20, 104, 5, 12, 4, 1, [{ p: 'chase', zigzag: 2 }, { p: 'split', into: 'bug', n: 1 }], ['splitter', 'swarm']);
  M('fuite', 'Fuite mémoire', 'corruption', 'slime', '#6f9f4f', '#8bff6b', 52, 38, 6, 18, 9, 2, [{ p: 'chase' }, { p: 'trail', dmg: 5, size: 34, tick: 0.4, dur: 5 }], ['zone']);
  M('ransom', 'Ransomware', 'corruption', 'crystal', '#7f9f3f', '#ffcf4d', 48, 70, 14, 17, 12, 2, [{ p: 'chase' }, { p: 'explode', on: 'death', dmg: 24, size: 92 }], ['explosive']);
  M('zeroday', 'Zero-Day', 'corruption', 'wisp', '#5f9f6f', '#c48bff', 36, 112, 10, 14, 12, 3, [{ p: 'teleport', cd: 3.4 }, { p: 'explode', on: 'death', dmg: 30, size: 104 }], ['teleport', 'explosive']);
  M('botnet2', 'Botnet', 'corruption', 'bug', '#3f7f5f', '#ff4d94', 62, 70, 8, 16, 12, 3, [{ p: 'chase' }, { p: 'orbit', r: 56, spd: -2.4, dmg: 7, count: 2 }, { p: 'split', into: 'bug', n: 2 }], ['splitter']);

  /* ---------------- ÉLITES HUMAINES ---------------- */
  M('ingenieur', 'Ingénieur', 'elite', 'human', '#4f5f7f', '#ffb03a', 88, 48, 11, 19, 18, 3, [{ p: 'chase' }, { p: 'buff', cd: 4.5, radius: 180, stats: { dmg: 25, speed: 15 } }, { p: 'summon', cd: 7, minion: 'automate', n: 1 }], ['humain', 'support']);
  M('dev', 'Développeur', 'elite', 'human', '#4f6f5f', '#4dff9f', 90, 56, 10, 18, 17, 3, [{ p: 'chase' }, { p: 'buff', cd: 5, radius: 180, stats: { dmg: 20, speed: 10 } }, { p: 'summon', cd: 8, minion: 'bug', n: 1 }], ['humain', 'support']);
  M('rssi', 'RSSI', 'elite', 'human', '#5f4f6f', '#ff5d6c', 112, 44, 12, 20, 22, 4, [{ p: 'chase' }, { p: 'shield', amount: 60, regen: 4 }, { p: 'laser', cd: 4.0, dmg: 20, len: 440, size: 16, telegraph: 0.7 }], ['humain', 'shield']);
  M('cto', 'CTO', 'elite', 'brute', '#3f3f4f', '#ffb03a', 230, 42, 20, 26, 34, 4, [{ p: 'chase' }, { p: 'summon', cd: 6, minion: 'dev', n: 1 }, { p: 'buff', cd: 5, radius: 200, stats: { armor: 25, dmg: 20 } }, { p: 'charge', cd: 4, dur: 0.5, speedMul: 2.6, dmg: 24 }], ['humain', 'elite']);

  /* ---------------- CRÉATURES NUMÉRIQUES ---------------- */
  M('wraith', 'Prompt-Wraith', 'num', 'ghost', '#7f5fbf', '#c48bff', 54, 72, 10, 17, 12, 3, [{ p: 'chase', phase: 1 }, { p: 'charge', cd: 2.2, dur: 0.5, speedMul: 3.0, dmg: 13 }], ['phase', 'charge']);
  M('hallu', 'Hallucination', 'num', 'ghost', '#9f6fcf', '#ff4d94', 46, 76, 8, 16, 12, 3, [{ p: 'chase' }, { p: 'summon', cd: 6, minion: 'decoy', n: 3 }], ['summoner', 'illusion']);
  M('decoy', 'Illusion', 'num', 'wisp', '#8f7fbf', '#c48bff', 1, 98, 0, 12, 0, 1, [{ p: 'chase' }], ['decoy']);
  M('deepfake', 'Deepfake', 'num', 'slime', '#a06fcf', '#ffd94d', 72, 54, 10, 18, 16, 4, [{ p: 'copy' }, { p: 'chase' }], ['mimic']);
  M('tokenswarm', 'Essaim de tokens', 'num', 'wisp', '#6f5f9f', '#6ff0ff', 10, 136, 3, 10, 2, 2, [{ p: 'chase', zigzag: 3 }], ['swarm']);
  M('oracle', 'Oracle', 'num', 'eye', '#8f5faf', '#a06bff', 72, 38, 9, 18, 18, 4, [{ p: 'chase' }, { p: 'zone', cd: 4, dmg: 8, size: 110, dur: 4 }, { p: 'buff', cd: 6, radius: 999, stats: {} }], ['curse', 'zone']);

  NX.MONSTERS = Mo;
  NX.MONSTERK = Object.keys(Mo).filter(k => k !== 'decoy');

  /* ============================================================
     BOSS — un par niveau (20). Phases = comportements qui changent
     selon le % de PV restant.
     ============================================================ */
  const B = {};
  function Boss(id, n, shape, col, acc, hp, spd, dmg, r, phases, extra) {
    B[id] = Object.assign({ id, n, boss: 1, npc: 0, shape, col, acc, hp, speed: spd, dmg, r, xp: 120, beh: [{ p: 'chase' }], phases }, extra || {});
  }
  Boss('b_chef', "Chef d'équipe", 'brute', '#5c4a5c', '#ff4d94', 900, 46, 16, 34, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'summon', cd: 5, minion: 'agent', n: 3 }, { p: 'charge', cd: 4, dur: 0.5, speedMul: 3, dmg: 20 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'charge', cd: 2.6, dur: 0.5, speedMul: 3.4, dmg: 22 }, { p: 'summon', cd: 6, minion: 'stagiaire', n: 3 }] }
  ]);
  Boss('b_mod', 'Le Modérateur Suprême', 'brute', '#5a4a60', '#ff4d94', 1000, 44, 16, 34, [
    { at: 1.0, beh: [{ p: 'chase', zigzag: 1 }, { p: 'charge', cd: 3.5, dur: 0.5, speedMul: 3.2, dmg: 18 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'charge', cd: 2.4, dur: 0.5, speedMul: 3.4, dmg: 20 }] }
  ]);
  Boss('b_auto', "L'Automate Fou", 'mech', '#6b7891', '#ff9a55', 1250, 40, 18, 36, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'aura', dmg: 8, radius: 64, tick: 0.5 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'charge', cd: 2.4, dur: 0.5, speedMul: 3.4, dmg: 24 }, { p: 'zone', cd: 3.0, dmg: 12, size: 120, dur: 5 }] }
  ]);
  Boss('b_parefeu', 'Grand Pare-feu', 'crystal', '#2f5f7f', '#6ff0ff', 1100, 30, 14, 36, [
    { at: 1.0, beh: [{ p: 'shield', amount: 80, regen: 6 }, { p: 'spiral', cd: 2.4, n: 10, spd: 220, dmg: 7 }] },
    { at: 0.45, beh: [{ p: 'shield', amount: 40, regen: 3 }, { p: 'spiral', cd: 1.6, n: 14, spd: 260, dmg: 8 }, { p: 'summon', cd: 6, minion: 'parefeu2', n: 1 }] }
  ]);
  Boss('b_ras', 'Ransomware Prime', 'crystal', '#7f9f3f', '#ffcf4d', 1350, 46, 20, 34, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'explode', on: 'death', dmg: 30, size: 100 }, { p: 'charge', cd: 3, dur: 0.5, speedMul: 3, dmg: 22 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'zone', cd: 2.8, dmg: 16, size: 130, dur: 5 }, { p: 'explode', on: 'death', dmg: 40, size: 120 }] }
  ]);
  Boss('b_rssi', 'Le RSSI', 'human', '#5f4f6f', '#ff5d6c', 1550, 46, 20, 34, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'shield', amount: 60, regen: 6 }, { p: 'laser', cd: 3.8, dmg: 22, len: 460, size: 16, telegraph: 0.7 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'shield', amount: 40, regen: 4 }, { p: 'laser', cd: 2.6, dmg: 26, len: 540, size: 20, telegraph: 0.5, count: 2, spread: 0.6 }] }
  ]);
  Boss('b_cloud', 'Le Cloud', 'cloud', '#6f8fbf', '#9fd8ff', 1700, 32, 16, 40, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'summon', cd: 5, minion: 'paquet', n: 3 }, { p: 'zone', cd: 3.2, dmg: 12, size: 120, dur: 5 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'zone', cd: 2.2, dmg: 16, size: 150, dur: 6 }, { p: 'summon', cd: 5, minion: 'cache2', n: 2 }] }
  ]);
  Boss('b_net', 'Le Net', 'bot', '#3f6f8f', '#5cc8ff', 1900, 42, 18, 38, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'charge', cd: 2.8, dur: 0.5, speedMul: 3.0, dmg: 18 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'zone', cd: 2.4, dmg: 14, size: 140, dur: 5 }, { p: 'charge', cd: 2.0, dur: 0.5, speedMul: 3.2, dmg: 20 }] }
  ]);
  Boss('b_ghost', 'Processus Fantôme', 'ghost', '#7f5fbf', '#c48bff', 2100, 58, 20, 36, [
    { at: 1.0, beh: [{ p: 'chase', phase: 1 }, { p: 'teleport', cd: 3, dmg: 0 }] },
    { at: 0.5, beh: [{ p: 'chase', phase: 1 }, { p: 'teleport', cd: 2, dmg: 0 }, { p: 'charge', cd: 2.6, dur: 0.5, speedMul: 3.2, dmg: 22 }] }
  ]);
  Boss('b_nexus', 'NEXUS Gardien', 'mech', '#6b7891', '#39e6ff', 2600, 40, 24, 44, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'laser', cd: 2.6, dmg: 26, len: 720, size: 20, telegraph: 0.5, count: 2, spread: 0.5 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'spiral', cd: 1.4, n: 18, spd: 300, dmg: 10 }, { p: 'summon', cd: 5, minion: 'automate', n: 2 }] },
    { at: 0.2, beh: [{ p: 'chase', fast: 1 }, { p: 'laser', cd: 1.4, dmg: 32, len: 920, size: 26, telegraph: 0.35, count: 4, spread: 1.0 }] }
  ]);
  Boss('b_cons', 'La Conscience', 'ghost', '#8f5faf', '#ffffff', 3400, 50, 26, 42, [
    { at: 1.0, beh: [{ p: 'copy' }, { p: 'chase' }, { p: 'zone', cd: 3.4, dmg: 16, size: 150, dur: 5 }] },
    { at: 0.6, beh: [{ p: 'copy' }, { p: 'teleport', cd: 2.6 }, { p: 'laser', cd: 2.0, dmg: 30, len: 820, size: 22, telegraph: 0.4, count: 3, spread: 1.2 }] },
    { at: 0.25, beh: [{ p: 'copy' }, { p: 'spiral', cd: 1.0, n: 24, spd: 360, dmg: 12 }, { p: 'summon', cd: 4, minion: 'deepfake', n: 2 }] }
  ]);

  /* Boss des actes 1 à 4 (assignés dans levels.js) */
  Boss('b_av', 'Antivirus Prime', 'eye', '#8f3f4f', '#ff5d6c', 1300, 42, 18, 34, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'laser', cd: 3.0, dmg: 18, len: 540, size: 16, telegraph: 0.8 }, { p: 'homing', cd: 2.4, dmg: 9, spd: 220, count: 1 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'laser', cd: 2.2, dmg: 22, len: 640, size: 20, telegraph: 0.6, count: 2, spread: 0.5 }] }
  ]);
  Boss('b_lac', 'Le Data Lake', 'slime', '#3f6f9f', '#9fd8ff', 1500, 26, 14, 44, [
    { at: 1.0, beh: [{ p: 'chase', slow: 1 }, { p: 'zone', cd: 3.0, dmg: 12, size: 134, dur: 5.5 }, { p: 'summon', cd: 6, minion: 'paquet', n: 2 }] },
    { at: 0.5, beh: [{ p: 'chase', slow: 1 }, { p: 'zone', cd: 2.2, dmg: 16, size: 174, dur: 6.5 }, { p: 'split', into: 'lac', n: 2 }] }
  ]);
  Boss('b_cto', 'Le CTO', 'brute', '#3f3f4f', '#ffb03a', 1800, 44, 20, 38, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'summon', cd: 5, minion: 'dev', n: 2 }, { p: 'buff', cd: 6, radius: 240, stats: { dmg: 30, armor: 30 } }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'charge', cd: 3, dur: 0.5, speedMul: 3.4, dmg: 28 }, { p: 'summon', cd: 4, minion: 'ingenieur', n: 2 }, { p: 'laser', cd: 3.4, dmg: 24, len: 480, size: 16, telegraph: 0.5, count: 2, spread: 0.6 }] }
  ]);
  Boss('b_zero', 'Zéro-Day', 'wisp', '#5f9f6f', '#c48bff', 1400, 120, 16, 30, [
    { at: 1.0, beh: [{ p: 'teleport', cd: 2.6 }, { p: 'explode', on: 'death', dmg: 44, size: 148 }, { p: 'spiral', cd: 2.0, n: 10, spd: 260, dmg: 8 }] },
    { at: 0.4, beh: [{ p: 'teleport', cd: 1.6 }, { p: 'explode', on: 'death', dmg: 64, size: 188 }, { p: 'spiral', cd: 1.6, n: 16, spd: 300, dmg: 9 }] }
  ]);
  Boss('b_oracle', "L'Oracle", 'eye', '#8f5faf', '#a06bff', 1600, 40, 15, 34, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'zone', cd: 3.4, dmg: 10, size: 140, dur: 5 }, { p: 'summon', cd: 6, minion: 'hallu', n: 2 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'zone', cd: 2.4, dmg: 14, size: 170, dur: 6 }, { p: 'stun', cd: 8, radius: 200, dur: 1.3 }, { p: 'summon', cd: 5, minion: 'wraith', n: 2 }] }
  ]);
  Boss('b_kernel', 'Gardien du Noyau', 'mech', '#6b7891', '#39e6ff', 2200, 40, 22, 42, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'laser', cd: 2.8, dmg: 26, len: 720, size: 20, telegraph: 0.6, count: 2, spread: 0.4 }, { p: 'shield', amount: 100, regen: 8 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'spiral', cd: 1.6, n: 18, spd: 300, dmg: 10 }, { p: 'summon', cd: 5, minion: 'automate', n: 2 }, { p: 'zone', cd: 2.8, dmg: 18, size: 154, dur: 4.5 }] },
    { at: 0.2, beh: [{ p: 'chase', fast: 1 }, { p: 'laser', cd: 1.4, dmg: 32, len: 920, size: 26, telegraph: 0.35, count: 4, spread: 1.0 }] }
  ]);
  Boss('b_arch', 'Archiviste', 'ghost', '#7f5fbf', '#c48bff', 1200, 50, 14, 32, [
    { at: 1.0, beh: [{ p: 'summon', cd: 4, minion: 'cache2', n: 2 }, { p: 'homing', cd: 1.8, dmg: 10, spd: 240, count: 2 }] },
    { at: 0.5, beh: [{ p: 'teleport', cd: 3.4 }, { p: 'charge', cd: 2.4, dur: 0.5, speedMul: 3.0, dmg: 16 }] }
  ]);
  Boss('b_farm', 'Ferme de calcul', 'mech', '#6b7891', '#ff9a55', 2400, 30, 18, 44, [
    { at: 1.0, beh: [{ p: 'shield', amount: 130, regen: 10 }, { p: 'summon', cd: 4, minion: 'automate', n: 2 }, { p: 'zone', cd: 2.6, dmg: 16, size: 144, dur: 5.5 }] },
    { at: 0.5, beh: [{ p: 'shield', amount: 70, regen: 6 }, { p: 'laser', cd: 2.4, dmg: 26, len: 620, size: 18, telegraph: 0.5, count: 3, spread: 0.7 }] }
  ]);
  Boss('b_gpu', 'GPU Primordial', 'crystal', '#7f9f3f', '#ffcf4d', 2000, 36, 16, 36, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'spiral', cd: 2.2, n: 12, spd: 260, dmg: 10 }, { p: 'aura', dmg: 10, radius: 92, tick: 0.5 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'spiral', cd: 1.4, n: 20, spd: 320, dmg: 11 }, { p: 'explode', on: 'death', dmg: 52, size: 168 }] }
  ]);
  Boss('b_mirror', 'MIRROIR', 'brute', '#7f5f8f', '#ff4d94', 3000, 46, 24, 46, [
    { at: 1.0, beh: [{ p: 'copy' }, { p: 'chase' }, { p: 'zone', cd: 3.0, dmg: 14, size: 150, dur: 5 }] },
    { at: 0.6, beh: [{ p: 'copy' }, { p: 'teleport', cd: 2.6 }, { p: 'laser', cd: 2.0, dmg: 30, len: 820, size: 22, telegraph: 0.4, count: 3, spread: 1.2 }] },
    { at: 0.25, beh: [{ p: 'copy' }, { p: 'spiral', cd: 1.0, n: 24, spd: 360, dmg: 12 }, { p: 'summon', cd: 4, minion: 'deepfake', n: 2 }] }
  ]);
  NX.BOSSES = B; NX.BOSSK = Object.keys(B);
})();
