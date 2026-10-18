/**
 * [F-DBCAMP-01 DB-3 U3] import-snapshot.service 锁定测试（核心件——§13.8 演练
 * 八+⑨+多源+种子行+三拒收补充；双库夹具 X 源/Y 目标各真库+repos+service）。
 *
 * 真相源=设计书 §13.2（六闸+内序决策表+A7 细分+拒收可见性）+§13.4（水位）+
 * §13.6（canonical/摘要域）+§13.8 U3 断言集。always-active；异 owner 双库形态
 * （源库 X 导出→演练库 Y 导入——self_reimport 拒收一致性）；④/13/14/15 的
 * 构造法=测试内持源库 sync_key 直调 buildEnvelope/手签（r3-N8）。
 */
import { createCipheriv, createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createImportSnapshotService } from '../../../src/main/services/snapshot/import-snapshot.service'
import { createExportSnapshotService } from '../../../src/main/services/snapshot/export-snapshot.service'
import {
  buildEnvelope,
  canonicalJson,
  deriveKeys,
  envelopeToBytes,
  type SnapshotEnvelope
} from '../../../src/main/services/snapshot/envelope.codec'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'
import { APP_META_KEYS, RECV_SEQ_PREFIX } from '../../../src/shared/models/app-meta'

type Db = ReturnType<typeof createTestDb>
type Repos = ReturnType<typeof createRepos>
type Importer = ReturnType<typeof createImportSnapshotService>
type Exporter = ReturnType<typeof createExportSnapshotService>

const OWNER_X = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
const OWNER_Y = '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'
const OWNER_Z = '5e4d0c26-7f8a-4b3c-9d4e-1a2b3c4d5e6f'

interface Side {
  owner: string
  db: Db
  repos: Repos
  exporter: Exporter
  importer: Importer
}

/** 组装：真库+身份固定+固定 nonce（INV-D 确定性——卷字节可复算） */
function makeSide(owner: string): Side {
  const db = createTestDb()
  const repos = createRepos(db)
  repos.appMeta.ensureIdentity()
  repos.snapshot.ensureSyncKey()
  db.prepare('UPDATE app_meta SET value = ? WHERE key = ?').run(owner, APP_META_KEYS.ownerId)
  const makeNonce = () => Buffer.from('0123456789ab', 'utf8')
  return {
    owner,
    db,
    repos,
    exporter: createExportSnapshotService({ repos, makeNonce }),
    importer: createImportSnapshotService({ repos })
  }
}

function syncKeyOf(side: Side): string {
  return (side.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as { value: string })
    .value
}

/** 接收端预导入发送端密钥（§13.9-2 a 案面） */
function pair(receiver: Side, sender: Side): void {
  receiver.repos.snapshot.setPeerKey(sender.owner, syncKeyOf(sender))
}

/** 导出并落账计数（=IPC 落盘成功后 commit 语义） */
function exportVol(side: Side): Buffer {
  const built = side.exporter.exportToBuffer()
  side.exporter.commitExport(built.snapshotSeq)
  return built.bytes
}

function seedPaper(db: Db, id: string, title: string, updatedAt: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, abstract, authors_json, source, enrich_status,
     added_at, updated_at, folder_id) VALUES (?, ?, ?, ?, '絮凝剂投加量优化', '[]', 'manual', 'manual', 't0', ?, '__main__')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, title, updatedAt)
}

function seedNote(db: Db, id: string, paperId: string, content: string, updatedAt: string): void {
  db.prepare(
    `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at) VALUES (?, ?, '', ?, 't', ?)`
  ).run(id, paperId, content, updatedAt)
}

function paperCount(db: Db, id: string): number {
  return (db.prepare('SELECT COUNT(*) c FROM papers WHERE id = ?').get(id) as { c: number }).c
}

function recvSeqOf(db: Db, owner: string): number | undefined {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(`${RECV_SEQ_PREFIX}${owner}`) as
    | { value: string }
    | undefined
  return row === undefined ? undefined : Number.parseInt(row.value, 10)
}

/** 最小合法 payload（十表键齐——结构可过闸④；行集由调用方注入。
 *  [F-VISFB-61] +floating_notes（TABLE_SPECS 九键→十表） */
function emptyPayload(): {
  data: Record<string, Array<Record<string, unknown>>>
  deletions: Array<{ seq: number; entity: string; id: string; deleted_at: string }>
  pdf_refs: Array<{ paper_id: string; file_ref: string; blob_id: string }>
} {
  return {
    data: {
      papers: [],
      collections: [],
      tags: [],
      paper_tags: [],
      notes: [],
      annotations: [],
      lineage_nodes: [],
      lineage_edges: [],
      lineage_graph_meta: [],
      floating_notes: []
    },
    deletions: [],
    pdf_refs: []
  }
}

/**
 * 测试内手签卷（r3-N8 构造法——MAC+GCM 内部自洽唯指定面失真；出口闸④才能
 * 拦）：fakeCounts→counts_mismatch / fakeSha→hash_mismatch。镜像 codec 两段面
 * （AAD=payload 槽空串占位；MAC 面=payload base64 在场）——独立于实现内部。
 */
function handCraftedEnvelope(opts: {
  syncKey: string
  ownerId: string
  snapshotSeq: number
  payloadText: string
  fakeCounts?: Record<string, number>
  fakeSha?: string
}): Buffer {
  const keys = deriveKeys(opts.syncKey)
  const plaintext = Buffer.from(opts.payloadText, 'utf8')
  const parsed = JSON.parse(opts.payloadText) as { data: Record<string, unknown[]> }
  const counts: Record<string, number> = {}
  for (const k of Object.keys(parsed.data)) counts[k] = (parsed.data[k] ?? []).length
  const body = {
    format_version: 1,
    schema_version: 21,
    snapshot_seq: opts.snapshotSeq,
    owner_id: opts.ownerId,
    table_counts: opts.fakeCounts ?? counts,
    payload_sha256: opts.fakeSha ?? createHash('sha256').update(plaintext).digest('hex'),
    payload_nonce: Buffer.from('0123456789ab', 'utf8').toString('base64'),
    payload: ''
  }
  const aad = Buffer.from(canonicalJson(body), 'utf8')
  const cipher = createCipheriv('aes-256-gcm', keys.encKey, Buffer.from('0123456789ab', 'utf8'), { authTagLength: 16 })
  cipher.setAAD(aad)
  const sealed = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
  const full: SnapshotEnvelope = {
    ...body,
    payload: sealed.toString('base64'),
    hmac_sha256: createHmac('sha256', keys.macKey)
      .update(Buffer.from(canonicalJson({ ...body, payload: sealed.toString('base64') }), 'utf8'))
      .digest('hex')
  }
  return envelopeToBytes(full)
}

/** [回炉 R4 构造法] 密文损坏+持钥重签（MAC 自洽/GCM 必炸——corrupt 后 sha 声明不变） */
function corruptCipher(env: SnapshotEnvelope, syncKey: string): Buffer {
  const flipChar = env.payload.startsWith('A') ? 'B' : 'A'
  const moved = { ...env, payload: `${flipChar}${env.payload.slice(1)}` }
  const { hmac_sha256: _m, ...rest } = moved
  void _m
  moved.hmac_sha256 = createHmac('sha256', deriveKeys(syncKey).macKey)
    .update(Buffer.from(canonicalJson(rest), 'utf8'))
    .digest('hex')
  return envelopeToBytes(moved)
}

describe('F-DBCAMP-01 DB-3 U3 import-snapshot.service —— 六闸导入合并（双库演练）', () => {
  it('演练① X/Y 异行集合并→零覆盖（Y 本地行原样保留）+零丢行（源行全数在场）+inserted 计数不含种子行', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1', '源端文献', '2026-02-01T00:00:00.000Z')
    seedNote(x.db, 'n-x1', 'p-x1', '源端笔记', '2026-02-01T00:00:00.000Z')
    seedPaper(y.db, 'p-y1', '接收端本地文献', '2026-03-01T00:00:00.000Z')
    const res = y.importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.inserted).toBe(2)
    expect(res.stats?.a7Conflicts).toBe(0)
    expect(paperCount(y.db, 'p-x1')).toBe(1)
    expect(paperCount(y.db, 'p-y1')).toBe(1)
    const yRow = y.db.prepare('SELECT title, updated_at FROM papers WHERE id = ?').get('p-y1') as {
      title: string
      updated_at: string
    }
    expect(yRow.title).toBe('接收端本地文献')
    expect(yRow.updated_at).toBe('2026-03-01T00:00:00.000Z')
    expect(recvSeqOf(y.db, OWNER_X)).toBe(1)
    // FTS：导入行可检索（触发器随 upsert 维护——演练⑧ 断言面同源）
    expect(
      y.db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"源端文献"'`).get()
    ).toBeTruthy()
    x.db.close()
    y.db.close()
  })

  it('演练② 删除传播：X 删行→X 导出卷 2→Y 导入→该行在 Y 缺席（deleted=1）+演练⑧ 直执守卫（Y deletion_events 全程 0 行）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-d1', '待删文献', '2026-01-01T00:00:00.000Z')
    y.importer.importFromBuffer(exportVol(x))
    expect(paperCount(y.db, 'p-d1')).toBe(1)
    x.db.prepare('DELETE FROM papers WHERE id = ?').run('p-d1')
    const res = y.importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.deleted).toBe(1)
    expect(paperCount(y.db, 'p-d1')).toBe(0)
    // 直执落账抑制：Y 本地删事件账全程零行（021 触发器 WHEN 守卫——§13.1）
    expect((y.db.prepare('SELECT COUNT(*) c FROM deletion_events').get() as { c: number }).c).toBe(0)
    // 拒收卷不推进水位已由 seq 断言族覆盖；此处水位=X 最新卷 2
    expect(recvSeqOf(y.db, OWNER_X)).toBe(2)
    x.db.close()
    y.db.close()
  })

  it('演练③ 防复活（跨卷序列）：Y 导入卷 1→Y 本地删 r→X 卷 2（含 r）→Y 导入→r 缺席+skippedRevive≥1', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-r1', '复活面文献', '2026-01-01T00:00:00.000Z')
    y.importer.importFromBuffer(exportVol(x))
    y.db.prepare('DELETE FROM papers WHERE id = ?').run('p-r1')
    expect(
      (y.db.prepare(`SELECT COUNT(*) c FROM deletion_events WHERE entity='papers' AND id='p-r1'`).get() as { c: number })
        .c
    ).toBe(1)
    // X 侧 r 仍在→卷 2 含 r 行（同卷重放被闸③吞——跨卷才可达⑤）
    const res = y.importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.skippedRevive).toBe(1)
    expect(paperCount(y.db, 'p-r1')).toBe(0)
    x.db.close()
    y.db.close()
  })

  it('演练④ seq_conflict：持 X 密钥自签同 (owner,seq=1) 异内容卷→整卷拒收（r3-N8 构造法）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-c1', '卷一文献', '2026-01-01T00:00:00.000Z')
    y.importer.importFromBuffer(exportVol(x))
    const payload = emptyPayload()
    payload.data.papers = [
      {
        id: 'p-c2',
        file_ref: 'f/p-c2.pdf',
        sha256: 'sha-p-c2',
        title: '同 seq 异内容',
        authors_json: '[]',
        year: null,
        venue: '',
        doi: null,
        arxiv_id: null,
        abstract: '',
        source: 'manual',
        enrich_status: 'manual',
        added_at: 't0',
        updated_at: '2026-01-01T00:00:00.000Z',
        last_read_page: 0,
        cited_by_count: 0,
        cited_by_fetched_at: null,
        cited_by_count_source: null,
        folder_id: '__main__',
        impact_factor: null,
        is_starred: 0
      }
    ]
    const forged = buildEnvelope({
      syncKey: syncKeyOf(x),
      schemaVersion: 21,
      snapshotSeq: 1,
      ownerId: OWNER_X,
      payload,
      makeNonce: () => Buffer.from('ffffffffffff', 'utf8')
    })
    const res = y.importer.importFromBuffer(envelopeToBytes(forged))
    expect(res).toMatchObject({ outcome: 'rejected', reason: 'seq_conflict', ownerId: OWNER_X, snapshotSeq: 1 })
    expect(paperCount(y.db, 'p-c2')).toBe(0)
    x.db.close()
    y.db.close()
  })

  it('演练⑤ 同卷重放→幂等 no-op（noop=true+stats 全零+零副作用）；旧卷（无 applied 记录）→seq_stale', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-n1', '幂等文献', '2026-01-01T00:00:00.000Z')
    const vol1 = exportVol(x)
    x.db.prepare('UPDATE papers SET title = ? WHERE id = ?').run('幂等文献改', 'p-n1')
    const vol2 = exportVol(x)
    // 先导卷 2（跳号合法——卷 1 无 applied 记录）
    const r2 = y.importer.importFromBuffer(vol2)
    expect(r2.outcome).toBe('applied')
    // 卷 2 重放→no-op
    const replay = y.importer.importFromBuffer(vol2)
    expect(replay).toMatchObject({ outcome: 'applied', noop: true, ownerId: OWNER_X, snapshotSeq: 2 })
    expect(replay.stats).toEqual({
      inserted: 0,
      updated: 0,
      skippedStale: 0,
      skippedRevive: 0,
      deleted: 0,
      a7Conflicts: 0
    })
    // 卷 1（无记录+seq≤水位）→seq_stale
    const stale = y.importer.importFromBuffer(vol1)
    expect(stale).toMatchObject({ outcome: 'rejected', reason: 'seq_stale', ownerId: OWNER_X, snapshotSeq: 1 })
    x.db.close()
    y.db.close()
  })

  it('演练⑥ bit 翻转卷→hmac_fail；演练⑦ 剥 hmac_sha256 键→struct_invalid（降级卷封堵）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-t1', '篡改面文献', '2026-01-01T00:00:00.000Z')
    const vol = exportVol(x)
    const env = JSON.parse(vol.toString('utf8')) as { payload: string }
    // flipChar 必异（U2 N-6 先例）——MAC 面含 payload base64
    const flipChar = env.payload.startsWith('A') ? 'B' : 'A'
    const flipped = Buffer.from(
      JSON.stringify({ ...env, payload: `${flipChar}${env.payload.slice(1)}` }),
      'utf8'
    )
    expect(y.importer.importFromBuffer(flipped)).toMatchObject({ outcome: 'rejected', reason: 'hmac_fail' })
    const stripped = { ...env } as Record<string, unknown>
    delete stripped.hmac_sha256
    expect(y.importer.importFromBuffer(Buffer.from(JSON.stringify(stripped), 'utf8'))).toMatchObject({
      outcome: 'rejected',
      reason: 'struct_invalid',
      ownerId: OWNER_X,
      snapshotSeq: 1
    })
    x.db.close()
    y.db.close()
  })

  it('演练⑨ 次轮同步零冲突：同源次轮全量卷（未变更行为主）→a7Conflicts=0+全 no-op（r3-W1 回归锁；[回炉 R1] 补 lineage 行含非默认 tags/kind——次轮零 A7 判别力：kind/tags 全列入写面后全列内容等）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-91', '次轮文献', '2026-01-01T00:00:00.000Z')
    seedNote(x.db, 'n-91', 'p-91', '次轮笔记', '2026-01-01T00:00:00.000Z')
    // R1 判别力锚：非默认 tags 节点+kind 边——若 kind/tags 不入写面（旧实现落
    // DDL 默认），次轮同卷行=键等且内容异→A7；全列写面后=内容全等 no-op
    x.db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, tags, created_at, updated_at, folder_id)
       VALUES ('ln-91', 'p-91', '次轮节点', '["非默认"]', 't', 't', '__main__')`
    ).run()
    x.db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, kind, created_at, updated_at)
       VALUES ('le-91', 'ln-91', 'ln-91', 'manual', 't', 't')`
    ).run()
    y.importer.importFromBuffer(exportVol(x))
    const res = y.importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats).toMatchObject({ inserted: 0, updated: 0, skippedStale: 0, skippedRevive: 0, a7Conflicts: 0 })
    expect((y.db.prepare(`SELECT tags FROM lineage_nodes WHERE id='ln-91'`).get() as { tags: string | null }).tags).toBe(
      '["非默认"]'
    )
    expect((y.db.prepare(`SELECT kind FROM lineage_edges WHERE id='le-91'`).get() as { kind: string }).kind).toBe('manual')
    x.db.close()
    y.db.close()
  })

  it('多源合并：X/Z 双源异行集先后汇入 Y（水位键 recv_seq:X/recv_seq:Z 独立推进）', () => {
    const x = makeSide(OWNER_X)
    const z = makeSide(OWNER_Z)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    pair(y, z)
    seedPaper(x.db, 'p-mx', 'X 源文献', '2026-01-01T00:00:00.000Z')
    seedPaper(z.db, 'p-mz', 'Z 源文献', '2026-01-01T00:00:00.000Z')
    const rx = y.importer.importFromBuffer(exportVol(x))
    const rz = y.importer.importFromBuffer(exportVol(z))
    expect(rx.outcome).toBe('applied')
    expect(rz.outcome).toBe('applied')
    expect(paperCount(y.db, 'p-mx')).toBe(1)
    expect(paperCount(y.db, 'p-mz')).toBe(1)
    expect(recvSeqOf(y.db, OWNER_X)).toBe(1)
    expect(recvSeqOf(y.db, OWNER_Z)).toBe(1)
    x.db.close()
    z.db.close()
    y.db.close()
  })

  it('种子行幂等（R-C）：两端 010/012 播种态（lineTypes/__main__）导入→零 A7+零 inserted（键等且内容全等=no-op）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    const res = y.importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.a7Conflicts).toBe(0)
    expect(res.stats?.inserted).toBe(0)
    expect(
      (y.db.prepare(`SELECT value FROM lineage_graph_meta WHERE key='lineTypes'`).get() as { value: string }).value
    ).toBe('[]')
    expect(
      (y.db.prepare(`SELECT name FROM collections WHERE id='__main__'`).get() as { name: string }).name
    ).toBe('主图')
    x.db.close()
    y.db.close()
  })

  it('前置自检 self_reimport：X 卷回导 X→整卷拒收（闸③前置——§13.2 开头字面）', () => {
    const x = makeSide(OWNER_X)
    seedPaper(x.db, 'p-s1', '自导文献', '2026-01-01T00:00:00.000Z')
    const res = x.importer.importFromBuffer(exportVol(x))
    expect(res).toMatchObject({ outcome: 'rejected', reason: 'self_reimport', ownerId: OWNER_X, snapshotSeq: 1 })
    x.db.close()
  })

  it('schema_newer：伪造 schema_version=26 卷（buildEnvelope 直调）→拒收（[F-VISFB-42] 023 落链后伪卷随升 24；[F-VISFB-61] 024 落链后随升 25；[F-VISFB-66] 025 落链后随升 26）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    const forged = buildEnvelope({
      syncKey: syncKeyOf(x),
      schemaVersion: 26,
      snapshotSeq: 1,
      ownerId: OWNER_X,
      payload: emptyPayload(),
      makeNonce: () => Buffer.from('aaaaaaaaaaaa', 'utf8')
    })
    expect(y.importer.importFromBuffer(envelopeToBytes(forged))).toMatchObject({
      outcome: 'rejected',
      reason: 'schema_newer',
      ownerId: OWNER_X,
      snapshotSeq: 1
    })
    x.db.close()
    y.db.close()
  })

  it('counts_mismatch：手签卷 table_counts 改数（MAC+GCM 自洽）→拒收；hash_mismatch：手签卷 payload_sha256 失真→拒收', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    const payloadText = canonicalJson(emptyPayload())
    const counts = Object.fromEntries(Object.keys(emptyPayload().data).map((k) => [k, 99]))
    const wrongCounts = handCraftedEnvelope({
      syncKey: syncKeyOf(x),
      ownerId: OWNER_X,
      snapshotSeq: 1,
      payloadText,
      fakeCounts: counts
    })
    expect(y.importer.importFromBuffer(wrongCounts)).toMatchObject({
      outcome: 'rejected',
      reason: 'counts_mismatch'
    })
    const wrongSha = handCraftedEnvelope({
      syncKey: syncKeyOf(x),
      ownerId: OWNER_X,
      snapshotSeq: 1,
      payloadText,
      fakeSha: 'ab'.repeat(32)
    })
    expect(y.importer.importFromBuffer(wrongSha)).toMatchObject({ outcome: 'rejected', reason: 'hash_mismatch' })
    x.db.close()
    y.db.close()
  })

  it('LWW 三分支（§13.2⑤）：入站新=updated/入站旧=skippedStale/键等且内容异=A7 行级（a7First=首例 entity/id）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(y.db, 'p-l1', '本地新文献', '2026-06-01T00:00:00.000Z')
    seedPaper(y.db, 'p-l2', '本地旧文献', '2026-01-01T00:00:00.000Z')
    seedPaper(y.db, 'p-l3', '本地分叉文献', '2026-03-01T00:00:00.000Z')
    seedPaper(x.db, 'p-l1', '源端旧版', '2026-02-01T00:00:00.000Z')
    seedPaper(x.db, 'p-l2', '源端新版', '2026-05-01T00:00:00.000Z')
    seedPaper(x.db, 'p-l3', '源端分叉同刻异文', '2026-03-01T00:00:00.000Z')
    const res = y.importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.skippedStale).toBe(1)
    expect(res.stats?.updated).toBe(1)
    expect(res.stats?.a7Conflicts).toBe(1)
    expect(res.stats?.a7FirstEntity).toBe('papers')
    expect(res.stats?.a7FirstId).toBe('p-l3')
    expect((y.db.prepare('SELECT title FROM papers WHERE id = ?').get('p-l1') as { title: string }).title).toBe(
      '本地新文献'
    )
    expect((y.db.prepare('SELECT title FROM papers WHERE id = ?').get('p-l2') as { title: string }).title).toBe(
      '源端新版'
    )
    expect((y.db.prepare('SELECT title FROM papers WHERE id = ?').get('p-l3') as { title: string }).title).toBe(
      '本地分叉文献'
    )
    x.db.close()
    y.db.close()
  })

  it('拒收统计键（W1 可见性）：拒收后 import_reject_stats=计数+最近指纹（owner/seq/sha 自称值）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-w1', '拒收统计文献', '2026-01-01T00:00:00.000Z')
    const vol = exportVol(x)
    const env = JSON.parse(vol.toString('utf8')) as { payload: string; payload_sha256: string }
    const flipChar = env.payload.startsWith('A') ? 'B' : 'A'
    y.importer.importFromBuffer(Buffer.from(JSON.stringify({ ...env, payload: `${flipChar}${env.payload.slice(1)}` }), 'utf8'))
    const stats = y.repos.importSnapshot.getRejectStats()
    expect(stats).not.toBeNull()
    expect(stats?.count).toBe(1)
    expect(stats?.lastOwner).toBe(OWNER_X)
    expect(stats?.lastSeq).toBe(1)
    expect(stats?.lastSha).toBe(env.payload_sha256)
    expect(stats?.lastReason).toBe('hmac_fail')
    // applied/no-op 不并入拒收计数：合法导入后计数不变
    y.importer.importFromBuffer(vol)
    expect(y.repos.importSnapshot.getRejectStats()?.count).toBe(1)
    x.db.close()
    y.db.close()
  })

  it('拒收卷零副作用：hmac_fail 卷不推进水位不落导入日志（拒收卷不推进水位——§13.2⑥）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-z1', '零副作用文献', '2026-01-01T00:00:00.000Z')
    const vol = exportVol(x)
    const env = JSON.parse(vol.toString('utf8')) as { payload: string }
    const flipChar = env.payload.startsWith('A') ? 'B' : 'A'
    y.importer.importFromBuffer(Buffer.from(JSON.stringify({ ...env, payload: `${flipChar}${env.payload.slice(1)}` }), 'utf8'))
    expect(recvSeqOf(y.db, OWNER_X)).toBeUndefined()
    expect(y.repos.importSnapshot.getImportLog(OWNER_X, 1)).toBeNull()
    // 同卷合法重导仍可达 applied（拒收尝试不并入已见面）
    expect(y.importer.importFromBuffer(vol).outcome).toBe('applied')
    x.db.close()
    y.db.close()
  })

  // [回炉 R2] 明文结构预检前置（不依赖密钥）：'{}' 卷→struct_invalid+owner/seq
  // 缺省（null 降级）；未配对 owner（合法 uuid 无对端密钥）→hmac_fail（自裁③
  // 口径收窄为「未配对」）。
  it('[R2] 明文预检前置：{} 卷→struct_invalid 且 ownerId/snapshotSeq 缺省；未配对 owner→hmac_fail', () => {
    const y = makeSide(OWNER_Y)
    const r1 = y.importer.importFromBuffer(Buffer.from('{}', 'utf8'))
    expect(r1).toEqual({ outcome: 'rejected', reason: 'struct_invalid' })
    const forged = buildEnvelope({
      syncKey: 'ef'.repeat(32),
      schemaVersion: 21,
      snapshotSeq: 1,
      ownerId: OWNER_Z,
      payload: emptyPayload(),
      makeNonce: () => Buffer.from('cccccccccccc', 'utf8')
    })
    const r2 = y.importer.importFromBuffer(envelopeToBytes(forged))
    expect(r2).toMatchObject({ outcome: 'rejected', reason: 'hmac_fail', ownerId: OWNER_Z, snapshotSeq: 1 })
    y.db.close()
  })

  // [回炉 R4] decrypt_fail 分支内嵌闸③评估删除（统一主路径序=①明文预检→decode
  // →③seq→④b 对账）：GCM 损坏但同 sha 已 applied→decrypt_fail（noop 出口仅对
  // decode ok 卷开放——文件损坏是更根本问题）；双错卷按重排后字面序报 schema_newer。
  it('[R4] 持钥自签+密文损坏→decrypt_fail；双错卷（schema 超前+密文损坏）→schema_newer（R2 重排字面序）；坏卷+同 sha applied 记录→decrypt_fail（新语义）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    // ① 密文损坏（改 payload 后持源 sync_key 重签 HMAC——seq_conflict 构造法同型）
    const good = buildEnvelope({
      syncKey: syncKeyOf(x),
      schemaVersion: 21,
      snapshotSeq: 1,
      ownerId: OWNER_X,
      payload: emptyPayload(),
      makeNonce: () => Buffer.from('dddddddddddd', 'utf8')
    })
    expect(y.importer.importFromBuffer(corruptCipher(good, syncKeyOf(x)))).toMatchObject({
      outcome: 'rejected',
      reason: 'decrypt_fail'
    })
    // ② 双错卷：schema_version=26+密文损坏→明文预检先报 schema_newer（伪卷随升）
    const newer = buildEnvelope({
      syncKey: syncKeyOf(x),
      schemaVersion: 26,
      snapshotSeq: 1,
      ownerId: OWNER_X,
      payload: emptyPayload(),
      makeNonce: () => Buffer.from('dddddddddddd', 'utf8')
    })
    expect(y.importer.importFromBuffer(corruptCipher(newer, syncKeyOf(x)))).toMatchObject({
      outcome: 'rejected',
      reason: 'schema_newer'
    })
    // ③ 坏卷+同 sha applied 记录→decrypt_fail（不再 noop 出口）
    seedPaper(x.db, 'p-r4', '裁决卷文献', '2026-01-01T00:00:00.000Z')
    const vol = exportVol(x)
    expect(y.importer.importFromBuffer(vol).outcome).toBe('applied')
    const applied = JSON.parse(vol.toString('utf8')) as SnapshotEnvelope
    expect(y.importer.importFromBuffer(corruptCipher(applied, syncKeyOf(x)))).toMatchObject({
      outcome: 'rejected',
      reason: 'decrypt_fail'
    })
    x.db.close()
    y.db.close()
  })

  // [回炉 R3] 无时间面表纯键等分支补锁：collections 键等且内容异→A7（__main__
  // position 异库分叉面=主控裁容忍——键等异内容 A7 正常可见性，不动比较列集）；
  // paper_tags 防复活（'pid|tid' 序列化路径）。
  it('[R3] collections 键等且内容异→A7 行级；paper_tags 防复活跨卷（pid|tid 序列化路径）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    // ① collections A7：同 id 异名（非种子行）
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-r3', '源端图', 3)`).run()
    y.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-r3', '本地图', 7)`).run()
    const r1 = y.importer.importFromBuffer(exportVol(x))
    expect(r1.stats?.a7Conflicts).toBe(1)
    expect(r1.stats?.a7FirstEntity).toBe('collections')
    expect(r1.stats?.a7FirstId).toBe('c-r3')
    expect((y.db.prepare(`SELECT name FROM collections WHERE id='c-r3'`).get() as { name: string }).name).toBe('本地图')
    x.db.close()
    y.db.close()

    // ② paper_tags 防复活（跨卷）：Y 导入卷 1→Y 本地删挂接（账 id='p-px|t-px'）
    // →X 卷 2（挂接仍在）→Y 导入→跳过不复活
    const x2 = makeSide(OWNER_X)
    const y2 = makeSide(OWNER_Y)
    pair(y2, x2)
    seedPaper(x2.db, 'p-px', '挂接文献', '2026-01-01T00:00:00.000Z')
    x2.db.prepare(`INSERT INTO tags (id, name, folder_id) VALUES ('t-px', '挂接标签', '__main__')`).run()
    x2.db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-px', 't-px')`).run()
    y2.importer.importFromBuffer(exportVol(x2))
    y2.db.prepare(`DELETE FROM paper_tags WHERE paper_id='p-px' AND tag_id='t-px'`).run()
    expect(
      (
        y2.db.prepare(`SELECT COUNT(*) c FROM deletion_events WHERE entity='paper_tags' AND id='p-px|t-px'`).get() as {
          c: number
        }
      ).c
    ).toBe(1)
    const r2 = y2.importer.importFromBuffer(exportVol(x2))
    expect(r2.stats?.skippedRevive).toBe(1)
    expect(
      (y2.db.prepare(`SELECT COUNT(*) c FROM paper_tags WHERE paper_id='p-px' AND tag_id='t-px'`).get() as { c: number })
        .c
    ).toBe(0)
    x2.db.close()
    y2.db.close()
  })

  // [回炉 R7] 闸④ deletions 身份形态校验：paper_tags 条目 id 须恰含一个 '|'
  // 且两分量非空；其余 entity id=非空 string；畸形→struct_invalid 整卷拒收。
  it('[R7] deletions 身份形态校验：paper_tags id 无竖线/空分量/双竖线、他表空 id→struct_invalid 整卷拒收', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    const badPayloads: string[] = []
    for (const bad of [
      { seq: 1, entity: 'paper_tags', id: 'nodash', deleted_at: 't' },
      { seq: 1, entity: 'paper_tags', id: '|t', deleted_at: 't' },
      { seq: 1, entity: 'paper_tags', id: 'p|', deleted_at: 't' },
      { seq: 1, entity: 'paper_tags', id: 'a|b|c', deleted_at: 't' },
      { seq: 1, entity: 'papers', id: '', deleted_at: 't' }
    ]) {
      const p = emptyPayload()
      p.deletions = [bad]
      badPayloads.push(canonicalJson(p))
    }
    for (const text of badPayloads) {
      const vol = handCraftedEnvelope({ syncKey: syncKeyOf(x), ownerId: OWNER_X, snapshotSeq: 1, payloadText: text })
      expect(y.importer.importFromBuffer(vol), `畸形 deletions ${text.slice(0, 60)}`).toMatchObject({
        outcome: 'rejected',
        reason: 'struct_invalid'
      })
    }
    x.db.close()
    y.db.close()
  })

  // [回炉 R8] 非 canonical payload（重复键/键序漂移=解析后重序列化对账不符）
  // →struct_invalid（§13.6 字面——手构明文经持钥自签注入）。
  it('[R8] 非 canonical payload→struct_invalid：canonical 文本插入空白后持钥自签→闸④b 对账拒收', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    pair(y, x)
    const nonCanonical = canonicalJson(emptyPayload()).replace('"data":', '"data": ')
    const vol = handCraftedEnvelope({
      syncKey: syncKeyOf(x),
      ownerId: OWNER_X,
      snapshotSeq: 1,
      payloadText: nonCanonical
    })
    expect(y.importer.importFromBuffer(vol)).toMatchObject({ outcome: 'rejected', reason: 'struct_invalid' })
    x.db.close()
    y.db.close()
  })
})
