// @vitest-environment jsdom
/**
 * [B3 设计先行] 拖拽会话守卫测试（现状绿——B3 拆件/帧批/translate 化后
 * 不回退的缝隙锁；docs/design/2026-11-22_b3-drag-frame-g-g2-design.md §12）。
 *
 * 与既有受锁测试的关系：不复制既有断言（INV-83/98/111/140 语义面已有
 * lineage-card-drag/lineage-drag-session-grid/lineage-visfb31-ownscale 三族
 * 锁定），只锁 B3 改动**会触碰的接缝**：
 * - G1/G2/G3/G4：onMove/会话迁移拆件（card-drag-session→session 迁移件+
 *   drag-session-geometry）后，阈值门/settle 忽略/回弹/双入口时序不回退；
 * - G5：TimelineYears 拆件（TimelineMonthFrame/卡行组件）后激活帧节点保育
 *   不回退（INV-140 缝隙——只锁 B3 不动的键：position/marginLeft/transition；
 *   定位键面由 lineage-b3-frame F4 红 tests 承接）；
 * - G6：帧批化后落点数学=末位指针（风暴合帧不改变 insertIndexFromGrid
 *   判定——调度器用陈旧指针即红）；
 * - G7：G2 终态清理缝隙——settle 后 .stretch 摘除+--lg-pull 变量清零
 *   （pullPx 脱离 React 直写后清理面新载体的防回退锁）；
 * - G8：终局批（主控处置单 B2）——过阈 move 不 flush rAF 直接 up 仍 settle
 *   非 click（现状绿=现行同步处理；锁实现批 up/cancel 入口「未 flush 指针
 *   先按 lastClient 同步终局批」不缺）；
 * - G9：占位槽加深面（主控处置单 W6）——overFrame=false 时占位槽 faded 在场
 *   且无 target 类（现状绿=现行无 target；锁实现批 target 仅 overFrame 挂）；
 * - G10：过阈且跨槽的末次 move 未 flush 直接 up，仍按 lastClient 落组末并写新序
 *   （现状绿=现行同步处理；锁终局批不缺跨槽读算提交）。
 * - G11：flight finish 后、padding 终局前的布局屏障期仍拒绝第二次 pointerdown
 *   （三轮新增红例；现行 phase=idle 会激活第二会话，方案 A 延长锁后转绿）；
 *   末段断言旧 padding end 后屏障释放、第三会话可激活。
 * - G12：激活首移即入带=同帧 .stretch 挂载且 --lg-pull=实际 pullPx（非 82px
 *   fallback 非 ''——DS 终判补录守卫，锁迁移 4b/③ 条件写互斥消除）。
 *
 * 兼容两态写法：每个指针派发后 flushRaf（现行同步路径=无害冲洗；实现批
 * 帧批路径=正常驱动）；transitionend 以 left+translate 双 propertyName 派发
 * （现行 left 生效/实现批 translate 生效——finishOnce 幂等，两态各自消费其一）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import { stubLiveFrame } from '../../utils/live-frame'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
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
const click = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
/** 双 propertyName 派发（left=现行消费/translate=实现批消费——幂等收口） */
const fireEndBoth = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
  })
}

function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  toastStoreSpy.mockClear()
  reorder.mockClear()
  onNodeClick.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})
afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}

describe('[B3 守卫] 拖拽会话接缝锁（G11 为三轮新增红例，其余现状绿）', () => {
  it('G1 阈值未过=单击链（INV-83 缝隙）：3px 内移动+松手无占位槽零写；click 照常选中（会话迁移件不得破坏 moved 门）', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(152, 201)
    flushRaf()
    pUp(152, 201)
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    click(cardOf('A'))
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything())
  })

  it('G2 settle 期再 pointerdown=忽略（INV-83 缝隙）：飞行中第二会话不激活、终局单写', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(300, 40) // B（cell1）中心 276 右侧 → 末位
    flushRaf()
    pUp(300, 40)
    // settle 飞行中（transitionend 未派发）：新 pointerdown+move 零动作
    pDown(cardOf('B'), 150, 200)
    pMove(170, 220)
    flushRaf()
    pUp(170, 220)
    expect(q('.drag-slot')).toBeNull()
    fireEndBoth(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('G3 跨月=物理域回弹 no-op（INV-98 缝隙）：源框外松手零写零 toast（overSourceFrame 迁 geometry 件后单源不回退）', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 }), node('X', { month: 10 })])
    const frames = [...host!.querySelectorAll('.month-frame')]
    stubRect(frames[0]!, 0, 0, 600, 200)
    stubRect(frames[1]!, 0, 300, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 40) // 框内变序：B 右半 → [B,A]
    flushRaf()
    pMove(300, 400) // 落他月框（跨月面）
    flushRaf()
    pUp(300, 400)
    expect(toastStoreSpy).not.toHaveBeenCalled()
    fireEndBoth(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled() // 回弹原位=序不变=no-op
  })

  it('G4 up+cancel 双入口同帧幂等（INV-83 缝隙）：pointerup+pointercancel 单帧连发→单次 settle 单写', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(300, 40) // insertIdx=1
    flushRaf()
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 300, clientY: 40 }))
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 9999, clientY: 40 }))
    })
    expect(q('.drag-slot')).toBeNull()
    fireEndBoth(cardOf('A'))
    fireEndBoth(cardOf('A')) // 二次 transitionend=幂等面
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('G5 激活帧节点保育（INV-140 缝隙）：跨行布防下源卡拖起=同父 keyed 调和（节点同一性）+B3 不动键存续（position/marginLeft/transition）+驻原行', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    await injectW(nodes, 570.4) // 归一化 546.4→N=3/M=2→[A,B,C]/[D]（跨行布防）
    stubRect(req('.month-frame'), 0, 0, 600, 400)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 212, 18)
    stubRect(cardOf('C'), 412, 18)
    stubRect(cardOf('D'), 112, 162)
    const rows = Array.from(req('.month-frame').querySelectorAll('.tl-row'))
    expect(rows.length, '布防卫：两行网格在场').toBe(2)
    const pre = cardOf('A')
    pDown(pre, 76, 54)
    pMove(82, 58) // 过阈激活
    flushRaf()
    const post = cardOf('A')
    expect(post).toBe(pre) // 激活帧同父 keyed 调和=节点保育
    expect(post.style.position).toBe('absolute') // B3 不动键（离流单源）
    expect(post.style.marginLeft).toBe('0px') // B3 不动键（双计防线）
    expect(post.style.transition).toBe('none') // B3 不动键（禁断过渡）
    expect(post.closest('.tl-row')).toBe(rows[0]) // 驻保育行=拖前原行
    pUp(76, 54)
    fireEndBoth(post)
    expect(reorder).not.toHaveBeenCalled() // 原位零写
  })

  it('G6 风暴合帧落点=末位指针（INV-111 缝隙）：同帧多 move 只落末位插入区——调度器用陈旧指针即红', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(277, 40) // cell1（B）中心右 → insertIdx=1
    pMove(480, 40) // cell2（C）中心 476 右 → insertIdx=2（组末）——不 flush 连发
    flushRaf()
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.previousElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    pUp(480, 40)
    fireEndBoth(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('G7 G2 终态清理缝隙：下拉带 settle 后 .stretch 摘除+--lg-pull 变量清零+行结构恒定（store 提交不引发第二轮布局）', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 290) // 越缘超封顶（pull=82）
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('82px')
    pUp(240, 290) // 撑高框内松手=组末落位
    expect(frame.classList.contains('stretch')).toBe(false)
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('')
    fireEndBoth(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
    const rowsBefore = host!.querySelectorAll('.tl-row').length
    expect(rowsBefore).toBe(1) // unmeasured 单行——settle 前后行结构恒定
  })

  it('G8 终局批（B2 锁）：过阈 move 不 flush rAF 直接 up=仍 settle 非 click（up 先于帧 flush 不读陈旧 moved/insertIdx）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44) // 过阈（hypot(6,4)≈7.2≥5）——故意不 flush rAF
    pUp(66, 44) // up 先于帧 flush 到达
    // settle 已发生（非 click 链）：拖后 click 抑制在场——随后的 click 不选中
    expect(q('.drag-slot')).toBeNull()
    click(cardOf('A'))
    expect(onNodeClick).not.toHaveBeenCalled()
    fireEndBoth(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled() // lastClient=(66,44)→insertIdx=srcIdx=0 原位=序不变零写
  })

  it('G9 占位槽加深面（W6 锁）：overFrame=false 时占位槽 faded 在场且无 target 类（target 仅 overFrame 挂——框外不得加深）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(300, 400) // 框外（下拉带下界 282 之外）→ overFrame=false
    flushRaf()
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.classList.contains('faded')).toBe(true)
    expect(ph.classList.contains('target')).toBe(false)
    expect(host!.querySelectorAll('.drag-slot.target').length).toBe(0)
  })

  it('G10 终局批跨槽落点：过阈 move 未 flush 直接 up 到组末=按 lastClient 写新序（现行同步实现绿，锁帧批化不缺终局读算）', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(500, 40) // 过阈且到组末；故意不 flush
    pUp(500, 40)
    fireEndBoth(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('G11 布局屏障期 pointerdown 忽略：flight finish 后 padding end 前第二会话不得激活（方案 A——红因=现行 phase 已回 idle）', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 250)
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    pUp(240, 250)
    fireEndBoth(cardOf('A')) // 旧 flight 已终局；padding 回落事件故意未发
    expect(q('.drag-slot')).toBeNull()
    pDown(cardOf('B'), 220, 60) // 现行 idle 会开新会话；实现批 layout.active 闸拒绝
    pMove(226, 64)
    flushRaf()
    expect(q('.drag-slot'), '旧布局屏障不得被第二会话清除或重叠').toBeNull()
    expect(cardOf('B').classList.contains('dragging')).toBe(false)
    // （DS 增量复核补）旧 padding 回落终局后屏障释放：第三会话可正常激活
    act(() => {
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
    })
    pDown(cardOf('B'), 220, 60)
    pMove(226, 64)
    flushRaf()
    expect(cardOf('B').classList.contains('dragging'), '布局终局后锁释放').toBe(true)
  })

  it('G12 激活首移即入带：同帧 .stretch 挂载且 --lg-pull=实际 pullPx（非 82px fallback 非 \'\'——迁移 4b/③ 条件写互斥消除）', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(240, 250) // 首移即入带：位移 hypot(180,210)≥5 阈且 y=250>冻结基准 bottom0=200（x=240 带内）——激活与入带同帧
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    expect(frame.style.getPropertyValue('--lg-pull'), '同帧写实际 pullPx=(250−200)=50px').toBe('50px')
  })

  it('G13 未提交 stretch 的快速拖放不启动 600ms 布局锁（回炉 W1）：pending 首移直接入带未 flush 即 up→旧卡 flight 完成后下一张卡可立即激活（红因=noteExtend 真变假不区分 .stretch 是否已提交）', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(240, 250) // 首移直接入带（不 flush——React 未提交中间 .stretch）
    pUp(240, 250) // 未 flush 即松手：终局批同任务「激活入带→settle 出带」
    fireEndBoth(cardOf('A')) // 旧卡 flight 完成=布局终局（无 padding 跟踪窗）
    pDown(cardOf('B'), 220, 60)
    pMove(226, 64)
    flushRaf()
    expect(cardOf('B').classList.contains('dragging'), '未提交 stretch 不得启动 padding 跟踪+600ms 兜底锁').toBe(true)
  })

  it('G14 INV-140 保育键跨提交存续（回炉 W5）：激活写 translate/will-change 跨 React 提交（跨槽 insertIdx+overFrame 翻转）键与值存续、节点保育不破', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活帧：translate='6px 4px'+will-change:translate
    const pre = cardOf('A')
    expect(pre.style.translate).toBe('6px 4px')
    expect(pre.style.willChange).toBe('translate')
    pMove(480, 40) // 跨槽（insertIdx 真变化→源月框 React 提交）
    flushRaf()
    expect(cardOf('A')).toBe(pre) // keyed 同父调和=节点保育（INV-140 前提）
    expect(pre.style.translate, '跨槽提交后激活键存续（值=末帧批 own 差值 (432,18)−(12,18)）').toBe('420px 0px')
    expect(pre.style.willChange).toBe('translate')
    pMove(300, 400) // 框外（overFrame 翻转提交）
    flushRaf()
    expect(cardOf('A')).toBe(pre)
    expect(pre.style.translate).toBe('240px 360px')
    expect(pre.style.willChange).toBe('translate')
  })
})
