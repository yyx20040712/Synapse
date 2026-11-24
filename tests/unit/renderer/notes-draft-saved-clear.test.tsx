// @vitest-environment jsdom
/**
 * [回炉 W-C·笔记草稿残留清除] 文本控制器写通道出口：写成功回报 true（该值已在库——宿主适配契约）
 * →清掉本目标在草稿注册表里的卸载残留条目（等值才清）。落点=use-annotation-draft.ts 的
 * persist / persistRaw 端口包装（入表面是共享绑定 useTextDraftRegistryBinding，离场后的写全部
 * 经这两个端口发出——在此清除对批注、总评两宿主一并成立）。
 *
 * 原缺陷（B4-A 遗留；由 B4-B 的 A2 e2e「有未落库 reader 写时切换课题」发现）：总评（笔记正文）写
 * 在途时离开阅读器→共享绑定在卸载时把草稿入表（saving 态）→写落库后没有任何路径清它
 * （annotationDraftSaved 原只被批注 comment 写路径调用）→条目常驻到同一篇的笔记面板重挂载：
 * 课题切换的全量 prepare 判脏而静默取消（workspace-switch.ts），退出握手被判有未保存修改
 * （quit-flush.ts）。
 *
 * 覆盖（always-active）：
 * - 总评：写在途时卸载→注册表有条目→写成功回报后清；课题切换 prepare 放行；
 * - 总评：写失败→条目保留（可重试语义不变）→退出握手仍判脏；
 * - 总评：写成功清掉之后退出握手不判脏；
 * - 等值才清：注册表里是另一个（更新的）未落库值时，旧值的成功回报不清它；
 * - 批注目标同径（批注写任务内既有的 annotationDraftSaved 调用为幂等重复）。
 *
 * 夹具：真实 TextController（经 useAnnotationDraft 挂载的宿主组件），写回报由闸门 Promise
 * 持住——确定性地停在「写在途」；总评的注册表键经 textTargetId 派生（不手写字面量）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

makeApiStub({})

import {
  hasPendingAnnotationDrafts,
  saveAnnotationDraft,
  takeAnnotationDraft
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import {
  useAnnotationDraft,
  type AnnotationDraft,
  type SaveState
} from '../../../src/renderer/features/reader/interact/use-annotation-draft'
import { textTargetId, type TextTargetKey } from '../../../src/renderer/features/reader/state/reader-text-history'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { setNoteDraftPending } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'

const NOTE_TARGET: TextTargetKey = { paperId: 'paper-draft-clear', kind: 'paper-note' }
const NOTE_KEY = textTargetId(NOTE_TARGET)
const ANNO_ID = 'anno-draft-clear'
const ANNO_TARGET: TextTargetKey = { paperId: 'paper-draft-clear', kind: 'annotation-comment', annotationId: ANNO_ID }
const TYPED = '笔记正文新输入'
const TYPED_MORE = '笔记正文新输入续写'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let draft: AnnotationDraft | null = null

function deferred<T>(): { promise: Promise<T>; resolve(v: T): void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/** 微任务轮转（让写链推进到下一个 await 边界） */
async function settle(turns = 16): Promise<void> {
  for (let i = 0; i < turns; i += 1) await Promise.resolve()
}

/** 挂载一个真实文本控制器宿主（总评宿主形态：卸载即收口） */
function mount(target: TextTargetKey, onAutosave: (value: string) => Promise<boolean>): void {
  function Host(): null {
    draft = useAnnotationDraft(target, '', { onAutosave, onAutosaveRaw: onAutosave, closeoutOnUnmount: true })
    return null
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(createElement(Host))
  })
}

function unmountHost(): void {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
}

/**
 * 走到「写在途时卸载」：输入→收口 flush（写派发、由闸门持住在途）→卸载（草稿入表）。
 * 返回闸门与在途写的终态 promise。
 */
async function unmountWithWriteInFlight(
  target: TextTargetKey
): Promise<{ gate: ReturnType<typeof deferred<boolean>>; flushing: Promise<SaveState> }> {
  const gate = deferred<boolean>()
  mount(target, () => gate.promise)
  await act(async () => {
    draft?.applyEdit(TYPED)
    await settle()
  })
  let flushing!: Promise<SaveState>
  await act(async () => {
    flushing = draft!.flush()
    await settle()
  })
  expect(draft?.saveState, '写已派发：在途（saving）').toBe('saving')
  expect(hasPendingAnnotationDrafts(), '挂载期不入草稿表').toBe(false)
  unmountHost()
  expect(hasPendingAnnotationDrafts(), '写在途时卸载→草稿入表（卸载残留）').toBe(true)
  return { gate, flushing }
}

/** 写回报落地（终态兑现+微任务轮转） */
async function reportWrite(gate: ReturnType<typeof deferred<boolean>>, flushing: Promise<SaveState>, ok: boolean): Promise<void> {
  await act(async () => {
    gate.resolve(ok)
    await flushing
    await settle()
  })
}

beforeEach(() => {
  setQuitClosing(false)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.getState().resetEditStateForTests()
  resetTabLanes()
  useLineageStore.setState({
    nodes: [],
    edges: [],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    lastWriteError: null,
    undoStack: [],
    redoStack: []
  })
  setNoteDraftPending(false)
})

afterEach(() => {
  if (root !== null) unmountHost()
  // 模块级草稿表的条目一次性消费干净（跨用例隔离）
  takeAnnotationDraft(NOTE_KEY)
  takeAnnotationDraft(ANNO_ID)
  setQuitClosing(false)
})

describe('[回炉 W-C·笔记草稿残留清除] 写成功回报后清掉注册表里的卸载残留条目', () => {
  it('总评：写在途时卸载→条目入表→写成功回报 true→条目清；课题切换的全量 prepare 放行', async () => {
    const { gate, flushing } = await unmountWithWriteInFlight(NOTE_TARGET)
    await reportWrite(gate, flushing, true)
    await expect(flushing).resolves.toBe('saved')
    expect(hasPendingAnnotationDrafts(), '写已落库——卸载残留条目须清').toBe(false)
    // 消费面①：课题切换准备段不再因该残留判脏而静默取消
    expect(await prepareWorkspaceSwitch()).toBe(true)
  })

  it('总评：写失败→条目保留（可重试语义不变）；退出握手仍判有未保存修改', async () => {
    const { gate, flushing } = await unmountWithWriteInFlight(NOTE_TARGET)
    await reportWrite(gate, flushing, false)
    await expect(flushing).resolves.toBe('failed')
    expect(hasPendingAnnotationDrafts(), '写失败——条目保留').toBe(true)
    expect(await runQuitFlush(), '未落库的草稿仍让退出判脏（既有语义不变）').toBe(true)
    expect(hasPendingAnnotationDrafts(), '退出收口不吞掉未落库条目').toBe(true)
    expect(takeAnnotationDraft(NOTE_KEY), '保留的条目=未落库正文').toEqual({ comment: TYPED, failed: false })
  })

  it('总评：写成功清掉之后退出握手不判脏（全部最新值已落库）', async () => {
    const { gate, flushing } = await unmountWithWriteInFlight(NOTE_TARGET)
    await reportWrite(gate, flushing, true)
    // 消费面②：退出收口后的最新 dirty 判定——不再被已落库的残留条目误报
    expect(await runQuitFlush()).toBe(false)
  })

  it('等值才清：注册表里是另一个（更新的）未落库值时，旧值的成功回报不清它', async () => {
    const { gate, flushing } = await unmountWithWriteInFlight(NOTE_TARGET)
    // 卸载之后、写在途期间，注册表里换成更新的未落库值（同键后写覆盖——saveAnnotationDraft 既有语义）
    saveAnnotationDraft(NOTE_KEY, TYPED_MORE, false)
    await reportWrite(gate, flushing, true) // 在库的是 TYPED
    expect(hasPendingAnnotationDrafts(), '更新的未落库值不得被旧值的成功回报清掉').toBe(true)
    expect(takeAnnotationDraft(NOTE_KEY)).toEqual({ comment: TYPED_MORE, failed: false })
  })

  it('批注目标同径：写在途时卸载→写成功回报→条目清（批注写任务内的既有清除为幂等重复）', async () => {
    const { gate, flushing } = await unmountWithWriteInFlight(ANNO_TARGET)
    await reportWrite(gate, flushing, true)
    expect(hasPendingAnnotationDrafts(), '写已落库——批注目标的卸载残留条目同径清').toBe(false)
  })
})
