// b3: P7-H
/**
 * [F-VISFB-61 拆件] lineage-session-ops —— 编辑会话撤销/重做域件（自
 * lineage.store 拆出 2026-10-17——store 493 行险位〔v210 §5 挂账「下次触及
 * 先拆件」〕；先例=AnnotationPopups 拆 annotation-popups-actions）。
 * 拆件=纯移动零语义改：beginUnit/restore/UNDO_STACK_MAX 语义随迁单源驻本件，
 * store 留数据态+动作接线（调用面经解构注入，名字零 churn）。
 *
 * ── 行为层（语义随迁——注释原文自 lineage.store）──
 * - beginUnit＝编辑单元入口：单元前图态快照入 undo 栈+redo 栈清（一单元=一
 *   撤销步——与 mockup §2.2 编辑单元定义同构）；栈深截断 50（INV-23 先例
 *   ——超深丢最旧快照）；saving（flushing）域拒绝（与 undo/redo 闸同型
 *   ——INV-94「saving 态锁定 undo/redo/编辑」）：返回 false=调用方放弃写。
 *   [F-VISFB-61] 快照含 floatingNotes（笔记三操作=编辑单元——撤销维度）。
 * - restore＝快照恢复（undo/redo 共用——saveStatus 按恢复后队列派生：空=
 *   clean）。星标=非撤销维度恒保现值：restore 前捕获现网节点 isStarred
 *   （按 id；paperId null 不捕获），快照落地后 overlay 回贴——「编辑移动入栈
 *   →点星标→Ctrl+Z」星标显示不回退（不与 DB 脱钩）；快照缺 id=该快照后
 *   新增节点的撤销面，保持快照值不贴。边界：redo 复活节点（add→star→undo
 *   →redo）的 isStarred 取快照录制值——录制点早于星标切换的理论窗=该键
 *   缺席，下次 graph 载入自愈（DB 单源重灌——与 undo 泄漏同族自愈类边界，
 *   登记非修复）。
 *
 * ── 接口层 ──
 * - export function createSessionOps(deps: WriteQueueDeps): SessionOps
 *   （set/get 结构注入——宿主=满足 WriteQueueHost 的 zustand store）
 */
import type { LineageNode } from '@shared/models/lineage'
import type { SessionSnapshot, WriteQueueDeps } from './lineage-write-queue'

export interface SessionOps {
  /** 编辑单元入口（单元前快照入 undo 栈+redo 清；flushing 拒绝返回 false） */
  beginUnit(): boolean
  /** 快照恢复（undo/redo 共用——saveStatus 按恢复后队列派生） */
  restore(snap: SessionSnapshot, pushTo: 'undo' | 'redo'): void
}

/** [回炉 R20] 撤销栈深度上限（INV-23 先例=50——超深丢最旧快照） */
const UNDO_STACK_MAX = 50

export function createSessionOps(deps: WriteQueueDeps): SessionOps {
  const { set, get } = deps

  /** [F-LGRAPH-01②U1] 编辑单元入口：单元前图态快照入 undo 栈+redo 栈清
   *  （一单元=一撤销步——与 mockup §2.2 编辑单元定义同构）；
   *  [回炉 R20] 栈深截断 50（INV-23 先例——超深丢最旧快照）；
   *  [回炉 R5] saving（flushing）域拒绝（与 undo/redo 闸同型——INV-94
   *  「saving 态锁定 undo/redo/编辑」实现对齐）：返回 false=调用方放弃写 */
  const beginUnit = (): boolean => {
    const s = get()
    if (s.flushing) return false
    const undoStack = [
      ...s.undoStack,
      {
        nodes: s.nodes,
        edges: s.edges,
        lineTypeNames: s.lineTypeNames,
        queue: s.queue,
        // [F-VISFB-61] 悬浮笔记入快照轴（三操作=编辑单元——undo/redo 载荷）
        floatingNotes: s.floatingNotes
      }
    ]
    if (undoStack.length > UNDO_STACK_MAX) undoStack.splice(0, undoStack.length - UNDO_STACK_MAX)
    set({ undoStack, redoStack: [] })
    return true
  }

  /** 快照恢复（undo/redo 共用——saveStatus 按恢复后队列派生：空=clean）。
   *  [回炉 r1-R2] 星标=非撤销维度恒保现值：restore 前捕获现网节点 isStarred
   *  （按 id；paperId null 不捕获），快照落地后 overlay 回贴——「编辑移动入栈
   *  →点星标→Ctrl+Z」星标显示不回退（不与 DB 脱钩）；快照缺 id=该快照后
   *  新增节点的撤销面，保持快照值不贴。
   *  [回炉 r2-R16] 边界声明：redo 复活节点（add→star→undo→redo）的
   *  isStarred 取快照录制值——录制点早于星标切换的理论窗=该键缺席，
   *  下次 graph 载入自愈（DB 单源重灌——与 undo 泄漏同族自愈类边界，
   *  登记非修复） */
  const restore = (snap: SessionSnapshot, pushTo: 'undo' | 'redo'): void => {
    const s = get()
    const cur: SessionSnapshot = {
      nodes: s.nodes,
      edges: s.edges,
      lineTypeNames: s.lineTypeNames,
      queue: s.queue,
      floatingNotes: s.floatingNotes
    }
    const starNow = new Map(
      s.nodes
        .filter((n) => n.paperId !== null && n.isStarred !== undefined)
        .map((n) => [n.id, n.isStarred!] as const)
    )
    const overlayStar = (nodes: LineageNode[]): LineageNode[] =>
      nodes.map((n) =>
        n.paperId !== null && starNow.has(n.id) ? { ...n, isStarred: starNow.get(n.id)! } : n
      )
    if (pushTo === 'redo') {
      set({
        ...snap,
        nodes: overlayStar(snap.nodes),
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, cur],
        saveStatus: snap.queue.length > 0 ? 'dirty' : 'clean'
      })
      return
    }
    set({
      ...snap,
      nodes: overlayStar(snap.nodes),
      undoStack: [...s.undoStack, cur],
      redoStack: s.redoStack.slice(0, -1),
      saveStatus: snap.queue.length > 0 ? 'dirty' : 'clean'
    })
  }

  return { beginUnit, restore }
}
