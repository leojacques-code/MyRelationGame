/* Non-régression des points relevés en relecture. Données fictives. */
const fs = require('fs'), path = require('path');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const HTML = path.join(ROOT, 'index.html');
const PACK = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'paquet-fictif.json'), 'utf8'));
const fast = p => p.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
const st = p => p.evaluate(() => window.MiLife.state);
const b64 = o => 'MILIFE1.' + Buffer.from(JSON.stringify(o)).toString('base64');

(async () => {
  const srv = await serve(8851, HTML); const browser = await launch();
  const open = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => { errors.push('dialog:' + d.message()); d.dismiss(); }); return { ctx, page, errors }; };

  console.log('Partie locale illisible : jamais écrasée en silence');
  let { ctx, page, errors } = await open();
  await page.goto('http://127.0.0.1:8851/'); await page.waitForSelector('#tNew');
  const future = { meta: { version: 3, gameId: 'gfutur' }, day: 40, stage: 1, chars: { leonore: { money: 1 }, leo: { money: 2 } } };
  await page.evaluate(r => localStorage.setItem('milife.save.v1', r), JSON.stringify(future));
  await page.reload(); await page.waitForSelector('#tNew');
  check(/ne peut pas la lire/.test(await page.textContent('#overlay')) && await page.isVisible('#tRaw'), 'message clair + « Copier la partie illisible »');
  await page.click('#tNew');
  check(/gfutur/.test(await page.evaluate(() => localStorage.getItem('milife.save.v1'))), 'premier clic sur « Commencer » : rien n’est écrit');
  await fast(page); await page.click('#tNew'); await advance(page);
  check(/gfutur/.test(await page.evaluate(() => localStorage.getItem('milife.save.v1.corrupt'))), 'deuxième clic : la partie illisible est mise de côté avant la nouvelle');
  await ctx.close();

  console.log('Copie de secours impossible : confirmation supplémentaire');
  ({ ctx, page, errors } = await open());
  await page.goto('http://127.0.0.1:8851/'); await page.waitForSelector('#tNew'); await fast(page);
  await page.click('#tNew'); await advance(page);
  await page.evaluate(() => { const S = window.MiLife.state; S.day = 77; window.MiLife.Save.write(S, 't'); const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'milife.save.v1.backup') throw new DOMException('q', 'QuotaExceededError'); return o.call(this, k, v); }; });
  await page.evaluate(() => window.MiLife.render()); await page.evaluate(() => { window.MiLife.UI.tab = 'proj'; window.MiLife.render(); }); await page.click('[data-settings="1"]'); await page.click('#sTitle');
  await page.click('#tNew'); await page.click('#tNew');
  check((await st(page)).day === 77 && /Copie de secours impossible/.test(await page.textContent('#tNew')), 'nouvelle partie bloquée tant que la copie n’a pas pu être faite');
  await ctx.close();

  console.log('Contenus hostiles : aucun script exécuté');
  ({ ctx, page, errors } = await open());
  await page.goto('http://127.0.0.1:8851/'); await page.waitForSelector('#tImp'); await fast(page);
  await page.click('#tImp'); await page.fill('#iCode', b64({ meta: { version: 1 }, day: 3, stage: 0, love: '<img src=x onerror=alert(1)>', chars: { leonore: { money: 1 }, leo: { money: 1 } } })); await page.click('#iCheck');
  check(/invalide/.test(await page.textContent('#iMsg')) && !errors.some(e => e.startsWith('dialog')), 'code avec « love » piégé refusé');
  await page.click('#iBack'); await page.click('#tNew'); await advance(page);
  const evil = JSON.parse(JSON.stringify(PACK)); evil.id = 'piege'; evil.episodes[0].memory.icon = '<img src=x onerror=alert(2)>';
  const bad = await page.evaluate(p => { try { window.MiLife.Pack.parse(JSON.stringify(p)); return 'accepté'; } catch (e) { return e.message; } }, (() => { const q = JSON.parse(JSON.stringify(PACK)); q.episodes[0].steps.unshift({ t: 'say', who: 'constructor', text: 'x' }); return q; })());
  check(/personnage inconnu/.test(bad), 'paquet avec personnage « constructor » refusé');
  const bad2 = await page.evaluate(p => { try { window.MiLife.Pack.parse(JSON.stringify(p)); return 'accepté'; } catch (e) { return e.message; } }, (() => { const q = JSON.parse(JSON.stringify(PACK)); q.episodes[0].steps.unshift({ t: 'scene', home: 'coloc', room: 3 }); return q; })());
  check(/pièce invalide/.test(bad2), 'scène vers une pièce inexistante refusée');
  const bad3 = await page.evaluate(p => { try { window.MiLife.Pack.parse(JSON.stringify(p)); return 'accepté'; } catch (e) { return e.message; } }, (() => { const q = JSON.parse(JSON.stringify(PACK)); q.anniversaries = [null]; return q; })());
  check(/Rappel 1/.test(bad3), 'rappel d’anniversaire abîmé refusé');
  await page.evaluate(p => { window.MiLife.Pack.install(p); const S = window.MiLife.state; S.memories.push({ day: 1, icon: '🔒', ref: 'pack:test-parapluie', title: '', text: '' }); window.MiLife.UI.tab = 'album'; window.MiLife.render(); }, evil);
  await page.waitForTimeout(200);
  check(!errors.some(e => e.startsWith('dialog')) && (await page.innerHTML('#panel')).includes('&lt;img'), 'icône piégée affichée comme texte dans l’album');
  await ctx.close();

  console.log('Épisodes robustes : choix vide, reprise sans doublon');
  ({ ctx, page, errors } = await open());
  await page.goto('http://127.0.0.1:8851/'); await page.waitForSelector('#tNew'); await fast(page);
  await page.click('#tNew'); await advance(page);
  const p2 = JSON.parse(JSON.stringify(PACK)); p2.id = 'robuste';
  p2.episodes[0].steps = [{ t: 'love', n: 2 }, { t: 'incident', text: 'Incident fictif unique.' },
    { t: 'choice', prompt: 'Rien ?', options: [{ label: 'A', cond: { flag: 'jamais' } }, { label: 'B', cond: { flag: 'jamais' } }] },
    { t: 'narr', text: 'Après le choix vide.' }, { t: 'memory', icon: '☂️' }];
  await page.evaluate(p => { window.MiLife.Pack.install(p); const S = window.MiLife.state; S.daily.unlocked.push({ id: 'ep:test-parapluie', day: 'x', kind: 'ep' }); const e = S.daily.ep['test-parapluie'] = { answers: {}, items: {}, plays: 0, done: { 'love:2': 1, 'incident:Incident fictif unique.': 1 } }; window.MiLife.render(); }, p2);
  const before = await st(page);
  await page.evaluate(() => { window.MiLife.UI.tab = 'day'; window.MiLife.render(); }); await page.click('[data-surprise="1"]'); await advance(page);
  const after = await st(page);
  check(after.daily.ep['test-parapluie'].read, 'choix sans option disponible : l’épisode se termine quand même');
  check(after.love === before.love && after.registre.length === before.registre.length, 'complicité et incident pas rejoués après une interruption');
  check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
  await ctx.close();

  console.log('Décor : étagère haute, changement de personnage, guirlande');
  ({ ctx, page, errors } = await open());
  await page.goto('http://127.0.0.1:8851/'); await page.waitForSelector('#tNew'); await fast(page);
  await page.click('#tNew'); await advance(page);
  await page.evaluate(() => { const S = window.MiLife.state; S.items.push({ id: 'etagere', owner: 'leonore', day: 1, home: 'coloc', room: 1, x: 120, y: 40 }, { id: 'veilleuse', owner: 'leonore', day: 1, stored: true }, { id: 'guirlande', owner: 'leonore', day: 1, stored: true }); window.MiLife.render(); });
  await page.click('#decoBtn'); await page.click('.chips [data-room="1"]'); await page.click('[data-dpick="veilleuse"]');
  let box = await page.locator('#scene').boundingBox(); await page.mouse.click(box.x + box.width * 132 / 360, box.y + box.height * 46 / 300);
  let s = await st(page), v = s.items.find(i => i.id === 'veilleuse');
  const stv = await page.evaluate(() => window.MiLife.placeItems('coloc').status.veilleuse);
  check(v.x === 132 && v.y === 46 && stv.st === 'placed' && stv.room === 1 && !stv.auto, 'objet posé sur une étagère haute : il y reste');
  await page.click('[data-dout="guirlande"]'); s = await st(page); const g = s.items.find(i => i.id === 'guirlande');
  check(g.x === 180 && g.y === 0 && !g.stored, 'guirlande ressortie : position valide');
  await page.click('[data-who="leo"]');
  check(!(await page.evaluate(() => window.MiLife.UI.decor)) && (await st(page)).active === 'leo', 'changer de personnage referme le mode Décorer');
  check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
  await ctx.close();

  await browser.close(); srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
