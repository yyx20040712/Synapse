/**
 * [B4-A R1 §3/§11.1] reader-text-unit —— 文本单元状态机（IME/1.5s/空白/粘贴
 * 单元边界的单源实现；设计稿 §3 全表「输入/收口事件 × 单元边界」列）。
 *
 * ── 行为层 ──
 * - 普通连续输入/删除：无打开单元则以输入前值为 before 开单元；窗口内后续键
 *   只更新 after；每次输入重排同一 1.5s 计时。
 * - IME composition：start 记录组词前值；组词期片段只更新显示值（不开单元、
 *   不动单元边界）；end 以「组词前值→终值」整组提交一项（不与前后普通输入
 *   合并——组词前遗留的打开单元先独立提交）；end 后同值 input 幂等。组词期
 *   空闲信号不收口（等 end 后重新计时）。事件序按 Chromium（终值 input 先于
 *   compositionend）。
 * - 空格/回车：并入当前单元后立即关闭该单元（下一字符开新单元）；落库由同一
 *   空闲信号承接，不额外产生空白单元。
 * - 粘贴：先关闭已有单元；粘贴内容单独构成并立即关闭一个单元（旧单元与粘贴
 *   单元都在 past，undo 可逐步经过两值）。判据=opts.paste（paste 事件同源）。
 * - 空闲到期：恰提交一个打开单元（零差单元不产历史项），再发空闲信号（落库由
 *   控制器承接）；无打开单元时仍发信号（控制器按「待落库值」判 no-op）。
 * - close（blur/flush/undo 预步骤/切目标/关 tab/显式保存共用）：同步提交打开
 *   单元（幂等——无单元零动作）。
 * - reset（外部值采用/操作层代际失效）：丢弃打开单元不提交。
 * - rebase（文本 undo/redo 在途窗内出现新输入）：打开单元的 before 改指反向写
 *   已落库的值——新输入的落库调度不丢、历史 before 不指向已被撤销的分支。
 *
 * ── 接口层 ──
 * - export interface TextUnitEvents { onCommit(before, after); onIdle() }
 * - export class TextUnitMachine { input/compositionStart/compositionEnd/close/
 *   reset/rebase/hasOpenUnit/isComposing/armed/schedule/dispose }
 *
 * ── 架构层 ──
 * - 纯状态机无 React/window.api 依赖（window.setTimeout 计时——vitest fake
 *   timers 可控）；历史栈/写链由控制器承接，本件不持值栈不发写。
 */
import { IDLE_FLUSH_MS } from '@shared/constants'

export interface TextUnitEvents {
  /** 单元闭合（历史 push 语义由控制器承接——恰 push 一个 past 项、清一次 future） */
  onCommit(before: string, after: string): void
  /** 空闲信号（1.5s 到期——控制器提交打开单元后据此启动落库） */
  onIdle(): void
}

export class TextUnitMachine {
  private open: { before: string; after: string } | null = null
  private composing = false
  private composeBase: string | null = null
  private timer: number | null = null

  constructor(
    private readonly ev: TextUnitEvents,
    private readonly intervalMs: number = IDLE_FLUSH_MS
  ) {}

  /** 空闲重排（同一 timer——每次输入重置计时；写在途时控制器也经本口重挂） */
  schedule(): void {
    this.cancelTimer()
    this.timer = window.setTimeout(() => {
      this.timer = null
      // 组词期不收口：compositionend 后重新计时（片段不落库）
      if (this.composing) return
      this.close()
      this.ev.onIdle()
    }, this.intervalMs)
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /** 闭合打开单元（零差单元不产历史项）；幂等——无单元零动作 */
  close(): void {
    const u = this.open
    this.open = null
    if (u !== null && u.after !== u.before) {
      this.ev.onCommit(u.before, u.after)
    }
  }

  /** 存在未提交的有效输入（打开单元且 after≠before——零差单元不算） */
  hasOpenUnit(): boolean {
    return this.open !== null && this.open.after !== this.open.before
  }

  /** 空闲计时是否在排（在途写完成后的重挂判据——已排不重置计时） */
  armed(): boolean {
    return this.timer !== null
  }

  isComposing(): boolean {
    return this.composing
  }

  /** 丢弃打开单元不提交（外部值采用/代际失效） */
  reset(): void {
    this.open = null
  }

  /** 打开单元的 before 改指新基线（反向写已落库值；无打开单元零动作） */
  rebase(before: string): void {
    if (this.open !== null) {
      this.open.before = before
    }
  }

  /**
   * 输入入口（onChange 值域）。prev=输入前显示值，next=输入后值。
   * opts.paste=粘贴判据（paste 事件同源——粘贴独立单元）。
   */
  input(prev: string, next: string, opts?: { paste?: boolean }): void {
    if (this.composing) {
      // 组词期片段：只更新显示值，计时照常重排
      this.schedule()
      return
    }
    if (next === prev) {
      // compositionend 后同值 input 幂等（§3）
      return
    }
    if (opts?.paste === true) {
      // 粘贴：先关闭已有单元；粘贴内容单独构成并立即关闭一个单元
      this.close()
      this.open = { before: prev, after: next }
      this.close()
      this.schedule()
      return
    }
    const inserted = insertedText(prev, next)
    if (this.open === null) {
      this.open = { before: prev, after: next }
    } else {
      this.open.after = next
    }
    // 空格/回车：并入当前单元后立即关闭（下一字符开新单元）
    if (inserted === ' ' || inserted === '\n') {
      this.close()
    }
    this.schedule()
  }

  /** 组词开始：base=组词前显示值（整组一步的 before） */
  compositionStart(base: string): void {
    this.composing = true
    this.composeBase = base
  }

  /** 组词结束：final=终值；「组词前值→终值」整组一项（同值零动作） */
  compositionEnd(final: string): void {
    this.composing = false
    const base = this.composeBase
    this.composeBase = null
    if (base !== null && base !== final) {
      // 整组一步：组词前遗留的打开单元先独立提交，组词不与之合并
      this.close()
      this.open = { before: base, after: final }
      this.close()
    }
    this.schedule()
  }

  dispose(): void {
    this.cancelTimer()
    this.open = null
    this.composing = false
    this.composeBase = null
  }
}

/** 单处插入判定：next=prev 插入一段连续文本时返回该段（任意光标位）；删除/
 *  替换/多处编辑返回 null（按普通连续输入处理） */
function insertedText(prev: string, next: string): string | null {
  if (next.length <= prev.length) return null
  let head = 0
  while (head < prev.length && prev[head] === next[head]) head++
  let tail = 0
  while (tail < prev.length - head && prev[prev.length - 1 - tail] === next[next.length - 1 - tail]) tail++
  return next.slice(head, next.length - tail)
}
