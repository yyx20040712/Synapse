/**
 * [F-DBCAMP-01 DB-3 U2] snapshot.repo 锁定测试（always-active——真库夹具，
 * app-meta.repo.test.ts 同型；deletion-log.test.ts 元测试范式）。
 *
 * 覆盖（简报③-3/③-8.1）：ensureSyncKey 生成 64-hex/幂等/预置值不覆写；
 * readSyncKey 缺席=显性 throw；nextSnapshotSeq 空键=1/计数写回后+1；
 * commitSnapshotSeq 落库；对端密钥 set/list/remove；十表读面行序矩阵（[F-VISFB-61] +floating_notes）
 * （逆序夹具→断言输出有序）+列齐全（迁移终态列对位——逐表断言键集）；
 * deletion_events 全量读（级联账在场=r4 勘正前提实证面）；schema_version=21。
 */
import { describe, expect, it } from 'vitest'
import { createSnapshotRepo } from '../../../../src/main/db/repos/snapshot.repo'
import { createTestDb } from '../../../utils/fixtures'
import { APP_META_KEYS, PEER_SYNC_KEY_PREFIX } from '../../../../src/shared/models/app-meta'

type Db = ReturnType<typeof createTestDb>

/** 导出面十表（§13.7 表集——table_counts 键集恰十键；[F-VISFB-61] +floating_notes） */
const TEN_TABLES = [
  'papers',
  'collections',
  'tags',
  'paper_tags',
  'notes',
  'annotations',
  'lineage_nodes',
  'lineage_edges',
  'lineage_graph_meta',
  'floating_notes'
] as const


function seedPaper(db: Db, id: string, updatedAt: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, 't0', updatedAt)
}

describe('F-DBCAMP-01 DB-3 U2 snapshot.repo —— envelope 面专用仓储', () => {
  it('ensureSyncKey 新库生成 64-hex 落库+再 ensure 幂等值不变（在场永不覆写）', () => {
    const db = createTestDb()
    const repo = createSnapshotRepo(db)
    const first = repo.ensureSyncKey()
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    const second = repo.ensureSyncKey()
    expect(second).toBe(first)
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as
      | { value: string }
      | undefined
    expect(row?.value).toBe(first)
    db.close()
  })

  it('ensureSyncKey 预置值恒返回（恢复己备份形态——身份/密钥同生命周期）', () => {
    const db = createTestDb()
    const preset = 'ab'.repeat(32)
    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, '2026-01-01T00:00:00.000Z')`
    ).run(APP_META_KEYS.syncKey, preset)
    const repo = createSnapshotRepo(db)
    expect(repo.ensureSyncKey()).toBe(preset)
    db.close()
  })

  it('readSyncKey 装配序缺陷=显性 throw（缺席态非 null 返回——ensure 已在装配期跑）', () => {
    const db = createTestDb()
    const repo = createSnapshotRepo(db)
    expect(() => repo.readSyncKey()).toThrow(/sync_key/)
    repo.ensureSyncKey()
    expect(repo.readSyncKey()).toMatch(/^[0-9a-f]{64}$/)
    db.close()
  })

  it('nextSnapshotSeq 空键≡0→首导=1；commit 写回后=2（§13.4 分配语义）', () => {
    const db = createTestDb()
    const repo = createSnapshotRepo(db)
    expect(repo.nextSnapshotSeq()).toBe(1)
    repo.commitSnapshotSeq(1)
    expect(repo.nextSnapshotSeq()).toBe(2)
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.snapshotSeq) as
      | { value: string }
      | undefined
    expect(row?.value).toBe('1')
    db.close()
  })

  it('对端密钥 set/list/remove：键前缀实键+importedAt=导入时刻+remove 布尔回值', () => {
    const db = createTestDb()
    const repo = createSnapshotRepo(db)
    const owner = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
    repo.setPeerKey(owner, 'cd'.repeat(32))
    const peers = repo.listPeerKeys()
    expect(peers).toHaveLength(1)
    expect(peers[0]!.ownerId).toBe(owner)
    expect(peers[0]!.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    // 实键=前缀拼 owner_id（直读库验证键形）
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(`${PEER_SYNC_KEY_PREFIX}${owner}`) as
      | { value: string }
      | undefined
    expect(row?.value).toBe('cd'.repeat(32))
    // [回炉 R7] 诱饵撞形键：'_' 通配形态键不得入对端列表（LIKE ESCAPE 字面收口
    // ——摘 ESCAPE 即该行入列红）
    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES ('peerXsyncYkey:decoy', 'x', '2026-01-01T00:00:00.000Z')`
    ).run()
    expect(repo.listPeerKeys().map((x) => x.ownerId)).toEqual([owner])
    // 再导入同 owner=覆写值（upsert——listPeerKeys 仍恰一行）
    repo.setPeerKey(owner, 'ef'.repeat(32))
    expect(repo.listPeerKeys()).toHaveLength(1)
    const row2 = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(`${PEER_SYNC_KEY_PREFIX}${owner}`) as
      | { value: string }
      | undefined
    expect(row2?.value).toBe('ef'.repeat(32))
    expect(repo.removePeerKey(owner)).toBe(true)
    expect(repo.removePeerKey(owner)).toBe(false)
    expect(repo.listPeerKeys()).toEqual([])
    db.close()
  })

  it('十表读面行序矩阵：逆序夹具→输出按行序矩阵有序（updated_at,id 三表=id 两表=复合键表；[F-VISFB-61] +floating_notes 同 updated_at,id 序）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-b', '2026-03-01T00:00:00.000Z')
    // id 平手键：同 updated_at 且插入序与 id 序相反（p-z 先插）→断言 id 升序
    //（次序键不裸奔——摘 ORDER BY 的 id 次键即红）
    seedPaper(db, 'p-z', '2026-01-01T00:00:00.000Z')
    seedPaper(db, 'p-a', '2026-01-01T00:00:00.000Z')
    seedPaper(db, 'p-c', '2026-02-01T00:00:00.000Z')
    db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-2', '夹二', 0)`).run()
    db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-1', '夹一', 0)`).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-2', '标签二')`).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-1', '标签一')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-b', 't-1')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-a', 't-2')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-a', 't-1')`).run()
    db.prepare(
      `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-2', 'p-a', 't', '2026-02-01T00:00:00.000Z')`
    ).run()
    db.prepare(
      `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-1', 'p-a', 't', '2026-01-01T00:00:00.000Z')`
    ).run()
    db.prepare(
      `INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('k-b', 'v', '2026-01-01T00:00:00.000Z')`
    ).run()
    db.prepare(
      `INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('k-a', 'v', '2026-02-01T00:00:00.000Z')`
    ).run()
    // [回炉 R5] 三表补锁（annotations/lineage_nodes/lineage_edges 同
    // updated_at 逆 id 插入——papers 先例同型，摘任一表 id 次键即红）
    const ann = (id: string): void => {
      db.prepare(
        `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
         VALUES (?, 'p-a', 0, 'highlight', '0000:01', 't', '2026-04-01T00:00:00.000Z')`
      ).run(id)
    }
    ann('a-z2')
    ann('a-m')
    const node = (id: string): void => {
      db.prepare(
        `INSERT INTO lineage_nodes (id, title, created_at, updated_at)
         VALUES (?, '节点', 't', '2026-04-01T00:00:00.000Z')`
      ).run(id)
    }
    node('ln-z2')
    node('ln-m')
    const edge = (id: string, from: string, to: string): void => {
      db.prepare(
        `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
         VALUES (?, ?, ?, 't', '2026-04-01T00:00:00.000Z')`
      ).run(id, from, to)
    }
    edge('le-z2', 'ln-z2', 'ln-m')
    edge('le-m', 'ln-m', 'ln-z2')

    const repo = createSnapshotRepo(db)
    const rows = repo.readExportTables()
    expect(rows.papers.map((r) => r.id)).toEqual(['p-a', 'p-z', 'p-c', 'p-b'])
    // 012 迁移播种 __main__ 主图夹（id 序在种子行后——夹具事实非夹具污染）
    expect(rows.collections.map((r) => r.id)).toEqual(['__main__', 'c-1', 'c-2'])
    expect(rows.tags.map((r) => r.id)).toEqual(['t-1', 't-2'])
    expect(rows.paper_tags.map((r) => [r.paper_id, r.tag_id])).toEqual([
      ['p-a', 't-1'],
      ['p-a', 't-2'],
      ['p-b', 't-1']
    ])
    expect(rows.notes.map((r) => r.id)).toEqual(['n-1', 'n-2'])
    // 010 迁移播种 lineTypes（epoch 哨兵 1970——updated_at 序在首）
    expect(rows.lineage_graph_meta.map((r) => r.key)).toEqual(['lineTypes', 'k-b', 'k-a'])
    expect(rows.annotations.map((r) => r.id)).toEqual(['a-m', 'a-z2'])
    expect(rows.lineage_nodes.map((r) => r.id)).toEqual(['ln-m', 'ln-z2'])
    expect(rows.lineage_edges.map((r) => r.id)).toEqual(['le-m', 'le-z2'])
    db.close()
  })

  it('十表读面列齐全：逐表断言行对象键集=迁移终态全列（SELECT 禁 * 的对位面；[F-VISFB-61] +floating_notes）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-col', 't')
    db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-col', '列夹', 0)`).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-col', '列标签')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-col', 't-col')`).run()
    db.prepare(
      `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-col', 'p-col', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
       VALUES ('a-col', 'p-col', 0, 'highlight', '0000:01', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-col', '列节点', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-c2', '端二', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
       VALUES ('le-col', 'ln-col', 'ln-c2', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO floating_notes (id, folder_id, x, y, content, created_at, updated_at)
       VALUES ('fn-col', 'c-col', 1, 2, '列笔记', 't', 't')`
    ).run()
    const repo = createSnapshotRepo(db)
    const rows = repo.readExportTables()
    const firstOf: Record<string, Record<string, unknown>> = {
      papers: rows.papers[0]!,
      collections: rows.collections[0]!,
      tags: rows.tags[0]!,
      paper_tags: rows.paper_tags[0]!,
      notes: rows.notes[0]!,
      annotations: rows.annotations[0]!,
      lineage_nodes: rows.lineage_nodes[0]!,
      lineage_edges: rows.lineage_edges[0]!,
      lineage_graph_meta: rows.lineage_graph_meta[0] ?? { key: 'lineTypes', value: '[]', updated_at: 't' },
      floating_notes: rows.floating_notes[0]!
    }
    // [回炉 R4] 列对账独立源=PRAGMA table_info 实读（消「测试列单=repo 列单」
    // 自指镜像——未来迁移加列而 TABLE_SPECS 漏列即红）
    for (const t of TEN_TABLES) {
      const info = db.prepare(`PRAGMA table_info(${t})`).all() as Array<{ name: string }>
      const expected = info.map((c) => c.name).sort()
      expect(Object.keys(firstOf[t]!).sort(), `${t} 列集=迁移终态全列`).toEqual(expected)
    }
    db.close()
  })

  it('readDeletionEvents 全量读：删带 1 note+1 annotation+1 paper_tag 的 paper→4 事件全在场+seq 升序（r4 级联超集实证面）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-del', 't')
    db.prepare(
      `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-del', 'p-del', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
       VALUES ('a-del', 'p-del', 0, 'highlight', '0000:01', 't', 't')`
    ).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-del', '删标签')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-del', 't-del')`).run()
    db.prepare(`DELETE FROM papers WHERE id='p-del'`).run()
    const repo = createSnapshotRepo(db)
    const events = repo.readDeletionEvents()
    expect(events).toHaveLength(4)
    expect(new Set(events.map((e) => e.entity))).toEqual(
      new Set(['papers', 'notes', 'annotations', 'paper_tags'])
    )
    const seqs = events.map((e) => e.seq)
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b))
    expect(events[0]!.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    db.close()
  })

  it('readSchemaVersion=迁移链尾 user_version 26（schema_version 字段源——[回炉 r1-R9] 随 022 链升标题勘正；[F-VISFB-42] 023 随链；[F-VISFB-61] 024 随链；[F-SNAPCLEAN-01] 基线压缩后链尾=26——迁移面单件 026_baseline.sql）', () => {
    const db = createTestDb()
    const repo = createSnapshotRepo(db)
    expect(repo.readSchemaVersion()).toBe(26)
    db.close()
  })
})
