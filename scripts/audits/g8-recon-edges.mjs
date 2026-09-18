// g8 派发前侦察①：8 迁移件入边（import 五形态）+出边清单（§3.1 单向核验底表）。
// 域=仓根活代码（src/tests/scripts 等，SKIP 归档/产物域）；输出物理落 g8-recon.log。
import fs from 'node:fs';
import path from 'node:path';

const NAMES = [
  'OutlineAside', 'OutlinePanel', 'OutlineThumb', 'ReaderNotesPanel',
  'AiNotesSection', 'AiNoteGroupList', 'AiNotesStatus', 'FragmentNotesList',
];
const SKIP = new Set(['node_modules', '.git', 'dist', 'out', 'coverage', 'audits', 'release', 'docs']);
const MIGRATED = new Set([
  'state', 'time', 'anchors', 'interact', 'geometry-types',
]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

const files = [];
walk('.', files);
const importRes = NAMES.map((n) => ({
  n,
  re: new RegExp(`(?:from\\s+|import\\s+|import\\(\\s*|vi\\.mock\\(\\s*|require\\(\\s*)['"][^'"]*\\b${n}(?:\\.tsx?|\\.js)?['"]`),
}));

const inbound = [];
const srcDir = 'src/renderer/features/reader';
const ownSet = new Set(NAMES.map((n) => path.join(srcDir, n + '.tsx')));

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { n, re } of importRes) {
      if (re.test(line)) inbound.push(`${f}:${i + 1}: [${n}] ${line.trim()}`);
    }
  });
}

const outbound = [];
for (const n of NAMES) {
  const p = path.join(srcDir, n + '.tsx');
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/(?:from\s+|import\s+|import\(\s*)(['"][^'"]+['"])/);
    if (m) {
      const spec = m[1].slice(1, -1);
      const dom = spec.startsWith('.')
        ? (spec.startsWith('..') ? `<外部相对>${spec}` : `<reader 同层/域>${spec}`)
        : `<包/别名>${spec}`;
      outbound.push(`${n}.tsx:${i + 1}: ${dom} :: ${line.trim()}`);
    }
  });
}

// §3.1 预核：panels 迁出边是否只指向 anchors/state/panels 域内/shared 外部
const bad = [];
for (const n of NAMES) {
  const p = path.join(srcDir, n + '.tsx');
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/(?:from\s+|import\s+)(['"])(\.[^'"]+)\1/);
    if (!m) return;
    const spec = m[2];
    if (!spec.startsWith('./')) return;
    const seg = spec.replace(/^\.\//, '').split('/')[0].replace(/\.(tsx?|css)$/, '');
    const tgt = path.normalize(path.join(srcDir, spec.replace(/\.(tsx?|js)$/, '')));
    const isMigratedDomain = MIGRATED.has(seg);
    const isSibling = ownSet.has(tgt + '.tsx') || ownSet.has(tgt + '.ts');
    const isRootFile = fs.existsSync(tgt + '.tsx') || fs.existsSync(tgt + '.ts') || fs.existsSync(tgt + '.css');
    if (!isMigratedDomain && !isSibling && isRootFile) {
      bad.push(`${n}.tsx:${i + 1}: ./同层根文件依赖（迁后需 ../x 或归域）:: ${spec}`);
    }
  });
}

const report = [
  '=== G8 入边（import 五形态：from/import/import(/vi.mock(/require(）===',
  ...inbound,
  `--- 入边合计 ${inbound.length} 行 ---`,
  '=== G8 出边（8 件自身 import 全清单）===',
  ...outbound,
  '=== §3.1 预核：指向 reader 根未迁同层件的出边（违规/需深修候选）===',
  ...bad,
  `--- 违规候选合计 ${bad.length} 行 ---`,
].join('\n');
fs.writeFileSync('scripts/audits/g8-recon.log', report, 'utf8');
console.log(report);
