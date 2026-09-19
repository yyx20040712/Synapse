// b26-tickets-flip: F-EXPORT-01 翻 done（行首 id 定义形态锚定——b25 谓词教训）
import { readFileSync, writeFileSync } from 'node:fs';

const REG = 'tickets/registry.ts';
const ID = 'F-EXPORT-01';
const src = readFileSync(REG, 'utf8');
const lines = src.split('\n');

// 翻票前 open 计数（行首定义形态 `{ id: 'X', ... status: 'open'`）
const openBefore = lines.filter((l) => /^\s*\{ id: '[^']+', .*status: 'open'/.test(l)).length;

// 锚定：含 `{ id: 'F-EXPORT-01'` 定义形态的行（防他票 summary 文字提名误配）
const idx = lines.findIndex((l) => l.includes(`{ id: '${ID}'`));
if (idx === -1) throw new Error('ticket line not found');
const before = lines[idx];
if (!before.includes("status: 'open'")) throw new Error(`ticket ${ID} not open`);
lines[idx] = before.replace("status: 'open'", "status: 'done'");

const out = lines.join('\n');
writeFileSync(REG, out);

// 回读验证：翻后残留=0（id 定义行不再 open）+open 计数-1
const back = readFileSync(REG, 'utf8').split('\n');
const defLine = back.find((l) => l.includes(`{ id: '${ID}'`));
const residue = defLine !== undefined && defLine.includes("status: 'open'") ? 1 : 0;
const openAfter = back.filter((l) => /^\s*\{ id: '[^']+', .*status: 'open'/.test(l)).length;

console.log(`FLIP_MOVED=1 RESIDUE=${residue} OPEN_BEFORE=${openBefore} OPEN_AFTER=${openAfter}`);
if (residue !== 0 || openAfter !== openBefore - 1) {
  console.error('FLIP_VERIFY_FAILED');
  process.exit(1);
}
