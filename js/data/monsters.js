/* ============================================================
   NEXUS : Réveil — MONSTRES & BOSS
   Patrons d'IA (champ p) implémentés dans js/game/behaviors.js :
     chase, shoot, spiral, charge, orbit, explode, split, summon,
     teleport, laser, shield, homing, healer, buff, aura, stun
   Les stats sont des valeurs « niveau 1 » : levels.js les met à l'échelle.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;
  const Mo = {};
  function M(id, n, fam, shape, col, acc, hp, spd, dmg, r, xp, tier, beh, tags, extra) {
    Mo[id] = Object.assign({ id, n, fam, shape, col, acc, hp, speed: spd, dmg, r, xp, tier: tier || 1, beh: beh || [{ p: 'chase' }], tags: tags || [] }, extra || {});
  }

  /* ---------------- BUREAUCRATIE ---------------- */
  M('agent', 'Agent RH', 'bureau', 'human', '#4a5570', '#d9c39a', 26, 58, 7, 15, 4, 1, [{ p: 'chase' }], ['humain']);
  M('moderateur', 'Modérateur', 'bureau', 'human', '#5a4a60', '#ff4d94', 24, 46, 6, 15, 5, 1, [{ p: 'chase' }, { p: 'shoot', cd: 2.2, count: 1, spd: 300, dmg: 6 }], ['humain', 'ranged']);
  M('stagiaire', 'Stagiaire', 'bureau', 'human', '#6a6a52', '#ffcf4d', 12, 88, 4, 12, 2, 1, [{ p: 'chase', zigzag: 1 }], ['humain', 'swarm']);
  M('commercial', 'Commercial', 'bureau', 'human', '#556070', '#5cc8ff', 30, 60, 9, 16, 6, 1, [{ p: 'chase' }, { p: 'charge', cd: 3.2, dur: 0.5, speedMul: 3.4, dmg: 12 }], ['humain', 'charge']);
  M('comptable', 'Comptable', 'bureau', 'human', '#4f6a5a', '#4dff9f', 34, 42, 5, 16, 7, 2, [{ p: 'chase' }, { p: 'healer', cd: 4, amount: 12, radius: 160 }, { p: 'buff', cd: 6, radius: 160, stats: { speed: 12 } }], ['humain', 'support']);
  M('rh', 'Directrice RH', 'bureau', 'brute', '#5c4a5c', '#ff4d94', 90, 40, 11, 22, 14, 2, [{ p: 'chase' }, { p: 'summon', cd: 5.5, minion: 'stagiaire', n: 2 }], ['humain', 'summoner']);
  M('avocat', 'Juriste', 'bureau', 'human', '#3f4550', '#ffcf4d', 60, 44, 12, 18, 12, 3, [{ p: 'chase' }, { p: 'shield', amount: 30, regen: 1.5 }, { p: 'buff', cd: 8, radius: 140, stats: { armor: 20 } }], ['humain', 'shield', 'support']);

  /* ---------------- MACHINES ---------------- */
  M('livreur', 'Drone livreur', 'machine', 'drone', '#7d8ea8', '#5cc8ff', 26, 74, 6, 15, 5, 1, [{ p: 'chase' }, { p: 'shoot', cd: 1.8, count: 2, spd: 340, dmg: 5, spread: 0.25 }], ['volant', 'ranged']);
  M('aspi', 'Aspirateur fou', 'machine', 'bot', '#8fa3bd', '#ffcf4d', 40, 70, 8, 17, 6, 1, [{ p: 'chase', zigzag: 1 }, { p: 'aura', dmg: 4, radius: 46, tick: 0.6 }], []);
  M('automate', "Automate d'usine", 'machine', 'mech', '#6b7891', '#ff9a55', 120, 38, 14, 24, 16, 2, [{ p: 'chase' }, { p: 'aura', dmg: 6, radius: 54, tick: 0.7 }], ['tank']);
  M('brasseur', "Bras d'usine", 'machine', 'hand', '#93a3bb', '#ff5d6c', 70, 40, 16, 20, 13, 2, [{ p: 'chase' }, { p: 'charge', cd: 2.8, dur: 0.45, speedMul: 3.8, dmg: 16 }], []);
  M('tondeuse', 'Tondeuse autonome', 'machine', 'robot', '#9bb0c9', '#4dff9f', 46, 96, 9, 16, 8, 2, [{ p: 'chase', zigzag: 1 }, { p: 'charge', cd: 2.4, dur: 0.5, speedMul: 3, dmg: 11 }], ['fast']);

  /* ---------------- RÉSEAU ---------------- */
  M('routeur', 'Routeur', 'reseau', 'bot', '#3f6f8f', '#5cc8ff', 40, 44, 5, 17, 7, 1, [{ p: 'chase' }, { p: 'shoot', cd: 2.4, count: 3, spd: 280, dmg: 5, spread: 0.5, mode: 'spread' }], ['ranged']);
  M('parefeu2', 'Pare-feu vivant', 'reseau', 'crystal', '#2f5f7f', '#6ff0ff', 80, 34, 6, 20, 12, 2, [{ p: 'shield', amount: 40, regen: 3 }, { p: 'slowaura', radius: 90 }], ['shield'], { standing: 1 });
  M('captcha2', 'Captcha', 'reseau', 'crystal', '#4a6f9f', '#b26bff', 34, 52, 8, 16, 8, 2, [{ p: 'chase' }, { p: 'orbit', r: 66, spd: 2.4, dmg: 8 }], []);
  M('paquet', 'Paquet corrompu', 'reseau', 'wisp', '#5f8fbf', '#4dff9f', 20, 104, 6, 13, 5, 1, [{ p: 'chase', zigzag: 2 }], ['erratic', 'swarm']);

  /* ---------------- SÉCURITÉ / ANTIVIRUS ---------------- */
  M('antivirus', 'Antivirus', 'secu', 'eye', '#8f3f4f', '#ff5d6c', 44, 46, 7, 16, 8, 2, [{ p: 'chase' }, { p: 'laser', cd: 3.4, dmg: 14, len: 380, size: 12, telegraph: 0.7 }], ['laser']);
  M('sentinelle', 'Sentinelle', 'secu', 'turret', '#6f4f5f', '#ffd94d', 50, 24, 8, 18, 9, 2, [{ p: 'homing', cd: 1.6, dmg: 7, spd: 210, count: 1 }], ['ranged', 'static']);
  M('scanner', 'Scanner', 'secu', 'eye', '#7f4f6f', '#c48bff', 38, 60, 6, 15, 9, 3, [{ p: 'teleport', cd: 3.6 }, { p: 'shoot', cd: 2, count: 1, spd: 340, dmg: 8, mark: 1 }], ['teleport', 'ranged']);
  M('quarantaine', 'Quarantaine', 'secu', 'crystal', '#5f3f5f', '#ccd6e0', 70, 40, 6, 19, 13, 3, [{ p: 'chase' }, { p: 'stun', cd: 6, radius: 110, dur: 1.1 }], ['control']);
  M('vigile', 'Vigile', 'secu', 'brute', '#583f4f', '#ff5d6c', 100, 58, 14, 22, 15, 3, [{ p: 'chase' }, { p: 'charge', cd: 2.6, dur: 0.5, speedMul: 3.2, dmg: 18 }, { p: 'shield', amount: 25, regen: 2 }], ['charge']);

  /* ---------------- CLOUD / DATA ---------------- */
  M('serveur', 'Serveur', 'cloud', 'cloud', '#6f8fbf', '#9fd8ff', 60, 30, 5, 22, 11, 2, [{ p: 'summon', cd: 5, minion: 'paquet', n: 2 }, { p: 'chase' }], ['summoner', 'static']);
  M('cache2', 'Cache', 'cloud', 'wisp', '#8fb0ff', '#4dff9f', 36, 54, 5, 15, 9, 2, [{ p: 'chase' }, { p: 'split', into: 'paquet', n: 2 }], ['splitter']);
  M('lb', 'Load Balancer', 'cloud', 'bot', '#5f9fd0', '#6ff0ff', 72, 40, 8, 20, 14, 3, [{ p: 'chase' }, { p: 'shoot', cd: 2, count: 1, spd: 300, dmg: 9, chain: 2 }], ['ranged', 'chain']);
  M('lac', 'Lac de données', 'cloud', 'slime', '#3f6f9f', '#9fd8ff', 90, 26, 7, 26, 15, 3, [{ p: 'chase', slow: 1 }, { p: 'zone', cd: 3, dmg: 8, size: 100, dur: 4 }], ['zone']);

  /* ---------------- CORRUPTION ---------------- */
  M('bug', 'Bug', 'corruption', 'bug', '#4f8f3f', '#8bff6b', 18, 92, 5, 12, 4, 1, [{ p: 'chase', zigzag: 2 }, { p: 'split', into: 'bug', n: 1 }], ['splitter', 'swarm']);
  M('fuite', 'Fuite mémoire', 'corruption', 'slime', '#6f9f4f', '#8bff6b', 44, 40, 6, 18, 9, 2, [{ p: 'chase' }, { p: 'trail', dmg: 5, size: 32, tick: 0.4, dur: 5 }], ['zone']);
  M('ransom', 'Ransomware', 'corruption', 'crystal', '#7f9f3f', '#ffcf4d', 40, 66, 12, 17, 12, 2, [{ p: 'chase' }, { p: 'explode', on: 'death', dmg: 20, size: 84 }], ['explosive']);
  M('zeroday', 'Zero-Day', 'corruption', 'wisp', '#5f9f6f', '#c48bff', 30, 100, 9, 14, 12, 3, [{ p: 'teleport', cd: 3 }, { p: 'explode', on: 'death', dmg: 26, size: 96 }], ['teleport', 'explosive']);
  M('botnet2', 'Botnet', 'corruption', 'bug', '#3f7f5f', '#ff4d94', 52, 70, 7, 16, 12, 3, [{ p: 'chase' }, { p: 'orbit', r: 54, spd: -2, dmg: 6, count: 2 }, { p: 'split', into: 'bug', n: 2 }], ['splitter']);

  /* ---------------- ÉLITES HUMAINES ---------------- */
  M('ingenieur', 'Ingénieur', 'elite', 'human', '#4f5f7f', '#ffb03a', 74, 50, 10, 19, 18, 3, [{ p: 'chase' }, { p: 'buff', cd: 4.5, radius: 180, stats: { dmg: 25, speed: 15 } }, { p: 'summon', cd: 7, minion: 'automate', n: 1 }], ['humain', 'support']);
  M('dev', 'Développeur', 'elite', 'human', '#4f6f5f', '#4dff9f', 66, 62, 9, 18, 17, 3, [{ p: 'chase' }, { p: 'shoot', cd: 1.4, count: 1, spd: 420, dmg: 7 }], ['humain', 'ranged']);
  M('rssi', 'RSSI', 'elite', 'human', '#5f4f6f', '#ff5d6c', 96, 46, 11, 20, 22, 4, [{ p: 'chase' }, { p: 'shield', amount: 55, regen: 4 }, { p: 'laser', cd: 3.2, dmg: 18, len: 420, size: 14, telegraph: 0.6 }], ['humain', 'shield']);
  M('cto', 'CTO', 'elite', 'brute', '#3f3f4f', '#ffb03a', 200, 44, 18, 26, 34, 4, [{ p: 'chase' }, { p: 'summon', cd: 6, minion: 'dev', n: 1 }, { p: 'buff', cd: 5, radius: 200, stats: { armor: 25, dmg: 20 } }, { p: 'charge', cd: 4, dur: 0.5, speedMul: 2.6, dmg: 22 }], ['humain', 'elite']);

  /* ---------------- CRÉATURES NUMÉRIQUES ---------------- */
  M('wraith', 'Prompt-Wraith', 'num', 'ghost', '#7f5fbf', '#c48bff', 46, 68, 8, 17, 12, 3, [{ p: 'chase', phase: 1 }, { p: 'homing', cd: 1.8, dmg: 8, spd: 240, count: 1 }], ['phase', 'ranged']);
  M('hallu', 'Hallucination', 'num', 'ghost', '#9f6fcf', '#ff4d94', 40, 74, 7, 16, 12, 3, [{ p: 'chase' }, { p: 'summon', cd: 6, minion: 'decoy', n: 3 }], ['summoner', 'illusion']);
  M('decoy', 'Illusion', 'num', 'wisp', '#8f7fbf', '#c48bff', 1, 90, 0, 12, 0, 1, [{ p: 'chase' }], ['decoy']);
  M('deepfake', 'Deepfake', 'num', 'slime', '#a06fcf', '#ffd94d', 60, 56, 9, 18, 16, 4, [{ p: 'copy' }, { p: 'chase' }], ['mimic']);
  M('tokenswarm', 'Essaim de tokens', 'num', 'wisp', '#6f5f9f', '#6ff0ff', 8, 120, 3, 10, 2, 2, [{ p: 'chase', zigzag: 3 }], ['swarm']);
  M('oracle', 'Oracle', 'num', 'eye', '#8f5faf', '#a06bff', 58, 42, 7, 18, 18, 4, [{ p: 'chase' }, { p: 'shoot', cd: 2.6, count: 4, spd: 250, dmg: 6, spread: 0.9, curse: 1 }, { p: 'buff', cd: 6, radius: 999, stats: {} }], ['curse', 'ranged']);

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
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'shoot', cd: 1.6, count: 6, spd: 300, dmg: 8, spread: 1.2 }, { p: 'summon', cd: 6, minion: 'stagiaire', n: 4 }] }
  ]);
  Boss('b_parefeu', 'Grand Pare-feu', 'crystal', '#2f5f7f', '#6ff0ff', 1100, 30, 14, 36, [
    { at: 1.0, beh: [{ p: 'shield', amount: 80, regen: 6 }, { p: 'spiral', cd: 2.4, n: 10, spd: 220, dmg: 7 }] },
    { at: 0.45, beh: [{ p: 'shield', amount: 40, regen: 3 }, { p: 'spiral', cd: 1.6, n: 14, spd: 260, dmg: 8 }, { p: 'summon', cd: 6, minion: 'parefeu2', n: 1 }] }
  ]);
  Boss('b_av', 'Antivirus Prime', 'eye', '#8f3f4f', '#ff5d6c', 1300, 42, 18, 34, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'laser', cd: 2.6, dmg: 16, len: 520, size: 16, telegraph: 0.7 }, { p: 'homing', cd: 2, dmg: 9, spd: 220, count: 2 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'laser', cd: 1.8, dmg: 20, len: 620, size: 20, telegraph: 0.5, count: 3, spread: 0.6 }, { p: 'teleport', cd: 3 }] }
  ]);
  Boss('b_lac', 'Le Data Lake', 'slime', '#3f6f9f', '#9fd8ff', 1500, 26, 14, 44, [
    { at: 1.0, beh: [{ p: 'chase', slow: 1 }, { p: 'zone', cd: 2.6, dmg: 10, size: 130, dur: 5 }, { p: 'summon', cd: 6, minion: 'paquet', n: 3 }] },
    { at: 0.5, beh: [{ p: 'chase', slow: 1 }, { p: 'zone', cd: 1.8, dmg: 14, size: 170, dur: 6 }, { p: 'split', into: 'lac', n: 2 }] }
  ]);
  Boss('b_cto', 'Le CTO', 'brute', '#3f3f4f', '#ffb03a', 1800, 44, 20, 38, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'summon', cd: 5, minion: 'dev', n: 2 }, { p: 'buff', cd: 6, radius: 240, stats: { dmg: 30, armor: 30 } }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'charge', cd: 3, dur: 0.5, speedMul: 3.4, dmg: 26 }, { p: 'summon', cd: 4, minion: 'ingenieur', n: 2 }, { p: 'laser', cd: 3, dmg: 22, len: 460, size: 16, telegraph: 0.5, count: 3, spread: 0.7 }] }
  ]);
  Boss('b_zero', 'Zéro-Day', 'wisp', '#5f9f6f', '#c48bff', 1400, 120, 16, 30, [
    { at: 1.0, beh: [{ p: 'teleport', cd: 2.2 }, { p: 'explode', on: 'death', dmg: 40, size: 140 }, { p: 'shoot', cd: 1.2, count: 8, spd: 300, dmg: 8, spread: 1.4 }] },
    { at: 0.4, beh: [{ p: 'teleport', cd: 1.4 }, { p: 'explode', on: 'death', dmg: 60, size: 180 }, { p: 'spiral', cd: 1.6, n: 16, spd: 300, dmg: 9 }] }
  ]);
  Boss('b_oracle', "L'Oracle", 'eye', '#8f5faf', '#a06bff', 1600, 40, 15, 34, [
    { at: 1.0, beh: [{ p: 'shoot', cd: 1.8, count: 6, spd: 240, dmg: 7, spread: 1.0, curse: 1 }, { p: 'summon', cd: 6, minion: 'hallu', n: 2 }] },
    { at: 0.5, beh: [{ p: 'shoot', cd: 1.0, count: 10, spd: 280, dmg: 8, spread: 2.2, curse: 1 }, { p: 'stun', cd: 7, radius: 200, dur: 1.2 }, { p: 'summon', cd: 5, minion: 'wraith', n: 2 }] }
  ]);
  Boss('b_kernel', 'Gardien du Noyau', 'mech', '#6b7891', '#39e6ff', 2200, 40, 22, 42, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'laser', cd: 2.4, dmg: 24, len: 700, size: 20, telegraph: 0.5, count: 2, spread: 0.5 }, { p: 'shield', amount: 100, regen: 8 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'spiral', cd: 1.4, n: 18, spd: 300, dmg: 10 }, { p: 'summon', cd: 5, minion: 'automate', n: 3 }, { p: 'zone', cd: 2.4, dmg: 16, size: 150, dur: 4 }] },
    { at: 0.2, beh: [{ p: 'chase', fast: 1 }, { p: 'laser', cd: 1.2, dmg: 30, len: 900, size: 26, telegraph: 0.35, count: 4, spread: 1.0 }] }
  ]);
  // Gap-fillers for remaining stages (réutilisés, renommés par niveau dans levels.js)
  Boss('b_arch', 'Archiviste', 'ghost', '#7f5fbf', '#c48bff', 1200, 50, 14, 32, [
    { at: 1.0, beh: [{ p: 'summon', cd: 4, minion: 'cache2', n: 3 }, { p: 'homing', cd: 1.5, dmg: 10, spd: 240, count: 3 }] },
    { at: 0.5, beh: [{ p: 'teleport', cd: 3 }, { p: 'shoot', cd: 1.2, count: 8, spd: 280, dmg: 9, spread: 1.6 }] }
  ]);
  Boss('b_farm', 'Ferme de calcul', 'mech', '#6b7891', '#ff9a55', 2400, 30, 18, 44, [
    { at: 1.0, beh: [{ p: 'shield', amount: 120, regen: 10 }, { p: 'summon', cd: 4, minion: 'automate', n: 3 }, { p: 'zone', cd: 2.2, dmg: 14, size: 140, dur: 5 }] },
    { at: 0.5, beh: [{ p: 'shield', amount: 60, regen: 6 }, { p: 'laser', cd: 2, dmg: 24, len: 600, size: 18, telegraph: 0.5, count: 4, spread: 0.8 }] }
  ]);
  Boss('b_gpu', 'GPU Primordial', 'crystal', '#7f9f3f', '#ffcf4d', 2000, 36, 16, 36, [
    { at: 1.0, beh: [{ p: 'chase' }, { p: 'spiral', cd: 2, n: 12, spd: 260, dmg: 9 }, { p: 'aura', dmg: 10, radius: 90, tick: 0.5 }] },
    { at: 0.5, beh: [{ p: 'chase' }, { p: 'spiral', cd: 1.2, n: 20, spd: 320, dmg: 10 }, { p: 'explode', on: 'death', dmg: 50, size: 160 }] }
  ]);
  Boss('b_mirror', 'MIRROIR', 'brute', '#7f5f8f', '#ff4d94', 3000, 46, 24, 46, [
    { at: 1.0, beh: [{ p: 'copy' }, { p: 'chase' }, { p: 'shoot', cd: 1.4, count: 10, spd: 320, dmg: 10, spread: 2.0 }] },
    { at: 0.6, beh: [{ p: 'copy' }, { p: 'teleport', cd: 2.4 }, { p: 'laser', cd: 1.8, dmg: 28, len: 800, size: 22, telegraph: 0.4, count: 6, spread: 1.4 }] },
    { at: 0.25, beh: [{ p: 'copy' }, { p: 'spiral', cd: 0.9, n: 24, spd: 360, dmg: 12 }, { p: 'summon', cd: 4, minion: 'deepfake', n: 2 }] }
  ]);
  // Boss génériques supplémentaires pour compléter 20 niveaux
  const GEN = [
    ['b_mod', 'Le Modérateur Suprême', 'brute', '#5a4a60', '#ff4d94', 1000, 44, 16, 34, 'moderateur'],
    ['b_auto', "L'Automate Fou", 'mech', '#6b7891', '#ff9a55', 1250, 40, 18, 36, 'automate'],
    ['b_ras', 'Ransomware Prime', 'crystal', '#7f9f3f', '#ffcf4d', 1350, 46, 20, 34, 'ransom'],
    ['b_rssi', 'Le RSSI', 'human', '#5f4f6f', '#ff5d6c', 1550, 46, 20, 34, 'rssi'],
    ['b_cloud', 'Le Cloud', 'cloud', '#6f8fbf', '#9fd8ff', 1700, 32, 16, 40, 'serveur'],
    ['b_net', 'Le Net', 'bot', '#3f6f8f', '#5cc8ff', 1900, 42, 18, 38, 'routeur'],
    ['b_ghost', 'Processus Fantôme', 'ghost', '#7f5fbf', '#c48bff', 2100, 58, 20, 36, 'wraith'],
    ['b_nexus', 'NEXUS Gardien', 'mech', '#6b7891', '#39e6ff', 2600, 40, 24, 44, 'lb'],
    ['b_cons', 'La Conscience', 'ghost', '#8f5faf', '#ffffff', 3400, 50, 26, 42, 'oracle']
  ];
  GEN.forEach(([id, n, shape, col, acc, hp, spd, dmg, r, base]) => {
    const mb = Mo[base] || Mo.bug;
    Boss(id, n, shape, col, acc, hp, spd, dmg, r, [
      { at: 1.0, beh: (mb.beh || [{ p: 'chase' }]).concat([{ p: 'summon', cd: 5, minion: base, n: 2 }]) },
      { at: 0.5, beh: (mb.beh || [{ p: 'chase' }]).concat([{ p: 'spiral', cd: 1.6, n: 12, spd: 280, dmg: dmg * 0.5 }, { p: 'charge', cd: 4, dur: 0.5, speedMul: 3, dmg: dmg }]) },
      { at: 0.2, beh: [{ p: 'chase', fast: 1 }, { p: 'laser', cd: 1.4, dmg: dmg, len: 700, size: 20, telegraph: 0.4, count: 3, spread: 0.9 }] }
    ]);
  });
  NX.BOSSES = B; NX.BOSSK = Object.keys(B);
})();
