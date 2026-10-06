// @vitest-environment jsdom
/**
 * [F-UIRES-03 B5①②] 详情面板头部操作行+侧栏手柄键盘接线（v1.15 第五轮②③
 * 用户裁决；always-active 裸 describe——K3）。[RR1] 拆件先例=自 lineage-
 * side-panel.test.tsx 分出（主件 500 行红线——B1 tag-dropdown 同型）。
 *
 * 覆盖（B5① 操作行渲染族）：两钮在场常驻（meta 区驻头部不随内容滚动消失+
 * 笔记三节驻滚动内层）/主题节点「去阅读器」零渲染+「去文献库」在场
 * （paperId=null 透传——沿 C3 态）/空选中态零钮/载荷透传（签名沿卡面版）；
 * （B5② Page 接线）：手柄 tabIndex=0+ArrowRight 后 aria-valuenow 252→268
 * 随动（APG separator——步进/钳制/收起态全域=use-sidebar-pane.test.tsx 承载）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  reader: { listAnnotations: vi.fn() },
  lineage: { graph: vi.fn() },
  folders: { list: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

const { requestAnchoredStub } = vi.hoisted(() => ({ requestAnchoredStub: vi.fn() }))
// Page 模块图消费面 mock（lineage-side-panel.test 同型——reader 域 jsdom 面）
vi.mock('../../../src/renderer/features/reader/state/reader.store', () => ({
  useReaderStore: { getState: () => ({ openPaper: vi.fn() }) }
}))
vi.mock('../../../src/renderer/features/reader/anchors/anchor-locate', () => ({
  locateAnchor: vi.fn()
}))
vi.mock('../../../src/renderer/shared/open-paper-bus', () => ({
  OPEN_PAPER_EVENT: 'synapse:open-paper',
  requestOpenPaper: vi.fn(),
  requestOpenPaperAnchored: requestAnchoredStub,
  takePendingOpenPaper: vi.fn(() => null)
}))

import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const JUMP = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [] })
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [] })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: []
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

// ── B5① 操作行渲染族（组件级） ────────────────────────────────────────

it('B5① 操作行：徽章行下两钮并排常驻（meta 区驻头部不随内容滚动消失）+文字真文本+载荷透传（签名沿卡面版）', async () => {
  const onGotoLibrary = vi.fn()
  const onGotoReader = vi.fn()
  mount(
    <LineageSidePanel
      node={node('A', { folderId: 'e2e-folder' })}
      onJumpToPaper={JUMP}
      onGotoLibrary={onGotoLibrary}
      onGotoReader={onGotoReader}
    />
  )
  await flush()
  // 两钮驻 meta 区（头部区——滚动内层 .insp-scroll 外=不随内容滚动消失）
  const meta = q('section[data-testid="lineage-side-meta"]')
  const badges = meta?.querySelector('.badges') ?? null
  const jumps = q('.side-jumps')
  expect(jumps).not.toBeNull()
  expect(q('.insp-scroll .side-jumps')).toBeNull()
  // DOM 序：badges 行 → side-jumps 操作行（徽章行下方一行）
  expect(
    badges !== null && jumps !== null && (badges.compareDocumentPosition(jumps) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  ).toBe(true)
  // 笔记三节驻滚动内层（头部/内容滚动分区结构锁）
  expect(q('.insp-scroll [data-testid="lineage-side-manual-note"]')).not.toBeNull()
  // 两钮真文本（文字钮形）
  const libBtn = q('[data-testid="card-goto-library"]') as HTMLElement
  const readBtn = q('[data-testid="card-goto-reader"]') as HTMLElement
  expect(libBtn.textContent).toBe('去文献库')
  expect(readBtn.textContent).toBe('去阅读器')
  // 载荷透传（沿卡面版签名：paperId+folderId / paperId）
  act(() => {
    libBtn.click()
  })
  expect(onGotoLibrary).toHaveBeenCalledWith('paper-A', 'e2e-folder')
  act(() => {
    readBtn.click()
  })
  expect(onGotoReader).toHaveBeenCalledWith('paper-A')
})

it('B5① 主题节点：「去阅读器」零渲染+「去文献库」在场（paperId=null 透传——沿 C3 态通道支持/编排层不置选中）', async () => {
  const onGotoLibrary = vi.fn()
  const onGotoReader = vi.fn()
  mount(
    <LineageSidePanel
      node={node('T', { paperId: null, folderId: 'e2e-folder' })}
      onJumpToPaper={JUMP}
      onGotoLibrary={onGotoLibrary}
      onGotoReader={onGotoReader}
    />
  )
  await flush()
  expect(q('[data-testid="card-goto-reader"]')).toBeNull() // 无阅读器面（沿卡面先例：零渲染优于禁用态）
  const libBtn = q('[data-testid="card-goto-library"]') as HTMLElement
  expect(libBtn).not.toBeNull()
  act(() => {
    libBtn.click()
  })
  expect(onGotoLibrary).toHaveBeenCalledWith(null, 'e2e-folder')
  expect(onGotoReader).not.toHaveBeenCalled()
})

it('B5① 空选中态：操作行零渲染（node=null 早退面——按钮属选中详情操作语义）', async () => {
  mount(<LineageSidePanel node={null} onJumpToPaper={JUMP} onGotoLibrary={vi.fn()} onGotoReader={vi.fn()} />)
  await flush()
  expect(q('.side-jumps')).toBeNull()
  expect(q('[data-testid="card-goto-library"]')).toBeNull()
  expect(q('[data-testid="card-goto-reader"]')).toBeNull()
})

// ── B5② Page 手柄键盘接线（编排级） ──────────────────────────────────

it('B5② Page 手柄键盘接线：ArrowRight → aria-valuenow 252→268 随动（APG separator——tabIndex 可达）', async () => {
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [node('A'), node('T', { paperId: null })], edges: [] }
  })
  mount(<LineagePage />)
  await flush()
  // 选中卡（产品路径 P-13）——侧栏在场（收起钮已渲染=选中面就绪）
  const cardA = q('[data-node-id="A"]')
  if (cardA === null) throw new Error('节点 A 未渲染')
  act(() => {
    cardA.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
  const rz = q('[data-testid="lineage-sidebar-resizer"]') as HTMLElement
  expect(rz.getAttribute('aria-valuenow')).toBe('252')
  expect(rz.getAttribute('tabIndex')).toBe('0') // 键盘焦点可达（APG separator）
  act(() => {
    rz.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
  })
  expect(rz.getAttribute('aria-valuenow')).toBe('268')
  // 步进随持久化单点写（B5② 键面与拖拽同通道）
  expect(window.localStorage.getItem('synapse:sidebar:width')).toBe('268')
})
