// @vitest-environment jsdom
/**
 * [F-SLOTGRID-01 U3] card-drag-session 算术落点接线测试（INV-111 消费面——
 * 先红后绿 always-active；纯函数面=lineage-drag-grid.test.ts 本件不重复）。
 *
 * 锁定面（简报预裁决）：
 * - D1/D3：插入位=insertIndexFromGrid（含源 rowCounts——源卡占位保留语义）；
 * - D2：指针→月框 padding-box 换算（frame gBCR 相对差÷z−computed border——
 *   border 内缘起算，非零框原点+1.6px 边框双锚）；
 * - D4：settle 前双 end（pointerup+pointercancel 同帧）不产生重复 settle；
 * - D6：推挤滞回治理——同坐标重复 pointermove 插入位恒稳（判定面不随占位
 *   槽腾位漂移）。
 * W 注入=frame inline width+全 props 重渲染（U1 奇行用例同法）；卡 rect 不
 * stub（算术落点零 rect 依赖——rect 桩在场反而掩盖接线错误）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { candidateSlotAt } from '../../../src/renderer/features/lineage/card-drag-grid'
import { partitionRows } from '../../../src/renderer/features/lineage/capacity'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

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

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline nodes={nodes} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
    )
  })
  act(() => {
    useLineageViewStore.getState().setMode('edit')
  })
}

/** W 注入（frame inline width→会话/computed 同源读+渲染 partitionRows 双消费） */
const injectW = async (nodes: LineageNode[], w: number): Promise<void> => {
  req('.month-frame').setAttribute('style', `width: ${w}px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px`)
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
    // [B3 §9 断言迁移] propertyName 'left'→'translate'（飞行承载键 translate 化）
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
  })
}

/** 框 rect 定值（卡不 stub——算术落点零 rect 依赖面） */
function stubFrame(x: number, y: number, w = 600, h = 200): void {
  vi.spyOn(req('.month-frame'), 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  reorder.mockClear()
  onNodeClick.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
  // [B3 §9 新增行] rAF 捕获队列（b3 守卫同族）：pMove 后即时断言先 flushRaf（两态兼容冲洗）
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}

describe('[F-SLOTGRID-01 U3] 算术落点接线（INV-111 消费面——含源语义/padding-box/滞回/双 end）', () => {
  it('S1 同行算术命中：W=570.4 三卡单行——指针 B 中心后（277,40）→插 B 后 C 前（非 rect 追加位）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44) // 激活
    flushRaf() // [B3 §9] 帧批激活
    pMove(277, 40) // 网格 cell1（B）中心 276 右侧 1px → after B → p=2 → insertIdx=1
    flushRaf() // [B3 §9] 指针批
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    expect(ph.previousElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    pUp(277, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('S2 双占末行（D3 含源 rowCounts）：四卡 rows [3,1]——拖末行 D 落 row0 cell1 前=插 B 后（含源数学非实时腾位）', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    await injectW(nodes, 570.4) // partition(4)=[3,1]：D=奇行末行
    stubFrame(0, 0, 600, 400)
    pDown(cardOf('D'), 176, 198) // D 中心（row1 cell0=112..240 中心 176）
    pMove(182, 202) // 激活
    flushRaf() // [B3 §9] 帧批激活
    pMove(275, 40) // row0 cell1（B）中心 276 左侧 1px → before B → p=1 → insertIdx=1
    flushRaf() // [B3 §9] 指针批
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    pUp(275, 40)
    fireEnd(cardOf('D'))
    expect(reorder).toHaveBeenCalledWith(['A', 'D', 'B', 'C'])
    // 源自身槽稳定（含源残行）：指针回 D 原位中心前（175,192）→ insertIdx=3=srcIdx → 序不变零写
    pDown(cardOf('D'), 176, 198)
    pMove(182, 202)
    flushRaf() // [B3 §9] 帧批激活
    pMove(175, 192)
    flushRaf() // [B3 §9] 指针批（源自身槽）
    pUp(175, 192)
    fireEnd(cardOf('D'))
    expect(reorder).toHaveBeenCalledTimes(1)
  })

  it('S3 settle 前双 end 同帧（D4）：pointerup+pointercancel 单帧连发（异坐标框外）→单次 settle 不改写落位', () => {
    mount([node('A'), node('B')])
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // [B3 §9] 帧批激活
    pMove(300, 40) // B 中心 276 右侧 → insertIdx=1
    flushRaf() // [B3 §9] 指针批
    // 同帧双 end（监听摘除〔settle effect cleanup〕发生前——真机 up/cancel
    // 连发窗口的 jsdom 等价形：单 act 内连发两事件）：首 end 换代会话（null
    // 守卫），次 end（框外坐标——若会话未换代将按回弹 srcIdx 改写落位序=红）
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 300, clientY: 40 }))
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 9999, clientY: 40 }))
    })
    expect(q('.drag-slot')).toBeNull()
    const order = [...req('.month-frame').querySelectorAll('.tl-card')].map(
      (c) => (c as HTMLElement).dataset.nodeId
    )
    expect(order).toEqual(['B', 'A'])
    fireEnd(cardOf('A'))
    fireEnd(cardOf('A')) // 二次 transitionend=幂等面（事件/兜底不双写）
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('S4 滞回幂等（D6）：同坐标重复 pointermove 插入位恒稳（占位槽腾位不反噬判定面）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // [B3 §9] 帧批激活
    pMove(350, 40) // cell1 中心 276 右侧 → insertIdx=1
    flushRaf() // [B3 §9] 指针批
    let ph = req('.drag-slot:not(.cand)')
    const first = { prev: ph.previousElementSibling, next: ph.nextElementSibling }
    pMove(350, 40) // 同坐标重复（占位槽已腾位——算术判定面恒稳）
    flushRaf() // [B3 §9] 指针批（滞回幂等面）
    ph = req('.drag-slot:not(.cand)')
    expect(ph.previousElementSibling?.isEqualNode(first.prev ?? null)).toBe(true)
    expect(ph.nextElementSibling?.isEqualNode(first.next ?? null)).toBe(true)
    pUp(350, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('S5 padding-box 换算（D2）：非零框原点+1.6px 边框——指针=B 中心−0.4+1.6 边差→仍前侧（插 B 前=原位零写）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    // 框 origin=(200,100)+边框 1.6（computed border 内缘起算——zoom=1 会话缺省档）
    stubFrame(200, 100)
    const gcs = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
      const real = gcs(el, pseudo)
      if (el === req('.month-frame')) {
        return {
          width: real.width,
          borderLeftWidth: '1.6px',
          borderTopWidth: '1.6px'
        } as unknown as CSSStyleDeclaration
      }
      return real
    }) as typeof window.getComputedStyle)
    pDown(cardOf('A'), 260, 140)
    pMove(266, 144) // 激活
    flushRaf() // [B3 §9] 帧批激活
    // client=(200+276.6,100+40) → padding-box px=276.6−1.6=275=B 中心 276 前侧 1px
    pMove(476.6, 140)
    flushRaf() // [B3 §9] 指针批
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    pUp(476.6, 140)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled() // insertIdx=0=srcIdx → 序不变零写
  })

  it('S6 候选 mask（B3 §6/[B3 §9 期望翻转]）：3 卡 W=570.4（归一化 546.4 cap3 单行满）→候选=∅（被占格不画+末行无空位）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // [B3 §9] 帧批激活
    pMove(277, 40) // insertIdx=1（B 后）
    flushRaf() // [B3 §9] 指针批
    // [B3 §9 断言迁移授权] 期望翻转：旧「total−1 候选含占用格逐格
    // candidateSlotAt」语义退役——occupancy mask 下预览行集合=
    // partitionRows(3,546.4)=[3] 单行满，cells 0..2 全占、末行零空位→候选=∅
    // （行满月组候选=0 是末行无物理空位的结果——§6.6 注记；正候选形态由
    // M1/b3-slots/S7 与 candidateCells 直测承载）
    expect(host!.querySelectorAll('.drag-slot.cand').length).toBe(0)
    pUp(277, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('S7 拖中 W 变化候选随容量公式实时重排（D8→B3 §6 mask，[B3 §9 断言迁移授权]+判别力保持：有→无）：W 752→570.4（归一化 728→546.4）候选 [cell3 带坐标]→∅', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 752) // 注入宽 752——归一化 W=752−24=728（pad 12×2/border 0——S6 注记口径分标）→cap4
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // [B3 §9] 帧批激活
    pMove(277, 40) // insertIdx=1
    flushRaf() // [B3 §9] 指针批
    // [B3 §9 断言迁移授权] mask 集（旧「total−1 候选含占用格」语义退役）；
    // 判别力保持：有→无——初态末行留空位（候选非空+逐槽坐标=candidateSlotAt
    // 同源比对，容差口径沿原例=style 字符串恒等），拖中改行满宽度→候选=∅
    // （DragCandidates 缓存首帧候选/不随 W 重算即红——重排判别面）
    const wNorm = 752 - 24 // 归一化=注入宽−pad24（injectW 口径：pad 12×2、border 0）
    expect(partitionRows(3, wNorm).map((r) => r.length), 'S7 初态前提：cap4 单行 3 卡——末行空 1 格').toEqual([3])
    let cands = [...host!.querySelectorAll('.drag-slot.cand')] as HTMLElement[]
    expect(cands.length, '初态候选非空（末行未占 cell 全画——occupancy mask 正形态）').toBe(1)
    const want = candidateSlotAt(3, wNorm) // 期望坐标=容量公式单源推导（非写死值）
    expect(cands[0]!.style.left, 'S7 候选 x=candidateSlotAt(3,728) 同源').toBe(`${want.x}px`)
    expect(cands[0]!.style.top, 'S7 候选 y=candidateSlotAt(3,728) 同源').toBe(`${want.y}px`)
    await injectW(nodes, 570.4) // 拖中容量变：注入 570.4→归一化 546.4→cap3 单行满
    cands = [...host!.querySelectorAll('.drag-slot.cand')] as HTMLElement[]
    expect(cands.length, '拖中行满→候选=∅（有→无——不重排即红）').toBe(0)
    pUp(277, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })
})

describe('F-VISFB-66·[回炉 S10/S11] 滚动帧：tick 先于基准重测+滚动中槽位更新与松手落槽', () => {
  it('S10 帧序：滚动帧内 tick 施滚先于 onScrollFrame 基准重算（scrollTop 观测=施加后值）', async () => {
    const { startAutoScroll } = await import('../../../src/renderer/features/lineage/drag-autoscroll')
    const frames: number[] = []
    let top = 0
    const c = document.createElement('div')
    Object.defineProperty(c, 'clientHeight', { value: 600, configurable: true })
    Object.defineProperty(c, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    Object.defineProperty(c, 'scrollTop', {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(500, v))
      },
      configurable: true
    })
    const h = startAutoScroll(
      { container: c, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => frames.push(c.scrollTop) },
      { managed: false }
    )
    h.tick(100)
    expect(top).toBeGreaterThan(0) // tick 施滚在先
    expect(frames[0]).toBe(top) // onScrollFrame 观测=施加后值（帧序：tick→基准重算）
    h.stop()
  })

  it('S11 滚动中松手落槽正确（行为测试）：滚动帧→insertIdx 随内容位移更新→松手 settle=滚动帧插位', async () => {
    // [定点修 B3] 源码 grep 形退役——真实会话驱动：光标静止、内容上移（frame
    // gBCR top 0→−130）→FRAME_EVENT（模块真监听路径）→onScrollFrame 重算
    // 插位→pUp settle 取 s.insertIdx（滚动帧更新值非陈旧值——判别力：无
    // 滚动帧重算则落 [A,B,C,D] 陈旧位=红）。场景=idx 1→2（插槽恒 row0——
    // 行容器分块下断言稳定）
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    await injectW(nodes, 570.4) // partition(4)=[3,1]（S2 同构）
    stubFrame(0, 0, 600, 400)
    pDown(cardOf('B'), 276, 54) // B=row0 cell1 中心
    pMove(282, 58) // 激活（阈 5px）
    flushRaf() // [B3 §9] 帧批激活
    pMove(150, 40) // row0 col0 右缘（center 76）→ p=1 src=1 → idx=1 → [A,B,C,D]
    flushRaf() // [B3 §9] 指针批
    const ph0 = req('.drag-slot:not(.cand)')
    expect(ph0.previousElementSibling?.isEqualNode(cardOf('A')), '滚动前插位=A 后 C 前').toBe(true)
    // 滚动帧：内容上移 150px（frame gBCR top 0→−150）——光标静止 (150,40)
    // →frame 域 y=190 跨入 row1（row1 起 y=FRAME_PAD_TOP+PITCH_Y=38+144=182
    // 〔F-LANEGRID-01 B4 顶部内边距 18→38——位移量 130→150 补偿〕）；x=150<
    // row1 cell0 中心 176 → p=3 src=1 → idx=2（C 后）
    stubFrame(0, -150, 600, 400)
    act(() => {
      req('.timeline').dispatchEvent(new CustomEvent('synapse-autoscroll-frame'))
    })
    // [B3 §9 迁移] FRAME_EVENT/onScrollFrame 改只标 scrollDirty+schedule（W2）——标脏后 flush 再断言
    flushRaf()
    const ph1 = req('.drag-slot:not(.cand)')
    expect(ph1.previousElementSibling?.isEqualNode(cardOf('C')), '滚动帧后插位=C 后（内容位移→插入位随帧更新）').toBe(true)
    pUp(150, 40) // 静止光标松手——settle 取滚动帧更新后的 s.insertIdx
    fireEnd(cardOf('B'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder, '落槽=滚动后插位 [A,C,B,D]（陈旧位 [A,B,C,D]=红）').toHaveBeenCalledWith(['A', 'C', 'B', 'D'])
  })
})
