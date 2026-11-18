/* Lance toutes les suites : node tests/run-all.js */
const { spawnSync } = require('child_process'), path = require('path');
let bad = 0;
for (const f of ['test-sauvegarde.js', 'test-surprises.js', 'test-decor.js', 'test-pack-prive.js']) {
  const p = path.join(__dirname, f);
  if (!require('fs').existsSync(p)) continue;
  console.log(`\n=== ${f} ===`);
  const r = spawnSync(process.execPath, [p], { stdio: 'inherit' });
  if (r.status) bad++;
}
console.log(bad ? `\n${bad} suite(s) en échec.` : '\nToutes les suites sont vertes.');
process.exit(bad ? 1 : 0);
