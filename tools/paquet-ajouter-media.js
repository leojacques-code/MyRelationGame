#!/usr/bin/env node
/* Ajoute un média (vocal .m4a/.mp3, photo .jpg/.png) à un paquet de souvenirs Mi Life.
   Le média est intégré dans le JSON (data URI) : le paquet reste un seul fichier, lisible hors ligne.
   Usage : node tools/paquet-ajouter-media.js <paquet.json> <identifiant> <fichier> [sortie.json]
   Exemple : node tools/paquet-ajouter-media.js ~/prive/paquet-v1.json vocal-tempete ~/prive/vocal.m4a
   Le fichier de sortie (par défaut : même nom, version +1) est à installer via 📦 dans le jeu.
   Un vrai vocal reste hors du dépôt (fichiers audio ignorés par .gitignore). */
const fs = require('fs'), path = require('path');
const [, , packPath, id, mediaPath, outArg] = process.argv;
if (!packPath || !id || !mediaPath) { console.error('Usage : node tools/paquet-ajouter-media.js <paquet.json> <identifiant> <fichier> [sortie.json]'); process.exit(1); }
const repo = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const ext = path.extname(mediaPath).toLowerCase().slice(1);
const mime = { m4a: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac', ogg: 'audio/ogg', wav: 'audio/wav', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext];
if (!mime) { console.error('Format non pris en charge : ' + ext); process.exit(1); }
const buf = fs.readFileSync(mediaPath);
if (buf.length > 3.5e6) console.warn('⚠️ Média lourd (' + Math.round(buf.length / 1e6) + ' Mo) : le navigateur risque de ne pas garder le paquet installé. Compresse-le si possible.');
pack.media = pack.media || {};
pack.media[id] = `data:${mime};base64,${buf.toString('base64')}`;
pack.version = (pack.version || 1) + 1;
const out = path.resolve(outArg || packPath.replace(/(-v\d+)?\.json$/, `-v${pack.version}.json`));
if (out.startsWith(repo + path.sep)) { console.error('Refusé : la sortie est dans le dépôt Git public (' + out + '). Choisis un dossier privé.'); process.exit(1); }
fs.writeFileSync(out, JSON.stringify(pack));
console.log(`Média « ${id} » ajouté → ${out} (version ${pack.version}, ${Math.round(fs.statSync(out).size / 1024)} Ko)`);
