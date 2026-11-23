// @vitest-environment jsdom
/**
 * [B4-A 回炉 R5 → 回归] 文本 history 写的链位：命令起步即入链占位（§4.3 链序=
 * 起步时已在链的任务 → history 写 → 其后入链的新单元/操作；§2.5 #13/#14/#16b）。
 *
 * 锁链（复审反例转正——基线红证=仓外 b4a-review/recheck-r5-lane.log：旧实现等
 * laneDrain 后才入链反向写，等待窗内入链的新值写先落库、被反向写覆盖）：
 * - R5 序列：a 已落库 → 旧 lane 任务阻塞 → undo → 窗内输入 y+blur → 切目标
 *   （fire-first flush+dispose，回执未到）→ history 回执：写序=persist:a →
 *   history → persist:y，DB 终值 y；
 * - 回执先于切目标到达：切目标的 flush 不补发、显示值=y、saveState=saved；
 * - 命令起步有待写值：预 flush 写在链位内先于反向写，窗内新值后落库；
 * - 等值普通写不叠发：命令在途期间 blur 的同值普通写不入链（入链即落在反向写
 *   之后、覆盖反向值）；
 * - 预 flush 失败（含等待窗内出现新输入——按写体自身结果判失败，不借道
 *   saveState）：反向写零调用、两栈不动、命令 false；
 * - 起步时在途普通写：不叠发预 flush（在途写已在链上先于命令任务）——调用序=
 *   在途值→反向值（reader-notes-history「flush-then-undo」合约的控制器层形态）。
 * 第二个 describe=批注宿主真实适配链（AnnotationPopups→popups-actions：普通写
 * 自入链、预 flush/反向写经裸写体）走同一 R5 序列。
 * DB 以闭包模拟；lane=真实 per-tab 链。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({ updateAnnotation: vi.fn(), deleteAnnotation: vi.fn() }))
makeApiStub({
  reader: { updateAnnotation: mocks.updateAnnotation, deleteAnnotation: mocks.deleteAnnotation }
})

import { TextController } from '../../../src/renderer/features/reader/state/reader-text-controller'
import {
  canRedoText,
  canUndoText,
  clearAllTextHistory,
  peekTextUndo
} from '../../../src/renderer/features/reader/state/reader-text-history'
import { enqueueTabTask, laneDrain, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { clearStack } from '../../../src/renderer/features/reader/state/annotation-undo'
import {
  flushAnnotationDraft,
  takeAnnotationDraft
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

const PAPER = 'p-text-history-lane'
const TARGET = { paperId: PAPER, kind: 'paper-note' } as const
const ANNO_PAPER = 'p-text-history-lane-anno'
const ANNO_ID = 'anno-text-history-lane'
const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }

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

/** 控制器世界：普通写自入链（生产适配器形态）；裸写体供控制器链任务体内直调 */
function makeWorld(): {
  ctl: TextController
  order: string[]
  db(): string
  onPersist(body: Body): void
  onHistory(body: Body): void
} {
  const order: string[] = []
  let db = ''
  let persistBody: Body = () => true
  let historyBody: Body = () => true
  const run = async (kind: 'persist' | 'history', value: string): Promise<boolean> => {
    order.push(`${kind}:${value}`)
    const ok = await (kind === 'persist' ? persistBody(value) : historyBody(value))
    if (ok) db = value
    return ok
  }
  const ctl = new TextController(TARGET, '', {
    persist: (v) => enqueueTabTask(PAPER, () => run('persist', v)),
    persistRaw: (v) => run('persist', v),
    historyWriteRaw: (v) => run('history', v),
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
    onHistory: (body) => {
      historyBody = body
    }
  }
}

let created: TextController[] = []
let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  mocks.deleteAnnotation.mockReset()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(ANNO_PAPER)
  takeAnnotationDraft(ANNO_ID)
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  created = []
})

afterEach(() => {
  for (const ctl of created.splice(0)) ctl.dispose()
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.clearAllTimers()
  vi.useRealTimers()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(ANNO_PAPER)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

describe('文本 history 写的链位 —— 命令起步即入链占位（§4.3/§2.5 #13-#16b）', () => {
  it('R5：窗内新值不被较早的 history 覆盖——切目标（fire-first flush+dispose）后才到的回执不回写旧值', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    const history = deferred<boolean>()
    w.onHistory(() => history.promise)
    w.ctl.edit('a')
    await w.ctl.flush()
    expect(w.db()).toBe('a')

    // 旧 lane 任务阻塞写链（history 命令起步时已在链）
    let releaseBlocker!: () => void
    const blocker = new Promise<void>((r) => {
      releaseBlocker = r
    })
    void enqueueTabTask(PAPER, () => blocker)
    const undoing = w.ctl.undo()
    await turns(5)
    // 在途窗：输入 y 并 blur——新值的普通写入链
    w.ctl.edit('y')
    w.ctl.blur()
    releaseBlocker()
    await turns()
    expect(w.order).toContain('history:')

    // 切目标：回执未到。flush 为 fire-first（不阻离场——fireAllDraftFlushes 同序）
    const flushing = w.ctl.flush()
    w.ctl.dispose()
    history.resolve(true)
    expect(await undoing).toBe(true)
    await flushing
    await laneDrain(PAPER)
    // 新值的写排在反向写之后落库；dispose 后无补写依赖
    expect({ order: w.order, db: w.db() }).toEqual({
      order: ['persist:a', 'history:', 'persist:y'],
      db: 'y'
    })
  })

  it('回执先于切目标到达：新值后落库、显示值保留、切目标的 flush 零补发', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    w.ctl.edit('a')
    await w.ctl.flush()
    let releaseBlocker!: () => void
    const blocker = new Promise<void>((r) => {
      releaseBlocker = r
    })
    void enqueueTabTask(PAPER, () => blocker)
    const undoing = w.ctl.undo()
    await turns(5)
    w.ctl.edit('y')
    w.ctl.blur()
    releaseBlocker()
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:a', 'history:', 'persist:y'])
    expect(w.db()).toBe('y')
    expect(w.ctl.view()).toMatchObject({ comment: 'y', saveState: 'saved' })
    // 延后单元重基为反向值：下一步 undo 回 ''（不是被撤分支）
    expect(peekTextUndo(TARGET)?.before).toBe('')

    await w.ctl.flush()
    expect(w.order).toHaveLength(3) // 切目标的 flush：值已在库，零写
    w.ctl.dispose()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    expect(w.order).toHaveLength(3) // 卸载后零计时补写
  })

  it('命令起步有待写值：预 flush 写在链位内先于反向写，窗内新值后落库', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    w.ctl.edit('b') // 未落库即 undo
    let releaseBlocker!: () => void
    const blocker = new Promise<void>((r) => {
      releaseBlocker = r
    })
    void enqueueTabTask(PAPER, () => blocker)
    const undoing = w.ctl.undo()
    await turns(5)
    expect(w.order).toEqual([]) // 预 flush 在命令任务体内——尚未轮到
    w.ctl.edit('c') // 在途窗新输入（未 blur：由空闲计时落库）
    releaseBlocker()
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b', 'history:'])
    expect(w.db()).toBe('')
    expect(w.ctl.view().comment).toBe('c')
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b', 'history:', 'persist:c'])
    expect(w.db()).toBe('c')
  })

  it('等值普通写不叠发：命令在途期间 blur 的同值普通写不入链（入链即落在反向写之后）', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    w.ctl.edit('b')
    let releaseBlocker!: () => void
    const blocker = new Promise<void>((r) => {
      releaseBlocker = r
    })
    void enqueueTabTask(PAPER, () => blocker)
    const undoing = w.ctl.undo()
    await turns(5)
    w.ctl.blur() // 值仍=b：与预 flush 对象同值
    releaseBlocker()
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b', 'history:'])
    expect(w.db()).toBe('')
    expect(w.ctl.view()).toMatchObject({ comment: '', saveState: 'saved' })
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b', 'history:']) // 空闲信号到达时值已在库
  })

  it('预 flush 失败：反向写零调用、两栈不动、命令 false、显示真实失败态', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    w.onPersist(() => false)
    w.ctl.edit('b')
    expect(await w.ctl.undo()).toBe(false)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b'])
    expect(w.db()).toBe('')
    expect(w.ctl.view()).toMatchObject({ comment: 'b', saveState: 'failed' })
    expect(canUndoText(TARGET)).toBe(true) // 不弹栈
    expect(canRedoText(TARGET)).toBe(false)
  })

  it('预 flush 等待窗内出现新输入且预 flush 失败：仍中止（按写体自身结果判失败）', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    const first = deferred<boolean>()
    let calls = 0
    w.onPersist(() => (++calls === 1 ? first.promise : true))
    w.ctl.edit('b')
    const undoing = w.ctl.undo()
    await turns()
    expect(w.order).toEqual(['persist:b']) // 预 flush 在途
    w.ctl.edit('y') // 等待窗内新输入
    first.resolve(false)
    expect(await undoing).toBe(false)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b']) // 反向写零调用
    expect(w.db()).toBe('')
    expect(canUndoText(TARGET)).toBe(true)
    expect(w.ctl.view().comment).toBe('y')
  })

  it('起步时在途普通写：不叠发预 flush——调用序=在途值→反向值', async () => {
    const w = makeWorld()
    created.push(w.ctl)
    const first = deferred<boolean>()
    let calls = 0
    w.onPersist(() => (++calls === 1 ? first.promise : true))
    w.ctl.edit('b')
    void w.ctl.flush() // 在途写：b
    await turns()
    expect(w.order).toEqual(['persist:b'])
    const undoing = w.ctl.undo()
    await turns()
    first.resolve(true)
    expect(await undoing).toBe(true)
    await laneDrain(PAPER)
    expect(w.order).toEqual(['persist:b', 'history:'])
    expect(w.db()).toBe('')
  })
})

describe('R5 × 批注宿主真实适配链（AnnotationPopups：普通写自入链，预 flush/反向写经裸写体）', () => {
  let editing: { annotation: Annotation; rect: AnnotationRect } | null = null

  function render(): void {
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={editing}
          busy={false}
          setMenu={() => undefined}
          setEditing={() => undefined}
          setBusy={() => undefined}
          onChanged={() => undefined}
        />
      )
    })
  }
  function textarea(): HTMLTextAreaElement {
    return host!.querySelector('textarea') as HTMLTextAreaElement
  }
  function typeInto(text: string): void {
    const el = textarea()
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(el, text)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  async function settle(): Promise<void> {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it('a → 旧任务阻塞 → undo → 窗内 y+blur → 切目标 → history 回执：DB 终值 y', async () => {
    const annotation = { ...makeAnnotation(''), id: ANNO_ID, paperId: ANNO_PAPER }
    useReaderStore.setState({
      tabs: { [ANNO_PAPER]: makeTab(ANNO_PAPER, { annotations: [annotation] }) },
      order: [ANNO_PAPER],
      activeId: ANNO_PAPER
    })
    let db = ''
    const order: string[] = []
    const reverse = deferred<{ ok: true; data: Annotation }>()
    mocks.updateAnnotation.mockImplementation((arg: { annotation: Annotation }) => {
      order.push(arg.annotation.comment)
      // 反向写（空串）回执挂起到切目标之后
      if (arg.annotation.comment === '') return reverse.promise
      db = arg.annotation.comment
      return Promise.resolve({ ok: true, data: arg.annotation })
    })
    editing = { annotation, rect: RECT }
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    render()
    typeInto('a')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(db).toBe('a')

    let releaseBlocker!: () => void
    const blocker = new Promise<void>((r) => {
      releaseBlocker = r
    })
    void enqueueTabTask(ANNO_PAPER, () => blocker)
    await act(async () => {
      textarea().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
      )
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    typeInto('y')
    await act(async () => {
      textarea().focus()
      textarea().blur()
      await Promise.resolve()
    })
    releaseBlocker()
    await settle()
    expect(order).toEqual(['a', ''])

    // 切目标（AnnotationLayer 同序：fire-first flush → setEditing(null) → 卸载 dispose）
    act(() => {
      void flushAnnotationDraft(ANNO_ID)
    })
    editing = null
    render()
    await settle()
    expect(order).toEqual(['a', '']) // 切目标的 flush 不抢在命令任务之前
    reverse.resolve({ ok: true, data: { ...annotation, comment: '' } })
    await settle()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    await settle()
    expect(order).toEqual(['a', '', 'y'])
    expect(db).toBe('y')
    expect(useReaderStore.getState().tabs[ANNO_PAPER]?.annotations[0]?.comment).toBe('y')
    expect(takeAnnotationDraft(ANNO_ID)).toBeNull() // 新值已落库：卸载残留面自清
  })
})
