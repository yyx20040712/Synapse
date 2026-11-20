// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U5] 手动调线编辑态交互 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.6+§2.5+F-LINEAGE-02 design-final §2.3：
 * - edit 模式单击线=selected（手柄集显示：via 方柄+端点圆柄）；点空白/Esc=idle。
 * - 拖顶点=一编辑单元（beginUnit——undoStack+1+队列载 via 载荷）；pointerup
 *   落定=selected 保持。
 * - 双击段=段中点加点（via+1）。
 * - 右键线身=菜单（标题「线「名」● 命中」+命名/线形与颜色/重置走线/删除连线）
 *   ；右键顶点=删除顶点菜单；Esc 关闭。
 * - 自动线（无 via）拖段=[ln-C3] up 单写物化（一撤销单元，零位移=段中点）；
 *   中断（pointercancel/Esc）不写不转换；双击加点物化沿承即写。
 * always-active 裸 describe。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() }
})
void stubApi

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { __testAutoscrollState } from '../../../src/renderer/features/lineage/drag-autoscroll'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

/** manual-override 边（via 在场——正交链） */
function edge(id: string, from: string, to: string, via: Array<{ x: number; y: number }>): LineageEdge {
  return { id, fromNode: from, toNode: to, label: `线${id}`, dashed: false, color: '#1e3a8a', via, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const rafs: FrameRequestCallback[] = []

function stubRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
}

const flushRafs = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(0))
  })
}

function mount(nodes: LineageNode[], edges: LineageEdge[]): void {
  stubRaf()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={edges} />)
  })
  act(() => {
    useLineageViewStore.setState({ mode: 'edit' })
  })
}

/** 卡/锚几何定值（jsdom 零布局——gBCR spy） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const click = (el: Element): void => {
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}
const rc = (el: Element, x = 10, y = 10): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  })
}
/** [ln-C3] 段拖手势三拍（命中层 pointerdown→document move/up——own 域直通） */
const segDown = (el: Element, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y }))
  })
}
const docMove = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
  })
}
const docUp = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }))
  })
}

beforeEach(() => {
  // store 直置图态（load 互锁面绕开——测试装配）
  useLineageStore.setState({ saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
})
afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', zoom: 1 })
  useLineageStore.setState({ edges: [], nodes: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
})

/** 布局：A(0,0) B(400,0) 同月框；边 e1 via=[(200,0)]（A 右锚→B 左锚水平线）。
 *  store 态同步（调线域读写经 store 单源——props 仅供渲染面） */
function layout(edgeVia?: Array<{ x: number; y: number }>, third = false, thirdPos: [number, number] = [612, 230]): void {
  const nodes = third ? [node('A'), node('B'), node('C')] : [node('A'), node('B')]
  const edges = [edgeVia === undefined ? { ...edge('e1', 'A', 'B', []), via: undefined } : edge('e1', 'A', 'B', edgeVia)]
  useLineageStore.setState({ nodes, edges: edges as LineageEdge[], saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
  mount(nodes, edges as LineageEdge[])
  const frame = host!.querySelector('.month-frame') as HTMLElement
  stubRect(frame, 0, 0, 800, 200)
  // [F-LANEGRID-01 B2b] content rect 桩（contentH=车道 y 域上界——旧零盒下
  // 横道族退化自动边 blocked）
  stubRect(host!.querySelector('.tl-content') as HTMLElement, 0, 0, 800, 400)
  stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
  stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
  if (third) stubRect(host!.querySelector('.tl-card[data-node-id="C"]') as HTMLElement, thirdPos[0], thirdPos[1])
  flushRafs()
}

const hitOf = (edgeId: string): SVGElement => {
  const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${edgeId}"]`)
  if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
  return el
}

describe('U5 手动调线编辑态', () => {
  it('单击线=selected：手柄集显示（via 方柄+端点圆柄 data-testid）；点空白/Esc=idle', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    expect(host!.querySelectorAll('[data-testid="edge-handle-vertex"]').length).toBe(1)
    expect(host!.querySelectorAll('[data-testid="edge-handle-end"]').length).toBe(2)
    // Esc=idle
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull()
  })

  it('拖顶点=一编辑单元：undoStack+1+队列 upsert-edge 载 via 载荷（软断言 data-attr）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200, clientY: 66 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 220, clientY: 90 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 220, clientY: 90 }))
    })
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before + 1) // 一拖放=一编辑单元
    expect(s.queue.some((a) => a.kind === 'upsert-edge' && a.input.via !== undefined)).toBe(true)
    expect(s.saveStatus).toBe('dirty')
    // 软断言（INV-79 e2e 口径同源——手动面 data-attr）：拖后手柄仍在场（selected 保持）
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
  })

  it('双击段=段中点加点（via+1——数据在手柄在场；[B3b] 夹具 via=格点 198，插入点=最近交点 166=150+8·2）', () => {
    layout([{ x: 198, y: 66 }])
    act(() => {
      hitOf('e1').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 140, clientY: 66 }))
    })
    expect(host!.querySelectorAll('[data-testid="edge-handle-vertex"]').length).toBe(2)
  })

  it('右键线身=菜单：标题「线「名」● 命中」+四菜单项；Esc 关闭', () => {
    layout([{ x: 200, y: 66 }])
    rc(hitOf('e1'), 30, 30)
    // [回炉 R14] 菜单 portal 出宿主——经 document 查询
    const menu = document.querySelector('[data-testid="edge-menu"]')
    expect(menu?.textContent).toContain('线「线e1」● 命中')
    for (const item of ['命名', '线形与颜色', '重置走线', '删除连线']) {
      expect(menu?.textContent).toContain(item)
    }
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull()
  })

  it('右键顶点=「顶点 #N（方柄）● 命中」+删除顶点项；执行=via-1 单元', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    rc(handle, 30, 30)
    const menu = document.querySelector('[data-testid="edge-menu"]')
    expect(menu?.textContent).toContain('顶点 #1（方柄）● 命中')
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      menu!.querySelector('[role="menuitem"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(useLineageStore.getState().undoStack.length).toBe(before + 1)
    // via-1 落库面：唯一拐点（共线）直删→via undefined（回自动路由）。UI 手柄
    // 数断言退役：静态 props 挂载下路由骨架不随 store 写重算（真实面=store
    // 驱动 props+rAF 重路由承载——e2e T12 锚），此处锚 store 面
    expect(useLineageStore.getState().edges[0]?.via).toBeUndefined()
  })

  it('自动线（无 via）双击段=物化首 via（manual-override 转换）', () => {
    layout(undefined)
    act(() => {
      hitOf('e1').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 200, clientY: 66 }))
    })
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toBeDefined()
    expect(s.edges[0]!.via!.length).toBeGreaterThan(0)
  })

  it('[ln-C3] 自动线首按拖段=via 拖后值+恰一撤销单元（末态全等：一次拖段=一步撤销）', () => {
    // 布局同款：A(12,30)/B(412,30) 同行——自动路由=h-slip 直线 (140,66)→(412,66)
    layout(undefined)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 276, 66) // 段中点按下（首按同手势可拖）
    docMove(276, 90) // 法向投影 dy=+24（水平段仅 dy；单行布局无横通道=零磁吸）
    docUp(276, 90)
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before + 1) // 恰一单元（一次拖段≠两步）
    // [B3b 裁决甲] 物化点=最近交点：物化 (278,66)（276 最近 v 道 278=150+8·16）
    // +法向投影 dy=24 → (278,90) → 无条件吸附 (278,84)（84=锚 h 道）
    expect(s.edges[0]?.via).toEqual([{ x: 278, y: 84 }])
    expect(s.saveStatus).toBe('dirty')
  })

  it('[ln-C3] 自动线按下即松手=零位移物化段中点+恰一撤销单元（现行转换末态保形）', () => {
    layout(undefined)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 276, 66)
    docUp(276, 66) // 零 move 即松手——零位移也物化
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before + 1)
    // [B3b] 段中点 (276,66) → 无条件最近交点 (278,66)（转换末态近似保形）
    expect(s.edges[0]?.via).toEqual([{ x: 278, y: 66 }])
    expect(s.saveStatus).toBe('dirty')
  })

  it('[ln-C3] 自动线拖段中断（pointercancel）=零写零单元不转换（RR2/W-5 中断不成立）', () => {
    layout(undefined)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 276, 66)
    docMove(276, 90)
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    })
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before) // 零单元
    expect(s.edges[0]?.via).toBeUndefined() // 不转换（仍自动线）
    expect(s.saveStatus).toBe('clean')
  })

  it('[ln-C3] 自动线拖段中断①（Esc+尾随 pointerup）=零写零单元+末态 idle（INV-80：非 selected 复活）', () => {
    layout(undefined)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 276, 66)
    docMove(276, 90)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    docUp(276, 90) // Esc 后松手（真实指针序）——中断态不写
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before) // 零单元
    expect(s.edges[0]?.via).toBeUndefined()
    expect(s.saveStatus).toBe('clean')
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // 末态 idle：选中手柄消失（非 selected）
  })

  it('[ln-C3] 自动线拖段中断②（Esc→move→up）=零写零单元+idle（Esc 后 move/up 零反应）', () => {
    layout(undefined)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 276, 66)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    docMove(276, 90) // Esc 后的 move——不得置 dragging 复活会话
    docUp(276, 90)
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before) // 零单元（旧=move 复活 dragging 后 up 写库）
    expect(s.edges[0]?.via).toBeUndefined()
    expect(s.saveStatus).toBe('clean')
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // 末态 idle
  })

  it('[R2-C3] 手动 via 拖段沉入第三方卡=提交门回弹（零写零单元零 dirty+toast+selected 保持）', () => {
    // A(12,30)/B(412,30) 同行，C(206,130) 行下第三方；〔B3 回炉①〕全链正交
    // 构形=锯齿链 via [(198,66),(198,112),(302,112),(302,66)]（全格点：198/
    // 302=行 1 隙 150+8k、66=A/B 锚、112=行隙 h 道；初始链净空——水平段 y=112
    // <C 膨胀带 y[124,208]）。拖中段 (v1,v2) 下沉 dy=60 → 吸附 y=166（C 行锚
    // h 道）→ 中段穿 C 膨胀带 → 三档均碰障回弹（格点+全链正交过、穿障拒）
    layout([
      { x: 198, y: 66 },
      { x: 198, y: 112 },
      { x: 302, y: 112 },
      { x: 302, y: 66 }
    ], true, [206, 130])
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 250, 112) // via 内点对段 1（(198,112)→(302,112) 水平）
    docMove(250, 172) // 法向投影 dy=+60（水平段仅 dy）
    docUp(250, 172)
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before) // 零撤销单元
    expect(s.edges[0]?.via).toEqual([
      { x: 198, y: 66 },
      { x: 198, y: 112 },
      { x: 302, y: 112 },
      { x: 302, y: 66 }
    ]) // 零写（回拖前定态）
    expect(s.saveStatus).toBe('clean') // 零 dirty
    expect(s.queue.length).toBe(0) // 零入队
    expect(toastStoreSpy).toHaveBeenCalledWith('落点无可行走线，已回弹', 'error')
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull() // selected 保持
  })

  it('[R2-C3] 删除顶点 L 重连穿第三方卡=提交门回弹（via 原样零单元零 dirty）', () => {
    // via=[(166,12),(444,20)] 上行绕行链（[B3 回炉①] 格点+初始链净空+删后
    // 全链正交：166=行 1 隙 150+16、12/20=顶带 h 道、444=B 顶锚 v 道——
    // 中段斜线 (166,12)→(444,20) 在 C(212,30) 膨胀带 y[24,108] 上方掠过）；
    // 删 idx0 → L 重连拐 (444,48)（48=A 锚 h 道）产生 (140,48)→(444,48)
    // 横段穿 C 膨胀带 → 回弹（菜单路径经提交门）
    layout([
      { x: 166, y: 12 },
      { x: 444, y: 20 }
    ], true, [212, 30])
    click(hitOf('e1'))
    const handles = host!.querySelectorAll('[data-testid="edge-handle-vertex"]')
    expect(handles.length).toBe(2)
    rc(handles[0] as HTMLElement, 30, 30) // 顶点 #1 菜单
    const menu = document.querySelector('[data-testid="edge-menu"]')
    expect(menu?.textContent).toContain('删除顶点')
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      menu!.querySelector('[role="menuitem"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before) // 零撤销单元
    expect(s.edges[0]?.via).toEqual([{ x: 166, y: 12 }, { x: 444, y: 20 }]) // via 原样
    expect(s.saveStatus).toBe('clean')
    expect(s.queue.length).toBe(0)
    expect(toastStoreSpy).toHaveBeenCalledWith('落点无可行走线，已回弹', 'error')
  })

  it('[ln-C3] 手动 via 拖段中断（Esc→move→up）=零写零单元+idle（会话层同修——行为向 INV-80/RR2·W-5 对齐）', () => {
    layout([
      { x: 200, y: 66 },
      { x: 360, y: 66 }
    ])
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    segDown(hitOf('e1'), 280, 66) // via 内点对段（(200,66)→(360,66)）
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    docMove(280, 90) // Esc 后 move+up——旧=onMove 无相位守卫复活会话并写库
    docUp(280, 90)
    const s = useLineageStore.getState()
    expect(s.undoStack.length).toBe(before) // 零单元
    expect(s.edges[0]?.via).toEqual([
      { x: 200, y: 66 },
      { x: 360, y: 66 }
    ]) // via 原样
    expect(s.saveStatus).toBe('clean')
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // 末态 idle
  })

  it('[P8 返工②] reconnect 会话 Esc=停自动滚动泵+零写+末态 idle（scroll 帧不复活相位）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    act(() => {
      host!.querySelector('[data-testid="edge-handle-end"][data-end="to"]')!.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 412, clientY: 66 })
      )
    })
    docMove(412, 66) // 首采样：phase=reconnect+泵登记（容器=.timeline）
    expect(__testAutoscrollState.activeSessions).toBe(1) // 泵在籍锚
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    docMove(300, 200) // 尾随 move/up——会话已拆零反应
    docUp(300, 200)
    act(() => {
      window.dispatchEvent(new Event('scroll')) // 外部滚动帧——停泵后不得复活 reconnect
    })
    flushRafs()
    const s = useLineageStore.getState()
    expect(__testAutoscrollState.activeSessions).toBe(0) // 泵回落（返工前红：Esc 不停泵=1）
    expect(s.undoStack.length).toBe(before) // 零写
    expect(s.edges[0]?.toNode).toBe('B') // 换端零提交（端点/锚原样）
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // 末态 idle（scroll 帧不复活）
  })

  it('非 edit 模式零手柄（收尾转移：切模式=态清空）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    act(() => { useLineageViewStore.getState().setMode('browse') })
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull()
  })
})
