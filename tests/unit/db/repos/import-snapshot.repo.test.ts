/**
 * [F-DBCAMP-01 DB-3 U3] import-snapshot.repo 锁定测试（always-active——真库
 * 夹具，snapshot.repo.test.ts 同型范式）。
 *
 * 覆盖（简报③-4/③-7-2）：upsert 表序（乱序构造 FK 违约红证+父先子后序全量
 * 落库）/三分支语句面（insert 新行·冲突全列更新·键查全列读）/死置列不入写面
 * （lineage_nodes.tags/lineage_edges.kind 落 DDL 默认）/guard 单行 UPDATE 两法
 * （置 1 直执不落账+复位 0 恢复+行数恒 1——INSERT/DELETE 禁）/水位（空键≡0）
 * /导入日志/FTS×3 rebuild 后检索命中/直执删除按身份矩阵（paper_tags 拆拼接/
 * graph_meta 按 key/缺席=no-op 幂等）。
 */
import { describe, expect, it } from 'vitest'
import {
  IMPORT_TABLE_ORDER,
  createImportSnapshotRepo,
  identityOf
} from '../../../../src/main/db/repos/import-snapshot.repo'
import { createTestDb } from '../../../utils/fixtures'
import {
  IMPORT_LOG_PREFIX,
  IMPORT_REJECT_STATS,
  RECV_SEQ_PREFIX
} from '../../../../src/shared/models/app-meta'
import { createSnapshotRepo } from '../../../../src/main/db/repos/snapshot.repo'

type Db = ReturnType<typeof createTestDb>

function makeRepo(): { db: Db; repo: ReturnType<typeof createImportSnapshotRepo> } {
  const db = createTestDb()
  return { db, repo: createImportSnapshotRepo(db) }
}

/** 全列节点行（死置列 tags 可覆写——入站真值面） */
function nodeRow(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    paper_id: null,
    title: `节点${id}`,
    core_idea: '',
    year: null,
    x: null,
    y: null,
    created_at: 't',
    updated_at: 't',
    month: null,
    slot: null,
    folder_id: '__main__',
    tags: null,
    ...over
  }
}

/** 全列边行（死置列 kind 可覆写） */
function edgeRow(id: string, fromNode: string, toNode: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    from_node: fromNode,
    to_node: toNode,
    label: '',
    created_at: 't',
    updated_at: 't',
    sub: null,
    via: null,
    dashed: 0,
    color: '#1e3a8a',
    kind: 'tree',
    ...over
  }
}

/** 最小合法 paper 行（全列——repo 读面列集同源） */
function paperRow(id: string, updatedAt: string): Record<string, unknown> {
  return {
    id,
    file_ref: `f/${id}.pdf`,
    sha256: `sha-${id}`,
    title: `文献${id}`,
    authors_json: '[]',
    year: 2026,
    venue: '',
    doi: null,
    arxiv_id: null,
    abstract: '絮凝剂投加量优化',
    source: 'manual',
    enrich_status: 'manual',
    added_at: 't0',
    updated_at: updatedAt,
    last_read_page: 0,
    cited_by_count: 0,
    cited_by_fetched_at: null,
    cited_by_count_source: null,
    folder_id: '__main__',
    impact_factor: null,
    is_starred: 0
  }
}

describe('F-DBCAMP-01 DB-3 U3 import-snapshot.repo —— 导入合并写面', () => {
  it('upsert 表序=FK 父先子后钉死（collections→tags→papers→lineage_nodes→paper_tags→notes→annotations→lineage_edges→lineage_graph_meta）', () => {
    expect(IMPORT_TABLE_ORDER).toEqual([
      'collections',
      'tags',
      'papers',
      'lineage_nodes',
      'paper_tags',
      'notes',
      'annotations',
      'lineage_edges',
      'lineage_graph_meta'
    ])
  })

  it('乱序构造 FK 违约红证：子先父后（paper_tags 先于 papers/tags）直执 upsert→throws 外键违约（表序必要性的行为锁）', () => {
    const { db, repo } = makeRepo()
    expect(() =>
      repo.upsertRow('paper_tags', { paper_id: 'p-fk', tag_id: 't-fk' })
    ).toThrow(/FOREIGN KEY|constraint/i)
    db.close()
  })

  it('三分支语句面：新键 INSERT（inserted 面）+冲突全列 DO UPDATE（改 title 全列更新）+键查全列读（缺席=null）', () => {
    const { db, repo } = makeRepo()
    repo.upsertRow('papers', paperRow('p-3b', '2026-01-01T00:00:00.000Z'))
    expect(repo.readRow('papers', { id: 'p-3b' })).toMatchObject({ id: 'p-3b', title: '文献p-3b' })
    const changed = { ...paperRow('p-3b', '2026-01-02T00:00:00.000Z'), title: '改题' }
    repo.upsertRow('papers', changed)
    expect(repo.readRow('papers', { id: 'p-3b' })).toMatchObject({ id: 'p-3b', title: '改题', updated_at: '2026-01-02T00:00:00.000Z' })
    expect((db.prepare(`SELECT COUNT(*) c FROM papers`).get() as { c: number }).c).toBe(1)
    expect(repo.readRow('papers', { id: 'absent' })).toBeNull()
    db.close()
  })

  // [回炉 R1] 死置列前提被证伪（lineage_edges.kind 写面恒 'manual'——lineage.repo:
  // 199-200+014 头注；lineage_nodes.tags 有存量写面史 INV-48）——「出库真值/入写
  // 真值」对偶对称：kind/tags 全列入 upsert 写面，入站值写入本地。
  it('[R1] 全列入写面：lineage_nodes.tags/lineage_edges.kind 入站真值写入本地（对偶对称——冲突更新亦随 excluded 刷新）', () => {
    const { db, repo } = makeRepo()
    repo.upsertRow('papers', paperRow('p-dc', 't'))
    repo.upsertRow('lineage_nodes', nodeRow('ln-dc', { paper_id: 'p-dc', tags: '["非默认"]' }))
    const node = db.prepare(`SELECT tags FROM lineage_nodes WHERE id='ln-dc'`).get() as { tags: string | null }
    expect(node.tags).toBe('["非默认"]')
    repo.upsertRow('lineage_nodes', nodeRow('ln-a'))
    repo.upsertRow('lineage_edges', edgeRow('le-dc', 'ln-dc', 'ln-a', { kind: 'manual' }))
    const edge = db.prepare(`SELECT kind FROM lineage_edges WHERE id='le-dc'`).get() as { kind: string }
    expect(edge.kind).toBe('manual')
    // 冲突更新路径：tags 随 excluded 全列刷新（非只插不改）
    repo.upsertRow('lineage_nodes', nodeRow('ln-dc', { paper_id: 'p-dc', tags: '["次轮"]', updated_at: 't2' }))
    expect((db.prepare(`SELECT tags FROM lineage_nodes WHERE id='ln-dc'`).get() as { tags: string | null }).tags).toBe(
      '["次轮"]'
    )
    db.close()
  })

  it('guard 两法=UPDATE 单行：setGuardStop(1) 直执删除不落 deletion_events+复位 0 恢复落账+行数恒 1（INSERT/DELETE 禁——k3-N3 红线）', () => {
    const { db, repo } = makeRepo()
    repo.upsertRow('papers', paperRow('p-g1', 't'))
    repo.setGuardStop(1)
    repo.deleteDirect('papers', 'p-g1')
    expect((db.prepare(`SELECT COUNT(*) c FROM deletion_events`).get() as { c: number }).c).toBe(0)
    repo.resetGuardStop()
    const guard = db.prepare('SELECT COUNT(*) c, COALESCE(MAX(stop), -1) s FROM deletion_log_guard').get() as {
      c: number
      s: number
    }
    expect(guard.c).toBe(1)
    expect(guard.s).toBe(0)
    repo.upsertRow('papers', paperRow('p-g2', 't'))
    repo.deleteDirect('papers', 'p-g2')
    expect(
      (db.prepare(`SELECT COUNT(*) c FROM deletion_events WHERE entity='papers' AND id='p-g2'`).get() as { c: number }).c
    ).toBe(1)
    db.close()
  })

  it('直执删除身份矩阵：paper_tags 拆竖线拼接/graph_meta 按 key/缺席=no-op 幂等（changes=0）', () => {
    const { db, repo } = makeRepo()
    repo.upsertRow('papers', paperRow('p-dd', 't'))
    repo.upsertRow('tags', { id: 't-dd', name: '直执标签', color: null, folder_id: '__main__' })
    repo.upsertRow('paper_tags', { paper_id: 'p-dd', tag_id: 't-dd' })
    repo.upsertRow('lineage_graph_meta', { key: 'k-dd', value: 'v1', updated_at: 't' })
    repo.setGuardStop(1)
    expect(repo.deleteDirect('paper_tags', 'p-dd|t-dd')).toBe(1)
    expect(repo.deleteDirect('lineage_graph_meta', 'k-dd')).toBe(1)
    expect(repo.deleteDirect('paper_tags', 'p-dd|t-dd')).toBe(0)
    expect(repo.deleteDirect('papers', 'never')).toBe(0)
    expect((db.prepare(`SELECT COUNT(*) c FROM paper_tags`).get() as { c: number }).c).toBe(0)
    db.close()
  })

  it('身份序列化 identityOf：常规表=id/paper_tags=pid|tid 拼接/graph_meta=key 值（§13.1 矩阵单源）', () => {
    expect(identityOf('papers', { id: 'p1' })).toBe('p1')
    expect(identityOf('paper_tags', { paper_id: 'p1', tag_id: 't1' })).toBe('p1|t1')
    expect(identityOf('lineage_graph_meta', { key: 'lineTypes', value: '[]' })).toBe('lineTypes')
  })

  it('水位：空键≡0→setRecvSeq 分键独立推进（recv_seq:<owner> 十进制数字串）', () => {
    const { db, repo } = makeRepo()
    expect(repo.getRecvSeq('owner-x')).toBe(0)
    repo.setRecvSeq('owner-x', 3)
    repo.setRecvSeq('owner-z', 7)
    expect(repo.getRecvSeq('owner-x')).toBe(3)
    expect(repo.getRecvSeq('owner-z')).toBe(7)
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(`${RECV_SEQ_PREFIX}owner-x`) as {
      value: string
    }
    expect(row.value).toBe('3')
    db.close()
  })

  it('导入日志：缺席=null→setImportLog(owner,seq,sha) 单键读写（import_log:<owner>:<seq> 值=payload_sha256）', () => {
    const { db, repo } = makeRepo()
    expect(repo.getImportLog('owner-x', 1)).toBeNull()
    repo.setImportLog('owner-x', 1, 'ab'.repeat(32))
    expect(repo.getImportLog('owner-x', 1)).toBe('ab'.repeat(32))
    const row = db
      .prepare('SELECT value FROM app_meta WHERE key = ?')
      .get(`${IMPORT_LOG_PREFIX}owner-x:1`) as { value: string }
    expect(row.value).toBe('ab'.repeat(32))
    db.close()
  })

  it('拒收统计键：getRejectStats 缺席=null→setRejectStats JSON 落 app_meta（import_reject_stats 单键）', () => {
    const { db, repo } = makeRepo()
    expect(repo.getRejectStats()).toBeNull()
    const stats = { count: 2, lastOwner: 'o1', lastSeq: 5, lastSha: 'cd'.repeat(32), lastReason: 'seq_stale', lastAt: '2026-10-15T00:00:00.000Z' }
    repo.setRejectStats(stats)
    expect(repo.getRejectStats()).toEqual(stats)
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(IMPORT_REJECT_STATS) as {
      value: string
    }
    expect(JSON.parse(row.value)).toEqual(stats)
    db.close()
  })

  // [回炉 R6] 防御面：getRecvSeq 非数值存量值显性 throw（R-E 同型）；getRejectStats
  // 损坏 JSON→空统计返回（展示面不炸导入，该次写入覆盖自愈）
  it('[R6] getRecvSeq 非数值存量值显性 throw；getRejectStats 损坏值→空统计 {count:0}（写入自愈）', () => {
    const { db, repo } = makeRepo()
    const upsertKey = db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, 't') ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    upsertKey.run(`${RECV_SEQ_PREFIX}owner-bad`, 'not-a-number')
    expect(() => repo.getRecvSeq('owner-bad')).toThrow(/recv_seq/)
    upsertKey.run(IMPORT_REJECT_STATS, '{corrupt-json')
    expect(repo.getRejectStats()).toEqual({
      count: 0,
      lastOwner: null,
      lastSeq: null,
      lastSha: null,
      lastReason: '',
      lastAt: ''
    })
    // 该次写入覆盖自愈
    repo.setRejectStats({ count: 1, lastOwner: 'o1', lastSeq: 1, lastSha: null, lastReason: 'hmac_fail', lastAt: 't' })
    expect(repo.getRejectStats()?.count).toBe(1)
    db.close()
  })

  it('对端密钥读：readPeerKey 缺席=null→snapshot.repo setPeerKey 落的 64-hex 原值可回读（验签钥解析面）', () => {
    const { db, repo } = makeRepo()
    expect(repo.readPeerKey('owner-x')).toBeNull()
    const snapshotRepo = createSnapshotRepo(db)
    snapshotRepo.setPeerKey('owner-x', 'ab'.repeat(32))
    expect(repo.readPeerKey('owner-x')).toBe('ab'.repeat(32))
    db.close()
  })

  it('FTS×3 rebuild 后检索命中：清空索引→papers_fts 检索缺席→rebuildFts()→命中恢复（external content 对账步）', () => {
    const { db, repo } = makeRepo()
    repo.upsertRow('papers', paperRow('p-fts', 't'))
    const match = () =>
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"絮凝剂投加量优化"'`).get()
    expect(match()).toBeTruthy()
    // 清索引=external content 'delete-all' 专用命令（'rebuild' 命令在本 schema
    // 列映射错位炸列——repo 头注偏离申报；直 DELETE 会回读 content 同炸）
    db.prepare(`INSERT INTO papers_fts (papers_fts) VALUES ('delete-all')`).run()
    expect(match()).toBeUndefined()
    repo.rebuildFts()
    expect(match()).toBeTruthy()
    db.close()
  })

  it('父先子后序全量落库：按 IMPORT_TABLE_ORDER 逐表 upsert 异源全行集→九表行数对账（表序正确性的正向锚）', () => {
    const { db, repo } = makeRepo()
    repo.upsertRow('collections', { id: 'c-1', name: '异源图', position: 0 })
    repo.upsertRow('tags', { id: 't-1', name: '异源标签', color: null, folder_id: '__main__' })
    repo.upsertRow('papers', paperRow('p-1', '2026-02-01T00:00:00.000Z'))
    repo.upsertRow('lineage_nodes', nodeRow('ln-1', { paper_id: 'p-1' }))
    repo.upsertRow('paper_tags', { paper_id: 'p-1', tag_id: 't-1' })
    repo.upsertRow('notes', { id: 'n-1', paper_id: 'p-1', title: '', content_md: '异源笔记', created_at: 't', updated_at: 't' })
    repo.upsertRow('annotations', { id: 'a-1', paper_id: 'p-1', page: 0, kind: 'highlight', color: 'yellow', quote_text: '引文', prefix_text: '', suffix_text: '', start_offset: 0, end_offset: 0, rects_json: '[]', sort_key: '0000:01', comment: '', created_at: 't', updated_at: 't' })
    repo.upsertRow('lineage_edges', edgeRow('le-1', 'ln-1', 'ln-1'))
    repo.upsertRow('lineage_graph_meta', { key: 'k-1', value: 'v', updated_at: 't' })
    // 010/012 播种行在场（lineTypes '[]'@epoch/__main__——R-C 种子行面）：collections
    // /lineage_graph_meta 计数=播种 1+异源 1，余表恰 1
    const expectCount: Array<[string, number]> = [
      ['papers', 1],
      ['collections', 2],
      ['tags', 1],
      ['paper_tags', 1],
      ['notes', 1],
      ['annotations', 1],
      ['lineage_nodes', 1],
      ['lineage_edges', 1],
      ['lineage_graph_meta', 2]
    ]
    for (const [t, n] of expectCount) {
      expect((db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c, `${t} 计数`).toBe(n)
    }
    expect(
      (db.prepare(`SELECT value FROM lineage_graph_meta WHERE key='lineTypes'`).get() as { value: string }).value
    ).toBe('[]')
    db.close()
  })
})
