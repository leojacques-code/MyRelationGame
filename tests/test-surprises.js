/* Étape 2 — mécanique des surprises (contenu intégré désactivé), simulation de dates, paquet fictif. */
const fs = require('fs'), path = require('path');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const HTML = path.join(ROOT, 'index.html');
const PACK = path.join(__dirname, 'fixtures', 'paquet-fictif.json'), PACK2 = path.join(__dirname, 'fixtures', 'paquet-fictif-v2.json');
const ADV = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1-avancee-fictive.txt'), 'utf8').trim();
const at = s => new Date(s);
const st = page => page.evaluate(() => window.MiLife.state);
const fast = page => page.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
async function reload(page) { await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.click('#tCont'); await advance(page); await page.waitForTimeout(50); }
async function tab(page, t) { await page.evaluate(t => { window.MiLife.UI.tab = t; window.MiLife.render(); }, t); }
async function installPack(page, file) {
  await tab(page, 'album'); await page.click('[data-pack="1"]'); await page.setInputFiles('#pFile', file);
  await page.waitForSelector('#pGo'); const prev = await page.textContent('#pPrev'); await page.click('#pGo'); await page.click('#pBack'); return prev;
}
const unlocked = s => s.daily.unlocked.map(u => u.id).join(',');

(async () => {
  const srv = await serve(8821, HTML); const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.clock.install({ time: at('2026-11-18T10:00:00') });
  await ctx.addInitScript(() => { window.MILIFE_NO_BUNDLE = true; });   // ici on teste la mécanique sans le contenu intégré
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8821/'); await page.waitForSelector('#overlay.title'); await fast(page);

  console.log('Sans paquet : les post-its d’origine, un par jour réel');
  await page.click('#tNew'); await advance(page); await page.waitForTimeout(50);
  let s = await st(page);
  check(unlocked(s) === 'mot:0' && s.counters.mots === 1, 'jour 1 : premier post-it distribué');
  await tab(page, 'day'); check(await page.isVisible('[data-readnote="auto"]'), 'entrée « La surprise du jour » dans Journée');
  await reload(page); s = await st(page);
  check(unlocked(s) === 'mot:0', 'même jour + rechargement : rien de nouveau');
  await page.evaluate(() => { const S = window.MiLife.state; S.notes.push({ from: 'leo', text: 'post-it manuel fictif', ts: Date.now(), day: S.day, read: false }); window.MiLife.Save.write(S, 't'); });
  await tab(page, 'day'); await page.click('[data-readnote="auto"]'); await advance(page);
  s = await st(page); check(s.notes.find(n => n.auto).read && !s.notes.find(n => !n.auto).read, 'lecture du post-it marquée ; le post-it manuel reste en attente');
  await page.clock.setSystemTime(at('2026-11-19T09:00:00')); await reload(page); s = await st(page);
  check(unlocked(s) === 'mot:0,mot:1' && s.counters.mots === 2, 'lendemain : post-it suivant, même avec un post-it manuel en attente');
  await page.clock.setSystemTime(at('2026-11-23T09:00:00')); await reload(page); s = await st(page);
  check(unlocked(s) === 'mot:0,mot:1', 'retour après 4 jours avec la surprise non lue : pas d’empilement');
  await tab(page, 'day'); await page.click('[data-readnote="auto"]'); await advance(page);
  await page.clock.setSystemTime(at('2026-11-23T23:59:20')); await page.clock.fastForward('02:00'); await page.waitForTimeout(100);
  s = await st(page); check(unlocked(s) === 'mot:0,mot:1,mot:2', 'onglet laissé ouvert à minuit : la surprise arrive');

  console.log('Paquet fictif : installation, épisodes, report, objets, souvenirs');
  await tab(page, 'day'); await page.click('[data-readnote="auto"]'); await advance(page);
  const prev = await installPack(page, PACK);
  check(/3 épisodes/.test(prev), 'aperçu du paquet avant installation');
  s = await st(page); check(unlocked(s) === 'mot:0,mot:1,mot:2', 'installation le même jour : pas de deuxième surprise');
  await page.clock.setSystemTime(at('2026-11-25T08:00:00')); await reload(page); s = await st(page);
  check(unlocked(s).endsWith('ep:test-parapluie') && s.counters.mots === 3, 'avec le paquet : l’épisode 1 passe avant les post-its (compteur intact)');
  await tab(page, 'day'); await page.click('[data-surprise="1"]');
  await advance(page, (t, o) => (o.some(x => /Plus tard/.test(x)) ? 1 : 0));
  s = await st(page); check(!(s.daily.ep['test-parapluie'] || {}).read, '« Plus tard » : l’épisode attend');
  await page.clock.setSystemTime(at('2026-11-26T08:00:00')); await reload(page); s = await st(page);
  check(unlocked(s).split(',').length === 4 && await page.isVisible('[data-surprise="1"]'), 'épisode en attente : toujours là le lendemain, rien d’autre');
  await page.click('[data-surprise="1"]');
  let quizTries = 0;
  await advance(page, (t, o) => { if (/couleur/.test(t)) return quizTries++ === 0 ? 0 : o.indexOf('Rouge'); return 0; });
  s = await st(page); const e1 = s.daily.ep['test-parapluie'];
  check(e1.read && e1.answers.reaction === 'rire' && quizTries === 2, 'épisode lu, réponse gardée, mauvaise réponse ⇒ indice puis bonne réponse');
  check(s.items.filter(i => i.id === 'sousbock').length === 1 && s.items.find(i => i.id === 'sousbock').stored, 'objet du souvenir : dans l’inventaire, à placer');
  check(s.memories.filter(m => m.ref === 'pack:test-parapluie').length === 1 && !s.memories.find(m => m.ref).text, 'souvenir enregistré par référence (texte resté dans le paquet)');
  await tab(page, 'album'); await page.click('[data-replay="test-parapluie"]'); await advance(page, (t, o) => (/couleur/.test(t) ? o.length - 1 : 0));
  s = await st(page); check(s.items.filter(i => i.id === 'sousbock').length === 1 && s.memories.filter(m => m.ref === 'pack:test-parapluie').length === 1 && s.daily.ep['test-parapluie'].answers.reaction === 'rire', 'relecture depuis Souvenirs : pas de doublon, première réponse conservée');

  console.log('Objet du souvenir dans le décor, rechargement');
  await page.click('#decoBtn'); await page.click('.chips [data-room="1"]'); await page.click('[data-dpick="sousbock"]');
  const box = await page.locator('#scene').boundingBox(); await page.touchscreen.tap(box.x + box.width * 181 / 360, box.y + box.height * 165 / 300);
  await page.click('[data-ddone="1"]'); await reload(page); s = await st(page);
  const sb = s.items.find(i => i.id === 'sousbock');
  check(sb.x === 181 && sb.room === 1 && !sb.stored && s.daily.ep['test-parapluie'].read && s.memories.some(m => m.ref === 'pack:test-parapluie'), 'objet posé, souvenir et progression présents après rechargement');
  await tab(page, 'album'); check(/Le parapluie fictif/.test(await page.textContent('#panel')), 'souvenir lisible dans l’album');

  console.log('Mot du jour, choix précédents, passage rapide');
  await page.clock.setSystemTime(at('2026-11-27T08:00:00')); await reload(page); s = await st(page);
  check(unlocked(s).endsWith('ep:test-mot'), 'épisode suivant le lendemain');
  await tab(page, 'day'); await page.click('[data-surprise="1"]');
  await advance(page, (t, o) => 0, 3);   // accroche + « Maintenant »
  const skip = page.locator('.skipBtn'); if (await skip.count()) await skip.click();
  await advance(page);
  s = await st(page); check(s.daily.ep['test-mot'].read, 'épisode avec mot du jour : souvenir révélé après les essais');
  const log = await page.evaluate(() => window.MiLife.UI.log.map(d => d.text).join(' | '));
  check(/Tu avais ri/.test(log), 'rappel d’un choix précédent');
  const w = await page.evaluate(async () => { const a = await window.MiLife.Mini.motus(); const b = await window.MiLife.Mini.motus(); return [a.word, b.word]; });
  check(w[0] === w[1], `arcade : le mot du jour reste le même dans la journée (${w[0]})`);

  console.log('Mise à jour du paquet, puis reprise des post-its après le dernier épisode');
  const prev2 = await installPack(page, PACK2);
  check(/4 épisodes/.test(prev2) && /2 déjà lus, conservés/.test(prev2), 'version enrichie : épisodes lus conservés');
  for (const [d, exp] of [['2026-11-28', 'ep:test-lettre'], ['2026-11-29', 'ep:test-bonus'], ['2026-11-30', 'mot:3']]) {
    await page.clock.setSystemTime(at(d + 'T08:00:00')); await reload(page); s = await st(page);
    check(unlocked(s).endsWith(exp), `${d} : ${exp}`);
    await tab(page, 'day');
    if (exp.startsWith('ep')) { await page.click('[data-surprise="1"]'); await advance(page); }
    else { await page.click('[data-readnote="auto"]'); await advance(page); }
  }
  s = await st(page); check(s.counters.mots === 4, 'post-its repris là où le compteur s’était arrêté');

  console.log('Paquet absent, puis réinstallé');
  await tab(page, 'album'); await page.click('[data-pack="1"]'); await page.click('#pDel'); await page.click('#pDel'); await page.click('#pBack');
  await reload(page); await tab(page, 'album');
  let txt = await page.textContent('#panel');
  check(/Un souvenir privé/.test(txt) && !/Le parapluie fictif/.test(txt), 'sans paquet : la partie charge, les souvenirs privés sont masqués');
  await installPack(page, PACK2); await tab(page, 'album'); txt = await page.textContent('#panel');
  check(/Le parapluie fictif/.test(txt) && (await st(page)).daily.ep['test-parapluie'].read, 'paquet réinstallé : souvenirs et progression de retour');

  console.log('Rappel d’anniversaire (une fois par an)');
  await page.clock.setSystemTime(at('2027-03-14T08:00:00')); await reload(page); await tab(page, 'day');
  check(await page.isVisible('[data-anniv="1"]'), 'rappel du 14 mars (date fictive)');
  await page.click('[data-anniv="1"]'); await advance(page); await reload(page); await tab(page, 'day');
  check(!(await page.isVisible('[data-anniv="1"]')), 'pas de doublon après lecture et rechargement');
  check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
  await ctx.close();

  console.log('Ancienne partie avancée : la même suite, depuis le présent');
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await c2.clock.install({ time: at('2026-11-18T10:00:00') }); await c2.addInitScript(() => { window.MILIFE_NO_BUNDLE = true; });
  const p2 = await c2.newPage(); const err2 = []; p2.on('pageerror', e => err2.push(e.message));
  await p2.goto('http://127.0.0.1:8821/'); await p2.waitForSelector('#tImp'); await fast(p2);
  await p2.click('#tPack'); await p2.setInputFiles('#pFile', PACK); await p2.click('#pGo'); await p2.click('#pBack');
  await p2.click('#tImp'); await p2.fill('#iCode', ADV); await p2.click('#iCheck'); await p2.click('#iGo'); await advance(p2); await p2.waitForTimeout(50);
  s = await st(p2);
  check(unlocked(s) === 'ep:test-parapluie' && s.counters.mots === 4, 'partie avancée : premier épisode débloqué, compteur des post-its intact');
  await tab(p2, 'day'); await p2.click('[data-surprise="1"]');
  const first = await p2.evaluate(() => window.MiLife.UI.dlg && window.MiLife.UI.dlg.text);
  check(/En rangeant La maison/.test(first || ''), 'accroche adaptée au logement actuel (« ' + first + ' »)');
  await advance(p2);
  await p2.clock.setSystemTime(at('2026-11-19T10:00:00')); await reload(p2);
  await tab(p2, 'day'); await p2.click('[data-surprise="1"]'); await advance(p2);
  s = await st(p2); const lg = await p2.evaluate(() => window.MiLife.UI.log.map(d => d.text).join(' | '));
  check(/Spécialité choisie dans la partie : pédiatrie/.test(lg), 'futur fictionnel : la spécialité déjà choisie est reprise');
  check(!err2.length, 'aucune erreur JS ' + err2.join(' | '));

  await browser.close(); srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
