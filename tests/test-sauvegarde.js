/* Étape 1 — reprise d'anciennes parties, import validé, secours, deux origines, file://.
   Données 100 % fictives (fixtures générées par l'ancien moteur). */
const fs = require('fs'), path = require('path');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const FX = f => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8').trim();
const HTML = path.join(ROOT, 'index.html');

async function fresh(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.waitForSelector('#overlay.title');
  await page.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
  return { ctx, page, errors };
}
async function importViaTitle(page, code) {
  await page.click('#tImp'); await page.fill('#iCode', code); await page.click('#iCheck');
}
const stored = page => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('milife.save.v1')); delete s.meta.rev; delete s.meta.updatedAt; delete s.meta.lastReason; return JSON.stringify(s); });

(async () => {
  const s1 = await serve(8801, HTML), s2 = await serve(8802, HTML);
  const browser = await launch();
  const OLD = FX('save-v1-ancien-code.txt'), ADV = FX('save-v1-avancee-fictive.txt');

  console.log('Import d’une sauvegarde de l’ancien code');
  let { page, errors, ctx } = await fresh(browser, 'http://127.0.0.1:8801/');
  check(await page.isVisible('#tImp'), 'bouton « Importer une partie » sur l’écran titre');
  await importViaTitle(page, OLD);
  check(/jour 2 · deux apparts/.test(await page.textContent('#iPrev')), 'aperçu : jour et logement du code importé');
  await page.click('#iGo'); await advance(page);
  let st = await page.evaluate(() => window.MiLife.state);
  check(st.meta.version === 2 && st.meta.migratedFrom === 1, 'migration v1 → v2 enregistrée');
  check(st.items.map(i => i.id).join() === 'plante,photo,cafe,guirlande', 'objets et ordre conservés');
  const pl = st.items.find(i => i.id === 'plante');
  check(pl.home === 'coloc' && pl.room === 1 && pl.x === 300 && pl.y === 270, 'placement manuel conservé');
  check(st.flags.wall_coloc === '#dde7da', 'couleur de mur conservée');
  check(st.seen.intro && st.seen.wish && st.seen.leoIntro, 'scènes jouées conservées');
  check(st.counters.mots === 1 && st.notes.length === 1, 'compteur des post-its et message existant respectés (post-it non lu ⇒ pas de nouveau)');
  check(st.daily && Array.isArray(st.daily.unlocked) && st.decor && st.decor.rooms, 'nouveaux champs par défaut');
  const again = await page.evaluate(() => { const S = window.MiLife.state, a = JSON.stringify(S); const b = JSON.stringify(window.MiLife.Save.migrate(JSON.parse(a))); return a === b; });
  check(again, 'migration idempotente');
  check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));

  console.log('Codes invalides : la partie en cours reste intacte');
  await page.evaluate(() => { window.MiLife.UI.tab = 'proj'; window.MiLife.render(); }); await page.click('[data-settings="1"]');
  const before = await stored(page);
  for (const [label, code] of [['JSON null', 'null'], ['code corrompu', 'MILIFE1.eyJtZXRhIjp7InZlcn'], ['caractères', 'MILIFE1.@@@'], ['vide', ''],
    ['version future', 'MILIFE1.' + Buffer.from(JSON.stringify({ meta: { version: 99 }, day: 1, stage: 0, chars: { leonore: { money: 1 }, leo: { money: 1 } } })).toString('base64')],
    ['schéma incompatible', 'MILIFE1.' + Buffer.from(JSON.stringify({ meta: { version: 1 }, day: 'x', stage: 9 })).toString('base64')],
    ['pas une partie', '{"hello":1}']]) {
    await page.click('#sImp'); await page.fill('#iCode', code); await page.click('#iCheck');
    const msg = await page.textContent('#iMsg');
    const now = await stored(page); if (now !== before) { const A = JSON.parse(before), B = JSON.parse(now); for (const k in A) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) console.log('    diff', k, JSON.stringify(A[k]).slice(0, 160), '→', JSON.stringify(B[k]).slice(0, 160)); }
    const vis = await page.isVisible('#iGo'), same = (await stored(page)) === before;
    check(msg.length > 5 && !vis && same, `${label} refusé : « ${msg} »` + (vis ? ' [bouton visible]' : '') + (same ? '' : ' [stockage modifié]'));
    await page.click('#iBack');
  }
  await page.click('#sClose');

  console.log('Remplacement valide avec secours et restauration');
  await page.evaluate(() => { window.MiLife.UI.tab = 'proj'; window.MiLife.render(); }); await page.click('[data-settings="1"]');
  await page.click('#sImp'); await page.fill('#iCode', ADV); await page.click('#iCheck');
  const prevTxt = await page.textContent('#iPrev');
  check(/jour 23 · la maison/.test(prevTxt) && /jour 2 · deux apparts/.test(prevTxt), 'aperçu : code importé ET partie remplacée');
  check(await page.isVisible('#iCopyCur') && await page.isVisible('#iDlCur'), 'possibilité de sauvegarder la partie actuelle avant');
  await page.click('#iGo'); await advance(page);
  st = await page.evaluate(() => window.MiLife.state);
  check(st.day === 23 && st.stage === 2, 'partie avancée chargée');
  check(st.kids[0].name === 'Gosiot' && /Gosiot/.test(st.memories[1].title), '« Gosio » devient « Gosiot »');
  check(st.notes.find(n => !n.read && !n.auto), 'post-it manuel en attente conservé');
  await page.reload(); await page.waitForSelector('#tRest');
  check(/jour 2 · deux apparts/.test(await page.textContent('#tRest')), 'copie de secours proposée à l’écran titre');
  await page.click('#tRest'); await page.click('#rGo'); await advance(page);
  st = await page.evaluate(() => window.MiLife.state);
  check(st.day === 2 && st.items.length === 4, 'restauration de la partie précédente');
  await page.reload(); await page.waitForSelector('#tRest');
  check(/jour 23/.test(await page.textContent('#tRest')), 'la partie remplacée devient à son tour la copie de secours');
  await ctx.close();

  console.log('Export / import entre deux origines');
  const A = await fresh(browser, 'http://127.0.0.1:8801/');
  await importViaTitle(A.page, OLD); await A.page.click('#iGo'); await advance(A.page);
  await A.page.click('[data-act="dossier"]'); await advance(A.page);
  await A.page.evaluate(() => { window.MiLife.UI.tab = 'proj'; window.MiLife.render(); }); await A.page.click('[data-settings="1"]');
  const code = await A.page.inputValue('#sCode'); const stA = await A.page.evaluate(() => window.MiLife.state);
  const B = await fresh(browser, 'http://127.0.0.1:8802/');
  check(!(await B.page.isVisible('#tCont')), 'origine 2 : aucune partie (stockage séparé)');
  await importViaTitle(B.page, code); await B.page.click('#iGo'); await advance(B.page);
  const stB = await B.page.evaluate(() => window.MiLife.state);
  check(stB.meta.gameId === stA.meta.gameId && stB.day === stA.day && JSON.stringify(stB.items) === JSON.stringify(stA.items), 'même partie reprise sur l’autre origine');
  await B.page.reload(); await B.page.waitForSelector('#tCont');
  check(/jour 2/.test(await B.page.textContent('#tCont')), 'reprise après rechargement sur l’origine 2');
  await A.ctx.close(); await B.ctx.close();

  console.log('Ouverture du HTML en local (file://) et échec de stockage');
  const F = await fresh(browser, 'file://' + HTML);
  await F.page.click('#tNew'); await advance(F.page);
  check((await F.page.evaluate(() => window.MiLife.state.day)) === 1 && !F.errors.length, 'partie neuve en file:// sans erreur');
  await F.page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await F.page.click('[data-act="reviser"]'); await advance(F.page);
  check(await F.page.isVisible('.warnTip'), 'échec de stockage signalé clairement dans Journée');
  await F.ctx.close();

  await browser.close(); s1.close(); s2.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
