// @vitest-environment jsdom
/**
 * [回炉 W-B2·实验① / 设计稿 §2.3 sessionGeneration、§9.3「useCardDrag 的回调必须捕获
 * folderId+sessionGeneration+drag id…兜底写仍只到原会话」] 主图会话就地换代（ghost remap 落库后
 * 存活的主图缓存会话换 sessionGeneration——lineage-session-remap）时进行中的拖拽，落位写不得被丢弃。
 *
 * 判别设计（真实 registry+拖拽桥接）：拖拽激活时桥接态登记捕获代际 gen → 触发 remap 落库使存活会话
 * 就地换代 → 拖拽收尾（包装 finish 第一步 dragEnd，携激活时捕获的 gen）→ 落位写携 {gen, dragId} 进入
 * store.reorderMonthSlots。就地换代前后是同一个 entry（数据/队列/历史连续），落位必须被接纳；
 * 恢复替换/改键=新 entry（桥接态空）仍被拒（对照）。
 * 夹具=lineage-remap-test-fixture（先工厂后被测模块）。always-active 裸 describe（K3）。
 */
import {
  DOOM, MAIN, cleanupRemapFixture, ghostStubs, node, registry, resetRemapFixture, settle, state, stubApi
} from './lineage-remap-test-fixture'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import { getConflictState, resolveGhostFolderDecision } from '../../../src/renderer/features/lineage/conflictResolution'
import { defaultLineTypeNames, type LineageNode } from '@shared/models/lineage'

/** 月组内两卡（slot 0/1）——重排产生真实变化（单卡重排=语义 no-op） */
function monthPair(): LineageNode[] {
  const base = { paperId: null, title: '', year: 2022, x: null, y: null, month: 9, folderId: MAIN, createdAt: 't', updatedAt: 't' }
  return [
    { ...base, id: 'A', slot: 0 },
    { ...base, id: 'B', slot: 1 }
  ]
}

beforeEach(async () => {
  await resetRemapFixture()
  toastStoreSpy.mockClear()
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...req, id: req.id ?? 'X', updatedAt: 'server' } as LineageNode }))
})

afterEach(() => {
  cleanupRemapFixture()
})

/** 后台死夹会话的 ghost remap 落库（主图为活动会话——存活会话就地换代，不夺活动会话） */
async function landRemapOnMain(): Promise<void> {
  ghostStubs()
  // 主图权威读回显两卡（夹具的 B 卡只在内存——权威图须含它，否则落位重排找不到节点）
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => ({
    ok: true,
    data: { nodes: req.folderId === MAIN ? monthPair() : [node('A', req.folderId)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] }
  }))
  state().setFolder(DOOM)
  await settle()
  state().addFloatingNote(0, 0, '甲')
  state().setFolder(MAIN) // 死夹 flush-first→CONFLICT→询问挂起
  await settle()
  expect(getConflictState().pending).toEqual({ folderId: DOOM })
  resolveGhostFolderDecision('remap-main-graph')
  await settle(40)
  expect(registry.entry(DOOM)).toBeUndefined() // 前提：remap 已落库、被矫正会话离场
}

describe('就地换代的存活会话上的进行中拖拽', () => {
  it('落位写不得因 sessionGeneration 变化被丢弃：同一 entry 收尾的拖拽按 dragId 重锚，落位成单元并落库', async () => {
    const main = registry.entry(MAIN)!
    registry.update(MAIN, { nodes: monthPair() })
    const generationAtDragStart = main.data.sessionGeneration
    registry.dragStart(MAIN, generationAtDragStart, 'drag-live') // 态一登记（useCardDrag 激活沿同型）
    await landRemapOnMain()
    expect(registry.entry(MAIN)).toBe(main) // 存活会话=同一 entry
    expect(main.data.sessionGeneration).toBeGreaterThan(generationAtDragStart) // 前提：就地换代已发生
    registry.dragEnd(MAIN, generationAtDragStart, 'drag-live') // 包装 finish 第一步（携激活时捕获的代际）
    const landed = state().reorderMonthSlots({ folderId: MAIN, generation: generationAtDragStart, dragId: 'drag-live' }, ['B', 'A'])
    expect(landed, '就地换代不改变会话身份连续性——落位须被接纳').toBe(true)
    expect(main.data.undoStack).toHaveLength(1) // 落位=一复合单元
    expect(main.data.nodes.map((n) => n.id)).toEqual(['B', 'A']) // 乐观重排即时
    await registry.lane(MAIN).save()
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(main.data.saveStatus).toBe('clean')
    expect(toastStoreSpy).not.toHaveBeenCalledWith('拖拽调整的目标图已不在当前会话，本次落位未写入', 'error')
  })

  it('对照：换代后才激活的新拖拽捕获新代际，照常落位', async () => {
    const main = registry.entry(MAIN)!
    registry.update(MAIN, { nodes: monthPair() })
    await landRemapOnMain()
    const generation = main.data.sessionGeneration
    registry.dragStart(MAIN, generation, 'drag-after')
    registry.dragEnd(MAIN, generation, 'drag-after')
    expect(state().reorderMonthSlots({ folderId: MAIN, generation, dragId: 'drag-after' }, ['B', 'A'])).toBe(true)
    expect(main.data.undoStack).toHaveLength(1)
  })

  it('重锚记录按 dragId 专项匹配：同代际的另一 dragId 不被接纳（不写会话）', async () => {
    const main = registry.entry(MAIN)!
    registry.update(MAIN, { nodes: monthPair() })
    const generation = main.data.sessionGeneration
    registry.dragStart(MAIN, generation, 'drag-live')
    registry.update(MAIN, { sessionGeneration: generation + 1 }) // 就地换代
    registry.dragEnd(MAIN, generation, 'drag-live') // 记录={dragId:'drag-live', generation}
    const impostor = state().reorderMonthSlots({ folderId: MAIN, generation, dragId: 'drag-other' }, ['B', 'A'])
    expect(impostor, '代际相符但 dragId 不符——不得借用重锚记录').toBe(false)
    expect(main.data.undoStack).toHaveLength(0)
    expect(state().reorderMonthSlots({ folderId: MAIN, generation: generation + 1, dragId: 'drag-live' }, ['B', 'A']), 'dragId 相符但代际不是记录的捕获代际——按代际相等放行（常规路径）').toBe(true)
    expect(main.data.undoStack).toHaveLength(1)
  })

  it('对照：恢复替换=新 entry——旧代际的落位仍被拒（不写新会话）', async () => {
    const main = registry.entry(MAIN)!
    registry.update(MAIN, { nodes: monthPair() })
    const generation = main.data.sessionGeneration
    registry.dragStart(MAIN, generation, 'drag-replaced')
    const replacement = { ...main.data }
    registry.replace(MAIN, { nodes: replacement.nodes, edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [], status: 'ready' })
    registry.dragEnd(MAIN, generation, 'drag-replaced')
    expect(state().reorderMonthSlots({ folderId: MAIN, generation, dragId: 'drag-replaced' }, ['B', 'A'])).toBe(false)
    expect(registry.entry(MAIN)!.data.undoStack).toHaveLength(0)
    expect(toastStoreSpy).toHaveBeenCalledWith('拖拽调整的目标图已不在当前会话，本次落位未写入', 'error')
  })
})

describe('桥接态对就地换代不敏感（既有寻址不变）', () => {
  it('换代后携激活时代际的 dragFlight/dragLayout/dragEnd 仍命中同一拖拽', async () => {
    const main = registry.entry(MAIN)!
    const generation = main.data.sessionGeneration
    registry.dragStart(MAIN, generation, 'drag-addr')
    registry.update(MAIN, { sessionGeneration: generation + 1000 }) // 就地换代（模拟存活会话换身份）
    let resolveFlight!: () => void
    registry.dragFlight(MAIN, generation, 'drag-addr', new Promise<void>((r) => { resolveFlight = r }))
    expect(main.interaction.settleFlight).not.toBeNull() // 态二句柄已登记（未因代际变化脱靶）
    registry.dragLayout(MAIN, generation, 'drag-addr', true)
    expect(main.interaction.layoutActive).toBe(true)
    resolveFlight()
    registry.dragEnd(MAIN, generation, 'drag-addr')
    expect(registry.dragPending(MAIN)).toBe(false) // 两态已清（否则会话的编辑闸被永久占住）
  })
})
