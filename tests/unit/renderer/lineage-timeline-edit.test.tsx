// @vitest-environment jsdom
/**
 * [T3-P7B] LineageTimeline 编辑交互接线测试（工具条换装 D-P7B-1——自
 * lineage-timeline.test 拆出 2026-09-27：文件 500 行红线）。
 * [F-LGRAPH-01①U3] 受控化改写：「编辑脉络」toggle 退役（退役清单行 2——三
 * 模式栏替代，写路径=lineage-view.store.setMode；本件直驱 store 等价事件序
 * ——ModeBar 组件面=lineage-mode-bar.test 独立锁）。
 * [F-LGRAPH-01②U8] useEdgeComposer 拾取连线流+EdgeTypePopover 线型弹层
 * 随「新建连线」按钮/kind 四值体系退役删除（mockup §3.8 行 3/6——画线工具
 * U3 落地替代）；旧「工具条换装+保存态 chips 面」两条断言随下条 B5 迁出。
 * [B5 设计稿 §3.1/§3.3/§3.5/§11.2「lineage-timeline-edit：工具栏存在性迁 Page/Toolbar 测试；
 * Timeline 只锁 editing 类和画布；告警测试迁稳定外壳；删 .lg-toolbar 挂 .timeline 与
 * drag-hint/通用重试锁」——wave C 2026-11-25 断言翻转] 工具栏自 LineageTimeline 渲染树迁驻
 * 页面顶部稳定外壳（LineageToolbar，经 LineagePageBody 挂载）：Timeline 渲染树内零工具栏、
 * 零 drag-hint、零缩放角标、零空态文案；本件只锁 .timeline 的模式类与画布结构。
 * 工具栏形态=lineage-toolbar-session；告警=lineage-toolbar-save-error-class 与
 * lineage/lineage-write-failure-source；缩放控件=lineage-toolbar-session。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore, type LineageViewMode } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
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

function edge(from: string, to: string): LineageEdge {
  return {
    id: `e-${from}-${to}`,
    fromNode: from,
    toNode: to,
    label: '',
    dashed: false,
    color: '#1e3a8a',
    createdAt: 't',
    updatedAt: 't'
  }
}
void edge

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
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

/** 模式切换（三模式栏写路径等价——ModeBar onClick→setMode） */
const setMode = (m: LineageViewMode): void => {
  act(() => {
    useLineageViewStore.getState().setMode(m)
  })
}

beforeEach(() => {
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('T3-P7B Timeline 画布结构（[B5 §3.1] 工具栏迁页面顶部稳定外壳——Timeline 渲染树只余画布）', () => {
  it('[B5 §11.2 断言翻转] .timeline 模式类随 mode（browse 无 editing／edit 挂 editing）；渲染树内零工具栏、零 drag-hint', () => {
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 })]}
        edges={[]}
      />
    )
    const timeline = req('.timeline')
    expect(timeline.classList.contains('editing')).toBe(false)
    // 原「.lg-toolbar 挂 .timeline 内；browse=组隐藏（drag-hint）；edit=全控件在场」翻转：
    // 三模式下 Timeline 渲染树内均零工具栏与 drag-hint（工具栏=页面外壳，三模式同一 DOM）
    expect(q('.timeline .lg-toolbar')).toBeNull()
    expect(q('.lg-toolbar')).toBeNull()
    expect(q('[data-testid="lineage-save-btn"]')).toBeNull()
    expect(q('[data-testid="lineage-undo"]')).toBeNull()
    expect(q('[data-testid="drag-hint"]'), 'drag-hint 三态退役零残留').toBeNull()
    expect(q('.drag-hint')).toBeNull()
    // 画布结构在场（Timeline 只锁画布）
    expect(req('.tl-content')).not.toBeNull()
    expect(req('[data-testid="lineage-timeline"]')).toBe(timeline)
    setMode('edit')
    expect(timeline.classList.contains('editing')).toBe(true)
    expect(q('.timeline .lg-toolbar'), 'edit 态渲染树内同样零工具栏').toBeNull()
    expect(q('[data-testid="drag-hint"]')).toBeNull()
    expect(req('.tl-card[data-node-id="A"]')).not.toBeNull() // 真实卡在场
    expect(host?.textContent).toContain('节点A')
  })

  it('[B5 §4.2/§3.5] 右下角缩放角标退役（百分比复位迁工具栏 LineageZoomControls）；教学提示零残留', () => {
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 })]}
        edges={[]}
      />
    )
    expect(q('[data-testid="zoom-badge"]'), 'Timeline 渲染树内零缩放角标').toBeNull()
    expect(q('.zoom-badge')).toBeNull()
    expect(host?.textContent).not.toContain('复位缩放到 100%')
    // 右下角角标相关提示不把「滚动补偿」等机制词带入 UI
    expect(host?.textContent).not.toContain('滚动补偿')
    expect(host?.textContent).not.toContain('平移画布')
    expect(req('[data-testid="tl-zoom-spacer"]'), '缩放滚动域 spacer（机制本体）保留').not.toBeNull()
  })

  it('[B5 §3.3] 空图：保留 .tl-content 与悬浮笔记层，不渲染「暂无脉络图」', () => {
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(req('.tl-content')).not.toBeNull()
    expect(q('.tl-empty'), '空态文案容器退役').toBeNull()
    expect(host?.textContent).not.toContain('暂无脉络图')
    expect(host?.textContent).not.toContain('该文件夹无脉络图')
    expect(host?.querySelector('[data-testid="lineage-timeline"]')).not.toBeNull()
  })

  it('退役入口负锚沿承：添加节点钮／新建连线／导入／编辑脉络 toggle／旧保存态 chip 零残留（在场即红）', () => {
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 })]}
        edges={[]}
      />
    )
    for (const sel of [
      '[data-testid="lineage-add-node"]', // [F-ALIGN-01] 添加节点钮随手动添加路径退役
      '[data-testid="lineage-link-btn"]', // [F-LGRAPH-01②U8] 「新建连线」按钮退役（画线工具替代）
      '[data-testid="lineage-import"]', // [F-BAKRET-01] 导入按钮随导入链退役
      '[data-testid="lineage-edit-toggle"]', // [F-LGRAPH-01①U3] 「编辑脉络/完成编辑」toggle 退役
      '[data-testid="edge-pop"]', // [F-LGRAPH-01②U8] 线型弹层退役
      '[data-testid="lineage-save-status"]', // 退役行 4 chip
      '[data-testid="lineage-retry-save"]' // 退役行 4 chip
    ]) {
      expect(q(sel), `${sel} 应零残留`).toBeNull()
    }
  })
})
