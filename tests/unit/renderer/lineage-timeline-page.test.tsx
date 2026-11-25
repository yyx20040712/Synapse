// @vitest-environment jsdom
/**
 * [T3-P6] LineageTimeline / LineagePage —— 时间线宿主+脉络视图组件测试
 * （[LG-02] lineage-canvas.test 改写件——Canvas 断言面[pan/zoom/INV-14/
 * auto-fit/边标签/统一卡尺寸/题名滚轮]随 SVG 画布方案退役删除，主控裁决：
 * 断言意图迁移=Timeline 宿主真实文本+Page 三态/store 缓存面保活迁移。
 * [F-CONSOL-04] 文件名对齐=canvas 改写后残留名退役，改名
 * lineage-canvas.test.tsx→本件——内容零改动，旧键走 FILE 级豁免通道。
 *
 * 覆盖：时间线真实文本渲染（年份头纯数字/月标签/卡题名——「渲染出真实
 * 文本」红线）/data-node-id 结构锚（e2e/Board 测试同名接缝）/空图画布（[B5] 原「空图空态
 * 文案」翻转——不渲染空态文案）/Page 三态（loading/ready/error+重试）/store 数据缓存（卸载后驻留）。
 * [B5 设计稿 §3.3/§3.5/§11.2「lineage-timeline-page：loading 改 aria-busy+工具栏；空图改画布存在；
 * 子图空态无文字；load error 仍断言真实原因和 lineage-load-retry；重挂记忆 mode；删三类可见
 * 空/loading 文案与 P-1 二次进页 browse 锁」——wave C 2026-11-25 断言翻转] Page=稳定外壳：
 * loading/error/ready 三态共用同一工具栏；loading=画布占位 aria-busy+sr-only；graph load error=
 * role=alert＋独立 lineage-load-retry（只调 load()，不复用保存/history 重试）；空图=画布在场。
 * 工具栏形态/缩放/告警分流=lineage-toolbar-session、lineage-toolbar-save-error-class。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 * 分组/砖砌/CSS 逐值锁=tests/unit/renderer/lineage-timeline.test.tsx（单源）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() },
  // [F-FOLDER-02·B→F-LGRAPH-01①U4] NavGraphPicker 文件夹域面
  folders: { list: vi.fn() }
})
stubApiEvents({
  // folders.changed 订阅面（mock 代理未覆盖键透传 undefined，订阅直调即抛）
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'

function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'year' | 'month' | 'x' | 'y' | 'paperId' | 'title'>> = {}
): LineageNode {
  return {
    id,
    // 显式 null（主题节点）不可被默认值吞掉——?? 对 null 同样走右侧
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    year: patch.year ?? null,
    x: patch.x ?? null,
    y: patch.y ?? null,
    month: patch.month ?? null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

/** 三节点链：A(2020)→B(2021)→C(2022)，B 为主题节点（paperId null） */
function chain(): { nodes: LineageNode[]; edges: LineageEdge[] } {
  return {
    nodes: [
      node('A', { year: 2020, title: '扩散模型起点' }),
      node('B', { year: 2021, paperId: null, title: '主题分组' }),
      node('C', { year: 2022, title: '最新进展' })
    ],
    edges: [edge('A', 'B'), edge('B', 'C')]
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-x', name: '测试图乙', position: 1, paperCount: 0 }
    ]
  })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'browse',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    navScrollTarget: null,
    activeFrameKey: null
  })
  // [R2/R6] 库页上下文复位（缺省图同步消费面——跨用例污染防御）
  useLibraryStore.setState({ query: { sort: 'added_desc', offset: 0, limit: 50 } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('LineageTimeline —— 时间线宿主渲染', () => {
  it('节点文本真实渲染（年份头纯数字/月标签/卡题名——「渲染出真实文本」红线）', () => {
    const g = chain()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    // 年份头=纯数字无「年」字（mockup 形态；null 年文案在 timeline.test 单源锚）
    expect([...(host?.querySelectorAll('.tl-year-num') ?? [])].map((e) => e.textContent)).toEqual([
      '2020',
      '2021',
      '2022'
    ])
    // 卡题名真文本（未定月月标签「未定月 · N 篇」——month null 全体）
    expect(host?.textContent).toContain('扩散模型起点')
    expect(host?.textContent).toContain('主题分组')
    expect(host?.textContent).toContain('最新进展')
    expect(host?.textContent).toContain('未定月 · 1 篇')
  })

  it('data-node-id 结构锚：各卡挂 id（e2e/Board 测试同名接缝沿承）', () => {
    const g = chain()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    expect(host?.querySelectorAll('[data-node-id]').length).toBe(3)
    expect(host?.querySelector('[data-node-id="B"]')).not.toBeNull()
  })

  it('[B5 §3.5 断言翻转] 空图：不渲染「暂无脉络图」，画布 .tl-content 在场；添加节点/导入/线型弹层入口零残留负锚', () => {
    useLineageViewStore.setState({ mode: 'edit' })
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(host?.textContent).not.toContain('暂无脉络图')
    expect(host?.querySelector('.tl-content'), '空图画布在场').not.toBeNull()
    expect(host?.querySelector('.tl-empty')).toBeNull()
    // [F-ALIGN-01] 添加节点钮随手动添加路径退役——零残留负锚（在场即红）；[F-BAKRET-01] 导入按钮随
    // 草稿导入链退役——零残留负锚（在场即红）
    expect(host?.querySelector('.timeline .lg-toolbar'), '工具栏不在 Timeline 渲染树').toBeNull()
    expect(host?.querySelector('[data-testid="lineage-add-node"]')).toBeNull()
    expect(host?.querySelector('[data-testid="lineage-import"]')).toBeNull()
    expect(host?.querySelector('[data-testid="edge-pop"]')).toBeNull()
  })

  it('[B5 §11.2] 空→非空转场：真实卡标题从 0 到有（时间线容器常驻无监听重绑面）；空图无空态文案', () => {
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(host?.querySelectorAll('.c-title'), '空图：零卡标题').toHaveLength(0)
    expect(host?.textContent).not.toContain('暂无脉络图')
    expect(host?.querySelector('.tl-content')).not.toBeNull()
    const g = chain()
    act(() => {
      root?.render(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    })
    expect(host?.textContent).toContain('扩散模型起点') // 真实卡标题从 0 到有
    expect(host?.querySelectorAll('.c-title')).toHaveLength(3)
    expect(host?.querySelectorAll('[data-node-id]').length).toBe(3)
  })
})

describe('LineagePage —— 取数三态（lineage.store 数据单源）', () => {
  it('[B5 §3.3 断言翻转] loading 共壳：工具栏在场（三模式钮可达）、画布占位 aria-busy=true＋sr-only「正在加载脉络图」、数据控件禁用、无可见 loading 文案；graph 取数一次', async () => {
    stubApi.lineage.graph.mockReturnValue(new Promise(() => undefined))
    mount(<LineagePage />)
    await flush()
    expect(useLineageStore.getState().status).toBe('loading')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: '__main__' })
    // 稳定外壳：同一工具栏在 loading 态在场
    expect(host?.querySelector('[data-testid="lineage-mode-bar"]')).not.toBeNull()
    for (const id of ['lineage-mode-edit', 'lineage-mode-browse', 'lineage-mode-focus']) {
      const b = host?.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)
      expect(b, `${id} 在 loading 态可达`).not.toBeNull()
      expect(b?.disabled).toBe(false)
    }
    // 画布占位宿主：lineage-timeline 在场、aria-busy=true、sr-only 文案
    const timeline = host?.querySelector('[data-testid="lineage-timeline"]')
    expect(timeline).not.toBeNull()
    expect(timeline?.getAttribute('aria-busy')).toBe('true')
    expect(timeline?.textContent).toBe('正在加载脉络图')
    expect(timeline?.querySelector('.sr-only')?.textContent).toBe('正在加载脉络图')
    // 删除可见教学式 loading 文案（占位宿主内只有 sr-only 文本节点）
    expect(host?.querySelector('.tl-content'), 'loading 态不渲染画布内容层').toBeNull()
    // 数据控件按 §2.3 禁用：保存/撤销/重做/编辑工具/缩放/清空聚焦
    for (const id of ['lineage-save-btn', 'lineage-undo', 'lineage-redo', 'lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in', 'lineage-focus-clear']) {
      expect(host?.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)?.disabled, `loading：${id} 禁用`).toBe(true)
    }
  })

  it('[B5 §2.2 #23/§3.3] graph loading/error 只收 palette：不覆写 mode/focusSet（状态切换不清内存会话）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A'] })
    stubApi.lineage.graph.mockReturnValue(new Promise(() => undefined))
    mount(<LineagePage />)
    await flush()
    expect(useLineageViewStore.getState().mode).toBe('focus')
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
    expect(host?.querySelector('[data-testid="lineage-mode-focus"]')?.classList.contains('on')).toBe(true)
  })

  it('[B5 §3.3] 图名在工具栏槽位（folders 单源——主图兜底「主图」），不在模式栏内', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount(<LineagePage />)
    await flush()
    const title = host?.querySelector('[data-testid="lineage-graph-title"]')
    expect(title?.textContent).toBe('主图')
    expect(title?.classList.contains('lg-graph-name')).toBe(true)
    expect(host?.querySelector('[data-testid="lineage-mode-bar"]')?.contains(title as Node)).toBe(false)
    expect(title?.closest('.lg-toolbar')).not.toBeNull() // 父工具栏槽位
  })

  it('[B5 §11.2 重挂记忆 mode] 页面卸载再挂载：mode 保持（原 P-1「二次进页 browse」锁翻转）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    useLineageViewStore.setState({ mode: 'edit' })
    mount(<LineagePage />)
    await flush()
    expect(host?.querySelector('[data-testid="lineage-mode-edit"]')?.classList.contains('on')).toBe(true)
    act(() => {
      root?.unmount()
    })
    root = null
    host?.remove()
    mount(<LineagePage />)
    await flush()
    expect(useLineageViewStore.getState().mode, '重挂后 mode 保持').toBe('edit')
    expect(host?.querySelector('[data-testid="lineage-mode-edit"]')?.classList.contains('on')).toBe(true)
    expect(host?.querySelector('[data-testid="lineage-mode-browse"]')?.classList.contains('on')).toBe(false)
  })

  it('[F-LGRAPH-01①U4] 编排重构：顶部=单排工具栏（内含模式栏，browse 缺省）+左侧导航窗格在场；顶栏并集切换器退役负锚（在场即红）；缺省图=库页上下文同步（未选=主图）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount(<LineagePage />)
    await flush()
    expect(host?.querySelector('[data-testid="lineage-mode-bar"]')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-mode-browse"]')?.classList.contains('on')).toBe(true) // P-1 缺省
    expect(host?.querySelector('[data-testid="lineage-nav-pane"]')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-nav-graph"]')).not.toBeNull()
    // 退役行 1：顶部并集切换器（LineageGraphSwitcher）删除——负锚
    expect(host?.querySelector('[data-testid="lineage-graph-switcher"]')).toBeNull()
    expect(host?.querySelector('select[aria-label="脉络图切换"]')).toBeNull()
    // 图名=工具栏槽位（folders 单源——主图兜底「主图」）
    expect(host?.querySelector('[data-testid="lineage-graph-title"]')?.textContent).toBe('主图')
    expect(useLineageStore.getState().folderId).toBe('__main__') // 库页未选文件夹=主图
  })

  it('[R2] 缺省图正路径：library folderScope={kind:"folder"}→挂载即开该图（载荷+图名）；未选=主图（负对照）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    useLibraryStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-x' } }
    })
    mount(<LineagePage />)
    await flush()
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-x' }) // 库页上下文同步
    expect(useLineageStore.getState().folderId).toBe('f-x')
    expect(host?.querySelector('[data-testid="lineage-graph-title"]')?.textContent).toBe('测试图乙') // 图名=folders 单源
    // 负对照：未选态→主图（mount 前 state 复位由 beforeEach 承载——此处仅锁正路径分支；[F-ALIGN-01 D5] unfiled 筛选态已退役）
  })

  it('[B5 §3.3/§3.5 断言翻转] 空图两分支：主图空/子图空均不渲染「暂无脉络图」「该文件夹无脉络图」——画布在场（列表型空非错误）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    mount(<LineagePage />)
    await flush()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(host?.textContent).not.toContain('该文件夹无脉络图')
    expect(host?.textContent).not.toContain('暂无脉络图')
    expect(host?.querySelector('.tl-content'), '主图空：画布在场').not.toBeNull()
    // 子图空：挂载后经导航窗格切图（挂载同步不覆盖用户/切图选择）
    act(() => {
      useLineageStore.getState().setFolder('f-x')
    })
    await flush()
    expect(useLineageStore.getState().folderId).toBe('f-x')
    expect(host?.textContent).not.toContain('该文件夹无脉络图') // 子图空=无文字
    expect(host?.textContent).not.toContain('暂无脉络图')
    expect(host?.querySelector('.tl-content'), '子图空：画布在场').not.toBeNull()
  })

  it('ready：取数成功渲染节点真实文本（经 store 分发，时间线消费）', async () => {
    const g = chain()
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: g })
    mount(<LineagePage />)
    await flush()
    expect(host?.textContent).toContain('扩散模型起点')
    expect(useLineageStore.getState().status).toBe('ready')
  })

  it('[B5 §3.3 断言翻转] ready 空图：画布在场、无空态文案（列表型空非错误）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    mount(<LineagePage />)
    await flush()
    expect(host?.textContent).not.toContain('暂无脉络图')
    expect(host?.querySelector('.tl-content')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-timeline"]')).not.toBeNull()
  })

  it('[B5 §3.3] graph load error：同一工具栏仍在；role=alert 含真实原因＋独立 lineage-load-retry（只调 load()，不复用保存/history 重试）；重试再取数成功恢复', async () => {
    stubApi.lineage.graph.mockRejectedValueOnce(new Error('db locked'))
    mount(<LineagePage />)
    await flush()
    expect(useLineageStore.getState().status).toBe('error')
    // 稳定外壳：同一工具栏在 error 态在场（模式/侧栏开关可用）
    expect(host?.querySelector('[data-testid="lineage-mode-bar"]')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-nav-collapse"]')).not.toBeNull()
    const alert = host?.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('脉络图加载失败')
    expect(alert?.textContent).toContain('db locked') // 真实原因
    // 独立重试入口：lineage-load-retry；不是保存重试/history 重试
    const retry = host?.querySelector<HTMLButtonElement>('[data-testid="lineage-load-retry"]')
    expect(retry).not.toBeNull()
    expect(retry?.textContent).toBe('重试')
    expect(alert?.contains(retry as Node)).toBe(true)
    expect(host?.querySelector('[data-testid="lineage-save-retry"]'), '不复用保存重试').toBeNull()
    expect(host?.querySelector('[data-testid="lineage-save-error"]'), 'graph load error 不与 write error 告警合并').toBeNull()
    expect(host?.querySelector('.tl-content'), 'error 态不渲染画布内容层').toBeNull()
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    await act(async () => {
      retry?.click()
    })
    await flush()
    expect(host?.textContent).toContain('扩散模型起点')
    expect(host?.querySelector('[role="alert"]'), '恢复后告警消失').toBeNull()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(2)
  })

  it('store 数据缓存：Page 卸载后 nodes/edges 驻留（03/04 消费面免二次取数）', async () => {
    const g = chain()
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: g })
    mount(<LineagePage />)
    await flush()
    act(() => {
      root?.unmount()
    })
    root = null
    expect(useLineageStore.getState().nodes.length).toBe(3)
    expect(useLineageStore.getState().status).toBe('ready')
  })
})
