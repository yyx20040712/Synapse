// @vitest-environment jsdom
/**
 * [T3-P7B] LineageTimeline 编辑交互接线测试（工具条换装 D-P7B-1/composer 挂载/
 * 弹层接线——自 lineage-timeline.test 拆出 2026-09-27：文件 500 行红线）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

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
    month: null,
    slot: null,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(from: string, to: string): LineageEdge {
  return {
    id: `e-${from}-${to}`,
    fromNode: from,
    toNode: to,
    label: '',
    kind: 'tree',
    sub: null,
    createdAt: 't',
    updatedAt: 't'
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

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const btn = (testid: string): HTMLButtonElement => req(`[data-testid="${testid}"]`) as HTMLButtonElement
const cardOf = (id: string): HTMLElement => req(`.tl-card[data-node-id="${id}"]`) as HTMLElement

/** 工具条 props 桩（Board 下传面） */
const toolbarProps = () => ({
  saveStatus: 'saved' as const,
  lastWriteError: null,
  onAddNode: vi.fn(),
  onImportDraft: vi.fn(),
  onRetrySave: vi.fn()
})

/** 线型编辑 actions 桩（Board 下传面——store 三 action+removeEdge） */
const actionProps = () => ({
  applyEdgeLine: vi.fn(),
  linkWithLine: vi.fn(),
  saveLineTypes: vi.fn(),
  removeEdge: vi.fn()
})

function mountEdit(
  nodes: LineageNode[],
  edges: LineageEdge[] = [],
  extra: { onNodeClick?: ReturnType<typeof vi.fn> } = {}
): { actions: ReturnType<typeof actionProps>; toolbar: ReturnType<typeof toolbarProps> } {
  const actions = actionProps()
  const toolbar = toolbarProps()
  mount(
    <LineageTimeline
      nodes={nodes}
      edges={edges}
      toolbar={toolbar}
      actions={actions}
      onNodeClick={extra.onNodeClick}
    />
  )
  return { actions, toolbar }
}

beforeEach(() => {
  toastStoreSpy.mockClear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
})

describe('T3-P7B Timeline 编辑交互接线（工具条换装/composer/弹层挂载）', () => {
  it('工具条换装：.lg-toolbar 挂 .timeline 内；toggle 文案 编辑脉络↔完成编辑+.editing/.link-pick 类；drag-hint 仅 edit 态；既有三控件 testid 保活', () => {
    mountEdit([node('A', { year: 2022, month: 9 })])
    const timeline = req('.timeline')
    const bar = req('.lg-toolbar')
    expect(bar.parentElement?.classList.contains('timeline')).toBe(true)
    const toggle = btn('lineage-edit-toggle')
    expect(toggle.textContent).toBe('编辑脉络')
    expect(timeline.classList.contains('editing')).toBe(false)
    expect(bar.querySelector('.drag-hint')?.textContent).toBe('↕ 拖动＝月内调序（虚线槽＝候选文献位）') // [T3-P8] view 态双文案（mockup L507）
    expect(btn('lineage-link-btn').className).toContain('linkbtn') // DOM 在场（CSS 显隐 D-21）
    expect(q('[data-testid="lineage-add-node"]')).not.toBeNull()
    expect(q('[data-testid="lineage-import"]')).not.toBeNull()
    act(() => {
      toggle.click()
    })
    expect(btn('lineage-edit-toggle').textContent).toBe('完成编辑')
    expect(timeline.classList.contains('editing')).toBe(true)
    expect(bar.querySelector('.drag-hint')?.textContent).toBe('编辑中：点连线改线型 · 点卡片月标改月 · 拖动＝月内调序') // [T3-P8] 全句（mockup L1010）
  })

  it('新建连线全流：link-btn→源卡 .link-src→目标卡→popover=create→「创建连线」→linkWithLine+popover 关；拾取态点卡不转发选中', () => {
    const onClick = vi.fn()
    const { actions } = mountEdit(
      [node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })],
      [],
      { onNodeClick: onClick }
    )
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      btn('lineage-link-btn').click()
    })
    expect(toastStoreSpy).toHaveBeenCalledWith('新建连线：点击源卡片', 'info')
    expect(req('.timeline').classList.contains('link-pick')).toBe(true)
    act(() => {
      cardOf('A').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(cardOf('A').classList.contains('link-src')).toBe(true)
    expect(onClick).not.toHaveBeenCalled() // 拾取态点卡不转发 onNodeClick 选中
    act(() => {
      cardOf('B').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 200 }))
    })
    expect(q('[data-testid="edge-pop"]')).not.toBeNull()
    expect(req('[data-testid="edge-pop"] h4').textContent).toBe('线 型 · 新建连线')
    expect(cardOf('A').classList.contains('link-src')).toBe(false) // 源高亮摘除
    act(() => {
      btn('edge-pop-act-create').click()
    })
    expect(actions.linkWithLine).toHaveBeenCalledWith('A', 'B', 'tree', null)
    expect(q('[data-testid="edge-pop"]')).toBeNull()
  })

  it('点命中层→popover=edit（edit 态双闸 handler 侧）；view 态点击零动作', async () => {
    const nodes = [node('A', { year: 2022, month: 9 }), node('B', { year: 2023, month: 1 })]
    const edges = [edge('A', 'B')]
    const rafs: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafs.push(cb)
      return rafs.length
    })
    mountEdit(nodes, edges)
    // 命中层渲染（EdgeOverlay rAF 冲洗——jsdom 控制流）
    await act(async () => {
      rafs.splice(0).forEach((cb) => cb(0))
    })
    const hit = q('path.tl-edge-hit')
    expect(hit).not.toBeNull()
    // view 态：CSS pointer-events:none+handler 闸——点击零动作
    act(() => {
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }))
    })
    expect(q('[data-testid="edge-pop"]')).toBeNull()
    // edit 态：popover=edit
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }))
    })
    expect(req('[data-testid="edge-pop"] h4').textContent).toBe('线 型')
  })

  it('退出编辑强制归位：拾取中 toggle off→link-src 摘+.editing/.link-pick 全摘', () => {
    mountEdit([node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })])
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      btn('lineage-link-btn').click()
    })
    act(() => {
      cardOf('A').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(cardOf('A').classList.contains('link-src')).toBe(true)
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    const timeline = req('.timeline')
    expect(timeline.classList.contains('editing')).toBe(false)
    expect(timeline.classList.contains('link-pick')).toBe(false)
    expect(cardOf('A').classList.contains('link-src')).toBe(false)
  })

  it('Esc 拾取摘回（document keydown）：.link-pick 摘+.editing 保持', () => {
    mountEdit([node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })])
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      btn('lineage-link-btn').click()
    })
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    const timeline = req('.timeline')
    expect(timeline.classList.contains('link-pick')).toBe(false)
    expect(timeline.classList.contains('editing')).toBe(true)
  })

  it('popover=edit 态 acts 接线：移除连线→removeEdge+popover 关', async () => {
    const nodes = [node('A', { year: 2022, month: 9 }), node('B', { year: 2023, month: 1 })]
    const edges = [edge('A', 'B')]
    const rafs: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafs.push(cb)
      return rafs.length
    })
    const { actions } = mountEdit(nodes, edges)
    await act(async () => {
      rafs.splice(0).forEach((cb) => cb(0))
    })
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      q('path.tl-edge-hit')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 })
      )
    })
    act(() => {
      btn('edge-pop-act-del').click()
    })
    expect(actions.removeEdge).toHaveBeenCalledWith('e-A-B')
    expect(q('[data-testid="edge-pop"]')).toBeNull()
  })

  it('保存态指示 chips 随工具条迁移：saving/error 态 testid 在 .lg-toolbar 内保活', () => {
    const toolbar = toolbarProps()
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 })]}
        edges={[]}
        toolbar={{ ...toolbar, saveStatus: 'error', lastWriteError: '写入失败' }}
        actions={actionProps()}
      />
    )
    const bar = req('.lg-toolbar')
    expect(bar.querySelector('[data-testid="lineage-save-status"]')?.textContent).toContain('保存失败')
    expect(bar.querySelector('[data-testid="lineage-retry-save"]')).not.toBeNull()
  })
})
