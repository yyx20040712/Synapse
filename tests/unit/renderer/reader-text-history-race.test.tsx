// @vitest-environment jsdom
/**
 * [B4-A R2 审查 5 → 回归] 文本历史：history 在途窗内的单元提交（§4.3 链序=
 * history 写 → 后续单元提交；§2.5 #16b/#17b）。
 *
 * 锁链（审查反例 5 转正 + 三向补全）：
 * - undo 在途窗内单元提交（blur）：回执先按条目身份移栈，延后单元重基为反向
 *   值后入栈——下一步 undo 回反向值（不是已被撤销的分支），入栈即清 redo；
 * - redo 在途窗内单元提交：延后单元重基为重做值；
 * - 反向写失败：两栈不动，延后单元按原 before 照常入栈（不归因于失败命令）；
 * - 预 flush 等待窗内的提交（先于反向写派发）：回执不改写新输入的显示值。
 * 历史栈断言直接读注册表（peek/canRedo——值与身份单源）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TextController } from '../../../src/renderer/features/reader/state/reader-text-controller'
import {
  canRedoText,
  clearAllTextHistory,
  peekTextRedo,
  peekTextUndo
} from '../../../src/renderer/features/reader/state/reader-text-history'
import { laneDrain, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

const PAPER = 'p-text-race'
const TARGET = { paperId: PAPER, kind: 'paper-note' } as const

/** 微任务排空（async 链逐跳） */
async function turns(n = 30): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

/** 可挂起的promise（反向写/落库写桩） */
function deferred(): { promise: Promise<boolean>; resolve: (v: boolean) => void } {
  let resolve!: (v: boolean) => void
  const promise = new Promise<boolean>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

interface Stub {
  persist(call: number): Promise<boolean>
  historyWrite(call: number): Promise<boolean>
}

/** 控制器夹具：落库写/反向写按调用序注入；计数值供断言「反向写已派发未回执」 */
function makeController(stub: Partial<Stub>): {
  ctl: TextController
  persistCalls(): number
  historyCalls(): number
} {
  let persist = 0
  let history = 0
  const ctl = new TextController(TARGET, '', {
    persist: () => (stub.persist ?? (() => Promise.resolve(true)))(++persist),
    // [B4-A 回炉 R5 fixture migration] 裸写体端口必选：夹具写体本就不入链，同一桩兼作裸通道
    persistRaw: () => (stub.persist ?? (() => Promise.resolve(true)))(++persist),
    historyWriteRaw: () => (stub.historyWrite ?? (() => Promise.resolve(true)))(++history),
    onChange: () => undefined
  })
  ctl.attach()
  return { ctl, persistCalls: () => persist, historyCalls: () => history }
}

let ctl: TextController | null = null

beforeEach(() => {
  resetTabLanes()
  clearAllTextHistory()
})

afterEach(() => {
  ctl?.dispose()
  ctl = null
  resetTabLanes()
  clearAllTextHistory()
})

describe('文本 history 在途窗内的单元提交 —— 条目身份结算+回执后重基（§4.3/§2.5 #16b/#17b）', () => {
  it('undo 在途窗内 blur 提交：延后单元重基为反向值后入栈——再 undo 回反向值，redo 不指向被撤分支', async () => {
    const first = deferred()
    const w = makeController({ historyWrite: (n) => (n === 1 ? first.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    await ctl.flush()
    const undoing = ctl.undo()
    await turns()
    expect(w.historyCalls()).toBe(1) // 反向写已派发未回执
    ctl.edit('y')
    ctl.blur() // 单元提交发生在 history 回执前
    first.resolve(true)
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(ctl.view().comment).toBe('y') // 新输入的显示值保留
    // 延后单元 before 重基为反向值 ''；其入栈即清 redo
    expect(peekTextUndo(TARGET)?.before).toBe('')
    expect(canRedoText(TARGET)).toBe(false)
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('')
    // 这一步 undo 产生的 redo 指向被撤的新输入 'y'
    expect(peekTextRedo(TARGET)?.after).toBe('y')
    expect(await ctl.redo()).toBe(true)
    expect(ctl.view().comment).toBe('y')
  })

  it('undo 在途窗内收口面提交（flush 闭合单元）：与 blur 同语义——重基后入栈', async () => {
    const first = deferred()
    const w = makeController({ historyWrite: (n) => (n === 1 ? first.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    await ctl.flush()
    const undoing = ctl.undo()
    await turns()
    ctl.edit('y')
    await ctl.flush() // 收口面闭合单元（flush 的提交同样延后）
    expect(w.historyCalls()).toBe(1)
    first.resolve(true)
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(peekTextUndo(TARGET)?.before).toBe('')
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('')
  })

  it('连续输入只在途窗内提交多次：延后单元按序入栈，仅首单元重基', async () => {
    const first = deferred()
    const w = makeController({ historyWrite: (n) => (n === 1 ? first.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    await ctl.flush()
    const undoing = ctl.undo()
    await turns()
    ctl.edit('y')
    ctl.blur() // 延后单元① {before:'a', after:'y'}
    ctl.edit('yz')
    ctl.blur() // 延后单元② {before:'y', after:'yz'}（沿链，不重基）
    first.resolve(true)
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(ctl.view().comment).toBe('yz')
    expect(peekTextUndo(TARGET)?.before).toBe('y')
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('y')
    expect(peekTextUndo(TARGET)?.before).toBe('')
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('')
  })

  it('redo 在途窗内 blur 提交：延后单元重基为重做值——undo 回重做值，redo 已被后续提交清空', async () => {
    const second = deferred()
    const w = makeController({ historyWrite: (n) => (n === 2 ? second.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    await ctl.flush()
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('')
    const redoing = ctl.redo()
    await turns()
    expect(w.historyCalls()).toBe(2) // 反向写（重做）已派发未回执
    ctl.edit('y')
    ctl.blur()
    second.resolve(true)
    expect(await redoing).toBe(true)
    await laneDrain(PAPER)
    expect(ctl.view().comment).toBe('y')
    // 重做值 'a' 是新基线：延后单元 before='a'；后续提交清 redo
    expect(peekTextUndo(TARGET)?.before).toBe('a')
    expect(canRedoText(TARGET)).toBe(false)
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('a')
  })

  it('反向写失败：两栈不动，延后单元按原 before 照常入栈（新编辑不归因于失败命令）', async () => {
    const first = deferred()
    const w = makeController({ historyWrite: (n) => (n === 1 ? first.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    await ctl.flush()
    const undoing = ctl.undo()
    await turns()
    ctl.edit('y')
    ctl.blur()
    first.resolve(false)
    expect(await undoing).toBe(false)
    await laneDrain(PAPER)
    expect(ctl.view().comment).toBe('y')
    // 被撤项仍在 past（其上为原 before 的延后单元）；redo 不出现
    expect(peekTextUndo(TARGET)?.before).toBe('a')
    expect(canRedoText(TARGET)).toBe(false)
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('a')
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('')
  })

  it('预 flush 等待窗内的提交（先于反向写派发）：回执不改写新输入的显示值', async () => {
    const firstPersist = deferred()
    const w = makeController({ persist: (n) => (n === 1 ? firstPersist.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a') // 未落库（预 flush 须先立存）
    const undoing = ctl.undo()
    await turns()
    expect(w.persistCalls()).toBe(1) // 预 flush 在途，反向写未派发
    expect(w.historyCalls()).toBe(0)
    ctl.edit('y')
    ctl.blur()
    firstPersist.resolve(true)
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(ctl.view().comment).toBe('y')
    expect(peekTextUndo(TARGET)?.before).toBe('')
    expect(await ctl.undo()).toBe(true)
    expect(ctl.view().comment).toBe('')
  })
})

describe('flush 在途失败后的重试边界 —— 非定稿默认兼容，定稿专用不自动重试', () => {
  it('默认 flush 等待失败回执后仍按原语义重试待写值', async () => {
    const first = deferred()
    const w = makeController({ persist: (n) => (n === 1 ? first.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    const firstFlush = ctl.flush()
    await turns()
    const retryFlush = ctl.flush()
    first.resolve(false)
    expect(await firstFlush).toBe('failed')
    expect(await retryFlush).toBe('saved')
    expect(w.persistCalls()).toBe(2)
    expect(w.ctl.view().saveState).toBe('saved')
  })

  it('retryFailed=false 等待到失败后直接返回失败终态', async () => {
    const first = deferred()
    const w = makeController({ persist: (n) => (n === 1 ? first.promise : Promise.resolve(true)) })
    ctl = w.ctl
    ctl.edit('a')
    const firstFlush = ctl.flush()
    await turns()
    const finalizeFlush = ctl.flush({ retryFailed: false })
    first.resolve(false)
    expect(await firstFlush).toBe('failed')
    expect(await finalizeFlush).toBe('failed')
    expect(w.persistCalls()).toBe(1)
    expect(w.ctl.view().saveState).toBe('failed')
  })
})
