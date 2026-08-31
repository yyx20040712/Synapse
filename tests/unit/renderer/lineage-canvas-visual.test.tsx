// @vitest-environment jsdom
/**
 * [R2-LG11] LineageCanvas 浅色严谨板视觉测试（锁定合约；自 lineage-
 * canvas.test.tsx 拆出——ESLint max-lines 500 红线，视觉断言面独立
 * 成件；always-active——不经 guardedDescribe）。
 *
 * 覆盖：浅色宿主（夜幕消费清零防回归）/白卡边框编码四态（决1 矩阵）/
 * 夜幕残留 0 计数/foreignObject 题名换行（U2a）/层带浅色/边三型色
 * （§1.1.3 矩阵）/图例四项真实文本。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageCanvas } from '../../../src/renderer/features/lineage/LineageCanvas'

function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'year' | 'x' | 'y' | 'paperId' | 'title'>> = {}
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
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string, kind: LineageEdge['kind'] = 'tree'): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', kind, createdAt: 't', updatedAt: 't' }
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

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('R2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）', () => {
  it('浅色宿主：svg 被 .lineage-host 包裹；夜幕类与装饰层不存在（夜幕消费清零防回归）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const svg = host?.querySelector('[data-testid="lineage-canvas"]')
    expect(svg?.parentElement?.classList.contains('lineage-host')).toBe(true)
    expect(host?.querySelector('.lineage-night')).toBeNull()
    expect(host?.querySelectorAll('[data-night-decor]').length).toBe(0)
  })

  it('白卡边框编码四态（决1 矩阵）：核心 accent 1.5 实线/普通 branch 1 实线/主题 branch 1 虚线/综述 branch 1 虚线；选中 +0.75', () => {
    const nodes = [
      node('CORE', { year: 2020, title: '集大成研究' }),
      node('R1', { year: 2021, title: '开宗论文甲' }),
      node('R2', { year: 2021, title: '开宗论文乙' }),
      node('T', { year: 2021, paperId: null, title: '主题分组' }),
      node('S', { year: 2022, title: '领域综述回顾' })
    ]
    // CORE 出度 2（开宗立派=被 ≥2 继承者引用——isCore 出度口径，树合法
    // 单父形态；初版入度夹具=多父非法图直喂，2026-08-29 真机复评修正）
    const edges = [edge('CORE', 'R1'), edge('CORE', 'R2'), edge('CORE', 'T'), edge('CORE', 'S')]
    mount(<LineageCanvas nodes={nodes} edges={edges} selectedNodeId="CORE" />)
    // 文献·核心（出度 2 研究性论文）：accent 1.5 实线+选中加粗 2.25
    const core = host?.querySelector('[data-node-id="CORE"] rect')
    expect(core?.getAttribute('stroke')).toBe('var(--accent)')
    expect(core?.getAttribute('stroke-width')).toBe('2.25')
    expect(core?.getAttribute('stroke-dasharray')).toBeNull()
    expect(core?.getAttribute('data-selected')).toBe('true')
    expect(core?.getAttribute('fill')).toBe('#ffffff')
    // 文献·普通：branch 1 实线（未选中）
    const plain = host?.querySelector('[data-node-id="R1"] rect')
    expect(plain?.getAttribute('stroke')).toBe('var(--node-branch)')
    expect(plain?.getAttribute('stroke-width')).toBe('1')
    expect(plain?.getAttribute('stroke-dasharray')).toBeNull()
    expect(plain?.getAttribute('data-selected')).toBe('false')
    // 主题（paperId null）：branch 1 虚线 6 4
    const theme = host?.querySelector('[data-node-id="T"] rect')
    expect(theme?.getAttribute('stroke')).toBe('var(--node-branch)')
    expect(theme?.getAttribute('stroke-width')).toBe('1')
    expect(theme?.getAttribute('stroke-dasharray')).toBe('6 4')
    // 综述（isSurvey 题名）：branch 1 虚线 6 4+data-kind 扩第四值
    const survey = host?.querySelector('[data-node-id="S"] rect')
    expect(survey?.getAttribute('stroke')).toBe('var(--node-branch)')
    expect(survey?.getAttribute('stroke-width')).toBe('1')
    expect(survey?.getAttribute('stroke-dasharray')).toBe('6 4')
    expect(host?.querySelector('[data-node-id="S"]')?.getAttribute('data-kind')).toBe('survey')
  })

  it('夜幕残留防回归：渐变 defs/角饰/glow 滤器全不存在（0 计数）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    expect(host?.querySelectorAll('svg defs').length).toBe(0)
    expect(host?.querySelectorAll('path[data-corner]').length).toBe(0)
    expect(host?.querySelectorAll('svg filter').length).toBe(0)
    expect(host?.querySelectorAll('svg [filter]').length).toBe(0)
  })

  it('F-LG13 题名滚动区（U2a 改向）：长题名 HTML div 完整在 DOM（无 line-clamp）+overflowY auto+细滚动条+统一卡高 110+底行占位+title 全文 tooltip', () => {
    const long = '长'.repeat(40)
    const nodes = [node('L', { year: 2020, title: long })]
    mount(<LineageCanvas nodes={nodes} edges={[]} />)
    const fo = host?.querySelector('[data-node-id="L"] foreignObject')
    expect(fo).not.toBeNull()
    // 骨架：:scope 限 foreignObject 直子容器 > 内层题名 div（CSS 后代
    // 选择器是文档级判定——宿主外还有 div 祖先，裸 'div div' 会命中容器；
    // jsdom 进 DOM 树无布局——主控裁决 5：只断在场+style 字面，不断几何）
    const div = fo?.querySelector(':scope > div > div')
    expect(div).not.toBeNull()
    expect(div?.textContent).toBe(long)
    const st = div?.getAttribute('style') ?? ''
    // 题名区滚动（F-LG13 用户令「信息显示不下给题目加滚动条」）：完整文本
    // 在 DOM+overflow-y auto+细滚动条；line-clamp 三行截断已删（方案切换=
    // 删旧——style 字面不得再现 clamp/box 形态）
    expect(st).toContain('overflow-y: auto')
    expect(st).toContain('scrollbar-width: thin')
    expect(st).not.toContain('-webkit-line-clamp')
    expect(st).not.toContain('-webkit-box')
    // 统一卡高（INV-38 修订）：恒 110（题名溢出走滚动非增高——旧分档 100 红）
    expect(host?.querySelector('[data-node-id="L"] rect')?.getAttribute('height')).toBe('110')
    // 底行信息区（F-LG14 填充锚——含金量/年份/标签）：恒 24px 在场承载年份
    const footer = host?.querySelector('[data-node-id="L"] [data-card-footer]')
    expect(footer).not.toBeNull()
    expect(footer?.getAttribute('style')).toContain('height: 24px')
    expect(footer?.textContent).toBe('2020')
    // 全文 tooltip=题名 div title 属性（HTML 原生零依赖；SVG <title> 元素
    // 与题名文本同名双元素撞 e2e getByText strict——T1 实录改道，属性值
    // 不入 textContent 单源保持）
    expect(div?.getAttribute('title')).toBe(long)
    // 防回归：卡内不得再渲染 SVG <title> 元素（strict violation 形态锁）
    expect(host?.querySelector('[data-node-id="L"] title')).toBeNull()
  })

  it('层带浅色：线 var(--border) 实线（dasharray null）；菱形刻度 branch；年份标 text-dim UI 字体；「YYYY 年」逐字保留', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const lines = host?.querySelectorAll('[data-layer-year] line')
    expect(lines?.length).toBe(3)
    for (const l of lines ?? []) {
      expect(l.getAttribute('stroke')).toBe('var(--border)')
      expect(l.getAttribute('stroke-dasharray')).toBeNull()
    }
    const ticks = host?.querySelectorAll('[data-layer-year] rect[data-band-tick]')
    expect(ticks?.length).toBe(3)
    for (const t of ticks ?? []) {
      expect(t.getAttribute('fill')).toBe('var(--node-branch)')
      expect(t.getAttribute('transform')).toContain('rotate(45)')
    }
    const labels = host?.querySelectorAll('[data-layer-year] text')
    expect(labels?.length).toBe(3)
    for (const t of labels ?? []) {
      expect(t.getAttribute('fill')).toBe('var(--text-dim)')
      expect(t.getAttribute('style') ?? '').not.toContain('font-display')
    }
    expect(host?.textContent).toContain('2020 年')
  })

  it('边三型色（§1.1.3 矩阵）：普通 branch 1.2 实线/推断 #8a94a6 虚线 5 4/综述关联 survey-edge 1.4 虚线 2 3（优先级>推断）', () => {
    const nodes = [
      node('A', { year: 2020, title: '源头' }),
      node('B', { year: 2021, title: '承接' }),
      node('C', { year: 2022, title: '流变' })
    ]
    const inferred: LineageEdge = { ...edge('A', 'B'), label: '谱系推断' }
    const solid: LineageEdge = { ...edge('B', 'C'), label: '实链·继承' }
    mount(<LineageCanvas nodes={nodes} edges={[inferred, solid]} />)
    const p1 = host?.querySelector('[data-edge-id="e-A-B"]')
    expect(p1?.getAttribute('stroke')).toBe('#8a94a6')
    expect(p1?.getAttribute('stroke-width')).toBe('1.2')
    expect(p1?.getAttribute('stroke-dasharray')).toBe('5 4')
    expect(p1?.getAttribute('filter')).toBeNull()
    const p2 = host?.querySelector('[data-edge-id="e-B-C"]')
    expect(p2?.getAttribute('stroke')).toBe('var(--node-branch)')
    expect(p2?.getAttribute('stroke-width')).toBe('1.2')
    expect(p2?.getAttribute('stroke-dasharray')).toBeNull()
    expect(p2?.getAttribute('filter')).toBeNull()
    // 综述关联边（任一端 isSurvey）优先于推断标记（二次挂载前清首宿主）
    act(() => {
      root?.unmount()
    })
    host?.remove()
    const nodes2 = [node('P', { year: 2020, title: '基础研究' }), node('S', { year: 2021, title: '系统综述' })]
    const ref: LineageEdge = { ...edge('P', 'S'), label: '综述关联（推断）' }
    mount(<LineageCanvas nodes={nodes2} edges={[ref]} />)
    const p3 = host?.querySelector('[data-edge-id="e-P-S"]')
    expect(p3?.getAttribute('stroke')).toBe('var(--survey-edge)')
    expect(p3?.getAttribute('stroke-width')).toBe('1.4')
    expect(p3?.getAttribute('stroke-dasharray')).toBe('2 3')
  })

  it('R2-LG12 参考边：kind=ref 直读——survey-edge 1.4 虚线 2 3；优先级 ref>推断（label 含「推断」仍 survey-edge 色）', () => {
    // 两端均非综述题名：隔离 kind 直读判定（不与 surveyIds 管道混源）
    const nodes = [
      node('P', { year: 2020, title: '基础研究' }),
      node('C', { year: 2021, title: '后续工作' })
    ]
    const ref: LineageEdge = { ...edge('P', 'C'), label: '参考（推断）', kind: 'ref' }
    mount(<LineageCanvas nodes={nodes} edges={[ref]} />)
    const p = host?.querySelector('[data-edge-id="e-P-C"]')
    expect(p?.getAttribute('stroke')).toBe('var(--survey-edge)')
    expect(p?.getAttribute('stroke-width')).toBe('1.4')
    expect(p?.getAttribute('stroke-dasharray')).toBe('2 3')
    // 变异红证锚：优先级翻转（推断先判）会把该边染成 #8a94a6 虚线 5 4
    expect(p?.getAttribute('stroke')).not.toBe('#8a94a6')
  })

  it('图例四项真实文本（浅色白卡圆角非交互——data-legend+aria-hidden）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const legend = host?.querySelector('[data-legend]')
    expect(legend).not.toBeNull()
    expect(legend?.getAttribute('aria-hidden')).toBe('true')
    expect(legend?.textContent).toContain('核心文献')
    expect(legend?.textContent).toContain('普通文献')
    expect(legend?.textContent).toContain('主题分组')
    expect(legend?.textContent).toContain('综述关联')
  })
})
