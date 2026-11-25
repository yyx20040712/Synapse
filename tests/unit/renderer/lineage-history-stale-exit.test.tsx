// @vitest-environment jsdom
/**
 * [回炉 W-B3·R-D1 / 用户裁决 D-1＝甲、适用面补充裁决＝乙；设计稿 §2.5 #18（失败两栈不动）的补充；
 * 处置单 R-D1；design-inventory 表 3] 过期历史出口——撤销/重做被 history-unit 以 CONFLICT 拒绝后，
 * 栈顶历史项永久不可达（后进先出，更旧的历史都撤不到）；原缺陷：没有任何路径丢弃该过期项，
 * 唯一出口是重启应用。
 *
 * 真 service 链与工具组宿主见 lineage-history-stale-fixture（内存真库＋真 lineage.service／
 * lineage-history-unit.service；四种拒因全部由真 service 发射；「真实分叉」＝历史项落库后由 repo
 * 直接改该实体）。
 *
 * 本件覆盖出口的主路径：HISTORY_STALE 真实分叉（撤销两次均被拒、两栈不动→未确认不丢弃→确认丢弃→
 * 更旧项可撤、丢弃不写数据库）；redo 方向；显式保存清 redo 时 redo 方向标记随之清；其余三种拒因
 * 表驱动（出口出现、确认后移除）。对照与边界（系统失败、拒因集合、另一方向栈、项已不在栈顶、
 * 写链在途、Escape）见 lineage-history-stale-boundary.test.tsx。always-active。
 */
import { describe, expect, it } from 'vitest'
import {
  ACTION_TEXT,
  DROP_BTN,
  ERROR_ROW,
  click,
  clickDialogButton,
  dbNode,
  dialog,
  drove,
  edit,
  forkInput,
  ipcCallCount,
  mountToolbar,
  q,
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
  unitCalls,
  setupStaleExitFixture
} from './lineage-history-stale-fixture'
import { seedFolder, seedPaper } from '../../utils/lineage-history-db'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

setupStaleExitFixture()

describe('R-D1 真实分叉·HISTORY_STALE（undo 方向）', () => {
  it('历史项落库后由 repo 直接改该实体→撤销两次均被拒、两栈不动→出口出现→未确认不丢弃→确认丢弃→更旧项可撤；丢弃不写数据库', async () => {
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
    expect(unitCalls()).toHaveLength(0)
    expect(dbNode('B')?.x).toBe(20) // 前置：两项编辑已落库
    // 真实分叉：栈顶历史项的实体被另一条路径改过
    rig().repos.lineage.upsertNode(forkInput(dbNode('B')!, { x: 77, y: 77 }))
    expect(dbNode('B')?.x).toBe(77)
    mountToolbar()
    expect(q(DROP_BTN)).toBeNull() // 前提：尚无过期项——无出口

    expect(await undo()).toBe(false) // 第一次：HISTORY_STALE
    expect(unitCalls()[0]?.unitId).toBe(topId) // 历史项 id 专项断言：被拒的是栈顶项
    expect(state().lastWriteError).toBe(staleMessage('B'))
    expect(undoIds()).toEqual([olderId, topId]) // 被拒即停：不静默自动跳过栈顶项
    expect(await undo()).toBe(false) // 第二次（先和解再发 history-unit）仍被拒
    expect(unitCalls()).toHaveLength(2)
    expect(unitCalls()[1]?.unitId).toBe(topId)
    expect(undoIds()).toEqual([olderId, topId]) // 两栈不动
    expect(redoIds()).toEqual([])
    expect(state().saveStatus).toBe('error')
    expect(state().needsReload).toBe(true)
    // 标记按历史项 id：方向＋栈顶项 id＋拒因与 main 返回的消息
    expect(staleMark()).toEqual({ direction: 'undo', entryId: topId, reason: 'HISTORY_STALE', message: staleMessage('B') })

    // 出口：在既有保存错误行内提供「丢弃这条过期历史」
    // [B5 设计稿 §2.4/§6 C1 断言翻转] history-unit 被拒=history-undo 来源——行文案为方向文案「撤销失败：」，
    // 不再冒充保存失败（保存重试不在 history 来源的告警内；丢弃出口保留）
    expect(q(ERROR_ROW)?.textContent).toContain(`撤销失败：${staleMessage('B')}`)
    const drop = q(DROP_BTN)
    expect(drop, '过期历史项在栈顶时错误行应提供丢弃出口').not.toBeNull()
    expect(drop!.textContent).toBe(ACTION_TEXT)

    // 未确认不丢弃：点钮只弹确认框（显示 main 返回的具体拒因消息）；取消后栈不变、出口仍在
    click(drop, '丢弃出口')
    expect(dialog(), '点击出口应先弹确认框').not.toBeNull()
    expect(dialog()!.textContent).toContain(staleMessage('B'))
    expect(dialog()!.textContent).toContain('不写数据库')
    expect(undoIds()).toEqual([olderId, topId]) // 确认框弹出≠丢弃
    clickDialogButton('取消')
    expect(dialog()).toBeNull()
    expect(undoIds()).toEqual([olderId, topId])
    expect(q(DROP_BTN)).not.toBeNull()

    // 确认丢弃：只移除栈顶这一条；零 IPC；库行不变
    const ipcBefore = ipcCallCount()
    const dbBefore = rig().repos.lineage.listGraph()
    click(q(DROP_BTN), '丢弃出口')
    clickDialogButton('丢弃')
    expect(dialog()).toBeNull()
    expect(undoIds()).toEqual([olderId])
    expect(redoIds()).toEqual([])
    expect(ipcCallCount()).toBe(ipcBefore) // 丢弃不写数据库（也不读）
    expect(rig().repos.lineage.listGraph()).toEqual(dbBefore)
    expect(dbNode('B')?.x).toBe(77)
    // 清该次失败的错误态；needsReload 保留（下次命令入链先和解）
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
    expect(state().needsReload).toBe(true)
    expect(staleMark()).toBeNull()
    expect(q(ERROR_ROW)).toBeNull()

    // 更旧项可达：撤销成功（先和解再执行 history-unit）
    expect(await undo()).toBe(true)
    expect(unitCalls().at(-1)?.unitId).toBe(olderId)
    expect(state().nodes.find((n) => n.id === 'A')?.x).toBe(0)
    expect(dbNode('A')?.x).toBe(0)
    expect(undoIds()).toEqual([])
    expect(redoIds()).toEqual([olderId])
  })
})

describe('R-D1 redo 方向', () => {
  it('重做被 HISTORY_STALE 拒绝→出口出现（标记在 redo 方向栈顶项）→确认丢弃→更旧项可重做', async () => {
    seedPaper(rig().db, 'p-a')
    seedPaper(rig().db, 'p-b')
    seedTwoNodes()
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
      state().moveNode('B', 20, 20)
    })
    await save()
    expect(await undo()).toBe(true) // B 回 0——redo=[B 项]
    expect(await undo()).toBe(true) // A 回 0——redo=[B 项, A 项]（栈顶=A 项）
    const [olderRedoId, topRedoId] = redoIds()
    expect([dbNode('A')?.x, dbNode('B')?.x]).toEqual([0, 0])
    // 真实分叉：redo 栈顶项（A）的实体被另一条路径改过
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    mountToolbar()
    const unitsBefore = unitCalls().length // 此前两次 undo 各发过一次 history-unit
    expect(await redo()).toBe(false)
    expect(unitCalls()[unitsBefore]?.unitId).toBe(topRedoId) // 历史项 id 专项断言：被拒的是 redo 栈顶项
    expect(unitCalls()[unitsBefore]?.direction).toBe('redo')
    expect(await redo()).toBe(false)
    expect(unitCalls()).toHaveLength(unitsBefore + 2)
    expect(redoIds()).toEqual([olderRedoId, topRedoId])
    expect(undoIds()).toEqual([])
    expect(staleMark()).toEqual({ direction: 'redo', entryId: topRedoId, reason: 'HISTORY_STALE', message: staleMessage('A') })
    click(q(DROP_BTN), '丢弃出口')
    expect(dialog()?.textContent).toContain(staleMessage('A'))
    clickDialogButton('丢弃')
    expect(redoIds()).toEqual([olderRedoId])
    expect(staleMark()).toBeNull()
    // 更旧项可达：重做成功（B 0→20）
    expect(await redo()).toBe(true)
    expect(unitCalls().at(-1)?.unitId).toBe(olderRedoId)
    expect(dbNode('B')?.x).toBe(20)
    expect(redoIds()).toEqual([])
  })

  it('显式保存清 redo：redo 方向的过期标记随之清（不留失效标记）', async () => {
    seedPaper(rig().db, 'p-a')
    seedNode(rig(), 'A', 'p-a')
    seedSession()
    edit(() => {
      state().moveNode('A', 10, 10)
    })
    await save()
    expect(await undo()).toBe(true) // redo=[A 项]
    rig().repos.lineage.upsertNode(forkInput(dbNode('A')!, { x: 77, y: 77 }))
    expect(await redo()).toBe(false) // redo 栈顶项过期
    expect(staleMark()).toEqual({ direction: 'redo', entryId: redoIds()[0], reason: 'HISTORY_STALE', message: staleMessage('A') })
    expect(await drove(() => state().saveActiveFolder())).toBe(true) // 显式保存＝定稿（清 redo）
    expect(redoIds()).toEqual([])
    expect(staleMark()).toBeNull() // 标记随 redo 清而清
    expect(state().unfinalized).toBe(false)
  })
})

interface ForkPlan {
  folderId: string
  command(): void
  /** 分叉：由库侧直接改变（不经渲染层会话） */
  fork(): void
  message: string
}

/** 其余三种 CONFLICT 拒因——全部由真 history-unit service 发射（适用面＝用户补充裁决乙） */
const OTHER_REASONS: Array<{ reason: string; build(): ForkPlan }> = [
  {
    reason: 'HISTORY_PAPER_MISSING',
    build: () => ({
      folderId: '__main__',
      command: () => {
        state().removeNode('C')
      },
      fork: () => {
        // 删节点已落库（行删＋删事件）；随后文献行被删——撤销「删除节点」须恢复其节点
        rig().db.prepare('DELETE FROM papers WHERE id = ?').run('p-c')
      },
      message: '文献已删除，无法恢复其节点：p-c'
    })
  },
  {
    reason: 'HISTORY_FOLDER_MISSING',
    build: () => ({
      folderId: 'f-x',
      command: () => {
        state().moveNode('D', 5, 5)
      },
      fork: () => {
        // 文献移出该文件夹后，文件夹行被删（节点随外键级联删除）
        rig().db.prepare("UPDATE papers SET folder_id = '__main__' WHERE id = ?").run('p-d')
        rig().db.prepare('DELETE FROM collections WHERE id = ?').run('f-x')
      },
      message: '文件夹不存在：f-x'
    })
  },
  {
    reason: 'HISTORY_GRAPH_INVALID',
    build: () => ({
      folderId: 'f-y',
      command: () => {
        state().removeNode('E')
      },
      fork: () => {
        // 文献被移到别的文件夹——撤销「删除节点」将在原图恢复其节点（INV-88 拒）
        rig().db.prepare("UPDATE papers SET folder_id = '__main__' WHERE id = ?").run('p-e')
      },
      message: '文献已不在该文件夹，无法在该图恢复其节点：p-e（文献现属 __main__）'
    })
  }
]

describe('R-D1 其余三种 CONFLICT 拒因（表驱动——同一出口）', () => {
  it.each(OTHER_REASONS)('拒因 $reason：撤销被拒→出口出现（确认框显示 main 的拒因消息）→确认后移除栈顶项', async ({ reason, build }) => {
    seedPaper(rig().db, 'p-c')
    seedFolder(rig().db, 'f-x', '夹X')
    seedPaper(rig().db, 'p-d', 'f-x')
    seedFolder(rig().db, 'f-y', '夹Y')
    seedPaper(rig().db, 'p-e', 'f-y')
    seedNode(rig(), 'C', 'p-c')
    seedNode(rig(), 'D', 'p-d', 'f-x')
    seedNode(rig(), 'E', 'p-e', 'f-y')
    const plan = build()
    seedSession(plan.folderId)
    edit(plan.command)
    await save()
    const [entryId] = undoIds()
    expect(undoIds()).toHaveLength(1)
    plan.fork()
    mountToolbar()
    expect(await undo()).toBe(false)
    expect(unitCalls()[0]?.unitId).toBe(entryId)
    expect(state().lastWriteError).toBe(plan.message) // 拒因消息＝main 返回的原文
    expect(staleMark()).toEqual({ direction: 'undo', entryId, reason, message: plan.message })
    const drop = q(DROP_BTN)
    expect(drop, `${reason} 应出现同一出口`).not.toBeNull()
    expect(drop!.textContent).toBe(ACTION_TEXT)
    click(drop, '丢弃出口')
    expect(dialog()?.textContent).toContain(plan.message)
    const ipcBefore = ipcCallCount()
    clickDialogButton('丢弃')
    expect(undoIds()).toEqual([])
    expect(ipcCallCount()).toBe(ipcBefore) // 丢弃零 IPC
    expect(staleMark()).toBeNull()
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
    expect(state().needsReload).toBe(true)
  })
})

// ── [B5 设计稿 §6.2/§6.3 R4 三模式可达——wave C 2026-11-25] 告警与丢弃出口在 edit/browse/focus 均可达 ──

describe('[B5 §6.3 R4] 过期历史丢弃出口三模式可达（browse/focus 被拒后出口在场、可确认丢弃）', () => {
  for (const mode of ['browse', 'focus'] as const) {
    it(`${mode} 模式：撤销被 HISTORY_STALE 拒→告警在场（方向文案、无保存重试）→丢弃出口在场→确认丢弃→更旧历史可撤`, async () => {
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
      mountToolbar(mode)
      expect(useLineageViewStore.getState().mode, '挂载于目标模式').toBe(mode)
      expect(q(DROP_BTN)).toBeNull() // 前提：尚无过期项

      expect(await undo()).toBe(false) // HISTORY_STALE
      expect(unitCalls()[0]?.unitId).toBe(topId)
      // 三模式可达：告警在场、方向文案、无保存重试；编辑工具在非 edit 禁用（不影响出口）
      expect(q(ERROR_ROW), `${mode}：告警在场`).not.toBeNull()
      expect(q(ERROR_ROW)?.textContent).toContain(`撤销失败：${staleMessage('B')}`)
      expect(q('[data-testid="lineage-save-retry"]'), `${mode}：history 来源无保存重试`).toBeNull()
      const drop = q(DROP_BTN)
      expect(drop, `${mode}：丢弃出口在场`).not.toBeNull()
      expect(drop!.textContent).toBe(ACTION_TEXT)

      click(drop, `${mode} 丢弃出口`)
      expect(dialog(), `${mode}：确认框`).not.toBeNull()
      expect(dialog()!.textContent).toContain(staleMessage('B'))
      clickDialogButton('丢弃')
      expect(dialog()).toBeNull()
      expect(undoIds()).toEqual([olderId]) // 只移除栈顶这一条
      expect(state().saveStatus).toBe('clean')
      expect(q(ERROR_ROW)).toBeNull()
      // 更旧项可达：撤销成功
      expect(await undo()).toBe(true)
      expect(unitCalls().at(-1)?.unitId).toBe(olderId)
    })
  }
})
