// @vitest-environment jsdom
/**
 * [T3-P7B] useEdgeComposer 状态机直测——票面②迁移表全量兑现（宪法状态纪律：
 * mode×picker×popover 三轴态空间逐格+跨格序列）。
 *
 * 合法态=view[idle,closed]+edit[idle|source|target,closed]+
 * edit[idle,edit|create]（popover 开必 picker=idle——互斥）。
 * UI 预检（D-P7B-6）：自环/同端点对无向查重→toast 停在 target 态不回 idle；
 * Esc 优先序=popover 先关＞picker 摘回 idle（mode 不动）；退出编辑强制归位。
 * 驱动纪律：一用户动作一 act（api 经 Probe render 期重赋值——同 act 连调两
 * 方法=陈旧闭包，非真实事件序）。always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageEdge } from '../../../src/shared/models/lineage'
import {
  useEdgeComposer,
  type ClickEventLike,
  type EdgeComposerApi
} from '../../../src/renderer/features/lineage/useEdgeComposer'

// act() 环境声明（lineage-timeline.test 同口径）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function edge(id: string, from: string, to: string, kind: LineageEdge['kind'] = 'tree'): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind, sub: null, createdAt: 't', updatedAt: 't' }
}

/** 事件探针（clientX/Y+stopPropagation 是否被调） */
function ev(x = 100, y = 200): ClickEventLike & { stopped: () => boolean } {
  let s = false
  return { clientX: x, clientY: y, stopPropagation: () => { s = true }, stopped: () => s }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let api: EdgeComposerApi | null = null

/** 渲染探针组件：hook 返回值捕获到 api（render 期赋值——act 内同步可见） */
function mountComp(edges: LineageEdge[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<Probe edges={edges} />)
  })
}

function Probe(props: { edges: LineageEdge[] }): null {
  api = useEdgeComposer(props.edges)
  return null
}

/** 一用户动作一 act（act 后 api 已刷新——闭包不陈旧） */
function step(fn: () => void): void {
  act(() => {
    fn()
  })
}

/** document 级 click（外点关闭路径——bubbles 到 document listener） */
function docClick(target?: Element): void {
  act(() => {
    ;(target ?? document).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

function pressEsc(): void {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })
}

/** 便捷链：入编辑态并启动拾取（逐步——真实事件序） */
function enterEditAndPick(): void {
  step(() => api!.toggleEdit())
  step(() => api!.startLinkPick())
}

beforeEach(() => {
  toastStoreSpy.mockClear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  api = null
})

describe('T3-P7B useEdgeComposer 状态机（迁移表全量）', () => {
  it('初始态：view[idle,closed]；view 态点命中层/新建连线=no-op（handler 闸+D-21）', () => {
    mountComp([edge('e1', 'A', 'B')])
    expect(api?.mode).toBe('view')
    expect(api?.picker).toBe('idle')
    expect(api?.sourceId).toBeNull()
    expect(api?.popover).toEqual({ kind: 'closed' })
    // view 态点命中层=双闸 handler 侧 no-op（CSS 闸之外的第二闸）
    step(() => api!.handleEdgeHitClick('e1', ev()))
    expect(api?.popover).toEqual({ kind: 'closed' })
    // view 态「新建连线」不启动（编辑模式内才显/才生效——D-21）
    step(() => api!.startLinkPick())
    expect(api?.picker).toBe('idle')
    expect(toastStoreSpy).not.toHaveBeenCalled()
  })

  it('toggle view→edit：归位零残留（picker/popover 均基线）', () => {
    mountComp([edge('e1', 'A', 'B')])
    step(() => api!.toggleEdit())
    expect(api?.mode).toBe('edit')
    expect(api?.picker).toBe('idle')
    expect(api?.popover).toEqual({ kind: 'closed' })
  })

  it('「新建连线」click：edit 态 idle→source+toast（.link-pick 态派生）', () => {
    mountComp([edge('e1', 'A', 'B')])
    enterEditAndPick()
    expect(api?.picker).toBe('source')
    expect(api?.isPicking).toBe(true)
    expect(toastStoreSpy).toHaveBeenCalledWith('新建连线：点击源卡片', 'info')
  })

  it('点卡 source→target：源卡 id 记录+toast「再点击目标卡片」+stopPropagation', () => {
    mountComp([edge('e1', 'A', 'B')])
    enterEditAndPick()
    const e = ev()
    let consumed = false
    step(() => {
      consumed = api!.handleCardClick('A', e)
    })
    expect(consumed).toBe(true) // 拾取语义消费——不转发 onNodeClick 选中
    expect(e.stopped()).toBe(true)
    expect(api?.picker).toBe('target')
    expect(api?.sourceId).toBe('A')
    expect(toastStoreSpy).toHaveBeenCalledWith('再点击目标卡片', 'info')
  })

  it('点卡 target 同卡=自环：toast+停在 target 态不回 idle（D-P7B-6）', () => {
    mountComp([edge('e1', 'A', 'B')])
    enterEditAndPick()
    step(() => api!.handleCardClick('A', ev()))
    toastStoreSpy.mockClear()
    let consumed = false
    step(() => {
      consumed = api!.handleCardClick('A', ev())
    })
    expect(consumed).toBe(true)
    expect(api?.picker).toBe('target')
    expect(api?.sourceId).toBe('A')
    expect(toastStoreSpy).toHaveBeenCalledWith('不能与自身连线（自环）', 'error')
    expect(api?.popover).toEqual({ kind: 'closed' })
  })

  it('点卡 target 同端点对无向已有边（任一方向）=重复：toast+停 target（正反两向各证）', () => {
    mountComp([edge('e1', 'A', 'B', 'ref')])
    enterEditAndPick()
    step(() => api!.handleCardClick('B', ev()))
    toastStoreSpy.mockClear()
    // 正向重复：B→A（既有 A→B）
    step(() => {
      api!.handleCardClick('A', ev())
    })
    expect(api?.picker).toBe('target')
    expect(toastStoreSpy).toHaveBeenCalledWith('两节点间已存在连线', 'error')
    expect(api?.popover).toEqual({ kind: 'closed' })
    // 同向重复：重启拾取选 A→B（既有 A→B 同端点对同向）
    toastStoreSpy.mockClear()
    step(() => api!.startLinkPick())
    step(() => api!.handleCardClick('A', ev()))
    step(() => api!.handleCardClick('B', ev()))
    expect(api?.picker).toBe('target')
    expect(toastStoreSpy).toHaveBeenCalledWith('两节点间已存在连线', 'error')
  })

  it('点卡 target 合法：popover=create[picker 回 idle+源高亮摘除]+坐标透传+stopPropagation', () => {
    // A/B 间无既有边（重复预检面让路——e1=X→Y 不涉 A/B）
    mountComp([edge('e1', 'X', 'Y')])
    enterEditAndPick()
    step(() => api!.handleCardClick('A', ev()))
    const e = ev(320, 240)
    let consumed = false
    step(() => {
      consumed = api!.handleCardClick('B', e)
    })
    expect(consumed).toBe(true)
    expect(e.stopped()).toBe(true)
    expect(api?.popover).toEqual({ kind: 'create', from: 'A', to: 'B', cx: 320, cy: 240 })
    expect(api?.picker).toBe('idle')
    expect(api?.sourceId).toBeNull()
  })

  it('点 .tl-edge-hit：edit 态 idle→popover=edit[edgeId+坐标透传+stopPropagation]', () => {
    mountComp([edge('e1', 'A', 'B')])
    step(() => api!.toggleEdit())
    const e = ev(50, 75)
    step(() => api!.handleEdgeHitClick('e1', e))
    expect(api?.popover).toEqual({ kind: 'edit', edgeId: 'e1', cx: 50, cy: 75 })
    expect(e.stopped()).toBe(true)
    expect(api?.picker).toBe('idle')
  })

  it('popover 开时点卡/点边=no-op（与拾取互斥）：状态零迁移（换目标先关再点）', () => {
    mountComp([edge('e1', 'A', 'B'), edge('e2', 'B', 'C')])
    step(() => api!.toggleEdit())
    step(() => api!.handleEdgeHitClick('e1', ev()))
    // 点另一条边=no-op（popover 不换目标——票面迁移表）
    step(() => api!.handleEdgeHitClick('e2', ev()))
    expect(api?.popover).toEqual({ kind: 'edit', edgeId: 'e1', cx: 100, cy: 200 })
    // 点卡=no-op（不进拾取、不开 create——外点关闭由 document listener 承载）
    let consumed = false
    step(() => {
      consumed = api!.handleCardClick('A', ev())
    })
    expect(consumed).toBe(true) // 消费=不转发选中
    expect(api?.popover).toEqual({ kind: 'edit', edgeId: 'e1', cx: 100, cy: 200 })
    expect(api?.picker).toBe('idle')
  })

  it('popover→closed=外点：document click 弹层外→关；弹层内/svg 命中层点击不关（mockup L769 排除面）', () => {
    mountComp([edge('e1', 'A', 'B')])
    step(() => api!.toggleEdit())
    step(() => api!.handleEdgeHitClick('e1', ev()))
    // 弹层内点击：不关（排除 [data-testid="edge-pop"]）
    const pop = document.createElement('div')
    pop.setAttribute('data-testid', 'edge-pop')
    document.body.appendChild(pop)
    docClick(pop)
    expect(api?.popover).toEqual({ kind: 'edit', edgeId: 'e1', cx: 100, cy: 200 })
    // 命中层点击：不关（排除 svg.tl-edges）
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'tl-edges')
    document.body.appendChild(svg)
    docClick(svg)
    expect(api?.popover.kind).toBe('edit')
    // 弹层外点击：关
    docClick()
    expect(api?.popover).toEqual({ kind: 'closed' })
    pop.remove()
    svg.remove()
  })

  it('Esc 优先序（popover＞picker；mode 不动）：popover 开→只关 popover；picker=target→摘回 idle', () => {
    mountComp([edge('e1', 'A', 'B')])
    step(() => api!.toggleEdit())
    step(() => api!.handleEdgeHitClick('e1', ev()))
    pressEsc()
    expect(api?.popover).toEqual({ kind: 'closed' })
    expect(api?.mode).toBe('edit')
    // 拾取中 Esc：picker→idle+源高亮摘除（mode 不动）
    step(() => api!.startLinkPick())
    step(() => api!.handleCardClick('A', ev()))
    pressEsc()
    expect(api?.picker).toBe('idle')
    expect(api?.sourceId).toBeNull()
    expect(api?.mode).toBe('edit')
    // 全闲时 Esc：no-op
    pressEsc()
    expect(api?.mode).toBe('edit')
  })

  it('toggle edit→view：强制归位（picker 摘+popover 关——mockup L1011）', () => {
    mountComp([edge('e1', 'A', 'B')])
    enterEditAndPick()
    step(() => api!.handleCardClick('A', ev()))
    step(() => api!.toggleEdit())
    expect(api?.mode).toBe('view')
    expect(api?.picker).toBe('idle')
    expect(api?.sourceId).toBeNull()
    expect(api?.popover).toEqual({ kind: 'closed' })
    // popover 开着的归位相位
    step(() => api!.toggleEdit())
    step(() => api!.handleEdgeHitClick('e1', ev()))
    step(() => api!.toggleEdit())
    expect(api?.mode).toBe('view')
    expect(api?.popover).toEqual({ kind: 'closed' })
  })

  it('edit 态 picker=idle+popover=closed 的普通点卡=view 同语义（不消费——选中照常转发）', () => {
    mountComp([edge('e1', 'A', 'B')])
    step(() => api!.toggleEdit())
    const e = ev()
    let consumed = true
    step(() => {
      consumed = api!.handleCardClick('A', e)
    })
    expect(consumed).toBe(false)
    expect(e.stopped()).toBe(false)
  })

  it('[R4] popover=edit 开时点「新建连线」：显式关 popover→[source,closed]（互斥=状态机结构性不变式，非事件序兜底）', () => {
    mountComp([edge('e1', 'A', 'B')])
    step(() => api!.toggleEdit())
    step(() => api!.handleEdgeHitClick('e1', ev()))
    expect(api?.popover.kind).toBe('edit')
    step(() => api!.startLinkPick())
    expect(api?.picker).toBe('source')
    expect(api?.popover).toEqual({ kind: 'closed' })
    expect(toastStoreSpy).toHaveBeenCalledWith('新建连线：点击源卡片', 'info')
  })

  it('跨格序列：edit→popover=edit→toggle view 归位→再入 edit 仍[idle,closed]（退出归位零残留）', () => {
    mountComp([edge('e1', 'A', 'C')])
    step(() => api!.toggleEdit())
    step(() => api!.handleEdgeHitClick('e1', ev()))
    step(() => api!.toggleEdit())
    step(() => api!.toggleEdit())
    expect(api?.mode).toBe('edit')
    expect(api?.picker).toBe('idle')
    expect(api?.popover).toEqual({ kind: 'closed' })
    // 再入后拾取/弹层照常可用（无残留锁死；mode 已 edit——只重启拾取）
    step(() => api!.startLinkPick())
    step(() => api!.handleCardClick('A', ev()))
    step(() => api!.handleCardClick('B', ev(1, 2)))
    expect(api?.popover).toEqual({ kind: 'create', from: 'A', to: 'B', cx: 1, cy: 2 })
  })

  it('预检读面=渲染时 edges 快照：拾取中图上新增同端点对边（props 变化）后重复预检生效', () => {
    mountComp([])
    enterEditAndPick()
    step(() => api!.handleCardClick('A', ev()))
    // edges 引用变化（store 写回填同型）→ 重渲染后预检消费新边集
    act(() => {
      root?.render(<Probe edges={[edge('e1', 'A', 'B', 'manual')]} />)
    })
    step(() => api!.handleCardClick('B', ev()))
    expect(api?.picker).toBe('target') // 重复预检拦下——不进 create
    expect(toastStoreSpy).toHaveBeenCalledWith('两节点间已存在连线', 'error')
  })
})
