// g9-recon.mjs — F-GEOM-01-G9 (M6a view 渲染簇 14 件) 迁移前侦察探针
// 出边=14 件各自的 import 依赖分类；入边=全仓引用（import/vi.mock/字符串/动态四形态）。
// 只读探针：不写任何仓库文件。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = process.cwd();
const FILES = [
  'PageColumn.tsx', 'PageBox.tsx', 'PagesOverlay.tsx', 'PdfPageCanvas.tsx', 'TextLayer.tsx',
  'text-layer.css', 'page-column-geometry.ts', 'usePageColumnScroll.ts',
  'usePageLazyWindow.ts', 'scroll-progress.ts', 'AnnotationLayer.tsx',
  'AiAnnotationLayer.tsx', 'AnnotationPopups.tsx', 'ReaderPageView.tsx',
];
// import 说明符段名：ts/tsx 省扩展名，css 保留扩展名。
const SEGS = FILES.map((f) => f.replace(/\.(tsx?|jsx?)$/, ''));
const READER = 'src/renderer/features/reader';

function walk(dir, acc) {
  for (const ent of readdirSync(dir)) {
    if (ent === '.git' || ent === 'node_modules' || ent === 'dist' || ent === 'out' || ent === 'coverage') continue;
    const p = join(dir, ent);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|cjs|css|json|html|md)$/.test(ent)) acc.push(p);
  }
  return acc;
}
const files = walk(ROOT, []);

// ── 出边：14 件自身的相对 import（供深度修正行定位）──
console.log('===== OUT-EDGES (relative imports inside the 14 migrated files) =====');
for (const name of FILES) {
  const text = readFileSync(join(ROOT, READER, name), 'utf8');
  const specs = [...text.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  console.log(`--- ${name}: ${specs.join(' | ') || '(none)'}`);
}

// ── 入边：全仓对 14 件的引用（import/from、vi.mock、动态 import、字符串——精确末段匹配）──
console.log('===== IN-EDGES (repo-wide references, exact final segment match) =====');
const targetSet = new Set(FILES);
for (const f of files) {
  const rel = relative(ROOT, f).split('\\').join('/');
  if (rel.startsWith(READER + '/') && targetSet.has(basename(f))) continue; // 域内互引单列
  const lines = readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/['"]([^'"]*)['"]/g)) {
      const raw = m[1];
      if (!raw || !raw.includes('/')) {
        // 纯段名形态（'./PageColumn' 已含 /；此处捕 css 带扩展名或无斜杠别名形态）
        if (FILES.includes(raw)) hits.push({ line: i + 1, s: raw, text: line.trim().slice(0, 160) });
        continue;
      }
      const seg = raw.split('/').pop();
      if (SEGS.includes(seg) || FILES.includes(seg)) {
        hits.push({ line: i + 1, s: raw, text: line.trim().slice(0, 160) });
      }
    }
  });
  if (hits.length) {
    console.log(`--- ${rel}`);
    for (const h of hits) console.log(`  :${h.line} [${h.s}] ${h.text}`);
  }
}

// ── 域内互引：14 件之间（随迁移零改写预期面）──
console.log('===== INTRA-DOMAIN edges (among the 14) =====');
for (const name of FILES) {
  const text = readFileSync(join(ROOT, READER, name), 'utf8');
  const specs = [...text.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  const intra = specs.filter((s) => {
    const seg = s.split('/').pop();
    return SEGS.includes(seg) && seg !== name.replace(/\.(tsx?|jsx?)$/, '');
  });
  if (intra.length) console.log(`--- ${name} -> ${intra.join(' | ')}`);
}
