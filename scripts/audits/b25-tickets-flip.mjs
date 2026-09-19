// b25 翻票探针：F-SENSOR-01 open→done（文本面断言从被验文件提取实测值——b23 教训③）
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const REG = 'tickets/registry.ts';
const raw = readFileSync(REG, 'utf8');

// 定位 F-SENSOR-01 票行（行首锚定防误配 summary 内文字）
const lineIdx = raw.split('\n').findIndex((l) => l.includes("{ id: 'F-SENSOR-01'"));
if (lineIdx < 0) {
  console.error('ABORT: F-SENSOR-01 row not found');
  process.exit(1);
}
const lines = raw.split('\n');
const row = lines[lineIdx];
const beforeOpen = (row.match(/status: 'open'/g) || []).length;
if (beforeOpen !== 1) {
  console.error(`ABORT: row does not contain exactly one open status (found ${beforeOpen})`);
  process.exit(1);
}
lines[lineIdx] = row.replace("status: 'open'", "status: 'done'");
const out = lines.join('\n');

// open 票总数前后对照（实测提取，非硬编码）
const countOpen = (t) => (t.match(/status: 'open'/g) || []).length;
const openBefore = countOpen(raw);
const openAfter = countOpen(out);

// 原子写
writeFileSync('tickets/registry.ts.tmp', out);
renameSync('tickets/registry.ts.tmp', REG);

// 回读断言（文本面实测；残留判定锚定「行首票定义」形态——v1 谓词 includes
// 过宽，误配 F-DOCGOV-01 行 summary 内的 F-SENSOR-01 文字提名，v1 档留档）
const back = readFileSync(REG, 'utf8');
const backRow = back.split('\n').findIndex((l) => l.includes("{ id: 'F-SENSOR-01'"));
const flipped = back.split('\n')[backRow].includes("status: 'done'");
const residue = back
  .split('\n')
  .filter((l) => l.includes("{ id: 'F-SENSOR-01'") && l.includes("status: 'open'")).length;

console.log(`FLIP_MOVED=1 (F-SENSOR-01 open→done at line ${backRow + 1})`);
console.log(`OPEN_BEFORE=${openBefore} OPEN_AFTER=${openAfter} (delta=${openBefore - openAfter})`);
console.log(`RESIDUE=${residue}`);
console.log(`FLIP_OK=${flipped && residue === 0 && openBefore - openAfter === 1}`);
process.exit(flipped && residue === 0 && openBefore - openAfter === 1 ? 0 : 2);
