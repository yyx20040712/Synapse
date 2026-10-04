// @vitest-environment jsdom
/**
 * [F-LG15→F-LGRAPH-01②U5] manual 边 store 写面+节点菜单残余面。
 *
 * [②U5/退役] 人工父双对话框（连接父文献目标选择/管理人工连线 label 编辑+
 * 删除）随对话框退役删除——功能面替代=画线工具（②U3）+线身右键菜单「命名/
 * 线形与颜色/删除连线」（②U5）；原 Board 全链 describe 4 用例随面退役
 * （test-surface 豁免在档）。保留面：「删除父连线」=首条入边（节点菜单——
 * U8 kind 收敛沿承）/store linkManualParent（旧入口写面载荷锚保活）/
 * editManualEdgeLabel（线身右键「命名」store 面——A8 全载荷含视觉字段）。
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

function edge(id: string, from: string, to: string, label = ''): LineageEdge {
  return { id, fromNode: from, toNode: to, label, dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }
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

describe('[②U5 迁移] 节点菜单残余面（人工父双对话框退役后）', () => {





  it('[②U5 迁移]「删除父连线」=首条入边（U8 kind 收敛沿承）；人工父双入口随对话框退役零残留', async () => {
    seedLineage([node('B'), node('P1')], [edge('e-man1', 'P1', 'B')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    // 单入边=父边：呈现且指向它；人工父双入口零残留（退役负锚）
    expect(menuButtons().some((b) => b.textContent === '删除父连线')).toBe(true)
    expect(menuButtons().some((b) => b.textContent === '管理人工连线…')).toBe(false)
    expect(menuButtons().some((b) => b.textContent === '连接父文献…')).toBe(false)
    clickMenu('删除父连线')
    useLineageStore.getState().save() // [②U1]
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-man1' })
  })
})

// ── store 写面：linkManualParent / editManualEdgeLabel ─────────

describe('F-LG15 store manual 写面', () => {
  it('linkManualParent：upsert-edge 载荷（U8 单基型无 kind）+回填；CONFLICT 拒绝型丢弃不卡队（守卫宿主=service）', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string; label?: string }) =>
      ({ ok: true, data: edge(req.id ?? 'e-m', req.from, req.to, req.label) })
    )
    seedLineage([node('B'), node('P1')])
    useLineageStore.getState().linkManualParent('B', 'P1', '逻辑线说明')
    useLineageStore.getState().save() // [②U1]
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(expect.objectContaining({
      from: 'P1',
      to: 'B',
      label: '逻辑线说明'
    })) // [②U1] 本地 uuid 随行
    expect(useLineageStore.getState().edges).toHaveLength(1)
    expect(useLineageStore.getState().saveStatus).toBe('clean')
  })

  it('editManualEdgeLabel：upsert-edge 带 id 全载荷更新（视觉字段携行——A8）+回填 label', async () => {
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string; label?: string }) =>
      ({
        ok: true,
        data:
          req.id !== undefined
            ? edge(req.id, req.from, req.to, req.label ?? '')
            : edge('e-new', req.from, req.to, req.label ?? '')
      })
    )
    seedLineage([node('B'), node('P1')], [edge('e-man1', 'P1', 'B', '旧说明')])
    useLineageStore.getState().editManualEdgeLabel('e-man1', '新说明')
    useLineageStore.getState().save() // [②U1]
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      id: 'e-man1',
      from: 'P1',
      to: 'B',
      label: '新说明',
      dashed: false,
      color: '#3a5bd9'
    })
    expect(useLineageStore.getState().edges[0]!.label).toBe('新说明')
    expect(useLineageStore.getState().edges).toHaveLength(1) // 更新非新建
  })
})
