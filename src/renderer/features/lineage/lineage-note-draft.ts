// b3: P7-H
/**
 * [F-VISFB-63] lineage-note-draft —— 悬浮笔记编辑草稿注册族（模块级单例，
 * annotation-draft-registry〔F-VISFB-15〕形态母本的裁剪版——单编辑会话、
 * 无恢复表：恰一编辑会话=LineageFloatingNotes 组件态 editingId/draft 的
 * 跨组件观测面）。62 号 d1 复审 W2 缺陷链：未 blur 草稿驻组件态不入暂存
 * 队列，编辑中关窗/切图/saving 窗静默丢稿（React 不对已卸载节点派发
 * onBlur——textarea 卸载无 blur 同链）。
 *
 * ── 行为面（态×事件全表=票面 T1-T10；测试=lineage-note-draft-flush.test.tsx
 *    +回炉拆件 lineage-note-draft-flush-r1.test.tsx）──
 * - pending 信号：编辑中且 draft≠note.content 即真（save 回填/他径改值均重算
 *   ——note content 经 useLineageStore selector 订阅）；等值 set=no-op 零 emit；
 *   消费面=App quitDirty 聚合第三项（关窗拦截呈现）。
 * - flush 句柄：LineageFloatingNotes 挂载期注册（commitRef 现值包装——迟到
 *   闭包取最新收口函数）；四收口消费 fireLineageNoteCommit：quit 握手 ②.5
 *   （入队后 ③ save 正道落库）/视图路由离场 lineage（fire-first 不阻路由）/
 *   切图打断（nav-graph-picker folder onClick 顶部——确认分支取消=草稿已
 *   入队保留、确认弃=含草稿全弃）/folders.changed 双分支（导入完成重取与
 *   S4 回退的前置收口——dirty/pending 跳过卸载型重载）。
 * - flushing 守卫：useLineageStore.getState().flushing=true 即 return 不
 *   commit（saving 窗 beginUnit 拒绝域〔lineage-session-ops INV-94〕——强
 *   commit 会被静默吞且组件清态谎报收口）；pending 保真由 quit-flush ④
 *   查态面承接=main confirm 降级，不静默丢。
 * - fire 后清 pending：句柄执行即草稿已转 store 暂存（lineageDirty 接棒），
 *   与卸载清理同为「信号 effect 未必及跑」的安全网（quit ④ 评估点不依赖
 *   React 调度时序——T7 确定性收口）。
 * - 卸载清理：unregister+pending 清（组件卸载=会话消亡，观测面归零）。
 *
 * ── 接口层 ──
 * - 注册族五件（set/get/subscribe/useSyncExternalStore 桥）+句柄三件+桥
 *   hook useNoteDraftBridge（体驻本件——组件 250 行红线布线 hook 化）。
 */
import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import { useLineageStore } from './lineage.store'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { notifyRecoveryDraftChange, recoveryBlocked } from './recoveryScheduler'
import type { LineageRecoveryPayload, NoteDraftSnapshot } from '@shared/recovery/schemas'

/** 未收口草稿在场标记（编辑中且 draft≠note.content） */
let pending = false

/** [F-VISFB-65] 未收口草稿内容快照（{noteId,text}|null——崩溃窗承载；编辑
 *  组件置 pending 的同一调用点同步置/清——§5 草稿四态） */
let draftSnapshot: NoteDraftSnapshot | null = null

/** 订阅者集（App 聚合面经 useSyncExternalStore 消费） */
const listeners = new Set<() => void>()

/** 挂载期收口句柄（恰一编辑会话——单槽；commitRef 现值包装） */
let flushHandle: (() => void) | null = null

function emit(): void {
  for (const cb of listeners) cb()
}

/** useSyncExternalStore 稳定引用（模块级——getSnapshot 原始值恒稳定） */
const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
const getSnapshot = (): boolean => pending

/** 置位（等值 no-op 零 emit——T2 后续键零推送）。
 *  [F-VISFB-64] closing gate：置真（用户输入信号）冻结期拒绝；清假豁免
 *  （安全向+quit 收口 ②.5 清理由 runQuitInternal 豁免域承载） */
export function setNoteDraftPending(v: boolean): void {
  if (v && quitWriteBlocked()) return
  if (pending === v) return
  pending = v
  emit()
}

/** 现值读（quit-flush ④ 查态面消费） */
export function noteDraftPending(): boolean {
  return pending
}

/** 订阅（测试/自持消费面） */
export function subscribeNoteDraft(cb: () => void): () => void {
  return subscribe(cb)
}

/** React 消费面（App quitDirty 聚合第三项） */
export function useNoteDraftPending(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** 挂载期注册收口句柄（编辑组件 mount effect） */
export function registerNoteDraftFlush(fn: () => void): void {
  flushHandle = fn
}

/** 卸载注销 */
export function unregisterNoteDraftFlush(): void {
  flushHandle = null
}

// ── [F-VISFB-65] 内容快照+恢复再水化（§5 草稿四态——B-01/B-02/B-03）────

/** 内容快照置位（编辑组件置 pending 的同一调用点同步置/清；调度器快照源消费）。
 *  [回炉 R1] 变更沿通知调度器（300ms 合流吸收键速——B-02 接线闭合）：
 *  等值置位零触发（防重渲染 effect 等值 run 的空转写） */
export function setNoteDraftSnapshot(snap: NoteDraftSnapshot | null): void {
  const same = draftSnapshot?.noteId === snap?.noteId && draftSnapshot?.text === snap?.text
  if (same && (draftSnapshot === null) === (snap === null)) return
  draftSnapshot = snap
  notifyRecoveryDraftChange()
}

/** 内容快照现值（调度器 snapshot 组装消费） */
export function noteDraftSnapshot(): NoteDraftSnapshot | null {
  return draftSnapshot
}

/** 恢复再水化计划（noteId 不在图→新笔记草稿——N-06） */
export interface RestoreDraftPlan {
  noteId: string
  text: string
  asNewNote: boolean
}

/**
 * 恢复去重判据（§5 commit 同步链崩溃窗）：queue 中该 noteId **最后一条**
 * upsert-floating-note 的 input.content===draft.text→已收口，丢弃 draft 不
 * 水化（确定性规则——INV-164）；否则按 noteId 在图与否定 asNewNote。
 */
export function planDraftRehydration(
  payload: Pick<LineageRecoveryPayload, 'queue' | 'draft'> & {
    graph: Pick<LineageRecoveryPayload['graph'], 'floatingNotes'>
  }
): RestoreDraftPlan | null {
  if (payload.draft === null) return null
  const { noteId, text } = payload.draft
  let lastUpsertContent: string | null = null
  for (const a of payload.queue) {
    if (a.kind === 'upsert-floating-note' && a.input.id === noteId) {
      lastUpsertContent = a.input.content
    }
  }
  if (lastUpsertContent === text) return null // commit 窗崩溃：已收口不水化
  const inGraph = payload.graph.floatingNotes.some((n) => n.id === noteId)
  return { noteId, text, asNewNote: !inGraph }
}

/** 待水化计划驻留（恢复流程载入+接管完成后写入——编辑器组件消费） */
let restoreStash: RestoreDraftPlan | null = null

/** 计划就位通知订阅者（编辑器组件桥消费触发沿） */
const restoreListeners = new Set<() => void>()

/** 恢复流程写入水化计划（onRestored 回调落点） */
export function stashRestoreDraft(plan: RestoreDraftPlan): void {
  restoreStash = plan
  for (const cb of restoreListeners) cb()
}

/** 消费水化计划（单次——幂等防重复水化） */
export function consumeRestoreDraft(): RestoreDraftPlan | null {
  const plan = restoreStash
  restoreStash = null
  return plan
}

/** 订阅计划就位（编辑器组件桥——stash 到达即尝试消费） */
export function subscribeRestoreDraft(cb: () => void): () => void {
  restoreListeners.add(cb)
  return () => {
    restoreListeners.delete(cb)
  }
}

/** 编辑器恢复控制面（useNoteDraftBridge 第 4 注入——openEditor=在场笔记再水化；
 *  createNewNote=noteId 不在图的新笔记草稿路径） */
export interface NoteDraftRestoreCtl {
  openEditor(noteId: string, text: string): void
  /** [B-ADJ-1] 创建确认布尔：false=被恢复门拒（调用方保真承载待重试） */
  createNewNote(text: string): boolean
}

/**
 * fire-first commit（三收口共用）：flushing 窗 no-op（pending 保真→quit ④
 * 查态承接=main confirm）；句柄执行即草稿转 store 暂存——清 pending 与
 * 卸载清理同为信号 effect 的安全网。[R4] 句柄同步 throw=收口状态未知——
 * 吞接（pending 保真由 quit ④ 承接）不阻调用方（view-flush「不阻路由」承诺）。
 */
export function fireLineageNoteCommit(): void {
  if (useLineageStore.getState().flushing) return
  const handle = flushHandle
  if (handle === null) return
  try {
    handle()
  } catch {
    return
  }
  // [轮2 W-r1-02] 冻结期提交会话被闸（closeEdit 整体拒绝）——草稿未转 store，
  // pending 保真不清（quit ②.5 在同步豁免域内到达此处不受影响）。
  // [F-VISFB-65] 同步链「enqueue 先→清稿后」：commit 即快照清（§5）；
  // [回炉轮2 Z2/d1-B2] recovery 冻结门同挂：句柄正常返回（closeEdit 被门拒
  // 后未抛）不得清 pending+快照——草稿静默丢封死（冻结期副本承载恢复）
  if (!quitWriteBlocked() && !recoveryBlocked()) {
    setNoteDraftPending(false)
    setNoteDraftSnapshot(null)
  }
}

/**
 * [F-VISFB-63] 编辑草稿桥（LineageFloatingNotes 单点装配——恰一行布线）：
 * - 挂载注册 `() => commitRef.current()`（现值取用——迟到闭包安全）；
 * - 卸载注销+清 pending；
 * - 信号 effect：editingId 在场且 draft≠note.content 置真（note content 经
 *   selector 订阅——save 回填/他径改值/他径删除〔undefined=静默出会话〕
 *   均重算）。
 */
export function useNoteDraftBridge(
  commitRef: RefObject<() => void>,
  editingId: string | null,
  draft: string,
  restoreCtl?: NoteDraftRestoreCtl
): void {
  const noteContent = useLineageStore((s) => s.floatingNotes.find((f) => f.id === editingId)?.content)
  useEffect(() => {
    // ?.: RefObject.current 可空形态（@types/react 18——挂载期恒有值，静态面收口）
    registerNoteDraftFlush(() => commitRef.current?.())
    return () => {
      unregisterNoteDraftFlush()
      // [回炉轮2 Z2] 卸载清理挂 recovery 门：冻结期卸载（视图切换/屏障窗）
      // 快照+pending 保真——副本承载恢复；非冻结期归零语义不变
      if (!recoveryBlocked()) {
        setNoteDraftPending(false)
        setNoteDraftSnapshot(null)
      }
    }
  }, [commitRef])
  useEffect(() => {
    // [d1-W1 主控亲笔；k1-B1 判等甄别] 冻结期卸载残留快照的页内再水化：
    // 编辑会话空窗而注册族仍有内容快照——**甄别冻结遗留 vs 本帧刚收口**：
    // 正常 blur 收口帧 content 已等于快照 text（判等跳过→正常清态，不复活
    // 编辑器）；空稿快照无恢复价值早退；仅「正文未收口进库」的遗留才送回
    // 编辑器（在场笔记）或新笔记草稿（图已无该行——确认建立才消费）
    if (editingId === null && restoreCtl !== undefined) {
      const residue = noteDraftSnapshot()
      if (residue !== null && residue.text !== '') {
        // [k1-N1] 空稿早退仅页内残留径（回收后零价值）；恢复径 stash 在场分支
        // 对空稿仍 openEditor（崩溃保真语义）——两径刻意不对称，互指防误读
        const note = useLineageStore.getState().floatingNotes.find((f) => f.id === residue.noteId)
        if (note === undefined) {
          // [B-ADJ-1 P0] 死 id：新建可能被恢复门拒——**确认建立才消费**（快照
          // 保真待解冻重试，正文不丢不挂错；return 跳过下方清态）
          if (restoreCtl.createNewNote(residue.text)) setNoteDraftSnapshot(null)
          return
        }
        if (note.content !== residue.text) {
          setNoteDraftSnapshot(null) // 消费即清（单次——ctl 每渲染新身份下防效应重入环）
          restoreCtl.openEditor(residue.noteId, residue.text)
          return
        }
        // content===text：本帧刚收口——落下方正常清态
      }
    }
    const pendingNow = editingId !== null && noteContent !== undefined && draft !== noteContent
    setNoteDraftPending(pendingNow)
    // [F-VISFB-65] 内容快照=置 pending 的同一调用点同步置/清（B-02）
    setNoteDraftSnapshot(pendingNow && editingId !== null ? { noteId: editingId, text: draft } : null)
  }, [editingId, noteContent, draft, restoreCtl])
  // [F-VISFB-65] 恢复再水化：挂载即消费+stash 到达沿（载入与接管完成后到达——
  // gate 已开；编辑会话在场时保 stash 待收口后再消费）
  useEffect(() => {
    const tryConsume = (): void => {
      if (editingId !== null || restoreCtl === undefined) return
      const plan = consumeRestoreDraft()
      if (plan === null) return
      if (plan.asNewNote) {
        // [k1-W1] 消费撞 saving/冻结拒（flush 在飞竞窗）——移交快照承载（残留
        // 分支自带判等+确认建立才消费+解冻重试），非静默丢
        if (!restoreCtl.createNewNote(plan.text)) {
          setNoteDraftSnapshot({ noteId: plan.noteId, text: plan.text })
        }
      } else {
        restoreCtl.openEditor(plan.noteId, plan.text)
      }
    }
    tryConsume()
    return subscribeRestoreDraft(tryConsume)
  }, [editingId, restoreCtl])
}
