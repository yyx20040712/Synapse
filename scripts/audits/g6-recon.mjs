// G6 派发前全边侦察：14 件被迁对象的全部 import 消费面（src+tests 分类）
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const MOVED = [
  'pdf-item-geometry', 'annotation-anchor', 'annotation-merge', 'annotation-resolve',
  'annotation-resolve-layered', 'annotation-band-calibrate', 'anchor-serialize',
  'anchor-blank-snap', 'anchor-locate', 'page-items.store', 'open-paper-anchor',
  'annotation-style', 'ai-note-style', 'geometry-types'
];

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e)) acc.push(p);
  }
  return acc;
}

const files = [
  ...walk(join(root, 'src'), []),
  ...walk(join(root, 'tests'), [])
];

const hits = [];
for (const f of files) {
  const rel = f.slice(root.length + 1).replace(/\\/g, '/');
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!/\bfrom\s+['"]|import\s+['"]/.test(line)) return;
    for (const m of MOVED) {
      // 匹配 import 路径以 /m 或 './m' 等结尾指向被迁件
      const re = new RegExp(`['"][^'"]*/${m}['"]|['"]\\./${m}['"]`);
      if (re.test(line)) {
        hits.push({ file: rel, line: i + 1, text: line.trim(), target: m });
        break;
      }
    }
  });
}

// 分类：被迁件自身（域内互引）/ reader 域内消费 / src 跨特性 / tests
const self = hits.filter((h) => /^src\/renderer\/features\/reader\/[^/]+$/.test(h.file));
const inReader = hits.filter((h) => h.file.startsWith('src/renderer/features/reader/') && !/^src\/renderer\/features\/reader\/[^/]+$/.test(h.file));
const srcOutside = hits.filter((h) => h.file.startsWith('src/') && !h.file.startsWith('src/renderer/features/reader/'));
const inTests = hits.filter((h) => h.file.startsWith('tests/'));

const dump = (label, arr) => {
  console.log(`\n=== ${label} (${arr.length} hits) ===`);
  for (const h of arr) console.log(`${h.file}:${h.line}\t[${h.target}]\t${h.text}`);
};
dump('SELF (moved files internal)', self);
dump('READER subdir consumers', inReader);
dump('SRC outside reader', srcOutside);
dump('TESTS', inTests);
console.log(`\nTOTAL=${hits.length} self=${self.length} reader=${inReader.length} srcOutside=${srcOutside.length} tests=${inTests.length}`);
