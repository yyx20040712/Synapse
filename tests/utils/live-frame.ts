/**
 * [F-UIRES-03 T0] 单测随动模型 helper（设计稿 §8.1.6——随动模型推广单源）。
 *
 * 范式源=lnfix2 lineage-card-stretch 局部 stubLiveFrame 的抽件 helper 化：
 * rect mock 不再喂静态定值，而是**随 DOM 实时结构/类名派生**（真机布局语义
 * 在 jsdom 可判别——静态定值 mock 的假绿教训单源见该件头注）。两件：
 * - stubLiveFrame：月框底缘随 stretch 类名/实态槽 DOM 位派生（下拉扩展域
 *   判定面）——参数化=基准 bottom/撑高量/腾行量/框宽/实态槽判定查询；
 * - stubRowFollowFlow：行布局随动模型——卡与实态占位槽的 rect 由**当前
 *   DOM 流序**派生（占位槽插入/移位=真机腾位语义；.dragging 卡离流不占
 *   槽；.cand 候选与未登记元素=零盒≡jsdom 原生无布局语义）。
 *
 * 卸载语义（与 tests/utils/geometry.ts A 族同约定）：安装责任在本件，
 * 还原责任在测试文件 afterEach 的 vi.restoreAllMocks()。受锁文件。
 */
import { vi } from 'vitest'

/** 伪造完整 DOMRect（toJSON——真浏览器同形） */
function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({})
  } as DOMRect
}

export interface LiveFrameOptions {
  /** 拖前稳态底缘（grab 帧冻结基准源） */
  baseBottom: number
  /** stretch 挂载（.month-frame.stretch）padding-bottom 增量 */
  stretchPad?: number
  /** 实态槽组末腾行增量（占位槽位于末卡之后=真机新行语义） */
  slotRowGrow?: number
  /** 框宽（left/top 固定 0/0——范式源同形） */
  width?: number
  /** 实态槽判定查询（在框内且位于末个非拖卡之后才计腾行） */
  slotSelector?: string
}

/**
 * 月框底缘随动模型（lnfix2 stubLiveFrame 零语义迁移单源）：
 * - bottom = baseBottom +（stretch 类在场 ? stretchPad : 0）
 *   +（实态槽在末个非拖卡之后 ? slotRowGrow : 0）
 * - 其余维度静态（left/top=0、width/height=派生 bottom）。
 */
export function stubLiveFrame(frame: HTMLElement, opts: LiveFrameOptions): void {
  const {
    baseBottom,
    stretchPad = 94,
    slotRowGrow = 92,
    width = 600,
    slotSelector = '.drag-slot:not(.cand)'
  } = opts
  vi.spyOn(frame, 'getBoundingClientRect').mockImplementation(() => {
    let bottom = baseBottom
    if (frame.classList.contains('stretch')) bottom += stretchPad
    const ph = frame.querySelector(slotSelector)
    const cards: HTMLElement[] = []
    frame.querySelectorAll<HTMLElement>('.tl-card:not(.dragging)').forEach((c) => {
      cards.push(c)
    })
    const last = cards[cards.length - 1]
    if (
      ph !== null &&
      last !== undefined &&
      (last.compareDocumentPosition(ph) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    ) {
      bottom += slotRowGrow
    }
    return rect(0, 0, width, bottom)
  })
}

export interface RowFlowOptions {
  /** 行首 x（框内 padding 语义） */
  startX?: number
  /** 行首 y */
  startY?: number
  /** 流序步进（卡宽+隙） */
  stepX?: number
  /** 卡宽 */
  cardW?: number
  /** 卡高 */
  cardH?: number
  /** 框自身静态 rect 宽/高（随动面=框内条目；框盒本身不派生——stretch 域用 stubLiveFrame 组合） */
  frameW?: number
  frameH?: number
}

/**
 * 行布局随动模型：原型级单桩（geometry.ts A 族同约定）——
 * - 框 = 静态盒 (0,0,frameW,frameH)；
 * - 框内在流条目（.tl-card[data-node-id]:not(.dragging) ∪ 实态槽
 *   .drag-slot:not(.cand)）按**当前 DOM 序**线性布位（startX+k×stepX）；
 * - 其余元素零盒（≡jsdom 原生无布局——非在流面不参与布局语义）。
 */
export function stubRowFollowFlow(frame: HTMLElement, opts: RowFlowOptions = {}): void {
  const { startX = 12, startY = 18, stepX = 148, cardW = 128, cardH = 72, frameW = 600, frameH = 200 } = opts
  const flowItems = (): Element[] =>
    Array.from(
      frame.querySelectorAll('.tl-card[data-node-id]:not(.dragging), .drag-slot:not(.cand)')
    )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this === frame) return rect(0, 0, frameW, frameH)
    const idx = flowItems().indexOf(this)
    if (idx >= 0) return rect(startX + idx * stepX, startY, cardW, cardH)
    return rect(0, 0, 0, 0)
  })
}
