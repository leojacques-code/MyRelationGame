/* Le vrai parcours de mise à jour, avec des parties fictives :
   1. même adresse, même profil navigateur : ancienne version → on ferme → nouvelle version → Continuer
   2. partie avancée (objets placés, décor personnalisé, messages lus), même parcours
   3. sauvegarde abîmée : jamais écrasée, récupération proposée
   4. transfert par code MILIFE1 : ancien HTML local → nouveau HTML local, et → adresse web (type Vercel) */
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), { execSync } = require('child_process');
const { chromium } = require('playwright');
const { ROOT, advance, check, summary } = require('./lib');
const NEW = path.join(ROOT, 'index.html');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'milife-maj-'));
const OLD = path.join(tmp, 'ancien', 'index.html'); fs.mkdirSync(path.dirname(OLD));
fs.writeFileSync(OLD, execSync('git show 8793cbc55ff12d012ce84c99bcba505e34f99655:index.html', { cwd: ROOT, maxBuffer: 1 << 26 }));
const NEWCOPY = path.join(tmp, 'nouveau', 'mi-life.html'); fs.mkdirSync(path.dirname(NEWCOPY)); fs.copyFileSync(NEW, NEWCOPY);
const ADV = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1-avancee-fictive.txt'), 'utf8').trim();

let current = OLD;   // le fichier servi à « l'adresse habituelle »
const srv = http.createServer((q, r) => { if (q.url.split('?')[0] !== '/') { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(fs.readFileSync(current)); });
const fast = p => p.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
const KEEP = ['day', 'stage', 'active', 'pot', 'love', 'items', 'firstItem', 'flags', 'seen', 'memories', 'registre', 'notes', 'kids', 'pets', 'outfits', 'regNo'];
const keep = s => { const o = {}; for (const k of KEEP) o[k] = s[k]; o.money = [s.chars.leonore.money, s.chars.leo.money]; o.gameId = s.meta.gameId; o.mots = s.counters.mots; return JSON.stringify(o); };
const tab = (p, t) => p.evaluate(t => { window.MiLife.UI.tab = t; window.MiLife.render(); }, t);

async function profile() { const dir = fs.mkdtempSync(path.join(tmp, 'profil-')); return chromium.launchPersistentContext(dir, { viewport: { width: 390, height: 844 }, hasTouch: true }); }

(async () => {
  await new Promise(r => srv.listen(8861, '127.0.0.1', r));

  console.log('1. Même adresse, même profil : ancienne version → nouvelle version');
  {
    current = OLD; const ctx = await profile(); let page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8861/'); await fast(page);
    await page.click('#tNew'); await advance(page);
    await tab(page, 'shop'); await page.click('[data-buy="plante"]'); await advance(page); await tab(page, 'shop'); await page.click('[data-buy="photo"]'); await advance(page);
    await tab(page, 'day'); await page.click('[data-readnote="1"]'); await advance(page);
    await page.click('[data-act="reviser"]'); await advance(page);
    await page.click('[data-end="1"]'); await advance(page, (t) => (/On passe à demain/.test(t) ? 1 : 0));
    // déplacer la plante comme dans l'ancien jeu : toucher l'objet, « Déplacer », toucher un endroit
    await page.evaluate(() => { const S = window.MiLife.state; const r = S.items.find(i => i.id === 'plante'); r.home = 'coloc'; r.room = 0; r.x = 330; r.y = 280; S.flags.wall_coloc = '#f0d6c4'; window.MiLife.Save.write(S, 'fictif'); });
    const before = await page.evaluate(() => window.MiLife.state);
    await page.close();
    current = NEW; page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8861/'); await page.waitForSelector('#tCont');
    check(new RegExp(`jour ${before.day} · deux apparts`).test(await page.textContent('#tCont')), `écran titre : « Continuer · jour ${before.day} · deux apparts »`);
    await fast(page); await page.click('#tCont'); await advance(page); await page.waitForTimeout(100);
    const after = await page.evaluate(() => window.MiLife.state);
    check(keep(after) === keep(before), 'jour, logement, soldes, cagnotte, choix, scènes, objets, placements, décor, post-its, souvenirs : identiques');
    check(after.meta.version === 2 && after.meta.migratedFrom === 1, 'migrée en v2');
    await tab(page, 'day');
    check(await page.isVisible('[data-surprise="1"]'), 'la première surprise intégrée l’attend dans Journée');
    await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.click('#tCont'); await advance(page);
    check(keep(await page.evaluate(() => window.MiLife.state)) === keep(after), 'rechargement : rien ne bouge (migration rejouable)');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
    await ctx.close();
  }

  console.log('2. Partie avancée (objets placés, décor, messages lus) : même parcours');
  {
    current = OLD; const ctx = await profile(); let page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8861/'); await fast(page);
    await page.click('#tNew'); await advance(page);
    await tab(page, 'proj'); await page.click('[data-settings="1"]'); await page.click('#sImp'); await page.fill('#sCode', ADV); await page.click('#sImp');
    await page.evaluate(() => { const S = window.MiLife.state; S.flags.wall_maison = '#d9e3ee'; S.flags.teckelAcc = 3; window.MiLife.Save.write(S, 'fictif'); });
    const before = await page.evaluate(() => window.MiLife.state);
    check(before.day === 23 && before.stage === 2, 'ancienne version : partie avancée chargée');
    await page.close();
    current = NEW; page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8861/'); await page.waitForSelector('#tCont'); await fast(page); await page.click('#tCont'); await advance(page); await page.waitForTimeout(100);
    const after = await page.evaluate(() => window.MiLife.state);
    const b2 = JSON.parse(keep(before)), a2 = JSON.parse(keep(after));
    check(JSON.stringify(a2.items) === JSON.stringify(b2.items) && a2.flags.wall_maison === '#d9e3ee' && a2.flags.teckelAcc === 3, 'objets placés et décor personnalisé conservés');
    check(JSON.stringify(a2.notes) === JSON.stringify(b2.notes) && a2.mots === 4, 'messages lus et post-it en attente conservés, compteur intact');
    check(a2.kids[0].name === 'Gosiot' && a2.day === 23 && a2.pot >= b2.pot && JSON.stringify(a2.money) === JSON.stringify(b2.money), 'jour, soldes, famille (« Gosio » → « Gosiot »), cagnotte au moins égale (cadeau du jour en plus)');
    const st = await page.evaluate(() => window.MiLife.placeItems('maison').status);
    check(st.plante.st === 'placed' && st.horloge.st === 'placed', 'les objets placés à la main sont toujours à leur place');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
    await ctx.close();
  }

  console.log('3. Sauvegarde abîmée : jamais remplacée par une partie vide');
  {
    current = NEW; const ctx = await profile(); const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8861/'); await page.waitForSelector('#tNew');
    const raw = '{"meta":{"version":1,"gameId":"gabime"},"day":12,"stage":0,"chars":{"leonore":{"money":';
    await page.evaluate(r => localStorage.setItem('milife.save.v1', r), raw); await page.reload(); await page.waitForSelector('#tNew');
    check(await page.isVisible('#tRaw') && !(await page.isVisible('#tCont')), 'message de récupération et bouton « Copier la partie illisible »');
    await page.reload(); await page.waitForSelector('#tNew');
    check(await page.evaluate(r => localStorage.getItem('milife.save.v1') === r && localStorage.getItem('milife.save.v1.corrupt') === r, raw), 'la sauvegarde d’origine reste en place (et une copie est gardée)');
    await ctx.close();
  }

  console.log('4. Transfert par code MILIFE1 : ancien HTML local → nouveau HTML local / adresse web');
  {
    const browser = await chromium.launch();
    let ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); let page = await ctx.newPage();
    await page.goto('file://' + OLD); await fast(page); await page.click('#tNew'); await advance(page);
    await tab(page, 'shop'); await page.click('[data-buy="lampe"]'); await advance(page);
    const before = await page.evaluate(() => window.MiLife.state);
    await tab(page, 'proj'); await page.click('[data-settings="1"]'); const code = await page.inputValue('#sCode');
    check(code.startsWith('MILIFE1.'), 'ancien HTML : code MILIFE1 récupéré dans les réglages');
    await page.close();
    page = await ctx.newPage(); await page.goto('file://' + NEWCOPY); await page.waitForSelector('#tCont');
    check(/jour 1/.test(await page.textContent('#tCont')), 'nouveau HTML dans le même navigateur : la partie locale est retrouvée directement');
    await ctx.close();
    for (const [label, url] of [['nouveau HTML local, autre navigateur', 'file://' + NEWCOPY], ['adresse web (type Vercel)', 'http://127.0.0.1:8861/']]) {
      current = NEW; ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(url); await page.waitForSelector('#tImp'); await fast(page);
      check(!(await page.isVisible('#tCont')), `${label} : aucune partie au départ`);
      await page.click('#tImp'); await page.fill('#iCode', code); await page.click('#iCheck');
      check(/jour 1 · deux apparts/.test(await page.textContent('#iPrev')), `${label} : aperçu du code`);
      await page.click('#iGo'); await advance(page);
      const after = await page.evaluate(() => window.MiLife.state);
      check(keep(after) === keep(before), `${label} : partie identique après import`);
      check(!errors.length, 'aucune erreur JS ' + errors.join(' | ')); await ctx.close();
    }
    await browser.close();
  }
  srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
