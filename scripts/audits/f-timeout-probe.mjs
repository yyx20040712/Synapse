// [timeout-directive probe] Verify 20-min cap: undici fetch kills at ~300s (headersTimeout
// default) vs node:http transport survives >300s. Local server delay=400s. ASCII only.
// usage: node scripts/audits/f-timeout-probe.mjs   (repo root cwd; takes ~12 min)
import { createServer } from 'node:http'
import { request as httpRequest } from 'node:http'

const DELAY_MS = 400_000
const TIMEOUT_MS = 1_200_000

const server = createServer((req, res) => {
  if (req.url === '/slow') {
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    }, DELAY_MS)
  } else {
    res.writeHead(404)
    res.end()
  }
})

function postJsonHttp(url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = httpRequest(
      { hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMs) },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
      }
    )
    req.on('error', reject)
    req.end(body)
  })
}

const elapsed = (t0) => `${((Date.now() - t0) / 1000).toFixed(1)}s`

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const url = `http://127.0.0.1:${port}/slow`
const body = JSON.stringify({ probe: true })

console.log(`[probe] server on :${port}, delay=${DELAY_MS}ms, client cap=${TIMEOUT_MS}ms`)

let t0 = Date.now()
try {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(TIMEOUT_MS) })
  console.log(`[armA fetch+undici] OK status=${res.status} elapsed=${elapsed(t0)} <- UNEXPECTED (undici default would not bind)`)
} catch (e) {
  console.log(`[armA fetch+undici] FAIL elapsed=${elapsed(t0)} error=${e.name}:${e.message.slice(0, 80)}`)
}

t0 = Date.now()
try {
  const res = await postJsonHttp(url, body, TIMEOUT_MS)
  console.log(`[armB node:http] OK status=${res.status} body=${res.body} elapsed=${elapsed(t0)}`)
} catch (e) {
  console.log(`[armB node:http] FAIL elapsed=${elapsed(t0)} error=${e.name}:${e.message.slice(0, 80)}`)
}

server.close()
console.log('[probe] done')
