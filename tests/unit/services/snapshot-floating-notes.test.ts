/**
 * [F-VISFB-61] 快照面悬浮笔记扩展锁定测试（B6-61 d1 B2 补全面；任务书
 * §5-B6/§7 防线行「快照导出导入往返+防复活」）。
 *
 * 覆盖：导出面 table_counts 含 floating_notes（TABLE_SPECS 九键→十表）+
 * 导入往返（upsert 落库——updated_at LWW 分支含新表）+防复活（本地已删
 * note+再导入含该 note 的新卷 → skippedRevive 不复活——INV-132 兑现面）+
 * LWW 陈旧跳过（本地行较新 → skippedStale 值保持）。
 * always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */
import { describe, expect, it } from 'vitest'
import { createExportSnapshotService } from '../../../src/main/services/snapshot/export-snapshot.service'
import { createImportSnapshotService } from '../../../src/main/services/snapshot/import-snapshot.service'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'
import { APP_META_KEYS } from '../../../src/shared/models/app-meta'
import type { SnapshotImportRes } from '../../../src/shared/ipc/schemas'

type Db = ReturnType<typeof createTestDb>
type Repos = ReturnType<typeof createRepos>

const OWNER_X = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
const OWNER_Y = '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'

interface Side {
  owner: string
  db: Db
  repos: Repos
}

/** 组装：真库+身份固定+固定 nonce（同 import-snapshot.service.test 构造法） */
function makeSide(owner: string): Side {
  const db = createTestDb()
  const repos = createRepos(db)
  repos.appMeta.ensureIdentity()
  repos.snapshot.ensureSyncKey()
  db.prepare('UPDATE app_meta SET value = ? WHERE key = ?').run(owner, APP_META_KEYS.ownerId)
  return { owner, db, repos }
}

function exportVol(side: Side): { bytes: Buffer; counts: Record<string, number> } {
  const exporter = createExportSnapshotService({
    repos: side.repos,
    makeNonce: () => Buffer.from('0123456789ab', 'utf8')
  })
  const built = exporter.exportToBuffer()
  exporter.commitExport(built.snapshotSeq)
  return { bytes: built.bytes, counts: built.tableCounts }
}

function importVol(side: Side, bytes: Buffer): SnapshotImportRes {
  return createImportSnapshotService({ repos: side.repos }).importFromBuffer(bytes)
}

function seedNote(side: Side, id: string, folderId: string, content: string, updatedAt: string): void {
  side.db
    .prepare(
      `INSERT INTO floating_notes (id, folder_id, x, y, content, created_at, updated_at)
       VALUES (?, ?, 10, 20, ?, '2026-01-01T00:00:00.000Z', ?)`
    )
    .run(id, folderId, content, updatedAt)
}

function noteIds(side: Side): string[] {
  return (
    side.db.prepare('SELECT id FROM floating_notes ORDER BY id').all() as Array<{ id: string }>
  ).map((r) => r.id)
}

describe('F-VISFB-61 快照面 floating_notes（TABLE_SPECS 十表——d1 B2 补全面）', () => {
  it('导出面：table_counts 含 floating_notes=行数（十键恰 §13.7 表集扩展）', () => {
    const x = makeSide(OWNER_X)
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    seedNote(x, 'fn-1', 'f-a', '卷内笔记', '2026-02-01T00:00:00.000Z')
    seedNote(x, 'fn-2', '__main__', '主图笔记', '2026-02-02T00:00:00.000Z')
    const { counts } = exportVol(x)
    expect(counts.floating_notes).toBe(2)
    x.db.close()
  })

  it('导入往返：发送端卷导入接收端 → floating_notes 行落库（值对账）；再导出接收端卷含同表', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    seedNote(x, 'fn-1', 'f-a', '往返笔记', '2026-02-01T00:00:00.000Z')
    const vol = exportVol(x)
    y.repos.snapshot.setPeerKey(x.owner, syncKeyOf(x))
    const res = importVol(y, vol.bytes)
    expect(res.outcome).toBe('applied')
    expect(noteIds(y)).toEqual(['fn-1'])
    const row = y.db
      .prepare('SELECT folder_id, x, y, content FROM floating_notes WHERE id = ?')
      .get('fn-1') as { folder_id: string; x: number; y: number; content: string }
    expect(row).toEqual({ folder_id: 'f-a', x: 10, y: 20, content: '往返笔记' })
    // 接收端再导出：floating_notes 随卷携带（往返闭合）
    expect(exportVol(y).counts.floating_notes).toBe(1)
    x.db.close()
    y.db.close()
  })

  it('防复活：接收端本地已删 note+再导入含该 note 的新卷 → skippedRevive 计数+行不复活（INV-132 兑现面）', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    seedNote(x, 'fn-1', 'f-a', '将被拒复活', '2026-02-01T00:00:00.000Z')
    const vol1 = exportVol(x)
    y.repos.snapshot.setPeerKey(x.owner, syncKeyOf(x))
    expect(importVol(y, vol1.bytes).outcome).toBe('applied')
    expect(noteIds(y)).toEqual(['fn-1'])
    // 本地删除（repo 用户路径——guard=0 触发器落 deletion_events）
    y.repos.floatingNotes.remove('fn-1')
    expect(noteIds(y)).toEqual([])
    // 发送端再导新卷（seq+1——同 note 仍在发送端库）：防复活过滤跳过 upsert
    const vol2 = exportVol(x)
    const res2 = importVol(y, vol2.bytes)
    expect(res2.outcome).toBe('applied')
    expect(res2.stats?.skippedRevive).toBe(1)
    expect(noteIds(y)).toEqual([])
    x.db.close()
    y.db.close()
  })

  it('[回炉 R6] 域删防复活：本地删夹（FK CASCADE 级联删笔记+021 族触发器逐行落账）→导入含该夹笔记的卷→skippedRevive+行不复活+夹不复活+无 FK 违约', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    seedNote(x, 'fn-1', 'f-a', '域删防复活笔记', '2026-02-01T00:00:00.000Z')
    const vol1 = exportVol(x)
    y.repos.snapshot.setPeerKey(x.owner, syncKeyOf(x))
    expect(importVol(y, vol1.bytes).outcome).toBe('applied')
    expect(noteIds(y)).toEqual(['fn-1'])
    // 本地删夹：FK CASCADE 级联删笔记+触发器逐行落账（collections+floating_notes
    // 两实体行——级联触发器落账=防复活数据源的设计论证锚）
    y.db.prepare('DELETE FROM collections WHERE id = ?').run('f-a')
    expect(noteIds(y)).toEqual([])
    const vol2 = exportVol(x)
    const res2 = importVol(y, vol2.bytes)
    // applied 即事务成功=无 FK 违约（collections 行被防复活过滤先行跳过——
    // floating_notes 行不落孤儿 upsert）
    expect(res2.outcome).toBe('applied')
    expect(res2.stats?.skippedRevive).toBe(2)
    expect(noteIds(y)).toEqual([])
    expect((y.db.prepare('SELECT COUNT(*) c FROM collections WHERE id = ?').get('f-a') as { c: number }).c).toBe(0)
    x.db.close()
    y.db.close()
  })

  it('LWW 陈旧跳过：本地行 updated_at 较新 → 入站旧行 skippedStale+本地值保持', () => {
    const x = makeSide(OWNER_X)
    const y = makeSide(OWNER_Y)
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    seedNote(x, 'fn-1', 'f-a', '旧值', '2026-02-01T00:00:00.000Z')
    const vol1 = exportVol(x)
    y.repos.snapshot.setPeerKey(x.owner, syncKeyOf(x))
    importVol(y, vol1.bytes)
    // 本地行拨新（晚于发送端 updated_at）
    y.db
      .prepare(`UPDATE floating_notes SET content = '本地新值', updated_at = ? WHERE id = 'fn-1'`)
      .run('2026-03-01T00:00:00.000Z')
    const vol2 = exportVol(x)
    const res2 = importVol(y, vol2.bytes)
    expect(res2.outcome).toBe('applied')
    expect(res2.stats?.skippedStale).toBe(1)
    const content = (y.db.prepare('SELECT content FROM floating_notes WHERE id = ?').get('fn-1') as { content: string }).content
    expect(content).toBe('本地新值')
    x.db.close()
    y.db.close()
  })
})

function syncKeyOf(side: Side): string {
  return (side.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as { value: string })
    .value
}
