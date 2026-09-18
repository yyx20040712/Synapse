// b24 heartbeat refresher: update heartbeat_utc only (claim/status untouched).
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = 'docs/handoff/relay.md';
const TMP = 'docs/handoff/relay.md.tmp';
const src = readFileSync(RELAY, 'utf8');
const utc = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const out = src.replace(/^- heartbeat_utc: .*$/m, `- heartbeat_utc: ${utc}`);
writeFileSync(TMP, out, 'utf8');
renameSync(TMP, RELAY);
console.log(`HEARTBEAT=${readFileSync(RELAY, 'utf8').match(/^- heartbeat_utc: (.*)$/m)[1]}`);
