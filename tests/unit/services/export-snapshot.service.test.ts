/**
 * [F-DBCAMP-01 DB-3 U2] export-snapshot.service 锁定测试（always-active——
 * 真库夹具+createRepos 全真依赖）。
 *
 * 覆盖（简报③-5/③-8.2）：envelope 确定性（同库+注 nonce→字节全等；异 nonce→
 * payload/hmac 变、明文字段不变）；tamper 红证三则（payload 改一字节/owner_id
 * 换值/table_counts 改数→verifyEnvelope 恒 false）；table_counts=实载行数；
 * seq 语义（首导 1/构建取消零耗/落盘 commit 后再导=2）；pdf_refs blob_id=
 * HMAC 独立复算手算对账（不经实现内部）；deletions 全量含 021 触发器级联账
 * （r4 勘正前提行为锁）；importPeerKey 三态（非法/自导入拒/合法）+bundle 101 字符。
 */
import { createDecipheriv, createHmac, hkdfSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createExportSnapshotService } from '../../../src/main/services/snapshot/export-snapshot.service'
import { verifyEnvelope } from '../../../src/main/services/snapshot/envelope.codec'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'
import { APP_META_KEYS } from '../../../src/shared/models/app-meta'

type Db = ReturnType<typeof createTestDb>

const OWNER = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
const PEER = '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'

interface Fixture {
  db: Db
  service: ReturnType<typeof createExportSnapshotService>
}

/** 组装：真库+ensureIdentity（镜像 bootstrap 装配序）+可选 nonce 工厂 */
function makeFixture(makeNonce?: () => Buffer): Fixture {
  const db = createTestDb()
  const repos = createRepos(db)
  repos.appMeta.ensureIdentity()
  repos.snapshot.ensureSyncKey()
  // 身份固定为已知 owner（bundle/断言可算）
  db.prepare(`UPDATE app_meta SET value = ? WHERE key = ?`).run(OWNER, APP_META_KEYS.ownerId)
  const service = createExportSnapshotService({ repos, makeNonce })
  return { db, service }
}

function seedPaper(db: Db, id: string, sha: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't0', '2026-01-01T00:00:00.000Z')`
  ).run(id, `f/${id}.pdf`, sha, `文献${id}`)
}

/** 数据夹具：2 文献+标签挂接+note/annotation+图节点边+已删 1 文献（级联账在场） */
function seedData(db: Db): void {
  seedPaper(db, 'p-1', `a1${'x'.repeat(60)}`)
  seedPaper(db, 'p-2', `b2${'y'.repeat(60)}`)
  db.prepare(`INSERT INTO tags (id, name) VALUES ('t-1', '絮凝')`).run()
  db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1', 't-1')`).run()
  db.prepare(
    `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-1', 'p-1', 't', 't')`
  ).run()
  db.prepare(
    `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
     VALUES ('a-1', 'p-1', 0, 'highlight', '0000:01', 't', 't')`
  ).run()
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, created_at, updated_at)
     VALUES ('ln-1', 'p-1', '节点一', 't', 't')`
  ).run()
  db.prepare(
    `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-2', '主题节点', 't', 't')`
  ).run()
  db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
     VALUES ('le-1', 'ln-1', 'ln-2', 't', 't')`
  ).run()
  // 删 p-2（带 1 note 级联）——deletions 全量含级联账的夹具前提
  db.prepare(
    `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-2', 'p-2', 't', 't')`
  ).run()
  db.prepare(`DELETE FROM papers WHERE id='p-2'`).run()
}

/** 测试内独立 canonical 序列化（键字母序递归——独立于实现，不 import 内部） */
function testCanonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(testCanonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${testCanonical(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** 测试内独立解密（不经实现内部：hkdfSync 复算三钥+GCM 解开 payload——AAD=
 *  去 hmac 键且 payload 槽空串占位的 canonical 面，测试侧独立复刻同一规则） */
function decryptPayload(
  envelope: Record<string, unknown>,
  syncKey: string
): { data: Record<string, unknown[]>; deletions: Array<{ entity: string }>; pdf_refs: Array<{ paper_id: string; file_ref: string; blob_id: string }> } {
  const encKey = Buffer.from(hkdfSync('sha256', Buffer.from(syncKey, 'hex'), 'synapse/dbcamp01/v1.3', 'synapse/aes', 32))
  const nonce = Buffer.from(String(envelope.payload_nonce), 'base64')
  const sealed = Buffer.from(String(envelope.payload), 'base64')
  const tag = sealed.subarray(sealed.length - 16)
  const ct = sealed.subarray(0, sealed.length - 16)
  const { hmac_sha256: _mac, ...rest } = envelope
  void _mac
  const aad = Buffer.from(testCanonical({ ...rest, payload: '' }), 'utf8')
  const d = createDecipheriv('aes-256-gcm', encKey, nonce, { authTagLength: 16 })
  d.setAAD(aad)
  d.setAuthTag(tag)
  const pt = Buffer.concat([d.update(ct), d.final()]).toString('utf8')
  return JSON.parse(pt) as {
    data: Record<string, unknown[]>
    deletions: Array<{ entity: string }>
    pdf_refs: Array<{ paper_id: string; file_ref: string; blob_id: string }>
  }
}

describe('F-DBCAMP-01 DB-3 U2 export-snapshot.service —— 纯构建导出面', () => {
  it('getSyncKeyInfo：bundle=<owner>:<sync_key> 恒 101 字符（36+1+64）+三键齐', () => {
    const { db, service } = makeFixture()
    const info = service.getSyncKeyInfo()
    expect(info.ownerId).toBe(OWNER)
    expect(info.syncKey).toMatch(/^[0-9a-f]{64}$/)
    expect(info.bundle).toBe(`${info.ownerId}:${info.syncKey}`)
    expect(info.bundle).toHaveLength(101)
    db.close()
  })

  it('envelope 确定性（INV-D）：同库+注同 nonce→文件字节全等；异 nonce→payload/hmac 变、明文字段不变', () => {
    const { db, service } = makeFixture(() => Buffer.from('aaaaaaaaaaaa', 'utf8'))
    seedData(db)
    const a = service.exportToBuffer()
    const b = service.exportToBuffer()
    expect(Buffer.compare(a.bytes, b.bytes)).toBe(0)
    const other = createExportSnapshotService(
      {
        repos: createRepos(db),
        makeNonce: () => Buffer.from('bbbbbbbbbbbb', 'utf8')
      }
    )
    const c = other.exportToBuffer()
    const envA = JSON.parse(a.bytes.toString('utf8')) as Record<string, unknown>
    const envC = JSON.parse(c.bytes.toString('utf8')) as Record<string, unknown>
    expect(envA.payload).not.toBe(envC.payload)
    expect(envA.hmac_sha256).not.toBe(envC.hmac_sha256)
    expect(envA.payload_nonce).not.toBe(envC.payload_nonce)
    expect(envA.payload_sha256).toBe(envC.payload_sha256)
    expect(envA.owner_id).toBe(envC.owner_id)
    expect(envA.table_counts).toEqual(envC.table_counts)
    expect(envA.format_version).toBe(envC.format_version)
    expect(envA.schema_version).toBe(envC.schema_version)
    db.close()
  })

  it('tamper 红证三则：payload 改一字节/owner_id 换值/table_counts 改数→verifyEnvelope 恒 false', () => {
    const { db, service } = makeFixture(() => Buffer.from('cccccccccccc', 'utf8'))
    seedData(db)
    const built = service.exportToBuffer()
    const env = JSON.parse(built.bytes.toString('utf8')) as {
      payload: string
      owner_id: string
      table_counts: Record<string, number>
    }
    const syncKey = db
      .prepare('SELECT value FROM app_meta WHERE key = ?')
      .get(APP_META_KEYS.syncKey) as { value: string }
    expect(verifyEnvelope(env, syncKey.value)).toBe(true)
    // [回炉 R12b] 首字节翻转为与现值必异的 Base64 字母（消「恰 A 开头退化为
    // 恒等篡改」的假红面——mutation 实演过该形态）
    const flipChar = env.payload.startsWith('A') ? 'B' : 'A'
    const tamperedPayload = { ...env, payload: `${flipChar}${env.payload.slice(1)}` }
    expect(verifyEnvelope(tamperedPayload, syncKey.value)).toBe(false)
    const tamperedOwner = { ...env, owner_id: PEER }
    expect(verifyEnvelope(tamperedOwner, syncKey.value)).toBe(false)
    const tamperedCounts = { ...env, table_counts: { ...env.table_counts, papers: 99 } }
    expect(verifyEnvelope(tamperedCounts, syncKey.value)).toBe(false)
    db.close()
  })

  it('table_counts=实载行数（九键恰 §13.7 九表）+seq 语义：首导 1/构建取消零耗/commit 后再导=2', () => {
    const { db, service } = makeFixture(() => Buffer.from('dddddddddddd', 'utf8'))
    seedData(db)
    const first = service.exportToBuffer()
    expect(first.snapshotSeq).toBe(1)
    expect(first.tableCounts).toEqual({
      papers: 1,
      collections: 1,
      tags: 1,
      paper_tags: 1,
      notes: 1,
      annotations: 1,
      lineage_nodes: 2,
      lineage_edges: 1,
      lineage_graph_meta: 1
    })
    // 取消零耗：构建不 commit，再构建仍 seq=1
    expect(service.exportToBuffer().snapshotSeq).toBe(1)
    service.commitExport(1)
    expect(service.exportToBuffer().snapshotSeq).toBe(2)
    db.close()
  })

  it('pdf_refs：paper_id 序+file_ref 随卷+blob_id=HMAC(blob_key, sha256) 独立手算对账', () => {
    const { db, service } = makeFixture(() => Buffer.from('eeeeeeeeeeee', 'utf8'))
    seedData(db)
    seedPaper(db, 'p-0', `c0${'z'.repeat(60)}`)
    // [回炉 R8] 解耦锚：p-9 updated_at 最早（repo 读面 (updated_at,id) 序=行首）
    // ——pdf_refs 恒 paper_id 码元序（[p-0,p-1,p-9]，摘显式排序即红）
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
       VALUES ('p-9', 'f/p-9.pdf', 'd9${'w'.repeat(60)}', '文献p-9', 't0', '2020-01-01T00:00:00.000Z')`
    ).run()
    const built = service.exportToBuffer()
    const env = JSON.parse(built.bytes.toString("utf8")) as Record<string, unknown>
    const syncKey = (
      db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as { value: string }
    ).value
    const payload = decryptPayload(env, syncKey)
    expect(payload.pdf_refs.map((r) => r.paper_id)).toEqual(['p-0', 'p-1', 'p-9'])
    expect(payload.pdf_refs[1]!.file_ref).toBe('f/p-1.pdf')
    const blobKey = Buffer.from(
      hkdfSync('sha256', Buffer.from(syncKey, 'hex'), 'synapse/dbcamp01/v1.3', 'synapse/blob', 32)
    )
    const expected = createHmac('sha256', blobKey).update(`a1${'x'.repeat(60)}`).digest('hex')
    expect(payload.pdf_refs[1]!.blob_id).toBe(expected)
    db.close()
  })

  it('deletions 全量含级联账（r4 勘正前提行为锁）：删 p-2→papers+notes 两事件在场（§13.1 超集）', () => {
    const { db, service } = makeFixture(() => Buffer.from('ffffffffffff', 'utf8'))
    seedData(db)
    const built = service.exportToBuffer()
    const env = JSON.parse(built.bytes.toString("utf8")) as Record<string, unknown>
    const syncKey = (
      db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as { value: string }
    ).value
    const payload = decryptPayload(env, syncKey)
    const entities = payload.deletions.map((d) => d.entity)
    expect(entities).toContain('papers')
    expect(entities).toContain('notes')
    expect(payload.deletions).toHaveLength(2)
    db.close()
  })

  it('importPeerKey 三态：非法串=INVALID_REQUEST 中文消息；本库自身=拒；合法异库=落库+回 ownerId', () => {
    const { db, service } = makeFixture()
    const syncKey = service.getSyncKeyInfo().syncKey
    expect(() => service.importPeerKey('not-a-bundle')).toThrow(/同步密钥/)
    expect(() => service.importPeerKey(`${OWNER}:${syncKey}`)).toThrow(/本库自身/)
    const r = service.importPeerKey(`${PEER}:${'cd'.repeat(32)}`)
    expect(r).toEqual({ ownerId: PEER })
    expect(service.listPeerKeys().map((p) => p.ownerId)).toEqual([PEER])
    expect(service.removePeerKey(PEER)).toBe(true)
    db.close()
  })
})
