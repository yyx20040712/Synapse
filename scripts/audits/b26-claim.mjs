// b26-claim: relay.md 原子认领（tmp+rename+回读确认）——F-EXPORT-01 批
// v2: 逐行前缀替换（无正则——v1 正则 + 未转义教训自伤，板面半 claim 态由本版修复）
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = 'docs/handoff/relay.md';
const CLAIM = 'claim-1789777255-b26';
const HEARTBEAT = '2026-09-19T00:24:30Z';

const lines = readFileSync(RELAY, 'utf8').split('\n');
let statusDone = false, hbDone = false, claimDone = false, ldSeen = false;
const out = lines.map((line) => {
  if (line === '- status: RUNNING' && !statusDone) { statusDone = true; return line; }
  if (line === '- status: READY' && !statusDone) { statusDone = true; return '- status: RUNNING'; }
  if (line.startsWith('- heartbeat_utc: ') && !hbDone) { hbDone = true; return `- heartbeat_utc: ${HEARTBEAT}`; }
  if (line.startsWith('- claim: ') && !claimDone) { claimDone = true; return `- claim: ${CLAIM}`; }
  if (line.startsWith('- last_dispatch: ')) { ldSeen = true; return line; }
  return line;
}).join('\n');

if (!statusDone || !hbDone || !claimDone || !ldSeen) {
  throw new Error(`edit guard failed: status=${statusDone} hb=${hbDone} claim=${claimDone} ld=${ldSeen}`);
}

writeFileSync(`${RELAY}.tmp`, out);
renameSync(`${RELAY}.tmp`, RELAY);

const back = readFileSync(RELAY, 'utf8');
const ok = back.includes(`- claim: ${CLAIM}`) && back.includes('- status: RUNNING') && back.includes('- last_dispatch: 2026-09-19T08:20:24+08:00');
if (!ok) throw new Error('claim verify failed');
console.log('CLAIM_OK token=' + CLAIM);
