// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U5 回炉轮 1/2] 手动调线菜单面（R19/R14+RR1/RR9）——
 * lineage-edge-edit-ui 行数红线（≤500）拆件：视口钳制/来源标记/自动线重置
 * no-op/portal+确定钮 INV-85④（RR9）。
 * [F-ALIGN-01 2026-10-04] 画布空白菜单（RR1 两路可达两用例）随「添加节点…」
 * 唯一菜单项退役删除——空白 pointerdown 清选中正锚改写保留。
 * always-active 裸 describe（K3）。装配面与 ui 件同构。
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
  return { id, fromNode: from, toNode: to, label: `线${id}`, dashed: false, color: '#1e3a8a', via, createdAt: 't', updatedAt: 't' }
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

/** 布局：A(12,30) B(412,30) 同月框；边 e1（A→B）——store 态同步直置 */
function layout(edgeVia?: Array<{ x: number; y: number }>): void {
  const nodes = [node('A'), node('B')]
  const edges = [edgeVia === undefined ? { ...edge('e1', 'A', 'B', []), via: undefined } : edge('e1', 'A', 'B', edgeVia)]
  useLineageStore.setState({ nodes, edges: edges as LineageEdge[], saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
  mount(nodes, edges as LineageEdge[])
  const frame = host!.querySelector('.month-frame') as HTMLElement
  stubRect(frame, 0, 0, 800, 200)
  stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
  stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
  flushRafs()
}

const hitOf = (edgeId: string): SVGElement => {
  const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${edgeId}"]`)
  if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
  return el
}

describe('U5 菜单面收尾（回炉 R19/R14——视口钳制/来源标记/自动线重置 no-op/portal）', () => {
  const menuEl = (): HTMLElement => document.querySelector('[data-testid="edge-menu"]') as HTMLElement | null ?? (() => { throw new Error('菜单未渲染') })()
  const docKey = (key: string): void => {
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) })
  }

  it('R19 closeMenu 来源标记：右键线身瞬选随 Esc 撤；左键选中+顶点菜单 Esc 保 selected', () => {
    layout([{ x: 200, y: 66 }])
    // ①右键线身=瞬选来源：Esc 关闭即撤高亮
    rc(hitOf('e1'), 30, 30)
    expect(menuEl()).not.toBeNull()
    docKey('Escape')
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull()
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // 瞬选撤
    // ②左键选中+右键顶点菜单：Esc 关菜单保 selected（手柄在场）
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    rc(handle, 30, 30)
    expect(menuEl()).not.toBeNull()
    docKey('Escape')
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull()
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull() // 选中保持
  })

  it('R19 自动线重置走线=no-op 不入栈（via 已空——零写零单元）', () => {
    layout(undefined)
    const before = useLineageStore.getState().undoStack.length
    rc(hitOf('e1'), 30, 30)
    const items = [...menuEl().querySelectorAll('[role="menuitem"]')]
    const reset = items.find((b) => b.textContent === '重置走线')!
    act(() => { reset.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(useLineageStore.getState().undoStack.length).toBe(before) // no-op 不入栈
    expect(useLineageStore.getState().queue).toHaveLength(0)
    // manual 线重置=正常单元（对照——走 setEdgeVia undefined）；
    // 先卸首树再重挂（同测双布局禁漏树——document 监听器跨测污染）
    act(() => { root?.unmount() })
    host?.remove()
    root = null
    host = null
    layout([{ x: 200, y: 66 }])
    rc(hitOf('e1'), 30, 30)
    const items2 = [...menuEl().querySelectorAll('[role="menuitem"]')]
    const reset2 = items2.find((b) => b.textContent === '重置走线')!
    act(() => { reset2.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(useLineageStore.getState().undoStack.length).toBe(1)
  })

  it('R19 magnet 类仅被拖柄：吸附态非拖柄顶点不挂 .magnet', () => {
    // 双 via：竖直通道 x=276（A/B 行间列缝）；拖 v0 至近通道 → 仅 v0 实心。
    // 拖后 via[0] 移位=React 换 key 重挂——断言前重查（禁陈旧引用）
    layout([{ x: 200, y: 66 }, { x: 300, y: 66 }])
    click(hitOf('e1'))
    const v0 = host!.querySelector('[data-testid="edge-handle-vertex"][data-vertex="0"]') as SVGElement
    act(() => { v0.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200, clientY: 66 })) })
    act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 280, clientY: 66 })) })
    const m0 = host!.querySelector('[data-testid="edge-handle-vertex"][data-vertex="0"]') as SVGElement
    const m1 = host!.querySelector('[data-testid="edge-handle-vertex"][data-vertex="1"]') as SVGElement
    expect(m0.classList.contains('magnet')).toBe(true) // 被拖柄=实心
    expect(m1.classList.contains('magnet')).toBe(false) // 非拖柄不挂（原全挂缺陷）
    act(() => { document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 280, clientY: 66 })) })
  })

  it('R19 EdgeMenu 视口钳制：越界锚点落窗内（clampPopoverPos 先例）', () => {
    layout([{ x: 200, y: 66 }])
    rc(hitOf('e1'), 5000, 5000)
    const el = menuEl()
    const left = Number.parseFloat(el.style.left)
    const top = Number.parseFloat(el.style.top)
    expect(Number.isFinite(left)).toBe(true)
    expect(left).toBeGreaterThan(0)
    expect(left).toBeLessThanOrEqual(window.innerWidth - 180) // 176 宽+边距
    expect(top).toBeGreaterThan(0)
    expect(top).toBeLessThanOrEqual(window.innerHeight - 10)
    docKey('Escape')
  })

  it('R14 EdgeMenu portal 出 transform 层：菜单挂 document.body（缩放态 fixed 错位根治）+缩放态可达', () => {
    layout([{ x: 200, y: 66 }])
    act(() => { useLineageViewStore.setState({ zoom: 2 }) }) // 缩放态（transform 祖先劫持 fixed 包含块）
    rc(hitOf('e1'), 100, 100)
    const el = menuEl()
    expect(el.parentElement).toBe(document.body) // portal 出 .tl-content（transform 层）
    expect(host!.querySelector('[data-testid="edge-menu"]')).toBeNull() // 不在 transform 祖先内
    docKey('Escape')
    act(() => { useLineageViewStore.setState({ zoom: 1 }) })
  })

  it('R12 EdgeMenu 命名输入 IME 守卫：组词期 Enter（isComposing）→no-op 零写（INV-85 全域必备）', () => {
    layout([{ x: 200, y: 66 }])
    rc(hitOf('e1'), 30, 30)
    const renameItem = [...menuEl().querySelectorAll('[role="menuitem"]')].find((b) => b.textContent === '命名')!
    act(() => { renameItem.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const input = document.querySelector('[data-testid="edge-rename-input"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '组词新名')
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      input!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }))
    })
    expect(document.querySelector('[data-testid="edge-rename-input"]')).not.toBeNull() // 编辑态保持
    expect(useLineageStore.getState().undoStack.length).toBe(before) // 零写零单元
    expect(useLineageStore.getState().edges[0]?.label).toBe('线e1') // 原名不动
    docKey('Escape')
  })

  it('[RR9] 确定钮 onMouseDown preventDefault（INV-85④——防点击夺焦触发组词 blur 补提交双径）；组词期点确定=no-op 零写', () => {
    layout([{ x: 200, y: 66 }])
    rc(hitOf('e1'), 30, 30)
    const renameItem = [...menuEl().querySelectorAll('[role="menuitem"]')].find((b) => b.textContent === '命名')!
    act(() => { renameItem.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const input = document.querySelector('[data-testid="edge-rename-input"]') as HTMLInputElement
    const confirmBtn = [...menuEl().querySelectorAll('button')].find((b) => b.textContent === '确定')!
    // ④ 结构锚：mousedown 可取消且被取消（jsdom 不模拟 mousedown 夺焦——
    // 浏览器行为经 preventDefault 承载）
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      confirmBtn.dispatchEvent(ev)
    })
    expect(ev.defaultPrevented).toBe(true)
    // 组词期点确定=no-op（②守卫沿承——composingRef 拒提交）
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '组词中')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(useLineageStore.getState().undoStack.length).toBe(before) // 零写
    expect(useLineageStore.getState().edges[0]?.label).toBe('线e1')
    docKey('Escape')
  })

  // [F-ALIGN-01] 画布空白菜单两用例（RR1 两路可达）随「添加节点…」唯一菜单项
  // 退役删除——组空=菜单项区一并处置（禁留空壳组）；空白 pointerdown 清选中
  // 语义经 document 级监听保持（use-edge-edit onDown），正锚保留：
  it('[RR1 改写] 空白 pointerdown 清选中（画布菜单退役后防御正锚——handles 撤销）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull() // 已选中在场
    // [F-ALIGN-01] 画布空白菜单零残留负锚（在场即红）
    expect(host!.querySelector('[data-testid="edge-canvas-ctx"]')).toBeNull()
    // 空白 pointerdown（document 级监听——svg 外即空白）清选中语义保持
    act(() => {
      host!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2, clientX: 60, clientY: 120 }))
    })
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // 空白 pointerdown 清选中语义保持
  })
})
