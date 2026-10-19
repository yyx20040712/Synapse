// @vitest-environment jsdom
/**
 * [T3-P8] useCardDrag 拖拽状态机测试（锁定合约，always-active）。
 * 态空间（宪法前置）：drag∈{idle,pending(<5px),dragging,settle}×mode∈{view,edit}
 * ——[F-LGRAPH-01①U5] 拖卡=edit 专属（三模式闸——browse/focus pointerdown
 * 即拒，闸面=lineage-mode-canvas.test）/picker≠idle 禁拖（拾取优先）/popover
 * 开禁拖/拖拽无 Esc 取消（松手恒落当前槽）/settle 期再 pointerdown
 * =忽略/阈值未过=单击选中既有链。跨格序列与几何槽位（同行左半/跨行上半/
 * 框外淡化）+纯函数 frameKeyOf 直测。
 * [F-UIRES-03 C3] 改月域用例（预演纯函数直测/改月弹层链）随改月链退役删除
 * （INV-107——MonthPop 链测试=lineage-month-pop.test 整件退役）。
 * （几何经 getBoundingClientRect spy 定值——jsdom 零布局；transitionend 以
 * Object.assign(new Event) 附 propertyName 派发。）
 * [lnfix2] 下拉扩展（冻结基准）组拆驻 lineage-card-stretch.test.tsx（本件
 * 500 行红线——lnfix1 拆新件先例同族）。
 * [F-SLOTGRID-01 U3] γ 重基线（setup 级）：落点接线=insertIndexFromGrid 算术
 * （断言文本零改——test-surface 契约面保全）；本件指针坐标改网格算术位
 * （B cell1 中心 276/C cell2 中心 476——capacity 常量系），算术面新用例驻
 * lineage-drag-grid.test.ts（纯函数）+lineage-drag-session-grid.test.tsx
 * （会话级）；insertIndexFromRects 纯函数直测组随函数退役删除（豁免条目
 * 2026-10-08 主控落案=方案切换删旧）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import { stubRowFollowFlow } from '../../utils/live-frame'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { frameKeyOf } from '../../../src/renderer/features/lineage/lineage-timeline'
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
      <LineageTimeline
        nodes={nodes}
        edges={[]}
        onNodeClick={onNodeClick}
        onReorderMonthSlots={reorder}
      />
    )
  })
  // [F-LGRAPH-01①U5] 拖卡=edit 专属（browse/focus pointerdown 即拒）——本组
  // 既有拖拽用例按新语义统一 edit 态驱动（拖拽行为本体零变）
  enterEdit()
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
const click = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 几何定值（jsdom 零布局——getBoundingClientRect spy 单源） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

beforeEach(() => {
  toastStoreSpy.mockClear()
  reorder.mockClear()
  onNodeClick.mockClear()
  // [F-LGRAPH-01①U3] 模式态单源复位（P-1 缺省 browse——composer 受控注入面）
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

/** 进编辑模式（三模式栏写路径等价——「编辑脉络」toggle 已随 U3 退役） */
const enterEdit = (): void => {
  act(() => {
    useLineageViewStore.getState().setMode('edit')
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
})

describe('[T3-P8] 纯函数直测（frameKeyOf）', () => {
  // [F-SLOTGRID-01 U4] describe 退役名改（旧名含 applyMovePreview/
  // insertIndexFromRects 两已删函数——名实不符）：改月链（INV-107）与 rect
  // 直测（U3 方案切换删旧）退役后仅余 frameKeyOf 一例；case 键含 describe
  // 路径——改名随 U4 基线再生成吸收（豁免条目临时登案、再生成后 stale 即清）
  it('frameKeyOf：year|month 序列化含 null 形', () => {
    expect(frameKeyOf(2022, 9)).toBe('2022|9')
    expect(frameKeyOf(null, null)).toBe('null|null')
  })
})

describe('[T3-P8] 拖拽状态机（[F-LGRAPH-01①U5] 拖卡=edit 专属——三模式闸后既有用例 edit 态驱动）', () => {
  it('阈值未过=单击选中既有链：pointerdown+3px 移动+up→无占位槽无重排；click 照常选中', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(152, 201)
    pUp(152, 201)
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    click(cardOf('A'))
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything())
  })

  it('过 5px 阈值激活：占位槽「置 入」在场+拖卡 .dragging+连线层 dimmed（view 态可拖）', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(158, 204)
    const ph = req('.drag-slot')
    expect(ph.textContent).toBe('置 入')
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
    expect(req('.tl-edges').classList.contains('dimmed')).toBe(true)
  })

  it('月内槽位实时移位（同行判卡左半）+框外槽淡化 .35', () => {
    // [F-UIRES-03 T0] 随动模型示范应用（§8.1.6）：静态定值 mock 改 DOM 流序
    // 派生（stubRowFollowFlow——占位槽插入/移位=真机腾位语义；起步/步进与
    // 原静态定值同值 12/18/148）。判别语义升级：插位后其余卡 rect 随流移位
    // 参与后续 pointermove 的插入位派生（静态 mock 下恒不移）
    mount([node('A'), node('B'), node('C')])
    const f = req('.month-frame') as HTMLElement
    stubRowFollowFlow(f)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    let ph = req('.drag-slot')
    expect(ph.classList.contains('faded')).toBe(false) // 框内不淡化
    // [F-SLOTGRID-01 U3] 指针落 B（cell1）中心 276 右侧（x=350——unmeasured
    // 单行算术：col=round((350-76)/200)=1→after B）→ 插位=B 后 C 前
    pMove(350, 40)
    ph = req('.drag-slot')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    expect(ph.previousElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    // 指针出框（x=999）→ 淡化+插位保持（框外不更新槽位）
    pMove(999, 40)
    ph = req('.drag-slot')
    expect(ph.classList.contains('faded')).toBe(true)
    // [②U6/退役行 7] 框外松手=物理域回弹原位：无 toast+零重排写（回弹=no-op
    // 不入编辑会话栈——呈报确认口径）
    pUp(999, 40)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled()
    // 回框内松手=落当前候选槽（B 中心右侧→[B,A,C]）
    pDown(cardOf('A'), 60, 40)
    pMove(350, 40)
    pUp(350, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('跨行判上半：第二行卡上半指针→插其前（mockup L955-964 同式）', () => {
    mount([node('A'), node('B'), node('C')])
    const f = req('.month-frame')
    stubRect(f, 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 12, 110)
    stubRect(cardOf('C'), 160, 110)
    pDown(cardOf('A'), 60, 40)
    // [F-SLOTGRID-01 U3] unmeasured 单行算术：py=130 脱行带行钳回 row0；x=300
    // 落 B（cell1）中心 276 右侧→after B→插 C 前（跨带指针恒按 px 中心序）
    pMove(300, 130)
    const ph = req('.drag-slot')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    pUp(300, 100)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('松手 settle：占位槽撤+DOM 序=新序+.32s left/top 过渡在场；transitionend→清场+重排写+dimmed 摘', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(500, 40) // 末位（500 > C（cell2）中心 476 → after C=组末）
    pUp(500, 40)
    expect(q('.drag-slot')).toBeNull()
    const order = [...req('.month-frame').querySelectorAll('.tl-card')].map((c) => (c as HTMLElement).dataset.nodeId)
    expect(order).toEqual(['B', 'C', 'A'])
    const card = cardOf('A')
    expect(card.style.transition).toContain('left .32s cubic-bezier(.22,.9,.26,1)')
    expect(card.style.transition).toContain('top .32s cubic-bezier(.22,.9,.26,1)')
    expect(req('.tl-edges').classList.contains('dimmed')).toBe(false) // 拖起摘除（settle 期无 dimmed）
    expect(reorder).not.toHaveBeenCalled() // settle 落定（transitionend）后才排队
    fireEnd(card)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
    expect(card.style.position).toBe('') // 清场（inline 全清）
    expect(card.classList.contains('dragging')).toBe(false)
  })

  it('settle 期再 pointerdown=忽略（不二次激活）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(300, 40) // B（cell1）中心 276 右侧 → 末位
    pUp(300, 40)
    // settle 飞行中（transitionend 未派发）：新 pointerdown+move 零动作
    pDown(cardOf('B'), 150, 200)
    pMove(170, 220)
    pUp(170, 220)
    expect(q('.drag-slot')).toBeNull()
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('序未变松手=零写（拖回原位不产生空写批）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(10, 40) // 插回首位（B 左半）
    pUp(10, 40)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled()
  })

  it('[②U6/退役行 7] 跨月=物理域回弹：无 toast（INV-83 子句退役）+回弹原位零写', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 }), node('X', { month: 10 })])
    const frames = [...host!.querySelectorAll('.month-frame')]
    stubRect(frames[0]!, 0, 0, 600, 200)
    stubRect(frames[1]!, 0, 300, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40) // 框内变序：B 右半 → [B,A]
    pMove(300, 400) // 落他月框（跨月面——限本月物理域）
    pUp(300, 400)
    // 无 toast（跨月拒绝 toast 子句退役——代码面零残留）；回弹原位零写
    expect(toastStoreSpy).not.toHaveBeenCalled()
    expect(q('.drag-slot')).toBeNull()
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled() // 回弹原位=序不变=no-op 不入会话栈
  })

  it('拖后 click 抑制（一次性）：拖拽松手后的 click 不转发选中；此后正常 click 恢复', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40)
    pUp(240, 40)
    click(cardOf('A'))
    expect(onNodeClick).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    click(cardOf('B'))
    expect(onNodeClick).toHaveBeenCalledWith('B', expect.anything())
  })

  it('拖拽无 Esc 取消：mid-drag Esc 零动作，松手恒落当前槽', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(300, 40) // B（cell1）中心右侧 → 末位
    pUp(300, 40)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(q('.drag-slot')).toBeNull() // settle 已启动（Esc 不中断飞行）
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })
})

describe('[T3-P8 回炉] R1/R2/R4/R5/R6——FLIP 清场序/冻结互斥/兜底/取消径/抑制残留', () => {
  it('R1 零位移分支干净：settle 量测前清 inline 四键（flow 态量 target）→松手即终态无残留（序不变=零写）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 6, 4)
    stubRect(cardOf('B'), 300, 0) // B 远右——指针落 A 位=插位首位（序不变）
    pDown(cardOf('A'), 56, 29) // ox=50 oy=25
    pMove(62, 33) // 激活（≥5px）；ghost=(12,8)
    stubRect(cardOf('A'), 12, 8) // settle 期 target=ghost 位（零位移）
    pUp(62, 33)
    // 零位移分支：量测前 inline 已清 → finish 直落，卡无任何 inline 残留
    expect(cardOf('A').getAttribute('style') === null || cardOf('A').getAttribute('style') === '').toBe(true)
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('R2 dragging 期无测量态：拖卡不入布局量测（[F-SLOTGRID-01 U1] 瀑布错位/冻结量测退役——dragging 压 0 防御锁沿承）', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    // 拖卡 fixed 后视口系 offsetTop=999（异行）——历史瀑布量测帧若在场必挂
    // 错位 inline；[F-SLOTGRID-01 U1] 量测机制退役=防御性断言沿承
    const spyTop = vi.spyOn(cardOf('A'), 'offsetTop', 'get')
    spyTop.mockReturnValue(999)
    pMove(66, 44)
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
    expect(cardOf('A').style.marginLeft).toBe('0px') // dragging 期恒压 0px（会话防御写沿承——U3 网格联动重估）
    expect(req('.tl-content').classList.contains('tl-measure')).toBe(false)
    spyTop.mockRestore()
    pMove(500, 40) // 组末（> C（cell2）中心 476）
    pUp(500, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('R4 transitionend 兜底：定时器 ~600ms 同径 finish（无事件也落定清场+写）', () => {
    vi.useFakeTimers()
    try {
      mount([node('A'), node('B')])
      stubRect(req('.month-frame'), 0, 0, 600, 200)
      stubRect(cardOf('A'), 12, 18)
      stubRect(cardOf('B'), 160, 18)
      pDown(cardOf('A'), 60, 40)
      pMove(66, 44)
      pMove(300, 40) // B（cell1）中心右侧 → 末位
      pUp(300, 40)
      expect(reorder).not.toHaveBeenCalled() // settle 落定（事件/兜底）后才写
      act(() => {
        vi.advanceTimersByTime(650)
      })
      expect(reorder).toHaveBeenCalledTimes(1)
      expect(reorder).toHaveBeenCalledWith(['B', 'A'])
      expect(cardOf('A').getAttribute('style') === null || cardOf('A').getAttribute('style') === '').toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('R5 pointercancel 同径：系统取消=落当前候选槽（与松手同式清场）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(300, 40) // B（cell1）中心右侧 → 末位（cancel 事件坐标在框内=落当前候选槽）
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 200, clientY: 40 }))
    })
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('R6 click 抑制无残留：拖后未消费的抑制随新会话清零（下一真单击恢复转发）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40)
    pUp(240, 40)
    // 拖后 click 未落在卡上（suppress 残留 true）——不派发 click
    fireEnd(cardOf('A'))
    // 新会话（B 未拖松手）清残留 → 随后真单击 B 转发选中
    pDown(cardOf('B'), 190, 40)
    pMove(193, 41) // <5px 未激活
    pUp(193, 41)
    click(cardOf('B'))
    expect(onNodeClick).toHaveBeenCalledWith('B', expect.anything())
  })

  // ── [回炉 r1 d1-W3/k1-W3] 奇行卡起拖→settle 幂等无双计（网格布局承接面）──
  it('奇行（.tl-row.odd）卡起拖→插入异行位→settle 幂等：reorder 单次+清场无 inline 残留+奇行卡回位（无双计）', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    // jsdom 无 RO=unmeasured 单行——注入 W（frame inline width→useCapacityLayout
    // 挂载帧同步首读链）：nodes 新引用重渲染→effect 重跑→归一化 W=546.4（computed 570.4−pad24——[轮 4 N-1] 注释同步）
    // →partition(4)=行0 [A,B,C]/行1 odd [D]（跨行布防 ≥2 行）
    req('.month-frame').setAttribute('style', 'width: 570.4px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px')
    await act(async () => {
      // 全 props 重渲染（回调链齐——onUp finish 闭包经最新 args 读回调）
      root?.render(
        <LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
      )
    })
    const rows = Array.from(req('.month-frame').querySelectorAll('.tl-row'))
    expect(rows.length, '布防卫：两行网格在场').toBe(2)
    expect(rows[1]!.classList.contains('odd'), '布防卫：行 1=奇行（o=100 相位）').toBe(true)
    expect(rows[1]!.contains(cardOf('D')), '布防卫：D=奇行卡').toBe(true)
    // 几何定值=网格算术位（行0 x=12+200k/奇行 D x=112,y=162——capacity 同系）
    stubRect(req('.month-frame'), 0, 0, 600, 400)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 212, 18)
    stubRect(cardOf('C'), 412, 18)
    stubRect(cardOf('D'), 112, 162)
    // 奇行卡 D 起拖（指针=卡中心）→激活→移至 B 左半（插入区=异行位 idx1）
    pDown(cardOf('D'), 176, 198)
    pMove(182, 202)
    expect(cardOf('D').classList.contains('dragging')).toBe(true)
    expect(cardOf('D').style.position).toBe('absolute') // 离流单源（.dragging——无双计载体确认）
    pMove(244, 54)
    await expect.poll(async () => q('.drag-slot:not(.cand)') !== null).toBe(true)
    pUp(244, 54)
    expect(reorder).not.toHaveBeenCalled() // settle 落定（transitionend/兜底）后才写
    fireEnd(cardOf('D'))
    // 幂等无双计：reorder 恰一次+参数序=D 插 idx1（others=[A,B,C]）
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['A', 'D', 'B', 'C'])
    fireEnd(cardOf('D')) // 二次 transitionend=幂等面（事件/兜底不双写）
    expect(reorder).toHaveBeenCalledTimes(1)
    // settle 清场：inline 四键零残留（无双计残留——R1 零位移/R4 断言面同款）
    expect(cardOf('D').getAttribute('style') === null || cardOf('D').getAttribute('style') === '').toBe(true)
    // 奇行卡回位：D 落回 .tl-row.odd（网格相位由行容器承载——无 per-card 恢复态）
    expect(cardOf('D').closest('.tl-row')?.classList.contains('odd')).toBe(true)
  })

  // ── [F-DRAGREMOUNT-01] 跨行源卡保育（A 案理想锁——用户裁决 2026-10-08
  // 方案 A，v166 §2-1）：四卡 W=570.4 拖首卡（row0 源卡）→激活帧拖卡驻
  // **保育行=拖前原行**（keyed 同父调和——React 逐父 children 对账不跨父
  // 保育，驻末行时跨行源卡必跨父 remount=激活帧 ghost inline 四键随旧节点
  // 消亡，本票病灶）。两段理想形态：①激活帧=节点保育（激活前后引用比对）
  // +ghost inline 全键存续（断言面=position/marginLeft/left/top——R2 敏感面
  // style.marginLeft '0px' 跨行存续）+驻原行非末行 odd；②后续 pointermove
  // 节点恒稳（补写 left/top 无跳变载体）+settle 清场照常（reorder 单次+
  // inline 清空）。
  // 〔沿革：U4 BLOCKED 裁定 B=现状锁定例（跨父 remount 形态三断言——理想
  // 断言红证=仓外 12 号档）；A 案落地=本票翻转义务兑现，①段断言同步翻转〕──
  it('跨行源卡保育（A 案）[F-DRAGREMOUNT-01]：激活帧节点保育（同父 keyed 调和）+ghost inline 全键存续（left/top/position/marginLeft）→驻原行非末行 odd→后续 move 节点恒稳+settle 清场照常', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    // W 注入（奇行 settle 例同型）：computed 570.4→归一化 546.4→N=3/M=2→[A,B,C] 行0+[D] 行1 奇行（[轮 4 N-1]）
    req('.month-frame').setAttribute('style', 'width: 570.4px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px')
    await act(async () => {
      root?.render(
        <LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
      )
    })
    const rows = Array.from(req('.month-frame').querySelectorAll('.tl-row'))
    expect(rows.length, '布防卫：两行网格在场').toBe(2)
    expect(rows[1]!.classList.contains('odd'), '布防卫：行 1=奇行').toBe(true)
    // 几何定值=网格算术位（行0 x=12+200k/奇行 D x=112,y=162——capacity 同系）
    stubRect(req('.month-frame'), 0, 0, 600, 400)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 212, 18)
    stubRect(cardOf('C'), 412, 18)
    stubRect(cardOf('D'), 112, 162)
    // ① 激活帧（pMove 过阈首个）：驻保育行=拖前原行（keyed 同父保育断言族）
    const pre = cardOf('A')
    pDown(pre, 76, 54)
    pMove(82, 58)
    const post = cardOf('A')
    expect(post).toBe(pre) // 激活帧同父 keyed 调和=节点保育（跨父 remount 修复面）
    expect(post.style.position, 'ghost inline 全键存续（position——离流单源）').toBe('absolute')
    expect(post.style.marginLeft, 'R2 敏感面：marginLeft 压 0 跨行存续（12 号理想面）').toBe('0px')
    expect(post.style.left, '激活帧 inline 已落同一节点（left）').not.toBe('')
    expect(post.style.top, '激活帧 inline 已落同一节点（top）').not.toBe('')
    expect(post.classList.contains('dragging'), '离流定位由 .dragging CSS 类承载').toBe(true)
    const tailRow = post.closest('.tl-row')
    expect(tailRow).toBe(rows[0]) // 驻保育行=拖前原行（A=row0 源卡）
    expect(tailRow!.classList.contains('odd'), '保育行=原行非末行奇行（激活帧行为）').toBe(false)
    // ② 后续 pointermove：findCard 重查新节点补写 left/top（节点此后恒稳）
    pMove(86, 60)
    const post2 = cardOf('A')
    expect(post2).toBe(post) // move 期不再换节点（remount 仅激活提交帧）
    expect(post2.style.left, '后续 move 补写 left（会话对 remount 健在）').not.toBe('')
    expect(post2.style.top, '后续 move 补写 top').not.toBe('')
    // settle 照常：行0 插位（350>B cell1 中心 276→插位 1）→松手→清场+重排单次
    pMove(350, 40)
    await expect.poll(async () => q('.drag-slot:not(.cand)') !== null).toBe(true)
    pUp(350, 40)
    expect(reorder).not.toHaveBeenCalled() // settle 落定后才写
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C', 'D'])
    expect(cardOf('A').getAttribute('style') === null || cardOf('A').getAttribute('style') === '').toBe(true)
  })

  // ── [F-DRAGREMOUNT-01 R-2] 中行源卡保育（测试盲区闭合——门一 k1 C-6-2/
  // d1 F3 双源发现）：8 卡 W=570.4→partition(8)=[3,2,3]，拖 D（srcIdx=3 落
  // 行 1=非首非末行）——判别面=fosterRow≠0（杀 fosterRow≡0 误形态）；
  // ①段 ghost inline 四键全锁（12 号理想面完备）；收尾=框内松手零位移
  // settle（零写+inline 清空）。──
  it('中行源卡保育 [F-DRAGREMOUNT-01]：非首非末行源卡（行 1 odd）拖起=节点保育+ghost inline 四键全锁（position/width/marginLeft/transition）→驻保育行（fosterRow=1 判别面）→框内松手零位移 settle（零写+inline 清空）', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D'), node('E'), node('F'), node('G'), node('H')]
    mount(nodes)
    // W 注入（第 18 例同型）：570.4→N=3/M=2→partition(8)=[3,2,3]（行 1 odd [D,E]）
    req('.month-frame').setAttribute('style', 'width: 570.4px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px')
    await act(async () => {
      root?.render(
        <LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
      )
    })
    const rows = Array.from(req('.month-frame').querySelectorAll('.tl-row'))
    expect(rows.length, '布防卫：三行网格在场').toBe(3)
    expect(rows[1]!.classList.contains('odd'), '布防卫：行 1=奇行').toBe(true)
    expect(rows[1]!.contains(cardOf('D')), '布防卫：D=行 1 中行源卡').toBe(true)
    // 几何定值=网格算术位（行 0/2 x=12+200k y=18/306；行 1 odd x=112+200k
    // y=162——D=行 1 k0 中心 176/198）
    stubRect(req('.month-frame'), 0, 0, 600, 460)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 212, 18)
    stubRect(cardOf('C'), 412, 18)
    stubRect(cardOf('D'), 112, 162)
    stubRect(cardOf('E'), 312, 162)
    stubRect(cardOf('F'), 12, 306)
    stubRect(cardOf('G'), 212, 306)
    stubRect(cardOf('H'), 412, 306)
    // ① 激活帧：D（行 1 中行源卡）拖起=同父保育+ghost inline 四键全存续
    const pre = cardOf('D')
    pDown(pre, 176, 198)
    pMove(182, 202)
    const post = cardOf('D')
    expect(post).toBe(pre) // 激活帧同父 keyed 调和=节点保育（中行源卡面）
    expect(post.style.position, 'ghost inline 全键存续（position——离流单源）').toBe('absolute')
    expect(post.style.width, 'ghost inline 全键存续（width——内容域定宽）').toBe('128px')
    expect(post.style.marginLeft, 'ghost inline 全键存续（marginLeft 压 0）').toBe('0px')
    expect(post.style.transition, 'ghost inline 全键存续（transition 禁断）').toBe('none')
    expect(post.style.left, '激活帧 inline 已落同一节点（left）').not.toBe('')
    expect(post.style.top, '激活帧 inline 已落同一节点（top）').not.toBe('')
    const tailRow = post.closest('.tl-row')
    expect(tailRow).toBe(rows[1]) // 驻保育行=拖前原行（D=row1 中行源卡）
    expect(tailRow!.classList.contains('odd'), '保育行=行 1 奇行（fosterRow=1 判别面）').toBe(true)
    // ② 框内松手（指针=D 位→插位 3=原位）：零位移 settle——零写+inline 清空
    pUp(182, 202)
    fireEnd(cardOf('D'))
    expect(reorder).not.toHaveBeenCalled()
    expect(cardOf('D').getAttribute('style') === null || cardOf('D').getAttribute('style') === '').toBe(true)
  })

  // [F-SLOTGRID-01 U1] 「[回炉 R1] 瀑布错位卡拖拽无双计」用例随瀑布布局退役
  // 删除——错位 inline margin-left 机制（offsetTop 注入→82px→dragging 压 0→
  // settle 恢复）整体消亡；settle 清场序（inline 四键清空）由 R1 零位移/R4
  // 兜底例沿承锁定，dragging 压 0 防御写由 R2 例沿承（豁免登记在案）。
})
