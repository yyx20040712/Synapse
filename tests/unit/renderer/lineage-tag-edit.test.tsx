// @vitest-environment jsdom
/**
 * [F-LG14] 标签增删 UI —— 节点菜单「添加标签」入口+对话框+侧板标签编辑+store
 * setNodeTags 写面（新增锁定面）。
 *
 * 覆盖：菜单项在场与上抛/Board 全链（右键→添加标签→输入→保存=upsert-node 全量
 * 载荷含 tags 合并——防半更新清字段同族）/对话框取消零写/侧板标签 chips 渲染+
 * 移除/侧板输入添加（含同名去重面板面短路）/store setNodeTags 载荷与回填。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub } from '../../utils/api-client-mock'
import { seedLineage } from '../../utils/factories'

const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn()
  }
})

import { LineageBoard } from '../../../src/renderer/features/lineage/LineageBoard'
import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'
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

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind: 'tree', createdAt: 't', updatedAt: 't' }
}

/** 落库后回传的服务器行（回填面） */
const serverNode = (n: LineageNode): LineageNode => ({ ...n, updatedAt: 'server' })

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

function clickMenu(label: string): void {
  const menu = q('[data-testid="lineage-node-menu"]')
  if (menu === null) throw new Error('节点菜单未渲染')
  const btn = [...menu.querySelectorAll('button')].find((b) => b.textContent === label)
  if (btn === undefined) throw new Error(`菜单项不存在：${label}`)
  act(() => {
    btn.click()
  })
}

/** React 受控输入的 jsdom 驱动法：原生 setter+input 事件 */
function typeInto(el: HTMLInputElement, text: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.ai_sensor.listByPaper.mockReset()
  stubApi.notes.get.mockReset()
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [] }) // 侧板 AI 分节空态
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
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

// ── 节点菜单「添加标签」入口+Board 全链 ─────────────────────────

it('Board 全链：右键→「添加标签…」→对话框输入→保存=upsert-node 全量载荷含 tags 合并', async () => {
  seedLineage([node('A', { tags: ['综述'], coreIdea: '想法', title: '锚点', year: 2019 })])
  stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: serverNode(node('A', req)) })
  )
  mount(<LineageBoard onSelectNode={() => undefined} />)
  openMenu('A')
  clickMenu('添加标签…')
  const input = q('[data-testid="lineage-tag-input"]') as HTMLInputElement | null
  expect(input).not.toBeNull()
  act(() => {
    typeInto(input!, '早期')
  })
  const save = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === '添加'
  )
  act(() => {
    save?.click()
  })
  await settle()
  expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith({
    id: 'A',
    paperId: 'paper-A',
    title: '锚点',
    coreIdea: '想法',
    year: 2019,
    x: null,
    y: null,
    tags: ['综述', '早期']
  })
  // 回填：保存行入 store（tags 合并态）
  expect(useLineageStore.getState().nodes[0]!.tags).toEqual(['综述', '早期'])
})

it('对话框取消=零写；主题节点同样有「添加标签…」入口', async () => {
  seedLineage([node('T', { paperId: null, tags: null })])
  mount(<LineageBoard onSelectNode={() => undefined} />)
  openMenu('T')
  clickMenu('添加标签…')
  const cancel = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === '取消'
  )
  act(() => {
    cancel?.click()
  })
  await settle()
  expect(stubApi.lineage.upsertNode).not.toHaveBeenCalled()
  expect(q('[data-testid="lineage-tag-input"]')).toBeNull() // 对话框已关
})

it('空标签名不派发（按钮禁用或提交短路——空串标签不入库）', async () => {
  seedLineage([node('A')])
  mount(<LineageBoard onSelectNode={() => undefined} />)
  openMenu('A')
  clickMenu('添加标签…')
  const save = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === '添加'
  )
  act(() => {
    save?.click()
  })
  await settle()
  expect(stubApi.lineage.upsertNode).not.toHaveBeenCalled()
})

// ── 侧板标签编辑 ──────────────────────────────────────────────

it('侧板标签区：chips 渲染+移除上抛（剩余数组）；输入添加上抛（合并数组）', async () => {
  const onSetTags = vi.fn()
  mount(
    <LineageSidePanel node={node('A', { tags: ['综述', '早期'] })} onJumpToPaper={() => undefined} onSetTags={onSetTags} />
  )
  const panel = q('[data-testid="lineage-side-panel"]')!
  const chips = panel.querySelectorAll('[data-testid="lineage-tag-chip"]')
  expect(chips.length).toBe(2)
  expect(chips[0]!.textContent).toContain('综述')
  // 移除「早期」
  const removeEarly = [...panel.querySelectorAll('[data-testid="lineage-tag-remove"]')][1] as
    | HTMLButtonElement
    | undefined
  act(() => {
    removeEarly?.click?.()
  })
  expect(onSetTags).toHaveBeenCalledWith('A', ['综述'])
  // 添加「新方法」
  const input = panel.querySelector('[data-testid="lineage-tag-input"]') as HTMLInputElement | null
  expect(input).not.toBeNull()
  act(() => {
    typeInto(input!, '新方法')
  })
  const add = [...(panel.querySelectorAll('button') ?? [])].find((b) => b.textContent === '+')
  act(() => {
    add?.click()
  })
  expect(onSetTags).toHaveBeenCalledWith('A', ['综述', '早期', '新方法'])
})

it('侧板同名标签短路：已存在标签再添加不派发（同节点同名去重面板面）', async () => {
  const onSetTags = vi.fn()
  mount(
    <LineageSidePanel node={node('A', { tags: ['综述'] })} onJumpToPaper={() => undefined} onSetTags={onSetTags} />
  )
  const input = q('[data-testid="lineage-side-panel"] [data-testid="lineage-tag-input"]') as HTMLInputElement | null
  act(() => {
    typeInto(input!, '综述')
  })
  const add = [...(q('[data-testid="lineage-side-panel"]')!.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === '+'
  )
  act(() => {
    add?.click()
  })
  expect(onSetTags).not.toHaveBeenCalled()
})

// ── store setNodeTags 写面 ────────────────────────────────────

it('store.setNodeTags：全量载荷+tags 数组；回填后 nodes.tags 更新（写路径经既有 upsert 通道）', async () => {
  seedLineage([node('A', { tags: ['综述'], x: 500, y: 400 })])
  stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: serverNode(node('A', req)) })
  )
  useLineageStore.getState().setNodeTags('A', ['综述', '早期'])
  await settle()
  expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith({
    id: 'A',
    paperId: 'paper-A',
    title: '节点A',
    coreIdea: '',
    year: 2020,
    x: 500,
    y: 400,
    tags: ['综述', '早期']
  })
  expect(useLineageStore.getState().nodes[0]!.tags).toEqual(['综述', '早期'])
  expect(useLineageStore.getState().saveStatus).toBe('saved')
})
