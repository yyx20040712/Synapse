// @vitest-environment jsdom
/** R2-C1 blocked 连线呈现：可见层/命中层均撤销，按边提示一次，布局变化自动重试。
 * [R2-C2] 夹具墙改纵贯全域高墙（100,60,600,320——外圈四车道连接段必穿墙）：
 * 矮墙已被 outer-ring 合法绕行，blocked 呈现面须用真不可布通几何驱动。 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { EdgeOverlay } from '../../../src/renderer/features/lineage/EdgeOverlay'
import { getOcc } from '../../../src/renderer/features/lineage/anchor-occupancy'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { showToast } from '../../../src/renderer/shared/ui/toast-store'

vi.mock('../../../src/renderer/shared/ui/toast-store', () => ({ showToast: vi.fn() }))

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const nodes: LineageNode[] = ['A', 'WALL', 'B'].map((id) => ({
  id,
  paperId: `paper-${id}`,
  title: id,
  year: 2026,
  x: null,
  y: null,
  month: 5,
  slot: null,
  folderId: '__main__',
  createdAt: 't',
  updatedAt: 't'
}))
const edges: LineageEdge[] = ['e1', 'e2'].map((id) => ({
  id,
  fromNode: 'A',
  toNode: 'B',
  label: '',
  dashed: false,
  color: '#1e3a8a',
  createdAt: 't',
  updatedAt: 't'
}))
const shiftedIds = new Set<string>()
const groups: never[] = []
let host: HTMLDivElement | null = null
let root: Root | null = null
let rafs: FrameRequestCallback[] = []

function setRect(id: string, x: number, y: number, w: number, h: number): void {
  const card = host?.querySelector(`.tl-card[data-node-id="${id}"]`)
  if (card === null || card === undefined) throw new Error(`缺少卡片 ${id}`)
  Object.defineProperty(card, 'getBoundingClientRect', {
    value: () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }),
    configurable: true
  })
}

function renderAt(routeEpoch: number, editEnabled = false): void {
  act(() => {
    root?.render(<EdgeOverlay nodes={nodes} edges={edges} shiftedIds={shiftedIds} groups={groups} routeEpoch={routeEpoch} editEnabled={editEnabled} />)
  })
}

function flush(): void {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(0))
  })
}

function pathCount(selector: string): number {
  return host?.querySelectorAll(selector).length ?? -1
}

function mount(editEnabled = false): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  host = document.createElement('div')
  host.className = 'tl-content'
  Object.defineProperty(host, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}) })
  })
  document.body.appendChild(host)
  root = createRoot(host)
  renderAt(0, editEnabled)
  for (const n of nodes) {
    const card = document.createElement('div')
    card.className = 'tl-card'
    card.dataset.nodeId = n.id
    host.appendChild(card)
  }
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  host = null
  rafs = []
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  useLineageStore.setState({ nodes: [], edges: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
})

describe('R2-C1 EdgeOverlay blocked 安全网', () => {
  it('两条不可布通边各自提示一次且不留 path；重算不重复提示，净空恢复后自动重画', () => {
    mount()
    setRect('A', 112, 100, 128, 72)
    setRect('WALL', 100, 60, 600, 320)
    setRect('B', 112, 388, 128, 72)
    flush()

    expect(pathCount('path.tl-edge')).toBe(0)
    expect(pathCount('path.tl-edge-hit')).toBe(0)
    const blockedMeta = [...(host?.querySelectorAll('g.tl-edge-blocked[data-anchors]') ?? [])]
    expect(blockedMeta).toHaveLength(2)
    expect(blockedMeta.every((el) => (el.getAttribute('data-anchors') ?? '') !== '')).toBe(true)
    expect(getOcc('A')).toBeDefined()
    expect(getOcc('B')).toBeDefined()
    expect(showToast).toHaveBeenCalledTimes(2)
    expect(showToast).toHaveBeenCalledWith('该连线暂无可行走线', 'error')

    renderAt(1)
    flush()
    expect(showToast).toHaveBeenCalledTimes(2)

    setRect('WALL', 700, 244, 20, 72)
    renderAt(2)
    flush()
    expect(pathCount('path.tl-edge')).toBe(2)
    expect(pathCount('path.tl-edge-hit')).toBe(2)
    expect(pathCount('g.tl-edge-blocked')).toBe(0)

    setRect('WALL', 100, 60, 600, 320)
    renderAt(3)
    flush()
    expect(pathCount('path.tl-edge')).toBe(0)
    expect(pathCount('path.tl-edge-hit')).toBe(0)
    expect(showToast).toHaveBeenCalledTimes(4)
  })

  it('已选自动边与菜单转 blocked：手柄/警示/虚影撤销但边数据保留，恢复净空后手柄回归', () => {
    useLineageStore.setState({ nodes, edges, queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
    mount(true)
    setRect('A', 112, 100, 128, 72)
    setRect('WALL', 700, 244, 20, 72)
    setRect('B', 112, 388, 128, 72)
    flush()
    const hit = host?.querySelector('.tl-edge-hit[data-edge-id="e1"]')
    expect(hit).not.toBeNull()
    act(() => {
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      hit?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 30, clientY: 30 }))
    })
    expect(host?.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="edge-menu"]')).not.toBeNull()

    setRect('WALL', 100, 60, 600, 320)
    renderAt(1, true)
    flush()
    expect(host?.querySelector('[data-testid="edge-handles"]')).toBeNull()
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull()
    expect(host?.querySelector('.edge-warn')).toBeNull()
    expect(host?.querySelector('.edge-ghost')).toBeNull()
    expect(useLineageStore.getState().edges.find((e) => e.id === 'e1')).toEqual(edges[0])

    setRect('WALL', 700, 244, 20, 72)
    renderAt(2, true)
    flush()
    expect(host?.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    expect(host?.querySelectorAll('[data-testid="edge-handle-end"]')).toHaveLength(2)
    expect(useLineageStore.getState().edges.find((e) => e.id === 'e1')).toEqual(edges[0])
  })
})
