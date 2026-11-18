/* Génère tests/fixtures/save-v1-ancien-code.txt en jouant quelques jours avec
   l'ANCIEN index.html (commit 8793cbc). Données de jeu standard, aucune donnée privée. */
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const { serve, advance, launch } = require('./lib');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'milife-old-'));
  const old = path.join(tmp, 'index.html');
  fs.writeFileSync(old, execSync('git show 8793cbc55ff12d012ce84c99bcba505e34f99655:index.html', { cwd: path.resolve(__dirname, '..'), maxBuffer: 1 << 26 }));
  const srv = await serve(8790, old, tmp);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('http://127.0.0.1:8790/');
  await page.evaluate(() => { window.MiLife.Mini.fast = true; window.MiLife.UI.fastText = true; });
  await page.click('#tNew');
  await advance(page);
  // achats de Léonore et premier déplacement
  await page.evaluate(() => { window.MiLife.UI.tab = 'shop'; window.MiLife.render(); });
  await page.click('[data-buy="plante"]'); await advance(page);
  await page.click('[data-buy="photo"]'); await advance(page);
  await page.evaluate(() => { const S = window.MiLife.state; const r = S.items.find(i => i.id === 'plante'); r.home = 'coloc'; r.room = 1; r.x = 300; r.y = 270; S.flags.wall_coloc = '#dde7da'; window.MiLife.Save.write(S, 'test'); });
  // une activité, un post-it manuel, fin de journée
  await page.evaluate(() => { window.MiLife.UI.tab = 'day'; window.MiLife.render(); });
  await page.click('[data-act="reviser"]'); await advance(page);
  await page.click('[data-end="1"]'); await advance(page, (t, o) => (/On passe à demain/.test(t) ? 1 : 0));
  await page.click('[data-who="leo"]'); await advance(page);
  await page.evaluate(() => { window.MiLife.UI.tab = 'shop'; window.MiLife.render(); });
  await page.click('[data-buy="cafe"]'); await advance(page);
  await page.click('[data-buy="guirlande"]'); await advance(page);
  await page.evaluate(() => { window.MiLife.UI.tab = 'proj'; window.MiLife.render(); });
  await page.click('[data-settings="1"]');
  const code = await page.inputValue('#sCode');
  const st = await page.evaluate(() => window.MiLife.state);
  fs.writeFileSync(path.join(__dirname, 'fixtures', 'save-v1-ancien-code.txt'), code + '\n');
  console.log('jour', st.day, 'stage', st.stage, 'objets', st.items.map(i => i.id).join(','), 'notes', st.notes.length, 'mots', st.counters.mots, 'scènes', Object.keys(st.seen).join(','));
  // Fiction de partie avancée, écrite par l'ancien moteur (Save.blank + write + exportCode)
  const adv = await page.evaluate(() => {
    const { Save } = window.MiLife, s = Save.blank();
    Object.assign(s, { day: 23, stage: 2, love: 19, pot: 2600, active: 'leonore' });
    s.chars.leonore.money = 410; s.chars.leo.money = 1290; s.chars.leonore.med = 14; s.chars.leo.cine = 13; s.chars.leo.deals = 9;
    s.items = [
      { id: 'plante', owner: 'leonore', day: 1, home: 'maison', room: 0, x: 300, y: 290 },
      { id: 'photo', owner: 'leonore', day: 1, home: 'appart', room: 0, x: 60, y: 90 },
      { id: 'lampe', owner: 'leo', day: 3 },
      { id: 'pouf', owner: 'leonore', day: 5, home: 'maison', room: 0, x: 226, y: 262 },
      { id: 'console', owner: 'leo', day: 6 }, { id: 'cafe', owner: 'leo', day: 2 }, { id: 'stetho', owner: 'leonore', day: 4 },
      { id: 'guirlande', owner: 'leo', day: 2 }, { id: 'horloge', owner: 'leo', day: 8, home: 'maison', room: 0, x: 164, y: 44 },
      { id: 'etagere', owner: 'leonore', day: 9 }, { id: 'miroir', owner: 'leonore', day: 10 }, { id: 'aquarium', owner: 'leo', day: 12 },
      { id: 'biblio', owner: 'leo', day: 14 }, { id: 'guitare', owner: 'leo', day: 15 }, { id: 'nokia', owner: 'both', day: 11 },
      { id: 'super8', owner: 'both', day: 17 }, { id: 'broderie', owner: 'both', day: 19 }
    ];
    s.firstItem = { id: 'plante', owner: 'leonore', day: 1 };
    s.flags = { wall_maison: '#f0d6c4', wall_coloc: '#dde7da', wish: 'film', appart: 'balcon', house: 'chevreuse', specialty: 'pédiatrie', nickLeonore: 'Matecito', nickLeo: 'Beaugossito', super8: 'annuel', broderie: 0, teckelAcc: 2, saxo: 'ami' };
    ['intro', 'leoIntro', 'wish', 'rhume', 'surprise', 'movein', 'appartDetail', 'saxo', 'court', 'house', 'houseDetail', 'mathysGift', 'f_noel', 'f_valentin'].forEach((k, i) => { s.seen[k] = i + 1; });
    s.counters = { mots: 4, motus: 3, hp: 5, mail: 9, daily: 6 };
    s.notes = [
      { from: 'leo', text: 'Note fictive de test 1', ts: 1767000000000, day: 1, read: true, auto: 1 },
      { from: 'leo', text: 'Note fictive de test 2', ts: 1767100000000, day: 5, read: true, auto: 1 },
      { from: 'leonore', text: 'Post-it manuel fictif', ts: 1767200000000, day: 6, read: true },
      { from: 'leo', text: 'Note fictive de test 3', ts: 1767300000000, day: 9, read: true, auto: 1 },
      { from: 'leo', text: 'Note fictive de test 4', ts: 1767400000000, day: 12, read: true, auto: 1 },
      { from: 'leo', text: 'Post-it manuel en attente', ts: 1767500000000, day: 22, read: false }
    ];
    s.kids = [{ name: 'Gosio', born: 18, st: 1, look: 0 }];
    s.memories = [{ day: 2, icon: '🎁', title: 'La surprise (il s’en est souvenu)', text: 'Souvenir fictif.' }, { day: 18, icon: '👶', title: 'La naissance de Gosio', text: 'Gosio est là. Souvenir fictif.' }];
    s.registre = [{ n: 213, day: 1, text: 'Incident fictif.' }]; s.regNo = 213;
    s.login = { day: '2026-11-10', streak: 3 };
    s.mail = { day: 23, id: 3, read: true };
    Save.write(s, 'fixture');
    return Save.exportCode(s);
  });
  fs.writeFileSync(path.join(__dirname, 'fixtures', 'save-v1-avancee-fictive.txt'), adv + '\n');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
