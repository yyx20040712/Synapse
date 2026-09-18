// g7-recon: full-edge reconnaissance for M4 interact/ migration (7 files)
// 三形态入边（from/import type/vi.mock）+出边（含 ../ 深度）+§3.1 单向核验+受锁面+配置面+registry 随迁面+RoT 债
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const FILES = [
  'SelectionLayer.tsx', 'SelectionToolbar.tsx', 'selection-evaluate.ts',
  'selection-geometry.ts', 'selection-paint.tsx', 'release-affinity.ts',
  'use-annotation-draft.ts',
];
const OLD_DIR = 'src/renderer/features/reader';

// A. 行数基线
console.log('=== A. 行数基线（设计书 §3.2 括号值 vs wc 实测）===');
const design = { 'SelectionLayer.tsx': 238, 'SelectionToolbar.tsx': 78, 'selection-evaluate.ts': 326, 'selection-geometry.ts': 142, 'selection-paint.tsx': 85, 'release-affinity.ts': 211, 'use-annotation-draft.ts': 193 };
for (const f of FILES) {
  const txt = readFileSync(join(ROOT, OLD_DIR, f), 'utf8');
  const n = txt.split('\n').length;
  console.log(`${f}: design=${design[f]} wc=${n}${design[f] === n ? ' OK' : ' DEV'}`);
}

// 遍历 src + tests 全部 ts/tsx
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === 'dist-electron' || e.startsWith('.git')) continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e)) acc.push(p);
  }
  return acc;
}
const srcFiles = walk(join(ROOT, 'src'));
const testFiles = walk(join(ROOT, 'tests'));
const allFiles = [...srcFiles, ...testFiles];

// B+C. 入边/出边（三形态：from 'x'、import type {..} from 'x'、vi.mock('x')）
console.log('\n=== B. 入边（src+tests 引用 7 件的行，三形态）===');
const importRe = new RegExp(`(from\\s+|import\\s+|vi\\.mock\\(\\s*)['"]([^'"]*)(SelectionLayer|SelectionToolbar|selection-evaluate|selection-geometry|selection-paint|release-affinity|use-annotation-draft)['"]`, 'g');
const inEdges = [];
for (const p of allFiles) {
  const rel = relative(ROOT, p).replaceAll('\\\\', '/');
  if (rel.startsWith(`${OLD_DIR.replaceAll('/', '\\')}`.replaceAll('\\\\', '/'))) { /* keep */ }
  const isTarget = FILES.some(f => rel.endsWith(`/${f}`) || rel === `${OLD_DIR.replaceAll('\\', '/')}/${f}`);
  const txt = readFileSync(p, 'utf8');
  const lines = txt.split('\n');
  lines.forEach((ln, i) => {
    importRe.lastIndex = 0;
    const m = importRe.exec(ln);
    if (m && !isTarget) {
      inEdges.push({ file: rel, line: i + 1, code: ln.trim().slice(0, 150) });
    }
  });
}
// 去掉 7 件自身互引（那是出边/域内边，另行输出）；入边=非 7 件文件里的引用
const inFiltered = inEdges.filter(e => {
  const relNorm = e.file.replaceAll('\\', '/');
  return !FILES.some(f => relNorm === `src/renderer/features/reader/${f}`);
});
for (const e of inFiltered) console.log(`${e.file}:${e.line}: ${e.code}`);

console.log('\n=== C. 出边（7 件 import 的相对/裸模块，判深度修正）===');
for (const f of FILES) {
  const txt = readFileSync(join(ROOT, OLD_DIR, f), 'utf8');
  const lines = txt.split('\n');
  const outs = [];
  lines.forEach((ln, i) => {
    const m = /(?:from\s+|import\s+|vi\.mock\(\s*)['"]([^'"]+)['"]/.exec(ln);
    if (m && (m[1].startsWith('./') || m[1].startsWith('../'))) outs.push(`:${i + 1}: ${ln.trim().slice(0, 130)}`);
    else if (m && !m[1].startsWith('.') && !ln.includes('import type') === false) { /* bare */ }
  });
  console.log(`--- ${f}`);
  for (const o of outs) console.log(o);
}

console.log('\n=== D. §3.1 单向核验预备：出边指向域（interact 允许→anchors/state；禁 panels/time/view）===');
for (const f of FILES) {
  const txt = readFileSync(join(ROOT, OLD_DIR, f), 'utf8');
  const relImports = [...txt.matchAll(/(?:from\s+|import\s+|vi\.mock\(\s*)['"](\.\/[^'"]+)['"]/g)].map(m => m[1]);
  const domains = relImports.map(p => {
    // 迁移后 ./x 解析为 interact/x；真正消费的其他域看 ./anchors / ./state 前缀
    if (p.startsWith('./anchors/')) return 'anchors';
    if (p.startsWith('./state/')) return 'state';
    if (p.startsWith('./time/')) return 'time';
    if (p.startsWith('./panels/')) return 'panels';
    return `interact内(${p})`;
  });
  console.log(`${f}: ${JSON.stringify(domains)}`);
}

console.log('\n=== E. tests selection 系文件（受锁面候选）===');
for (const p of testFiles) {
  const rel = relative(ROOT, p).replaceAll('\\', '/');
  if (/selection/i.test(rel)) console.log(rel);
}

console.log('\n=== F. eslint INV-16 块 ===');
const eslint = readFileSync(join(ROOT, 'eslint.config.js'), 'utf8');
eslint.split('\n').forEach((ln, i) => { if (/INV-16|reader\/|SelectionLayer|state\/|time\/|anchors\//.test(ln)) console.log(`eslint.config.js:${i + 1}: ${ln.trim().slice(0, 140)}`); });

console.log('\n=== G. check-quality.mjs 白名单 :90-105 ===');
const cq = readFileSync(join(ROOT, 'scripts/check-quality.mjs'), 'utf8').split('\n');
for (let i = 89; i < 106 && i < cq.length; i++) console.log(`check-quality.mjs:${i + 1}: ${cq[i].slice(0, 140)}`);

console.log('\n=== H. registry file 指向 7 件的票（全域随迁义务）===');
const reg = readFileSync(join(ROOT, 'tickets/registry.ts'), 'utf8').split('\n');
reg.forEach((ln, i) => {
  if (new RegExp(`reader/(SelectionLayer\\.tsx|SelectionToolbar\\.tsx|selection-evaluate\\.ts|selection-geometry\\.ts|selection-paint\\.tsx|release-affinity\\.ts|use-annotation-draft\\.ts)`).test(ln)) {
    const idm = /id: '([^']+)'/.exec(ln);
    console.log(`registry.ts:${i + 1}: id=${idm ? idm[1] : '?'} :: ${ln.trim().slice(0, 120)}`);
  }
});

console.log('\n=== I. e2e/其他字符串面引用（非 import 形态）===');
const e2eFiles = walk(join(ROOT, 'tests/e2e'));
for (const p of [...e2eFiles]) {
  const rel = relative(ROOT, p).replaceAll('\\', '/');
  const txt = readFileSync(p, 'utf8');
  txt.split('\n').forEach((ln, i) => {
    if (/(SelectionLayer|SelectionToolbar|selection-evaluate|selection-geometry|selection-paint|release-affinity|use-annotation-draft)/.test(ln) && !/^\s*(import|.*from\s)/.test(ln)) {
      console.log(`${rel}:${i + 1}: ${ln.trim().slice(0, 130)}`);
    }
  });
}

console.log('\n=== J. RoT 债：mkItem/mkText/seedRegistry 出现面（batch 14 门一 W1 登记）===');
for (const p of allFiles) {
  const rel = relative(ROOT, p).replaceAll('\\', '/');
  const txt = readFileSync(p, 'utf8');
  const hits = ['mkItem', 'mkText', 'seedRegistry'].filter(fn => new RegExp(`function ${fn}\\b|const ${fn}\\b`).test(txt));
  if (hits.length) console.log(`${rel}: ${hits.join(',')}`);
}
console.log('\nRECON_DONE');
