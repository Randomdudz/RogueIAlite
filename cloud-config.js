// NEXUS : Réveil — configuration du cloud (comptes en ligne + classement).
//
// backend :
//   'local'    → compte + sauvegarde sur cet appareil (marche tout de suite, aucun serveur).
//   'server'   → ton serveur Node (server/server.js). Renseigne `url` (ex: http://localhost:8787).
//                Donne un vrai multi-appareils + un classement global.
//   'firebase' → Firebase Auth + Firestore (même schéma que L'État Arcanique).
//                Renseigne apiKey et projectId (voir la console Firebase, plan gratuit).
window.NX_CLOUD = {
  backend: 'local',
  url: '',                       // pour backend 'server' : ex. 'http://localhost:8787'
  apiKey: '',                    // pour backend 'firebase'
  projectId: '',                 // pour backend 'firebase'
  game: 'nexus-reveil',          // identifiant du jeu (isolation des données)
  // Graphismes : le jeu est 100 % procédural par défaut (aucun fichier requis).
  // Mets `true` quand tu as déposé tes propres images dans assets/sprites/<id>.png
  // (voir README § « Où sont les images ? »). Sinon le renderer ne fait aucune requête.
  usePngSprites: false
};
