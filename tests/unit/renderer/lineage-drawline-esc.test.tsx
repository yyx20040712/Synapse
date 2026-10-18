// @vitest-environment jsdom
/**
 * [回炉 R19] 画线 dragging 期 Esc 族（U-DL-06 Esc 口径——自 drawline 主件
 * 拆出：主件 500 行红线收纳）。always-active（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageEscapeKey } from '../../../src/renderer/features/lineage/use-lineage-esc'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 与主件同型夹具（最小复制——两卡） */
function node(id: string) {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mockGeometry(): void {
  const content = document.querySelector('.tl-content') as HTMLElement | null
  if (content === null) throw new Error('.tl-content 未渲染')
  Object.defineProperty(content, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
  const rects: Record<string, { x: number; y: number }> = { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } }
  for (const el of Array.from(content.querySelectorAll('.tl-card[data-node-id]'))) {
    const id = (el as HTMLElement).dataset.nodeId ?? ''
    const base = rects[id] ?? { x: 0, y: 0 }
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: base.x, top: base.y, right: base.x + 128, bottom: base.y + 72, width: 128, height: 72, x: base.x, y: base.y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
  }
}

const pointer = (el: Element, type: string, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}
const docPointer = (type: string, x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}
/** [S4②] 真实全局单口探针（useLineageEscapeKey 直挂——与画线会话并存） */
function Probe(): JSX.Element {
  useLineageEscapeKey()
  return <div />
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  useLineageStore.setState({
    nodes: [], edges: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] }, paletteFor: null
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('F-VISFB-66·[回炉 R19] 画线 dragging 期 Esc=取消会话且工具保持（终裁修正）', () => {
  function mount(): void {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
        <>
          <Probe />
          <LineageTimeline nodes={[node('A'), node('B')]} edges={[]} />
        </>
      )
    })
    mockGeometry()
  }

  it('[回炉 R19/U-DL-06] dragging 中 Esc=取消会话且工具保持（全局 escapeStep 不退工具）+迟到 up 不建边', async () => {
    mount()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    expect(q('[data-testid="draw-preview"]')).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    })
    // 取消会话：预览清+迟到 up 不建边
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    docPointer('pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0)
    // 工具保持（会话级一次性 keydown 消费并止泡——全局 escapeStep 不触发）
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
  })

  it('[回炉 S4③] 板开叠加格：paletteFor≠null 时 dragging Esc=预览取消+palette/tool 均不变+迟到 pointerup 不建边（真实单口在场）', async () => {
    mount()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
      useLineageViewStore.setState({ paletteFor: 'solid' }) // 板开在 tool 之后置（toggle 即收板）
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    expect(q('[data-testid="draw-preview"]')).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull() // 会话取消=预览清
    const v = useLineageViewStore.getState()
    // palette/tool 均不变（真实 useLineageEscapeKey 在场——会话消费
    // stopImmediatePropagation 封同目标监听，全局 escapeStep 不达）
    expect(v.paletteFor).toBe('solid')
    expect(v.tool).toBe('draw-solid')
    docPointer('pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0) // 迟到 up 不建边
  })

  it('[回炉 S4②] 真实单口封锁直证：无板 dragging Esc=会话取消+tool 保持+**同节点后续监听零达**（stopImmediate 判别位）', async () => {
    mount()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    // [S4② 判别位] 会话监听之后注册的同节点 keydown 探针：stopPropagation 下
    // 仍会触发（只断传播链）；stopImmediatePropagation 下零达——唯一可分辨面
    let probeFired = false
    const probe = (): void => {
      probeFired = true
    }
    document.addEventListener('keydown', probe, { capture: true })  // 同相（capture）后注册探针——stopImmediate 唯一可分辨面
    try {
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      })
    } finally {
      document.removeEventListener('keydown', probe, { capture: true } as EventListenerOptions)
    }
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // 真实单口被封锁
    expect(probeFired, '同节点后续监听零达（stopImmediatePropagation 直证）').toBe(false)
    docPointer('pointerup', 800, 700)
  })

  it('[回炉 R19] Esc 会话 IME 组词守卫：isComposing 期不取消（原生候选词优先）', async () => {
    mount()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true }))
    })
    expect(q('[data-testid="draw-preview"]')).not.toBeNull() // 会话保持
    docPointer('pointerup', 800, 700)
  })

})
