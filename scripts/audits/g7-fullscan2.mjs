// g7-fullscan2: W1-a 分域全扩展名旧径补扫（活代码/活脚本/文档/归档四域分列）
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PAT = "(SelectionLayer|SelectionToolbar|selection-evaluate|selection-geometry|selection-paint|release-affinity|use-annotation-draft)";
const OLD = "reader/(SelectionLayer\\.tsx|SelectionToolbar\\.tsx|selection-evaluate\\.ts|selection-geometry\\.ts|selection-paint\\.tsx|release-affinity\\.ts|use-annotation-draft\\.ts)";
const re = new RegExp(OLD);

function scan(label, cmd) {
  let out = '';
  try { out = execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const lines = out.split('\n').filter(l => re.test(l) && !/interact\//.test(l));
  console.log(`\n=== ${label}: ${lines.length} hits ===`);
  for (const l of lines) console.log(l.slice(0, 160));
  return lines;
}

const log = [];
console.log = ((orig) => (...a) => { log.push(a.join(' ')); orig(...a); })(console.log);

const live = scan('活代码面（src+tests+配置）', 'git grep -n -E "' + PAT + '" -- src tests eslint.config.js package.json playwright.config.ts tsconfig*.json');
const liveScripts = scan('活脚本面（scripts/*.mjs/*.ps1 非 audits）', 'git grep -n -E "' + PAT + '" -- "scripts/*.mjs" "scripts/*.ps1" ":!scripts/audits"');
const tickets = scan('tickets 面', 'git grep -n -E "' + PAT + '" -- tickets');
scan('文档面（docs+*.md）', 'git grep -n -E "' + PAT + '" -- docs "*.md"');
scan('归档面（scripts/audits——历史档预期命中零改）', 'bash -c \'git grep -n -E "' + PAT + '" -- scripts/audits | wc -l\'');

writeFileSync('scripts/audits/g7-fullscan2.log', log.join('\n') + '\nG7_FULLSCAN2_DONE\n', 'utf8');
const dead = [...live, ...liveScripts, ...tickets].length;
console.log(`\n活边残留合计（活代码+活脚本+tickets）=${dead}`);
writeFileSync('scripts/audits/g7-fullscan2.log', log.join('\n') + `\n活边残留合计=${dead}\nG7_FULLSCAN2_DONE\n`, 'utf8');
process.exit(dead === 0 ? 0 : 1);
