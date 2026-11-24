/**
 * [B4 L2 / 设计稿 §2.3 idleTimer 行、§2.5 #3/#5/#6/#9/#11；回炉 W-D2a·T-B05/T-W02]
 * lineage-idle-scheduler —— 每 folder 会话的 idle-flush 调度纯件（模块侧 timer 句柄+代际；
 * [回炉 W-D2a·T-B05] 自 lineage-session-lane 外移成件：lane 为 §11.2 表外件，按
 * r-tests/note.md 表四的拆件切面——timer 的排/取消/到期分发全部驻本件，lane 留命令编排）。
 *
 * ── 行为层 ──
 * - idle-flush timer（§2.3 idleTimer 行、§2.5 #3/#5/#6/#11）：编辑单元完成（非
 *   no-op）排 1.5s；到期仅当 Q=1∧F=0 时 flush（#5——只清 IO，不动 U/两栈）；无待
 *   写=纯 no-op（#6）；显式保存/undo·redo 命令/切换/IO 收口先取消（#11 迟到 timer
 *   按代际判废）；写失败不重排（#9：重试=用户触发）。
 *   打开的悬浮笔记草稿（§2.5 #5「提交单元」；[回炉 W-B2·D-3 用户裁决＝甲]）：到期把
 *   草稿正文提交为编辑单元（经注册族的 idle 提交句柄→editUnit→同一 recorder：历史项+
 *   队列写）后随同一信号 flush；提交与关闭解耦——不关编辑器、不夺焦点。空草稿到期不提交
 *   （空笔记回收仍由 blur 承接）；提交被拒（同会话在途/拖拽两态/冻结/无挂载句柄）＝重排；
 *   F=1 期间到期且草稿仍在＝重排（链落定后再提交）。草稿内容变更（注册族变更沿→
 *   draftChanged）重排 1.5s——继续输入即新的未收口草稿，下一次到期提交为新单元。
 *   重排只在 idle 提交句柄挂载时进行（[回炉 W-B2b]）：编辑器已卸载的残留草稿留给回页
 *   再水化，不每 1.5s 空转。
 * - 到期分发=due（[回炉 W-D2a·T-W02] 可直接驱动面）：timer 回调只负责置空句柄后调用
 *   due(排定时的代际)；测试与探针可不经计时器直接调用 due，观察注入端口（flush／草稿
 *   提交／重排）的调用——#6「无单元且 Q=0→不变」与 #11「代际已过期=no-op」由此成为
 *   有判别力的合约。
 * - dispose：会话消亡后到期恒 no-op（不再分发、不再重排）。
 *
 * ── 接口层 ── export interface IdleView/IdleSchedulerDeps/IdleScheduler；export function
 * createIdleScheduler(deps): IdleScheduler
 *
 * ── 架构层 ── 纯编排件：会话读面、草稿态读写与 flush 入链口经 deps 注入（lane 装配时
 * 绑定 registry 单一写路径、lineage-note-draft 注册族与本链 flush 入链口）；本件零运行时
 * 依赖（只 import @shared/constants），不 import store/registry/lane/note-draft（零环）。
 */
import { IDLE_FLUSH_MS } from '@shared/constants'
import type { LineageInflight } from './lineage-session-model'

/** 到期分发的会话读面（注册表会话或测试夹具的结构子集） */
export interface IdleView {
  queue: readonly unknown[]
  /** 当前在途写（null=无——F=0） */
  inflight: LineageInflight | null
}

export interface IdleSchedulerDeps {
  /** 该会话的读面（到期分发读 Q 与 F） */
  read(): IdleView
  /** 活动会话（悬浮笔记草稿只属活动图） */
  isActive(): boolean
  /** 打开的悬浮笔记草稿待提交（lineage-note-draft 注册族） */
  draftPending(): boolean
  /** 草稿到期提交为编辑单元；返回是否已提交 */
  commitDraft(): boolean
  /** idle 提交句柄已挂载（编辑器在场——残留草稿无句柄不重排） */
  hasDraftIdleHandle(): boolean
  /** 到期启动 flush（#5——宿主的 flush 入链口；返回值不等待） */
  flush(): Promise<void>
}

export interface IdleScheduler {
  /** 排（重排）idle timer：先取消在途 timer，再按新代际排 1.5s */
  arm(): void
  /** 取消 idle timer（代际推进——已排 timer 到期判废；无在途 timer 时同样推进） */
  cancel(): void
  /** 当前代际（due 的判废键） */
  generation(): number
  /** 到期分发（timer 回调调用；可直接驱动——不依赖计时器，见头注） */
  due(generation: number): void
  /** 会话消亡：此后到期恒 no-op 且取消在途 timer */
  dispose(): void
}

export function createIdleScheduler(deps: IdleSchedulerDeps): IdleScheduler {
  const get = deps.read
  // 以下四个绑定=宿主端口；名称沿用到期分发在 lane 内的原调用名（分发函数体逐字迁入）
  const noteDraftPending = deps.draftPending
  const fireLineageNoteIdleCommit = deps.commitDraft
  const hasNoteDraftIdleHandle = deps.hasDraftIdleHandle
  const chainFlush = deps.flush
  let disposed = false

  // ── idle-flush timer（模块侧句柄+代际——不进响应式快照）──
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let idleGen = 0
  const cancelIdle = (): void => {
    idleGen += 1
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }
  const onIdle = (generation: number): void => {
    if (disposed || generation !== idleGen) return // #11：timer generation 已过期=no-op
    const s = get()
    const draftOpen = deps.isActive() && noteDraftPending()
    if (s.inflight !== null) {
      if (draftOpen) armIdle() // F=1：在途链任务自行收口；打开的草稿待链落定后再提交（重排——[回炉 W-B2·D-3]）
      return
    }
    if (s.queue.length === 0 && !draftOpen) return // #6：无待写=纯 no-op
    // [回炉 W-B2·D-3] 打开的草稿：到期提交正文为编辑单元（提交与关闭解耦——不关编辑器不夺焦）；
    // 提交被拒（同会话在途/拖拽两态/冻结/空稿/输入法合成期〔回炉 W-B4·R1〕）＝重排待下次到期，不丢稿。
    // [回炉 W-B2b] 无挂载句柄（编辑器已卸载的残留草稿）不重排——重试无意义；回页再水化打开编辑器时
    // 由草稿变更沿重排（io-phase-inventory §11.3 R2）
    const committed = draftOpen && fireLineageNoteIdleCommit()
    if (draftOpen && !committed && hasNoteDraftIdleHandle()) armIdle()
    if (s.queue.length > 0 || committed) void chainFlush() // #5：同一信号启动 flush（只清 IO——U/两栈不动）
  }
  const armIdle = (): void => {
    cancelIdle()
    const generation = idleGen
    idleTimer = setTimeout(() => {
      idleTimer = null
      onIdle(generation)
    }, IDLE_FLUSH_MS)
  }

  return {
    arm: armIdle,
    cancel: cancelIdle,
    generation: () => idleGen,
    due: onIdle,
    dispose() {
      disposed = true
      cancelIdle()
    }
  }
}
