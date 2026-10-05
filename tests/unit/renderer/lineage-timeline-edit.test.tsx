// @vitest-environment jsdom
/**
 * [T3-P7B] LineageTimeline 编辑交互接线测试（工具条换装 D-P7B-1——自
 * lineage-timeline.test 拆出 2026-09-27：文件 500 行红线）。
 * [F-LGRAPH-01①U3] 受控化改写：「编辑脉络」toggle 退役（退役清单行 2——三
 * 模式栏替代，写路径=lineage-view.store.setMode；本件直驱 store 等价事件序
 * ——ModeBar 组件面=lineage-mode-bar.test 独立锁）。
 * [F-LGRAPH-01②U8] useEdgeComposer 拾取连线流+EdgeTypePopover 线型弹层
 * 随「新建连线」按钮/kind 四值体系退役删除（mockup §3.8 行 3/6——画线工具
 * U3 落地替代）；本件保留工具条换装+保存态 chips 面。
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
    color: '#3a5bd9',
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

describe('T3-P7B Timeline 编辑交互接线（工具条换装——U3 受控化/U8 弹层退役）', () => {
  it('工具组换装 [②U2]：.lg-toolbar 挂 .timeline 内；browse=组隐藏（drag-hint）；edit=全控件在场；「新建连线」退役负锚（行 3）', () => {
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 })]}
        edges={[]}
      />
    )
    const timeline = req('.timeline')
    expect(timeline.classList.contains('editing')).toBe(false)
    expect(req('.lg-toolbar .drag-hint').textContent).toBe('✋ 拖动空白＝平移画布 · 滚轮浏览时间线') // browse 态文案（三模式）
    // [②U2/A11] 工具组仅 edit 可见——browse 态控件零
    expect(q('[data-testid="lineage-add-node"]')).toBeNull()
    expect(q('[data-testid="lineage-save-btn"]')).toBeNull()
    // [F-LGRAPH-01②U8] 「新建连线」按钮退役（画线工具替代）——负锚（在场即红）
    expect(q('[data-testid="lineage-link-btn"]')).toBeNull()
    // [F-BAKRET-01] 导入按钮随导入链退役——零残留负锚（在场即红）
    expect(q('[data-testid="lineage-import"]')).toBeNull()
    // [F-LGRAPH-01①U3] 「编辑脉络/完成编辑」toggle 退役——负锚（在场即红）
    expect(q('[data-testid="lineage-edit-toggle"]')).toBeNull()
    setMode('edit')
    expect(timeline.classList.contains('editing')).toBe(true)
    // edit=工具组全控件在场+新文案；[F-ALIGN-01] 添加节点钮随手动添加路径退役
    // ——edit 态零残留负锚（在场即红）
    expect(q('[data-testid="lineage-add-node"]')).toBeNull()
    for (const id of ['lineage-save-btn', 'lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-undo', 'lineage-redo']) {
      expect(q(`[data-testid="${id}"]`)).not.toBeNull()
    }
    // [F-UIRES-03 C3] 首段「点卡片月标改月」随改月链退役删（INV-107）
    expect(req('.lg-toolbar .drag-hint').textContent).toBe('编辑中：拖动＝月内调序 · 画线＝点线型工具后从卡边拖出')
  })

  it('保存态行内错误 [②U2]（退役行 4：chip 零残留）：error 态=保存钮行内错误+重试钮', async () => {
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 })]}
        edges={[]}
      />
    )
    setMode('edit')
    act(() => {
      useLineageStore.setState({ saveStatus: 'error', lastWriteError: '写入失败' })
    })
    // 退役行 4 负锚：旧 chip testid 零残留
    expect(q('[data-testid="lineage-save-status"]')).toBeNull()
    expect(q('[data-testid="lineage-retry-save"]')).toBeNull()
    expect(req('[data-testid="lineage-save-error"]').textContent).toContain('写入失败')
    expect(q('[data-testid="lineage-save-retry"]')).not.toBeNull()
  })
})
