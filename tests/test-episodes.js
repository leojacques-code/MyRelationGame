/* Les 14 épisodes intégrés « Les petites choses », joués de bout en bout sans rien installer :
   partie neuve et partie avancée (fictive), un par jour réel, objets, souvenirs, reprise des post-its. */
const fs = require('fs'), path = require('path');
const { ROOT, serve, advance, launch, check, summary } = require('./lib');
const ADV = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1-avancee-fictive.txt'), 'utf8').trim();
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pack = JSON.parse(src.slice(src.indexOf('const CONTENU_INTEGRE = ') + 24, src.indexOf(';\n/* </contenu> */')).replace(/<\\\//g, '</'));
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
    check(await page.evaluate(() => window.MiLife.Pack.isBundled && window.MiLife.Pack.get().episodes.length === 14), 'contenu intégré présent sans rien installer (14 épisodes)');
    await setup(page);
    const s0 = await st(page); const mots0 = s0.counters.mots || 0;
    const r = await playAll(page, label, pick);
    const s = await st(page);
    check(r.seen.join() === pack.episodes.map(e => e.id).join(), 'les 14 épisodes, un par jour, dans l’ordre');
    check(pack.episodes.every(e => (s.daily.ep[e.id] || {}).read), 'tous marqués lus');
    const storyItems = []; (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.t === 'item' && !storyItems.includes(o.id)) storyItems.push(o.id); Object.values(o).forEach(walk); } })(pack.episodes);
    check(storyItems.every(id => s.items.filter(i => i.id === id).length === 1), `objets d’histoire obtenus une seule fois (${storyItems.length})`);
    check(s.memories.filter(m => m.ref).length === pack.episodes.length + 1, 'un souvenir par épisode (un épisode en a deux)');
    check(!r.bad.length, 'aucun texte avec gabarit non résolu ' + r.bad.join(' | '));
    check(s.counters.mots === Math.min(9, mots0 + 1) && s.daily.unlocked[s.daily.unlocked.length - 1].kind === 'mot', `après le dernier épisode, les post-its d’origine reprennent (compteur ${mots0} → ${s.counters.mots})`);
    await tab(page, 'album'); const alb = await page.textContent('#panel');
    check(pack.episodes.every(e => alb.includes(e.title.replace(/ /g, ' ')) || alb.includes(e.title)), 'tous les épisodes relisibles dans Souvenirs');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | '));
    await ctx.close();
  }
  console.log('— paquet v1 déjà importé à la main (même identifiants) : rien en double');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await ctx.clock.install({ time: day(0) });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8831/'); await page.waitForSelector('#tNew'); await fast(page);
    await page.evaluate(p => { const v1 = JSON.parse(JSON.stringify(p)); v1.version = 1; localStorage.setItem('milife.pack.v1', JSON.stringify(v1)); }, pack);
    await page.reload(); await page.waitForSelector('#tNew'); await fast(page);
    check(await page.evaluate(() => window.MiLife.Pack.isBundled), 'un paquet stocké plus ancien est remplacé par le contenu intégré');
    await page.click('#tNew'); await advance(page);
    await page.evaluate(() => { const S = window.MiLife.state; for (const id of ['voisine', 'pinte']) { if (!S.daily.unlocked.some(u => u.id === 'ep:' + id)) S.daily.unlocked.push({ id: 'ep:' + id, day: '2026-11-30', kind: 'ep' }); S.daily.ep[id] = { read: true, answers: {}, items: id === 'pinte' ? { sousbock: '2026-11-30' } : {}, plays: 1 }; S.memories.push({ day: 1, icon: '🍺', ref: 'pack:' + id, title: '', text: '' }); } S.items.push({ id: 'sousbock', owner: 'leonore', day: 1, stored: true }); S.daily.lastDay = '2026-11-30'; window.MiLife.Save.write(S, 't'); });
    await page.clock.setSystemTime(day(1)); await reload(page);
    let s = await st(page);
    check(s.daily.unlocked[s.daily.unlocked.length - 1].id === 'ep:cuvette', 'la série reprend au premier épisode non lu');
    await page.evaluate(() => { window.MiLife.UI.tab = 'album'; window.MiLife.render(); }); await page.click('[data-replay="pinte"]'); await advance(page);
    s = await st(page);
    check(s.items.filter(i => i.id === 'sousbock').length === 1 && s.memories.filter(m => m.ref === 'pack:pinte').length === 1, 'objet et souvenir déjà acquis : pas de doublon');
    check(!errors.length, 'aucune erreur JS ' + errors.join(' | ')); await ctx.close();
  }
  await browser.close(); srv.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
