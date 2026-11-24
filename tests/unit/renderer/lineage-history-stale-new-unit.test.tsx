// @vitest-environment jsdom
/**
 * [用户裁决 R11（处置单快照 handoff.reviewProgress.rulings）；设计稿 §2.5 #3 的补充；回炉 W-D2a]
 * 新编辑单元入栈时显式清除过期历史标记（lineage-session-ops recorder 的 runUnit 末尾 deps.set）。
 *
 * 判据：新单元必然让标记项离开其方向栈顶——undo 方向被新单元压住、redo 方向随 redo 清空——标记
 * 失效，直接置空。语义 no-op 不是编辑单元（不入栈、不清 redo），标记不动。
 * 置位路径（history-unit 以 CONFLICT 拒绝）与主路径回归见 lineage-history-stale-exit／
 * lineage-history-stale-boundary；夹具与真 service 链见 lineage-history-stale-fixture。
 * always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import {
  dbNode,
  edit,
  forkInput,
  redo,
  redoIds,
  rig,
  save,
  seedNode,
  seedSession,
  seedTwoNodes,
  staleMark,
  staleMessage,
  state,
  undo,
  undoIds,
  setupStaleExitFixture
} from './lineage-history-stale-fixture'
import { seedPaper } from '../../utils/lineage-history-db'

setupStaleExitFixture()

describe('R11 新编辑单元入栈清过期历史标记', () => {
  it('undo 方向标记：新编辑单元入栈即清标记（标记项被新单元压住）', async () => {
    seedPaper(rig().db, 'p-a')
    seedPaper(rig().db, 'p-b')
    seedTwoNodes()
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
      state().moveNode('B', 20, 20)
    })
    await save()
    expect(await undo()).toBe(true) // B 回 0；undo 栈顶=A 项、redo=[B 项]
    const aEntryId = undoIds()[0]
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await undo()).toBe(false) // undo 栈顶项过期：标记置位（undo 方向）
    expect(staleMark()).toEqual({ direction: 'undo', entryId: aEntryId, reason: 'HISTORY_STALE', message: staleMessage('A') })
    const redoBefore = redoIds()
    expect(redoBefore).toHaveLength(1)
    edit(() => {
      state().moveNode('B', 33, 33) // 新编辑单元：入 undo 栈顶
    })
    expect(staleMark(), '新单元入栈——标记项已离开栈顶，标记清除').toBeNull()
    const undoAfter = undoIds()
    expect(undoAfter).toHaveLength(2)
    expect(undoAfter[0]).toBe(aEntryId) // 更旧项保留
    expect(undoAfter[1]).not.toBe(aEntryId) // 新单元在栈顶
    expect(redoIds()).toEqual([]) // 新单元清 redo
  })

  it('redo 方向标记：新编辑单元清 redo，随之清标记', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    const aEntryId = undoIds()[0]
    expect(await undo()).toBe(true) // A 回 0；redo=[A 项]
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await redo()).toBe(false) // redo 栈顶项过期：标记置位（redo 方向）
    expect(staleMark()).toEqual({ direction: 'redo', entryId: aEntryId, reason: 'HISTORY_STALE', message: staleMessage('A') })
    edit(() => {
      state().moveNode('A', 5, 5) // 新编辑单元
    })
    expect(staleMark(), '新单元清 redo——标记项已不在栈顶，标记清除').toBeNull()
    expect(redoIds()).toEqual([])
    expect(undoIds()).toHaveLength(1)
  })

  it('语义 no-op 不是编辑单元：不入栈、不清 redo，标记不动', async () => {
    seedPaper(rig().db, 'p-a')
    seedPaper(rig().db, 'p-b')
    seedTwoNodes()
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
      state().moveNode('B', 20, 20)
    })
    await save()
    expect(await undo()).toBe(true) // B 回 0
    const aEntryId = undoIds()[0]
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await undo()).toBe(false) // undo 栈顶项过期：标记置位
    const mark = { direction: 'undo', entryId: aEntryId, reason: 'HISTORY_STALE', message: staleMessage('A') }
    expect(staleMark()).toEqual(mark)
    const undoBefore = undoIds()
    const redoBefore = redoIds()
    expect(redoBefore).toHaveLength(1)
    edit(() => {
      state().moveNode('B', 0, 0) // B 已回 0（上一步撤销）——指纹相等=语义 no-op
    })
    expect(undoIds()).toEqual(undoBefore) // 未入栈
    expect(redoIds()).toEqual(redoBefore) // 不清 redo
    expect(staleMark(), 'no-op 不清标记').toEqual(mark)
  })
})
