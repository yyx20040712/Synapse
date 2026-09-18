// G6 补充侦察：被迁件对外 import / 字符串提名面 / 配置面 / registry / e2e
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const MOVED = [
  'pdf-item-geometry', 'annotation-anchor', 'annotation-merge', 'annotation-resolve',
  'annotation-resolve-layered', 'annotation-band-calibrate', 'anchor-serialize',
  'anchor-blank-snap', 'anchor-locate', 'page-items.store', 'open-paper-anchor',
  'annotation-style', 'ai-note-style', 'geometry-types'
];
const R = 'src/renderer/features/reader';

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|mjs|json|md)$/.test(e)) acc.push(p);
  }
  return acc;
}

// ① 14 件内部对外（跨域/跨特性）import——深度修正面
console.log('=== [1] moved files' + `'` + ' outbound imports (non-sibling) ===');
for (const m of MOVED) {
  for (const ext of ['.ts', '.tsx']) {
    let txt;
    try { txt = readFileSync(join(root, R, m + ext), 'utf8'); } catch { continue; }
    txt.split('\n').forEach((l, i) => {
      const mt = l.match(/from\s+['"]([^'"]+)['"]/);
      if (mt && !/^\.\//.test(mt[1]) === false && mt[1].startsWith('.') && !new RegExp(`^\\./(${MOVED.join('|')})$`).test(mt[1])) {
        console.log(`${R}/${m}${ext}:${i + 1}\t${mt[1]}\t| ${l.trim().slice(0, 90)}`);
      }
    });
  }
}

// ② 全 src/tests 非 import 行的路径字符串提名（注释/文档字符串）
console.log('\n=== [2] string/comment mentions of reader/<moved> paths ===');
const files = [...walk(join(root, 'src'), []), ...walk(join(root, 'tests'), [])];
for (const f of files) {
  const rel = f.slice(root.length + 1).replace(/\\/g, '/');
  const isMovedSelf = MOVED.some((m) => rel === `${R}/${m}.ts` || rel === `${R}/${m}.tsx`);
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (/\bfrom\s+['"]/.test(l) && /['"][^'"]*\/(\w[\w.]*)['"]/.test(l) && MOVED.some((m) => new RegExp(`['"][^'"]*/${m}['"]`).test(l))) return; // import 行已在主侦察
    for (const m of MOVED) {
      if (new RegExp(`reader/${m}[.'\\s"]|reader/${m}$`).test(l) && l.includes(`reader/${m}`)) {
        if (isMovedSelf && l.includes(`./`)) continue; // 自身头注同层提名
        console.log(`${rel}:${i + 1}\t[${m}]\t${l.trim().slice(0, 110)}`);
        break;
      }
    }
  });
}

// ③ 配置面：eslint INV-16 + check-quality + vitest/playwright/tsconfig 中 anchors 件名
console.log('\n=== [3] config mentions ===');
const cfgs = ['eslint.config.js', 'scripts/check-quality.mjs', 'vitest.config.ts', 'playwright.config.ts', 'tsconfig.web.json', 'tsconfig.json', 'package.json'];
for (const c of cfgs) {
  let txt;
  try { txt = readFileSync(join(root, c), 'utf8'); } catch { continue; }
  txt.split('\n').forEach((l, i) => {
    for (const m of MOVED) {
      if (l.includes(m)) { console.log(`${c}:${i + 1}\t[${m}]\t${l.trim().slice(0, 110)}`); break; }
    }
  });
}

// ④ registry file 字段随迁义务
console.log('\n=== [4] registry file fields pointing at moved paths ===');
const reg = readFileSync(join(root, 'tickets/registry.ts'), 'utf8');
reg.split('\n').forEach((l, i) => {
  for (const m of MOVED) {
    if (l.includes(`reader/${m}.`)) { console.log(`tickets/registry.ts:${i + 1}\t[${m}]\t${l.trim().slice(0, 130)}`); break; }
  }
});

// ⑤ e2e spec 14 件名字符串面（任何出现形态）
console.log('\n=== [5] e2e spec string surface ===');
const e2eDir = join(root, 'tests/e2e');
for (const f of walk(e2eDir, [])) {
  const rel = f.slice(root.length + 1).replace(/\\/g, '/');
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    for (const m of MOVED) {
      if (l.includes(m)) { console.log(`${rel}:${i + 1}\t[${m}]\t${l.trim().slice(0, 110)}`); break; }
    }
  });
}
console.log('\nDONE');
