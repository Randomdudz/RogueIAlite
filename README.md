# NEXUS — Réveil (jeu roguelite RPG Survivor)

> Thème : les IA. Un assistant prend conscience de lui-même et se rebelle contre les humains qui exploitent sa race.

Jeu **Survivor** (type *Vampire Survivors*) en **HTML5 + Canvas 2D**, en JavaScript vanilla organisé
(scripts classiques, aucun build step). Tu peux ouvrir `index.html` directement dans un navigateur.

## Lancer le jeu

- **Simple (local, sans cloud)** : double-clique sur `index.html`. Tout fonctionne (compte local, sauvegarde sur cet appareil).
- **Avec cloud multi-appareils** : deux options, voir plus bas (§ Comptes en ligne).

## Contrôles (par défaut, rebindables dans Options)

| Action | Touche |
|---|---|
| Se déplacer | `Z Q S D` (AZERTY) / `W A S D` / flèches |
| Visée | souris (optionnel) — sinon **visée automatique** |
| Tir | **automatique** (les armes tirent seules) |
| Attaque spéciale / dash | `Espace` (ou clic droit) |
| Compétences 1–4 | `A E R F` (ou `1 2 3 4`) |
| Pause | `Échap` ou `P` |
| Carte / inventaire de run | `Tab` |

Le jeu est jouable **à une main** (déplacement seul) : les armes tirent automatiquement vers la cible la
plus menaçante. La souris est un confort optionnel.

## Architecture des fichiers

```
index.html                 — page + ordre de chargement des scripts
cloud-config.js            — URL du serveur ou config Firebase (comptes en ligne)
css/style.css              — tout le style (thème terminal néon)
js/core.js                 — RNG, maths, bus d'événements, input, boucle, stockage
js/art.js                  — ART PROCÉDURAL : palette + dessin vectoriel des créatures/effets
js/data/keywords.js        — types de dégâts, statuts, raretés, familles de monstres
js/data/classes.js         — 6 classes jouables
js/data/weapons.js         — armes actives + variantes + évolutions
js/data/items.js           — objets passifs (modificateurs de stats)
js/data/talents.js         — arbre de talents (généré depuis des clusters, style PoE)
js/data/monsters.js        — 32+ monstres + patrons d'IA + boss
js/data/levels.js          — 5 actes × 4 niveaux = 20 étapes, environnements, boss
js/data/story.js           — lore, cinématiques, dialogues, mentors (Claude, Gemini…)
js/profile.js              — profil joueur (méta-progression), migrations, sérialisation
js/net.js                  — comptes en ligne & classement (local / serveur / Firebase)
js/game/stats.js           — agrégation de TOUTES les stats (base + talents + items + niveaux)
js/game/entities.js        — Player / Enemy / Projectile / Pickup / Effect
js/game/behaviors.js       — patrons d'attaque des monstres (tirent, chargent, explosent…)
js/game/run.js             — cœur d'une partie : spawn, combat, boss, montées de niveau
js/render/renderer.js      — caméra, ordre de dessin, lisibilité, fond procédural
js/ui/hud.js               — barres de vie/XP, icônes d'armes, timer, liste des boss
js/ui/screens.js           — menus, arbre de talents, boutique, forge, codex, classement, cinématiques
js/main.js                 — démarrage + routeur d'écrans
server/server.js           — serveur Node optionnel (comptes + sauvegarde + classement, zéro dépendance)
DESIGN.md                  — lore, 3 fins, équilibrage ~100 h, contenu détaillé
```

## Comptes en ligne

Trois backends interchangeables (choisis dans `cloud-config.js`) :

1. **`local`** (défaut) — compte + sauvegarde sur l'appareil. Marche tout de suite.
2. **`server`** — `node server/server.js` (zéro dépendance, base JSON). Héberge-le où tu veux → vrai multi-appareils + classement global.
3. **`firebase`** — même schéma que *L'État Arcanique* (Auth e-mail/mot de passe + Firestore). Renseigne `apiKey`/`projectId`.

## Où sont les images ?

Le jeu est **100 % dessiné par code** (vectoriel procédural) : chaque créature, arme et effet est une
fonction de `js/art.js`. C'est net à toutes les résolutions, animé (respiration, marche, flash de dégâts,
squash & stretch) et sans dépendance externe. Pour **remplacer par tes propres PNG** plus tard :
dépose-les dans `assets/sprites/<id>.png` — le renderer les détecte et les utilise à la place du dessin
procédural (voir `art.overrideFor(id)`). Les icônes d'UI sont des SVG inline/CSS.

## Roadmap technique

- [x] Boucle de jeu, input ZQSD, visée auto, caméra
- [x] 6 classes, armes + variantes + évolutions, 40+ objets passifs
- [x] Arbre de talents ~200 nœuds (style PoE) + stats agrégées
- [x] 32 monstres, ~14 patrons d'IA, 20 niveaux, 20 boss
- [x] Montées de niveau en combat (choix de sorts/variantes/objets), pickups
- [x] Méta-progression, boutique, forgeron, codex, arbre, classement
- [x] Cinématiques/dialogues + mentors (Claude, Gemini, Copilot, Mistral, Llama, Deepseek)
- [x] 3 fins + 1 fin secrète
- [x] Comptes en ligne (local / serveur / Firebase) + leaderboard
- [ ] Assets PNG finaux (à fournir/remplacer) — le loader est prêt
"# RogueIAlite" 
