/**
 * [B4-A 回炉 R5/三 A；F-SLIMB4A-01 拆件] reader-text-history-task —— 文本 history
 * 命令的复合链任务组成件（自 reader-text-controller 外抽 2026-11-25；拆件切面=
 * 复合链任务与代际校验胶水：条目 peek、预 flush 捕获、入链任务体三件；命令步的
 * 状态机〔延后单元/在途抑制账/回执结算〕留驻控制器）。
 *
 * ── 行为层 ──
 * - peekTextCommand：history 命令的目标项（按方向 peek；空栈 null）——反向写目标值
 *   与回执结算闭包成对携带（条目身份随命令持有到回执）。
 * - captureTextPreflush：history 命令起步时的预 flush 捕获（文本层 step 与操作层
 *   flushPendingRaw 共用）——起步时点同步读取，run=链任务体内直调的裸预 flush 体。
 * - enqueueTextHistoryTask：复合链任务——起步即入链占位；任务体内代际校验→预 flush
 *   →反向写，只调裸写体。
 *   （总述=reader-text-controller 头注「文本 undo/redo」「history 写=链任务」两段；
 *   本件只承载其组成件，语义不变。）
 *
 * ── 接口层 ──
 * - export interface TextHistoryCommand / TextPreflushInput / TextHistoryTaskArgs
 * - export function peekTextCommand / captureTextPreflush / enqueueTextHistoryTask
 *
 * ── 架构层 ──
 * - 纯函数件：不持控制器状态——起步时刻的值/在途写快照与裸写体端口经入参显式传入
 *   （控制器同步读取自身状态后调用，读取时点与原内联实现同刻）。只 import
 *   reader-text-history/tab-write-lane 与 model 类型件；不 import controller 运行时
 *   （零环）。
 */
import {
  peekTextRedo,
  peekTextUndo,
  settleTextRedo,
  settleTextUndo,
  type TextTargetKey
} from './reader-text-history'
import { enqueueTabTask } from '../../../shared/tab-write-lane'
import type { TextSaveState } from './reader-text-controller-model'

/** 一次文本 history 命令：expected=反向写目标值；settle=成功回执结算（按条目身份，
 *  pending=在途窗内闭合单元的 before 值） */
export interface TextHistoryCommand {
  expected: string
  settle(base: string, pending: string[]): void
}

/** history 命令的目标项（按方向 peek；空栈 null）：反向写目标值与回执结算
 *  闭包成对携带（条目身份随命令持有到回执） */
export function peekTextCommand(target: TextTargetKey, direction: 'undo' | 'redo'): TextHistoryCommand | null {
  if (direction === 'undo') {
    const entry = peekTextUndo(target)
    if (entry === null) return null
    return {
      expected: entry.before,
      settle: (base, pending) => settleTextUndo(target, entry, base, pending)
    }
  }
  const entry = peekTextRedo(target)
  if (entry === null) return null
  return {
    expected: entry.after,
    settle: (base, pending) => settleTextRedo(target, entry, base, pending)
  }
}

/** 预 flush 捕获的起步快照（控制器状态→本件显式入参；读取时点=命令起步） */
export interface TextPreflushInput {
  /** 起步时刻的在途普通写（null=无在途） */
  inflight: Promise<TextSaveState> | null
  /** 起步时刻的显示值与已知落库值 */
  value: string
  lastSaved: string | null
  /** 在途且有待写值时重挂空闲计时（控制器 TextUnitMachine.schedule） */
  reschedule(): void
  /** 裸预 flush 写体（TextControllerPorts.persistRaw——链任务体内直调） */
  persistRaw(value: string): Promise<boolean>
  /** 预 flush 写结果结算（控制器 settleWrite——账面照记） */
  settle(value: string, ok: boolean): TextSaveState
}

/** history 命令起步时的预 flush 捕获（[回炉 R5] 文本层 step 与 [回炉三 A] 操作层
 *  flushPendingRaw 共用）：pending=预 flush 对象=起步时的待写值且无在途写（null=无待
 *  写，或起步时在途写已承载落库——不叠发同值写；在途且有待写值=重挂空闲计时，在途
 *  写失败时未落库值由该计时自动重试）；run=链任务体内直调的裸预 flush 体（true=成功）。
 *  - 起步时在途的普通写先于本命令任务落库（§2.5 #13「drain 当前对象写链」——lane
 *    适配器下在链上排在本任务之前）。run 只等起步时的那一笔——起步后入链的写排在
 *    本任务之后，等它即循环等待；该写失败且值未变=预 flush 失败（#14）。
 *  - 待写值经裸写体先落库；写失败即止——不反向写、两栈不动（#14）。 */
export function captureTextPreflush(input: TextPreflushInput): { pending: string | null; run: () => Promise<boolean> } {
  const { inflight: inflightAtStart, value, lastSaved } = input
  const pending = value !== lastSaved && inflightAtStart === null ? value : null
  if (value !== lastSaved && inflightAtStart !== null) input.reschedule()
  return {
    pending,
    run: async () => {
      if (inflightAtStart !== null && (await inflightAtStart.catch(() => 'failed')) === 'failed') return false
      if (pending === null) return true
      const flushed = await input.persistRaw(pending).catch(() => false)
      input.settle(pending, flushed)
      return flushed
    }
  }
}

/** 复合链任务入参（控制器在命令起步的同步段内调用） */
export interface TextHistoryTaskArgs {
  /** 本控制器 target 所属 tab（per-tab lane 键） */
  paperId: string
  /** 代际校验：目标代际是否仍为命令起步时代际（排队期间读控制器当前代际） */
  isGenerationCurrent(): boolean
  /** 预 flush 体（captureTextPreflush 的 run） */
  run(): Promise<boolean>
  /** 裸反向写体（TextControllerPorts.historyWriteRaw——写命令的目标值 expected） */
  reverseWrite(): Promise<boolean>
}

// [回炉 R5] 复合链任务——命令起步即入链占位：起步时已在链的任务先落库（「history
// 请求前的 drain」由链位承载），起步后入链的写一律排在反向写之后。任务体内只调
// 裸写体（单层入链契约——tab-write-lane 头注）：预 flush 失败即止（#14），否则
// 反向写
export function enqueueTextHistoryTask(args: TextHistoryTaskArgs): Promise<boolean> {
  return enqueueTabTask(args.paperId, async (): Promise<boolean> => {
    // [回炉三 A] 排队期间操作层 history 命令已推进本 target 代际（恢复了该标注旧文
    // ——旧文本 past/future 已失效，§3）：不预 flush、不反向写（否则把旧分支值写回）
    if (!args.isGenerationCurrent()) return false
    if (!(await args.run())) return false
    return args.reverseWrite().catch(() => false)
  }).catch(() => false)
}
