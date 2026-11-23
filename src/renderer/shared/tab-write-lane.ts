/**
 * [B4-A R1 §2.2/§4.3] tab-write-lane —— per-tab 串行写命令链。
 *
 * ── 行为层 ──
 * - 每个 tab（键=paperId）一条串行链：任务按入链顺序逐个执行，前一个 settle 后
 *   下一个才起步。同 tab 内批注文本写、总评写、标注增删改、操作层/文本层
 *   undo/redo 反向写因此互斥不并发（§4.3 #3）；不同 tab 的链互不阻塞（§2.2）。
 * - 链任务顺序（§4.3）：文本单元提交/即时操作 → 普通写 → history 请求前的
 *   drain → history 写 → 后续新单元/操作。history 在途期间继续入链合法
 *   （§2.5 #16b/#17b——命令成功回显后由本链接管后续任务）。
 * - drain：等待该 tab 链上全部已入链任务 settle。失败任务不阻断链（链尾吞
 *   rejection）；任务结果经各自返回的 promise 交给调用方——`laneDrain` 兑现
 *   不等于落库成功，调用方读取任务结果与最新 pending/error（§4.3 #4）。
 * - 关 tab 清理：链空闲时删除条目；仍在途的任务沿原链自然完结（不删除在途
 *   链——避免同 paperId 立即重开时新旧两条链并发）。
 *
 * ── 接口层 ──
 * - export function enqueueTabTask<T>(tabKey, run): Promise<T>
 * - export function laneDrain(tabKey): Promise<void>
 * - export function laneDepth(tabKey): number（已入链未 settle 任务数——测试锚）
 * - export function laneClearTab(tabKey): void
 * - export function resetTabLanes(): void（测试隔离锚）
 *
 * ── 架构层 ──
 * - 驻 renderer/shared：reader 域（批注/操作层）与 notes 域（总评持久化）共同
 *   消费同一条 per-tab 链（设计稿 §11.1 路径为 reader/state/reader-write-lane；
 *   notes.persistence 不得跨域 import reader 件——check-quality 跨域互引规则，
 *   故下沉）。纯逻辑，无 React/window.api 依赖。
 * - 单层入链契约：任务体内不得再次向同一 tabKey 入链（后入者排在本任务之后、
 *   本任务又在等它——循环等待）。写适配器的「入链」只做一次：由直接响应用户/
 *   定时器/收口调用的入口负责，被控制器在链外调用的写体自身入链。
 *   [B4-A 回炉 R5/三 A] 另一合法形态=调用方自带复合任务：入口入链一次，任务体内只调
 *   宿主提供的**裸写体**（不自行入链、直调 API 写——文本层〔reader-text-controller〕
 *   与操作层〔reader-history-commands〕history 命令任务，起步即入链占位）。宿主不得把自入链适配器当裸写体提供。
 */

interface LaneState {
  /** 链尾（已吞 rejection——下一任务无条件接续） */
  tail: Promise<unknown>
  /** 已入链未 settle 任务数（含在途） */
  depth: number
}

const lanes = new Map<string, LaneState>()

function laneOf(tabKey: string): LaneState {
  let s = lanes.get(tabKey)
  if (s === undefined) {
    s = { tail: Promise.resolve(), depth: 0 }
    lanes.set(tabKey, s)
  }
  return s
}

/**
 * 入链：run 在该 tab 前序任务全部 settle 后执行。返回本任务结果 promise
 * （rejection 原样上抛给调用方，不破坏链）。
 */
export function enqueueTabTask<T>(tabKey: string, run: () => Promise<T>): Promise<T> {
  const s = laneOf(tabKey)
  s.depth += 1
  const exec = async (): Promise<T> => {
    try {
      return await run()
    } finally {
      s.depth -= 1
    }
  }
  const p = s.tail.then(exec, exec)
  s.tail = p.catch(() => undefined)
  return p
}

/** 等待该 tab 链上全部已入链任务 settle（history/finalize 前置 drain） */
export function laneDrain(tabKey: string): Promise<void> {
  const s = lanes.get(tabKey)
  if (s === undefined) return Promise.resolve()
  return s.tail.then(
    () => undefined,
    () => undefined
  )
}

/** 已入链未 settle 任务数（测试与调试锚） */
export function laneDepth(tabKey: string): number {
  return lanes.get(tabKey)?.depth ?? 0
}

/** 关 tab 清理：空闲链删除；在途链保留至自然完结 */
export function laneClearTab(tabKey: string): void {
  const s = lanes.get(tabKey)
  if (s !== undefined && s.depth === 0) {
    lanes.delete(tabKey)
  }
}

/**
 * 全部链重置（测试隔离锚——模块级链态跨用例残留：前一用例未 settle 的挂起
 * 任务会把同 tab 后续入链全部堵死）。在途任务沿原链对象自然完结，不再阻塞
 * 新链；生产代码不调用。
 */
export function resetTabLanes(): void {
  lanes.clear()
}
