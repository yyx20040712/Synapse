/**
 * [F-DBCAMP-01 DB-3 U2] envelope.codec —— 快照信封组装/验签单源（设计书 §13.6
 * A8 E2E 全文；简报主控裁决③-4）。U3 六闸（闸①结构/闸②HMAC/闸④解密对账）
 * 复用本件同构形态。
 *
 * ── 行为层 ──
 * - 文件字节=完整 envelope 的 canonical JSON（键字母序/无空白/UTF-8/无尾换行）
 *   ——文件即 canonical（U3 闸②重算无二次序列化歧义）。envelope 恒九键：
 *   format_version=1（数据格式版恒整数）/schema_version（导出时刻 user_version）
 *   /snapshot_seq/owner_id/table_counts（九表名→行数——闸①对齐）/payload_sha256
 *   （sha256(明文 payload canonical JSON 字节)，hex 小写）/payload_nonce（12 字节
 *   base64）/payload（AES-256-GCM 密文||16 字节 auth tag 拼接后 base64）/
 *   hmac_sha256（hex 小写——唯一 MAC 面外字段）。
 * - MAC 面=去 hmac_sha256 键后 envelope 的 canonical JSON 字节（payload 以其
 *   base64 字符串形态在场；nonce/table_counts 全入面——§13.6「canonical envelope
 *   全部明文字段+payload 密文，排除 hmac 字段本体」；r2-N4 防自指）。
 * - AAD 面=同构造的 canonical 字节、唯 payload 槽以空串占位（两段面——简报
 *   「AAD=MAC 面」的字面组合含数学循环：GCM tag 入面而面决定 tag，物理不可达
 *   ——实现侧自裁申报在档。安全性不降：payload 篡改由 HMAC 面（payload 字符串
 *   在场）+GCM tag（密文本体入认证）双拦；其余字段在两面同构——重签 HMAC 的
 *   字段搬运卷仍被 GCM AAD 拦）。
 * - 明文 payload（加密前 canonical JSON）={data:{<九表名>:[行对象…]},
 *   deletions:[…], pdf_refs:[…]}——摘要域三件合一（r3-W2 勘正面：闸③「同 sha」
 *   判据同口径）。
 * - HKDF-SHA256 三钥：IKM=sync_key（hex 解码 32 字节）；salt='synapse/dbcamp01/
 *   v1.3'（逐字常数盐——r2-N7）；info='synapse/aes'|'synapse/hmac'|'synapse/blob'；
 *   各 32 字节。三钥分离（GCM 失效不连锁 HMAC）。
 * - AES-256-GCM：nonce 每卷一次随机（量级=导出次数，NIST 2^32 界 7.6 个数量级
 *   余量——§13.6）。确定性契约（INV-D）：同库内容+同 nonce+同 seq→文件字节全等
 *   ——nonce 工厂注入（测试注固定值）。
 * - verifyEnvelope：decodeEnvelope 的薄布尔包装（U2 消费面兼容）；decodeEnvelope
 *   =U3 六闸单源——结构→版本→MAC→GCM 四段细分原因码（R-A）。
 *
 * ── 文化层 ──
 * - node:crypto 现有能力零依赖；纯函数无状态；测试=
 *   tests/unit/services/envelope.codec.test.ts。
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual
} from 'node:crypto'

/** HKDF 常数盐（§13.6 逐字——salt 无秘密性要求，域分离依赖 IKM+info） */
export const HKDF_SALT = 'synapse/dbcamp01/v1.3'

const INFO_AES = 'synapse/aes'
const INFO_HMAC = 'synapse/hmac'
const INFO_BLOB = 'synapse/blob'
const NONCE_BYTES = 12
const GCM_TAG_BYTES = 16

/** 明文 payload 三件（行对象=列名→值全列，repo 读面原样） */
export interface ExportPayload {
  data: Record<string, Array<Record<string, unknown>>>
  deletions: Array<{ seq: number; entity: string; id: string; deleted_at: string }>
  pdf_refs: Array<{ paper_id: string; file_ref: string; blob_id: string }>
}

/** envelope 恒九键（键字母序由 canonical 序列化器落定，对象键序无关） */
export interface SnapshotEnvelope {
  format_version: number
  schema_version: number
  snapshot_seq: number
  owner_id: string
  table_counts: Record<string, number>
  payload_sha256: string
  payload_nonce: string
  payload: string
  hmac_sha256: string
}

/** canonical JSON 序列化：对象键字母序递归+无空白（数组保序）——INV-D 单源 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export interface DerivedKeys {
  encKey: Buffer
  macKey: Buffer
  blobKey: Buffer
}

/** HKDF-SHA256 三钥派生（sync_key=64-hex IKM）——blob_key 供 pdf_refs 标识计算 */
export function deriveKeys(syncKeyHex: string): DerivedKeys {
  const ikm = Buffer.from(syncKeyHex, 'hex')
  return {
    encKey: Buffer.from(hkdfSync('sha256', ikm, HKDF_SALT, INFO_AES, 32)),
    macKey: Buffer.from(hkdfSync('sha256', ikm, HKDF_SALT, INFO_HMAC, 32)),
    blobKey: Buffer.from(hkdfSync('sha256', ikm, HKDF_SALT, INFO_BLOB, 32))
  }
}

/** pdf_refs 标识=HMAC-SHA256(blob_key, papers.sha256) hex——DB 权威哈希列（§13.6） */
export function blobIdOf(blobKey: Buffer, sha256: string): string {
  return createHmac('sha256', blobKey).update(sha256).digest('hex')
}

export interface BuildEnvelopeInput {
  syncKey: string
  schemaVersion: number
  snapshotSeq: number
  ownerId: string
  payload: ExportPayload
  /** nonce 工厂（默认 randomBytes(12)——测试注入固定值锁 INV-D 确定性） */
  makeNonce?: () => Buffer
}

/** MAC 面：去 hmac 键后 envelope（payload 以最终 base64 字符串在场）的 canonical 字节 */
function macFaceBytes(body: Omit<SnapshotEnvelope, 'hmac_sha256'>): Buffer {
  return Buffer.from(canonicalJson(body), 'utf8')
}

/** AAD 面：同构造唯 payload 槽空串占位（两段面——头注行为层自裁申报） */
function aadFaceBytes(body: Omit<SnapshotEnvelope, 'hmac_sha256'>): Buffer {
  return macFaceBytes({ ...body, payload: '' })
}

/** 组装+加密+MAC：返回九键 envelope 对象（文件字节=canonicalJson(envelope)） */
export function buildEnvelope(input: BuildEnvelopeInput): SnapshotEnvelope {
  const plaintext = Buffer.from(canonicalJson(input.payload), 'utf8')
  const keys = deriveKeys(input.syncKey)
  const nonce = input.makeNonce !== undefined ? input.makeNonce() : randomBytes(NONCE_BYTES)
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`payload_nonce 须 ${NONCE_BYTES} 字节（实际 ${nonce.length}）`)
  }
  const tableCounts: Record<string, number> = {}
  for (const [table, rows] of Object.entries(input.payload.data)) {
    tableCounts[table] = rows.length
  }
  const cipher = createCipheriv('aes-256-gcm', keys.encKey, nonce, { authTagLength: GCM_TAG_BYTES })
  cipher.setAAD(aadFaceBytes({
    format_version: 1,
    schema_version: input.schemaVersion,
    snapshot_seq: input.snapshotSeq,
    owner_id: input.ownerId,
    table_counts: tableCounts,
    payload_sha256: createHash('sha256').update(plaintext).digest('hex'),
    payload_nonce: nonce.toString('base64'),
    payload: ''
  }))
  const sealed = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
  const body: Omit<SnapshotEnvelope, 'hmac_sha256'> = {
    format_version: 1,
    schema_version: input.schemaVersion,
    snapshot_seq: input.snapshotSeq,
    owner_id: input.ownerId,
    table_counts: tableCounts,
    payload_sha256: createHash('sha256').update(plaintext).digest('hex'),
    payload_nonce: nonce.toString('base64'),
    payload: sealed.toString('base64')
  }
  return {
    ...body,
    hmac_sha256: createHmac('sha256', keys.macKey).update(macFaceBytes(body)).digest('hex')
  }
}

/** envelope 文件字节（canonical JSON——文件即 canonical） */
export function envelopeToBytes(envelope: SnapshotEnvelope): Buffer {
  return Buffer.from(canonicalJson(envelope), 'utf8')
}

function sameAsciiHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}

/** [F-DBCAMP-01 DB-3 U3] decodeEnvelope 结果（R-A——闸①②④原因码细分；
 * hash_mismatch/schema_newer/counts_mismatch=service 层产出：codec 不知本库
 * user_version/水位，分层如故） */
export type DecodeEnvelopeResult =
  | { ok: true; body: SnapshotEnvelope; plaintext: Buffer }
  | { ok: false; reason: 'struct_invalid' | 'version_mismatch' | 'hmac_fail' | 'decrypt_fail' }

/** base64 严格形态（Node Buffer.from 解码宽松吞非法字符——闸①显式拒非 base64） */
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * 解码+验签：结构（形状/必填键含 hmac 键/base64/nonce=12B/密文≥tag 长）→
 * 版本（format_version!==1=version_mismatch——闸①细分）→MAC（timingSafeEqual
 * 沿承）→GCM 解密。合法卷回 body 九键+明文字节（U3 六闸消费单源）。
 */
export function decodeEnvelope(envelope: unknown, syncKeyHex: string): DecodeEnvelopeResult {
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { ok: false, reason: 'struct_invalid' }
  }
  const obj = envelope as Record<string, unknown>
  const { hmac_sha256: mac, ...rest } = obj
  if (typeof mac !== 'string') return { ok: false, reason: 'struct_invalid' }
  const body = rest as unknown as Omit<SnapshotEnvelope, 'hmac_sha256'>
  if (
    typeof body.format_version !== 'number' ||
    typeof body.schema_version !== 'number' ||
    typeof body.snapshot_seq !== 'number' ||
    typeof body.owner_id !== 'string' ||
    body.table_counts === null ||
    typeof body.table_counts !== 'object' ||
    Array.isArray(body.table_counts) ||
    typeof body.payload_sha256 !== 'string' ||
    typeof body.payload_nonce !== 'string' ||
    typeof body.payload !== 'string' ||
    !BASE64_RE.test(body.payload_nonce) ||
    !BASE64_RE.test(body.payload)
  ) {
    return { ok: false, reason: 'struct_invalid' }
  }
  const nonce = Buffer.from(body.payload_nonce, 'base64')
  const sealed = Buffer.from(body.payload, 'base64')
  if (nonce.length !== NONCE_BYTES || sealed.length < GCM_TAG_BYTES) {
    return { ok: false, reason: 'struct_invalid' }
  }
  if (body.format_version !== 1) return { ok: false, reason: 'version_mismatch' }
  const keys = deriveKeys(syncKeyHex)
  const expected = createHmac('sha256', keys.macKey).update(macFaceBytes(body)).digest('hex')
  if (!sameAsciiHex(mac, expected)) return { ok: false, reason: 'hmac_fail' }
  try {
    const tag = sealed.subarray(sealed.length - GCM_TAG_BYTES)
    const ct = sealed.subarray(0, sealed.length - GCM_TAG_BYTES)
    const decipher = createDecipheriv('aes-256-gcm', keys.encKey, nonce, { authTagLength: GCM_TAG_BYTES })
    decipher.setAAD(aadFaceBytes(body))
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
    return { ok: true, body: { ...body, hmac_sha256: mac }, plaintext }
  } catch {
    return { ok: false, reason: 'decrypt_fail' }
  }
}

/**
 * 验签：decodeEnvelope 的薄布尔包装（U2 消费面兼容——既有测试零改动且行为
 * 不变；闸②④全验通过才 true）。
 */
export function verifyEnvelope(envelope: unknown, syncKeyHex: string): boolean {
  return decodeEnvelope(envelope, syncKeyHex).ok
}
