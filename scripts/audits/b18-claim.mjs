import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const path = 'docs/handoff/relay.md';
const raw = readFileSync(path, 'utf8');

const nowUtc = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const claim = 'claim-1789743426-b18';

const out = raw
  .replace(/^- status: READY$/m, `- status: RUNNING`)
  .replace(/^- claim: -$/m, `- claim: ${claim}`)
  .replace(/^- heartbeat_utc: .*$/m, `- heartbeat_utc: ${nowUtc}`);

// 守卫：三处替换必须各命中一次
for (const marker of ['- status: RUNNING', `- claim: ${claim}`, `- heartbeat_utc: ${nowUtc}`]) {
  if (!out.split('\n').some((l) => l === marker)) {
    console.error(`CLAIM_GUARD_FAIL: ${marker}`);
    process.exit(1);
  }
}

const tmp = `${path}.tmp`;
writeFileSync(tmp, out, 'utf8');
renameSync(tmp, path);

// 回读确认
const back = readFileSync(path, 'utf8');
const ok =
  back.split('\n').includes('- status: RUNNING') &&
  back.split('\n').includes(`- claim: ${claim}`) &&
  back.split('\n').includes(`- heartbeat_utc: ${nowUtc}`) &&
  back.includes('- last_dispatch: 2026-09-18T22:56:11+08:00') &&
  back.includes('- checked_done: 21');
console.log(ok ? `CLAIM_OK ${claim} @ ${nowUtc}` : 'CLAIM_READBACK_FAIL');
process.exit(ok ? 0 : 1);
