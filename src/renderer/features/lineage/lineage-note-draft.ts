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
 * - pending 信号：编辑中且提交安全文本≠note.content 即真（提交安全文本=[回炉 W-B4·R1]
 *   输入法合成期取组词前值——片段不进快照、不进恢复副本；其余时候=draft；save 回填/
 *   他径改值均重算——note content 经 useLineageStore selector 订阅）；等值 set=no-op 零 emit；
 *   消费面=App quitDirty 聚合第三项（关窗拦截呈现）。
 * - 草稿状态单源（[回炉 W-B2·R-W3] §8.1 恢复价值谓词「三源同源」）：内容快照是数据
 *   单源，pending 布尔是其派生投影（草稿状态非空即真；派生布尔翻转才推送订阅面）。原为
 *   两个独立变量——桥接层同点位双写，但恢复再水化路径只写快照：仅快照在场时
 *   noteDraftPending()=false（quit ④/课题切换/切图判「无草稿」）而 host-ports 的恢复价值
 *   谓词判「有草稿」。setNoteDraftPending 保留为兼容入口（置真仍受 closing gate 拒绝；无
 *   快照时记「仅在场标记」——生产桥接层不再调用它，只有测试夹具可达）。
 * - idle 提交句柄（[回炉 W-B2·D-3] §2.5 #5「提交单元」）：编辑组件挂载期注册「提交正文
 *   但不关编辑器」入口，fireLineageNoteIdleCommit 由 lane 的 idle 到期消费（flushing 窗
 *   或无句柄=false，不清草稿状态——正文回填后由信号效应归零）。草稿变更沿经
 *   setNoteDraftChangeSink 通知活动会话重排 idle timer（继续输入=新的未收口草稿）。
 *   [回炉 W-B4·R1] 输入法合成期句柄返回 false（同属「提交被拒＝重排」）；合成期的片段
 *   输入不改快照，不触发本变更沿——compositionend 后终值进快照才重排。
 * - 卸载时的草稿残留（[回炉 W-B2b] io-phase-inventory §11）：收口提交未能执行而草稿仍在
 *   ——提交因落库在途被跳过（fireLineageNoteCommit 在 flushing 窗的 no-op 是既有合约）或
 *   句柄同步抛错——卸载清理保留内容快照（closeOutDeclined，草稿状态归零时复位）。
 *   出口有两个：回到脉络页由残留再水化效应恢复编辑器与正文；或被收口路径经
 *   lineage-note-draft-settle.settleNoteDraftResidual 落库。fireLineageNoteCommit 自身
 *   在 flushing 窗仍 no-op；无 fire 的卸载仍清（既有合约）。
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
 * - 注册族五件（set/get/subscribe/useSyncExternalStore 桥）+句柄三件（收口）+idle 提交
 *   句柄两件+草稿变更沿 sink+桥 hook useNoteDraftBridge（体驻本件——组件 250 行红线
 *   布线 hook 化）。
 */
import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import type { LineageStore } from './lineage-session-model'
import type { StoreApi, UseBoundStore } from 'zustand'

/**
 * [B4 L2 环拆] lineage.store→registry→lane→本件→lineage.store 的模块环会在特定
 * 求值序下使 store 读到未初始化的 registry（attachProjector on undefined）。本件
 * 不再静态 import lineage.store：store 模块求值期末绑定访问面（bindLineageStoreApi）。
 */
type LineageStoreApi = UseBoundStore<StoreApi<LineageStore>>
let storeApi: LineageStoreApi | null = null
export function bindLineageStoreApi(api: LineageStoreApi): void {
  storeApi = api
}
const store = (): LineageStoreApi => {
  if (storeApi === null) throw new Error('lineage-note-draft: lineage.store 未装配（bindLineageStoreApi）')
  return storeApi
}
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { notifyRecoveryDraftChange, recoveryBlocked } from './recoveryScheduler'
import type { LineageRecoveryPayload, NoteDraftSnapshot } from '@shared/recovery/schemas'

/**
 * 草稿状态（[回炉 W-B2·R-W3] 数据单源）：null=无未收口草稿；open=[F-VISFB-65] 未收口草稿
 * 内容快照（{noteId,text}——崩溃窗承载；§5 草稿四态）；signal=仅在场标记（无内容——只由兼容
 * 入口 setNoteDraftPending(true) 在无快照时产生，生产面不可达）。
 * noteDraftPending()/noteDraftSnapshot() 都是它的派生投影。
 */
type DraftState = { kind: 'open'; snap: NoteDraftSnapshot } | { kind: 'signal' } | null
let draft: DraftState = null

/** [回炉 W-B2b] 收口提交未能执行而草稿仍在（提交因落库在途被跳过，或句柄同步抛错——io-phase-inventory
 *  §11.2 U2/U3）：卸载清理据此保留内容快照；草稿状态归零时复位 */
let closeOutDeclined = false

/** [回炉 W-B2·D-3] 草稿变更沿 sink（lineage.store 模块求值末绑定——注册族不静态 import
 *  store/registry/lane，环拆约束同 bindLineageStoreApi） */
let draftChangeSink: (() => void) | null = null
export function setNoteDraftChangeSink(sink: (() => void) | null): void {
  draftChangeSink = sink
}

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
const getSnapshot = (): boolean => draft !== null

/** 草稿状态写入单点（等值由调用方判定）：派生布尔（状态非空）翻转才推送订阅面 */
function setDraftState(next: DraftState): void {
  const wasPending = draft !== null
  draft = next
  if (next === null) closeOutDeclined = false // 草稿已归零（已提交/已落库/已被消费）——标记复位
  if (wasPending !== (next !== null)) emit()
}

/** 兼容入口（[回炉 W-B2·R-W3] 生产桥接层不再调用——见头注「草稿状态单源」）。
 *  置位（等值 no-op 零 emit——T2 后续键零推送）。
 *  [F-VISFB-64] closing gate：置真（用户输入信号）冻结期拒绝；清假豁免
 *  （安全向+quit 收口 ②.5 清理由 runQuitInternal 豁免域承载） */
export function setNoteDraftPending(v: boolean): void {
  if (v && quitWriteBlocked()) return
  if (v) {
    if (draft === null) setDraftState({ kind: 'signal' })
    return
  }
  if (draft !== null) setDraftState(null)
}

/** 现值读（quit-flush ④ 查态面消费）——草稿状态的派生投影：状态非空即真 */
export function noteDraftPending(): boolean {
  return draft !== null
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

/** [回炉 W-B2b] 收口句柄是否挂载（编辑器组件在场）——收口路径据此区分「编辑器在场的草稿」与「已卸载的残留」 */
export function hasNoteDraftFlushHandle(): boolean {
  return flushHandle !== null
}

/** [回炉 W-B2·D-3] 挂载期注册 idle 提交句柄（提交正文但不关编辑器；返回 true=草稿正文已成
 *  编辑单元入队；空稿/输入法合成期（[回炉 W-B4·R1]）/被闸拒/无编辑会话=false——提交与关闭解耦，见头注） */
let idleHandle: (() => boolean) | null = null
export function registerNoteDraftIdleCommit(fn: () => boolean): void {
  idleHandle = fn
}

/** 卸载注销（idle 提交句柄） */
export function unregisterNoteDraftIdleCommit(): void {
  idleHandle = null
}

/** [回炉 W-B2b] idle 提交句柄是否挂载——lane 的 idle 到期据此决定提交被拒后是否重排（无句柄=编辑器已卸载，重试无意义） */
export function hasNoteDraftIdleHandle(): boolean {
  return idleHandle !== null
}

// ── [F-VISFB-65] 内容快照+恢复再水化（§5 草稿四态——B-01/B-02/B-03）────

/** 内容快照置位（桥接信号效应的单写点——pending 布尔随之派生；调度器快照源消费）。
 *  null=清空任意草稿状态（内容快照由有到无走变更沿——调度器据此把副本收敛为无草稿；快照值未变
 *  则零触发——桥接信号效应在无编辑会话的每次渲染都会以 null 调用本函数）。
 *  [回炉 R1] 变更沿通知调度器（300ms 合流吸收键速——B-02 接线闭合）：
 *  等值置位零触发（防重渲染 effect 等值 run 的空转写） */
export function setNoteDraftSnapshot(snap: NoteDraftSnapshot | null): void {
  const current = draft?.kind === 'open' ? draft.snap : null
  if (current !== null && snap !== null && current.noteId === snap.noteId && current.text === snap.text) return // 等值置位零触发
  setDraftState(snap === null ? null : { kind: 'open', snap })
  if (current === null && snap === null) return // 快照值未变（无草稿→无草稿；或仅清掉兼容入口的在场标记）：不走变更沿
  notifyRecoveryDraftChange() // 变更沿（置/清皆触发——[回炉 R1] 既有：清快照后副本收敛为无草稿）
  if (snap !== null) draftChangeSink?.() // [回炉 W-B2·D-3] 草稿内容变更沿：活动会话重排 idle timer
}

/** 内容快照现值（调度器 snapshot 组装消费）——草稿状态的派生投影（仅在场标记无内容=null） */
export function noteDraftSnapshot(): NoteDraftSnapshot | null {
  return draft?.kind === 'open' ? draft.snap : null
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
 * [回炉 W-B2b] 前两种「未能执行而草稿仍在」（flushing 跳过／句柄抛错）置 closeOutDeclined
 * ——卸载清理据此保留内容快照；本函数自身的行为不变。
 */
export function fireLineageNoteCommit(): void {
  if (store().getState().flushing) {
    closeOutDeclined = noteDraftSnapshot() !== null // [回炉 W-B2b] 提交因落库在途被跳过而草稿仍在——卸载清理据此保留快照
    return
  }
  const handle = flushHandle
  if (handle === null) return
  closeOutDeclined = false // 进入句柄路径：先前的「被跳过」不再成立
  try {
    handle()
  } catch {
    closeOutDeclined = noteDraftSnapshot() !== null // [回炉 W-B2b] 句柄抛错而草稿仍在——同上（收口状态未知，正文不能随卸载清掉）
    return
  }
  // [轮2 W-r1-02] 冻结期提交会话被闸（closeEdit 整体拒绝）——草稿未转 store，
  // pending 保真不清（quit ②.5 在同步豁免域内到达此处不受影响）。
  // [F-VISFB-65] 同步链「enqueue 先→清稿后」：commit 即快照清（§5）；
  // [回炉轮2 Z2/d1-B2] recovery 冻结门同挂：句柄正常返回（closeEdit 被门拒
  // 后未抛）不得清 pending+快照——草稿静默丢封死（冻结期副本承载恢复）
  // [回炉 W-B2·R-W3] 草稿状态单源：一次清空（pending 布尔随之派生归零）
  if (!quitWriteBlocked() && !recoveryBlocked()) setNoteDraftSnapshot(null)
}

/**
 * [回炉 W-B2·D-3] idle 到期提交（lineage-idle-scheduler 到期分发消费——经 lane 注入）：提交草稿正文为编辑单元但不关编辑器。
 * flushing 窗 no-op（同会话 saving 锁会拒提交——调用方重排待链落定）；无挂载句柄=false
 * （编辑器已卸载的残留快照由再水化承接）；句柄同步 throw=收口状态未知——吞接返回 false。
 * [回炉 W-B4·R1] 句柄在输入法合成期返回 false（合成期不提交——同属调用方「提交被拒＝重排」）。
 * 不清草稿状态：正文回填后由桥接信号效应按「draft===content」归零。
 */
export function fireLineageNoteIdleCommit(): boolean {
  if (store().getState().flushing) return false
  const handle = idleHandle
  if (handle === null) return false
  try {
    return handle() === true
  } catch {
    return false
  }
}

/**
 * [F-VISFB-63] 编辑草稿桥（LineageFloatingNotes 单点装配——恰一行布线）：
 * - 挂载注册 `() => commitRef.current()`（现值取用——迟到闭包安全）；
 * - 卸载注销+清 pending；
 * - 信号 effect：editingId 在场且 settledText≠note.content 置真（note content 经
 *   selector 订阅——save 回填/他径改值/他径删除〔undefined=静默出会话〕
 *   均重算）。[回炉 W-B4·R1] settledText=提交安全文本（useNoteEditSession 派生：
 *   输入法合成期=组词前值，否则=draft）——快照只经这一读点取文本，合成片段不进快照。
 */
export function useNoteDraftBridge(
  commitRef: RefObject<() => void>,
  editingId: string | null,
  settledText: string,
  restoreCtl?: NoteDraftRestoreCtl,
  idleCommitRef?: RefObject<() => boolean>
): void {
  const noteContent = store()((s) => s.floatingNotes.find((f) => f.id === editingId)?.content)
  useEffect(() => {
    // ?.: RefObject.current 可空形态（@types/react 18——挂载期恒有值，静态面收口）
    registerNoteDraftFlush(() => commitRef.current?.())
    // [回炉 W-B2·D-3] idle 提交句柄（现值取用——迟到闭包安全；未注入=组件不提供该入口）
    if (idleCommitRef !== undefined) registerNoteDraftIdleCommit(() => idleCommitRef.current?.() ?? false)
    return () => {
      unregisterNoteDraftFlush()
      unregisterNoteDraftIdleCommit()
      // [回炉轮2 Z2] 卸载清理挂 recovery 门：冻结期卸载（视图切换/屏障窗）
      // 快照+pending 保真——副本承载恢复；非冻结期归零语义不变
      // [回炉 W-B2·R-W3] 草稿状态单源：一次清空（pending 布尔随之派生归零）
      // [回炉 W-B2b] 收口提交未能执行而草稿仍在（提交因落库在途被跳过／句柄抛错）：保留内容快照
      // ——回页由残留再水化效应（[d1-W1]）恢复编辑器与正文，或由收口路径的出口落库。
      // 无 fire 的卸载仍清（U4 既有合约）
      if (recoveryBlocked()) return
      if (closeOutDeclined && noteDraftSnapshot() !== null) return
      setNoteDraftSnapshot(null)
    }
  }, [commitRef, idleCommitRef])
  useEffect(() => {
    // [d1-W1 主控亲笔；k1-B1 判等甄别] 冻结期卸载残留快照的页内再水化：
    // 编辑会话空窗而注册族仍有内容快照——**甄别冻结遗留 vs 本帧刚收口**：
    // 正常 blur 收口帧 content 已等于快照 text（判等跳过→正常清态，不复活
    // 编辑器）；空稿快照无恢复价值早退；仅「正文未收口进库」的遗留才送回
    // 编辑器（在场笔记）或新笔记草稿（图已无该行——确认建立才消费）
    // [回炉 W-B4·R1] 上句判等的前提在合成期收口帧由 closeEdit 保证：合成中快照按组词前值
    // 驻留，而收口提交的是 draft 实际值——closeEdit 清会话态之前先把快照对齐到提交值
    // （use-note-edit-session）；本处判等与甄别逻辑不变
    if (editingId === null && restoreCtl !== undefined) {
      const residue = noteDraftSnapshot()
      if (residue !== null && residue.text !== '') {
        // [k1-N1] 空稿早退仅页内残留径（回收后零价值）；恢复径 stash 在场分支
        // 对空稿仍 openEditor（崩溃保真语义）——两径刻意不对称，互指防误读
        const note = store().getState().floatingNotes.find((f) => f.id === residue.noteId)
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
    const pendingNow = editingId !== null && noteContent !== undefined && settledText !== noteContent
    // [F-VISFB-65] 内容快照=置 pending 的同一调用点同步置/清（B-02）
    // [回炉 W-B2·R-W3] 单写点：pending 布尔是草稿状态的派生投影（不再分两处写）
    setNoteDraftSnapshot(pendingNow && editingId !== null ? { noteId: editingId, text: settledText } : null)
  }, [editingId, noteContent, settledText, restoreCtl])
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
