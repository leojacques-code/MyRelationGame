/* Outils de test Mi Life — aucune dépendance hors Playwright (préinstallé).
   Toutes les données utilisées ici sont fictives. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');

/** Petit serveur statique : sert `file` à la racine, et le reste du dossier `dir`. */
function serve(port, file, dir) {
  dir = dir || ROOT;
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const p = u === '/' ? file : path.join(dir, u);
    if (!p.startsWith(dir) && p !== file) { res.writeHead(403); return res.end(); }
    fs.readFile(p, (e, buf) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

/** Fait avancer les dialogues en cours : `pickFn(text, opts)` choisit l'option (0 par défaut). */
async function advance(page, pickFn, max) {
  for (let n = 0; n < (max || 400); n++) {
    const st = await page.evaluate(() => {
      const M = window.MiLife; if (!M) return { busy: false };
      const d = M.UI.dlg;
      return { busy: M.UI.busy, dlg: d ? { text: d.text, opts: d.opts || null, input: d.input !== undefined } : null, ov: (document.querySelector('#overlay') || {}).className || '' };
    });
    if (/daycard/.test(st.ov)) { await page.click('#overlay'); continue; }
    if (/credits/.test(st.ov)) { await page.click('#crGo'); continue; }
    if (/letter/.test(st.ov)) { await page.click('#ltGo'); continue; }
    if (/tapm/.test(st.ov)) { await page.click('#tapSkip'); continue; }
    if (!st.dlg) { if (!st.busy) return; await page.waitForTimeout(30); continue; }
    if (st.dlg.opts) {
      const i = pickFn ? pickFn(st.dlg.text, st.dlg.opts) : 0;
      await page.evaluate(() => { window.MiLife.UI.dlgAt = 0; });
      await page.locator('.opt').nth(i).click();
    } else if (st.dlg.input) {
      await page.evaluate(() => { window.MiLife.UI.dlgAt = 0; });
      await page.click('#dlgOk');
    } else {
      await page.evaluate(() => { window.MiLife.UI.dlgAt = 0; });
      await page.click('#dlg');
    }
  }
  if (max) return;
  throw new Error('advance: trop d’étapes');
}

async function launch(opts) {
  const browser = await chromium.launch();
  return browser;
}

let failures = 0, passes = 0;
function check(cond, msg) {
  if (cond) { passes++; console.log('  ✔ ' + msg); }
  else { failures++; console.log('  ✘ ' + msg); }
}
function summary() { console.log(`\n${passes} vérifications réussies, ${failures} échec(s).`); return failures; }

module.exports = { ROOT, serve, advance, launch, check, summary };
