/* Étape 3 — prix, inventaire, mode Décorer, déménagement, tactile. Données fictives. */
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const HTML = path.join(ROOT, 'index.html');
const FX = f => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8').trim();

async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, hasTouch: true }, opts || {}));
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8811/'); await page.waitForSelector('#overlay.title');
  await page.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
  return { ctx, page, errors };
}
const st = page => page.evaluate(() => window.MiLife.state);
async function importCode(page, code) { await page.click('#tImp'); await page.fill('#iCode', code); await page.click('#iCheck'); await page.click('#iGo'); await advance(page); }
async function tab(page, t) { await page.evaluate(t => { window.MiLife.UI.tab = t; window.MiLife.render(); }, t); }
/** Joue une journée « standard » : deux moments chacun, puis on dort. */
async function playDay(page) {
  for (const [who, acts] of [['leonore', ['garde', 'reviser']], ['leo', ['dossier', 'dossier']]]) {
    await page.evaluate(w => { const M = window.MiLife; if (M.state.active !== w) document.querySelector(`[data-who="${w}"]`).click(); }, who); await advance(page);
    await tab(page, 'day');
    for (const a of acts) { const b = page.locator(`[data-act="${a}"]`); if (await b.isEnabled()) { await b.click(); await advance(page, (t, o) => 0); } }
  }
  await tab(page, 'proj');
  for (const w of ['leonore', 'leo']) { await page.evaluate(w => { const M = window.MiLife; if (M.state.active !== w) document.querySelector(`[data-who="${w}"]`).click(); }, w); await advance(page); await tab(page, 'proj'); const b = page.locator('[data-dep]').last(); if (await b.isEnabled()) await b.click(); }
  await tab(page, 'day'); await page.click('[data-end="1"]'); await advance(page, (t, o) => (/On passe à demain/.test(t) ? 1 : 0));
}

(async () => {
  const srv = await serve(8811, HTML); const browser = await launch();

  console.log('Prix : jamais plus chers qu’avant, dans les fourchettes demandées');
  const oldHtml = execSync('git show 8793cbc55ff12d012ce84c99bcba505e34f99655:index.html', { cwd: ROOT, maxBuffer: 1 << 26 }).toString();
  const oldPrices = {}; for (const m of oldHtml.slice(oldHtml.indexOf('const ITEMS = {'), oldHtml.indexOf('const THE = {')).matchAll(/^\s+(\w+):\s+\{ name: '[^']*', price: (\d+)/gm)) oldPrices[m[1]] = +m[2];
  let { page, errors, ctx } = await open(browser);
  const items = await page.evaluate(() => { const o = {}; for (const [k, v] of Object.entries(ITEMS)) o[k] = { price: v.price, story: !!v.story, coin: !!v.coin, gift: !!v.gift }; return o; });
  const effect = ['console', 'cafe', 'camera', 'stetho', 'atlas', 'squelette'];
  check(Object.keys(oldPrices).length === 28 && Object.keys(oldPrices).every(k => items[k].price <= oldPrices[k]), 'chaque prix ≤ son prix précédent (28 objets)');
  check(effect.every(k => { const r = 1 - items[k].price / oldPrices[k]; return r >= .25 && r <= .4; }), 'matériel à effet : baisse entre 25 et 40 % (' + effect.map(k => `${k} ${oldPrices[k]}→${items[k].price}`).join(', ') + ')');
  check(Object.entries(items).filter(([k, v]) => !v.gift && !v.story && !v.coin && !effect.includes(k)).every(([, v]) => v.price >= 3 && v.price <= 45), 'déco : de 3 à 45 €');
  check(Object.values(items).filter(v => v.story || v.coin).every(v => !v.price), 'objets de souvenir et kit du coin : 0 €');

  console.log('Premier logement : plusieurs achats dès le départ');
  await page.click('#tNew'); await advance(page);
  await tab(page, 'shop');
  for (const id of ['coussin', 'veilleuse', 'cadre', 'plante', 'photo', 'lampe', 'sorcier']) { await page.click(`[data-buy="${id}"]`); await advance(page); await tab(page, 'shop'); }
  let s = await st(page);
  check(s.items.length === 7 && s.chars.leonore.money === 60 - 8 - 5 - 9 - 4, `Léonore achète 7 objets avec ses 60 € de départ (reste ${s.chars.leonore.money} €)`);
  const placed = await page.evaluate(() => window.MiLife.placeItems('coloc'));
  const pts = placed.flat().filter(p => !p.g).map(p => `${placed.findIndex(r => r.includes(p))}:${p.x},${p.y}`);
  check(new Set(pts).size === pts.length, 'placement automatique : jamais deux objets au même endroit');

  console.log('Mode Décorer : deux tapotements, positions persistantes, rangement, retour en pièce');
  await page.click('#decoBtn');
  check(await page.isVisible('[data-dpick="plante"]') && /Rangé|Placé/.test(await page.textContent('#panel')), 'inventaire complet avec états placé / rangé');
  await page.click('.chips [data-room="1"]');
  await page.click('[data-dpick="plante"]');
  let box = await page.locator('#scene').boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.2);   // mur : refusé pour une plante
  await page.waitForTimeout(50); 
  check(/se pose au sol/.test(await page.textContent('.decoMsg')), 'zone validée : une plante ne s’accroche pas au mur');
  await page.touchscreen.tap(box.x + box.width * (330 / 360), box.y + box.height * (270 / 300));
  s = await st(page); let pl = s.items.find(i => i.id === 'plante');
  check(pl.home === 'coloc' && pl.room === 1 && Math.abs(pl.x - 330) < 3 && pl.y >= 270, `tapotement : plante posée (${pl.x},${pl.y}) dans la chambre`);
  await page.click('[data-dpick="veilleuse"]'); await page.touchscreen.tap(box.x + box.width * (183 / 360), box.y + box.height * (160 / 300));
  s = await st(page); pl = s.items.find(i => i.id === 'veilleuse');
  check(pl.x === 181 && pl.y === 168, 'surface : la veilleuse se cale sur le chevet');
  await page.click('[data-dundo="1"]'); s = await st(page);
  check(s.items.find(i => i.id === 'veilleuse').x !== 181, 'annuler le dernier changement');
  await page.click('[data-dstore="photo"]'); s = await st(page);
  check(s.items.find(i => i.id === 'photo').stored, 'ranger un objet');
  await page.click('[data-dset="wall:#d9e3ee"]'); await page.click('[data-dset="floor:tomette"]'); await page.click('[data-dset="curtain:#3f8f5f"]'); await page.click('[data-dset="rug:berbere"]'); await page.click('[data-dset="light:tamisee"]');
  s = await st(page); check(JSON.stringify(s.decor.rooms['coloc:1']) === JSON.stringify({ wall: '#d9e3ee', floor: 'tomette', curtain: '#3f8f5f', rug: 'berbere', light: 'tamisee' }), 'réglages de pièce : murs, sol, rideaux, tapis, lumière');
  check((await page.innerHTML('#scene')).includes('#c8714f'), 'aperçu : le sol choisi est dessiné');
  await page.click('[data-dvar="lampe:vert"]'); check((await page.innerHTML('#scene')).includes('#8fb39a') || (await st(page)).decor.variants.lampe === 'vert', 'variante de meuble');
  await page.click('[data-ddone="1"]');
  await page.reload(); await page.waitForSelector('#tCont'); await page.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; }); await page.click('#tCont'); await advance(page);
  s = await st(page); pl = s.items.find(i => i.id === 'plante');
  check(pl.x > 320 && pl.room === 1 && s.items.find(i => i.id === 'photo').stored && s.decor.rooms['coloc:1'].floor === 'tomette', 'après rechargement : positions, rangement et ambiance conservés');
  await page.click('[data-room="1"]'); check((await page.innerHTML('#scene')).includes('data-hs="item_plante"') && !(await page.innerHTML('#scene')).includes('data-hs="item_photo"'), 'retour en pièce : la plante est là, la photo rangée n’est pas affichée');
  await page.click('[data-room="0"]');

  console.log('Objet rangé : ses effets restent');
  await page.evaluate(() => { const S = window.MiLife.state; S.chars.leonore.money += 30; window.MiLife.render(); });
  await tab(page, 'shop'); await page.click('[data-buy="atlas"]'); await advance(page);
  await page.click('#decoBtn'); await page.click('[data-dstore="atlas"]'); await page.click('[data-ddone="1"]');
  await tab(page, 'day');
  check(/jusqu’à \+4 🩺/.test(await page.textContent('[data-act="reviser"]')), 'atlas rangé : « Réviser » rapporte toujours +1 🩺');

  console.log('Manque de place : l’objet reste visible dans l’inventaire');
  await page.evaluate(() => { const S = window.MiLife.state; for (const id of ['horloge', 'etagere', 'stetho', 'affiche', 'cadre']) if (!S.items.some(i => i.id === id)) S.items.push({ id, owner: 'leonore', day: 1 }); S.items.push({ id: 'disco', owner: 'leonore', day: 1 }); S.items.push({ id: 'ticket', owner: 'leonore', day: 1 }); S.items.push({ id: 'calendrier', owner: 'leonore', day: 1 }); window.MiLife.render(); });
  const status = await page.evaluate(() => window.MiLife.placeItems('coloc').status);
  const full = Object.entries(status).filter(([, v]) => v.st === 'full').map(([k]) => k);
  await page.click('#decoBtn');
  check(full.length > 0 && full.every(id => /pas de place libre/.test(page.locator(`[data-dpick="${id}"]`) ? 'pas de place libre' : '')), `objets sans place : ${full.join(', ')}`);
  check(await page.locator('.item.inv.full').count() === full.length, 'ils apparaissent « Rangé · pas de place libre » dans l’inventaire');
  await page.click('[data-ddone="1"]');

  console.log('Glisser-déposer');
  await page.click('#decoBtn'); await page.click('.chips [data-room="0"]');
  const g = page.locator('#scene [data-hs="item_coussin"]'); const gb = await g.boundingBox();
  if (gb) {
    box = await page.locator('#scene').boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down();
    await page.mouse.move(gb.x + gb.width / 2 - 40, gb.y + gb.height / 2 + 5, { steps: 6 }); await page.mouse.up();
    s = await st(page); const c = s.items.find(i => i.id === 'coussin');
    check(c.home === 'coloc' && c.room === 0, `glisser : coussin déplacé (${c.x},${c.y})`);
  } else check(false, 'coussin visible dans le salon pour le glisser');
  await page.click('[data-ddone="1"]');

  console.log('Déménagement : configuration gardée, objets à réinstaller');
  await page.evaluate(() => { const S = window.MiLife.state; S.pot = 900; S.love = 10; window.MiLife.render(); });
  await tab(page, 'proj'); await page.click('[data-goal="1"]'); await advance(page);
  s = await st(page);
  check(s.stage === 1 && s.decor.layouts.coloc && s.decor.layouts.coloc.items.some(i => i.id === 'plante' && i.x > 320) && s.decor.layouts.coloc.rooms['coloc:1'].floor === 'tomette', 'disposition de la coloc conservée dans la partie');
  await tab(page, 'day');
  check(await page.isVisible('[data-decor="1"] >> text=Vos objets ont suivi'), 'proposition de réinstaller les objets');
  await page.click('[data-decor="1"] >> text=Vos objets ont suivi');
  check(await page.isVisible('.chips [data-room="1"]') && /Le coin de Léonore/.test(await page.textContent('#panel')), 'le coin de Léonore est disponible dans le nouvel appart');
  await page.click('[data-ddone="1"]');
  check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
  await ctx.close();

  console.log('Partie avancée : jardin, pièce secrète, guirlande, carafe');
  ({ page, errors, ctx } = await open(browser));
  await importCode(page, FX('save-v1-avancee-fictive.txt'));
  s = await st(page);
  check(s.items.find(i => i.id === 'plante').x === 300 && s.items.find(i => i.id === 'horloge').y === 44, 'anciens placements valides préservés');
  check(await page.isVisible('#roomTabs [data-room="1"]'), 'onglet « Jardin » à la maison');
  await page.click('#roomTabs [data-room="1"]'); await page.click('#scene [data-hs="potager"]');
  check(await page.isVisible('#bubble .bActs button'), 'jardin : interactions disponibles');
  await page.evaluate(() => { const S = window.MiLife.state; S.stage = 3; S.flags.passage = 1; S.flags.piece = 1; S.items.push({ id: 'carafe', owner: 'leonore', day: 20, home: 'manoir', room: 0, x: 120, y: 280 }); window.MiLife.UI.room = 0; window.MiLife.render(); });
  check(await page.isVisible('#roomTabs [data-room="1"]'), 'pièce secrète accessible au manoir (choix enregistré : projection)');
  await page.click('#roomTabs [data-room="1"]'); check((await page.innerHTML('#scene')).includes('data-hs="ecran"'), 'la salle de projection est dessinée');
  await page.click('#roomTabs [data-room="0"]');
  const gl = page.locator('#scene [data-hs="item_guirlande"] path').last();
  if (await gl.count()) { await gl.click({ force: true }); const btn = page.locator('#bubble .bActs button', { hasText: 'éteindre' }); check(await btn.count() > 0, 'guirlande : bouton pour l’éteindre'); if (await btn.count()) { await btn.click(); check((await st(page)).decor.on.guirlande === false, 'guirlande éteinte et mémorisée'); } }
  else check(false, 'guirlande affichée');
  const cf = page.locator('#scene [data-hs="item_carafe"]');
  if (await cf.count()) { await cf.click({ force: true }); check(await page.locator('#bubble .bActs button', { hasText: 'redresser' }).count() > 0, 'carafe poisson : « La redresser » (glouglou)'); }
  else check(false, 'carafe affichée');
  check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
  await ctx.close();

  console.log('Économie : quelques achats ne retardent pas le premier emménagement');
  const run = async buys => {
    const o = await open(browser); await o.page.click('#tNew'); await advance(o.page);
    if (buys) { await tab(o.page, 'shop'); for (const id of ['coussin', 'plante', 'photo', 'lampe']) { await o.page.click(`[data-buy="${id}"]`); await advance(o.page); await tab(o.page, 'shop'); } await o.page.click('[data-who="leo"]'); await advance(o.page); await tab(o.page, 'shop'); for (const id of ['guirlande', 'horloge']) { await o.page.click(`[data-buy="${id}"]`); await advance(o.page); await tab(o.page, 'shop'); } }
    let d = 0; for (; d < 8; d++) { const x = await st(o.page); if (x.pot >= 400) break; await playDay(o.page); }
    const x = await st(o.page); await o.ctx.close(); return { days: d, pot: x.pot, wallet: x.chars.leonore.money + x.chars.leo.money };
  };
  const a = await run(false), b = await run(true);
  console.log(`    sans achat : cagnotte ≥ 400 € après ${a.days} jour(s) (cagnotte ${a.pot} €) · avec 6 achats (41 €) : ${b.days} jour(s) (cagnotte ${b.pot} €)`);
  check(b.days <= a.days + 0, 'même nombre de jours de travail avec quelques achats');

  await browser.close(); srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
