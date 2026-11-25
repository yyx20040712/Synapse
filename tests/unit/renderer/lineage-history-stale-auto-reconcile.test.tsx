// @vitest-environment jsdom
/**
 * [B5 设计稿 §7.2「history-unit 在 Q0/F0 失败后：alert、message、source、stale 标记和两栈都保留」／
 * §12 E08「告警在两种情况下都不丢」——主控裁决 A 案 2026-11-25（C 波）] 结构事件自动和解不清站立的 error。
 *
 * 交错（设计稿未逐条覆盖，按 §7.2 文义闭合）：history-unit 在 Q0/F0 被拒（B5 C2=B 后 lineagePending
 * 已释放→结构写放行）→main 发 folders.changed→lineage-folder-reconcile #41：活动会话 IO clean→
 * lane.reconcileNow()→runReconcile 起手写 saving 覆盖 error→和解成功→settleIoPhase 按 Q=0 收为 clean
 * →告警连同其内的 stale 丢弃出口一起消失。§6.1 清除行只列「普通写成功、history 成功」——自动和解
 * 成功不在其内，清告警属无据旁路。修法=reconcileNow 入口记 wasError，和解未失败时收尾还原相位
 * （settleEdit 的 wasError 同型）；和解自身失败仍按 §6.1「显式 reconcileNow 的和解失败」落 save 源＋
 * 新 message（负对照）。
 * 真 service 链与工具栏宿主见 lineage-history-stale-fixture（内存真库＋真 service；四种拒因由真
 * service 发射）。顺序契约：本件第一条 import=夹具。always-active。
 */
import {
  DROP_BTN,
  ERROR_ROW,
  edit,
  forkInput,
  dbNode,
  drove,
  mountToolbar,
  q,
  redoIds,
  rig,
  save,
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
import { describe, expect, it } from 'vitest'
import { seedPaper } from '../../utils/lineage-history-db'
import { lineageFolderReconcile } from '../../../src/renderer/features/lineage/lineage-folder-reconcile'
import { ioUnsettled } from '../../../src/renderer/features/lineage/lineage-io-phase'
import { writeErrorAlert } from '../../../src/renderer/features/lineage/lineage-write-failure'

setupStaleExitFixture()

/** 驻到 Q0/F0 的 history-undo 失败（真实分叉 HISTORY_STALE：栈顶项实体由 repo 直接改过） */
async function reachHistoryStaleError(): Promise<{ olderId: string | undefined; topId: string | undefined }> {
  seedPaper(rig().db, 'p-a')
  seedPaper(rig().db, 'p-b')
  seedTwoNodes()
  seedSession()
  edit(() => {
    state().moveNode('A', 10, 10)
    state().moveNode('B', 20, 20)
  })
  await save()
  const [olderId, topId] = undoIds()
  rig().repos.lineage.upsertNode(forkInput(dbNode('B')!, { x: 77, y: 77 }))
  mountToolbar()
  expect(await undo()).toBe(false) // HISTORY_STALE
  // 前置（§2.4 行 3／§7.2）：error＋history-undo 源＋Q0/F0＋位保留＋stale 标记
  expect(state().saveStatus).toBe('error')
  expect(state().lastWriteErrorSource).toBe('history-undo')
  expect(ioUnsettled(state())).toBe(false)
  expect(state().needsReload).toBe(true)
  expect(staleMark()).not.toBeNull()
  expect(q(DROP_BTN)).not.toBeNull()
  return { olderId, topId }
}

describe('Q0/F0 history 失败 × 结构事件自动和解（#41 reconcileNow）', () => {
  it('自动和解成功：位已清（图数据不陈旧）、相位仍 error、message/source 不动、告警「撤销失败」与丢弃出口仍在、两栈不动', async () => {
    const { olderId, topId } = await reachHistoryStaleError()
    const markBefore = staleMark()
    const graphCallsBefore = stubApi.lineage.graph.mock.calls.length
    await drove(async () => {
      lineageFolderReconcile.onStructureChanged() // 结构事件：活动会话 IO clean→立即单飞和解
      await settle()
    })
    expect(stubApi.lineage.graph.mock.calls.length, '自动和解已发权威读').toBeGreaterThan(graphCallsBefore)
    expect(state().needsReload, '和解成功=needsReload 清位（不推迟和解）').toBe(false)
    expect(state().inflight).toBeNull()
    expect(state().saveStatus, '自动和解成功不清站立的 error 相位（§7.2 alert 保留）').toBe('error')
    expect(state().lastWriteError).toBe(staleMessage('B'))
    expect(state().lastWriteErrorSource).toBe('history-undo')
    expect(
      writeErrorAlert({
        saveStatus: state().saveStatus,
        lastWriteError: state().lastWriteError,
        lastWriteErrorSource: state().lastWriteErrorSource
      })
    ).toMatchObject({ kind: 'alert', retrySave: false, dropStale: true })
    expect(q(ERROR_ROW)?.textContent).toContain(`撤销失败：${staleMessage('B')}`)
    expect(q(DROP_BTN), 'stale 丢弃出口仍在（告警的宿主未被清）').not.toBeNull()
    expect(staleMark()).toEqual(markBefore)
    expect(undoIds()).toEqual([olderId, topId])
    expect(redoIds()).toEqual([])
    expect(ioUnsettled(state()), 'history 零写失败不互斥结构写').toBe(false)
  })

  it('负对照：自动和解自身失败——按 §6.1 落 save 源＋新 message（不还原旧 history 告警）、位保留、丢弃出口仍在', async () => {
    await reachHistoryStaleError()
    rig().db.close() // 真系统型失败格：权威读抛错→和解失败（fold→{ok:false}）
    await drove(async () => {
      lineageFolderReconcile.onStructureChanged()
      await settle()
    })
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteErrorSource, '和解失败来源=save（发起命令显式传入）').toBe('save')
    expect(state().lastWriteError, '新 message——旧 history 消息不被还原').not.toBe(staleMessage('B'))
    expect(state().lastWriteError).not.toBe('')
    expect(state().needsReload, '和解失败位保留').toBe(true)
    expect(state().inflight).toBeNull()
    expect(q(ERROR_ROW)?.textContent).toContain('保存失败：')
    expect(q(DROP_BTN), '较早的 stale 标记仍合法→丢弃出口保留（§6.2）').not.toBeNull()
    expect(staleMark()).not.toBeNull()
  })
})
