// b24 tickets flip: F-LAYER-01 + F-TIME-01 status open -> done (count 2).
import { readFileSync, writeFileSync } from 'node:fs';

const REG = 'tickets/registry.ts';
const IDS = ['F-LAYER-01', 'F-TIME-01'];
const src = readFileSync(REG, 'utf8');
let moved = 0;
let out = src;
for (const id of IDS) {
  const re = new RegExp(`(\\{ id: '${id}',[^}]*?status: )'open'`, 'm');
  if (!re.test(out)) {
    console.log(`MISS=${id}`);
    continue;
  }
  out = out.replace(re, `$1'done'`);
  moved += 1;
}
writeFileSync(REG, out, 'utf8');

const back = readFileSync(REG, 'utf8');
let residue = 0;
for (const id of IDS) {
  const re = new RegExp(`\\{ id: '${id}',[^}]*?status: 'open'`, 'm');
  if (re.test(back)) residue += 1;
}
const openCount = (back.match(/status: 'open'/g) || []).length;
console.log(`FLIP_MOVED=${moved}`);
console.log(`RESIDUE=${residue}`);
console.log(`OPEN_TOTAL=${openCount}`);
