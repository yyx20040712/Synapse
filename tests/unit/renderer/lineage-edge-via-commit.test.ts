// @vitest-environment jsdom
/**
 * [R2-C3] 手动调线统一提交门（edge-via-commit.commitEdgeVia）—— 首红测试组
 * （TDD）。
 *
 * 合同：四个手动 via 提交口（拖顶点松手/拖段松手含自动线物化/双击加点/
 * 菜单删点）收敛本门单点——
 * - 非法 via（穿第三卡/月标注/年份头——圆角采样谓词与 routeAll 终门同源，
 *   经 routeEdge 单边复算承载，不另写谓词）松手即回弹：不写库、零撤销
 *   单元、零 dirty、toast '落点无可行走线，已回弹' 恰一次；
 * - via=null/空数组=清除回自动路由，免门直写（null 分支先于宿主检查）；
 * - host=null（会话已死）=防御拒写；
 * - 纯函数一致性：同一 manual via 的 routeEdge 单边 clearance 与 routeAll
 *   全图该边 clearance 全等（提交门谓词=终门谓词同源断言，免 DOM）。
 * always-active 裸 describe。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ lineage: { graph: vi.fn() } })
void stubApi

import type { LineageEdge, LineageNode, LineageViaPoint } from '../../../src/shared/models/lineage'
import { commitEdgeVia } from '../../../src/renderer/features/lineage/edge-via-commit'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { routeAll, routeEdge, type EdgeGeomInput, type LayoutSnapshot } from '../../../src/renderer/features/lineage/lineage-routing'

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 5, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

function edge(id: string, from: string, to: string, via?: LineageViaPoint[]): LineageEdge {
  return { id, fromNode: from, toNode: to, label: `线${id}`, dashed: false, color: '#1e3a8a', ...(via !== undefined ? { via } : {}), createdAt: 't', updatedAt: 't' }
}

/** 卡 rect 桩（jsdom 零布局——lineage-edge-overlay.test 同型） */
function mockRect(el: Element, x: number, y: number, w: number, h: number): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
}

/** 几何（own 域——content 基准 (0,0)+s_eff=1）：A/B 同列竖叠、C 第三卡右侧
 *  （legal via x=300 空带净空；illegal via x=464 穿 C 膨胀带 [396,532]×[96,176]） */
const CARDS: Array<[string, number, number]> = [
  ['A', 100, 100],
  ['B', 100, 300],
  ['C', 400, 100]
]
const VIA_LEGAL: LineageViaPoint[] = [{ x: 300, y: 136 }, { x: 300, y: 336 }]
const VIA_THROUGH_C: LineageViaPoint[] = [{ x: 464, y: 136 }, { x: 464, y: 336 }]

let content: HTMLElement | null = null

/** DOM 夹具：.tl-content（基准 rect 0,0）+三卡+宿主 svg（parentElement=content） */
function mountHost(): SVGSVGElement {
  content = document.createElement('div')
  content.className = 'tl-content'
  mockRect(content, 0, 0, 1000, 800)
  for (const [id, x, y] of CARDS) {
    const card = document.createElement('div')
    card.className = 'tl-card'
    card.dataset.nodeId = id
    mockRect(card, x, y, 128, 72)
    content.appendChild(card)
  }
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  content.appendChild(host)
  document.body.appendChild(content)
  return host
}

/** store 直置图态（load 互锁面绕开——lineage-edge-edit-ui 同型） */
function seedStore(e: LineageEdge): void {
  useLineageStore.setState({
    nodes: CARDS.map(([id]) => node(id)),
    edges: [e],
    saveStatus: 'clean', queue: [], undoStack: [], redoStack: []
  })
}

beforeEach(() => {
  toastStoreSpy.mockClear()
})

afterEach(() => {
  content?.remove()
  content = null
  useLineageStore.setState({ nodes: [], edges: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
})

describe('R2-C3 手动调线统一提交门 commitEdgeVia', () => {
  it('合法 via：提交返回 true+store via 更新+一撤销单元（dirty 入队）', () => {
    seedStore(edge('e1', 'A', 'B', [{ x: 200, y: 200 }]))
    const host = mountHost()
    const before = useLineageStore.getState().undoStack.length
    const ok = commitEdgeVia({ host, edge: useLineageStore.getState().edges[0]!, via: VIA_LEGAL })
    expect(ok).toBe(true)
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toEqual(VIA_LEGAL)
    expect(s.undoStack.length).toBe(before + 1) // 一提交=一编辑单元
    expect(s.saveStatus).toBe('dirty')
    expect(s.queue.some((a) => a.kind === 'upsert-edge' && a.input.via === VIA_LEGAL)).toBe(true)
  })

  it('via 穿第三卡：返回 false+via 原样+零单元零 dirty 零入队+toast 精确文案恰一次', () => {
    seedStore(edge('e1', 'A', 'B', VIA_LEGAL))
    const host = mountHost()
    const before = useLineageStore.getState()
    const ok = commitEdgeVia({ host, edge: before.edges[0]!, via: VIA_THROUGH_C })
    expect(ok).toBe(false)
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toEqual(VIA_LEGAL) // 回弹：库值原样
    expect(s.undoStack.length).toBe(before.undoStack.length) // 零撤销单元
    expect(s.saveStatus).toBe('clean') // 零 dirty
    expect(s.queue).toHaveLength(0) // 零入队
    expect(toastStoreSpy).toHaveBeenCalledTimes(1)
    expect(toastStoreSpy).toHaveBeenCalledWith('落点无可行走线，已回弹', 'error')
  })

  it('via=null：免门直写（返回 true+via 清除回自动路由）；host=null 同样成立（null 分支先于宿主检查）', () => {
    seedStore(edge('e1', 'A', 'B', VIA_LEGAL))
    const ok = commitEdgeVia({ host: mountHost(), edge: useLineageStore.getState().edges[0]!, via: null })
    expect(ok).toBe(true)
    expect(useLineageStore.getState().edges[0]!.via).toBeUndefined()
    // 空数组与 null 同义归一（N-1：清除回自动路由）
    seedStore(edge('e1', 'A', 'B', VIA_LEGAL))
    expect(commitEdgeVia({ host: null, edge: useLineageStore.getState().edges[0]!, via: [] })).toBe(true)
    expect(useLineageStore.getState().edges[0]!.via).toBeUndefined()
  })

  it('host=null（会话已死）：防御拒写——返回 false+零写零单元零 toast', () => {
    seedStore(edge('e1', 'A', 'B', VIA_LEGAL))
    const before = useLineageStore.getState()
    const ok = commitEdgeVia({ host: null, edge: before.edges[0]!, via: VIA_THROUGH_C })
    expect(ok).toBe(false)
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toEqual(VIA_LEGAL)
    expect(s.undoStack.length).toBe(before.undoStack.length)
    expect(s.saveStatus).toBe('clean')
    expect(toastStoreSpy).not.toHaveBeenCalled()
  })

  it('谓词同源：同一 manual via 的 routeEdge 单边与 routeAll 全图 clearance 全等（非法 blocked/合法净空双锚）', () => {
    const snap: LayoutSnapshot = {
      cards: new Map(CARDS.map(([id, x, y]) => [id, { x, y, w: 128, h: 72 }] as const)),
      labels: [], frames: [], yearHeads: [], contentW: 600
    }
    for (const via of [VIA_THROUGH_C, VIA_LEGAL]) {
      const input: EdgeGeomInput = { edgeId: 'e1', sourceId: 'A', targetId: 'B', via }
      const single = routeEdge(input, snap)
      const [inAll] = routeAll([input, { edgeId: 'e2', sourceId: 'A', targetId: 'C' }], snap)
      expect(single.route).toBe('manual-override')
      expect(inAll!.route).toBe('manual-override')
      expect(inAll!.clearance).toBe(single.clearance) // 提交门谓词=终门谓词
      expect(inAll!.d).toBe(single.d)
    }
    // 手推锚定：VIA_THROUGH_C 横段 y=136 穿 C 膨胀带 → 三档均碰障=blocked 空 d
    expect(routeEdge({ edgeId: 'e1', sourceId: 'A', targetId: 'B', via: VIA_THROUGH_C }, snap).clearance).toBe('blocked')
  })
})
