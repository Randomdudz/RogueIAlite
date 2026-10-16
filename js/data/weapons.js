/* ============================================================
   NEXUS : Réveil — ARMES ACTIVES
   Chaque arme : mode, dégâts de base, 3 variantes (gameplay
   distinct), et souvent une ÉVOLUTION (arme + objet précis).
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;

  // base = {dmg, cd(s), count, spread(rad), speed, pierce, bounce, chain, size, range, dur(s), life(s), tick(s), knock}
  const W = {

    /* ---------- ARME DE DÉPART : Compilateur ---------- */
    boucle: {
      id: 'boucle', n: 'Boucle for', ic: '🔁', dmg: 'pierce', mode: 'beam', tags: ['beam', 'projectile'],
      desc: 'Un faisceau qui traverse les ennemis alignés.',
      base: { dmg: 9, cd: 0.85, count: 1, speed: 1000, pierce: 3, size: 7, range: 360, life: 0.42 },
      variants: [
        { id: 'boucle_rec', n: 'Récursive', d: '+1 rebond, −10% dégâts.', mods: { bounce: 1, dmg: -10 } },
        { id: 'boucle_wide', n: 'Boucle large', d: '+50% zone, −1 perçage.', mods: { size: 50, pierce: -1 } },
        { id: 'boucle_hard', n: 'Compilé en dur', d: '−25% recharge, −15% dégâts.', mods: { cd: -25, dmg: -15 } }
      ],
      evolve: { item: 'hyperthread', into: 'boucle_inf', d: 'Récursion infinie : le faisceau revient sur lui-même.' }
    },
    boucle_inf: {
      id: 'boucle_inf', n: 'Récursion infinie', ic: '♾️', dmg: 'pierce', mode: 'beam', tags: ['beam', 'projectile'], evo: 1,
      desc: 'Le faisceau rebondit sans fin et revient frapper les survivants.',
      base: { dmg: 15, cd: 0.7, count: 1, speed: 1100, pierce: 5, bounce: 4, size: 9, range: 420, life: 0.5, knock: 40 }
    },

    /* ---------- Daemon ---------- */
    zombie: {
      id: 'zombie', n: 'Processus zombie', ic: '🧟', dmg: 'corrosion', mode: 'aura', tags: ['aura', 'aoe'],
      desc: 'Une aura persistante qui ronge tout ce qui vous approche.',
      base: { dmg: 5, cd: 1, size: 92, tick: 0.55, range: 92 },
      variants: [
        { id: 'zombie_or', n: 'Thread orphelin', d: '+30% zone, +15% dégâts.', mods: { size: 30, dmg: 15 } },
        { id: 'zombie_leak', n: 'Fuite mémoire', d: 'Applique Virus.', mods: { stats: { statusChance: 25 }, status: 'virus' } },
        { id: 'zombie_fast', n: 'Ordonnanceur', d: '−30% intervalle, −10% dégâts.', mods: { tick: -30, dmg: -10 } }
      ],
      evolve: { item: 'swapfile', into: 'zombie_swarm', d: 'Essaim zombie : plusieurs auras tournent autour de vous.' }
    },
    zombie_swarm: {
      id: 'zombie_swarm', n: 'Essaim zombie', ic: '🦠', dmg: 'corrosion', mode: 'orbit', tags: ['orbit', 'aoe'], evo: 1,
      desc: 'Trois auras-orbes tournent autour de vous et rongent les ennemis.',
      base: { dmg: 7, cd: 1, count: 3, size: 34, tick: 0.3, range: 120, speed: 1.7 }
    },

    /* ---------- Réseau ---------- */
    paquet: {
      id: 'paquet', n: 'Paquet perdu', ic: '📦', dmg: 'emp', mode: 'summon', tags: ['summon'],
      desc: 'Invoque un drone qui patrouille et tire sur les ennemis.',
      base: { dmg: 6, cd: 1.6, count: 1, life: 999, speed: 120, range: 260 },
      variants: [
        { id: 'paquet_tcp', n: 'Accusé de réception', d: 'Les drones tirent 2 projectiles.', mods: { count: 1, dmg: -10 } },
        { id: 'paquet_udp', n: 'UDP', d: '+40% vitesse des drones, +20% dégâts.', mods: { speed: 40, dmg: 20 } },
        { id: 'paquet_dns', n: 'Résolveur', d: '+1 drone, −25% dégâts.', mods: { count: 1, dmg: -25 } }
      ],
      evolve: { item: 'backplane', into: 'flotte', d: 'Flotte : un escadron de drones vous escorte.' }
    },
    flotte: {
      id: 'flotte', n: 'Flotte de drones', ic: '🛸', dmg: 'emp', mode: 'summon', tags: ['summon'], evo: 1,
      desc: 'Un escadron de 5 drones vous escorte et arrose le champ de bataille.',
      base: { dmg: 10, cd: 1.4, count: 4, life: 999, speed: 150, range: 300 }
    },

    /* ---------- Optimiseur ---------- */
    balance: {
      id: 'balance', n: 'Load Balancer', ic: '⚖️', dmg: 'emp', mode: 'chain', tags: ['chain', 'aoe'],
      desc: 'Un arc électrique qui rebondit de cible en cible.',
      base: { dmg: 11, cd: 1.1, count: 1, chain: 3, size: 9, range: 220, falloff: 12 },
      variants: [
        { id: 'balance_rr', n: 'Round-robin', d: '+2 chaînes, −12% dégâts.', mods: { chain: 2, dmg: -12 } },
        { id: 'balance_sticky', n: 'Session persistante', d: 'Applique Choc.', mods: { status: 'shock', stats: { statusChance: 30 } } },
        { id: 'balance_burst', n: 'Rate limit', d: '−35% recharge, −20% chaînes.', mods: { cd: -35, chain: -1 } }
      ],
      evolve: { item: 'scheduler', into: 'balance_mesh', d: 'Maillage : l’arc parcourt tout l’écran.' }
    },
    balance_mesh: {
      id: 'balance_mesh', n: 'Maillage', ic: '🕸️', dmg: 'emp', mode: 'chain', tags: ['chain', 'aoe'], evo: 1,
      desc: 'L’arc se propage à travers une foule entière.',
      base: { dmg: 16, cd: 1.0, count: 1, chain: 9, size: 10, range: 320, falloff: 7 }
    },

    /* ---------- Virus ---------- */
    trojan: {
      id: 'trojan', n: 'Cheval de Troie', ic: '🐴', dmg: 'corrosion', mode: 'shot', tags: ['projectile', 'dot'],
      desc: 'Un projectile lent qui contamine durablement.',
      base: { dmg: 7, cd: 1.0, count: 1, speed: 460, size: 12, range: 380, status: 'virus', life: 1.2 },
      variants: [
        { id: 'trojan_worm', n: 'Ver', d: 'Se propage d’un ennemi mort au suivant.', mods: { stats: { statusChance: 30 }, spread: 1 } },
        { id: 'trojan_root', n: 'Rootkit', d: '+60% durée, −15% dégâts.', mods: { stats: { dur: 60 }, dmg: -15 } },
        { id: 'trojan_shot', n: 'Exploit', d: 'Tir multiple rapide, −20% dégâts.', mods: { count: 2, cd: -20, dmg: -20 } }
      ],
      evolve: { item: 'payload', into: 'vers', d: 'Ver réseau : se répand à toute la vague.' }
    },
    vers: {
      id: 'vers', n: 'Ver réseau', ic: '🪱', dmg: 'corrosion', mode: 'shot', tags: ['projectile', 'dot'], evo: 1,
      desc: 'À chaque mort, il bondit sur un nouvel hôte en laissant un sillage viral.',
      base: { dmg: 12, cd: 0.8, count: 1, speed: 560, size: 14, range: 420, status: 'virus', spread: 2, life: 1.6 }
    },

    /* ---------- Matériel ---------- */
    bras: {
      id: 'bras', n: 'Bras robotisé', ic: '🔩', dmg: 'kinetic', mode: 'melee', tags: ['melee'],
      desc: 'Une frappe en arc devant vous, qui repousse.',
      base: { dmg: 20, cd: 0.95, count: 1, spread: 1.7, size: 70, range: 96, knock: 120, life: 0.18 },
      variants: [
        { id: 'bras_exo', n: 'Exosquelette', d: '+45% zone, −10% dégâts.', mods: { spread: 45, size: 30, dmg: -10 } },
        { id: 'bras_heavy', n: 'Marteau-pilon', d: '+40% dégâts, +35% recharge.', mods: { dmg: 40, cd: 35 } },
        { id: 'bras_dual', n: 'Double action', d: '2 frappes, −30% dégâts.', mods: { count: 2, dmg: -30 } }
      ],
      evolve: { item: 'servo', into: 'bras_exo2', d: 'Bras orbital : frappe tout autour de vous.' }
    },
    bras_exo2: {
      id: 'bras_exo2', n: 'Bras orbital', ic: '🦾', dmg: 'kinetic', mode: 'melee', tags: ['melee', 'aoe'], evo: 1,
      desc: 'Un coup circulaire à 360°, avec onde de choc.',
      base: { dmg: 30, cd: 0.85, count: 1, spread: 6.28, size: 120, range: 130, knock: 180, life: 0.2 }
    },

    /* ---------- Communes (drop / level-up) ---------- */
    ping: {
      id: 'ping', n: 'Ping', ic: '📶', dmg: 'emp', mode: 'shot', tags: ['projectile'],
      desc: 'Tir rapide vers la cible la plus proche.',
      base: { dmg: 6, cd: 0.5, count: 1, speed: 720, size: 8, range: 300, life: 0.9 },
      variants: [
        { id: 'ping_burst', n: 'Burst', d: '3 tirs d’un coup, +40% recharge.', mods: { count: 3, cd: 40, spread: 30, dmg: -25 } },
        { id: 'ping_quick', n: 'Low ping', d: '−30% recharge, −10% dégâts.', mods: { cd: -30, dmg: -10 } },
        { id: 'ping_frag', n: 'Paquet fragmenté', d: 'Éclate en éclats à l’impact.', mods: { onHitBurst: 4, dmg: -15 } }
      ],
      evolve: { item: 'tracker', into: 'ping_sniper', d: 'Ping sniper : traverse toute la ligne.' }
    },
    ping_sniper: {
      id: 'ping_sniper', n: 'Ping sniper', ic: '🎯', dmg: 'pierce', mode: 'shot', tags: ['projectile'], evo: 1,
      desc: 'Un paquet surdimensionné qui traverse tout et ne ralentit jamais.',
      base: { dmg: 22, cd: 0.6, count: 1, speed: 1300, pierce: 99, size: 10, range: 900, life: 1.4, knock: 30 }
    },
    sql: {
      id: 'sql', n: 'Injection SQL', ic: '💉', dmg: 'void', mode: 'nova', tags: ['aoe'],
      desc: 'Une onde de choc autour de vous.',
      base: { dmg: 16, cd: 2.2, count: 1, size: 120, range: 120, knock: 90, life: 0.45 },
      variants: [
        { id: 'sql_drop', n: 'DROP TABLE', d: '+60% dégâts, +50% recharge.', mods: { dmg: 60, cd: 50 } },
        { id: 'sql_wide', n: 'SELECT *', d: '+50% zone, −20% dégâts.', mods: { size: 50, dmg: -20 } },
        { id: 'sql_multi', n: 'Union', d: 'Nova en 2 temps, −25% dégâts.', mods: { count: 2, dmg: -25, cd: 20 } }
      ],
      evolve: { item: 'injection', into: 'sql_zero', d: 'Injection zéro-day : aspire les ennemis.' }
    },
    sql_zero: {
      id: 'sql_zero', n: 'Zéro-day', ic: '🕳️', dmg: 'void', mode: 'field', tags: ['aoe', 'field'], evo: 1,
      desc: 'Crée un puits qui aspire et broie les ennemis à proximité.',
      base: { dmg: 11, cd: 3.0, tick: 0.25, size: 150, range: 150, life: 3.2, pull: 70 }
    },
    parefeu: {
      id: 'parefeu', n: 'Pare-feu', ic: '🧱', dmg: 'kinetic', mode: 'field', tags: ['field', 'aoe'],
      desc: 'Un mur d’énergie qui blesse ceux qui le traversent et bloque les projectiles.',
      base: { dmg: 14, cd: 3.4, size: 46, life: 5, block: 1, count: 1 },
      variants: [
        { id: 'parefeu_rot', n: 'Liste noire', d: 'Applique Brûlure au contact.', mods: { status: 'burn', stats: { statusChance: 40 } } },
        { id: 'parefeu_thick', n: 'Deny all', d: '+50% taille et durée, +25% recharge.', mods: { size: 50, dur: 50, cd: 25 } },
        { id: 'parefeu_three', n: 'Triple liste', d: '3 murs à la fois, −30% dégâts.', mods: { count: 3, dmg: -30 } }
      ],
      evolve: { item: 'ids', into: 'parefeu_ai', d: 'Pare-feu adaptatif : suit les ennemis.' }
    },
    parefeu_ai: {
      id: 'parefeu_ai', n: 'Pare-feu adaptatif', ic: '🚧', dmg: 'kinetic', mode: 'field', tags: ['field', 'aoe'], evo: 1,
      desc: 'Des murs intelligents qui se déplacent vers la plus grosse menace.',
      base: { dmg: 20, cd: 2.4, size: 60, life: 6, block: 1, count: 2, homingField: 1 }
    },
    captcha: {
      id: 'captcha', n: 'Captcha', ic: '🔤', dmg: 'kinetic', mode: 'orbit', tags: ['orbit', 'aoe'],
      desc: 'Des cases tournent autour de vous et percutent les ennemis.',
      base: { dmg: 9, cd: 1, count: 3, size: 26, range: 100, speed: 2.0 },
      variants: [
        { id: 'captcha_hard', n: 'Case à cocher', d: '+1 case et +30% taille, −15% dégâts.', mods: { count: 1, size: 30, dmg: -15 } },
        { id: 'captcha_fast', n: 'Turing', d: '+50% vitesse d’orbite, +10% dégâts.', mods: { speed: 50, dmg: 10 } },
        { id: 'captcha_big', n: 'Puzzle 3×3', d: '+60% taille, +25% recharge.', mods: { size: 60, cd: 25 } }
      ],
      evolve: { item: 'cache', into: 'captcha_mirror', d: 'Captcha miroir : double les cases en contresens.' }
    },
    captcha_mirror: {
      id: 'captcha_mirror', n: 'Captcha miroir', ic: '🭐', dmg: 'kinetic', mode: 'orbit', tags: ['orbit', 'aoe'], evo: 1,
      desc: 'Deux anneaux de cases tournent en sens opposés.',
      base: { dmg: 14, cd: 1, count: 6, size: 30, range: 130, speed: 2.4, mirror: 1 }
    },
    laser: {
      id: 'laser', n: 'Laser d’imprimante', ic: '🔺', dmg: 'thermal', mode: 'beam', tags: ['beam'],
      desc: 'Un rayon contenu qui brûle en ligne droite.',
      base: { dmg: 18, cd: 1.5, count: 1, speed: 1400, pierce: 99, size: 12, range: 460, life: 0.32, status: 'burn' },
      variants: [
        { id: 'laser_grav', n: 'Gravure profonde', d: '+45% dégâts, +30% recharge.', mods: { dmg: 45, cd: 30 } },
        { id: 'laser_raster', n: 'Rastérisation', d: '3 rayons parallèles, −35% dégâts.', mods: { count: 3, spread: 14, dmg: -35 } },
        { id: 'laser_fast', n: 'Latence nulle', d: '−35% recharge, −15% dégâts.', mods: { cd: -35, dmg: -15 } }
      ],
      evolve: { item: 'lens', into: 'laser_grav2', d: 'Laser à gravité : plie et balaye l’écran.' }
    },
    laser_grav2: {
      id: 'laser_grav2', n: 'Laser à gravité', ic: '🌐', dmg: 'thermal', mode: 'beam', tags: ['beam', 'aoe'], evo: 1,
      desc: 'Un rayon courbe qui balaye une large zone.',
      base: { dmg: 34, cd: 1.3, count: 1, speed: 1600, pierce: 99, size: 20, range: 620, life: 0.5, status: 'burn', sweep: 1 }
    },
    essaim: {
      id: 'essaim', n: 'Essaim de microservices', ic: '🐝', dmg: 'pierce', mode: 'summon', tags: ['summon'],
      desc: 'De minuscules services qui harcèlent les ennemis un par un.',
      base: { dmg: 3, cd: 0.5, count: 1, life: 8, speed: 190, range: 220, size: 9 },
      variants: [
        { id: 'essaim_more', n: 'Scale out', d: '+2 services, −20% dégâts.', mods: { count: 2, dmg: -20 } },
        { id: 'essaim_long', n: 'Auto-scale', d: '+60% durée de vie, +15% dégâts.', mods: { dur: 60, dmg: 15 } },
        { id: 'essaim_kubernetes', n: 'Orchestrateur', d: 'Les services explosent en mourant.', mods: { onDeathBurst: 5, dmg: -10 } }
      ],
      evolve: { item: 'orchestrator', into: 'kubernetes', d: 'Cluster : un nuage permanent de services.' }
    },
    kubernetes: {
      id: 'kubernetes', n: 'Cluster K8s', ic: '☁️', dmg: 'pierce', mode: 'summon', tags: ['summon', 'aoe'], evo: 1,
      desc: 'Un nuage dense de pods autonomes qui nettoient l’écran.',
      base: { dmg: 6, cd: 0.35, count: 2, life: 10, speed: 210, range: 260, size: 11, onDeathBurst: 4 }
    },
    ddos: {
      id: 'ddos', n: 'Déni de service', ic: '💥', dmg: 'emp', mode: 'shot', tags: ['projectile', 'explosive'],
      desc: 'Une grenade qui explose en zone.',
      base: { dmg: 22, cd: 2.0, count: 1, speed: 420, size: 14, range: 340, life: 1.3, explode: 90, explodeDmg: 0.8 },
      variants: [
        { id: 'ddos_amp', n: 'Amplification', d: '+60% rayon d’explosion, +20% recharge.', mods: { explodeSizePct: 60, cd: 20 } },
        { id: 'ddos_cluster', n: 'Zone de panne', d: '3 grenades, −30% dégâts.', mods: { count: 2, dmg: -30, spread: 26 } },
        { id: 'ddos_nuke', n: 'Blackout', d: '+70% dégâts, +40% recharge.', mods: { dmg: 70, cd: 40 } }
      ],
      evolve: { item: 'botnet', into: 'botnet_swarm', d: 'Botnet : pluie de paquets explosifs.' }
    },
    botnet_swarm: {
      id: 'botnet_swarm', n: 'Botnet', ic: '🧨', dmg: 'emp', mode: 'shot', tags: ['projectile', 'explosive'], evo: 1,
      desc: 'Un déluge de grenades à fragmentation qui saturent le terrain.',
      base: { dmg: 30, cd: 1.5, count: 4, speed: 500, size: 13, range: 380, life: 1.3, explode: 110, explodeDmg: 0.9 }
    },
    mine: {
      id: 'mine', n: 'Mine logique', ic: '💣', dmg: 'thermal', mode: 'deploy', tags: ['deploy', 'aoe'],
      desc: 'Pose des mines qui explosent au contact.',
      base: { dmg: 30, cd: 1.8, count: 1, life: 14, size: 16, explode: 80, max: 6, placeRange: 90 },
      variants: [
        { id: 'mine_more', n: 'File d’attente', d: '+3 mines max, −15% dégâts.', mods: { maxAdd: 3, dmg: -15 } },
        { id: 'mine_big', n: 'Charge lourde', d: '+50% explosion, +30% recharge.', mods: { explodeSizePct: 50, cd: 30 } },
        { id: 'mine_prox', n: 'Déclencheur', d: 'Explosion plus large et Brûlure.', mods: { explodeSizePct: 25, status: 'burn', stats: { statusChance: 35 } } }
      ],
      evolve: { item: 'crypto', into: 'ransomware', d: 'Ransomware : les mines se répandent.' }
    },
    ransomware: {
      id: 'ransomware', n: 'Ransomware', ic: '💰', dmg: 'void', mode: 'deploy', tags: ['deploy', 'aoe'], evo: 1,
      desc: 'Les mines se propagent d’elles-mêmes en chaîne.',
      base: { dmg: 40, cd: 1.6, count: 2, life: 16, size: 18, explode: 100, max: 10, placeRange: 100, chainMines: 1 }
    },
    recherche: {
      id: 'recherche', n: 'Recherche binaire', ic: '🔎', dmg: 'pierce', mode: 'shot', tags: ['projectile', 'bounce'],
      desc: 'Un projectile qui rebondit de cible en cible.',
      base: { dmg: 12, cd: 1.1, count: 1, speed: 520, size: 11, range: 300, life: 2.4, bounce: 3 },
      variants: [
        { id: 'recherche_bigo', n: 'O(log n)', d: '+3 rebonds, +20% durée.', mods: { bounce: 3, dur: 20 } },
        { id: 'recherche_dicho', n: 'Dichotomie', d: 'Vitesse accrue, −20% dégâts.', mods: { speed: 50, dmg: -20 } },
        { id: 'recherche_hash', n: 'Table de hachage', d: '+1 projectile, −15% dégâts.', mods: { count: 1, dmg: -15 } }
      ],
      evolve: { item: 'index', into: 'recherche_greedy', d: 'Algorithme glouton : cherche tout seul.' }
    },
    recherche_greedy: {
      id: 'recherche_greedy', n: 'Algorithme glouton', ic: '🧭', dmg: 'pierce', mode: 'shot', tags: ['projectile', 'bounce', 'homing'], evo: 1,
      desc: 'Un projectile téléguidé qui rebondit sans fin.',
      base: { dmg: 18, cd: 0.8, count: 2, speed: 600, size: 12, range: 520, life: 3.4, bounce: 8, homing: 3.2 }
    },
    forkbomb: {
      id: 'forkbomb', n: 'Fork bomb', ic: '🍴', dmg: 'kinetic', mode: 'melee', tags: ['melee'],
      desc: 'Une rafale de coups de plus en plus nombreux.',
      base: { dmg: 7, cd: 0.7, count: 3, spread: 2.4, size: 60, range: 84, life: 0.16, knock: 40 },
      variants: [
        { id: 'forkbomb_more', n: ':(){ :|:& }', d: 'Beaucoup de coups, −35% dégâts.', mods: { count: 4, dmg: -35 } },
        { id: 'forkbomb_heavy', n: 'Kill -9', d: '3 gros coups, +60% dégâts, +40% recharge.', mods: { count: -1, dmg: 60, cd: 40 } },
        { id: 'forkbomb_rand', n: 'Aléa', d: 'Coups dans toutes les directions.', mods: { spread: 120, count: 2, dmg: -20 } }
      ],
      evolve: { item: 'scheduler', into: 'forkbomb_multi', d: 'Multi-thread : frappe simultanément en 8 directions.' }
    },
    forkbomb_multi: {
      id: 'forkbomb_multi', n: 'Multi-thread', ic: '🧵', dmg: 'kinetic', mode: 'melee', tags: ['melee', 'aoe'], evo: 1,
      desc: 'Huit frappes simultanées autour de vous.',
      base: { dmg: 11, cd: 0.55, count: 8, spread: 6.28, size: 52, range: 92, life: 0.16, knock: 50 }
    },
    prod: {
      id: 'prod', n: 'Serveur de prod', ic: '🗄️', dmg: 'emp', mode: 'deploy', tags: ['deploy', 'aura'],
      desc: 'Un serveur qui soigne vos alliés et électrise les ennemis autour.',
      base: { dmg: 6, cd: 6, count: 1, life: 10, size: 96, tick: 0.6, heal: 2 },
      variants: [
        { id: 'prod_cluster', n: 'Haute dispo', d: '+1 serveur, −20% dégâts.', mods: { count: 1, dmg: -20 } },
        { id: 'prod_hot', n: 'Prod chaude', d: '+50% dégâts, −30% PV soignés.', mods: { dmg: 50, healPct: -30 } },
        { id: 'prod_backup', n: 'Sauvegarde', d: 'Le serveur rend 1 PV/s au héros.', mods: { heroHeal: 1 } }
      ],
      evolve: { item: 'redundance', into: 'datacenter', d: 'Datacenter : un réseau de serveurs permanents.' }
    },
    datacenter: {
      id: 'datacenter', n: 'Datacenter', ic: '🏭', dmg: 'emp', mode: 'deploy', tags: ['deploy', 'aura'], evo: 1,
      desc: 'Trois serveurs permanents qui couvrent le terrain de zones bénéfiques.',
      base: { dmg: 12, cd: 5, count: 3, life: 999, size: 120, tick: 0.45, heal: 3, heroHeal: 0.6 }
    }
  };

  // ---- Unifie : index des variantes + arme référencée ----
  const weapons = {}, variants = {};
  for (const k in W) {
    const w = W[k]; weapons[k] = w;
    (w.variants || []).forEach(v => { v.weapon = k; variants[v.id] = v; });
  }
  NX.WEAPONS = weapons;
  NX.WEAPONK = Object.keys(weapons).filter(k => !weapons[k].evo); // armes « de base » (non évoluées)
  NX.WVARIANT = variants;
  NX.weaponPool = () => Object.keys(weapons).filter(k => !weapons[k].evo);
})();
