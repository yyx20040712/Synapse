// b25 认领探针：relay.md 原子 claim（tmp+rename+回读确认）——单文件单目的
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = new URL('../../docs/handoff/relay.md', import.meta.url);
const CLAIM = 'claim-1789774291-b25';
const HEARTBEAT = '2026-09-18T23:31:31Z';

const raw = readFileSync(RELAY, 'utf8');
const swaps = [
  ['- status: READY', '- status: RUNNING'],
  ['- heartbeat_utc: 2026-09-18T23:46:00Z', `- heartbeat_utc: ${HEARTBEAT}`],
  ['- claim: claim-1789771843-b24（已收口 2026-09-19T07:46:00）', `- claim: ${CLAIM}`],
];
let out = raw;
for (const [from, to] of swaps) {
  const n = out.split(from).length - 1;
  if (n !== 1) {
    console.error(`ABORT: anchor count ${n} != 1 for ${from}`);
    process.exit(1);
  }
  out = out.replace(from, to);
}
const tmp = new URL('../../docs/handoff/relay.md.tmp', import.meta.url);
writeFileSync(tmp, out);
renameSync(tmp, RELAY);
const back = readFileSync(RELAY, 'utf8');
const ok = back.includes(`- claim: ${CLAIM}`) && back.includes('- status: RUNNING');
console.log(`CLAIM_OK=${ok} token=${CLAIM} heartbeat=${HEARTBEAT} last_dispatch_preserved=${back.includes('- last_dispatch: 2026-09-19T07:30:05+08:00')}`);
process.exit(ok ? 0 : 2);
