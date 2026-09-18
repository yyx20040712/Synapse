// g7-recon2: RoT 债核实——selection 系 4 份 mkItem/mkText/seedRegistry 逐字对比
// + anchors 域 2 份 mkItem（anchor-item-verify/pdf-item-geometry）对照
import { readFileSync } from 'node:fs';

const FILES = [
  'tests/unit/renderer/selection-evaluate.test.tsx',
  'tests/unit/renderer/selection-item-chain.test.tsx',
  'tests/unit/renderer/selection-paint.test.tsx',
  'tests/unit/renderer/selection-layer.test.tsx',
  'tests/unit/renderer/anchor-item-verify.test.tsx',
  'tests/unit/renderer/pdf-item-geometry.test.tsx',
];
const FN = ['mkItem', 'mkText', 'seedRegistry'];

// 抽取 function 定义全文（到匹配的闭合大括号——粗扫：brace 计数）
function extractFn(txt, name) {
  const re = new RegExp(`(?:function\\s+${name}\\s*\\(|const\\s+${name}\\s*=[^=])`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(txt)) !== null) {
    const start = m.index;
    let i = txt.indexOf('{', start);
    if (i === -1) { out.push(null); continue; }
    let depth = 0, j = i;
    for (; j < txt.length; j++) {
      if (txt[j] === '{') depth++;
      else if (txt[j] === '}') { depth--; if (depth === 0) break; }
    }
    // const 箭头函数形态：往前找到行首取整行、返回完整定义
    const lineStart = txt.lastIndexOf('\n', start) + 1;
    const header = txt.slice(lineStart, start).trim();
    out.push({ header, body: txt.slice(lineStart, j + 1).trimEnd(), span: [lineStart, j + 1] });
  }
  return out;
}

const defs = {};
for (const f of FILES) {
  const txt = readFileSync(f, 'utf8');
  defs[f] = {};
  for (const fn of FN) {
    const ext = extractFn(txt, fn);
    defs[f][fn] = ext;
  }
}

// 逐函数对比（selection 系 4 份之间 + anchors 2 份对照）
for (const fn of FN) {
  console.log(`\n=== ${fn} ===`);
  const sel = FILES.slice(0, 4);
  const bodies = sel.map(f => defs[f][fn][0]?.body ?? '(无)');
  const uniq = [...new Set(bodies)];
  console.log(`selection 系 4 份唯一体数: ${uniq.length}`);
  if (uniq.length === 1) {
    console.log('四份逐字相同:');
    console.log(uniq[0]);
  } else {
    sel.forEach((f, i) => {
      console.log(`--- ${f} (${bodies[i].split('\n').length} 行)`);
      console.log(bodies[i]);
    });
  }
  // anchors 对照
  const anc = FILES.slice(4).map(f => defs[f][fn][0]?.body ?? '(无)').filter(b => b !== '(无)');
  if (anc.length) {
    const ancUniq = [...new Set(anc)];
    const sameAsSel = anc.filter(b => b === bodies[0]).length;
    console.log(`[anchors 域 ${fn} 定义 ${anc.length} 份/唯一 ${ancUniq.length}/与 selection 版逐字同 ${sameAsSel}]`);
  }
}
console.log('\nRECON2_DONE');
