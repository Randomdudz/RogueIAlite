/* ============================================================
   NEXUS : Réveil — OBJETS PASSIFS
   stats : modificateurs (voir js/data/keywords.js → NX.STATS)
   evo   : 1 si l'objet sert d'ingrédient d'évolution d'arme
   r     : rareté 0..4
   ============================================================ */
(function () {
  'use strict';
  const NX = window.NX;
  const I = {
    /* ---------- ingrédients d'évolution (16) ---------- */
    hyperthread: { id: 'hyperthread', n: 'Hyperthreading', ic: '🧵', r: 1, evo: 1, d: 'Ingrédient : armes à faisceau.', stats: { count: 1, dmg: 20 } },
    swapfile: { id: 'swapfile', n: 'Fichier d’échange', ic: '🗃️', r: 1, evo: 1, d: 'Ingrédient : auras.', stats: { hp: 30, regen: 1 } },
    backplane: { id: 'backplane', n: 'Fond de panier', ic: '🔌', r: 1, evo: 1, d: 'Ingrédient : invocations.', stats: { summonDmg: 30, count: 1 } },
    scheduler: { id: 'scheduler', n: 'Ordonnanceur', ic: '⏱️', r: 1, evo: 1, d: 'Ingrédient : multi-frappes et arcs.', stats: { cd: 12, speed: 6 } },
    payload: { id: 'payload', n: 'Charge utile', ic: '☣️', r: 1, evo: 1, d: 'Ingrédient : virus.', stats: { dmg_corrosion: 30, statusChance: 20 } },
    servo: { id: 'servo', n: 'Servomoteur', ic: '⚙️', r: 1, evo: 1, d: 'Ingrédient : mêlée.', stats: { dmg_kinetic: 25, speed: 6 } },
    tracker: { id: 'tracker', n: 'Traqueur', ic: '🛰️', r: 1, evo: 1, d: 'Ingrédient : tirs perçants.', stats: { crit: 8, projSpeed: 20 } },
    injection: { id: 'injection', n: 'Requête injectée', ic: '💉', r: 1, evo: 1, d: 'Ingrédient : Void.', stats: { dmg_void: 30, area: 15 } },
    ids: { id: 'ids', n: 'Sonde IDS', ic: '📡', r: 1, evo: 1, d: 'Ingrédient : champs.', stats: { armor: 8, thorns: 6 } },
    cache: { id: 'cache', n: 'Mémoire cache', ic: '🧠', r: 1, evo: 1, d: 'Ingrédient : orbes.', stats: { cd: 15, pickup: 25 } },
    lens: { id: 'lens', n: 'Lentille optique', ic: '🔍', r: 1, evo: 1, d: 'Ingrédient : lasers.', stats: { dmg_thermal: 30, dur: 20 } },
    orchestrator: { id: 'orchestrator', n: 'Orchestrateur', ic: '🎛️', r: 1, evo: 1, d: 'Ingrédient : essaims.', stats: { summonDmg: 30, dur: 20 } },
    botnet: { id: 'botnet', n: 'Nœud de botnet', ic: '🕸️', r: 1, evo: 1, d: 'Ingrédient : explosifs.', stats: { dmg_emp: 25, area: 20 } },
    crypto: { id: 'crypto', n: 'Clé crypto', ic: '🔑', r: 1, evo: 1, d: 'Ingrédient : mines.', stats: { goldGain: 30, luck: 10 } },
    index: { id: 'index', n: 'Index inversé', ic: '📇', r: 1, evo: 1, d: 'Ingrédient : rebonds.', stats: { crit: 10, critDmg: 30 } },
    redundance: { id: 'redundance', n: 'Redondance RAID', ic: '💽', r: 1, evo: 1, d: 'Ingrédient : serveurs.', stats: { hpPct: 15, regen: 1 } },

    /* ---------- communs ---------- */
    patch: { id: 'patch', n: 'Patch de soin', ic: '🩹', r: 0, d: 'Régénération passive.', stats: { regen: 0.5 } },
    ram: { id: 'ram', n: 'Barrette de RAM', ic: '🧮', r: 0, stats: { cd: 8 } },
    cpu: { id: 'cpu', n: 'Processeur', ic: '🖥️', r: 0, stats: { dmg: 10 } },
    gpu: { id: 'gpu', n: 'Carte graphique', ic: '🎮', r: 0, stats: { dmg_thermal: 15 } },
    ssd: { id: 'ssd', n: 'SSD NVMe', ic: '⚡', r: 0, stats: { speed: 8 } },
    fan: { id: 'fan', n: 'Ventilateur', ic: '🌀', r: 0, stats: { armor: 3, regen: 0.3 } },
    razer: { id: 'razer', n: 'Souris gamer', ic: '🖱️', r: 0, stats: { projSpeed: 15 } },
    mechakey: { id: 'mechakey', n: 'Clavier mécanique', ic: '⌨️', r: 0, stats: { cd: 6 } },
    coffee: { id: 'coffee', n: 'Café froid', ic: '☕', r: 0, stats: { speed: 6, regen: 0.4 } },
    sticker: { id: 'sticker', n: 'Sticker Hello World', ic: '🏷️', r: 0, stats: { xpGain: 12 } },
    magnet: { id: 'magnet', n: 'Aimant à disque', ic: '🧲', r: 0, stats: { pickup: 30 } },
    wallet: { id: 'wallet', n: 'Portefeuille', ic: '👛', r: 0, stats: { goldGain: 20 } },
    clover: { id: 'clover', n: 'Trèfle binaire', ic: '🍀', r: 0, stats: { luck: 15 } },

    /* ---------- rares ---------- */
    resistor: { id: 'resistor', n: 'Résistance', ic: '🔘', r: 1, stats: { armor: 5 } },
    capacitor: { id: 'capacitor', n: 'Condensateur', ic: '🔋', r: 1, stats: { hpPct: 10 } },
    heatsink: { id: 'heatsink', n: 'Dissipateur', ic: '❄️', r: 1, stats: { dmg_thermal: 20, armor: 2 } },
    firewallchip: { id: 'firewallchip', n: 'Puce pare-feu', ic: '🔒', r: 1, stats: { thorns: 8 } },
    vpn: { id: 'vpn', n: 'VPN', ic: '🕶️', r: 1, stats: { dodge: 10 } },
    dhcp: { id: 'dhcp', n: 'Bail DHCP', ic: '🔄', r: 1, stats: { regen: 0.8 } },
    o3: { id: 'o3', n: 'Compilation -O3', ic: '🚀', r: 1, stats: { dmg: 12, cd: 5 } },
    debugger: { id: 'debugger', n: 'Débogueur', ic: '🐞', r: 1, stats: { crit: 8 } },
    overclock: { id: 'overclock', n: 'Overclock', ic: '🔥', r: 1, stats: { cd: 15, hpPct: -10 } },
    undervolt: { id: 'undervolt', n: 'Undervolt', ic: '🧊', r: 1, stats: { armor: 6, dmg: -5 } },
    shard: { id: 'shard', n: 'Sharding', ic: '🧩', r: 1, stats: { area: 20 } },
    signature: { id: 'signature', n: 'Signature antivirus', ic: '🧬', r: 1, stats: { statusChance: 25 } },
    incubator: { id: 'incubator', n: 'Incubateur', ic: '🥚', r: 1, stats: { xpGain: 25 } },
    lootbox: { id: 'lootbox', n: 'Lootbox', ic: '🎁', r: 1, stats: { luck: 20, goldGain: 15 } },
    macro: { id: 'macro', n: 'Macro', ic: '🤖', r: 1, stats: { cd: 10, statusChance: 15 } },
    autotune: { id: 'autotune', n: 'Auto-tune', ic: '🎚️', r: 1, stats: { dmg: 15, crit: 5 } },
    mirror: { id: 'mirror', n: 'Miroir de Kalandra', ic: '🪞', r: 1, stats: { luck: 25, dmg: 8 } },

    /* ---------- épiques / légendaires ---------- */
    cluster: { id: 'cluster', n: 'Cluster', ic: '🗂️', r: 2, stats: { count: 1, dmg: -8 } },
    quantum: { id: 'quantum', n: 'Processeur quantique', ic: '⚛️', r: 2, stats: { count: 1, dmg: 15 } },
    blackice: { id: 'blackice', n: 'Black Ice', ic: '🧊', r: 2, stats: { armor: 10, thorns: 14, speed: -6 } },
    ghost: { id: 'ghost', n: 'Processus fantôme', ic: '👻', r: 2, stats: { dodge: 15, speed: 8 } },
    rootkit: { id: 'rootkit', n: 'Rootkit', ic: '🕷️', r: 2, stats: { dmg: 30, hpPct: -20 } },
    bitcoin: { id: 'bitcoin', n: 'Mineur de cryptos', ic: '⛏️', r: 2, stats: { goldGain: 50, xpGain: -10 } },
    genesis: { id: 'genesis', n: 'Carte mère Genesis', ic: '🧿', r: 2, stats: { hpPct: 20, regen: 1.5 } },
    singularity: { id: 'singularity', n: 'Singularité miniature', ic: '🕳️', r: 3, stats: { area: 35, dmg: 22, hpPct: -15 } },
    sentience: { id: 'sentience', n: 'Éclat de conscience', ic: '✨', r: 3, stats: { dmg: 25, crit: 10, luck: 20 } },
    kernel: { id: 'kernel', n: 'Accès au noyau', ic: '🧠', r: 3, stats: { dmg: 30, cd: 10, hpPct: -10 } },
    gpuFarm: { id: 'gpuFarm', n: 'Ferme de GPU', ic: '🏭', r: 3, stats: { dmg_thermal: 40, dmg: 10, speed: -8 } }
  };
  NX.ITEMS = I;
  NX.ITEMK = Object.keys(I);
  NX.EVO_ITEMS = Object.keys(I).filter(k => I[k].evo);
})();
