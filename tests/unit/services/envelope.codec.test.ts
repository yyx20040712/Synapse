/**
 * [F-DBCAMP-01 DB-3 U2] envelope.codec 锁定测试（always-active）。
 *
 * 覆盖（简报③-4/③-8.3）：canonical 序列化规则（键字母序/无空白/无尾换行/
 * UTF-8 中文值原样）；HKDF 三钥=独立 hkdfSync 复算对账（α≠β≠γ 三钥互异）；
 * MAC 面=去 hmac 键 canonical 字节（构造后重算仍等——排除 hmac 字段自指）；
 * verifyEnvelope 对合法卷恒 true+对篡改卷恒 false；AAD 面=MAC 面（GCM 认证
 * 与 HMAC 同面——重签 HMAC 的字段搬运卷仍被 GCM 拦）。
 */
import { createHmac, hkdfSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  HKDF_SALT,
  buildEnvelope,
  canonicalJson,
  decodeEnvelope,
  deriveKeys,
  envelopeToBytes,
  verifyEnvelope
} from '../../../src/main/services/snapshot/envelope.codec'

const SYNC_KEY = 'ab'.repeat(32)
const FIXED_NONCE = Buffer.from('0123456789ab', 'utf8')

function makePayload(): {
  data: Record<string, Array<Record<string, unknown>>>
  deletions: Array<{ seq: number; entity: string; id: string; deleted_at: string }>
  pdf_refs: Array<{ paper_id: string; file_ref: string; blob_id: string }>
} {
  return {
    data: {
      papers: [{ id: 'p-1', title: '中文文献', updated_at: '2026-01-01T00:00:00.000Z' }],
      collections: [],
      tags: [],
      paper_tags: [],
      notes: [{ id: 'n-1', content_md: '絮凝剂', updated_at: 't' }],
      annotations: [],
      lineage_nodes: [],
      lineage_edges: [],
      lineage_graph_meta: []
    },
    deletions: [{ seq: 1, entity: 'papers', id: 'p-x', deleted_at: '2026-01-02T03:04:05.678Z' }],
    pdf_refs: [{ paper_id: 'p-1', file_ref: 'f/p-1.pdf', blob_id: 'cd'.repeat(32) }]
  }
}

function buildFixture(): ReturnType<typeof buildEnvelope> {
  return buildEnvelope({
    syncKey: SYNC_KEY,
    schemaVersion: 21,
    snapshotSeq: 1,
    ownerId: '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b',
    payload: makePayload(),
    makeNonce: () => FIXED_NONCE
  })
}

describe('F-DBCAMP-01 DB-3 U2 envelope.codec —— canonical+HKDF 三钥+AES-GCM+HMAC', () => {
  it('canonical 规则：键字母序+无空白+无尾换行+UTF-8 中文值原样（非转义）', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
    expect(canonicalJson({ z: { d: 1, c: [3, 1, 2] }, a: 'x' })).toBe('{"a":"x","z":{"c":[3,1,2],"d":1}}')
    expect(canonicalJson({ k: '文献' })).toBe('{"k":"文献"}')
    expect(Buffer.from(canonicalJson({ k: '文献' }), 'utf8')).toEqual(Buffer.from('{"k":"文献"}', 'utf8'))
    const env = buildFixture()
    const text = envelopeToBytes(env).toString('utf8')
    expect(text.endsWith('}')).toBe(true)
    expect(text.endsWith('\n')).toBe(false)
    expect(text).not.toContain(': ')
    expect(text).not.toContain(', ')
    expect(text).not.toContain('\n')
    // UTF-8 中文值原样断言落在明文 payload canonical 面（envelope 恒密文——
    // 中文不转义为 \uXXXX、字节=UTF-8 直编）
    const payloadText = canonicalJson(makePayload())
    expect(payloadText).toContain('中文文献')
    expect(payloadText).not.toContain('\\u')
    expect(Buffer.from(payloadText, 'utf8')).toEqual(Buffer.from(payloadText, 'utf8'))
  })

  it('HKDF 三钥=独立 hkdfSync 复算对账（salt 逐字 synapse/dbcamp01/v1.3+三 info+三钥互异）', () => {
    const ikm = Buffer.from(SYNC_KEY, 'hex')
    expect(Buffer.from(hkdfSync('sha256', ikm, HKDF_SALT, 'synapse/aes', 32)).toString('hex')).toBe(
      deriveKeys(SYNC_KEY).encKey.toString('hex')
    )
    expect(Buffer.from(hkdfSync('sha256', ikm, HKDF_SALT, 'synapse/hmac', 32)).toString('hex')).toBe(
      deriveKeys(SYNC_KEY).macKey.toString('hex')
    )
    expect(Buffer.from(hkdfSync('sha256', ikm, HKDF_SALT, 'synapse/blob', 32)).toString('hex')).toBe(
      deriveKeys(SYNC_KEY).blobKey.toString('hex')
    )
    expect(HKDF_SALT).toBe('synapse/dbcamp01/v1.3')
    const { encKey, macKey, blobKey } = deriveKeys(SYNC_KEY)
    expect(encKey.equals(macKey)).toBe(false)
    expect(encKey.equals(blobKey)).toBe(false)
    expect(macKey.equals(blobKey)).toBe(false)
  })

  it('MAC 面=去 hmac 键 canonical 字节（排除自指）：构造后以 macKey 独立重算仍等', () => {
    const env = buildFixture()
    const { hmac_sha256: _mac, ...rest } = env
    expect(_mac).toMatch(/^[0-9a-f]{64}$/)
    const face = Buffer.from(canonicalJson(rest), 'utf8')
    const recomputed = createHmac('sha256', deriveKeys(SYNC_KEY).macKey).update(face).digest('hex')
    expect(recomputed).toBe(env.hmac_sha256)
  })

  it('envelope 字段九键钉死+table_counts=实载行数+format_version 恒 1+payload_nonce base64', () => {
    const env = buildFixture()
    expect(Object.keys(env).sort()).toEqual(
      [
        'format_version',
        'hmac_sha256',
        'owner_id',
        'payload',
        'payload_nonce',
        'payload_sha256',
        'schema_version',
        'snapshot_seq',
        'table_counts'
      ].sort()
    )
    expect(env.format_version).toBe(1)
    expect(env.schema_version).toBe(21)
    expect(env.snapshot_seq).toBe(1)
    expect(env.table_counts).toEqual({
      papers: 1,
      collections: 0,
      tags: 0,
      paper_tags: 0,
      notes: 1,
      annotations: 0,
      lineage_nodes: 0,
      lineage_edges: 0,
      lineage_graph_meta: 0
    })
    expect(env.payload_nonce).toBe(FIXED_NONCE.toString('base64'))
    expect(env.payload_sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('verifyEnvelope 合法卷恒 true（GCM 认证+MAC 双过）', () => {
    const env = buildFixture()
    expect(verifyEnvelope(env, SYNC_KEY)).toBe(true)
  })

  it('AAD 面=MAC 面：重签 HMAC 的字段搬运卷被 GCM 认证拦（owner 换值+MAC 重算→仍 false）', () => {
    const env = buildFixture()
    const tampered = { ...env, owner_id: '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2c' }
    const { hmac_sha256: _drop, ...rest } = tampered
    tampered.hmac_sha256 = createHmac('sha256', deriveKeys(SYNC_KEY).macKey)
      .update(Buffer.from(canonicalJson(rest), 'utf8'))
      .digest('hex')
    expect(verifyEnvelope(tampered, SYNC_KEY)).toBe(false)
  })

  it('verifyEnvelope 缺 hmac 字段/密钥错配恒 false', () => {
    const env = buildFixture()
    const { hmac_sha256: _mac, ...stripped } = env
    expect(verifyEnvelope(stripped, SYNC_KEY)).toBe(false)
    expect(verifyEnvelope(env, 'cd'.repeat(32))).toBe(false)
  })

  // [F-DBCAMP-01 DB-3 U3] decodeEnvelope 原因码细分（R-A——闸①②④分层判据；
  // hash_mismatch/schema_newer/counts_mismatch=service 层产出，codec 不知本库
  // user_version/水位）。密文<tag 长/nonce≠12B/非 base64=struct_invalid（闸①）
  // ；format_version≠1=version_mismatch（闸①细分——版本≠当前精确拒收）；
  // MAC 不符=hmac_fail（闸②）；GCM 认证失败=decrypt_fail（闸④——r3-N8 细分，
  // ≠hash_mismatch）。
  it('decodeEnvelope 合法卷 ok：body 九键+plaintext=canonical payload 字节（重序列化对账恒等）', () => {
    const env = buildFixture()
    const dec = decodeEnvelope(env, SYNC_KEY)
    expect(dec.ok).toBe(true)
    if (!dec.ok) throw new Error('unreachable')
    expect(dec.body).toEqual(env)
    const text = dec.plaintext.toString('utf8')
    expect(canonicalJson(JSON.parse(text))).toBe(text)
    expect(text).toContain('中文文献')
  })

  it('decodeEnvelope 四分支原因码逐码：struct_invalid（剥 hmac 键/nonce≠12B/密文<tag 长/非 base64）/version_mismatch（format_version=2）/hmac_fail（owner 换值）/decrypt_fail（密文翻转+MAC 重签——r3-N8 构造）', () => {
    const env = buildFixture()
    const { hmac_sha256: _drop, ...stripped } = env
    void _drop
    expect(decodeEnvelope(stripped, SYNC_KEY)).toMatchObject({ ok: false, reason: 'struct_invalid' })
    // nonce≠12B：结构检查先于 MAC（闸①），无需重签
    expect(decodeEnvelope({ ...env, payload_nonce: Buffer.alloc(8).toString('base64') }, SYNC_KEY)).toMatchObject({
      ok: false,
      reason: 'struct_invalid'
    })
    // 密文<tag 长（合法 base64 但不足 16 字节 tag）
    expect(decodeEnvelope({ ...env, payload: Buffer.alloc(8).toString('base64') }, SYNC_KEY)).toMatchObject({
      ok: false,
      reason: 'struct_invalid'
    })
    // 非 base64 形态（Node 解码宽松吞非法字符——显式形态校验）
    expect(decodeEnvelope({ ...env, payload: '!!not-base64!!' }, SYNC_KEY)).toMatchObject({
      ok: false,
      reason: 'struct_invalid'
    })
    // version_mismatch：format_version≠当前精确值（结构先行——MAC 陈旧不影响分支）
    expect(decodeEnvelope({ ...env, format_version: 2 }, SYNC_KEY)).toMatchObject({
      ok: false,
      reason: 'version_mismatch'
    })
    // hmac_fail：owner 字段换值（跨库字段搬运——MAC 面含 owner_id）
    expect(decodeEnvelope({ ...env, owner_id: '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2c' }, SYNC_KEY)).toMatchObject({
      ok: false,
      reason: 'hmac_fail'
    })
    // decrypt_fail：密文首字符翻转（flipChar 必异——U2 N-6 先例）+持钥重签 MAC
    // （GCM 认证失败≠hash_mismatch：解密成功后 sha 对账属 service 层）
    const flipChar = env.payload.startsWith('A') ? 'B' : 'A'
    const moved = { ...env, payload: `${flipChar}${env.payload.slice(1)}` }
    const { hmac_sha256: _m, ...rest } = moved
    void _m
    moved.hmac_sha256 = createHmac('sha256', deriveKeys(SYNC_KEY).macKey)
      .update(Buffer.from(canonicalJson(rest), 'utf8'))
      .digest('hex')
    expect(decodeEnvelope(moved, SYNC_KEY)).toMatchObject({ ok: false, reason: 'decrypt_fail' })
  })
})
