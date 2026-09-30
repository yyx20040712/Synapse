// @vitest-environment jsdom
/**
 * [LG-03] LineageBoard —— 交互编辑面组件测试（锁定合约，always-active——
 * 不经 guardedDescribe）。
 *
 * 覆盖：单击选中 onSelectNode 上抛（04 侧板消费面预留；[T3-P6] 拖拽 x/y
 * 写面随拖拽退役——载荷保留断言由 core_idea 编辑 it 承载）/加边全流程（源
 * 节点菜单「连线到…」+目标选取）/树拒绝三路径
 * toast（service reason 透传——守卫宿主=LG-01 service）/改父=删+加两调用/
 * 删节点/删除父连线/core_idea 编辑（x/y 保留防清覆盖）/保存失败指示+重试
 * （[T3-P6] 写触发器=编辑 core_idea——drag 随拖拽退役，主控裁决 a）/
 * 加节点对话框两型（library.list 搜索选取 vs 主题 title）/组合根退出聚合
 * （lineage dirty→system/set-quit-dirty，INV-22 扩面）。
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
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    importDraft: vi.fn()
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
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { App } from '../../../src/renderer/app/App'

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

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind: 'tree', sub: null, createdAt: 't', updatedAt: 't' }
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

/** [T3-P6 主控裁决 a] 写触发器=编辑 core_idea（既有 upsert-node 写通道——
 *  drag 触发器随拖拽退役，保存态/聚合脏态断言语义迁移保活） */
async function writeViaEditIdea(id: string): Promise<void> {
  openMenu(id)
  clickMenu('编辑核心想法')
  const ta = q('[data-testid="core-idea-input"]') as HTMLTextAreaElement | null
  if (ta === null) throw new Error('core_idea 输入未渲染')
  act(() => {
    typeInto(ta, '保存态触发想法')
  })
  const save = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === '保存'
  )
  if (save === undefined) throw new Error('保存按钮未渲染')
  act(() => {
    save.click()
  })
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

/** React 受控输入的 jsdom 驱动法：原生 setter+input 事件（直接赋 value 不生效——
 *  reader-notes-panel.test.tsx typeInto 同型） */
function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
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
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: node('X') })
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('ex', 'a', 'b') })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.importDraft.mockResolvedValue({
    ok: true,
    data: { ok: true, nodeCount: 0, edgeCount: 0 }
  })
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
    expect(stubApi.lineage.upsertNode).not.toHaveBeenCalled()
  })
})

describe('LineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）', () => {
  it('加边全流程：菜单「连线到…」→目标选取→upsertEdge {from: 源, to: 目标}', async () => {
    seedLineage([node('A'), node('B')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('A')
    clickMenu('连线到…')
    expect(q('[data-testid="lineage-pending-link"]')).not.toBeNull()
    clickNode(nodeEl('B'))
    await flush()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({ from: 'A', to: 'B', label: '' })
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
      await flush()
      expect(showToast).toHaveBeenCalledWith(reason, 'error')
      expect(useLineageStore.getState().saveStatus).toBe('saved') // 拒绝=动作丢弃非脏态
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
    await flush()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-old' })
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({ from: 'C', to: 'B', label: '' })
  })

  it('删除父连线/删除节点：菜单动作→remove-edge/remove-node 载荷', async () => {
    seedLineage([node('A'), node('B')], [edge('e-1', 'A', 'B')])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('B')
    clickMenu('删除父连线')
    await flush()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-1' })

    openMenu('A')
    clickMenu('删除节点')
    await flush()
    expect(stubApi.lineage.removeNode).toHaveBeenCalledWith({ id: 'A' })
  })

  it('core_idea 编辑保存：textarea 改值→upsert 载荷含新想法且 x/y 保留（防清覆盖）', async () => {
    seedLineage([node('A', { ...OVL, coreIdea: '旧想法' })])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    openMenu('A')
    clickMenu('编辑核心想法')
    const ta = q('[data-testid="core-idea-input"]') as HTMLTextAreaElement | null
    if (ta === null) throw new Error('core_idea 输入未渲染')
    act(() => {
      typeInto(ta, '新的核心想法')
    })
    const save = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '保存'
    )
    if (save === undefined) throw new Error('保存按钮未渲染')
    act(() => {
      save.click()
    })
    await flush()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', coreIdea: '新的核心想法', x: 500, y: 400 })
    )
  })
})

describe('LineageBoard —— 保存态指示（autosave-first：无保存按钮）', () => {
  it('失败指示+重试：error 条可见，重试点击重发；成功后指示消退', async () => {
    stubApi.lineage.upsertNode
      .mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
      .mockResolvedValueOnce({ ok: true, data: node('A', OVL) })
    seedLineage([node('A', OVL)])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    await writeViaEditIdea('A')
    const bar = q('[data-testid="lineage-save-status"]')
    expect(bar?.textContent).toContain('保存失败')
    const retry = q('[data-testid="lineage-retry-save"]') as HTMLButtonElement | null
    if (retry === null) throw new Error('重试按钮未渲染')
    act(() => {
      retry.click()
    })
    await flush()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(2)
    expect(q('[data-testid="lineage-save-status"]')).toBeNull() // saved 不占指示
  })
})

describe('LineageBoard —— 添加节点对话框（两型）', () => {
  it('文献型：library.list 搜索选取→paperId 绑定+元数据默认', async () => {
    stubApi.library.list.mockResolvedValue({
      ok: true,
      data: {
        items: [
          { id: 'paper-9', title: '扩散模型综述', year: 2021, authors: [] }
        ],
        total: 1
      }
    })
    stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: node('N9', { paperId: 'paper-9' }) })
    seedLineage([])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    act(() => {
      (q('[data-testid="lineage-add-node"]') as HTMLButtonElement).click()
    })
    const search = q('[data-testid="add-node-search"]') as HTMLInputElement | null
    if (search === null) throw new Error('搜索框未渲染')
    act(() => {
      typeInto(search, '扩散')
    })
    await flush()
    const item = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find((b) =>
      b.textContent?.includes('扩散模型综述')
    )
    if (item === undefined) throw new Error('搜索结果条目未渲染')
    act(() => {
      item.click()
    })
    const confirm = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '添加'
    )
    act(() => {
      confirm?.click()
    })
    await flush()
    expect(stubApi.library.list).toHaveBeenCalledWith(expect.objectContaining({ search: '扩散' }))
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith({
      paperId: 'paper-9',
      title: '扩散模型综述',
      coreIdea: '',
      year: 2021,
      x: null,
      y: null
    })
  })

  it('主题型：title 输入→paperId null 节点', async () => {
    stubApi.lineage.upsertNode.mockResolvedValue({
      ok: true, data: node('T1', { paperId: null, title: '阶段二' })
    })
    seedLineage([])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    act(() => {
      (q('[data-testid="lineage-add-node"]') as HTMLButtonElement).click()
    })
    act(() => {
      (q('[data-testid="add-node-mode-theme"]') as HTMLButtonElement).click()
    })
    const title = q('[data-testid="add-node-title"]') as HTMLInputElement | null
    if (title === null) throw new Error('主题 title 输入未渲染')
    act(() => {
      typeInto(title, '阶段二')
    })
    const confirm = [...(q('[role="dialog"]')?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '添加'
    )
    act(() => {
      confirm?.click()
    })
    await flush()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith({
      paperId: null,
      title: '阶段二',
      coreIdea: '',
      year: null,
      x: null,
      y: null,
      folderId: '__main__' // [F-FOLDER-02·B] 主题节点=当前图（缺省主图——显式携键）
    })
  })
})

describe('LineageBoard —— 导入草稿入口（LG-01 覆盖式语义条款兑现，回炉 1 轮裁决①）', () => {
  it('确认接受→lineage/import 调用+成功计数 toast+graph 刷新（store 重取）', async () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    stubApi.lineage.importDraft.mockResolvedValue({
      ok: true,
      data: { ok: true, nodeCount: 3, edgeCount: 2 }
    })
    stubApi.lineage.graph.mockClear()
    seedLineage([])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    expect(stubApi.lineage.graph).not.toHaveBeenCalled() // Board 挂载不自动取数
    act(() => {
      (q('[data-testid="lineage-import"]') as HTMLButtonElement).click()
    })
    await flush()
    expect(spy).toHaveBeenCalledWith('导入将替换现有脉络图')
    expect(stubApi.lineage.importDraft).toHaveBeenCalledWith({})
    expect(showToast).toHaveBeenCalledWith('已导入脉络图：3 个节点，2 条连线', 'success')
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({}) // 成功后刷新
    spy.mockRestore()
  })

  it('confirm 取消→不调 import 通道（无操作）', async () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    seedLineage([])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    act(() => {
      (q('[data-testid="lineage-import"]') as HTMLButtonElement).click()
    })
    await flush()
    expect(stubApi.lineage.importDraft).not.toHaveBeenCalled()
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('校验失败=errors 清单 toast（汇总计数+首条 path/reason 真实文本）', async () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    stubApi.lineage.importDraft.mockResolvedValue({
      ok: true,
      data: {
        ok: false,
        errors: [
          { path: 'nodes.0.paper_id', reason: '文献不存在（幽灵 paperId）：p-404' },
          { path: 'edges.1.to_paper_id', reason: '多父边：文献 b 已有父节点 a（树至多一父）' }
        ]
      }
    })
    stubApi.lineage.graph.mockClear()
    seedLineage([])
    mount(<LineageBoard onSelectNode={() => undefined} />)
    act(() => {
      (q('[data-testid="lineage-import"]') as HTMLButtonElement).click()
    })
    await flush()
    expect(showToast).toHaveBeenCalledWith(
      '草稿校验失败（共 2 处）：nodes.0.paper_id 文献不存在（幽灵 paperId）：p-404',
      'error'
    )
    expect(stubApi.lineage.graph).not.toHaveBeenCalled() // 校验失败库未动不刷新
    spy.mockRestore()
  })
})

describe('组合根 —— 退出拦截聚合扩面（INV-22：tab dirty ∪ lineage dirty）', () => {
  it('lineage 保存失败→dirty=true 沿 system/set-quit-dirty 上报（App 组合根单点）', async () => {
    seedLineage([])
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [node('A', OVL)], edges: [] }
    })
    stubApi.lineage.upsertNode.mockResolvedValue({
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
    await writeViaEditIdea('A')
    await flush()
    const calls = stubApi.system.setQuitDirty.mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(2) // false（初始）→true（失败）
    // [F-FOLDER-01] INV-91 S1 队列闸：lineage 保存失败=队列 pending → lineagePending=true
    expect(calls[calls.length - 1]?.[0]).toEqual({ dirty: true, lineagePending: true })
  })
})
