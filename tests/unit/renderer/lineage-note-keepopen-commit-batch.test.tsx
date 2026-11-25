// @vitest-environment jsdom
/**
 * [B5 设计稿 §8 F-KEEPOPN-01、§2.6 keepOpen×saving×composing 全表、§8.3 验证；§15.1 步骤 2 状态红测先行]
 * 自身 idle 提交随之而来的 saving 窗内，已开编辑会话的 textarea 必须是同一 DOM 节点、不失焦
 * （INV-190 目标文：两者须在同一 React 同步提交批落地）。
 *
 * 本件与既有 lineage-note-idle-commit.test.tsx 的区别＝渲染序列不经 act 合批、且还原真机调度：
 * - act 把 store 写与 setKeepOpen(true) 合进同一次提交，现实现即绿——证明不了真机不失焦（INV-190 已知限制）。
 * - 本件全部驱动在 act 之外（IS_REACT_ACT_ENVIRONMENT=false）：idle 到期回调里 store 写走同步车道
 *   （微任务提交），setKeepOpen(true) 走默认车道（调度器任务提交）——现实现会先提交
 *   「saving=true 且 keepOpen=false」的一帧：textarea 被卸载后重挂（MutationObserver 记到移除、
 *   节点身份变、焦点丢）＝红；实现波改 flushSync 同批后转绿。
 * - 还真机调度的两个必要条件（缺一则 jsdom 里缺陷不重现＝假绿，仓外对照实验
 *   20261125-b5/wave-a/probe/scratch-lanes-contexts.log、scratch-keepopen-window-event.log）：
 *   ① idle 到期用**真实计时器**驱动（实等 IDLE_FLUSH_MS）——假计时器的异步推进把两次渲染挤在同一拍，
 *      中间帧不落到 DOM；
 *   ② idle 前清掉 jsdom 残留的 window.event（见 clearJSDomEventResidue）。
 *
 * 真机断言说明（本波不实现；第三波落 tests/e2e/lineage-notes.spec.ts，§8.3/B5-E13）：
 * 1. 输入唯一正文前给 textarea 加测试属性并安装 MutationObserver，记录 saving 指示出现、
 *    textarea 是否被移除、焦点事件；
 * 2. 等待真实落库后断言：观察到了 saving、textarea 移除次数=0、同一节点仍聚焦、真实正文正确；
 * 3. 不用固定 sleep 猜测 saving；当前机器观察不到 saving 窗即记「未闭环」，
 *    不得仅凭 jsdom 绿删除 INV-190 的限制（设计稿 §8.3）。
 *
 * always-active 裸 describe（K3）。
 */
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import type { FloatingNote, LineageNode } from '../../../src/shared/models/lineage'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { noteDraftPending } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

/** 本件刻意不经 act 合批（见头注）——关闭 act 环境标记，React 走常规并发调度 */
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = false

const MAIN = '__main__'
const NOTE = 'fn-e'

/** window.event 的原始属性描述（清残留前保存——用例后还原，不改坏 jsdom 环境） */
const WINDOW_EVENT_DESC = Object.getOwnPropertyDescriptor(window, 'event')

/**
 * 清掉 jsdom 残留的 window.event（还原真机调度）。
 * 实测（vitest jsdom 环境）：本件经 dispatchEvent 派发 pointerdown 之后，window.event 仍指向
 * 该事件、派发结束后不复位；React 在非事件上下文取更新优先级的兜底正是 window.event
 * （getCurrentEventPriority），残留会让 idle 计时器回调里的 setKeepOpen(true) 被当作离散优先级
 * （同步车道）、与 store 写合进同一次同步提交——缺陷被掩盖。真机浏览器在计时器回调里
 * window.event=undefined，setKeepOpen(true) 走默认车道。
 */
function clearJSDomEventResidue(): void {
  Object.defineProperty(window, 'event', { value: undefined, configurable: true, writable: true })
  expect(window.event, '前提：window.event 残留已清（真机计时器回调语境）').toBeUndefined()
}
function restoreWindowEvent(): void {
  if (WINDOW_EVENT_DESC !== undefined) Object.defineProperty(window, 'event', WINDOW_EVENT_DESC)
  else delete (window as unknown as { event?: unknown }).event
}

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return { id: NOTE, folderId: MAIN, x: 100, y: 100, content: '旧稿', createdAt: 't0', updatedAt: 't0', ...over }
}
function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const saved = (req: { id?: string; folderId?: string; x?: number; y?: number; content: string }): FloatingNote =>
  ({ id: req.id ?? NOTE, folderId: req.folderId ?? MAIN, x: req.x ?? 0, y: req.y ?? 0, content: req.content, createdAt: 't', updatedAt: 'server' })

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

const noteEl = (): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${NOTE}"]`)
const taOf = (): HTMLTextAreaElement | null => noteEl()?.querySelector('textarea') ?? null
/** 等到条件成立（真实计时轮询——vi.waitFor 用未接管的计时器；不成立到超时即抛） */
const waitUntil = async (cond: () => boolean, message: string, timeout = 2_000): Promise<void> => {
  await vi.waitFor(
    () => {
      if (!cond()) throw new Error(message)
    },
    { timeout, interval: 20 }
  )
}

/** 挂载并等到笔记层提交到 DOM（真实调度器——不经 act） */
async function mountNotes(notes: FloatingNote[]): Promise<void> {
  useLineageStore.setState({ floatingNotes: notes })
  host = document.createElement('div')
  document.body.appendChild(host)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host.appendChild(contentEl)
  contentEl.getBoundingClientRect = () => ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  // 根挂在 .tl-content 上——与生产层级一致（LineageTimeline 把笔记层渲染在 .tl-content 内）；
  // 挂在兄弟节点上会让下方针对 .tl-content 的移除观察落空（假绿）
  root = createRoot(contentEl)
  root.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  await waitUntil(() => contentEl!.querySelector('.tl-notes-layer') !== null, '笔记层尚未提交到 .tl-content 内')
}
/** 打开编辑会话并等到 textarea 挂载、聚焦（创建即编辑态） */
async function openEditor(): Promise<HTMLTextAreaElement> {
  noteEl()!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 150, clientY: 150 }))
  await waitUntil(() => taOf() !== null, '编辑器尚未挂载')
  return taOf()!
}
/** 输入（原生 value setter＋input 事件——React onChange 消费面） */
function type(ta: HTMLTextAreaElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(ta, value)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
/** 记录笔记层子树里 textarea 的移除次数（真机探针的 jsdom 对应物——MutationObserver） */
function observeTextareaRemoval(): { removed: () => number; stop: () => void } {
  let removed = 0
  const hasTextarea = (n: Node): boolean =>
    n instanceof HTMLTextAreaElement || (n instanceof Element && n.querySelector('textarea') !== null)
  const observer = new MutationObserver((records) => {
    for (const r of records) for (const n of r.removedNodes) if (hasTextarea(n)) removed += 1
  })
  observer.observe(contentEl!, { childList: true, subtree: true })
  return { removed: () => removed, stop: () => observer.disconnect() }
}
/** 挂起笔记写 IPC，返回放行句柄 */
const holdNoteIpc = (): (() => void) => {
  let release: (() => void) | null = null
  stubApi.lineage.upsertFloatingNote.mockImplementation((req: { id?: string; content: string }) => new Promise((r) => { release = () => r({ ok: true as const, data: saved(req) }) }))
  return () => void release?.()
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string; content: string }) => ({ ok: true, data: saved(req) }))
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', focusSet: [], paletteFor: null })
})

afterEach(() => {
  root?.unmount()
  root = null
  host?.remove()
  host = null
  contentEl = null
  restoreWindowEvent()
  resetLineageSessionsForTests() // 会话清出=lane dispose——取消可能仍挂着的真实 idle 计时器，不跨例
})

describe('自身 idle 提交随之而来的 saving 窗：textarea 同一 DOM 节点、不失焦（非 act＋真机调度序列）', () => {
  it('到期提交→saving 窗：textarea 移除次数=0、同一节点仍在场且保持聚焦；落定后编辑器仍开着、正文已落库', async () => {
    await mountNotes([makeNote()])
    const ta = await openEditor()
    expect(document.activeElement, '前提：焦点在编辑器').toBe(ta)
    type(ta, '停顿前的正文')
    await waitUntil(() => noteDraftPending(), '草稿信号尚未置位')
    clearJSDomEventResidue() // 离开事件序列、进入计时器回调语境之前——见头注「还真机调度」②
    const removal = observeTextareaRemoval()
    const release = holdNoteIpc() // saving 窗由挂起的笔记写 IPC 确证
    try {
      // idle 到期由真实计时器驱动（IDLE_FLUSH_MS）：提交草稿→随之启动 flush——全程在 act 之外
      await waitUntil(
        () => stubApi.lineage.upsertFloatingNote.mock.calls.length > 0,
        'idle 到期提交尚未派发笔记写——未进入 saving 窗',
        IDLE_FLUSH_MS + 3_000
      )
      expect(useLineageStore.getState().saveStatus, '前提：确在自身 idle 提交的 saving 窗').toBe('saving')
      expect(removal.removed(), 'saving 窗内 textarea 未被移除（同一 React 提交批落地）').toBe(0)
      expect(taOf(), '同一 DOM 节点（未重挂）').toBe(ta)
      expect(document.activeElement, '不夺焦点').toBe(ta)
      release()
      await waitUntil(() => useLineageStore.getState().saveStatus === 'clean', '写尚未落定')
      expect(removal.removed(), '落定过程同样未移除').toBe(0)
      expect(taOf(), '落定后仍是同一节点').toBe(ta)
      expect(document.activeElement).toBe(ta)
      expect(useLineageStore.getState().floatingNotes.find((n) => n.id === NOTE)!.content, '真实正文已落库回显').toBe('停顿前的正文')
    } finally {
      release() // 断言先红时同样放行——不留悬挂写链
      removal.stop()
    }
  }, 10_000)
})

describe('对照：window.event 残留离散事件会掩盖缺陷（不还原真机调度=现实现也绿）', () => {
  it('window.event 残留离散事件：现实现下 textarea 不被移除——证明主例的红依赖「还原真机调度」而非夹具误伤', async () => {
    await mountNotes([makeNote()])
    const ta = await openEditor()
    type(ta, '停顿前的正文')
    await waitUntil(() => noteDraftPending(), '草稿信号尚未置位')
    // 实测：本件派发 pointerdown 之后即处于该状态；显式置位使对照不依赖 jsdom 版本行为
    Object.defineProperty(window, 'event', { value: new MouseEvent('pointerdown'), configurable: true, writable: true })
    expect(window.event?.type, '前提：残留的离散事件在场').toBe('pointerdown')
    const removal = observeTextareaRemoval()
    const release = holdNoteIpc()
    try {
      await waitUntil(
        () => stubApi.lineage.upsertFloatingNote.mock.calls.length > 0,
        'idle 到期提交尚未派发笔记写',
        IDLE_FLUSH_MS + 3_000
      )
      expect(useLineageStore.getState().saveStatus, '前提：同在自身 idle 提交的 saving 窗').toBe('saving')
      expect(taOf(), '残留让 setKeepOpen 与 store 写同批提交——缺陷不显现').toBe(ta)
      release()
      await waitUntil(() => useLineageStore.getState().saveStatus === 'clean', '写尚未落定')
      expect(removal.removed()).toBe(0)
      expect(taOf()).toBe(ta)
    } finally {
      release()
      removal.stop()
      await waitUntil(() => useLineageStore.getState().saveStatus === 'clean', '写链尚未落定')
    }
  }, 10_000)
})

describe('R3 窄口径不变：其他写触发的 saving 窗仍让位（同序列对照）', () => {
  it('另一写的 flush 在途：已开编辑会话的 textarea 照旧卸载；落定后回挂、草稿保留', async () => {
    await mountNotes([makeNote()])
    const ta = await openEditor()
    type(ta, '跨保存草稿')
    const gate: { release: () => void } = { release: () => undefined }
    stubApi.lineage.patchNode.mockImplementation(() => new Promise((r) => { gate.release = () => r({ ok: true as const, data: { ...node('A'), x: 10, y: 10, updatedAt: 'server' } }) }))
    useLineageStore.getState().moveNode('A', 10, 10) // 另一写（非自身 idle 提交）
    void useLineageStore.getState().save()
    try {
      await waitUntil(() => useLineageStore.getState().flushing === true, '另一写的 flush 尚未在途')
      await waitUntil(() => taOf() === null, 'textarea 尚未让位')
      expect(ta.isConnected, 'R3：非自身提交的 saving 窗卸载 textarea').toBe(false)
      expect(noteDraftPending(), '草稿保真').toBe(true)
      gate.release()
      await waitUntil(() => taOf() !== null, 'saving 结束尚未回挂')
      expect(taOf()!.value, '回挂后续写不丢').toBe('跨保存草稿')
    } finally {
      gate.release() // 断言先红时同样放行
      await waitUntil(() => !useLineageStore.getState().flushing, '写链尚未落定')
    }
  })
})
