/* Recette téléphone et hors ligne — données fictives uniquement. */
const fs = require('fs'), path = require('path');
const { devices } = require('playwright');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const HTML = path.join(ROOT, 'index.html'), PACK = path.join(__dirname, 'fixtures', 'paquet-fictif.json');
const OLD = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1-ancien-code.txt'), 'utf8').trim();
const fast = p => p.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
const st = p => p.evaluate(() => window.MiLife.state);

async function parcours(page, label) {
  await page.waitForSelector('#tImp'); await fast(page);
  await page.tap('#tImp'); await page.fill('#iCode', OLD); await page.tap('#iCheck'); await page.tap('#iGo'); await advance(page);
  await page.evaluate(() => { window.MiLife.UI.tab = 'album'; window.MiLife.render(); });
  await page.tap('[data-pack="1"]'); await page.setInputFiles('#pFile', PACK); await page.tap('#pGo'); await page.tap('#pBack');
  // le post-it d’origine non lu passe d’abord : on le lit, puis lendemain → épisode
  await page.evaluate(() => { window.MiLife.UI.tab = 'day'; window.MiLife.render(); });
  if (await page.isVisible('[data-readnote="auto"]')) { await page.tap('[data-readnote="auto"]'); await advance(page); }
  await page.clock.setSystemTime(new Date('2026-11-19T09:00:00'));
  await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.tap('#tCont'); await advance(page); await page.waitForTimeout(50);
  await page.evaluate(() => { window.MiLife.UI.tab = 'day'; window.MiLife.render(); });
  check(await page.isVisible('[data-surprise="1"]'), `${label} : surprise du jour visible`);
  await page.tap('[data-surprise="1"]'); await advance(page, (t, o) => (/couleur/.test(t) ? 1 : 0));
  // placer l’objet du souvenir au doigt, en deux tapotements
  await page.tap('#decoBtn'); await page.tap('.chips [data-room="1"]'); await page.tap('[data-dpick="sousbock"]');
  const b = await page.locator('#scene').boundingBox(); await page.touchscreen.tap(b.x + b.width * 262 / 360, b.y + b.height * 156 / 300);
  await page.tap('[data-ddone="1"]');
  await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.tap('#tCont'); await advance(page);
  const s = await st(page), it = s.items.find(i => i.id === 'sousbock');
  check(it && !it.stored && it.home === 'coloc' && it.room === 1 && it.x === 262, `${label} : objet posé et toujours là après rechargement`);
  check(s.daily.ep['test-parapluie'].read && s.memories.some(m => m.ref === 'pack:test-parapluie'), `${label} : souvenir et progression conservés`);
  check(s.items.some(i => i.id === 'plante' && i.x === 300), `${label} : l’ancienne partie est intacte (placements d’origine)`);
}

(async () => {
  const srv = await serve(8841, HTML); const browser = await launch();
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] }); await ctx.clock.install({ time: new Date('2026-11-18T09:00:00') });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8841/');
    console.log('iPhone 13 émulé (tactile)'); await parcours(page, 'iPhone');
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(!over, 'pas de défilement horizontal');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | ')); await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], offline: true }); await ctx.clock.install({ time: new Date('2026-11-18T09:00:00') });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + HTML);
    console.log('Hors ligne, fichier HTML ouvert en local (Pixel 7 émulé)'); await parcours(page, 'hors ligne');
    await page.evaluate(() => window.MiLife.Pack.remove()); await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.tap('#tCont'); await advance(page);
    check((await st(page)).daily.ep['test-parapluie'].read, 'hors ligne : partie chargée sans le paquet');
    await page.evaluate(() => { window.MiLife.UI.tab = 'album'; window.MiLife.render(); }); await page.tap('[data-pack="1"]'); await page.setInputFiles('#pFile', PACK); await page.tap('#pGo'); await page.tap('#pBack');
    check(/Le parapluie fictif/.test(await page.textContent('#panel')), 'hors ligne : paquet réinstallé indépendamment de la partie');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | ')); await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] }); await ctx.clock.install({ time: new Date('2026-11-18T09:00:00') });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8841/');
    console.log('iPhone 13 : contenu intégré, sans rien installer');
    await page.waitForSelector('#tImp'); await fast(page);
    await page.tap('#tImp'); await page.fill('#iCode', OLD); await page.tap('#iCheck'); await page.tap('#iGo'); await advance(page);
    const again = async d => { await page.clock.setSystemTime(new Date(d)); await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.tap('#tCont'); await advance(page); await page.waitForTimeout(50); await page.evaluate(() => { window.MiLife.UI.tab = 'day'; window.MiLife.render(); }); };
    await page.evaluate(() => { window.MiLife.UI.tab = 'day'; window.MiLife.render(); });
    if (await page.isVisible('[data-readnote="auto"]')) { await page.tap('[data-readnote="auto"]'); await advance(page); }
    await again('2026-11-19T09:00:00');
    check(/voisine/.test(await page.evaluate(() => window.MiLife.state.daily.unlocked.map(u => u.id).join())), 'épisode 1 intégré débloqué le lendemain');
    await page.tap('[data-surprise="1"]'); await advance(page);
    await again('2026-11-20T09:00:00'); await page.tap('[data-surprise="1"]'); await advance(page);
    let s = await st(page);
    check(s.items.some(i => i.id === 'sousbock' && i.stored), 'épisode 2 : le sous-bock arrive dans l’inventaire');
    await page.tap('#decoBtn'); await page.tap('.chips [data-room="1"]'); await page.tap('[data-dpick="sousbock"]');
    const b = await page.locator('#scene').boundingBox(); await page.touchscreen.tap(b.x + b.width * 181 / 360, b.y + b.height * 165 / 300);
    await page.tap('[data-ddone="1"]');
    await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.tap('#tCont'); await advance(page);
    s = await st(page); const it = s.items.find(i => i.id === 'sousbock');
    check(it.x === 181 && it.room === 1 && !it.stored, 'sous-bock posé sur le chevet, toujours là après rechargement');
    check(s.daily.ep.voisine.read && s.daily.ep.pinte.read && s.memories.some(m => m.ref === 'pack:pinte'), 'progression et souvenirs conservés');
    await page.evaluate(() => { window.MiLife.UI.tab = 'album'; window.MiLife.render(); });
    check(/Une pinte à 15/.test(await page.textContent('#panel')), 'souvenir relisible dans Souvenirs');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | ')); await ctx.close();
  }
  await browser.close(); srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
