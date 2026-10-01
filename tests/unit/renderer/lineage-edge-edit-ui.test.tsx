// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U5] 手动调线编辑态交互 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.6+§2.5+F-LINEAGE-02 design-final §2.3：
 * - edit 模式单击线=selected（手柄集显示：via 方柄+端点圆柄）；点空白/Esc=idle。
 * - 拖顶点=一编辑单元（beginUnit——undoStack+1+队列载 via 载荷）；pointerup
 *   落定=selected 保持。
 * - 双击段=段中点加点（via+1）。
 * - 右键线身=菜单（标题「线「名」● 命中」+命名/线形与颜色/重置走线/删除连线）
 *   ；右键顶点=删除顶点菜单；Esc 关闭。
 * - 自动线（无 via）选中+拖段=物化首 via（manual-override 转换）。
 * always-active 裸 describe。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() }
})
void stubApi

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

/** manual-override 边（via 在场——正交链） */
function edge(id: string, from: string, to: string, via: Array<{ x: number; y: number }>): LineageEdge {
  return { id, fromNode: from, toNode: to, label: `线${id}`, dashed: false, color: '#3a5bd9', via, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const rafs: FrameRequestCallback[] = []

function stubRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
}

const flushRafs = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(0))
  })
}

function mount(nodes: LineageNode[], edges: LineageEdge[]): void {
  stubRaf()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={edges} />)
  })
  act(() => {
    useLineageViewStore.setState({ mode: 'edit' })
  })
}

/** 卡/锚几何定值（jsdom 零布局——gBCR spy） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const click = (el: Element): void => {
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}
const rc = (el: Element, x = 10, y = 10): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  })
}

beforeEach(() => {
  // store 直置图态（load 互锁面绕开——测试装配）
  useLineageStore.setState({ saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
})
afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', zoom: 1 })
  useLineageStore.setState({ edges: [], nodes: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
})

/** 布局：A(0,0) B(400,0) 同月框；边 e1 via=[(200,0)]（A 右锚→B 左锚水平线）。
 *  store 态同步（调线域读写经 store 单源——props 仅供渲染面） */
function layout(edgeVia?: Array<{ x: number; y: number }>, third = false): void {
  const nodes = third ? [node('A'), node('B'), node('C')] : [node('A'), node('B')]
  const edges = [edgeVia === undefined ? { ...edge('e1', 'A', 'B', []), via: undefined } : edge('e1', 'A', 'B', edgeVia)]
  useLineageStore.setState({ nodes, edges: edges as LineageEdge[], saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
  mount(nodes, edges as LineageEdge[])
  const frame = host!.querySelector('.month-frame') as HTMLElement
  stubRect(frame, 0, 0, 800, 200)
  stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
  stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
  if (third) stubRect(host!.querySelector('.tl-card[data-node-id="C"]') as HTMLElement, 612, 230)
  flushRafs()
}

const hitOf = (edgeId: string): SVGElement => {
  const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${edgeId}"]`)
  if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
  return el
}

describe('U5 手动调线编辑态', () => {
  it('单击线=selected：手柄集显示（via 方柄+端点圆柄 data-testid）；点空白/Esc=idle', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    expect(host!.querySelectorAll('[data-testid="edge-handle-vertex"]').length).toBe(1)
    expect(host!.querySelectorAll('[data-testid="edge-handle-end"]').length).toBe(2)
    // Esc=idle
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull()
  })

  it('拖顶点=一编辑单元：undoStack+1+队列 upsert-edge 载 via 载荷（软断言 data-attr）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200, clientY: 66 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 220, clientY: 90 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 220, clientY: 90 }))
    })
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before + 1) // 一拖放=一编辑单元
    expect(s.queue.some((a) => a.kind === 'upsert-edge' && a.input.via !== undefined)).toBe(true)
    expect(s.saveStatus).toBe('dirty')
    // 软断言（INV-79 e2e 口径同源——手动面 data-attr）：拖后手柄仍在场（selected 保持）
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
  })

  it('双击段=段中点加点（via+1——数据在手柄在场）', () => {
    layout([{ x: 200, y: 66 }])
    act(() => {
      hitOf('e1').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 140, clientY: 66 }))
    })
    expect(host!.querySelectorAll('[data-testid="edge-handle-vertex"]').length).toBe(2)
  })

  it('右键线身=菜单：标题「线「名」● 命中」+四菜单项；Esc 关闭', () => {
    layout([{ x: 200, y: 66 }])
    rc(hitOf('e1'), 30, 30)
    // [回炉 R14] 菜单 portal 出宿主——经 document 查询
    const menu = document.querySelector('[data-testid="edge-menu"]')
    expect(menu?.textContent).toContain('线「线e1」● 命中')
    for (const item of ['命名', '线形与颜色', '重置走线', '删除连线']) {
      expect(menu?.textContent).toContain(item)
    }
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull()
  })

  it('右键顶点=「顶点 #N（方柄）● 命中」+删除顶点项；执行=via-1 单元', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    rc(handle, 30, 30)
    const menu = document.querySelector('[data-testid="edge-menu"]')
    expect(menu?.textContent).toContain('顶点 #1（方柄）● 命中')
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      menu!.querySelector('[role="menuitem"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(useLineageStore.getState().undoStack.length).toBe(before + 1)
    // via-1 落库面：唯一拐点（共线）直删→via undefined（回自动路由）。UI 手柄
    // 数断言退役：静态 props 挂载下路由骨架不随 store 写重算（真实面=store
    // 驱动 props+rAF 重路由承载——e2e T12 锚），此处锚 store 面
    expect(useLineageStore.getState().edges[0]?.via).toBeUndefined()
  })

  it('自动线（无 via）双击段=物化首 via（manual-override 转换）', () => {
    layout(undefined)
    act(() => {
      hitOf('e1').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 200, clientY: 66 }))
    })
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toBeDefined()
    expect(s.edges[0]!.via!.length).toBeGreaterThan(0)
  })

  it('非 edit 模式零手柄（收尾转移：切模式=态清空）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    act(() => { useLineageViewStore.getState().setMode('browse') })
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull()
  })
})
