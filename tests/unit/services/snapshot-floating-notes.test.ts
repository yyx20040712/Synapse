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
import { decodeEnvelope, type ExportPayload } from '../../../src/main/services/snapshot/envelope.codec'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'
import { APP_META_KEYS } from '../../../src/shared/models/app-meta'
import type { SnapshotImportRes } from '../../../src/shared/ipc/schemas'
import type { FloatingNote } from '../../../src/shared/models/lineage'
import type { LineageEntityDelta } from '../../../src/shared/ipc/lineage-history.schemas'
import { ms, presetTombstone, rowOf, setUpdatedAt, tombstonesOf } from '../../utils/lineage-history-db'
import {
  exportVol as exportSide,
  importVol as importSide,
  makeSnapshotSide,
  pair as pairSides,
  type SnapshotSide
} from '../../utils/snapshot-lineage-sides'

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

/**
 * [B4 L1 / 设计稿 §7.5] 快照三段闭环真库序列（悬浮笔记侧）：段二「先读本地行」
 * （活行在场走 LWW/缺席+有 tombstone=skippedRevive/缺席无 tombstone=插入）+
 * 段三删事件按 deleted_at 代际判定（恢复/改写胜出=skippedSuperseded）。进入
 * 未来毫秒区=预置远未来 tombstone（同技术——守卫恒取「旧行+1ms」项）。
 */
describe('F-B4-L1 §7.5 快照三段闭环（floating_notes 侧——真库序列 1/4/5/6/8）', () => {
  const OWNER_Z = '5e4d0c26-7f8a-4b3c-9d4e-1a2b3c4d5e6f'
  const T = '2999-01-01T00:00:00.000Z'
  const U1 = '2026-02-01T00:00:00.000Z'

  function seedFn(side: SnapshotSide, id: string, content: string, updatedAt: string): FloatingNote {
    const n = side.repos.floatingNotes.upsert({ id, folderId: 'f-a', x: 10, y: 20, content })
    setUpdatedAt(side.db, 'floating_notes', id, updatedAt)
    return { ...n, updatedAt }
  }
  const noteRow = (side: SnapshotSide, id: string) =>
    side.db.prepare('SELECT x, y, content, updated_at FROM floating_notes WHERE id = ?').get(id) as
      | { x: number; y: number; content: string; updated_at: string }
      | undefined
  const restoreDelta = (note: FloatingNote): LineageEntityDelta => ({ kind: 'floating-note', id: note.id, before: note, after: null })
  const restore = (side: SnapshotSide, note: FloatingNote): void => {
    side.history.unit({ folderId: note.folderId, unitId: `u-${note.id}`, direction: 'undo', changes: [restoreDelta(note)] })
  }

  /** 解码导出卷明文（§13.6 envelope：文件字节 canonical JSON→decodeEnvelope 验签解密→payload
   *  JSON；syncKey=本文件既有 syncKeyOf 读侧库 app_meta）——[M-W02 回炉] 序列 8
   *  「卷内=全部 tombstone」直接断言卷内容，不再只重查源库 */
  const decodeVol = (side: SnapshotSide, bytes: Buffer): ExportPayload => {
    const decoded = decodeEnvelope(JSON.parse(bytes.toString('utf8')), syncKeyOf(side))
    if (!decoded.ok) throw new Error(`导出卷解码失败：${decoded.reason}`)
    return JSON.parse(decoded.plaintext.toString('utf8')) as ExportPayload
  }

  it('序列 1 本地三序列：删除未恢复→旧卷 skippedRevive；删除→原 id 恢复→携带更旧 tombstone 的卷不吞活行（skippedSuperseded）；恢复后再删→旧卷再次 skippedRevive', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pairSides(y, x)
    x.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    const note = seedFn(x, 'fn-1', '三序列', U1)
    expect(importSide(y, exportSide(x)).outcome).toBe('applied')
    // (a) 删除未恢复→含活行的卷 skippedRevive
    y.repos.floatingNotes.remove('fn-1')
    const a = importSide(y, exportSide(x))
    expect(a.stats?.skippedRevive).toBe(1)
    expect(noteRow(y, 'fn-1')).toBeUndefined()
    // x 侧先行删除（其 tombstone 早于 y 的恢复）→携带该 tombstone 的卷
    x.repos.floatingNotes.remove('fn-1')
    const volTomb = exportSide(x)
    // (b) 删除→history-unit 原 id 恢复→旧卷（更旧 tombstone）不吞活行
    restore(y, note)
    const restored = noteRow(y, 'fn-1')!
    expect(restored.content).toBe('三序列')
    expect(tombstonesOf(y.db, 'floating_notes', 'fn-1')).toHaveLength(1)
    const b = importSide(y, volTomb)
    expect(b.outcome).toBe('applied')
    expect(b.stats?.skippedSuperseded).toBe(1)
    expect(b.stats?.deleted).toBe(0)
    expect(noteRow(y, 'fn-1')).toEqual(restored) // 活行原样
    // (c) 恢复后再次删除→含活行的卷再次 skippedRevive
    y.repos.floatingNotes.remove('fn-1')
    restore(x, note) // x 侧恢复→卷再携活行
    const c = importSide(y, exportSide(x))
    expect(c.stats?.skippedRevive).toBe(1)
    expect(noteRow(y, 'fn-1')).toBeUndefined()
    x.db.close()
    y.db.close()
  })

  it('序列 4 同毫秒恢复：预置远未来 tombstone T→守卫恢复行 updated_at 严格大于 T；导出→持更旧活行的对端导入后活行存活并更新为恢复值', () => {
    const y = makeSnapshotSide(OWNER_Y)
    const z = makeSnapshotSide(OWNER_Z)
    y.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    z.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    presetTombstone(y.db, 'floating_notes', 'fn-4', T)
    restore(y, { id: 'fn-4', folderId: 'f-a', x: 1, y: 2, content: '恢复值', createdAt: U1, updatedAt: T })
    const restored = noteRow(y, 'fn-4')!
    expect(ms(restored.updated_at)).toBeGreaterThan(ms(T))
    expect(restored.content).toBe('恢复值')
    // 对端持更旧活行
    seedFn(z, 'fn-4', '对端旧活行', U1)
    pairSides(z, y)
    const res = importSide(z, exportSide(y))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.updated).toBe(1)
    expect(noteRow(z, 'fn-4')).toEqual(restored) // 存活且=恢复值
    y.db.close()
    z.db.close()
  })

  it('序列 5 同毫秒再删除：恢复行 updated_at=U 后紧接真库 DELETE→新 tombstone 在场（UNIQUE 未吞，行数+1）且 deleted_at 严格大于 U；导出→持恢复行的对端被删（新删事件胜）', () => {
    const y = makeSnapshotSide(OWNER_Y)
    const z = makeSnapshotSide(OWNER_Z)
    y.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    z.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    presetTombstone(y.db, 'floating_notes', 'fn-5', T)
    restore(y, { id: 'fn-5', folderId: 'f-a', x: 1, y: 2, content: '恢复值', createdAt: U1, updatedAt: T })
    const u = noteRow(y, 'fn-5')!.updated_at
    y.repos.floatingNotes.remove('fn-5')
    const tombs = tombstonesOf(y.db, 'floating_notes', 'fn-5')
    expect(tombs).toHaveLength(2)
    expect(ms(tombs[1]!)).toBeGreaterThan(ms(u))
    // 对端持恢复行（updated_at=U）
    seedFn(z, 'fn-5', '恢复值', u)
    pairSides(z, y)
    const res = importSide(z, exportSide(y))
    expect(noteRow(z, 'fn-5')).toBeUndefined()
    expect(res.stats?.deleted).toBe(1)
    expect(res.stats?.skippedSuperseded).toBe(1) // 预置的更旧 tombstone T<U 被跳过
    y.db.close()
    z.db.close()
  })

  it('序列 8 交错链：删除→恢复→普通写→再删除→导出→对端导入（新删未吞/对端持恢复行或普通写行均被删/普通写值不复活）', () => {
    const y = makeSnapshotSide(OWNER_Y)
    const zHoldRestored = makeSnapshotSide(OWNER_Z)
    const zHoldNormal = makeSnapshotSide('6f7e1d37-2a8b-4c5d-9e6f-2b3a4c5d6e7f')
    for (const side of [y, zHoldRestored, zHoldNormal]) {
      side.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    }
    presetTombstone(y.db, 'floating_notes', 'fn-8', T)
    restore(y, { id: 'fn-8', folderId: 'f-a', x: 1, y: 2, content: '恢复值', createdAt: U1, updatedAt: T })
    const restoredAt = rowOf(y.db, 'floating_notes', 'fn-8')!.updated_at
    y.repos.floatingNotes.upsert({ id: 'fn-8', folderId: 'f-a', x: 30, y: 40, content: '普通写值' }) // 普通 repo 写（裸 now 回拨域）
    const normal = noteRow(y, 'fn-8')!
    expect(ms(normal.updated_at)).toBeGreaterThan(ms(restoredAt)) // 本地普通写不倒退
    expect(normal).toMatchObject({ x: 30, y: 40, content: '普通写值' }) // 内容=普通写值
    const before = tombstonesOf(y.db, 'floating_notes', 'fn-8').length
    y.repos.floatingNotes.remove('fn-8')
    const tombs = tombstonesOf(y.db, 'floating_notes', 'fn-8')
    expect(tombs).toHaveLength(before + 1) // 再删事件未被 UNIQUE 吞
    expect(ms(tombs[tombs.length - 1]!)).toBeGreaterThan(ms(normal.updated_at))
    const vol = exportSide(y)
    expect(tombstonesOf(y.db, 'floating_notes', 'fn-8')).toHaveLength(before + 1) // 卷内=全部 tombstone；本地无该 id 活行
    expect(noteRow(y, 'fn-8')).toBeUndefined()
    // [M-W02 回炉] 解码导出卷直接断言（上方「卷内=全部 tombstone」不再只重查源库）：卷内该 id
    // 的 deletion_events 全集=源库（条数与 deleted_at 值，seq 序）；卷内无该 id 活行
    const exported = decodeVol(y, vol)
    const volTombs = exported.deletions.filter((d) => d.entity === 'floating_notes' && d.id === 'fn-8').map((d) => d.deleted_at)
    expect(volTombs).toHaveLength(before + 1)
    expect(volTombs).toEqual(tombstonesOf(y.db, 'floating_notes', 'fn-8'))
    expect(exported.data.floating_notes?.filter((r) => r.id === 'fn-8')).toEqual([]) // 卷缺该表=undefined≠[]，不恒真
    seedFn(zHoldRestored, 'fn-8', '恢复值', restoredAt)
    pairSides(zHoldRestored, y)
    expect(importSide(zHoldRestored, vol).outcome).toBe('applied')
    expect(noteRow(zHoldRestored, 'fn-8')).toBeUndefined() // 持恢复行→被删
    seedFn(zHoldNormal, 'fn-8', '普通写值', normal.updated_at)
    pairSides(zHoldNormal, y)
    const resN = importSide(zHoldNormal, vol)
    expect(resN.outcome).toBe('applied')
    expect(noteRow(zHoldNormal, 'fn-8')).toBeUndefined() // 持普通写行→被删（普通写值不复活）
    expect(resN.stats?.deleted).toBe(1)
    y.db.close()
    zHoldRestored.db.close()
    zHoldNormal.db.close()
  })

  it('序列 6 写点守卫不变式：每条 tombstone 的 deleted_at 严格大于被删行删除前 updated_at；活行 updated_at 严格大于该 id 全部 tombstone（段三相等分支不可达）', () => {
    const y = makeSnapshotSide(OWNER_Y)
    y.db.prepare(`INSERT INTO collections (id, name, position) VALUES ('f-a', '夹甲', 0)`).run()
    // 行史采样：每次删除前记录行 updated_at
    const preDelete: Array<{ id: string; updated_at: string }> = []
    const pairedTombs: string[] = [] // [M-W02 回炉] 逐轮配对：每轮删除后立刻取该轮新产生的 tombstone
    presetTombstone(y.db, 'floating_notes', 'fn-k', T)
    restore(y, { id: 'fn-k', folderId: 'f-a', x: 1, y: 2, content: 'k', createdAt: U1, updatedAt: T })
    for (let round = 0; round < 3; round++) {
      y.repos.floatingNotes.upsert({ id: 'fn-k', folderId: 'f-a', x: round, y: round, content: `第${round}轮` })
      preDelete.push({ id: 'fn-k', updated_at: rowOf(y.db, 'floating_notes', 'fn-k')!.updated_at })
      const countBefore = tombstonesOf(y.db, 'floating_notes', 'fn-k').length
      y.repos.floatingNotes.remove('fn-k')
      // [M-W02 回炉] 该轮删除后立刻取新产生的 tombstone（seq 序尾部）：恰一枚、严格大于该轮删除前 updated_at
      const added = tombstonesOf(y.db, 'floating_notes', 'fn-k').slice(countBefore)
      expect(added, `第 ${round} 轮删除恰新增一枚 tombstone`).toHaveLength(1)
      pairedTombs.push(added[0]!)
      expect(ms(added[0]!), `第 ${round} 轮 tombstone 严格大于该轮删除前 updated_at`).toBeGreaterThan(ms(preDelete[round]!.updated_at))
      restore(y, { id: 'fn-k', folderId: 'f-a', x: 1, y: 2, content: 'k', createdAt: U1, updatedAt: T })
    }
    const tombs = tombstonesOf(y.db, 'floating_notes', 'fn-k').map(ms)
    // 每条真实删除产生的 tombstone（排除预置的 T）严格大于其删除前 updated_at
    const realTombs = tombs.filter((t) => t !== ms(T))
    expect(realTombs).toHaveLength(preDelete.length)
    for (const pre of preDelete) expect(realTombs.some((t) => t > ms(pre.updated_at))).toBe(true)
    const live = ms(rowOf(y.db, 'floating_notes', 'fn-k')!.updated_at)
    for (const t of tombs) expect(live).toBeGreaterThan(t) // 活行晚于全部 tombstone → row.updated_at===deleted_at 不可达
    // [M-W02 回炉] 逐对（按 seq 序）：各轮 tombstone=日志尾部同序、严格大于同轮删除前 updated_at、逐轮严格递增
    const tombTexts = tombstonesOf(y.db, 'floating_notes', 'fn-k')
    expect(tombTexts.slice(tombTexts.length - pairedTombs.length)).toEqual(pairedTombs)
    for (const [round, pre] of preDelete.entries()) expect(ms(pairedTombs[round]!)).toBeGreaterThan(ms(pre.updated_at))
    for (let i = 1; i < pairedTombs.length; i++) expect(ms(pairedTombs[i]!)).toBeGreaterThan(ms(pairedTombs[i - 1]!))
    y.db.close()
  })
})
