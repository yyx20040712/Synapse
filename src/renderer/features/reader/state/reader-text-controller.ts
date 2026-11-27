/**
 * [B4-A R1 §3/§4.3] reader-text-controller —— 单个文本 target 的草稿控制器
 * （批注 comment 与总评 contentMd 共用；use-annotation-draft 的非 React 内核）。
 *
 * ── 行为层 ──
 * - 单元边界驻 TextUnitMachine、值栈驻 reader-text-history 注册表、写串行驻
 *   per-tab lane；本件编排三者并持有显示值/保存态。
 * - 保存状态机（沿既有五态）：clean=显示值即已落库值；dirty=有待存；saving=写在
 *   途；saved/failed=最近一轮写成功/失败且期间无新输入。写在途时值回退到已落库
 *   值落 clean；在途期间值已变则结果不作废 dirty 并保证空闲计时在排（不丢写）。
 * - 写串行化：同 target 同时至多一笔在途；在途中再到期→重挂空闲计时。卸载后
 *   到达的写结果零状态迁移零重挂计时（防幽灵写——落库由链任务自身完成）。
 * - 文本 undo/redo（§3 文本 undo/redo 行、§2.5 #13-#17）：关闭当前单元（提交）
 *   → peek（条目身份）→ 复合链任务〔预 flush（命令起步时的待写值先落库；写失败
 *   即止，不弹栈不反向写）→ 反向写〕→ 成功才 settle 移栈（失败两栈不动）→ 采用
 *   反向值。同 target 请求排队不并发（§2.5 #13d）。
 * - [B4-A 回炉 R5] history 写=链任务，命令起步即入链占位（§4.3 链序=起步时已在
 *   链的任务 → history 写 → 其后入链的新单元/操作）：「history 请求前的 drain」由
 *   链位承载，不再 await laneDrain 后才入链——否则等待窗内入链的新值写排在反向写
 *   之前落库，被反向写覆盖。任务体内只调裸写体端口（persistRaw/historyWriteRaw
 *   ——单层入链契约，tab-write-lane 头注）；普通写路径（timer/blur/flush→persist，
 *   宿主适配器自入链）不变。
 * - [B4-A 回炉 R5] 命令在途期间的等值普通写不叠发：命令起步的待写值已由任务体内
 *   的预 flush 承载落库；同值普通写（blur/计时）若入链会排在反向写之后落库并
 *   覆盖反向值——改挂空闲计时，结果随命令任务兑现后按 lastSaved 判零写。
 * - [B4-A 回炉三 A] 操作层 history 命令的预 flush 同构（captureTextPreflush 共用：值
 *   捕获时点=命令起步；命令在途期间同款等值普通写抑制）——见 flushPendingRaw。
 * - [B4-A R2 审查 5] history 步在途窗内的单元提交延后入栈（§4.3 链序=history
 *   写 → 后续单元提交）：成功回执先按条目身份移栈，再把延后单元按序入栈——首个
 *   延后单元的 before 重基为反向写已落库值，入栈即清 future（§2.5 #16b/#17b）。
 *   仍在打开的单元由 rebase 改基线（显示值保留，后续落库调度不丢）；命令未执行/
 *   失败时延后单元按原 before 照常入栈（新编辑不归因于失败的命令）。选型=条目
 *   身份结算+回执后重基，不把提交做成链任务：普通写体由宿主适配器入链（tab-write-
 *   lane 单层入链契约——任务体内不得再入链），控制器无法跨回执占链；提交若做成链
 *   任务，其与回执续体的先后取决于微任务登记序，不是可依赖的契约。
 * - [B4-A 回炉三 A] 同款规则施于操作层恢复旧文（代际通知带恢复值）：操作层命令
 *   起步后有新输入→显示值保留、基线改指恢复值、落库调度不丢；另：文本层命令排队
 *   期间目标代际已被操作层推进→中止（不预 flush、不反向写——§3「防文本层把值改回
 *   旧分支」）。
 * - [B4-A 回炉 R5] 反向值采纳的宿主镜像带 persisted 标志：控制器只在命令起步后
 *   显示值未变时采纳反向值（窗内新输入保留显示值，落库调度不丢——§2.5 #16b）；
 *   宿主另持草稿时不得在回执前把反向值写进显示草稿（否则新输入被覆盖）。卸载后
 *   采纳照常通知——宿主草稿须与已落库的反向值一致。
 * - canUndo/canRedo 投影：存在未提交有效输入（打开单元）时 canUndo 为 true
 *   （关闭即提交→撤该单元）、canRedo 为 false；真正销毁 future 的时点仍是该
 *   单元提交。
 * - 外部值采用 syncExternal（load/合并/操作层恢复旧文）：不开新历史单元、不
 *   清 redo，只更新基线与保存态（§3 非输入回显行）；操作层代际变化经注册表
 *   订阅获知——丢弃在途打开单元。
 *
 * ── 接口层 ──
 * - export type TextSaveState / TextView / TextControllerPorts / RawPreflush
 * - export class TextController { attach/dispose/view/edit/compositionStart/
 *   compositionEnd/blur/flush/closeout/flushPendingRaw/undo/redo/syncExternal/
 *   restore }
 *
 * ── 架构层 ──
 * - 纯逻辑无 React 依赖；落库写经 ports 注入（宿主适配器负责经 per-tab lane
 *   串行——本件不直接 import window.api）。history 命令的复合链任务由本件入链，
 *   任务体内的预 flush/反向写经裸写体端口直调。
 * - [B4-A R2 审查 3] 冻结门两道同查：全局 quit 门（quit-closing-gate）+ 目标 tab
 *   关闭在途门（tab-closing-gate，按 target.paperId 寻址——他 tab 关闭不冻结本
 *   target）。闸点=用户命令入口（edit/undo/redo）；收口面（flush/closeout/blur/
 *   单元提交）不设闸——关闭流程自身的内部 flush 经收口面通行。
 * - [F-SLIMB4A-01 拆件] 契约类型驻 reader-text-controller-model（原名再导出）；复合
 *   链任务组成件（条目 peek/预 flush 捕获/入链任务体）驻 reader-text-history-task
 *   ——本件保留命令步状态机、在途抑制账与回执结算。
 */
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import { tabWriteBlocked } from './tab-closing-gate'
import {
  canRedoText,
  canUndoText,
  pushTextCommit,
  pushTextCommits,
  subscribeTextTarget,
  textGeneration,
  type TextTargetEvent,
  type TextTargetKey
} from './reader-text-history'
import { TextUnitMachine } from './reader-text-unit'
import {
  captureTextPreflush,
  enqueueTextHistoryTask,
  peekTextCommand,
  type TextPreflushInput
} from './reader-text-history-task'
import type {
  RawPreflush,
  TextControllerPorts,
  TextFlushOptions,
  TextSaveState,
  TextView
} from './reader-text-controller-model'

// [F-SLIMB4A-01 拆件] 契约类型迁驻 reader-text-controller-model——原名再导出，既有导入面零改动
export type {
  RawPreflush,
  TextControllerPorts,
  TextFlushOptions,
  TextSaveState,
  TextView
} from './reader-text-controller-model'

export class TextController {
  private value: string
  /** 已知落库值（null=当前显示值来源未落库——外部未落库值采用） */
  private lastSaved: string | null
  private state: TextSaveState = 'clean'
  private inflight: Promise<TextSaveState> | null = null
  private historyTail: Promise<unknown> = Promise.resolve()
  private disposed = false
  private restored = false
  private generation = 0
  private unsubscribe: () => void = () => undefined
  /** history 步在途（本 target）：其间的单元提交不入栈，延后到回执后按写链序落地 */
  private historyBusy = false
  /** history 步在途窗内闭合单元的 before 值（时序） */
  private deferredCommits: string[] = []
  /** [回炉 R5] history 命令起步时的待写值（任务体内预 flush 的对象；null=无待写
   *  或在途普通写已承载落库） */
  private historyPending: string | null = null
  /** [回炉 R5] 在途 history 命令的复合链任务（等值普通写抑制后的兑现句柄） */
  private historyFlight: Promise<boolean> | null = null
  /** [回炉三 A] 操作层 history 命令在途时的预 flush 对象与兑现句柄（语义同上两字段；
   *  分字段持有——跨层交错时两层命令各持各的抑制） */
  private rawPending: string | null = null
  private rawFlight: Promise<void> | null = null
  /** [回炉三 A] 用户输入序号（edit 递增；外部值采用/反向值采纳不计）与操作层命令起步
   *  时的序号——恢复旧文时判「命令起步后是否有新输入」（值不等会误判：文本层采纳
   *  反向值同样改值） */
  private editSeq = 0
  private rawStartEdit = 0
  private readonly machine: TextUnitMachine

  constructor(
    readonly target: TextTargetKey,
    initial: string,
    private readonly ports: TextControllerPorts
  ) {
    this.value = initial
    this.lastSaved = initial
    this.machine = new TextUnitMachine({
      onCommit: (before) => {
        // 单元提交：恰 push 一个 past 项、清一次 future
        if (this.historyBusy) {
          // history 写在途：提交排在其后（§4.3）——回执时随 settle 重基入栈
          this.deferredCommits.push(before)
        } else {
          pushTextCommit(this.target, before)
        }
        this.emit()
      },
      onIdle: () => {
        void this.writeNow()
        // 打开单元已闭合（零差单元无提交）——canRedo 投影需重算
        this.emit()
      }
    })
  }

  /** 已知落库值（null=当前显示值来源未落库） */
  persistedValue(): string | null {
    return this.lastSaved
  }

  /** 本挂载是否为注册表恢复携带（卸载注册条件之一——恢复草稿经无编辑收开循环不丢失） */
  wasRestored(): boolean {
    return this.restored
  }

  /** 挂载：存活位复位+订阅注册表（StrictMode 模拟卸载后的重挂载回真） */
  attach(): void {
    this.disposed = false
    this.restored = false
    this.generation = textGeneration(this.target)
    this.unsubscribe()
    this.unsubscribe = subscribeTextTarget(this.target, (e) => this.onRegistry(e))
  }

  /** 卸载：编辑会话终止+退订+撤计时（在途写结果不再迁移本件状态） */
  dispose(): void {
    this.disposed = true
    this.ports.onSessionEnd?.()
    this.unsubscribe()
    this.unsubscribe = () => undefined
    this.machine.dispose()
  }

  view(): TextView {
    // 延后提交（history 在途窗内已闭合、未入栈）与打开单元同为「未入栈的新输入」
    const unsettled = this.machine.hasOpenUnit() || this.deferredCommits.length > 0
    return {
      comment: this.value,
      saveState: this.state,
      // 未提交有效输入可一步撤回（关闭即提交→撤该单元）；其存在时 redo 投影 false
      canUndo: canUndoText(this.target) || unsettled,
      canRedo: canRedoText(this.target) && !unsettled
    }
  }

  /** 用户输入（prev=当前显示值；opts.paste=粘贴独立单元） */
  edit(next: string, opts?: { paste?: boolean }): void {
    // [F-VISFB-64·门二 P0-1] closing 冻结期用户输入拒绝（值入口）
    if (quitWriteBlocked()) return
    // [B4-A R2 审查 3] 目标 tab 关闭在途（§2.5 #1「非 closing」）：拒绝——值/单元/U 不动
    if (tabWriteBlocked(this.target.paperId)) return
    const prev = this.value
    if (next === prev) return
    this.machine.input(prev, next, opts)
    this.value = next
    this.editSeq += 1
    // [B4-A R2 §2.5 #1] 新读者文本输入：立即 U=1（不等单元提交）
    this.ports.onUserEdit?.()
    this.ports.mirror?.(next, this.target, false)
    this.state = next === this.lastSaved ? 'clean' : 'dirty'
    this.emit()
  }

  compositionStart(): void {
    this.machine.compositionStart(this.value)
  }

  compositionEnd(): void {
    this.machine.compositionEnd(this.value)
  }

  /** blur：同步关闭当前单元（提交）后立即落库（不等 1.5s；幂等不双提交） */
  blur(): void {
    this.machine.close()
    this.emit()
    void this.writeNow()
    this.ports.onSessionEnd?.()
  }

  /** 收口面：闭合单元→等在途→有待存立即派发写；返回终态（兑现≠已落库）。
   *  finalize 传 retryFailed=false；其他收口不传，保持失败后的原有自动重试。 */
  async flush(options?: TextFlushOptions): Promise<TextSaveState> {
    this.machine.close()
    this.emit()
    const inflight = this.inflight
    // [B6 返工 5b] 只有 finalize 等待在途写时，失败回执就是本句柄终态；不在同一次
    // flush 内自动重试。其他收口维持原语义，失败后仍待写则立即重试。
    if (inflight !== null) {
      const settled = await inflight.catch(() => 'failed' as const)
      if (settled === 'failed' && options?.retryFailed === false) return this.state
    }
    if (this.value !== this.lastSaved) return this.writeNow()
    return this.state
  }

  /** 卸载收口（宿主草稿另有卸载收口通道时用）：闭合打开单元并立存未尝试 dirty
   *  （不随计时器消亡）。在途写未落定时 writeNow 不叠发第二路（在途写的完成/重试
   *  归宿主通道——其重挂的空闲计时随 dispose 撤除） */
  closeout(): void {
    this.machine.close()
    this.emit()
    void this.writeNow()
  }

  /**
   * [B4-A 回炉三 A] 操作层 history 命令的预 flush 准备——命令起步时同步调用（值捕获
   * 时点与文本层 history 命令同口径）：提交打开单元并捕获此刻的待写值/在途普通写。
   * 返回体由调用方在链任务体内直调 run()（单层入链契约——不自行入链）、命令终结时
   * 调用 release()；在途期间与预 flush 对象同值的普通写不叠发（writeNow）。
   */
  flushPendingRaw(): RawPreflush {
    this.machine.close()
    this.emit()
    const { pending, run } = captureTextPreflush(this.preflushInput())
    let settle: () => void = () => undefined
    this.rawPending = pending
    this.rawStartEdit = this.editSeq
    this.rawFlight = new Promise<void>((r) => {
      settle = r
    })
    return {
      run,
      release: (): void => {
        this.rawPending = null
        this.rawFlight = null
        settle()
      }
    }
  }

  /** 文本 undo/redo：完整动作成功=true（排队不并发——同 target 逐个执行） */
  undo(): Promise<boolean> {
    return this.queue('undo')
  }

  redo(): Promise<boolean> {
    return this.queue('redo')
  }

  /** 外部值采用（load/合并/操作层恢复旧文）：不开历史单元不清 redo；
   *  persisted=false=该值尚未落库（合并产物）——基线未知 */
  syncExternal(value: string, persisted = true): void {
    this.machine.reset()
    this.value = value
    this.lastSaved = persisted ? value : null
    this.state = persisted ? 'clean' : 'dirty'
    this.emit()
  }

  /** 卸载草稿重挂载恢复（注册表携带）：failed=显失败可重试；否则 dirty+重排计时 */
  restore(value: string, failed: boolean): void {
    this.restored = true
    this.machine.reset()
    this.value = value
    this.state = failed ? 'failed' : 'dirty'
    if (!failed) this.machine.schedule()
    this.emit()
  }

  private onRegistry(e: TextTargetEvent): void {
    if (e.generation !== this.generation) {
      this.generation = e.generation
      // 已闭合的延后单元属旧分支，一并丢弃
      this.deferredCommits = []
      if (e.value !== undefined && this.rawFlight !== null && this.editSeq !== this.rawStartEdit) {
        // [回炉三 A] 操作层恢复旧文而命令起步后已有新输入（新输入属新分支，文本层 R5
        // 「命令起步后显示值未变才采纳反向值」同构——§2.5 #16b）：打开单元基线改指恢复
        // 值、显示值保留，落库调度不丢
        this.machine.rebase(e.value)
        this.rebaseOntoRestored(e.value)
        this.emit()
        return
      }
      // 操作层恢复旧文：旧文本 past/future 已清——在途打开单元同属旧分支，一并丢弃
      this.machine.reset()
      if (e.value !== undefined) {
        this.syncExternal(e.value)
        return
      }
    }
    this.emit()
  }

  /** [回炉三 A] 操作层恢复旧文而窗内已有新输入：已落库基线改指恢复值，显示值（新输入）
   *  保留。无在途写=dirty 并保证空闲计时在排（落库调度不丢）；在途写承载落库（saving 不变） */
  private rebaseOntoRestored(restored: string): void {
    this.lastSaved = restored
    if (this.value === restored) this.state = 'clean'
    else if (this.inflight === null) {
      this.state = 'dirty'
      if (!this.disposed && !this.machine.armed()) this.machine.schedule()
    }
  }

  private emit(): void {
    if (!this.disposed) this.ports.onChange()
  }

  /** 立即派发写（空闲/blur/flush 共用）：已落库→零写；在途→重排空闲不并发 */
  private writeNow(): Promise<TextSaveState> {
    const value = this.value
    if (value === this.lastSaved) return Promise.resolve(this.state)
    if (this.inflight !== null) {
      this.machine.schedule()
      return this.inflight
    }
    // [回炉 R5] history 命令（文本层/操作层）在途且其预 flush 对象=当前值：不叠发
    // 普通写——它入链后排在命令任务之后，会在反向写之后落库并覆盖反向值；该值由预
    // flush 落库，命令任务兑现后按 lastSaved 判零写
    const held = this.equalWriteHeld(value)
    if (held !== null) {
      this.machine.schedule()
      return held.then(() => this.state)
    }
    this.state = 'saving'
    this.emit()
    const flight = this.ports.persist(value).then(
      (ok) => this.settleWrite(value, ok),
      () => this.settleWrite(value, false)
    )
    this.inflight = flight
    const release = (): void => {
      if (this.inflight === flight) this.inflight = null
    }
    void flight.then(release, release)
    return flight
  }

  private settleWrite(value: string, ok: boolean): TextSaveState {
    if (ok) this.lastSaved = value
    if (this.value === value) {
      this.state = ok ? 'saved' : 'failed'
    } else if (this.value === this.lastSaved) {
      // 在途期间值已回退到已存值：无待存，落 clean 不重挂
      this.state = 'clean'
    } else {
      // 保存期间又有输入→在途结果不作废 dirty；空闲计时可能已被回退分支撤除。
      // 卸载后到达的写结果：账面照记（收口方读终态）但不重挂计时（防幽灵写）
      this.state = 'dirty'
      if (!this.disposed && !this.machine.armed()) this.machine.schedule()
    }
    this.emit()
    return this.state
  }

  /** 在途 history 命令（文本层/操作层）的预 flush 对象=当前值时返回其兑现句柄；无命中=null */
  private equalWriteHeld(value: string): Promise<unknown> | null {
    if (this.historyFlight !== null && this.historyPending === value) return this.historyFlight
    return this.rawFlight !== null && this.rawPending === value ? this.rawFlight : null
  }

  /** 预 flush 捕获的起步快照（控制器状态→reader-text-history-task 显式入参；同步
   *  读取——与原内联实现同刻） */
  private preflushInput(): TextPreflushInput {
    return {
      inflight: this.inflight,
      value: this.value,
      lastSaved: this.lastSaved,
      reschedule: () => this.machine.schedule(),
      persistRaw: (value) => this.ports.persistRaw(value),
      settle: (value, ok) => this.settleWrite(value, ok)
    }
  }

  private queue(direction: 'undo' | 'redo'): Promise<boolean> {
    const next = this.historyTail.then(
      () => this.step(direction),
      () => this.step(direction)
    )
    this.historyTail = next.catch(() => false)
    return next
  }

  private async step(direction: 'undo' | 'redo'): Promise<boolean> {
    // 冻结期拒绝（栈与值不变）：全局 quit 门 + 目标 tab 关闭在途（入口与排队项
    // 起步各查一次——§2.5 #12）
    if (quitWriteBlocked() || tabWriteBlocked(this.target.paperId)) return false
    // §3：先关闭当前单元（提交——恰 push 一个 past 项、清一次 future）
    this.machine.close()
    const command = peekTextCommand(this.target, direction)
    if (command === null) {
      this.emit()
      return false
    }
    const expected = command.expected
    // 命令起步时的已提交值（栈顶项对应的现值——#16/#17 进 future/past 的 current）；
    // await 窗内的新输入不得改写它
    const base = this.value
    const generationAtStart = this.generation
    // [回炉 R5] 起步时的预 flush 捕获（captureTextPreflush——操作层 history 命令同口径）
    const { pending, run } = captureTextPreflush(this.preflushInput())
    this.historyPending = pending
    // history 步在途：其间的单元提交延后入栈（§4.3——history 写 → 后续单元提交）
    this.historyBusy = true
    try {
      const flight = enqueueTextHistoryTask({
        paperId: this.target.paperId,
        isGenerationCurrent: () => this.generation === generationAtStart,
        run,
        reverseWrite: () => this.ports.historyWriteRaw(expected)
      })
      this.historyFlight = flight
      if (!(await flight)) return false // 失败两栈不动
      // 成功才移栈（按条目身份）；在途窗内闭合的延后单元在移栈后重基入栈
      const deferred = this.deferredCommits
      this.deferredCommits = []
      command.settle(base, deferred)
      // [B4-A R2 §2.5 #16/#17] 文本 undo/redo 成功=新编辑事件：U=1（清账只归
      // finalize——idle-flush 不动 U）
      this.ports.onUserEdit?.()
      this.lastSaved = expected // 反向写已落库
      if (this.value === base) {
        this.value = expected
        // [回炉 R5] 采纳镜像以已落库语义通知，且不随卸载跳过：宿主另持的草稿（总评
        // notes.store）须与已落库的反向值一致——卸载后重挂载读宿主草稿，不采纳则旧
        // 草稿被当作未落库编辑回写、覆盖反向值
        this.ports.mirror?.(expected, this.target, true)
        this.state = 'saved'
      } else {
        // 在途窗内新输入：显示值保留。无延后单元时打开单元基线改指反向值（有延后
        // 单元时其 before 已随 settle 重基，其后的打开单元沿链不变）；新值落库调度不丢
        if (deferred.length === 0) this.machine.rebase(expected)
        this.state = 'dirty'
        // 卸载后到达的回执不重挂计时（防幽灵写——settleWrite 同款守卫）
        if (!this.disposed && !this.machine.armed()) this.machine.schedule()
      }
      // 卸载后到达的回执：账面与宿主镜像照记，不再通知视图
      if (this.disposed) return true
      this.emit()
      return true
    } finally {
      this.historyBusy = false
      this.historyPending = null
      this.historyFlight = null
      // 命令未执行/失败路径：在途窗内闭合的单元按原 before 照常入栈（不重基——
      // 反向写未落库；新编辑不归因于失败的命令）
      const leftover = this.deferredCommits
      this.deferredCommits = []
      pushTextCommits(this.target, leftover)
      this.emit()
    }
  }
}
