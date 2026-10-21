// @vitest-environment jsdom
/**
 * [F-VISFB-31] C1 effective viewport scale —— own 域（C 域）换算锁定合约面
 * （00A 接手单批档 20261016-visfbb0/01 三域律：client=origin+C×s_eff、
 * s_eff=z×uiScale、B=(client−origin)/z=C×u）。always-active 裸 describe（K3）。
 *
 * 锁定面（票面③验收锚=接缝零错位）：
 * - 换算单源矩阵：三档 uiScale×五档 z 的 client→own=÷(z·u)（B=÷z 再 ÷u
 *   等价=域律锚）；uiScaleFactor=documentElement 单点读+缺省/非法回退 1；
 * - 接缝①拖拽 C3 补偿段：激活/移动帧 inline 写回=own px（旧 ÷z 在 u≠1 红）；
 * - 接缝②capacity 命中输入侧 framePointer：padding-box=own px；
 *   pullPx 连续跟随量=own px（--lg-pull 消费域=内容 own 域）；
 * - 接缝③buildSnapshot：卡/框/contentW 全 own 域（路由 px 常量族同域）；
 * - 路由重算键含 uiScale（W 不变时快照域因子仍须重算）；
 * - 画线域锚/预览端点=own 域（域内自洽保持——C↔C 同律）；平移滚动映射
 *   与当前月判定偏移=own 域换算。
 * 逐档独立基线形态=参数化注入 u（jsdom 无法真排——own 宽重排事实由 00A
 * 实测承载，本件按域律公式锚定换算正确性，不伪造布局断言）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appSettingsSchema } from '@shared/ipc/schemas'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import {
  clientToOwnPt,
  clientToOwnRect,
  effectiveScale,
  uiScaleFactor
} from '../../../src/renderer/features/lineage/timeline-zoom'
import { buildSnapshot } from '../../../src/renderer/features/lineage/edge-overlay-geom'
import { startFlight, type FlightJob } from '../../../src/renderer/features/lineage/card-drag-flight'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { EdgeOverlay } from '../../../src/renderer/features/lineage/EdgeOverlay'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useSettingsStore } from '../../../src/renderer/features/settings/settings.store'

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

let root: Root | null = null
let host: HTMLDivElement | null = null
const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const cardOf = (id: string): HTMLElement => req(`.tl-card[data-node-id="${id}"]`) as HTMLElement

const reorder = vi.fn()
const onNodeClick = vi.fn()

function mount(nodes: LineageNode[], edges: LineageEdge[] = []): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline nodes={nodes} edges={edges} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
    )
  })
  act(() => {
    useLineageViewStore.getState().setMode('edit')
  })
}

/** W 注入（frame inline 五值——[轮 3 k1-W3] computed 同源读+内容盒宽归一化
 * 落地后 pad/border 须随注入（jsdom 无样式表空串→NaN→unmeasured 假路径）；
 * border=0px=会话 padding-box 原点换算零修正（1.6 值参与即平移指针域）；
 * lineage-drag-session-grid 同法） */
const injectW = async (nodes: LineageNode[], w: number): Promise<void> => {
  req('.month-frame').setAttribute(
    'style',
    `width: ${w}px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px`
  )
  await act(async () => {
    root?.render(
      <LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
    )
  })
}

const pDown = (el: Element, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y }))
  })
}
const pMove = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
  })
}
const pUp = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }))
  })
}
const fireEnd = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
  })
}

/** 元素 rect 定值（client 域——调用方按 own×s_eff 给值） */
function stubRect(el: Element, x: number, y: number, w: number, h: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

/** uiScale 注入（App.tsx:96 同法——documentElement 单点写） */
const setU = (v: string | null): void => {
  if (v === null) document.documentElement.style.removeProperty('--ui-scale')
  else document.documentElement.style.setProperty('--ui-scale', v)
}

beforeEach(() => {
  reorder.mockClear()
  onNodeClick.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208, zoom: 1, tool: 'select' })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  setU(null)
  useSettingsStore.setState({ settings: null })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('[F-VISFB-31] own 域换算单源（s_eff=z×uiScale 三域律）', () => {
  it('uiScaleFactor 单点读：documentElement --ui-scale 三档直读+缺失/非法/负值回退 1', () => {
    setU('1')
    expect(uiScaleFactor()).toBe(1)
    setU('1.1')
    expect(uiScaleFactor()).toBeCloseTo(1.1, 12)
    setU('1.25')
    expect(uiScaleFactor()).toBe(1.25)
    setU(null)
    expect(uiScaleFactor()).toBe(1)
    setU('garbage')
    expect(uiScaleFactor()).toBe(1)
    setU('-2')
    expect(uiScaleFactor()).toBe(1)
  })

  it('effectiveScale 唯一公式 s_eff=z×u：view.store zoom × documentElement 因子', () => {
    useLineageViewStore.setState({ zoom: 0.8 })
    setU('1.25')
    expect(effectiveScale()).toBeCloseTo(1, 12)
    setU('1')
    expect(effectiveScale()).toBeCloseTo(0.8, 12)
    useLineageViewStore.setState({ zoom: 1.3 })
    setU('1.1')
    expect(effectiveScale()).toBeCloseTo(1.43, 12)
  })

  it('换算矩阵：三档 u×五档 z——clientToOwnPt/Rect=÷(z·u)，与 B 域 ÷z 再 ÷u 两步等价（域律锚）', () => {
    const base = { left: 37.3, top: 11.9 }
    for (const u of [1, 1.1, 1.25]) {
      for (const z of [1, 0.5, 0.8, 1.3, 2]) {
        const p = clientToOwnPt(base, 313.7, 209.1, z, u)
        expect(p.x).toBeCloseTo((313.7 - 37.3) / (z * u), 10)
        expect(p.y).toBeCloseTo((209.1 - 11.9) / (z * u), 10)
        expect(p.x).toBeCloseTo((313.7 - 37.3) / z / u, 9)
        const r = clientToOwnRect({ left: 150.2, top: 120.4, width: 160.6, height: 90.8 }, base, z, u)
        expect(r.x).toBeCloseTo((150.2 - 37.3) / (z * u), 10)
        expect(r.y).toBeCloseTo((120.4 - 11.9) / (z * u), 10)
        expect(r.w).toBeCloseTo(160.6 / (z * u), 10)
        expect(r.h).toBeCloseTo(90.8 / (z * u), 10)
      }
    }
  })
})

describe('[F-VISFB-31] 接缝③buildSnapshot=own 域（路由 px 常量族同域）', () => {
  it('卡/框/contentW 全 ÷s_eff：u=1.25 client 160×90 卡 → own 128×72；contentW=own 宽（旧 ÷z 红）', () => {
    setU('1.25')
    const content = document.createElement('div')
    const card = document.createElement('div')
    card.className = 'tl-card'
    card.dataset.nodeId = 'A'
    const year = document.createElement('div')
    year.setAttribute('data-year', '2022')
    const frame = document.createElement('div')
    frame.className = 'month-frame'
    // [F-DETOURW-01] contentW=月框内容盒宽归一化值（readFrameContentWidth 单源）
    // ——jsdom 无样式表空串→NaN→unmeasured，内联五值注入使 computed 可读
    // （injectW 先例同法；627.2−24−3.2=600=断言值）
    frame.style.cssText =
      'width:627.2px;padding-left:12px;padding-right:12px;border-left-width:1.6px;border-right-width:1.6px'
    year.appendChild(frame)
    content.appendChild(card)
    content.appendChild(year)
    document.body.appendChild(content)
    stubRect(content, 50, 40, 750, 500)
    stubRect(card, 150, 120, 160, 90)
    stubRect(frame, 75, 60, 625, 475)
    const snap = buildSnapshot(content)
    const c = snap.cards.get('A')
    expect(c?.x).toBeCloseTo(80, 10)
    expect(c?.y).toBeCloseTo(64, 10)
    expect(c?.w).toBeCloseTo(128, 10)
    expect(c?.h).toBeCloseTo(72, 10)
    expect(snap.frames[0]?.x).toBeCloseTo(20, 10)
    expect(snap.frames[0]?.y).toBeCloseTo(16, 10)
    expect(snap.frames[0]?.w).toBeCloseTo(500, 10)
    expect(snap.frames[0]?.h).toBeCloseTo(380, 10)
    expect(snap.frames[0]?.year).toBe(2022)
    expect(snap.contentW).toBeCloseTo(600, 10)
    content.remove()
  })
})

describe('[F-VISFB-31] 接缝①拖拽会话 C3 补偿段=own 域', () => {
  it('激活/移动帧 inline 写回 own px：u=1.25 卡 client 160×90 → width 写 128px、move 帧 left=Δclient÷u（旧 ÷z 写 160px/80px 红）', () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    setU('1.25')
    stubRect(cardOf('A'), 250, 130, 160, 90)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 310, 166)
    pMove(330, 176)
    const card = cardOf('A')
    expect(card.style.position).toBe('absolute')
    expect(card.style.width).toBe('128px')
    pMove(390, 166)
    expect(parseFloat(card.style.left)).toBeCloseTo(64, 10)
    expect(parseFloat(card.style.top)).toBeCloseTo(0, 10)
    pUp(390, 166)
    fireEnd(cardOf('A'))
  })

  it('pullPx 连续跟随量=own px：u=1.25 指针越底缘 50 own px → --lg-pull=50px、越 100 own px 封顶 82px（旧 client 量 62.5px 红）', () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    setU('1.25')
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(300, 262.5)
    expect((req('.month-frame') as HTMLElement).style.getPropertyValue('--lg-pull')).toBe('50px')
    pMove(300, 325)
    expect((req('.month-frame') as HTMLElement).style.getPropertyValue('--lg-pull')).toBe('82px')
    pUp(300, 325)
    fireEnd(cardOf('A'))
  })
})

describe('[F-VISFB-31] 接缝②capacity 命中输入侧=own 域', () => {
  it('framePointer padding-box=own px：u=1.25 非零框原点+1.6px 边框——指针落 B 中心前 1 own px → 原位零写（旧 ÷z 判后侧改写红）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    setU('1.25')
    stubRect(req('.month-frame'), 200, 100, 600, 200)
    const gcs = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
      const real = gcs(el, pseudo)
      if (el === req('.month-frame')) {
        return {
          width: real.width,
          // [轮 3 k1-W3] 归一化五值补齐（pad/borderRight 缺席→NaN→unmeasured
          // 假路径——本例意图=measured own 域命中面）；borderLeft 1.6=本例
          // 被测面（padding-box 原点横修正）沿承
          paddingLeft: '12px',
          paddingRight: '12px',
          borderLeftWidth: '1.6px',
          borderRightWidth: '1.6px',
          borderTopWidth: '1.6px'
        } as unknown as CSSStyleDeclaration
      }
      return real
    }) as typeof window.getComputedStyle)
    pDown(cardOf('A'), 260, 140)
    pMove(266, 144)
    pMove(545.75, 152)
    pUp(545.75, 152)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled()
  })
})

describe('[F-VISFB-31] 画线/平移/当前月域=own 域换算', () => {
  it('useDrawLine 锚与预览端点=own px：u=1.25 卡 client (250,130,160,90) → 预览线 own 域端点（旧 ÷z=client 值红）', () => {
    const nodes = [node('A'), node('B')]
    mount(nodes)
    setU('1.25')
    act(() => {
      useLineageViewStore.setState({ tool: 'draw-solid' })
    })
    stubRect(cardOf('A'), 250, 130, 160, 90)
    pDown(req('.tl-content'), 330, 130)
    pMove(500, 400)
    const line = q('svg.draw-preview line')
    expect(line).not.toBeNull()
    expect(parseFloat(line!.getAttribute('x1') ?? '')).toBeCloseTo(264, 10)
    expect(parseFloat(line!.getAttribute('y1') ?? '')).toBeCloseTo(104, 10)
    expect(parseFloat(line!.getAttribute('x2') ?? '')).toBeCloseTo(400, 10)
    expect(parseFloat(line!.getAttribute('y2') ?? '')).toBeCloseTo(320, 10)
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 500, clientY: 400 }))
    })
  })

  it('平移滚动映射=own px（÷u）：u=1.25 client 位移 50 → scrollLeft=100−40（旧直写 −50 红）', () => {
    const nodes = [node('A'), node('B')]
    mount(nodes)
    act(() => {
      useLineageViewStore.setState({ mode: 'browse' })
    })
    setU('1.25')
    const sc = req('[data-testid="lineage-timeline"]')
    const setSL = vi.fn()
    Object.defineProperty(sc, 'scrollLeft', { get: () => 100, set: setSL, configurable: true })
    pDown(sc, 100, 100)
    pMove(150, 100)
    pMove(200, 100)
    expect(setSL).toHaveBeenCalled()
    expect(setSL.mock.calls[setSL.mock.calls.length - 1]![0]).toBeCloseTo(60, 10)
    pUp(200, 100)
  })

  it('当前月判定偏移=own px（×s_eff）：u=1.25 框底 74.9<75（60×1.25）不选 → 当前月=次框（旧阈 60 选首框红）', () => {
    const nodes = [node('A'), node('B', { month: 10 })]
    mount(nodes)
    setU('1.25')
    const sc = req('[data-testid="lineage-timeline"]')
    stubRect(sc, 0, 0, 1280, 800)
    const frames = sc.querySelectorAll('[data-frame-key]')
    expect(frames.length).toBe(2)
    stubRect(frames[0]!, 0, 0, 600, 74.9)
    stubRect(frames[1]!, 0, 0, 600, 300)
    act(() => {
      sc.dispatchEvent(new Event('scroll'))
    })
    expect(useLineageViewStore.getState().activeFrameKey).toBe('2022|10')
  })
})

describe('[F-VISFB-31] 路由重算键含 uiScale', () => {
  // [R1·B-1] 夹具引用稳定化：nodes/edges/shiftedIds/groups 全部模块级常量跨渲染
  // 复用——EdgeOverlay effect 原有依赖（live/nodes/edges/shiftedIds/groups/
  // routeEpoch）任一引用变化都会掩盖「仅 uiScale 变更触发重算」的判别面
  const STABLE_NODES: LineageNode[] = [node('A'), node('B', { month: 3 })]
  const STABLE_EDGES: LineageEdge[] = [
    { id: 'e1', fromNode: 'A', toNode: 'B', label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
  ]
  const STABLE_IDS: ReadonlySet<string> = new Set()
  const STABLE_GROUPS: never[] = []

  it('uiScale prop bump+--ui-scale 1→1.25 → 快照重算（path d 迁移 own 域）——缺键不重算形红', () => {
    const rafs: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafs.push(cb)
      return rafs.length
    })
    host = document.createElement('div')
    host.className = 'tl-content'
    document.body.appendChild(host)
    stubRect(host, 0, 0, 600, 500)
    root = createRoot(host)
    const renderAt = (uiScale: number): void => {
      act(() => {
        root?.render(
          <EdgeOverlay
            nodes={STABLE_NODES}
            edges={STABLE_EDGES}
            shiftedIds={STABLE_IDS}
            groups={STABLE_GROUPS}
            routeEpoch={0}
            uiScale={uiScale}
          />
        )
      })
      for (const n of STABLE_NODES) {
        const card = host?.querySelector(`.tl-card[data-node-id="${n.id}"]`)
        if (card === null) {
          const el = document.createElement('div')
          el.className = 'tl-card'
          el.dataset.nodeId = n.id
          host?.appendChild(el)
        }
      }
      stubRect(req('.tl-card[data-node-id="A"]'), 100, 50, 128, 72)
      stubRect(req('.tl-card[data-node-id="B"]'), 100, 400, 128, 72)
    }
    const flush = (): void => {
      act(() => {
        rafs.splice(0).forEach((cb) => cb(0))
      })
    }
    renderAt(1)
    flush()
    const d1 = req('.tl-edge').getAttribute('d')
    expect(d1).not.toBeNull()
    setU('1.25')
    renderAt(1.25)
    flush()
    const d2 = req('.tl-edge').getAttribute('d')
    expect(d2).not.toBeNull()
    expect(d2).not.toBe(d1)
  })

  it('宿主 settings→uiScale prop 接线（R1·B-1③）：settings small→large+--ui-scale 1.25 → 路由快照重算（d 迁移）', () => {
    const rafs: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafs.push(cb)
      return rafs.length
    })
    const nodes = [node('A'), node('B', { month: 3 })]
    const e: LineageEdge = {
      id: 'e1', fromNode: 'A', toNode: 'B', label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't'
    }
    mount(nodes, [e])
    stubRect(cardOf('A'), 100, 50, 128, 72)
    stubRect(cardOf('B'), 100, 400, 128, 72)
    const flush = (): void => {
      act(() => {
        rafs.splice(0).forEach((cb) => cb(0))
      })
    }
    flush()
    const d1 = req('.tl-edge').getAttribute('d')
    expect(d1).not.toBeNull()
    setU('1.25')
    act(() => {
      useSettingsStore.setState({
        settings: appSettingsSchema.parse({ contactEmail: 'a@bc.co', theme: 'light', uiScale: 'large' })
      })
    })
    flush()
    const d2 = req('.tl-edge').getAttribute('d')
    expect(d2).not.toBeNull()
    expect(d2).not.toBe(d1)
  })
})

describe('[F-VISFB-31·R1] 自查面补强锚（W-1——四处独立红锚）', () => {
  it('flight 飞行目标=own 域（W-1①）：u=1.25 双 rAF 后 left=client÷1.25−ho（旧 ÷z 写 client 值红）', async () => {
    setU('1.25')
    const card = document.createElement('div')
    stubRect(card, 250, 125, 128, 72)
    const content = document.createElement('div')
    stubRect(content, 0, 0, 10, 10)
    const job: FlightJob = {
      nodeId: 'A',
      fromX: 100,
      fromY: 50,
      hostOffset: { x: 20, y: 10 },
      marginLeft0: '',
      finish: vi.fn()
    }
    startFlight(card, job, content)
    expect(card.style.position).toBe('absolute')
    expect(card.style.left).toBe('80px')
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    expect(card.style.left).toBe('180px')
    expect(card.style.top).toBe('90px')
  })

  it('下拉带域=own px（W-1②）：u=1.25 clientY=290（=200+72own≤带内界 302.5）松手→带内落位改写（旧 82client 带=282 带外回弹零写红）', () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    setU('1.25')
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(300, 290)
    pUp(300, 290)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('吸附高亮 r=屏幕域 12px 承诺（W-1③）：u=1.25 hint dot r=4.8/环 r=7.2（旧 z 单因子 r=6/9 红）', () => {
    const nodes = [node('A'), node('B')]
    mount(nodes)
    act(() => {
      useLineageViewStore.setState({ tool: 'draw-solid' })
    })
    // 高亮补偿 prop=z×UI_SCALE[settings 档]（LineageTimeline 组合——settings
    // 单源驱动非 CSS var）
    act(() => {
      useSettingsStore.setState({
        settings: appSettingsSchema.parse({ contactEmail: 'a@bc.co', theme: 'light', uiScale: 'large' })
      })
    })
    stubRect(cardOf('A'), 250, 130, 160, 90)
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 330, clientY: 130 }))
    })
    const dot = q('svg.draw-anchor-hint circle.snapped')
    expect(dot).not.toBeNull()
    expect(dot!.getAttribute('r')).toBe('4.8')
    expect(q('svg.draw-anchor-hint circle.snapped-ring')!.getAttribute('r')).toBe('7.2')
  })
})
