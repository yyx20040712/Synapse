// @vitest-environment jsdom
/**
 * [LG-03] LineageBoard —— 交互编辑面组件测试（锁定合约，always-active——
 * 不经 guardedDescribe）。
 *
 * 覆盖：单击选中 onSelectNode 上抛（04 侧板消费面预留；[T3-P6] 拖拽 x/y
 * 写面随拖拽退役）/加边全流程（源
 * 节点菜单「连线到…」+目标选取）/树拒绝三路径
 * toast（service reason 透传——守卫宿主=LG-01 service）/改父=删+加两调用/
 * 删节点/删除父连线/保存失败指示+重试
 * （[T3-P6] 写触发器原=编辑 core_idea；[A3 F-CONTRACTA-01 2026-10-04]
 * core_idea 编辑对话框随全退役删除——触发器换 store.moveNode（x/y 数据面
 * 未退役），保存态/聚合脏态断言语义保活）/组合根退出聚合（lineage
 * dirty→system/set-quit-dirty，INV-22 扩面）。
 * [F-ALIGN-01] 加节点对话框两型 describe（library.list 搜索选取 vs 主题
 * title）随手动添加节点路径退役删除（2026-10-04——节点唯一来源=入库/移动）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import { seedLineage } from '../../utils/factories'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn()
  },
  // [F-FOLDER-02·B] 图切换器静态参考数据面（App 级挂载经 LineagePage 消费）
  folders: { list: vi.fn() },
  library: { list: vi.fn() },
  system: { setQuitDirty: vi.fn(), windowControl: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined),
  // [F-FOLDER-02·B] folders.changed 订阅面（S3/S4——mock 代理未覆盖键透传
  // undefined，切换器订阅直调即抛；生产面 preload 恒在场）
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
import { LineageBoard } from '../../../src/renderer/features/lineage/LineageBoard'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { App } from '../../../src/renderer/app/App'

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

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }
}

/** 覆盖位置节点（拖拽断言的确定性锚——布局坐标=精确覆盖值，不依赖自动布局） */
const OVL = { x: 500, y: 400 }

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

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null

const nodeEl = (id: string): Element => {
  const el = q(`[data-node-id="${id}"]`)
  if (el === null) throw new Error(`节点未渲染：${id}`)
  return el
}

/** [T3-P6] 拖拽会话已随 x/y 自由拖拽退役删除（Timeline 卡 onClick 语义）。
 *  单击=派发 click 事件（主控裁决 a：触发手段适配新 DOM，断言意图保活） */
function clickNode(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 右键节点开菜单 */
function openMenu(id: string): void {
  act(() => {
    nodeEl(id).dispatchEvent(
      new MouseEvent('contextmenu', { clientX: 200, clientY: 150, bubbles: true, cancelable: true })
    )
  })
}

/** [A3 F-CONTRACTA-01 2026-10-04] 写触发器=store.moveNode（patch-node 写通道；
 *  原编辑 core_idea 对话框路径随 core_idea 全退役删除——drag〔T3-P6〕→
 *  EditIdea〔A3〕两代触发器退役后，保存态/聚合脏态断言语义经 store 动作直驱
 *  保活〔x/y 数据面未退役〕） */
async function writeViaNodePatch(id: string): Promise<void> {
  act(() => {
    useLineageStore.getState().moveNode(id, 101, 102)
  })
  useLineageStore.getState().save() // [②U1] 点保存批量落库
  await flush()
}

/** 点菜单项（按可见文本） */
function clickMenu(label: string): void {
  const menu = q('[data-testid="lineage-node-menu"]')
  if (menu === null) throw new Error('节点菜单未渲染')
  const btn = [...menu.querySelectorAll('button')].find((b) => b.textContent === label)
  if (btn === undefined) throw new Error(`菜单项不存在：${label}`)
  act(() => {
    btn.click()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // once 队列跨用例残留防御（clearAllMocks 不清 once）：逐 fn reset 后重设默认
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.library.list.mockReset()
  stubApi.system.setQuitDirty.mockReset()
  stubApi.system.windowControl.mockReset()
  // App.tsx 组合根直用 window.api.system（非 client 门面）——jsdom 下 stub
  // （R2-SH3：+windowControl/onWindowState——TitleBarControls 直用 window 桥）
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      system: { setQuitDirty: stubApi.system.setQuitDirty, windowControl: stubApi.system.windowControl }
    }
  })
  Object.defineProperty(window, 'apiEvents', {
    configurable: true,
    value: { onWindowState: vi.fn(() => () => undefined) }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] } })
  stubApi.lineage.patchNode.mockResolvedValue({ ok: true, data: node('X') })
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('ex', 'a', 'b') })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('LineageBoard —— 选中上抛（T3-P6 拖拽退役后）', () => {
  // [T3-P6 主控裁决 a] 原「拖拽落点→upsert-node x/y 载荷」it 随 x/y 自由
  // 拖拽退役删除（拖拽面退役同族）；载荷面 x/y 保留断言见 core_idea 编辑 it
  it('单击=选中上抛（纯选中零写）；onSelectNode 形态照票面（04 侧板消费面）', async () => {
    const onSelect = vi.fn()
    seedLineage([node('A', OVL)])
    mount(<LineageBoard onSelectNode={onSelect} />)
    clickNode(nodeEl('A'))
    await flush()
    expect(onSelect).toHaveBeenCalledWith('A')
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
  })
})

describe('LineageBoard —— 节点菜单（加边/改父/删边/删节点）', () => {
  it('加边全流程：菜单「连线到…」→目标选取→upsertEdge {from: 源, to: 目标}', async () => {
    seedLineage([node('A'), node('B')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('A')
    clickMenu('连线到…')
    expect(q('[data-testid="lineage-pending-link"]')).not.toBeNull()
    clickNode(nodeEl('B'))
    useLineageStore.getState().save() // [②U1]
    await flush()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(expect.objectContaining({ from: 'A', to: 'B', label: '' })) // [②U1] uuid 随行
    expect(q('[data-testid="lineage-pending-link"]')).toBeNull() // 完成即退出选取模式
  })

  it('树拒绝三路径 toast：service 中文 reason 透传（多父/成环/自环），UI 零守卫只接呈现', async () => {
    const reasons = [
      '多父边拒绝：节点 B 已有父节点 A（树至多一父）',
      '成环拒绝：该边将使脉络图出现环路（v1 为树）',
      '自环边不允许（from 与 to 为同一节点）'
    ]
    for (const reason of reasons) {
      vi.mocked(showToast).mockClear()
      stubApi.lineage.upsertEdge.mockResolvedValueOnce({
        ok: false,
        error: { code: 'CONFLICT', message: reason }
      })
      seedLineage([node('A'), node('B')])
      mount(<LineageBoard onSelectNode={() => undefined} />)
      openMenu('A')
      clickMenu('连线到…')
      clickNode(nodeEl('B'))
      useLineageStore.getState().save() // [②U1]
      await flush()
      expect(showToast).toHaveBeenCalledWith(reason, 'error')
      expect(useLineageStore.getState().saveStatus).toBe('clean') // 拒绝=动作丢弃非脏态
      act(() => {
        root?.unmount()
      })
    }
  })

  it('改父=删旧边+加新边两调用（N5 语义：UI 单操作，service 两调用）', async () => {
    seedLineage([node('A'), node('B'), node('C')], [edge('e-old', 'A', 'B')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('改父…')
    clickNode(nodeEl('C'))
    useLineageStore.getState().save() // [②U1]
    await flush()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-old' })
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(expect.objectContaining({ from: 'C', to: 'B', label: '' })) // [②U1] uuid 随行
  })

  it('删除父连线/删除节点：菜单动作→remove-edge/remove-node 载荷', async () => {
    seedLineage([node('A'), node('B')], [edge('e-1', 'A', 'B')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('删除父连线')
    useLineageStore.getState().save() // [②U1]
    await flush()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-1' })

    openMenu('A')
    clickMenu('删除节点')
    useLineageStore.getState().save() // [②U1]
    await flush()
    expect(stubApi.lineage.removeNode).toHaveBeenCalledWith({ id: 'A' })
  })
})

describe('LineageBoard —— 保存态指示（[②U2] 工具组保存钮行内错误——退役行 4 chip）', () => {
  it('失败指示+重试：行内错误可见，重试点击重发；成功后指示消退', async () => {
    stubApi.lineage.patchNode
      .mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
      .mockResolvedValueOnce({ ok: true, data: node('A', OVL) })
    seedLineage([node('A', OVL)])
    useLineageViewStore.getState().setMode('edit') // [②U2/A11] 工具组仅 edit 可见
    mount(<LineageBoard onSelectNode={() => undefined} />)
    await writeViaNodePatch('A')
    const bar = q('[data-testid="lineage-save-error"]')
    expect(bar?.textContent).toContain('写入失败')
    const retry = q('[data-testid="lineage-save-retry"]') as HTMLButtonElement | null
    if (retry === null) throw new Error('重试按钮未渲染')
    act(() => {
      retry.click()
    })
    await flush()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(2)
    expect(q('[data-testid="lineage-save-error"]')).toBeNull() // clean 不占指示
  })
})


describe('组合根 —— 退出拦截聚合扩面（INV-22：tab dirty ∪ lineage dirty）', () => {
  it('lineage 保存失败→dirty=true 沿 system/set-quit-dirty 上报（App 组合根单点）', async () => {
    seedLineage([])
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [node('A', OVL)], edges: [] }
    })
    stubApi.lineage.patchNode.mockResolvedValue({
      ok: false,
      error: { code: 'DB_ERROR', message: '写入失败' }
    })
    mount(<App />)
    const nav = [...(host?.querySelectorAll('nav button') ?? [])].find(
      (b) => b.textContent === '脉络'
    ) as HTMLButtonElement | undefined
    if (nav === undefined) throw new Error('脉络导航未渲染')
    act(() => {
      nav.click()
    })
    await flush()
    // [T3-P6 主控裁决 a] drag 触发器→编辑 core_idea 写通道（断言意图不变）
    await writeViaNodePatch('A')
    await flush()
    const calls = stubApi.system.setQuitDirty.mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(2) // false（初始）→true（失败）
    // [F-FOLDER-01] INV-91 S1 队列闸：lineage 保存失败=队列 pending → lineagePending=true
    expect(calls[calls.length - 1]?.[0]).toEqual({ dirty: true, lineagePending: true })
  })
})
