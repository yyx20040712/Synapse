// g8 侦察②：字符串面全扩展名预扫（板注义务——G6 N3-N4/G7 W1 同族第四防线前置）。
// 分域：活代码(src/tests)/活脚本(scripts 除 audits)/根配置/tickets/docs——命中行号+形态分类。
import fs from 'node:fs';
import path from 'node:path';

const NAMES = [
  'OutlineAside', 'OutlinePanel', 'OutlineThumb', 'ReaderNotesPanel',
  'AiNotesSection', 'AiNoteGroupList', 'AiNotesStatus', 'FragmentNotesList',
];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', 'coverage', 'release', 'audits']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

const files = [];
walk('.', files);

const importForm = new RegExp(
  `(?:from\\s+|import\\s+|import\\(\\s*|vi\\.mock\\(\\s*|require\\(\\s*)['"][^'"]*(?:${NAMES.join('|')})(?:\\.tsx?|\\.js)?['"]`,
);

function domainOf(f) {
  if (f.startsWith('src') || f.startsWith('tests')) return '活代码';
  if (f.startsWith('scripts')) return '活脚本';
  if (f.startsWith('tickets')) return 'tickets';
  if (f.startsWith('docs')) return 'docs';
  return '根/其他';
}

const rows = [];
for (const f of files) {
  let lines;
  try { lines = fs.readFileSync(f, 'utf8').split(/\r?\n/); } catch { continue; }
  lines.forEach((line, i) => {
    for (const n of NAMES) {
      if (!line.includes(n)) continue;
      const kind = importForm.test(line) ? 'IMPORT形态' : '字符串/其他形态';
      rows.push(`[${domainOf(f)}] ${f}:${i + 1}: (${kind}/${n}) ${line.trim().slice(0, 160)}`);
    }
  });
}

const byDomain = {};
for (const r of rows) {
  const d = r.match(/^\[([^\]]+)\]/)[1];
  byDomain[d] = (byDomain[d] || 0) + 1;
}
const summary = Object.entries(byDomain).map(([k, v]) => `${k}=${v}`).join(' ');

const report = [
  '=== G8 字符串面全扩展名预扫（非 import 形态=义务命中；import 形态=入边参照）===',
  ...rows,
  `--- 合计 ${rows.length} 行（${summary}）---`,
].join('\n');
fs.writeFileSync('scripts/audits/g8-fullscan2.log', report, 'utf8');
console.log(report);
