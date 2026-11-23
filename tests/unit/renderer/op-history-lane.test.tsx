// @vitest-environment jsdom
/**
 * [B4-A 回炉三 A → 回归] 操作层 history 写的链位：命令起步即入链占位（§4.3 链序=
 * 起步时已在链的任务 → 预 flush（裸写体，任务体内）→ history 写 → 其后入链的新单元/
 * 操作；§2.5 #13/#14/#16b）。
 *
 * 回炉二探针序列转正。旧实现预 flush→laneDrain 之后才入链反向写，等待窗内入链的
 * 同标注新写抢占链位、先落库后被反向写覆盖——库=旧值而 store=新值。
 * 红绿归属（仓外 b4a-rework3，文件名=日志）：
 * - 对改动前树红 6 例（22-final-red-vs-prechange.log）：同实体、S1、S2、值捕获时点、
 *   跨层、非命令目标 tab；
 * - 对 cut1-no-guard（已落「入链复合任务+裸预 flush」、未加两段连带）红 4 例
 *   （23-final-red-vs-cut1-no-guard.log）：S1、S2、值捕获时点、跨层；
 * - 对「关闭操作层等值抑制」变异红 1 例（16-mut-m1-no-raw-suppress.log）：等值普通写不叠发；
 * - 两棵较早树上均绿（既有面不变，作回归锁定）：窗内无新输入、预 flush 失败。
 * 锁定行为：
 * - 同实体：窗内入链的 A 新写排在操作层反向写之后落库，库=新值；
 * - 批注宿主真实适配链（AnnotationPopups→reader.store.undo 生产路径）：
 *   · S1 窗内同标注输入并 blur：终态库=新值、显示=新值、零回写（操作层恢复时不
 *     覆盖窗内新输入——编辑序号判据，文本层 R5「命令起步后显示值未变才采纳反向值」同构）；
 *   · S2 窗内同标注输入未 blur：显示值保留，空闲后落库；该输入成为可撤的文本单元
 *     （基线=恢复值）；
 *   · 值捕获时点=命令起步：起步时的待写值经裸预 flush 在链位内先于反向写落库并
 *     成为被撤的操作项；窗内更新的输入不并入预 flush，落在反向写之后；
 *   · 等值普通写不叠发：命令在途期间的同值普通写（切目标 fire-first flush）不入链；
 *   · 预 flush 失败（§2.5 #14）：反向写零调用、两栈不动、reason=write-failed；失败写
 *     保留（控制器 failed 态），定稿重试可成功；
 *   · 跨层：操作层 undo 起步→窗内同标注文本层 undo——文本层命令在过期代际上起步
 *     即中止（不预 flush、不反向写；§3 操作层行）；
 * - 非命令目标 tab 的挂载控制器不并入预 flush（裸写体由调用方链位承载）。
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

import {
  useAnnotationPopupActions,
  type AnnotationPopupActions
} from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import { flushAnnotationDraft } from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { undoTabOperations } from '../../../src/renderer/features/reader/state/reader-history-commands'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import {
  clearStack,
  peekUndo,
  pushUndo,
  redoDepth,
  stackDepth
} from '../../../src/renderer/features/reader/state/annotation-undo'
import { canUndoText, clearAllTextHistory } from '../../../src/renderer/features/reader/state/reader-text-history'
import { tabFlushError } from '../../../src/renderer/features/reader/state/reader-close-tab'
import { finalizeTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { enqueueTabTask, laneDepth, laneDrain, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

const P = 'p-op-lane'
const Q = 'p-op-lane-other'
const A: Annotation = { ...makeAnnotation('a'), id: 'a-op', paperId: P }
const B: Annotation = { ...makeAnnotation(''), id: 'b-op', paperId: P }
const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
const A_KEY = { paperId: P, kind: 'annotation-comment', annotationId: A.id } as const

/** 微任务排空（async 链逐跳） */
async function turns(n = 30): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let editing: { annotation: Annotation; rect: AnnotationRect } | null = null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  mocks.deleteAnnotation.mockReset()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  clearStack(Q)
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderStore.setState({
    tabs: { [P]: makeTab(P, { annotations: [A, B] }) },
    order: [P],
    activeId: P
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  editing = null
  document.body.innerHTML = ''
  vi.clearAllTimers()
  vi.useRealTimers()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  clearStack(Q)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

/** 仅挂动作域 hook（无编辑器——写经 popups-actions 入链，无挂载控制器） */
function mountActions(): AnnotationPopupActions {
  let actions: AnnotationPopupActions | null = null
  function Probe(): null {
    actions = useAnnotationPopupActions({
      busy: false,
      setBusy: () => undefined,
      closeEditing: () => undefined,
      closeMenu: () => undefined,
      onChanged: () => undefined
    })
    return null
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<Probe />)
  })
  return actions!
}

function renderPopups(): void {
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

/** 挂真实批注编辑器（AnnotationPopups——文本控制器+popups-actions 适配链） */
function mountEditor(annotation: Annotation): void {
  editing = { annotation, rect: RECT }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  renderPopups()
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

/** textarea 内 ctrl+z（文本层 undo；命令起步的同步段与首跳微任务留在 act 内） */
async function pressUndo(): Promise<void> {
  await act(async () => {
    textarea().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    )
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

function blurEditor(): void {
  act(() => {
    textarea().focus()
    textarea().blur()
  })
}

async function settle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

/** 在 act 内等待命令兑现并冲完其后的微任务续体（store apply、代际通知、链上后续
 *  任务的结果处理等状态更新不落到 act 外） */
async function awaitAct<T>(p: Promise<T>): Promise<T> {
  let out!: T
  await act(async () => {
    out = await p
    await turns()
  })
  return out
}

async function idle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
  })
}

function storeComment(id: string, paperId = P): string | undefined {
  return useReaderStore.getState().tabs[paperId]?.annotations.find((x) => x.id === id)?.comment
}

/** 编辑器世界：挂真实编辑器；updateAnnotation 桩记录写序（按 comment）并落闭包库 */
function mountWorld(annotation: Annotation = A, initialDb = 'a'): { db: () => string; order: string[] } {
  let db = initialDb
  const order: string[] = []
  mocks.updateAnnotation.mockImplementation((arg: { annotation: Annotation }) => {
    order.push(arg.annotation.comment)
    db = arg.annotation.comment
    return Promise.resolve({ ok: true, data: arg.annotation })
  })
  mountEditor(annotation)
  return { db: () => db, order }
}

/** 栈顶 E1=comment-edit{before:'old', after:'a'}——操作层 undo 把 A 恢复为 'old' */
function pushRestoreOldEntry(): void {
  pushUndo(P, { kind: 'comment-edit', before: { ...A, comment: 'old' }, after: A })
}

/** 阻塞写链：其后入链的任务须等返回的 release() */
function blockLane(paperId = P): () => void {
  let releaseBlocker!: () => void
  void enqueueTabTask(
    paperId,
    () =>
      new Promise<void>((r) => {
        releaseBlocker = r
      })
  )
  return () => releaseBlocker()
}

/** 常用布景：A 库值 'a'、栈顶 E1、写链被阻塞 */
function arrangeEditor(): { db: () => string; order: string[]; release: () => void } {
  const w = mountWorld()
  pushRestoreOldEntry()
  return { ...w, release: blockLane() }
}

describe('操作层 history 写的链位 —— 写经 popups-actions 入链（无挂载控制器）', () => {
  it('同实体：窗内入链的 A 新写排在操作层反向写之后落库——库=新值（回炉二探针序列转正）', async () => {
    const db: Record<string, string> = { [A.id]: 'a', [B.id]: '' }
    const order: string[] = []
    let release: () => void = () => undefined
    let hold = false
    mocks.updateAnnotation.mockImplementation((arg: { annotation: Annotation }) => {
      const { id, comment } = arg.annotation
      order.push(`${id}=${comment}`)
      const land = (): void => {
        db[id] = comment
      }
      if (hold) {
        hold = false
        return new Promise((r) => {
          release = () => {
            land()
            r({ ok: true, data: arg.annotation })
          }
        })
      }
      land()
      return Promise.resolve({ ok: true, data: arg.annotation })
    })
    const actions = mountActions()
    // 栈序：B 的会话条目（E_B），A 的条目（E1，栈顶）
    expect(await actions.autosaveComment(B, 'b1')).toBe(true)
    pushUndo(P, { kind: 'comment-edit', before: { ...A, comment: '' }, after: A })
    expect(stackDepth(P)).toBe(2)
    expect(peekUndo(P)?.kind).toBe('comment-edit')

    hold = true
    void actions.autosaveComment(B, 'b2') // T0 在途（命令起步时已在链）
    await turns()
    expect(order).toEqual(['b-op=b1', 'b-op=b2'])

    const undoing = undoTabOperations(P)
    await turns(2)
    void actions.autosaveComment(A, 'new') // 等待窗内：同标注 A 的新写入链
    await turns(2)
    release()
    const outcome = await undoing
    await laneDrain(P)
    // 写序=T0 → history(E1→'') → A 新值；库=新值
    expect(order).toEqual(['b-op=b1', 'b-op=b2', 'a-op=', 'a-op=new'])
    expect(db[A.id]).toBe('new')
    expect(db[B.id]).toBe('b2')
    expect(storeComment(A.id)).toBe('new')
    expect(outcome).toEqual({ done: true, apply: { type: 'upsert', annotation: { ...A, comment: '' } } })
    // 被撤条目入 redo；窗内新写落在反向写之后=其后的新操作（§2.5 #2：提交即清 redo）
    expect(redoDepth(P)).toBe(0)
    expect(stackDepth(P)).toBe(2)
  })
})

describe('批注宿主真实适配链（AnnotationPopups→reader.store.undo）', () => {
  it('S1：窗内同标注输入并 blur——新值排在反向写之后落库；终态库=新值、显示=新值、零回写', async () => {
    const w = arrangeEditor()
    const undoing = useReaderStore.getState().undo()
    await settle()
    typeInto('new')
    blurEditor()
    w.release()
    expect(await awaitAct(undoing)).toBe(true)
    await settle()
    // 写序=操作层反向写（old）→ 窗内新值（new）；恢复值不覆盖窗内新输入
    expect(w.order).toEqual(['old', 'new'])
    expect({ db: w.db(), store: storeComment(A.id), view: textarea().value }).toEqual({
      db: 'new',
      store: 'new',
      view: 'new'
    })
    // 空闲信号到达时值已在库——显示值不被当作待写值回写
    await idle()
    expect(w.order).toEqual(['old', 'new'])
    expect(w.db()).toBe('new')
    expect(textarea().value).toBe('new')
  })

  it('S2：窗内同标注输入未 blur——显示值保留、空闲后落库；该输入是可撤的文本单元（基线=恢复值）', async () => {
    const w = arrangeEditor()
    const undoing = useReaderStore.getState().undo()
    await settle()
    typeInto('new')
    w.release()
    expect(await awaitAct(undoing)).toBe(true)
    await settle()
    // 恢复值已落库；窗内新输入保留为待写（不被代际失效丢弃——§2.5 #16b）
    expect(w.order).toEqual(['old'])
    expect({ db: w.db(), store: storeComment(A.id), view: textarea().value }).toEqual({
      db: 'old',
      store: 'old',
      view: 'new'
    })
    await idle()
    expect(w.order).toEqual(['old', 'new'])
    expect({ db: w.db(), store: storeComment(A.id), view: textarea().value }).toEqual({
      db: 'new',
      store: 'new',
      view: 'new'
    })
    // 窗内输入的文本单元 before=恢复值：文本层 undo 回到 old（不是被撤销的分支 a）
    expect(canUndoText(A_KEY)).toBe(true)
    await pressUndo()
    await settle()
    expect(w.order).toEqual(['old', 'new', 'old'])
    expect(textarea().value).toBe('old')
  })

  it('窗内无新输入：采纳恢复值（库=store=显示=恢复值）', async () => {
    const w = arrangeEditor()
    const undoing = useReaderStore.getState().undo()
    await settle()
    w.release()
    expect(await awaitAct(undoing)).toBe(true)
    await settle()
    expect(w.order).toEqual(['old'])
    expect({ db: w.db(), store: storeComment(A.id), view: textarea().value }).toEqual({
      db: 'old',
      store: 'old',
      view: 'old'
    })
  })

  it('值捕获时点=命令起步：起步时的待写值经裸预 flush 先落库并成为被撤项；窗内更新的输入落在反向写之后', async () => {
    const w = arrangeEditor()
    typeInto('edit1') // 起步时的待写值（未落库、无在途写）
    const undoing = useReaderStore.getState().undo()
    await settle()
    expect(w.order).toEqual([]) // 预 flush 在复合任务体内——尚未轮到
    typeInto('edit2') // 等待窗内新输入（未 blur）
    w.release()
    expect(await awaitAct(undoing)).toBe(true)
    await settle()
    // 预 flush 写的是起步时的 edit1（不并入窗内的 edit2）；其落库建立的操作项即被撤项
    expect(w.order).toEqual(['edit1', 'a'])
    expect(textarea().value).toBe('edit2')
    // 被撤的是预 flush 落库的那一步（edit1→a），原栈顶 E1 仍在
    expect(stackDepth(P)).toBe(1)
    expect(redoDepth(P)).toBe(1)
    expect(peekUndo(P)).toMatchObject({ kind: 'comment-edit', before: { comment: 'old' } })
    await idle()
    expect(w.order).toEqual(['edit1', 'a', 'edit2'])
    expect({ db: w.db(), store: storeComment(A.id), view: textarea().value }).toEqual({
      db: 'edit2',
      store: 'edit2',
      view: 'edit2'
    })
    // 窗内新写落在反向写之后=其后的新操作项（栈顶；提交清 redo——§2.5 #2）
    expect(peekUndo(P)).toMatchObject({ kind: 'comment-edit', before: { comment: 'a' }, after: { comment: 'edit2' } })
    expect(stackDepth(P)).toBe(2)
    expect(redoDepth(P)).toBe(0)
  })

  it('等值普通写不叠发：命令在途期间的同值普通写（切目标 fire-first flush）不入链——不覆盖反向值', async () => {
    const w = arrangeEditor()
    typeInto('new') // 起步时的待写值
    const undoing = useReaderStore.getState().undo()
    await settle()
    // 等待窗：切目标（AnnotationLayer 同序：fire-first flush → setEditing(null) → 卸载）
    let flushState: unknown = '(pending)'
    act(() => {
      void flushAnnotationDraft(A.id)?.then((s) => {
        flushState = s
      })
    })
    editing = null
    renderPopups()
    // 同值普通写未入链：链上只有阻塞任务+复合任务（入链即排在反向写之后——其是否覆盖
    // 反向值取决于 popups-actions 值复判的微任务先后，非可依赖契约；抑制使其确定不发生）
    expect(laneDepth(P)).toBe(2)
    w.release()
    expect(await awaitAct(undoing)).toBe(true)
    await settle()
    await idle()
    // 写序=预 flush（new）→ 反向写（a）
    expect(w.order).toEqual(['new', 'a'])
    expect({ db: w.db(), store: storeComment(A.id) }).toEqual({ db: 'a', store: 'a' })
    expect(['saved', 'clean']).toContain(flushState) // 被抑制的写随命令兑现后判零写
  })

  it('预 flush 失败（§2.5 #14）：反向写零调用、两栈不动、write-failed；失败写保留——定稿重试成功', async () => {
    const w = arrangeEditor()
    let failPending = true
    mocks.updateAnnotation.mockImplementation((arg: { annotation: Annotation }) => {
      w.order.push(arg.annotation.comment)
      if (failPending && arg.annotation.comment === 'new') {
        return Promise.resolve({ ok: false as const, error: { code: 'E', message: '写盘失败' } })
      }
      return Promise.resolve({ ok: true, data: arg.annotation })
    })
    typeInto('new')
    const undoing = undoTabOperations(P)
    await settle()
    w.release()
    expect(await awaitAct(undoing)).toEqual({ done: false, reason: 'write-failed' })
    await settle()
    expect(w.order).toEqual(['new']) // 只有失败的那一笔预 flush；反向写零调用
    expect(stackDepth(P)).toBe(1)
    expect(redoDepth(P)).toBe(0)
    expect(textarea().value).toBe('new') // 显示值不动
    // 失败写保留可重试：IO 错误旗标在（重试有物），API 恢复后定稿重试成功并清旗标
    expect(tabFlushError(P)).toBe('标注写失败')
    failPending = false
    expect(await awaitAct(finalizeTab(P))).toBe(true)
    expect(w.order).toEqual(['new', 'new'])
    expect(tabFlushError(P)).toBeNull()
  })

  it('跨层：操作层 undo 起步→窗内同标注文本层 undo——文本层命令在过期代际上起步即中止（不预 flush、不反向写）', async () => {
    // A 初值 ''：键入 x→空闲（E1{''→x}）→键入 xy→空闲（同会话只推进 after）
    useReaderStore.setState({
      tabs: { [P]: makeTab(P, { annotations: [{ ...A, comment: '' }, B] }) },
      order: [P],
      activeId: P
    })
    const w = mountWorld({ ...A, comment: '' }, '')
    typeInto('x')
    await idle()
    typeInto('xy')
    await idle()
    expect(w.order).toEqual(['x', 'xy'])
    expect(stackDepth(P)).toBe(1)

    const release = blockLane()
    const opUndo = useReaderStore.getState().undo() // 生产路径（含 store apply）
    await settle()
    await pressUndo() // 等待窗：同标注的文本层 undo（请求序=操作层 → 文本层）
    await settle()
    release()
    expect(await awaitAct(opUndo)).toBe(true)
    await settle()
    // 操作层恢复旧文已推进该 target 代际：文本层命令不预 flush、不反向写（否则把旧分支值写回）
    expect(w.order).toEqual(['x', 'xy', ''])
    expect({ db: w.db(), store: storeComment(A.id), view: textarea().value }).toEqual({
      db: '',
      store: '',
      view: ''
    })
    expect(stackDepth(P)).toBe(0)
    expect(redoDepth(P)).toBe(1)
    await idle()
    expect(w.order).toEqual(['x', 'xy', '']) // 空闲信号零补写
  })

  it('非命令目标 tab 的挂载控制器不并入预 flush（裸写体由调用方链位承载）', async () => {
    const QA: Annotation = { ...makeAnnotation('qa'), id: 'qa-op', paperId: Q }
    useReaderStore.setState({
      tabs: { [P]: makeTab(P, { annotations: [A, B] }), [Q]: makeTab(Q, { annotations: [QA] }) },
      order: [P, Q],
      activeId: P
    })
    const w = mountWorld()
    typeInto('new') // 活动篇 P 的编辑器待写值
    pushUndo(Q, { kind: 'comment-edit', before: { ...QA, comment: 'old' }, after: QA })
    expect(await awaitAct(undoTabOperations(Q))).toMatchObject({ done: true })
    await settle()
    // Q 的命令只写 Q 的反向值；P 的编辑器待写值未被并入（未提交、未写）
    expect(w.order).toEqual(['old'])
    expect(textarea().value).toBe('new')
    await idle()
    expect(w.order).toEqual(['old', 'new']) // P 的待写值由自身空闲计时落库
    await laneDrain(P)
  })
})
