// @vitest-environment jsdom
/**
 * [T3-P7B] LineageTimeline 编辑交互接线测试（工具条换装 D-P7B-1/composer 挂载/
 * 弹层接线——自 lineage-timeline.test 拆出 2026-09-27：文件 500 行红线）。
 * [F-LGRAPH-01①U3] 受控化改写：「编辑脉络」toggle 退役（退役清单行 2——三
 * 模式栏替代，写路径=lineage-view.store.setMode；本件直驱 store 等价事件序
 * ——ModeBar 组件面=lineage-mode-bar.test 独立锁）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore, type LineageViewMode } from '../../../src/renderer/features/lineage/lineage-view.store'

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
    folderId: '__main__',
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

/** 模式切换（三模式栏写路径等价——ModeBar onClick→setMode） */
const setMode = (m: LineageViewMode): void => {
  act(() => {
    useLineageViewStore.getState().setMode(m)
  })
}

/** 工具条 props 桩（Board 下传面；[F-BAKRET-01] 导入回调随导入链退役删） */
const toolbarProps = () => ({
  saveStatus: 'saved' as const,
  lastWriteError: null,
  onAddNode: vi.fn(),
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
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
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

describe('T3-P7B Timeline 编辑交互接线（工具条换装/composer/弹层挂载——U3 受控化）', () => {
  it('工具条换装：.lg-toolbar 挂 .timeline 内；setMode(edit)→.editing 类+drag-hint 全句；既有三控件 testid 保活；编辑 toggle 负锚（退役行 2）', () => {
    mountEdit([node('A', { year: 2022, month: 9 })])
    const timeline = req('.timeline')
    const bar = req('.lg-toolbar')
    expect(bar.parentElement?.classList.contains('timeline')).toBe(true)
    expect(timeline.classList.contains('editing')).toBe(false)
    expect(bar.querySelector('.drag-hint')?.textContent).toBe('✋ 拖动空白＝平移画布 · 滚轮浏览时间线') // [F-LGRAPH-01①U5] browse 态文案（三模式）
    expect(btn('lineage-link-btn').className).toContain('linkbtn') // DOM 在场（CSS 显隐 D-21）
    expect(q('[data-testid="lineage-add-node"]')).not.toBeNull()
    // [F-BAKRET-01] 导入按钮随导入链退役——零残留负锚（在场即红）
    expect(q('[data-testid="lineage-import"]')).toBeNull()
    // [F-LGRAPH-01①U3] 「编辑脉络/完成编辑」toggle 退役——负锚（在场即红）
    expect(q('[data-testid="lineage-edit-toggle"]')).toBeNull()
    setMode('edit')
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
    setMode('edit')
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
    setMode('edit')
    act(() => {
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }))
    })
    expect(req('[data-testid="edge-pop"] h4').textContent).toBe('线 型')
  })

  it('退出编辑强制归位：拾取中切 browse→link-src 摘+.editing/.link-pick 全摘（受控下降沿）', () => {
    mountEdit([node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })])
    setMode('edit')
    act(() => {
      btn('lineage-link-btn').click()
    })
    act(() => {
      cardOf('A').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(cardOf('A').classList.contains('link-src')).toBe(true)
    setMode('browse')
    const timeline = req('.timeline')
    expect(timeline.classList.contains('editing')).toBe(false)
    expect(timeline.classList.contains('link-pick')).toBe(false)
    expect(cardOf('A').classList.contains('link-src')).toBe(false)
  })

  it('Esc 拾取摘回（document keydown）：.link-pick 摘+.editing 保持', () => {
    mountEdit([node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })])
    setMode('edit')
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
    setMode('edit')
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
