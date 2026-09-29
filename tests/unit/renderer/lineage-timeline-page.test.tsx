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
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ lineage: { graph: vi.fn() } })

import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'year' | 'month' | 'x' | 'y' | 'paperId' | 'title'>> = {}
): LineageNode {
  return {
    id,
    // 显式 null（主题节点）不可被默认值吞掉——?? 对 null 同样走右侧
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    coreIdea: '',
    year: patch.year ?? null,
    x: patch.x ?? null,
    y: patch.y ?? null,
    month: patch.month ?? null,
    slot: null,
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', kind: 'tree', sub: null, createdAt: 't', updatedAt: 't' }
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
  useLineageStore.setState({ nodes: [], edges: [], status: 'loading', error: null })
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

  it('空图空态文案（[T3-P7B] 工具条随票移入 .timeline——导入/添加引导在场、编辑死按钮零）', () => {
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(host?.textContent).toContain('暂无脉络图——导入草稿或添加节点')
    // [T3-P7B 修订] P6 期「零按钮」断言随工具条移入（D-P7B-1）失效——空图
    // bootstrap 路径（导入）保活；编辑面死按钮（弹层交互钮）仍零
    expect(host?.querySelector('.timeline .lg-toolbar')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-import"]')).not.toBeNull()
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
  it('loading：挂载期呈加载文案，graph 取数一次', async () => {
    stubApi.lineage.graph.mockReturnValue(new Promise(() => undefined))
    mount(<LineagePage />)
    expect(host?.textContent).toContain('正在加载脉络图')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({})
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
    expect(host?.textContent).toContain('暂无脉络图——导入草稿或添加节点')
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
