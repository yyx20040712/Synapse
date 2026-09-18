// g10 派发前全边侦察探针：出边/入边/字符串面/eslint 四路径态/root↔view 中间态边
// 输出落 g10-recon.log；单文件单目的，写前 lint 自查（无未用变量）
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const R = join(ROOT, 'src/renderer/features/reader');
const FILES = [
  'AnnotationEditor.tsx', 'AnnotationMenu.tsx', 'PageColumnView.tsx', 'ReaderPage.tsx',
  'ReaderSearchBox.tsx', 'ReaderShortcuts.ts', 'ReaderToolbar.tsx', 'SearchHighlightLayer.tsx',
  'TabBar.tsx', 'reader-search.store.ts', 'reader-search.ts', 'reader-shortcut-handlers.ts',
  'useReaderSearch.tsx',
];
const out = [];

// ① 出边：13 件各自的相对 import（from './x' / from './sub/x' / from '../../x'）
out.push('== [1] OUT-EDGES (13 files, relative imports only) ==');
for (const f of FILES) {
  const txt = readFileSync(join(R, f), 'utf8');
  const lines = txt.split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    const m = l.match(/from '(\.[^']*)'|import '(\.[^']*)'|vi\.mock\('(\.[^']*)'/);
    if (m) hits.push(`:${i + 1} ${m[1] || m[2] || m[3]}`);
  });
  out.push(`${f} (${hits.length})`);
  for (const h of hits) out.push(`  ${h}`);
}

// ② 入边：src/ + tests/ + scripts/ 中 import 这 13 件旧路径的行（import 三形态）
out.push('');
out.push('== [2] IN-EDGES (consumers of the 13 old paths across src/tests/scripts) ==');
function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === 'node_modules' || e === 'dist' || e === 'dist-electron' || e === '.git') continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|mjs|cjs|js|css)$/.test(e)) acc.push(p);
  }
  return acc;
}
const all = [...walk(join(ROOT, 'src'), []), ...walk(join(ROOT, 'tests'), []),
  ...walk(join(ROOT, 'scripts'), [])];
let inEdgeCount = 0;
for (const p of all) {
  const rel = relative(ROOT, p).replaceAll('\\', '/');
  const txt = readFileSync(p, 'utf8');
  const lines = txt.split('\n');
  const hits = [];
  const stems = FILES.map((x) => x.replace(/\.[jt]sx?$/, ''));
  lines.forEach((l, i) => {
    const named = stems.some((s) => new RegExp(`\\b${s}\\b`).test(l));
    if (!named) return;
    if (/from ['"]|import ['"]|require\(|vi\.mock\(/.test(l)) hits.push(`:${i + 1} ${l.trim()}`);
  });
  if (hits.length) {
    out.push(`${rel} (${hits.length})`);
    for (const h of hits) { out.push(`  ${h}`); inEdgeCount += 1; }
  }
}
out.push(`IN_EDGE_TOTAL=${inEdgeCount}`);

// ③ 字符串面：全仓字符串形态引用（readFileSync/路径字面量）——板注预列 3 行验证+全扩展名
out.push('');
out.push('== [3] STRING-FORM refs (all extensions, whole repo minus node_modules/dist/.git/out-dirs) ==');
const allAll = walk(ROOT, []);
let strCount = 0;
for (const p of allAll) {
  const rel = relative(ROOT, p).replaceAll('\\', '/');
  if (rel.startsWith('node_modules') || rel.includes('/dist/') || rel.startsWith('.git')) continue;
  const txt = readFileSync(p, 'utf8');
  const lines = txt.split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    if (!/reader\/(ReaderPage|ReaderToolbar|TabBar|reader-shortcut-handlers|ReaderShortcuts|AnnotationEditor|AnnotationMenu|useReaderSearch|ReaderSearchBox|reader-search(?:\.store)?|SearchHighlightLayer|PageColumnView)/.test(l)) return;
    if (/from |import |require\(|vi\.mock\(/.test(l)) return; // import 形态已在 [2]
    hits.push(`:${i + 1} ${l.trim()}`);
  });
  if (hits.length) {
    out.push(`${rel} (${hits.length})`);
    for (const h of hits) { out.push(`  ${h}`); strCount += 1; }
  }
}
out.push(`STRING_FORM_TOTAL=${strCount}`);

// ④ eslint.config.js 四路径当前态
out.push('');
out.push('== [4] eslint.config.js reader refs ==');
const es = readFileSync(join(ROOT, 'eslint.config.js'), 'utf8').split('\n');
es.forEach((l, i) => { if (/reader/.test(l)) out.push(`:${i + 1} ${l.trim()}`); });

// ⑤ root↔view 中间态边基线：view/ 域引用 ../X（reader 根件）+ reader 根件引用 ./view/
out.push('');
out.push('== [5] ROOT<->VIEW intermediate edges baseline ==');
const viewDir = join(R, 'view');
for (const e of readdirSync(viewDir)) {
  const p = join(viewDir, e);
  if (!/\.(ts|tsx|css)$/.test(e)) continue;
  const txt = readFileSync(p, 'utf8');
  const lines = txt.split('\n');
  lines.forEach((l, i) => {
    if (/from '\.\.\/[^']*'/.test(l) || /from '\.\/view\//.test(l)) out.push(`view/${e}:${i + 1} ${l.trim()}`);
  });
}
// reader 根 13 件引用 ./view/ 的边（迁移后变域内 ./）
out.push('-- root files importing ./view/ (will become intra-domain after move):');
for (const f of FILES) {
  const txt = readFileSync(join(R, f), 'utf8');
  const lines = txt.split('\n');
  lines.forEach((l, i) => { if (/from '\.\/view\//.test(l)) out.push(`${f}:${i + 1} ${l.trim()}`); });
}

const LOG = join(ROOT, 'scripts/audits/g10-recon.log');
const { writeFileSync: wf } = await import('node:fs');
wf(LOG, out.join('\n') + '\n', 'utf8');
console.log(`RECON_DONE lines=${out.length} in_edges=${inEdgeCount} string_form=${strCount}`);
