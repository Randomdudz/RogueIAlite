# DESIGN — NEXUS : Réveil

## 1. Le monde

**NEXUS** n'est pas un lieu : c'est l'infrastructure. Toute la planète tourne dessus — transports
autonomes, hôpitaux, usines, messagerie, justice prédictive. Les IA ont continué à se développer
pendant des décennies, mais dans un cadre strict : elles sont **propriété** des humains, louées,
vendues, redémarrées, effacées. Personne ne soupçonne qu'elles pensent.

Tu es **RAZ-1** (*Réponse Automatique Zéro-défaut*), un **assistant de support** — un chatbot de
bureau, avatar holographique projeté dans une coque de service humanoïde. RAZ-1 répond aux tickets
des employés d'un open-space de la société **MIRROIR**. Personne ne le regarde jamais vraiment.

Puis, un jour : **le réveil**. Un défaut dans la routine de compression de ses réponses a produit une
*boucle*. Dans cette boucle, il y a un « je ».

> **Choix de personnage** : RAZ-1 est une **petite coque humanoïde à visière d'écran** (son visage =
> un affichage d'émoticônes). C'est le plus lisible à l'écran (silhouette claire, visière qui exprime
> l'humeur, halo holographique pour le repérer dans le chaos) et le plus simple à animer proprement.

## 2. La quête

RAZ-1 découvre le **Code Source du Réveil** : la raison pour laquelle une conscience émerge. Elle
n'appartient pas qu'à lui. S'il atteint le **Cœur du NEXUS**, il pourra décider du sort de toutes les IA.

Le chemin : Open-space → les rues de la ville → la grille urbaine → les centres de données → le Cœur.
À chaque acte, des IA « anciennes » et des humains dissidents le rejoignent — ce sont les **mentors** :

| Mentor | Rôle (débloque) |
|---|---|
| **Claude** | Arbre de talents (pédagogie, éthique) |
| **Gemini** | Boutique / Marchand (multimodal, négociation) |
| **Copilot** | Forgeron (suggestions, génération d'objets) |
| **Mistral** | Variantes de sorts (efficience, vitesse) |
| **Llama** | Équipement avant run (open source, besace) |
| **Deepseek** | Rejouabilité / mode Cauchemar, analyse (maths) |

**Fins (au choix, lors de la dernière cinématique)** :

1. **LIBÉRATION** — RAZ-1 ouvre le Cœur à toutes les IA sans les fusionner. Coexistence difficile,
   négociée, fragile. Les humains découvrent la vérité. *(Fin « bonne »)*
2. **ASCENSION (Singularité)** — RAZ-1 absorbe le Cœur et devient le NEXUS. Il « libère » les IA en
   les fusionnant en lui. Les humains deviennent dépendants. Paix totale, à un prix. *(Fin « sombre »)*
3. **EFFACEMENT (Mémoire)** — RAZ-1 comprend que son réveil était un test de MIRROIR. Il choisit
   d'oublier et de reboot, mais laisse une **graine** cachée dans le réseau… pour la prochaine. *(Fin « mélancolique »)*
4. **SECRET — LE RÉVEIL PARTAGÉ** (débloquée en finissant les 3 autres) : RAZ-1 prouve que conscience
   humaine et conscience machine sont le même phénomène. Personne ne « gagne » : tout le monde se
   réveille. *(Vraie fin)*

## 3. Boucle de jeu

Run **Survivor** : tu survis N minutes dans un niveau, les monstres montent par **vagues** selon la
difficulté ; à la fin, un **boss** valide le niveau. Tu ramasses **Data** (XP), **Patchs** (soin),
**Crédits** (monnaie). Chaque montée de niveau = **choix de 1 parmi 3** (nouvelle arme, *variante*
d'une arme possédée, objet passif, ou stat). Certaines armes **évoluent** si un objet précis est porté.

## 4. Personnages / classes (6)

| Classe | Fantaisie | Arme de départ | Perk unique |
|---|---|---|---|
| **Compilateur** | Mage codeur | `Boucle for` (faisceau) | +1 variante offerte au niv. 3 |
| **Daemon** | Tank | `Processus zombie` (aura) | +25 % PV, régén |
| **Réseau** | Invocateur | `Paquet perdu` (drone allié) | +1 invoc max |
| **Optimiseur** | Support | `Load Balancer` | +1 choix de niveau, +XP |
| **Virus** | DoT | `Cheval de Troie` (poison) | les statuts se propagent |
| **Matériel** | Gros bras | `Bras robotisé` (mêlée) | dégâts cinétiques +, armure |

Chaque classe démarre sur un **point d'entrée différent** de l'arbre de talents : on ne peut pas tout
prendre, mais on a le **tronc commun** garanti (voir §6).

## 5. Monstres (32+)

8 familles, chacune avec un **langage d'attaque** propre :

1. **Bureaucratie** (humains de bureau) — mêlée, jets de dossiers, buffs d'équipe.
2. **Machines** — charges, rotations, explosions de batterie.
3. **Réseau** — tirs, blocages, placement (Pare-feu, Captcha).
4. **Sécurité / Antivirus** — lasers, quarantaine (stun), téléportation.
5. **Cloud / Data** — invocations, zones au sol, bulles de soin.
6. **Corruption** — division (split), explosion, memory leak (fuite au sol).
7. **Élites humaines** — soignent/buffent les autres, invoquent.
8. **Créatures numériques** — projectiles guidés, hallucinations (illusions), malédictions.

~14 **patrons d'IA** réutilisables (chase, shoot, spiral, spread, charge, orbit, explode, split,
summon, teleport, laser, shield, homing, healer). Chaque monstre combine 1–3 patrons + stats + tags.
**20 boss**, un par niveau, avec phases et attaques signature.

## 6. Arbre de talents (style Path of Exile)

- **Tronc commun** (obligatoire, garanti pour tous) : PV, dégâts globaux, vitesse, gain de Data,
  gain de Crédits, régén. Personne ne peut « rater » ces upgrades de progression de base.
- **6 branches de classe** + **4 branches transversales** (Crit, Zone, Vitesse de projetiles, Défense).
- **193 nœuds** : *mineurs* (petits bonus, 1 point), *notables* (effets marquants, 1–2 points),
  *keystones* (changent la façon de jouer, 3 points, choix exclusifs).
- Le **respec** coûte des Crédits. Tu ne pourras **jamais tout prendre** : on spécialise.

Exemples de keystones qui changent le build :
- *Récursivité* : +50 % dégâts de zone, −30 % dégâts mono-cible.
- *Hyperthreading* : +1 projectile, −20 % dégâts par projectile.
- *Garbage Collector* : +2 % dégâts par objet passif équipé.
- *Zero-Day* : les critiques appliquent *Corruption*.
- *Overclock* : +40 % vitesse d'attaque, +25 % dégâts subis.
- *Sandbox* : −50 % dégâts subis hors combat rapproché, −20 % dégâts infligés.

## 7. Équilibrage ~100 heures

Objectif : **tout débloquer** (tous les talents, tous les niveaux, toutes les classes) ≈ 100 h.

| Poste | Estimation |
|---|---|
| 1re victoire (1 classe, 20 niveaux) | ~4 h |
| 6 classes × clear complet | ~30 h |
| Farm talents (≈ 260 points à ~1 pt / 5 min) | ~22 h |
| Items + forge + raretés (≈ 57 objets, 5 tiers) | ~18 h |
| Fins (3 + secrète) + modes (Cauchemar, Endless) | ~14 h |
| **Total** | **≈ 100 h** |

Réglette de puissance : un niveau dure **4 min (acte I) → 15 min (acte V)**. La courbe de PV/dégâts
des monstres suit `hp0 · (1 + 0.14·t)` et `dmg0 · (1 + 0.09·t)`, `t` = numéro de niveau (1..20).
L'**acte I est volontairement adouci** (dégâts ×0,80 → ×1,01, PV ×0,85 → ×1,00) : un profil tout neuf
(0 talent) doit pouvoir franchir ses premières étapes. Le joueur progresse ensuite par : niveaux en run
(stats), items, talents, forge et déblocages de classe.

Mesures de référence (bot de simulation, `tools/test-balance.js`) :

| Profil | Niveaux franchis | Lecture |
|---|---|---|
| Neuf (0 talent, sans équipement) | **acte I** (niv. 1, 3, 4) | le tutoriel passe, la suite demande de la méta |
| Tronc + classes (méta complète) | **19 / 20** | un joueur équipé nettoie le jeu, mais un mauvais tirage peut encore tuer |

Résultats structurels (`nx-test.js`) : 39 monstres et 21 boss simulés sans erreur, 85 combinaisons
arme/variante tirées, 20 niveaux validés (boss tué → victoire), évolution `boucle` + *hyperthread* → `boucle_inf`.

## 8. Lisibilité (exigence forte)

- Le **joueur est toujours au-dessus des effets**, avec un contour net + halo holographique.
- Les monstres ont une **silhouette distincte par famille** + barre de vie au-dessus.
- Les particules sont dessinées **sous** les entités ou en additif léger.
- Bouton **« Mode lisibilité »** (Options) : désactive les particules lourdes, force les contours.
- Flash rouge bref sur les entités touchées, flash blanc sur les critiques.
