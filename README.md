# Mi Life

Un jeu de vie à deux, dans un seul fichier `index.html`. Il marche en ligne et hors ligne
(ouvert directement depuis le téléphone ou l’ordinateur), sauvegarde tout seul dans le navigateur.

## Sauvegardes

- Clé locale : `milife.save.v1` (inchangée). Schéma actuel : v2, migré automatiquement et sans perte
  depuis les anciennes parties.
- Une partie se transporte avec son code `MILIFE1.…` : **Projets › ⚙️ Sauvegarde et réglages ›
  Copier le code** (ou Télécharger), puis **Importer une partie** sur l’écran titre de l’autre version.
- Le code est vérifié avant toute écriture ; une copie de secours de la partie remplacée est gardée
  (bouton « Restaurer la partie précédente » sur l’écran titre).
- Le stockage dépend de l’adresse **et** du navigateur : même URL + même navigateur = reprise directe.
  Autre adresse, Preview, autre appareil, fichier HTML ouvert localement ou icône « écran d’accueil »
  d’iPhone (qui a son propre stockage) : passer par le code.

## Paquet de souvenirs (contenu privé)

Le dépôt est public. Les histoires personnelles n’y sont **pas** : elles arrivent dans un fichier JSON
choisi par la joueuse (**écran titre › 📦 Installer mes souvenirs**, ou Souvenirs › 📦), gardé dans le
navigateur séparément de la partie. La progression est rangée dans la partie par identifiants
d’épisode : réinstaller le même paquet ou une version enrichie conserve ce qui a été lu et obtenu.

Exemple complet et fictif : `tests/fixtures/paquet-fictif.json`. Format :

```json
{ "format": "milife.pack", "schema": 1, "id": "mon-paquet", "version": 1, "title": "…",
  "items": { "sousbock": { "name": "…", "desc": "…" } },
  "anniversaries": [{ "id": "…", "m": 1, "d": 5, "label": "…", "steps": [ … ] }],
  "media": { "vocal": "data:audio/mp4;base64,…" },
  "episodes": [{ "id": "…", "title": "…", "icon": "🎁", "hook": [ … ], "steps": [ … ],
                 "memory": { "icon": "…", "title": "…", "text": "…" } }] }
```

Étapes disponibles : `narr`, `say`, `sms` (texto), `scene`, `choice` (avec `key` pour garder la
réponse, `keep: "history"` pour les scènes rejouables), `stage` (`early` aux deux apparts, `later`
ensuite), `if` (`cond`: `flag`, `answer`+`from`, `stageMin`, `read`), `recall`, `quiz` (énigme à choix,
jamais bloquante), `motus` (mot du jour fixe), `tap`, `letter` (avec `audio` facultatif), `photo`,
`item` (objet d’histoire, une seule fois), `memory`, `love`, `incident`, `sfx`. Gabarits :
`{nickL}`, `{nickO}`, `{home}`, `{specialty}`, `{answer:clé}`.

Ajouter un vocal ou une photo (le fichier produit doit rester hors du dépôt) :

```bash
node tools/paquet-ajouter-media.js /chemin/prive/paquet.json vocal-tempete /chemin/prive/vocal.m4a
```

## Surprises du jour

Au plus une nouvelle surprise par jour réel (date locale de l’appareil, indépendante du calendrier du
jeu) : les épisodes du paquet dans l’ordre, puis les post-its d’origine (`MOTS_LEO`, compteur
`counters.mots`). Une surprise non lue attend son tour : rien ne s’empile.

## Tests

Chromium et Playwright doivent être disponibles (`require('playwright')`). Toutes les données des
tests sont fictives ; les fixtures de sauvegarde ont été produites par l’ancien moteur
(`tests/make-old-save.js`).

```bash
node tests/run-all.js
```

Pour jouer aussi un paquet réel de bout en bout, sans le copier dans le dépôt :

```bash
MILIFE_PACK=/chemin/prive/paquet.json node tests/test-pack-prive.js
```
