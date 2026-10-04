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
 * 文本」红线）/data-node-id 结构锚（e2e/Board 测试同名接缝）/空图空态
 * 文案/Page 三态（loading/ready/error+重试）/store 数据缓存（卸载后驻留）。
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
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }
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

  it('空图空态文案（[②U2/A11] 工具组仅 edit 可见；[F-ALIGN-01] 文案沿承 D6 不引导+添加节点钮零残留负锚）', () => {
    useLineageViewStore.setState({ mode: 'edit' })
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(host?.textContent).toContain('暂无脉络图')
    // [T3-P7B 修订] P6 期「零按钮」断言随工具条移入（D-P7B-1）失效；编辑面
    // 死按钮（弹层交互钮）仍零；[F-ALIGN-01] 添加节点钮随手动添加路径退役
    // ——零残留负锚（在场即红）；[F-BAKRET-01] 导入按钮随草稿导入链退役
    // ——零残留负锚（在场即红）
    expect(host?.querySelector('.timeline .lg-toolbar')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-add-node"]')).toBeNull()
    expect(host?.querySelector('[data-testid="lineage-import"]')).toBeNull()
    expect(host?.querySelector('[data-testid="edge-pop"]')).toBeNull()
  })

  it('空→非空转场：节点入图即渲染（时间线容器常驻无监听重绑面）', () => {
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(host?.textContent).toContain('暂无脉络图')
    const g = chain()
    act(() => {
      root?.render(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    })
    expect(host?.textContent).toContain('扩散模型起点')
    expect(host?.querySelectorAll('[data-node-id]').length).toBe(3)
  })
})

describe('LineagePage —— 取数三态（lineage.store 数据单源）', () => {
  it('loading：挂载期呈加载文案，graph 取数一次（folderId 恒显式——主图兜底）', async () => {
    stubApi.lineage.graph.mockReturnValue(new Promise(() => undefined))
    mount(<LineagePage />)
    expect(host?.textContent).toContain('正在加载脉络图')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: '__main__' })
  })

  it('[F-LGRAPH-01①U4] 编排重构：顶栏=模式栏（browse 缺省）+左侧导航窗格在场；顶栏并集切换器退役负锚（在场即红）；缺省图=库页上下文同步（未选=主图）', async () => {
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
    // 图名=模式栏右侧（folders 单源——主图兜底「主图」）
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

  it('[R6] 空态两分支：子图空图=「该文件夹无脉络图」提示在场；主图空图=不显示（通用空态承载）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    // 主图空：不显示该提示（「暂无脉络图」通用空态承载）
    mount(<LineagePage />)
    await flush()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(host?.textContent).not.toContain('该文件夹无脉络图')
    expect(host?.textContent).toContain('暂无脉络图')
    // 子图空：挂载后经导航窗格切图（挂载同步不覆盖用户/切图选择）
    act(() => {
      useLineageStore.getState().setFolder('f-x')
    })
    await flush()
    expect(host?.textContent).toContain('该文件夹无脉络图') // 子图空=提示在场
  })

  it('ready：取数成功渲染节点真实文本（经 store 分发，时间线消费）', async () => {
    const g = chain()
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: g })
    mount(<LineagePage />)
    await flush()
    expect(host?.textContent).toContain('扩散模型起点')
    expect(useLineageStore.getState().status).toBe('ready')
  })

  it('ready 空图：空态文案（列表型空非错误）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    mount(<LineagePage />)
    await flush()
    expect(host?.textContent).toContain('暂无脉络图')
  })

  it('error：取数失败呈错误条+重试按钮；重试再取数成功恢复', async () => {
    stubApi.lineage.graph.mockRejectedValueOnce(new Error('db locked'))
    mount(<LineagePage />)
    await flush()
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain('脉络图加载失败')
    const retry = host?.querySelector('button') as HTMLButtonElement
    expect(retry.textContent).toBe('重试')
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    await act(async () => {
      retry.click()
    })
    await flush()
    expect(host?.textContent).toContain('扩散模型起点')
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
