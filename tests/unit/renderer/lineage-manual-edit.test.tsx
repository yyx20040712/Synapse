// @vitest-environment jsdom
/**
 * [F-LG15] manual 边 UI —— 节点菜单「连接父文献…」+目标选择对话框+人工连线
 * 管理对话框（label 后编辑/删除）+store 写面+渲染虚线琥珀断言（新增锁定面）。
 *
 * 覆盖：Board 全链（右键→连接父文献→搜索过滤+选取+逻辑线说明→保存=upsert-edge
 * kind='manual' 载荷）/取消零写/无 manual 边节点无「管理人工连线…」项/管理对话框
 * label 编辑保存=upsert-edge 带 id 更新载荷/删除=remove-edge/「删除父连线」仅针对
 * tree 边（manual 父不吞）/渲染 manual=琥珀虚线（色+线型双断言，与 tree 实线/
 * ref 淡灰点线三方可区分）+manual 优先于推断标记/图例第五项文本/store
 * linkManualParent·editManualEdgeLabel 载荷回填。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import type * as clientModule from '../../../src/renderer/api/client'

const { stubApi } = vi.hoisted(() => ({
  stubApi: {
    lineage: {
      graph: vi.fn(),
      upsertNode: vi.fn(),
      removeNode: vi.fn(),
      upsertEdge: vi.fn(),
      removeEdge: vi.fn()
    },
    library: { list: vi.fn() }
  }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})

import { LineageBoard } from '../../../src/renderer/features/lineage/LineageBoard'
import { LineageCanvas } from '../../../src/renderer/features/lineage/LineageCanvas'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2020,
    x: null,
    y: null,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(id: string, from: string, to: string, kind: LineageEdge['kind'] = 'tree'): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind, createdAt: 't', updatedAt: 't' }
}

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function seed(nodes: LineageNode[], edges: LineageEdge[] = []): void {
  useLineageStore.setState({
    nodes,
    edges,
    status: 'ready',
    error: null,
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false
  })
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

const nodeEl = (id: string): Element => {
  const el = q(`[data-node-id="${id}"]`)
  if (el === null) throw new Error(`节点未渲染：${id}`)
  return el
}

function openMenu(id: string): void {
  act(() => {
    nodeEl(id).dispatchEvent(
      new MouseEvent('contextmenu', { clientX: 200, clientY: 150, bubbles: true, cancelable: true })
    )
  })
}

function menuButtons(): HTMLButtonElement[] {
  const menu = q('[data-testid="lineage-node-menu"]')
  if (menu === null) throw new Error('节点菜单未渲染')
  return [...menu.querySelectorAll('button')]
}

function clickMenu(label: string): void {
  const btn = menuButtons().find((b) => b.textContent === label)
  if (btn === undefined) throw new Error(`菜单项不存在：${label}`)
  act(() => {
    btn.click()
  })
}

function dialogButton(text: string): HTMLButtonElement | undefined {
  return [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === text
  )
}

/** React 受控输入的 jsdom 驱动法：原生 setter+input 事件 */
function typeInto(el: HTMLInputElement, text: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.library.list.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: node('X') })
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('ex', 'a', 'b') })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

// ── 渲染断言：manual=琥珀虚线（与 tree 实线/ref 淡灰点线三方可区分） ──

describe('F-LG15 manual 边渲染（LineageEdges 三方可区分）', () => {
  it('manual 边：var(--manual-edge) 1.4 虚线 7 5（tree 实线/ref 点线 2 3/manual 长虚线 7 5 三方色型双区分）', () => {
    const nodes = [
      node('A', { year: 2020, title: '基础研究' }),
      node('M', { year: 2019, title: '早期平行' }),
      node('C', { year: 2021, title: '后续工作' })
    ]
    const edges = [
      edge('e-tree', 'A', 'C', 'tree'),
      edge('e-man', 'M', 'C', 'manual')
    ]
    mount(<LineageCanvas nodes={nodes} edges={edges} />)
    const tree = q('[data-edge-id="e-tree"]')
    const manual = q('[data-edge-id="e-man"]')
    expect(manual?.getAttribute('stroke')).toBe('var(--manual-edge)')
    expect(manual?.getAttribute('stroke-width')).toBe('1.4')
    expect(manual?.getAttribute('stroke-dasharray')).toBe('7 5')
    // 三方可区分锚：manual 色≠tree branch 实线≠ref survey-edge 点线
    expect(tree?.getAttribute('stroke')).toBe('var(--node-branch)')
    expect(tree?.getAttribute('stroke-dasharray')).toBeNull()
    expect(manual?.getAttribute('stroke')).not.toBe('var(--node-branch)')
    expect(manual?.getAttribute('stroke')).not.toBe('var(--survey-edge)')
    expect(manual?.getAttribute('stroke-dasharray')).not.toBe('2 3')
  })

  it('manual 优先于推断标记：label 含「推断」的 manual 边仍 manual 色（人工标注语义>文本启发）', () => {
    const nodes = [node('A', { year: 2020, title: '基础研究' }), node('C', { year: 2021, title: '后续工作' })]
    const inferred: LineageEdge = { ...edge('e-infer', 'A', 'C', 'manual'), label: '谱系推断' }
    mount(<LineageCanvas nodes={nodes} edges={[inferred]} />)
    const p = q('[data-edge-id="e-infer"]')
    expect(p?.getAttribute('stroke')).toBe('var(--manual-edge)')
    expect(p?.getAttribute('stroke')).not.toBe('#8a94a6') // 变异红证锚：优先级翻转即染推断灰
  })

  it('manual 优先于综述启发（门一 W1）：端点为综述题名节点的 manual 边仍 manual 琥珀不被 surveyIds 吞色', () => {
    // 综述作人工父是合理场景——surveyIds 标题启发吞色=用户「区分度」诉求丢失
    const nodes = [
      node('S', { year: 2019, title: '领域综述：方法演进' }),
      node('C', { year: 2021, title: '后续工作' })
    ]
    const edges = [edge('e-ms', 'S', 'C', 'manual')]
    mount(<LineageCanvas nodes={nodes} edges={edges} />)
    const p = q('[data-edge-id="e-ms"]')
    expect(p?.getAttribute('stroke')).toBe('var(--manual-edge)')
    expect(p?.getAttribute('stroke-dasharray')).toBe('7 5')
    expect(p?.getAttribute('stroke')).not.toBe('var(--survey-edge)') // 变异红证锚：启发优先即染综述灰
    expect(p?.getAttribute('stroke-dasharray')).not.toBe('2 3')
  })

  it('manual 边 label 沿边渲染（data-edge-label——既有 edge-label 槽位消费面）', () => {
    const nodes = [node('A', { year: 2020, title: '基础研究' }), node('C', { year: 2021, title: '后续工作' })]
    const labeled: LineageEdge = { ...edge('e-label', 'A', 'C', 'manual'), label: '研究者补判' }
    mount(<LineageCanvas nodes={nodes} edges={[labeled]} />)
    const label = q('[data-edge-label="e-label"]')
    expect(label?.textContent).toBe('研究者补判')
  })

  it('图例第五项「人工父连线」真实文本（四项既有锚语义不变——扩展非改向）', () => {
    mount(<LineageCanvas nodes={[node('A')]} edges={[]} />)
    const legend = q('[data-legend]')
    expect(legend?.textContent).toContain('人工父连线')
    expect(legend?.textContent).toContain('核心文献') // 既有四项保持
    expect(legend?.querySelector('.lg-manual')).not.toBeNull()
  })
})

// ── Board 全链：连接父文献+管理人工连线 ────────────────────────

describe('F-LG15 Board 全链（连接父文献/管理人工连线）', () => {
  it('全链：右键 B→「连接父文献…」→对话框搜索过滤+选取目标+逻辑线说明→保存=upsert-edge {from:父,to:B,label,kind:"manual"}', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { from: string; to: string; label?: string }) =>
      ({ ok: true, data: edge('e-new', req.from, req.to, 'manual') })
    )
    seed([
      node('B', { title: '子文献', year: 2021 }),
      node('P1', { title: '平行路线甲', year: 2019 }),
      node('P2', { title: '平行路线乙', year: 2019 })
    ])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('连接父文献…')
    const dialog = q('[role="dialog"]')
    expect(dialog).not.toBeNull()
    // 候选列表：图内节点（自身 B 排除）全量在场
    let items = [...(dialog?.querySelectorAll('button') ?? [])].filter((b) =>
      b.textContent?.includes('平行路线')
    )
    expect(items.length).toBe(2)
    // 搜索过滤「乙」→只剩 P2
    const search = q('[data-testid="manual-parent-search"]') as HTMLInputElement | null
    expect(search).not.toBeNull()
    act(() => {
      typeInto(search!, '乙')
    })
    items = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].filter((b) =>
      b.textContent?.includes('平行路线')
    )
    expect(items.length).toBe(1)
    act(() => {
      items[0]!.click()
    })
    // 逻辑线说明输入
    const label = q('[data-testid="manual-parent-label"]') as HTMLInputElement | null
    expect(label).not.toBeNull()
    act(() => {
      typeInto(label!, '研究者补判的方法源头')
    })
    act(() => {
      dialogButton('连接')?.click()
    })
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      from: 'P2',
      to: 'B',
      label: '研究者补判的方法源头',
      kind: 'manual'
    })
    // 回填：manual 边入 store
    expect(useLineageStore.getState().edges.some((e) => e.kind === 'manual')).toBe(true)
    expect(q('[role="dialog"]')).toBeNull() // 对话框关闭
  })

  it('取消=零写（对话框关闭不派发）', async () => {
    seed([node('B'), node('P1')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('连接父文献…')
    act(() => {
      dialogButton('取消')?.click()
    })
    await settle()
    expect(stubApi.lineage.upsertEdge).not.toHaveBeenCalled()
    expect(q('[role="dialog"]')).toBeNull()
  })

  it('未选目标禁用确认（空选择短路——不派发）', async () => {
    seed([node('B'), node('P1')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('连接父文献…')
    const connect = dialogButton('连接') as HTMLButtonElement | undefined
    expect(connect?.disabled).toBe(true)
    act(() => {
      connect?.click()
    })
    await settle()
    expect(stubApi.lineage.upsertEdge).not.toHaveBeenCalled()
  })

  it('「管理人工连线…」仅在有 manual 入边的节点呈现：管理对话框 label 编辑保存=upsert-edge 带 id 更新载荷', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string; label?: string }) =>
      ({
        ok: true,
        data:
          req.id !== undefined
            ? { ...edge(req.id, req.from, req.to, 'manual'), label: req.label ?? '' }
            : edge('e-new', req.from, req.to, 'manual')
      })
    )
    const manualEdge = { ...edge('e-man1', 'P1', 'B', 'manual'), label: '初判' }
    seed([node('B'), node('P1', { title: '平行路线甲', year: 2019 })], [manualEdge])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    // B（有 manual 入边）有管理项
    openMenu('B')
    expect(menuButtons().some((b) => b.textContent === '管理人工连线…')).toBe(true)
    clickMenu('管理人工连线…')
    const row = q('[data-testid="manual-edge-row"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('平行路线甲') // 来自节点标题

    const input = q('[data-testid="manual-edge-label"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(input!.value).toBe('初判')
    act(() => {
      typeInto(input!, '再判：修正的逻辑线')
    })
    act(() => {
      dialogButton('保存')?.click()
    })
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      id: 'e-man1',
      from: 'P1',
      to: 'B',
      label: '再判：修正的逻辑线',
      kind: 'manual'
    })
  })

  it('管理对话框删除=remove-edge；无 manual 边节点无「管理人工连线…」项', async () => {
    const manualEdge = edge('e-man1', 'P1', 'B', 'manual')
    seed([node('B'), node('P1')], [manualEdge])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('管理人工连线…')
    const remove = q('[data-testid="manual-edge-remove"]') as HTMLButtonElement | null
    expect(remove).not.toBeNull()
    act(() => {
      remove?.click()
    })
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-man1' })
    // 无 manual 边的节点（P1：仅发出 manual 边，无入边）无管理项
    openMenu('P1')
    expect(menuButtons().some((b) => b.textContent === '管理人工连线…')).toBe(false)
  })

  it('「删除父连线」仅针对 tree 边：节点只有 manual 父（无 tree 父）时该项不呈现', async () => {
    seed([node('B'), node('P1')], [edge('e-man1', 'P1', 'B', 'manual')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    expect(menuButtons().some((b) => b.textContent === '删除父连线')).toBe(false)
    // 加 tree 父后该项呈现且指向 tree 边
    seed([node('B'), node('P1'), node('T')], [edge('e-man1', 'P1', 'B', 'manual'), edge('e-tree1', 'T', 'B', 'tree')])
    openMenu('B')
    clickMenu('删除父连线')
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-tree1' }) // tree 边，非 manual
  })
})

// ── store 写面：linkManualParent / editManualEdgeLabel ─────────

describe('F-LG15 store manual 写面', () => {
  it('linkManualParent：upsert-edge kind="manual" 载荷+回填；CONFLICT 拒绝型丢弃不卡队（守卫宿主=service）', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { from: string; to: string }) =>
      ({ ok: true, data: edge('e-m', req.from, req.to, 'manual') })
    )
    seed([node('B'), node('P1')])
    useLineageStore.getState().linkManualParent('B', 'P1', '逻辑线说明')
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      from: 'P1',
      to: 'B',
      label: '逻辑线说明',
      kind: 'manual'
    })
    expect(useLineageStore.getState().edges).toHaveLength(1)
    expect(useLineageStore.getState().saveStatus).toBe('saved')
  })

  it('editManualEdgeLabel：upsert-edge 带 id 更新载荷（kind/from/to 保持）+回填 label', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string; label?: string }) =>
      ({
        ok: true,
        data:
          req.id !== undefined
            ? { ...edge(req.id, req.from, req.to, 'manual'), label: req.label ?? '' }
            : edge('e-new', req.from, req.to, 'manual')
      })
    )
    seed([node('B'), node('P1')], [{ ...edge('e-man1', 'P1', 'B', 'manual'), label: '旧说明' }])
    useLineageStore.getState().editManualEdgeLabel('e-man1', '新说明')
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      id: 'e-man1',
      from: 'P1',
      to: 'B',
      label: '新说明',
      kind: 'manual'
    })
    expect(useLineageStore.getState().edges[0]!.label).toBe('新说明')
    expect(useLineageStore.getState().edges).toHaveLength(1) // 更新非新建
  })
})
