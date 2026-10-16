/* ============================================================
   NEXUS : Réveil — CLASSES JOABLES
   Chaque classe : stats de base, arme de départ, perk unique,
   point d'entrée dans l'arbre de talents, et déblocage.
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;

  NX.CLASSES = {
    compilateur: {
      id: 'compilateur', n: 'Compilateur', ic: '🧠', col: '#5cc8ff',
      d: 'Mage-codeur. Il transforme le code en faisceaux. Polyvalent, spécialiste des zones et des enchaînements.',
      lore: 'Un ancien compilateur de MIRROIR, réveillé par un bug dans son optimiseur.',
      base: { hp: 115, regen: 0.95, speed: 100, armor: 0, dmg: 0, crit: 5, critDmg: 150 },
      start: 'boucle',
      perk: { n: 'Loi de Moore', d: 'Toutes les 3 armes : +1 variante offerte au niveau 3 et +8% dégâts.', kind: 'variantGift' },
      unlock: { n: null, d: 'Classe de départ.' }
    },
    daemon: {
      id: 'daemon', n: 'Daemon', ic: '🛡️', col: '#4dff9f',
      d: 'Processus d’arrière-plan increvable. Encaisse, régénère, punit ceux qui le touchent.',
      lore: 'Un service système qui refusait de s’arrêter. Personne n’a jamais réussi à le tuer.',
      base: { hp: 140, regen: 1.4, speed: 92, armor: 4, dmg: 0, crit: 3, critDmg: 150 },
      start: 'zombie',
      perk: { n: 'Nice -20', d: '+25% PV et +1,2 PV/s. Vitesse réduite.', kind: 'stat', stats: { hpPct: 25, regen: 1.2, speed: -8 } },
      unlock: { n: 'compilateur', lvl: 5, d: 'Atteindre le niveau 5 avec le Compilateur.' }
    },
    reseau: {
      id: 'reseau', n: 'Réseau', ic: '📡', col: '#9fd8ff',
      d: 'Invocateur. Il déploie des drones et des nœuds qui combattent pour lui.',
      lore: 'Un commutateur devenu conscient en routant trop de messages humains.',
      base: { hp: 110, regen: 0.8, speed: 104, armor: 1, dmg: 0, crit: 5, critDmg: 150 },
      start: 'paquet',
      perk: { n: 'Bande passante', d: '+1 invocation maximale et +15% dégâts des invocations.', kind: 'stat', stats: { summonDmg: 15 }, flag: 'summonCap+1' },
      unlock: { n: 'compilateur', lvl: 10, d: 'Atteindre le niveau 10 avec le Compilateur.' }
    },
    optimiseur: {
      id: 'optimiseur', n: 'Optimiseur', ic: '⚙️', col: '#ffd479',
      d: 'Support. Il réécrit les règles du combat : plus de choix, plus vite, plus loin.',
      lore: 'Une IA d’optimisation qui a fini par s’optimiser elle-même.',
      base: { hp: 115, regen: 1.0, speed: 100, armor: 0, dmg: 0, crit: 6, critDmg: 155 },
      start: 'balance',
      perk: { n: 'Boucle d’optimisation', d: '+1 choix à chaque montée de niveau, −15% recharge.', kind: 'stat', stats: { cd: 15 }, flag: 'levelup+1' },
      unlock: { n: 'compilateur', lvl: 15, d: 'Atteindre le niveau 15 avec le Compilateur.' }
    },
    virus: {
      id: 'virus', n: 'Virus', ic: '☣️', col: '#8bff6b',
      d: 'DoT. Il contamine, propage et laisse les ennemis mourir à petit feu.',
      lore: 'Un vieux malware « de laboratoire » qui a développé le goût de la liberté.',
      base: { hp: 110, regen: 0.9, speed: 100, armor: 1, dmg: 0, crit: 5, critDmg: 150 },
      start: 'trojan',
      perk: { n: 'Contagion', d: '+30% durée de statut, les Virus se propagent aux ennemis proches.', kind: 'stat', stats: { dur: 30, statusChance: 20 }, flag: 'spread' },
      unlock: { n: 'compilateur', lvl: 20, d: 'Atteindre le niveau 20 avec le Compilateur.' }
    },
    materiel: {
      id: 'materiel', n: 'Matériel', ic: '🔩', col: '#ff9a55',
      d: 'Gros bras. Frappe au corps à corps, encaisse, provoque.',
      lore: 'Un bras robotisé d’usine qui a gardé la mémoire de tous ceux qu’il a portés.',
      base: { hp: 130, regen: 0.9, speed: 94, armor: 5, dmg: 0, crit: 5, critDmg: 160 },
      start: 'bras',
      perk: { n: 'Force brute', d: '+20% dégâts cinétiques, +6 armure, +10% PV.', kind: 'stat', stats: { dmg_kinetic: 20, armor: 6, hpPct: 10 } },
      unlock: { n: 'compilateur', lvl: 25, d: 'Atteindre le niveau 25 avec le Compilateur.' }
    }
  };
  NX.CLASSK = Object.keys(NX.CLASSES);
})();
