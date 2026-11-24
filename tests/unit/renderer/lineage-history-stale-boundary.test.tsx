// @vitest-environment jsdom
/**
 * [回炉 W-B3·R-D1 / 用户裁决 D-1＝甲、适用面补充裁决＝乙；处置单 R-D1；design-inventory 表 3]
 * 过期历史出口的对照与边界（主路径见 lineage-history-stale-exit.test.tsx；夹具与真 service 链见
 * lineage-history-stale-fixture）。
 *
 * 覆盖：系统失败（真库失联，非 CONFLICT）不出现出口——历史项未失效、可重试；CONFLICT 但拒因不在
 * history-unit 四种之内不出现出口（拒因集合是命名谓词）；另一方向栈不受标记影响（成功移栈清标记）；
 * 项已不在栈顶＝动作不适用（出口不出现、丢弃调用零副作用）；写链在途＝丢弃不适用（不与在途链任务
 * 并发改栈）；确认框内 Escape／关闭 X＝取消不丢弃。always-active。
 */
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import type { GraphPayload } from './lineage-history-stale-fixture'
import {
  DROP_BTN,
  ERROR_ROW,
  click,
  dialog,
  drove,
  edit,
  forkInput,
  dbNode,
  mountToolbar,
  q,
  redo,
  redoIds,
  rig,
  save,
  seedNode,
  seedSession,
  seedTwoNodes,
  settle,
  staleMark,
  staleMessage,
  state,
  stubApi,
  undo,
  undoIds,
  setupStaleExitFixture
} from './lineage-history-stale-fixture'
import { seedPaper } from '../../utils/lineage-history-db'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

setupStaleExitFixture()

describe('R-D1 对照与边界', () => {
  it('系统失败（真库失联，非 CONFLICT）不出现出口：历史项未失效、可重试', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    rig().db.close() // 真系统型失败：底层库失联
    mountToolbar()
    expect(await undo()).toBe(false)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBeTruthy()
    expect(q(ERROR_ROW)).not.toBeNull() // 错误行照常可见
    expect(q(DROP_BTN), '系统失败不给出口').toBeNull()
    expect(staleMark()).toBeNull()
    expect(undoIds()).toHaveLength(1)
  })

  it('CONFLICT 但拒因不是 history-unit 的四种之一：不出现出口（拒因集合是命名谓词）', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'CONFLICT', message: '非 history-unit 拒因' } })
    mountToolbar()
    expect(await undo()).toBe(false)
    expect(state().saveStatus).toBe('error')
    expect(q(ERROR_ROW)).not.toBeNull()
    expect(q(DROP_BTN)).toBeNull()
    expect(staleMark()).toBeNull()
  })

  it('另一方向栈不受标记影响：undo 栈顶被标记过期时 redo 照常；成功移栈后标记清除', async () => {
    seedPaper(rig().db, 'p-a')
    seedPaper(rig().db, 'p-b')
    seedTwoNodes()
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
      state().moveNode('B', 20, 20)
    })
    await save()
    const [undoTopId] = undoIds()
    expect(await undo()).toBe(true) // B 回 0；undo 栈顶=A 项、redo=[B 项]
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    mountToolbar()
    expect(await undo()).toBe(false) // undo 栈顶项过期
    expect(staleMark()).toEqual({ direction: 'undo', entryId: undoTopId, reason: 'HISTORY_STALE', message: staleMessage('A') })
    expect(q(DROP_BTN)).not.toBeNull()
    // redo（另一方向）：不受 undo 方向标记影响
    expect(await redo()).toBe(true)
    expect(dbNode('B')?.x).toBe(20)
    expect(redoIds()).toEqual([])
    expect(undoIds()).toHaveLength(2)
    expect(staleMark()).toBeNull() // 成功移栈即清标记（原标记项已被压住——不再是栈顶）
    expect(q(DROP_BTN)).toBeNull()
  })

  it('项已不在栈顶＝动作不适用：新编辑压住标记项后出口不出现，丢弃调用零副作用', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    const [staleId] = undoIds()
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await undo()).toBe(false)
    expect(staleMark()).toEqual({ direction: 'undo', entryId: staleId, reason: 'HISTORY_STALE', message: staleMessage('A') })
    mountToolbar()
    expect(q(DROP_BTN)).not.toBeNull()
    edit(() => {
      state().moveNode('A', 88, 88) // 新编辑单元：undo 栈顶换人
    })
    // 夹具再现错误行（新编辑已把相位写成 dirty——错误行本就不显示）
    act(() => {
      useLineageStore.setState({ saveStatus: 'error', lastWriteError: staleMessage('A') })
    })
    expect(q(ERROR_ROW)).not.toBeNull()
    expect(q(DROP_BTN), '标记项已不在栈顶——出口不适用').toBeNull()
    expect(typeof state().discardStaleHistory).toBe('function')
    const before = undoIds()
    expect(before).toHaveLength(2)
    act(() => {
      state().discardStaleHistory()
    })
    expect(undoIds()).toEqual(before) // 零副作用
    expect(state().lastWriteError).toBe(staleMessage('A'))
    await save()
  })

  it('写链在途（F≠0）：丢弃不适用——栈与标记不动、相位不被改写；链落定后丢弃适用', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await undo()).toBe(false) // undo 栈顶项过期；needsReload 置位
    const mark = { direction: 'undo', entryId: undoIds()[0], reason: 'HISTORY_STALE', message: staleMessage('A') }
    expect(staleMark()).toEqual(mark)
    // 写链在途：save() 的链尾和解读挂起
    let release!: (v: { ok: true; data: GraphPayload }) => void
    stubApi.lineage.graph.mockImplementationOnce(() => new Promise((r) => {
      release = r
    }))
    const saving = state().save()
    await settle()
    expect(state().inflight?.kind).toBe('reconcile')
    expect(state().flushing).toBe(true)
    const idsBefore = undoIds()
    expect(typeof state().discardStaleHistory).toBe('function')
    act(() => {
      state().discardStaleHistory()
    })
    expect(undoIds()).toEqual(idsBefore) // 不与在途链任务并发改栈
    expect(staleMark()).toEqual(mark)
    expect(state().saveStatus).toBe('saving') // 相位未被丢弃动作改写
    expect(state().needsReload).toBe(true)
    release({ ok: true, data: rig().write.graph('__main__') })
    await drove(() => saving)
    expect(state().inflight).toBeNull()
    expect(state().needsReload).toBe(false) // 链尾和解已应用
    expect(staleMark()).toEqual(mark) // 写链在途期间的丢弃未生效——过期项仍在栈顶（IO 收口成功按既有语义清了错误行）
    // 链落定后丢弃适用
    act(() => {
      state().discardStaleHistory()
    })
    expect(undoIds()).toEqual([])
    expect(staleMark()).toBeNull()
    expect(state().saveStatus).toBe('clean')
  })

  it('确认框内 Escape＝取消（不丢弃）；关闭 X 同', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await undo()).toBe(false)
    mountToolbar()
    click(q(DROP_BTN), '丢弃出口')
    expect(dialog()).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(dialog()).toBeNull()
    expect(undoIds()).toHaveLength(1) // 未丢弃
    click(q(DROP_BTN), '丢弃出口')
    expect(dialog()).not.toBeNull()
    // 确认框经 portal 挂 document.body（不在工具组子树内）——从 document 查关闭 X
    click(document.querySelector('[role="dialog"] [aria-label="关闭对话框"]'), '关闭 X')
    expect(dialog()).toBeNull()
    expect(undoIds()).toHaveLength(1) // 未丢弃
    expect(q(DROP_BTN)).not.toBeNull() // 出口仍可用
  })
})
