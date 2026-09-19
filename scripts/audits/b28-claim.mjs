// b28-claim: relay.md 原子认领（tmp+rename+回读确认）——F-PROC-01 制度批
// 逐行前缀替换（无正则——b26 v1 正则自伤教训，b27 形态沿用）
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = 'docs/handoff/relay.md';
const CLAIM = `claim-${Date.now()}-b28`;
const HEARTBEAT = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

const lines = readFileSync(RELAY, 'utf8').split('\n');
let statusDone = false, hbDone = false, claimDone = false, ldOld = false, ldNew = false;
const out = lines.map((line) => {
  if (line === '- status: RUNNING' && !statusDone) { statusDone = true; return line; }
  if (line === '- status: READY' && !statusDone) { statusDone = true; return '- status: RUNNING'; }
  if (line.startsWith('- heartbeat_utc: ') && !hbDone) { hbDone = true; return `- heartbeat_utc: ${HEARTBEAT}`; }
  if (line.startsWith('- claim: ') && !claimDone) { claimDone = true; return `- claim: ${CLAIM}`; }
  if (line.startsWith('- last_dispatch: ')) { ldOld = true; return line; }
  if (line.startsWith('- last_dispatch_utc: ')) { ldNew = true; return line; }
  return line;
}).join('\n');

if (!statusDone || !hbDone || !claimDone || !ldOld || !ldNew) {
  throw new Error(`edit guard failed: status=${statusDone} hb=${hbDone} claim=${claimDone} ldOld=${ldOld} ldNew=${ldNew}`);
}

writeFileSync(`${RELAY}.tmp`, out);
renameSync(`${RELAY}.tmp`, RELAY);

const back = readFileSync(RELAY, 'utf8');
const ok = back.includes(`- claim: ${CLAIM}`) && back.includes('- status: RUNNING');
if (!ok) throw new Error('claim verify failed');
console.log('CLAIM_OK token=' + CLAIM + ' heartbeat=' + HEARTBEAT);
