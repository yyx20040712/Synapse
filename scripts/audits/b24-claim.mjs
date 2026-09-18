// b24 claim probe: atomic-claim relay.md for batch 24 (F-LAYER-01 + F-TIME-01).
// Writes tmp then renames over relay.md; prints the claim line read back.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = 'docs/handoff/relay.md';
const TMP = 'docs/handoff/relay.md.tmp';
const src = readFileSync(RELAY, 'utf8');
const now = new Date();
const utc = now.toISOString().replace(/\.\d+Z$/, 'Z');
const claim = `claim-${Math.floor(now.getTime() / 1000)}-b24`;

const out = src
  .replace(/^- status: .*$/m, '- status: RUNNING')
  .replace(/^- heartbeat_utc: .*$/m, `- heartbeat_utc: ${utc}`)
  .replace(/^- claim: .*$/m, `- claim: ${claim}`);

writeFileSync(TMP, out, 'utf8');
renameSync(TMP, RELAY);

const back = readFileSync(RELAY, 'utf8');
const status = back.match(/^- status: (.*)$/m)[1];
const backClaim = back.match(/^- claim: (.*)$/m)[1];
const lastDispatch = back.match(/^- last_dispatch: (.*)$/m)[1];
console.log(`CLAIM=${claim}`);
console.log(`READBACK_CLAIM=${backClaim}`);
console.log(`READBACK_STATUS=${status}`);
console.log(`LAST_DISPATCH_PRESERVED=${lastDispatch}`);
console.log(`OWNED=${backClaim === claim && status === 'RUNNING' ? 'true' : 'false'}`);
