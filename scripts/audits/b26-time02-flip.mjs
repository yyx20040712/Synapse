// b26-time02-flip: F-TIME-02 翻 done（行首 id 定义形态锚定——b25/b26 谓词教训）
import { readFileSync, writeFileSync } from 'node:fs';

const REG = 'tickets/registry.ts';
const ID = 'F-TIME-02';
const lines = readFileSync(REG, 'utf8').split('\n');
const openBefore = lines.filter((l) => /^\s*\{ id: '[^']+', .*status: 'open'/.test(l)).length;
const idx = lines.findIndex((l) => l.includes(`{ id: '${ID}'`));
if (idx === -1) throw new Error('ticket line not found');
if (!lines[idx].includes("status: 'open'")) throw new Error(`ticket ${ID} not open`);
lines[idx] = lines[idx].replace("status: 'open'", "status: 'done'");
writeFileSync(REG, lines.join('\n'));
const back = readFileSync(REG, 'utf8').split('\n');
const defLine = back.find((l) => l.includes(`{ id: '${ID}'`));
const residue = defLine !== undefined && defLine.includes("status: 'open'") ? 1 : 0;
const openAfter = back.filter((l) => /^\s*\{ id: '[^']+', .*status: 'open'/.test(l)).length;
console.log(`FLIP_MOVED=1 RESIDUE=${residue} OPEN_BEFORE=${openBefore} OPEN_AFTER=${openAfter}`);
if (residue !== 0 || openAfter !== openBefore - 1) { console.error('FLIP_VERIFY_FAILED'); process.exit(1); }
