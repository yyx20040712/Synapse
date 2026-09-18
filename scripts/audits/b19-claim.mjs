// b19 claim: atomic claim of relay.md for batch 19 (F-GEOM-01-G7)
// 保留 last_dispatch 原值；status READY→RUNNING + claim token + 心跳
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = 'docs/handoff/relay.md';
const TMP = 'docs/handoff/relay.md.tmp-claim';
const token = `claim-${Math.floor(Date.now() / 1000)}-b19`;
const nowUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const src = readFileSync(RELAY, 'utf8');
if (!/- status: READY\n/.test(src)) {
  console.error('CLAIM_ABORT: status is not READY');
  process.exit(1);
}
if (!/^  - claim: -$/m.test(src) && !/^- claim: -$/m.test(src)) {
  console.error('CLAIM_ABORT: claim field not "-"');
  process.exit(1);
}
const out = src
  .replace(/^- status: READY$/m, '- status: RUNNING')
  .replace(/^- claim: -$/m, `- claim: ${token}`)
  .replace(/^- heartbeat_utc: .*$/m, `- heartbeat_utc: ${nowUtc}`);
if (out === src) {
  console.error('CLAIM_ABORT: no field changed');
  process.exit(1);
}
writeFileSync(TMP, out, 'utf8');
renameSync(TMP, RELAY);
// 回读确认
const back = readFileSync(RELAY, 'utf8');
const ok = back.includes(`- claim: ${token}`) && back.includes('- status: RUNNING');
console.log(ok ? `CLAIM_OK token=${token} heartbeat=${nowUtc}` : 'CLAIM_VERIFY_FAIL');
process.exit(ok ? 0 : 1);
