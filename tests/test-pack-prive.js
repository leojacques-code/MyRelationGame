/* Joue un paquet de souvenirs RÉEL de bout en bout, sans jamais le copier dans le dépôt.
   Usage : MILIFE_PACK=/chemin/hors-depot/paquet.json node tests/test-pack-prive.js
   Sans MILIFE_PACK, la suite est ignorée. N'affiche aucun texte du paquet (titres exceptés). */
const fs = require('fs'), path = require('path');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const PACK = process.env.MILIFE_PACK;
if (!PACK || !fs.existsSync(PACK)) { console.log('MILIFE_PACK absent : suite ignorée.'); process.exit(0); }
if (path.resolve(PACK).startsWith(ROOT + path.sep)) { console.log('⚠️ Le paquet privé est dans le dépôt : déplace-le hors de ' + ROOT); process.exit(1); }
const ADV = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1-avancee-fictive.txt'), 'utf8').trim();
const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
const st = page => page.evaluate(() => window.MiLife.state);
const fast = page => page.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
async function reload(page) { await page.reload(); await page.waitForSelector('#tCont'); await fast(page); await page.click('#tCont'); await advance(page); await page.waitForTimeout(50); }
async function tab(page, t) { await page.evaluate(t => { window.MiLife.UI.tab = t; window.MiLife.render(); }, t); }
const day = n => new Date(Date.UTC(2026, 11, 1 + n, 8));

async function playAll(page, label, pickFn) {
  const seen = []; let bad = [];
  page.on('console', () => {});
  for (let n = 0; n < pack.episodes.length + 1; n++) {
    await page.clock.setSystemTime(day(n)); await reload(page);
    const s = await st(page), last = s.daily.unlocked[s.daily.unlocked.length - 1];
    if (!last || last.kind !== 'ep') break;
    await tab(page, 'day'); await page.click('[data-surprise="1"]');
    const lines = [];
    for (let k = 0; k < 300; k++) {
      const d = await page.evaluate(() => { const M = window.MiLife, d = M.UI.dlg; return d ? { text: d.text, opts: d.opts || null } : null; });
      if (d) lines.push(d.text, ...(d.opts || []));
      const before = lines.length; await advance(page, pickFn, 1); if (!d && !(await page.evaluate(() => window.MiLife.UI.busy))) break;
    }
    seen.push(last.id.slice(3));
    bad = bad.concat(lines.filter(t => /\{\w+(:[\w-]+)?\}|undefined|null|NaN/.test(t || '')).map(t => `${last.id}: ${String(t).slice(0, 40)}…`));
  }
  return { seen, bad };
}

(async () => {
  const srv = await serve(8831, path.join(ROOT, 'index.html')); const browser = await launch();
  console.log(`Paquet : « ${pack.title} » v${pack.version}, ${pack.episodes.length} épisodes`);

  for (const [label, setup, pick] of [
    ['partie neuve (deux apparts)', async p => { await p.click('#tNew'); await advance(p); }, (t, o) => 0],
    ['partie avancée (maison, spécialité choisie)', async p => { await p.click('#tImp'); await p.fill('#iCode', ADV); await p.click('#iCheck'); await p.click('#iGo'); await advance(p); }, (t, o) => (o.some(x => /Plus tard/.test(x)) ? 0 : o.length - 1)]
  ]) {
    console.log('— ' + label);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.clock.install({ time: day(0) });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8831/'); await page.waitForSelector('#tPack'); await fast(page);
    await page.click('#tPack'); await page.setInputFiles('#pFile', PACK); await page.waitForSelector('#pGo');
    const warn = await page.textContent('#pPrev'); await page.click('#pGo'); await page.click('#pBack');
    check(/14 épisodes/.test(warn), 'paquet valide, 14 épisodes');
    await setup(page);
    const s0 = await st(page); const mots0 = s0.counters.mots || 0;
    const r = await playAll(page, label, pick);
    const s = await st(page);
    check(r.seen.join() === pack.episodes.map(e => e.id).join(), 'les 14 épisodes, un par jour, dans l’ordre');
    check(pack.episodes.every(e => (s.daily.ep[e.id] || {}).read), 'tous marqués lus');
    const storyItems = [...new Set(JSON.stringify(pack.episodes).match(/"t": ?"item", ?"id": ?"(\w+)"/g).map(x => x.match(/"id": ?"(\w+)"/)[1]))];
    check(storyItems.every(id => s.items.filter(i => i.id === id).length === 1), `objets d’histoire obtenus une seule fois (${storyItems.length})`);
    check(s.memories.filter(m => m.ref).length === pack.episodes.length + 1, 'un souvenir par épisode (un épisode en a deux)');
    check(!r.bad.length, 'aucun texte avec gabarit non résolu ' + r.bad.join(' | '));
    check(s.counters.mots === Math.min(9, mots0 + 1) && s.daily.unlocked[s.daily.unlocked.length - 1].kind === 'mot', `après le dernier épisode, les post-its d’origine reprennent (compteur ${mots0} → ${s.counters.mots})`);
    await tab(page, 'album'); const alb = await page.textContent('#panel');
    check(pack.episodes.every(e => alb.includes(e.title.replace(/ /g, ' ')) || alb.includes(e.title)), 'tous les épisodes relisibles dans Souvenirs');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
