# Serveur de comptes — NEXUS : Réveil

Serveur **sans dépendance** (Node 18+) pour :

- créer des comptes (mot de passe haché en PBKDF2-SHA256, 120 000 itérations),
- **sauvegarder la progression et la recharger depuis n'importe quel appareil**,
- un **classement global**.

## Lancer en local

```bash
node server/server.js
# → http://localhost:8787
```

Puis, dans `cloud-config.js` à la racine du jeu :

```js
window.NX_CLOUD = {
  backend: 'server',
  url: 'http://localhost:8787',
  game: 'nexus-reveil'
};
```

Recharge la page, va dans **Compte**, crée un compte. La progression se synchronise
automatiquement (sauvegarde différée de 2,5 s après chaque changement).

## Déployer en ligne (multi-appareils réel)

1. Héberge `server/server.js` où tu veux (VPS, Render, Railway, Fly.io, un Raspberry…).
2. Mets l'URL publique dans `cloud-config.js` (`url: 'https://mon-serveur.exemple'`).
3. C'est tout. Le fichier de données est `server/data.json` (sauvegarde-le de temps en temps).

> ⚠️ Pour un usage public, ajoute HTTPS (via un reverse-proxy type Caddy/Nginx) : les mots de
> passe et jetons circulent alors chiffrés.

## API

| Méthode | Route | Corps / En-têtes | Réponse |
|---|---|---|---|
| GET | `/api/ping` | — | `{ ok, game, users }` |
| POST | `/api/signup` | `{ name, pass, email }` | `{ token, user }` |
| POST | `/api/login` | `{ name, pass }` | `{ token, user }` |
| POST | `/api/save` | `{ profile }` + `X-NX-Token` | `{ ok }` |
| GET | `/api/load` | `X-NX-Token` | `{ profile }` |
| POST | `/api/score` | `{ name, cls, reached, score, time, nightmare }` | `{ ok }` |
| GET | `/api/board?game=` | — | `{ board: [...] }` |

## Alternative Firebase

Sans serveur à héberger, tu peux utiliser Firebase : mets `backend:'firebase'` et renseigne
`apiKey`/`projectId` dans `cloud-config.js` (mêmes étapes que dans *L'État Arcanique* :
Authentication e-mail/mot de passe + Firestore).
