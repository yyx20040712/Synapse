// @vitest-environment jsdom
/**
 * [F-LG15] manual 边 UI —— 节点菜单「连接父文献…」+目标选择对话框+人工连线
 * 管理对话框（label 后编辑/删除）+store 写面（新增锁定面）。
 *
 * 覆盖：Board 全链（右键→连接父文献→搜索过滤+选取+逻辑线说明→保存=upsert-edge
 * kind='manual' 载荷）/取消零写/无 manual 边节点无「管理人工连线…」项/管理对话框
 * label 编辑保存=upsert-edge 带 id 更新载荷/删除=remove-edge/「删除父连线」仅针对
 * tree 边（manual 父不吞）/store linkManualParent·editManualEdgeLabel 载荷回填。
 * [T3-P6] 渲染面 its（manual 琥珀虚线色型/图例）随连线渲染退役删除——P7
 * 连线系统恢复视觉锚（主控裁决 a）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub } from '../../utils/api-client-mock'
import { seedLineage } from '../../utils/factories'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn()
  },
  library: { list: vi.fn() }
})

import { LineageBoard } from '../../../src/renderer/features/lineage/LineageBoard'
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
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(id: string, from: string, to: string, kind: LineageEdge['kind'] = 'tree'): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind, sub: null, createdAt: 't', updatedAt: 't' }
}

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
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

// [T3-P6 主控裁决 a] 原「manual 边渲染」describe（LineageCanvas 挂载断言边
// 色型/图例）随连线渲染退役删除——P7 连线系统恢复视觉锚（e2e T5 同注）；
// manual 边数据操作面断言由下行 Board 全链/store 写面两 describe 承载。

// ── Board 全链：连接父文献+管理人工连线 ────────────────────────

describe('F-LG15 Board 全链（连接父文献/管理人工连线）', () => {
  it('全链：右键 B→「连接父文献…」→对话框搜索过滤+选取目标+逻辑线说明→保存=upsert-edge {from:父,to:B,label,kind:"manual"}', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { from: string; to: string; label?: string }) =>
      ({ ok: true, data: edge('e-new', req.from, req.to, 'manual') })
    )
    seedLineage([
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
    seedLineage([node('B'), node('P1')])
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
    seedLineage([node('B'), node('P1')])
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
    seedLineage([node('B'), node('P1', { title: '平行路线甲', year: 2019 })], [manualEdge])
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
    seedLineage([node('B'), node('P1')], [manualEdge])
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
    seedLineage([node('B'), node('P1')], [edge('e-man1', 'P1', 'B', 'manual')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    expect(menuButtons().some((b) => b.textContent === '删除父连线')).toBe(false)
    // 加 tree 父后该项呈现且指向 tree 边
    seedLineage([node('B'), node('P1'), node('T')], [edge('e-man1', 'P1', 'B', 'manual'), edge('e-tree1', 'T', 'B', 'tree')])
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
    seedLineage([node('B'), node('P1')])
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
    seedLineage([node('B'), node('P1')], [{ ...edge('e-man1', 'P1', 'B', 'manual'), label: '旧说明' }])
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
