// b22 认领探针：relay.md 原子认领（tmp+rename+回读确认）——单文件单目的
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = new URL('../../docs/handoff/relay.md', import.meta.url);
const BOARD = String(readFileSync(RELAY, 'utf8'));
const token = `claim-${Math.floor(Date.now() / 1000)}-b22`;
const nowUtc = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

if (!/^- status: READY$/m.test(BOARD)) {
  console.error('PRECHECK_FAIL: status is not READY');
  process.exit(1);
}
const next = BOARD
  .replace(/^- status: READY$/m, '- status: RUNNING')
  .replace(/^- claim: .*$/m, `- claim: ${token}`)
  .replace(/^- heartbeat_utc: .*$/m, `- heartbeat_utc: ${nowUtc}`);

const tmp = new URL('../../docs/handoff/relay.md.tmp', import.meta.url);
writeFileSync(tmp, next, 'utf8');
renameSync(tmp, RELAY);

const reread = String(readFileSync(RELAY, 'utf8'));
const ok = reread.includes('- status: RUNNING') && reread.includes(`- claim: ${token}`);
console.log(ok ? `CLAIM_OK ${token} heartbeat=${nowUtc}` : 'CLAIM_VERIFY_FAIL');
process.exit(ok ? 0 : 2);
