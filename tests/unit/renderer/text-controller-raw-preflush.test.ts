// @vitest-environment jsdom
/**
 * [B4-A 回炉三 A → 回归] TextController.flushPendingRaw 契约——操作层 history 命令的
 * 预 flush 准备（与文本层 history 命令同口径，capturePreflush 共用）。控制器级夹具
 * （无 React）：普通写自入链；裸写体直调。
 * 红绿归属（仓外 b4a-rework3，文件名=日志）：
 * - 对改动前树 10 例全红（22-final-red-vs-prechange.log——flushPendingRaw 接口不存在）；
 * - 对 cut1-no-guard（未加两段连带）红 2 例（23-final-red-vs-cut1-no-guard.log）：
 *   「有新输入…」「代际校验…」；
 * - 对「关闭操作层等值抑制」变异红 1 例（16-mut-m1-no-raw-suppress.log）：
 *   「等值普通写抑制…」。
 * 锁定行为：
 * - 命令起步即提交打开单元并捕获待写值：run() 裸写该值（不自行入链）；
 * - 值捕获时点=命令起步：起步后的新输入不并入 run()，由空闲计时落到普通写链；
 * - 起步时在途普通写：run() 只等那一笔（失败=预 flush 失败），不叠发裸写；
 * - 裸写失败：run()=false、显示真实失败态（失败写保留——普通写重试可成功）；
 * - 等值普通写抑制：命令在途期间与预 flush 对象同值的普通写不叠发（异值照发）；
 * - 操作层恢复旧文（代际通知带恢复值）：命令起步后有新输入→显示值保留、基线改指
 *   恢复值、落库调度不丢、打开单元基线=恢复值；无新输入→采纳恢复值；
 * - 代际校验：文本层命令排队期间目标代际被操作层推进→命令 false、零预 flush、零反向写。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import { TextController } from '../../../src/renderer/features/reader/state/reader-text-controller'
import {
  bumpTextGeneration,
  canRedoText,
  canUndoText,
  clearAllTextHistory,
  peekTextUndo
} from '../../../src/renderer/features/reader/state/reader-text-history'
import { enqueueTabTask, laneDrain, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

const PAPER = 'p-raw-preflush'
const TARGET = { paperId: PAPER, kind: 'paper-note' } as const

/** 微任务排空（async 链逐跳） */
async function turns(n = 30): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/** 写体行为（true=落库） */
type Body = (value: string) => boolean | Promise<boolean>

/** 控制器世界：普通写自入链（生产适配器形态）；裸写体直调；写序与库值闭包记录 */
function makeWorld(): {
  ctl: TextController
  order: string[]
  db(): string
  onPersist(body: Body): void
  onRaw(body: Body): void
  onHistory(body: Body): void
} {
  const order: string[] = []
  let db = ''
  let persistBody: Body = () => true
  let rawBody: Body = () => true
  let historyBody: Body = () => true
  const run = async (kind: 'persist' | 'raw' | 'history', value: string, body: Body): Promise<boolean> => {
    order.push(`${kind}:${value}`)
    const ok = await body(value)
    if (ok) db = value
    return ok
  }
  const ctl = new TextController(TARGET, '', {
    persist: (v) => enqueueTabTask(PAPER, () => run('persist', v, persistBody)),
    persistRaw: (v) => run('raw', v, rawBody),
    historyWriteRaw: (v) => run('history', v, historyBody),
    onChange: () => undefined
  })
  ctl.attach()
  return {
    ctl,
    order,
    db: () => db,
    onPersist: (body) => {
      persistBody = body
    },
    onRaw: (body) => {
      rawBody = body
    },
    onHistory: (body) => {
      historyBody = body
    }
  }
}

async function idle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
}

/** 阻塞写链：其后入链的任务须等返回的 release() */
function blockLane(): () => void {
  let releaseBlocker!: () => void
  void enqueueTabTask(
    PAPER,
    () =>
      new Promise<void>((r) => {
        releaseBlocker = r
      })
  )
  return () => releaseBlocker()
}

let ctl: TextController | null = null

beforeEach(() => {
  vi.useFakeTimers()
  resetTabLanes()
  clearAllTextHistory()
})

afterEach(() => {
  ctl?.dispose()
  ctl = null
  vi.clearAllTimers()
  vi.useRealTimers()
  resetTabLanes()
  clearAllTextHistory()
})

describe('flushPendingRaw —— 操作层 history 命令的预 flush 准备', () => {
  it('命令起步即提交打开单元并捕获待写值；run() 裸写该值；值已在库后普通写判零写', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.ctl.edit('b') // 打开单元、待写
    const pre = w.ctl.flushPendingRaw()
    expect(peekTextUndo(TARGET)?.before).toBe('') // 打开单元在起步时已提交
    expect(w.order).toEqual([]) // 裸写不自行入链——run() 前零调用
    expect(await pre.run()).toBe(true)
    expect(w.order).toEqual(['raw:b'])
    expect(w.db()).toBe('b')
    expect(w.ctl.view()).toMatchObject({ comment: 'b', saveState: 'saved' })
    pre.release()
    await w.ctl.flush()
    expect(w.order).toEqual(['raw:b']) // 值已在库：零写
  })

  it('值捕获时点=命令起步：起步后的新输入不并入 run()，由空闲计时落到普通写链', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.ctl.edit('b')
    const pre = w.ctl.flushPendingRaw()
    w.ctl.edit('c') // 命令起步后的新输入
    expect(await pre.run()).toBe(true)
    expect(w.order).toEqual(['raw:b']) // 写的是起步时捕获的 b
    expect(w.ctl.view()).toMatchObject({ comment: 'c', saveState: 'dirty' })
    pre.release()
    await idle()
    await laneDrain(PAPER)
    expect(w.order).toEqual(['raw:b', 'persist:c'])
    expect(w.db()).toBe('c')
  })

  it('起步时在途普通写：run() 只等那一笔，落定后不叠发裸写', async () => {
    const w = makeWorld()
    ctl = w.ctl
    const first = deferred<boolean>()
    let calls = 0
    w.onPersist(() => (++calls === 1 ? first.promise : true))
    w.ctl.edit('b')
    void w.ctl.flush() // 在途写：b（挂起）
    await turns()
    expect(w.order).toEqual(['persist:b'])
    const pre = w.ctl.flushPendingRaw()
    const running = pre.run()
    await turns()
    expect(w.order).toEqual(['persist:b']) // 等在途写，未叠发裸写
    first.resolve(true)
    expect(await running).toBe(true)
    expect(w.order).toEqual(['persist:b'])
    expect(w.db()).toBe('b')
    pre.release()
  })

  it('起步时在途普通写失败：run()=false（§2.5 #14 预 flush 失败）', async () => {
    const w = makeWorld()
    ctl = w.ctl
    const first = deferred<boolean>()
    let calls = 0
    w.onPersist(() => (++calls === 1 ? first.promise : true))
    w.ctl.edit('b')
    void w.ctl.flush()
    await turns()
    const pre = w.ctl.flushPendingRaw()
    const running = pre.run()
    await turns()
    first.resolve(false)
    expect(await running).toBe(false)
    expect(w.db()).toBe('')
    expect(w.ctl.view()).toMatchObject({ comment: 'b', saveState: 'failed' })
    pre.release()
  })

  it('裸写失败：run()=false、显示真实失败态；失败写保留——普通写重试可成功', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.onRaw(() => false)
    w.ctl.edit('b')
    const pre = w.ctl.flushPendingRaw()
    expect(await pre.run()).toBe(false)
    expect(w.order).toEqual(['raw:b'])
    expect(w.ctl.view()).toMatchObject({ comment: 'b', saveState: 'failed' })
    pre.release()
    expect(await w.ctl.flush()).toBe('saved')
    expect(w.order).toEqual(['raw:b', 'persist:b'])
    expect(w.db()).toBe('b')
  })

  it('等值普通写抑制：命令在途期间与预 flush 对象同值的普通写不叠发，随命令兑现后判零写', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.ctl.edit('b')
    const pre = w.ctl.flushPendingRaw()
    let flushed: unknown = '(pending)'
    void w.ctl.flush().then((s) => {
      flushed = s
    }) // 命令在途期间的同值普通写（收口面）
    await turns()
    expect(w.order).toEqual([]) // 未入链——入链即排在命令任务之后并覆盖反向值
    expect(await pre.run()).toBe(true)
    pre.release()
    await turns()
    expect(w.order).toEqual(['raw:b'])
    expect(flushed).toBe('saved')
    // 命令终结后普通写判定恢复
    w.ctl.edit('c')
    await w.ctl.flush()
    expect(w.order).toEqual(['raw:b', 'persist:c'])
  })

  it('异值不抑制：命令在途期间值已变的普通写照发', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.ctl.edit('b')
    const pre = w.ctl.flushPendingRaw()
    w.ctl.edit('c') // 值已变（≠预 flush 对象 b）
    await w.ctl.flush()
    expect(w.order).toEqual(['persist:c'])
    expect(await pre.run()).toBe(true)
    expect(w.order).toEqual(['persist:c', 'raw:b'])
    pre.release()
  })
})

describe('操作层恢复旧文（代际通知带恢复值）× 命令起步后的新输入', () => {
  it('有新输入：显示值保留、基线改指恢复值、落库调度不丢；打开单元基线=恢复值', async () => {
    const w = makeWorld()
    ctl = w.ctl
    const pre = w.ctl.flushPendingRaw() // 操作层命令起步
    expect(await pre.run()).toBe(true)
    w.ctl.edit('new') // 命令起步后的新输入（未落库）
    bumpTextGeneration(TARGET, 'restored') // 操作层把本 target 恢复为 restored
    expect(w.ctl.view()).toMatchObject({ comment: 'new', saveState: 'dirty' })
    pre.release()
    await idle()
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:new'])
    expect(w.db()).toBe('new')
    // 打开单元基线=恢复值：文本层 undo 回 restored（不是被撤销的旧分支）
    expect(peekTextUndo(TARGET)?.before).toBe('restored')
  })

  it('无新输入：采纳恢复值（显示值=库值，clean）', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.ctl.edit('stale')
    const pre = w.ctl.flushPendingRaw()
    expect(await pre.run()).toBe(true) // 预 flush 落库 stale
    bumpTextGeneration(TARGET, 'restored') // 操作层随后恢复旧文
    pre.release()
    expect(w.ctl.view()).toMatchObject({ comment: 'restored', saveState: 'clean' })
    await idle()
    await laneDrain(PAPER)
    expect(w.order).toEqual(['raw:stale']) // 无补写
  })
})

describe('代际校验——文本层命令在过期代际上起步即中止', () => {
  it('排队期间目标代际被操作层推进：命令 false、零预 flush、零反向写', async () => {
    const w = makeWorld()
    ctl = w.ctl
    w.ctl.edit('a')
    await w.ctl.flush()
    expect(w.order).toEqual(['persist:a'])
    expect(canUndoText(TARGET)).toBe(true)
    const release = blockLane() // 操作层命令任务占位（后于其起步）
    const undoing = w.ctl.undo() // 文本层命令排在其后
    await turns()
    w.ctl.edit('b')
    release()
    bumpTextGeneration(TARGET, 'restored') // 操作层恢复旧文先落定
    expect(await undoing).toBe(false)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:a']) // 零预 flush、零反向写
    expect(w.ctl.view()).toMatchObject({ comment: 'restored', saveState: 'clean' })
    // 两栈由代际失效清空；被中止的命令未在其上留下任何移动（无 redo 项）
    expect(canUndoText(TARGET)).toBe(false)
    expect(canRedoText(TARGET)).toBe(false)
  })
})
