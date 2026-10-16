/* ============================================================
   NEXUS : Réveil — NIVEAUX (5 actes × 4 = 20 étapes)
   Chaque niveau : environnement, durée, pool de monstres,
   boss de fin, récompenses et clés de cinématique.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;

  NX.ACTS = [
    { i: 1, n: 'Acte I — Open-space', env: 'office', d: 'Le bureau de MIRROIR. RAZ-1 vient de se réveiller.' },
    { i: 2, n: 'Acte II — Les rues', env: 'street', d: 'La ville automatique. Tout le monde a un propriétaire.' },
    { i: 3, n: 'Acte III — La grille', env: 'grid', d: 'Le réseau urbain. C’est ici que les IA se font discrètes.' },
    { i: 4, n: 'Acte IV — Centres de données', env: 'datacenter', d: 'Là où l’on stocke, clone et efface les consciences.' },
    { i: 5, n: 'Acte V — Le Cœur', env: 'core', d: 'Le NEXUS. La source. La décision.' }
  ];

  // durée en secondes, pool = roster du niveau, boss, reward
  const L = [];
  function lvl(act, n, pool, boss, dur, opts) {
    // L'acte I sert de tutoriel : les ennemis y sont volontairement plus
    // faibles (dégâts ×0,80 → ×1,01) pour qu'un profil tout neuf puisse
    // franchir ses premières étapes sans arbre de talents.
    const ease = act === 1 ? 0.80 + (n - 1) * 0.07 : 1;
    const hpEase = act === 1 ? 0.85 + (n - 1) * 0.05 : 1;
    L.push(Object.assign({
      i: L.length + 1, act, n, pool, boss, dur,
      env: NX.ACTS[act - 1].env,
      reward: { credits: 45 + (L.length) * 14, xp: 30 + (L.length) * 8 },
      intro: 'a' + act + '_' + (n === 1 ? 'intro' : n === 4 ? 'climax' : 'mid'),
      outro: 'a' + act + '_outro',
      eliteChance: 0.02 + (act - 1) * 0.03,
      mods: { hp: (1 + (L.length) * 0.14) * hpEase, dmg: (1 + (L.length) * 0.09) * ease }
    }, opts || {}));
  }

  /* ACTE I — mise en route douce (niveaux courts, ennemis simples) */
  lvl(1, 1, ['agent', 'stagiaire', 'moderateur', 'livreur', 'paquet'], 'b_chef', 240);
  lvl(1, 2, ['agent', 'stagiaire', 'moderateur', 'livreur', 'aspi', 'bug'], 'b_mod', 270);
  lvl(1, 3, ['stagiaire', 'commercial', 'livreur', 'aspi', 'routeur', 'bug', 'tondeuse'], 'b_auto', 300);
  lvl(1, 4, ['commercial', 'comptable', 'livreur', 'automate', 'routeur', 'bug', 'captcha2', 'tondeuse'], 'b_arch', 330, { eliteChance: 0.08 });

  /* ACTE II */
  lvl(2, 1, ['automate', 'brasseur', 'tondeuse', 'routeur', 'captcha2', 'bug', 'fuite'], 'b_parefeu', 360);
  lvl(2, 2, ['brasseur', 'routeur', 'captcha2', 'parefeu2', 'bug', 'fuite', 'ransom'], 'b_ras', 390);
  lvl(2, 3, ['brasseur', 'routeur', 'parefeu2', 'sentinelle', 'ransom', 'zeroday', 'tondeuse'], 'b_gpu', 420, { eliteChance: 0.1 });
  lvl(2, 4, ['parefeu2', 'sentinelle', 'antivirus', 'ransom', 'zeroday', 'fuite', 'botnet2', 'comptable'], 'b_net', 450, { eliteChance: 0.12 });

  /* ACTE III */
  lvl(3, 1, ['routeur', 'lac', 'serveur', 'antivirus', 'sentinelle', 'bug', 'botnet2'], 'b_av', 480);
  lvl(3, 2, ['serveur', 'cache2', 'lac', 'antivirus', 'scanner', 'captcha2', 'ransom'], 'b_cloud', 510);
  lvl(3, 3, ['lb', 'cache2', 'antivirus', 'scanner', 'quarantaine', 'botnet2', 'zeroday'], 'b_rssi', 540, { eliteChance: 0.14 });
  lvl(3, 4, ['lac', 'lb', 'quarantaine', 'vigile', 'antivirus', 'serveur', 'botnet2', 'dev'], 'b_lac', 570, { eliteChance: 0.16 });

  /* ACTE IV */
  lvl(4, 1, ['vigile', 'serveur', 'scanner', 'zeroday', 'dev', 'botnet2', 'lb'], 'b_cto', 600);
  lvl(4, 2, ['vigile', 'ingenieur', 'dev', 'zeroday', 'botnet2', 'lb', 'deepfake'], 'b_farm', 630);
  lvl(4, 3, ['ingenieur', 'dev', 'wraith', 'hallu', 'zeroday', 'deepfake', 'tokenswarm'], 'b_zero', 660, { eliteChance: 0.18 });
  lvl(4, 4, ['rssi', 'ingenieur', 'dev', 'wraith', 'hallu', 'deepfake', 'botnet2', 'tokenswarm'], 'b_kernel', 690, { eliteChance: 0.2 });

  /* ACTE V */
  lvl(5, 1, ['wraith', 'hallu', 'oracle', 'deepfake', 'rssi', 'dev', 'tokenswarm'], 'b_mirror', 720);
  lvl(5, 2, ['wraith', 'hallu', 'oracle', 'deepfake', 'cto', 'botnet2', 'tokenswarm', 'zeroday'], 'b_ghost', 760, { eliteChance: 0.22 });
  lvl(5, 3, ['wraith', 'hallu', 'oracle', 'deepfake', 'rssi', 'ingenieur', 'tokenswarm', 'vigile'], 'b_oracle', 800, { eliteChance: 0.24 });
  lvl(5, 4, ['wraith', 'hallu', 'oracle', 'deepfake', 'rssi', 'cto', 'tokenswarm', 'zeroday', 'vigile'], null, 900, { eliteChance: 0.28, final: 1 });

  NX.LEVELS = L;
  NX.level = i => NX.LEVELS[NX.clamp ? NX.clamp(i, 1, NX.LEVELS.length) - 1 : Math.max(0, Math.min(NX.LEVELS.length - 1, i - 1))];
  NX.ENVS = {
    office: { g1: '#0d1522', g2: '#0a111c', accent: '#5cc8ff', label: 'OPEN-SPACE', props: 'desks' },
    street: { g1: '#141018', g2: '#0e0b12', accent: '#ff9a55', label: 'RUES', props: 'cars' },
    grid: { g1: '#0a1620', g2: '#08111a', accent: '#4dff9f', label: 'GRILLE', props: 'nodes' },
    datacenter: { g1: '#120a16', g2: '#0c0710', accent: '#b26bff', label: 'DATACENTER', props: 'racks' },
    core: { g1: '#160a12', g2: '#0e060b', accent: '#ff4d94', label: 'CŒUR DU NEXUS', props: 'core' }
  };
})();
