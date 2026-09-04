# F-A6-c（D2 调度与快路径票）·门二终位审材料包（deepseek 链,零仓库接触）

你是门二终审官。门一（Kimi k3）PWW（2W2N），实现者已回炉处置四条（处置记录=§4 裁决表 §12 门一回炉处置档段）。终位审四维：

1. **调度与快路径终核**（门一已放行——可维持或推翻）：rAF 改形（合帧去重/leading/settle 逐字）/快路径四守卫+G2 同门/回退三层/INV-58 后半（快慢等价+同帧覆盖）/SelectionPaint memo。
2. **门一处置闭合度**：W1=cancel-before-evaluate 顺序锚（zoom 差分判别轴,先红[删 cancel 恰 W1 it 红]后绿;**过程发现=portal DOM 插入诱发原生 selectionchange→新 rAF 幂等重渲,定性生产无害（快/全量同族同产物=INV-58 等价性吸收）+终版预渲染形态隔离**——该定性你终裁）;W2=MUT2 落点（调度器工厂防抖消费点 ops.windowMs→100,两件经同一消费点同红,重跑留档）;N1=头注笔误修正;N2=措辞收敛（clientRects/gCS 链尽消限定+绝对量上行披露）。
3. **材料口径差说明（主控核验补充）**：门一 W1 部分=「改 10 件 diff 实见 9 段」——第 10 件=locks/manifest.json（不在 src/tests 的 diff 导出口径内,登记 277 条与工作树同步已主控核验）;mouseup 内 scheduler.cancel()→evaluate.full(true) 顺序源码在档（主控直读核验）——材料完整性问题非实现缺失,处置=W1 测试锚已补。
4. **决策终位**：F-A6-c 可否提交收口;F-A6 战役剩余面（d 收口票:e2e+INV 登记+ADR+locks 收账）开工条件是否满足;「live range 诱发链」定性是否需进 F-A6-d e2e 断言面。

输出：只输出一个 JSON 对象,不要 markdown 围栏：
{"verdict":"PASS|PASS_WITH_WARNINGS|FAIL","findings":[{"severity":"BLOCKING|WARN|NIT","target":"...","issue":"...","evidence":"...","suggestion":"..."}],"summary":"两三句"}
无发现给空 findings+PASS。

## 1. 门一审材料包全文（上游依据+调度器全文+两新测试件+diff+声明+§12 对照）

# F-A6-c（D2 调度与快路径票·B 案）·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审「拖选调度 rAF 对齐+快路径 evaluateVisual」的实现:diff+调度器全文+两新测试件全文+第四轮 tick 对照。你拿不到仓库,只审本包。

## 0. 上游依据(已多轮门审在档,不重审)

F-A6 设计书 §0 B 案(用户四点裁决:INV-37 拖选期弱化为「所见≈所存」已获显式授权——快路径同管线+四道守卫,松手/保存时刻严格恢复=settle 全量单一权威)§3(D2 机理:200ms 节流=5Hz 步进+每 tick 全量冗余)§5.2(调度器新形态:rAF leading ≤16ms/帧内合帧/settle 防抖 200ms 逐字/cancel 清句柄)§5.3(受锁配套:S1b/S1c 改写 rAF 语义;帧内合帧去重=唯一新逻辑单元至少一锚;「settle 产物落地同帧覆盖快路径产物」断言票面强制)b2 已奠 INV-58 前半(save 与 paint 同源项几何链);本票=后半(快路径同族)+D2 调度根治。

## 1. 审查任务

1. **调度器改形正确性**(selection-geometry.ts 全文 §2):rAF leading 首事件即排(≤16ms);帧内合帧去重(raf 句柄非空不重排);settle 防抖 200ms 逐字(距末事件语义);cancel 清双句柄;**旧 200ms leading+trailing 节流整体删除**(方案切换=删旧)。竞态面:rAF 回调执行时选区已坍缩?mouseup cancel 与在途 rAF 的顺序?
2. **快路径正确性**(diff 中 selection-evaluate.ts):四道守卫前置(全四条);G2 同门拖选抑制;轻量 probe(probeOffsetLen 复刻 anchor-serialize 私有 probeTextLength——Rule of Three 第 2 次保持重复的口径);store 直读+对账;itemSelectionGeometry 复用(INV-58 后半=快路径同族);回退三层(快路径→全量→DOM 量测)语义;visualOnly 参数面的生死(仅剩快路径回退一个活调用方?)。
3. **测试纪律**:S1b/S1c 改写(帧前零渲染/单帧 ≤16ms/防抖窗锚);selection-geometry.test 4 it(合帧去重锚);selection-evaluate.test 3 it(快慢等价 INV-58/同帧覆盖[票面强制]/跨页守卫);变异红证 4(合帧删/防抖 100ms/守卫删/hComparable 删);**自裁申报 1(三锚在旧实现即绿——红证以变异交付)与申报 2(G2 断言时序适配)**是否可接受。
4. **第四轮对照忠实度**(§4):mutations 7→20/间隔 200→59.5(delta med 32.3→11.9)/gCS 685→87(=仅末尾 settle 一次的归因)/clientRects 8→1(「布局读出链尽消」)/D1 面逐位不变——归因链是否自洽;50/60 交替=rAF 帧栅格量化的解释;§12 申报③(16.7ms 上限需更密口径)。
5. **红线**:范围(6 src+3 受锁测试+2 新测试)/恒真/占位/旧节流残留。

## 2. selection-geometry.ts 全文(141 行)

```ts
/**
 * [F-A4] selection-geometry —— 划选几何域（纯函数+常量，自 SelectionLayer 拆出
 * ——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - closestPageRoot/pageIndexOf 自 SelectionLayer 迁入（F-02 纯函数页盒遍历，
 *   行为零变；原导出面经 SelectionLayer 再导出保持 API 零变——票面 §2）。
 * - localScale（c 面「坐标系双重放大」根治单源）：视口 px 差值 ÷ 有效 zoom
 *   归一到挂载盒本地 px。比值=el.clientWidth（CSS 本地布局 px，不含祖先
 *   zoom）/el.gBCR.width（根框视觉 px，含全部祖先 zoom 复合）——任意嵌套
 *   zoom（.app-content-row 的 ui-scale 等）自动复合，零 CSS 类耦合（不查
 *   挂载点类名——改挂载点/加档不破）。思想 crib lineage-viewport
 *   rootToLocalScale（F-L2/INV-43），reader 域新写不复用跨域 import
 *   （票面 §0c 裁决）。任一量测 ≤0（未挂载/不可量测——jsdom 桩面
 *   clientWidth 恒 0）→1（防御：退化直通，不产生除零/NaN）。
 * - toolbarViewportPos：工具条视口域定位（票面 §1c）——选区上方 TOOLBAR_ABOVE
 *   常规位；选区顶距滚动容器可视区顶 <TOOLBAR_ABOVE（工具条高+间隙）时
 *   **下翻转**（放选区下方 TOOLBAR_BELOW_GAP）；随后对滚动容器可视区做
 *   **夹取**（工具条不越滚动容器）。scroller=null（无滚动容器上下文——
 *   单测桩面/非阅读器挂载）不翻转不夹取，落点=选区原生位置。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 全纯函数零 React/DOM 写依赖（gBCR/clientWidth 只读）；组件测试：
 *   tests/unit/renderer/selection-layer.test.tsx（P1 归一）+
 *   tests/unit/renderer/selection-paint.test.tsx（c 面三态）。
 */
/** 工具条定位：估算宽度（水平夹取）与选区上方留白（F-07 既有值） */
export const TOOLBAR_WIDTH = 180
export const TOOLBAR_ABOVE = 42
/** 工具条估算高度（垂直夹取）与下翻转间隙（F-A4 c 面新增） */
export const TOOLBAR_HEIGHT = 32
export const TOOLBAR_BELOW_GAP = 8

/** 视口矩形（gBCR 口径——getBoundingClientRect 的结构化形状） */
export interface ViewportBox {
  x: number
  y: number
  width: number
  height: number
}

/** F-02：节点向上最近页盒（[data-page-root] 元素——页列渲染窗内页才有；
 *  锚定根动态遍历的纯函数，测试直测） */
export function closestPageRoot(node: Node | null): HTMLElement | null {
  let cur: Node | null = node
  while (cur !== null) {
    if (cur instanceof HTMLElement && cur.hasAttribute('data-page-root')) {
      return cur
    }
    cur = cur.parentNode
  }
  return null
}

/** F-02：页盒页号（data-page-root 值 1 基→0 基页码；缺失/非法值 null） */
export function pageIndexOf(root: HTMLElement): number | null {
  const no = Number(root.getAttribute('data-page-root'))
  return Number.isInteger(no) && no >= 1 ? no - 1 : null
}

/** 视口→挂载盒本地坐标比值（1/有效 zoom；量测退化→1 直通） */
export function localScale(el: Element, rect?: DOMRect): number {
  const rw = (rect ?? el.getBoundingClientRect()).width
  const cw = el.clientWidth
  return rw > 0 && cw > 0 ? cw / rw : 1
}

/** 工具条视口域定位：上方常规位→近顶下翻转→滚动容器可视区夹取（纯函数） */
export function toolbarViewportPos(sel: ViewportBox, scroller: ViewportBox | null): { x: number; y: number } {
  let y = sel.y - TOOLBAR_ABOVE
  let x = sel.x
  if (scroller !== null) {
    // 下翻转：选区顶距可视区顶不足一个常规位（工具条高+间隙≈TOOLBAR_ABOVE）
    // ——放选区下方（票面 §1c「选区近顶时下翻转」）
    if (sel.y - scroller.y < TOOLBAR_ABOVE) {
      y = sel.y + sel.height + TOOLBAR_BELOW_GAP
    }
    // 视口夹取：工具条整体落在滚动容器可视区内（票面 §1c「不越滚动容器可视区」）
    const maxY = Math.max(scroller.y + scroller.height - TOOLBAR_HEIGHT, scroller.y)
    y = Math.min(Math.max(y, scroller.y), maxY)
    const maxX = Math.max(scroller.x + scroller.width - TOOLBAR_WIDTH, scroller.x)
    x = Math.min(Math.max(x, scroller.x), maxX)
  }
  return { x, y }
}

/** [F-A4 c 面] 工具条挂载盒本地落点装配：视口域定位（翻转+夹取）→÷有效 zoom
 *  归一（挂载盒在 ui-scale 缩放子树内——直写视口差会被 CSS zoom 二次放大） */
export function toolbarMountPos(pageRoot: HTMLElement, sel: ViewportBox): { x: number; y: number } {
  const mountBox = pageRoot.getBoundingClientRect()
  const scale = localScale(pageRoot, mountBox)
  const scBox = pageRoot.closest('.overflow-auto')?.getBoundingClientRect()
  const vp = toolbarViewportPos(
    sel,
    scBox === undefined ? null : { x: scBox.x, y: scBox.y, width: scBox.width, height: scBox.height }
  )
  return { x: (vp.x - mountBox.x) * scale, y: (vp.y - mountBox.y) * scale }
}

/** [B1 回炉→F-A6-c rAF 对齐] selectionchange 双路调度器（设计书 §5.2）：
 *  视觉路=首事件即排 requestAnimationFrame（leading ≤16ms——S1b 零反馈红线），
 *  已排程则不重排=帧内合帧去重（同帧多次 selectionchange 恰一次 evaluateVisual
 *  ——60Hz 上限+帧内天然合帧，取代 B1 的 200ms leading+trailing 节流[5Hz 步进
 *  =D2a 病根，取证 §7 实测 mutation 间隔 ~200ms]）；settle 路=防抖 200ms 与
 *  mouseup 即时全量逐字保持（工具条弹出语义/S1b 后半零变）。工厂返回 handler
 *  （addEventListener 直用）+cancel（mouseup/卸载成对清理——rAF 句柄与防抖
 *  双清，INV-14 同型）。rAF×React 并发面申报（设计书 §5.2）：rAF 后台/遮挡
 *  暂停影响面=隐藏态程序化选区视觉陈旧（cosmetic——Electron 单窗口+拖选需
 *  前台输入，真拖选不可触发）。 */
export function createVisualScheduler(ops: {
  onVisual(): void
  onSettled(): void
  windowMs: number
}): { handler(): void; cancel(): void } {
  let debounce: number | null = null
  let raf: number | null = null
  return {
    handler: () => {
      // 视觉路：本帧未排程才排 rAF（帧内合帧去重）；回调读当下选区=帧随动
      if (raf === null) {
        raf = window.requestAnimationFrame(() => {
          raf = null
          ops.onVisual()
        })
      }
      // settle 路：防抖（每事件重置——弹出语义零变）
      if (debounce !== null) window.clearTimeout(debounce)
      debounce = window.setTimeout(() => ops.onSettled(), ops.windowMs)
    },
    cancel: () => {
      if (debounce !== null) {
        window.clearTimeout(debounce)
        debounce = null
      }
      if (raf !== null) {
        window.cancelAnimationFrame(raf)
        raf = null
      }
    }
  }
}

```

## 3. 两新测试件全文

### selection-geometry.test.ts
```ts
// @vitest-environment jsdom
/**
 * [F-A6-c] selection-geometry —— rAF 对齐调度器直测（always-active——ADR-0017
 * 裁决 3 不经 guardedDescribe）。
 *
 * 调度器测试锚显式声明（设计书 §5.3）：createVisualScheduler 现行（F-A4 B1 节流
 * 形态）无直测——行为锚=selection-paint.test S1b/S1c 组件级（grep tests/ 对
 * selection-geometry 直接 import 零命中，实测在档）。rAF 改形（F-A6-c）后
 * 「帧内合帧去重」=改形中唯一无现行对应物的新逻辑单元，至少锚一 it（本件 C1）
 * ——settle 防抖/cancel 语义随件锁定（票面 §1-A「逐字保持」条款的直测面）。
 *
 * 时序口径：vitest fake timers 默认 fake requestAnimationFrame
 * （advanceTimersByTimeAsync(16) 触发——设计书 §5.2 rAF×React 并发面申报；
 * 本仓实证：t=15 零回调/t=16 双回调）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVisualScheduler } from '../../../src/renderer/features/reader/selection-geometry'

describe('F-A6-c createVisualScheduler —— rAF 对齐双路调度', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('C1 帧内合帧去重（改形唯一无现行对应物的新逻辑单元）：同帧多次 selectionchange 恰一次 evaluateVisual；次帧新事件再排程', async () => {
    const onVisual = vi.fn()
    const onSettled = vi.fn()
    const s = createVisualScheduler({ onVisual, onSettled, windowMs: 200 })
    // 帧前三连发（同一帧内——已排程则不重排=帧内合帧去重）
    s.handler()
    s.handler()
    s.handler()
    // 视觉回调挂帧点（rAF 对齐——非事件内同步执行；leading 同步节流的旧形态在此红）
    expect(onVisual).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(16)
    expect(onVisual).toHaveBeenCalledTimes(1)
    // 次帧（rAF 句柄已释放）：新事件再次排程——去重只合帧不吞帧
    s.handler()
    await vi.advanceTimersByTimeAsync(16)
    expect(onVisual).toHaveBeenCalledTimes(2)
  })

  it('C2 leading 首事件即排 rAF（S1b 零反馈红线 ≤16ms）：单事件后一帧内 onVisual 落地', async () => {
    const onVisual = vi.fn()
    const s = createVisualScheduler({ onVisual, onSettled: () => undefined, windowMs: 200 })
    s.handler()
    await vi.advanceTimersByTimeAsync(16)
    expect(onVisual).toHaveBeenCalledTimes(1)
  })

  it('C3 settle 防抖 200ms 逐字保持（票面 §1-A）：窗内连发重置窗（基准=末事件）；距末事件 199ms 未 settle、200ms 到期恰一次（100ms 变异在 199ms 断言红）', async () => {
    const onSettled = vi.fn()
    const s = createVisualScheduler({ onVisual: () => undefined, onSettled, windowMs: 200 })
    s.handler()
    await vi.advanceTimersByTimeAsync(100)
    s.handler() // 窗内再发（t=100）→ 防抖窗重置（工具条弹出语义零变——基准=末事件）
    await vi.advanceTimersByTimeAsync(99) // t=199：距末事件 99ms
    expect(onSettled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100) // t=299：距末事件 199ms
    expect(onSettled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1) // t=300：距末事件 200ms——到期
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it('C4 cancel 清 rAF 句柄与防抖（INV-14 同型）：cancel 后推进帧与窗均零回调', async () => {
    const onVisual = vi.fn()
    const onSettled = vi.fn()
    const s = createVisualScheduler({ onVisual, onSettled, windowMs: 200 })
    s.handler()
    s.cancel()
    await vi.advanceTimersByTimeAsync(300)
    expect(onVisual).not.toHaveBeenCalled()
    expect(onSettled).not.toHaveBeenCalled()
  })
})

```
### selection-evaluate.test.tsx
```tsx
// @vitest-environment jsdom
/**
 * [F-A6-c] selection-evaluate —— 快路径（evaluateVisual）行为面（always-active
 * ——ADR-2017 裁决 3 同款：新测试不经 guardedDescribe；诞生即锁）。
 *
 * 三组（票面 §1-E）：
 * - 快慢等价（INV-58 后半锚）：同夹具下快路径（rAF 帧产物）与全量（settle 产物）
 *   逐位一致——快路径与 settle 同族（项几何链），禁第二几何口径；
 * - 同帧覆盖（票面强制断言）：快路径产物落地后全量评估覆盖——paint 终态=全量
 *   产物（mid-drag zoom 变更形态制造快/全量几何差——非空转断言：快=zoom1 几何、
 *   全量=zoom2 几何，终态必须=zoom2；「快路径跳过同帧覆盖/双链并存」在此红）；
 * - 快路径守卫前置（Kimi 拟定裁决 2-§5①(ii)）：跨页选区 visual 路静默
 *   setPaint(null)——守卫删除的判别性锚（无守卫→快路径把跨页选区偏移归一化进
 *   单页项几何=paint 出块）。
 *
 * tick 预算断言（票面可选项）不设独立 it——帧随动语义已由 selection-paint.test
 * S1c（rAF 改写）+selection-geometry.test C1/C2 覆盖，组件级重复锚无增量。
 *
 * 夹具口径 crib selection-item-chain.test.tsx（页项直写 page-items.store；期望值
 * 手算 VP0 scale1：项 transform [10,0,0,10,72,700]→盒 {72,84,100,10}→
 * top=84/792≈10.6061%；zoom2→盒 {144,168,200,20}→top≈21.2121%）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionLayer'
import { usePageItemsStore } from '../../../src/renderer/features/reader/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import type { PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'

const { toastSpy, saveMock } = vi.hoisted(() => ({ toastSpy: vi.fn(), saveMock: vi.fn() }))
vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: toastSpy }))
vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { saveAnnotation: saveMock } },
  unwrap: async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
    const r = await p
    return r.data
  },
  ApiClientError: class extends Error {}
}))

/** jsdom 无布局：元素 rect 按预设表返回（textLayer 盒=归一化基准 612×792） */
const rects = new Map<Element, { x: number; y: number; width: number; height: number }>()
let origRangeGBCR: (() => DOMRect) | undefined
const rangeRect = { x: 10, y: 900, width: 200, height: 20 }

/** 单页夹具（口径 crib item-chain：textLayer 盒绝对位 (500,300) 域锁；span 盒=DOM
 *  量测域值 y=200——与项链 y=84 刻意不同：两条链产物判别性区分） */
function mountPageFixture(no: string, itemsText: string): { page: HTMLElement; span: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', no)
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = itemsText
  textLayer.appendChild(span)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(page, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(span, { x: 572, y: 500, width: 100, height: 10 })
  return { page, span }
}

/** 造项：transform=[10,0,0,10,x,y]（PDF 基线 (x,y)、字号 10、宽 100 高 10） */
function mkItem(str: string, x: number, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false }
}

function mkText(items: PdfTextItem[]): PdfTextContent {
  return { items, styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

function seedRegistry(no: number, text: PdfTextContent): void {
  act(() => {
    usePageItemsStore.getState().setEntry({ page: no, text, geometry: { rotate: 0, view: [0, 0, 612, 792] }, box: { w: 612, h: 792 } })
  })
}

function selectAllOf(span: HTMLElement): void {
  const sel = window.getSelection()
  const range = document.createRange()
  const textNode = span.firstChild as Text
  range.setStart(textNode, 0)
  range.setEnd(textNode, textNode.data.length)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function selectRange(startNode: Node, startOff: number, endNode: Node, endOff: number): void {
  const sel = window.getSelection()
  const range = document.createRange()
  range.setStart(startNode, startOff)
  range.setEnd(endNode, endOff)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const fireSelectionChange = (): void => {
  document.dispatchEvent(new Event('selectionchange'))
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={() => undefined} />)
  })
}

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
const paintBlocks = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
const firstRect = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rect"]') ?? null
/** 块几何快照（left/top/width/height——快慢产物逐位比对的面） */
const blockStyles = (): Array<Record<string, string>> =>
  paintBlocks().map((b) => ({ left: b.style.left, top: b.style.top, width: b.style.width, height: b.style.height }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  useReaderStore.setState(createReaderStoreInitialState())
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const r = rects.get(this)
    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
  })
  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
  window.getSelection()?.removeAllRanges()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('F-A6-c 快路径 evaluateVisual（rAF 帧×项几何链直取）', () => {
  it('快慢等价（INV-58 后半）：同夹具下 rAF 帧快路径产物与 settle 全量产物逐位一致（块数+四向几何）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    // rAF 帧（t=16）：快路径（轻量 probe→项几何链直取——无 selectionToAnchor）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    const fast = blockStyles()
    expect(fast.length).toBeGreaterThanOrEqual(1)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    // settle 全量（t=200：selectionToAnchor 锚定三元组+项几何主链——与快路径同族）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(blockStyles()).toEqual(fast)
  })

  it('同帧覆盖（票面强制断言）：快路径帧产物落地后全量评估覆盖——paint 终态=全量产物（mid-drag zoom 形态：快=zoom1、全量=zoom2，终态必须=zoom2 ≠ 快路径帧）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    // 快路径帧已落 zoom1 产物（top≈10.6061%）
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    // mid-drag zoom 变更（已知边界②形态——快路径帧已渲染，settle 现读新 zoom）
    act(() => {
      useReaderStore.setState({
        tabs: {
          'p-1': {
            paperId: 'p-1', fileUrl: '', fileName: '', title: '', page: 0, totalPages: 0, zoom: 2,
            color: 'yellow', annotations: [], status: 'ready', dirty: false
          }
        },
        activeId: 'p-1'
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    // 全量同帧覆盖：终态=zoom2 几何（21.2121%≠10.6061%——覆盖非并存、非停留快帧）
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
  })

  it('快路径守卫前置（裁决 2-§5①(ii)）：跨页选区 visual 路 rAF 帧后仍静默 setPaint(null)——无守卫时快路径把跨页偏移归一化进单页=paint 出块在此红', async () => {
    const { page: page1, span: span1 } = mountPageFixture('1', 'AB')
    const { page: page2, span: span2 } = mountPageFixture('2', 'CD')
    void page2
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    seedRegistry(2, mkText([mkItem('CD', 72, 700)]))
    await mountLayer(page1)
    // 跨页选区（anchorNode 页 1/focusNode 页 2）——两页注册表均在位（守卫删除后
    // 快路径可产块的判别前提）
    selectRange(span1.firstChild!, 0, span2.firstChild!, 1)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(firstRect()).toBeNull()
    // settle（防抖全量）同样静默：无 toast（P2b 语义）+无工具条
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(toastSpy).not.toHaveBeenCalled()
    expect(toolbar()).toBeNull()
    expect(firstRect()).toBeNull()
  })
})

```

## 4. 改 10 件 diff(含 selection-evaluate 快路径/SelectionLayer 接线/SelectionPaint memo/共享常量/S1bS1c 改写)

```diff
diff --git a/src/renderer/features/reader/PdfPageCanvas.tsx b/src/renderer/features/reader/PdfPageCanvas.tsx
index 2aa537326c..18ff48f7f6 100644
--- a/src/renderer/features/reader/PdfPageCanvas.tsx
+++ b/src/renderer/features/reader/PdfPageCanvas.tsx
@@ -29,6 +29,7 @@
 import { useEffect, useRef } from 'react'
 import { RenderingCancelledException, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
 import { PAGE_LAYER_Z } from './page-layer-z'
+import { clampScale } from './pdf-item-geometry'
 
 /**
  * 对外文本项类型：pdfjs TextItem 的结构子集（str/几何/变换，含行尾标记）。
@@ -107,7 +108,7 @@ export function PdfPageCanvas(props: {
       renderTaskRef.current?.cancel()
       // 防御性收敛（页码 1 基；页列分配的 pageNo 天然有效，此处兜底）
       const page = Math.min(Math.max(1, Math.floor(pageNo)), doc.numPages)
-      const scale = Math.min(3, Math.max(0.5, zoom))
+      const scale = clampScale(zoom)
       const pdfPage = await doc.getPage(page)
       if (cancelled) {
         return
diff --git a/src/renderer/features/reader/SelectionLayer.tsx b/src/renderer/features/reader/SelectionLayer.tsx
index 6996fb2dc7..7cc0789764 100644
--- a/src/renderer/features/reader/SelectionLayer.tsx
+++ b/src/renderer/features/reader/SelectionLayer.tsx
@@ -34,6 +34,13 @@
  * pending.anchor.rects 与 paint 同源=保存链与视觉同一来源（INV-58 前半）。
  * 详见 selection-evaluate.ts 头注。
  *
+ * **F-A6-c D2 调度与快路径（rAF 对齐）**：视觉路=首事件即排 rAF+帧内合帧
+ * 去重（60Hz 上限——D2a 5Hz 步进根治）+快路径 evaluateVisual（项几何链直取
+ * INV-58 后半——全部布局读出链尽消）；settle 路=防抖 200ms 与 mouseup 即时
+ * 全量逐字保持（cancel-before-evaluate 顺序保持）；四道守卫/跨页 toast/
+ * 工具条语义零变。**AnnotationLayer 存量重锚域仍 DOM 量测域——INV-58 票外
+ * 边界，同族化/域间换算守卫=独立票（门二 seam_ruling 在档）**。
+ *
  * ── 接口层 ── / ── 架构层 ──
  * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再
  *   导出（实现在 selection-geometry——F-A4 拆件，导出面零变）。锚定根=
@@ -62,7 +69,8 @@ export { closestPageRoot, pageIndexOf } from './selection-geometry'
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
 const SAVE_FAILED = '标注保存失败'
 
-/** selectionchange 窗口（毫秒）：自绘层节流与工具条防抖同值两路（B1） */
+/** selectionchange settle 窗口（毫秒）：工具条防抖（F-A6-c 起视觉路已 rAF 对齐
+ *  60Hz——200ms 窗仅剩 settle 语义：拖选中停顿出条+程序化选选的 pending 落地） */
 const SELECTION_DEBOUNCE_MS = 200
 
 /** F-12 工具条误触发阈值（px）：位移小于此值=单击/双击（含选词）不出条
@@ -91,12 +99,13 @@ export function SelectionLayer(props: {
     // 量测回退双路+G2 门+工具条落点；本组件只供状态写口）
     const evaluate = createEvaluate({ pageRoot, paperId, setPaint, setPending })
 
-    // [B1 回炉] selectionchange 双路调度（selection-geometry 域工厂）：自绘层
-    // =leading+trailing 节流（拖选期持续触发下纯防抖永不落地=历史删自绘轮
-    // 的零反馈病根复活，ADR-0019 R1 修订档）；工具条评估=防抖（弹出语义零变）
+    // [B1 回炉→F-A6-c rAF 对齐] selectionchange 双路调度（selection-geometry 域
+    // 工厂）：视觉路=首事件即排 rAF+帧内合帧去重（60Hz 上限——D2a 5Hz 步进根治，
+    // onVisual=快路径 evaluateVisual 项几何链直取）；工具条评估=防抖 200ms
+    // （既有弹出语义零变）；cancel 清 rAF+防抖双句柄（INV-14）
     const scheduler = createVisualScheduler({
-      onVisual: () => evaluate(false, true),
-      onSettled: () => evaluate(false, false),
+      onVisual: () => evaluate.visual(),
+      onSettled: () => evaluate.full(false),
       windowMs: SELECTION_DEBOUNCE_MS
     })
     // F-12：记录最近一次 mousedown 落点（NaN=无记录——程序化事件/未捕获）
@@ -119,7 +128,7 @@ export function SelectionLayer(props: {
           return
         }
       }
-      evaluate(true, false)
+      evaluate.full(true)
     }
     const onKeyDown = (e: KeyboardEvent): void => {
       // INV-37（F-A4 修订）：Escape 只清组件态；自绘层随**选区**真清除而消失
diff --git a/src/renderer/features/reader/pdf-item-geometry.ts b/src/renderer/features/reader/pdf-item-geometry.ts
index b841461fc2..36c2ba9fed 100644
--- a/src/renderer/features/reader/pdf-item-geometry.ts
+++ b/src/renderer/features/reader/pdf-item-geometry.ts
@@ -70,14 +70,25 @@ import type { PdfTextItem, PdfTextStyle } from './PdfPageCanvas'
 import type { RowBand } from './annotation-resolve'
 
 /** viewport 通道（C1）：与 canvas 渲染的 page.getViewport({scale}) 同构输入——
- *  rotate/view 来自 PdfPageGeometry（b1 下钻真值），scale=当前 zoom（PdfPageCanvas
- *  同款 [0.5,3] 夹取由消费方做，本件原值直用） */
+ *  rotate/view 来自 PdfPageGeometry（b1 下钻真值），scale=当前 zoom 经 clampScale
+ *  夹取（[F-A6-c 门二 N1] 共享常量单一真相源——PdfPageCanvas 渲染通道与本件
+ *  viewport 通道同款夹取，防两处字面量漂移） */
 export interface ItemViewport {
   scale: number
   rotate: number
   view: [number, number, number, number]
 }
 
+/** zoom→viewport scale 夹取域下/上限（PdfPageCanvas 渲染与本件消费方共用——门二 N1） */
+export const ZOOM_SCALE_MIN = 0.5
+export const ZOOM_SCALE_MAX = 3
+
+/** zoom 夹取 [ZOOM_SCALE_MIN, ZOOM_SCALE_MAX]（单一真相源——原 PdfPageCanvas.tsx
+ *  字面量 [0.5,3] 与 selection-evaluate 消费面归一） */
+export function clampScale(zoom: number): number {
+  return Math.min(ZOOM_SCALE_MAX, Math.max(ZOOM_SCALE_MIN, zoom))
+}
+
 /** PDF 用户空间 → viewport CSS px 的六元变换（pdf.mjs:892-985 PageViewport
  *  构造器内联——getViewport 缺省形态；userUnit=1 已知边界见头注架构层） */
 export function viewportTransformFor(vp: ItemViewport): number[] {
diff --git a/src/renderer/features/reader/selection-evaluate.ts b/src/renderer/features/reader/selection-evaluate.ts
index a892da4294..9ac7e8c979 100644
--- a/src/renderer/features/reader/selection-evaluate.ts
+++ b/src/renderer/features/reader/selection-evaluate.ts
@@ -5,13 +5,35 @@
  * 切换，行为面经 selection-layer/selection-item-chain 测试锁）。
  *
  * ── 行为层 ──
- * - evaluate(fromMouseUp, visualOnly)：四道收敛守卫（选区空/跨页/页外不可锚定/
- *   零宽盒→setPaint(null)）→ 锚定（selectionToAnchor 三元组）→ [F-A6-b2] rects
- *   产链双路（项几何主链+DOM 量测回退，见下）→ setPaint → 非 visualOnly 时
- *   工具条落点（toolbarMountPos）+setPending
- * - visualOnly=[B1 回炉] 拖选期节流路径——只更新自绘层不动 pending（弹出语义
- *   独属防抖/mouseup 全量评估，零变）
- * - **F-A6-b2 rects 产链切换（R-迁移主链+DOM 量测回退双路结构）**：主链=
+ * - evaluateFull(fromMouseUp)（settle/mouseup 路）：四道收敛守卫（选区空/跨页/
+ *   页外不可锚定/零宽盒→setPaint(null)+setPending(null)）→ 锚定
+ *   （selectionToAnchor 三元组）→ [F-A6-b2] rects 产链双路（项几何主链+DOM
+ *   量测回退，见下）→ setPaint → 工具条落点（toolbarMountPos）+setPending
+ * - **[F-A6-c] evaluateVisual()（拖选期快路径——rAF 帧点消费）**：项几何链直取
+ *   （INV-58 后半：快路径与 settle 同族=pdf-item-geometry 项几何族，禁第二几何
+ *   口径；全部布局读出链尽消——getClientRects/gCS 量为零，残余布局读=零宽盒
+ *   守卫 Range.gBCR×1+pixelBoxOf 基准盒×1）。链=轻量偏移 probe（Range.toString
+ *   ×2——省 selectionToAnchor 的 O(页文本) join+quote/prefix/suffix 切片与
+ *   rectsBetweenPoints/medianFontSizeBetween 全量几何/量测链）→page-items.store
+ *   直读页项→rectsForOffsetRange+基线分组+归一化→setPaint；**bands 项几何链
+ *   现算不缓存**（bandsFromItems 纯函数 O(被选项) 零布局读零 measureText——
+ *   无缓存摊销必要；第四轮取证 §12 tick 实测在档佐证）。四道守卫前置强制
+ *   （Kimi 拟定裁决 2-§5①）：(i) sel 空/坍缩→setPaint(null)；(ii) 跨页→
+ *   setPaint(null) 静默；(iii) 页外/textLayer 缺→setPaint(null)；(iv) 零宽盒→
+ *   setPaint(null)。G2 同门（selectionHealth unhealthy→setPaint(null) 拖选期
+ *   抑制）。visual 语义=只 setPaint 不动 pending（工具条弹出语义独属
+ *   settle/mouseup 全量，零变）。
+ * - **回退层级声明（票面 §1-B）**：快路径失败（probe 失败/页项缺失/偏移对账
+ *   失败/计算异常/退化区间）→回退=全量视觉评估（evaluateCore(false,true)——
+ *   自带 DOM 量测回退链）；全量的回退链=DOM 量测（b2 已建）——三层：快路径→
+ *   全量→DOM 量测。快路径自身零 console.warn（回退诊断单源=evaluateCore 的
+ *   itemChainFor，防每帧双 warn 刷屏）。
+ * - **INV-58 等价/同帧覆盖**：快路径偏移域=probe 全文偏移（selectionToAnchor
+ *   同源同式）→快慢产物同族同链等价；mouseup/settle 全量在快路径最后一帧后
+ *   执行（mouseup 形态=cancel 先清 rAF 再同步全量），setPaint 以全量产物同帧
+ *   覆盖（边界差额由此吸收——已知边界①/①'）。锚=selection-evaluate.test
+ *   快慢等价 it+同帧覆盖 it（票面强制）。
+ * - [F-A6-b2] rects 产链切换（R-迁移主链+DOM 量测回退双路结构）：主链=
  *   pdf-item-geometry.itemSelectionGeometry（基线分组并块+归一化
  *   pixelBoxOf(textLayer) 同盒 INV-37+mergeRects 终裁；bands 同步切
  *   bandsFromItems——C5 禁 rect 项源×band DOM 量测混用）；锚定三元组仍产自
@@ -27,23 +49,29 @@
  * - **通道**：页项 {items,styles,geometry} 经 page-items.store（PagesOverlay
  *   写/本域 evaluate 时刻 getState 直读——zoom 现读、viewport 现构，项几何
  *   不随 zoom 缓存=缩放不变零重算）
+ * - **[F-A6-c 门二 seam_ruling] AnnotationLayer 存量重锚域仍 DOM 量测域——
+ *   INV-58 票外边界，同族化/域间换算守卫=独立票（门二 seam_ruling 在档）**
  *
  * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
- * - export function createEvaluate(ctx)：工厂返回 evaluate 闭包（ctx=组件
- *   状态写口+挂载盒+文献 id——纯函数域件零 React 依赖）；PaintSelection/
- *   PendingSelection 类型随迁（SelectionLayer 消费）
+ * - export function createEvaluate(ctx)：工厂返回 {visual, full} 双路径闭包
+ *   （ctx=组件状态写口+挂载盒+文献 id——纯函数域件零 React 依赖）；
+ *   PaintSelection/PendingSelection 类型随迁（SelectionLayer 消费）
  * - 依赖单向：本件→anchor-serialize/annotation-anchor/annotation-resolve/
  *   pdf-item-geometry/page-items.store/reader.store/selection-geometry（零环）
- * - F-A6-c 增量预告：evaluateVisual/evaluateFull 双路径拆分宿主在此
- * - tests/unit/renderer/selection-layer.test.tsx（既有行为面）+
- *   selection-item-chain.test.tsx（F-A6-b2 接线面六用例）
+ * - probeOffsetLen 为 anchor-serialize 私有 probeTextLength 的本域复刻
+ *   （其导出面经锁定测试锚定不扩面——Rule of Three 第 2 次保持重复，口径
+ *   逐句对照 anchor-serialize.ts:168-187）
+ * - tests/unit/renderer/selection-layer.test.tsx（既有行为面——预计零改）+
+ *   selection-item-chain.test.tsx（F-A6-b2 接线面）+selection-evaluate.test.tsx
+ *   （F-A6-c 快慢等价/同帧覆盖/快路径守卫三锚）+selection-geometry.test.ts
+ *   （调度器直测——rAF 合帧去重/防抖保持/cancel）
  */
 import type { AnnotationRect } from '@shared/models/annotation'
 import { showToast } from '../../shared/ui/Toast'
 import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
 import { findRangeAtOffset, fullTextOf, pixelBoxOf } from './annotation-anchor'
 import { bandsForTextNodes, type RowBand } from './annotation-resolve'
-import { itemSelectionGeometry, reconcileItemsWithDom } from './pdf-item-geometry'
+import { clampScale, itemSelectionGeometry, reconcileItemsWithDom } from './pdf-item-geometry'
 import type { ItemSelectionGeometry } from './pdf-item-geometry'
 import { usePageItemsStore } from './page-items.store'
 import { useReaderStore } from './reader.store'
@@ -101,7 +129,7 @@ function itemChainFor(pageNo: number, paperId: string, start: number, end: numbe
       items: entry.text.items,
       styles: entry.text.styles,
       viewport: {
-        scale: Math.min(3, Math.max(0.5, zoom)),
+        scale: clampScale(zoom),
         rotate: entry.geometry.rotate,
         view: entry.geometry.view
       },
@@ -115,10 +143,117 @@ function itemChainFor(pageNo: number, paperId: string, start: number, end: numbe
   }
 }
 
-/** evaluate 工厂：评估选区（动态锚定根）——四守卫+产链双路+G2 门+工具条落点 */
-export function createEvaluate(ctx: EvaluateContext): (fromMouseUp: boolean, visualOnly: boolean) => void {
+/** [F-A6-c] evaluate 双路径句柄：visual=拖选期快路径（rAF 帧点消费——项几何链
+ *  直取 INV-58 后半）；full=settle/mouseup 全量（保存与最终视觉的单一权威） */
+export interface EvaluateHandle {
+  visual(): void
+  full(fromMouseUp: boolean): void
+}
+
+/** evaluate 工厂：评估选区（动态锚定根）——快路径+四守卫+产链双路+G2 门+工具条落点 */
+export function createEvaluate(ctx: EvaluateContext): EvaluateHandle {
   const { pageRoot, paperId, setPaint, setPending } = ctx
-  return (fromMouseUp: boolean, visualOnly: boolean): void => {
+
+  /** probe-range 文本长度（anchor-serialize 私有 probeTextLength 本域复刻——口径
+   *  逐句同源 ：168-187；side='start' 探 [root 起..边界) 长度=边界全局偏移，
+   *  'end' 探 [边界..root 尾) 长度=其后文长度） */
+  function probeOffsetLen(root: HTMLElement, container: Node, offset: number, side: 'start' | 'end'): number | null {
+    try {
+      const probe = document.createRange()
+      probe.selectNodeContents(root)
+      if (side === 'start') {
+        probe.setEnd(container, offset)
+      } else {
+        probe.setStart(container, offset)
+      }
+      return probe.toString().length
+    } catch {
+      // 节点脱离文档等异常：快路径放弃，回退全量
+      return null
+    }
+  }
+
+  /** [F-A6-c] 快路径：项几何链直取。四道守卫前置（裁决 2-§5①）→轻量 probe→
+   *  page-items.store 直读→项几何→setPaint；失败（probe/页项/对账/计算/退化
+   *  区间）回退=全量视觉评估（evaluateCore(false,true)——DOM 量测回退链在位，
+   *  不动 pending）。守卫与 G2 命中均 setPaint(null)（跨页/G2 拖选期静默——
+   *  toast 门=fromMouseUp 属全量路，S5/G2 既有形态） */
+  function visual(): void {
+    const sel = window.getSelection()
+    // 守卫 (i)：sel 空/rangeCount 0/坍缩
+    if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
+      setPaint(null)
+      return
+    }
+    // 守卫 (ii)：跨页/跨出页盒——静默收层（无守卫时跨页偏移会被归一化进单页
+    // 项几何=新 D1 同族错乱源，裁决 2-§5① 强制条款）
+    const anchorRoot = closestPageRoot(sel.anchorNode)
+    const focusRoot = closestPageRoot(sel.focusNode)
+    if (anchorRoot !== focusRoot) {
+      setPaint(null)
+      return
+    }
+    // 守卫 (iii)：页外/textLayer 缺
+    const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
+    const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
+    if (pageNo === null || textLayer === null) {
+      setPaint(null)
+      return
+    }
+    const range = sel.getRangeAt(0)
+    // 守卫 (iv)：零宽盒（零文本/纯元素选区）
+    const box = range.getBoundingClientRect()
+    if (box.width === 0 && box.height === 0) {
+      setPaint(null)
+      return
+    }
+    // 轻量偏移 probe（Range.toString ×2 O(页文本)——join/quote/prefix/suffix
+    // 切片与 rectsBetweenPoints/medianFontSize 全量几何量测链全省）
+    const lead = probeOffsetLen(textLayer, range.startContainer, range.startOffset, 'start')
+    const tail = lead === null ? null : probeOffsetLen(textLayer, range.endContainer, range.endOffset, 'end')
+    const entry = usePageItemsStore.getState().pages[pageNo + 1]
+    let item: ItemSelectionGeometry | null = null
+    if (lead !== null && tail !== null && entry !== undefined) {
+      const domText = fullTextOf(textLayer)
+      if (reconcileItemsWithDom(entry.text.items, domText)) {
+        const start = lead
+        const end = domText.length - tail
+        if (end > start) {
+          try {
+            const zoom = useReaderStore.getState().tabs[paperId]?.zoom ?? 1
+            item = itemSelectionGeometry({
+              items: entry.text.items,
+              styles: entry.text.styles,
+              viewport: { scale: clampScale(zoom), rotate: entry.geometry.rotate, view: entry.geometry.view },
+              start,
+              end,
+              base: pixelBoxOf(textLayer)
+            })
+          } catch {
+            item = null // 计算异常→回退（诊断单源=evaluateCore 链内 warn）
+          }
+        }
+      }
+    }
+    if (item === null) {
+      // 快路径失败→回退=全量视觉评估（层级声明见头注；不动 pending）
+      evaluateCore(false, true)
+      return
+    }
+    // G2 同门：拖选期抑制渲染（静默——拖选中途不刷屏，INV-02 只挂完成时刻）
+    if (item.health.unhealthy) {
+      setPaint(null)
+      return
+    }
+    setPaint({ root: anchorRoot!, rects: item.rects, bands: item.bands })
+  }
+
+  /** 全量（settle/mouseup 路——现行逻辑零变，visualOnly 仅剩快路径回退一个活调用方） */
+  function full(fromMouseUp: boolean): void {
+    evaluateCore(fromMouseUp, false)
+  }
+
+  function evaluateCore(fromMouseUp: boolean, visualOnly: boolean): void {
     const sel = window.getSelection()
     if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
       if (!visualOnly) setPending(null)
@@ -180,4 +315,6 @@ export function createEvaluate(ctx: EvaluateContext): (fromMouseUp: boolean, vis
     const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
     setPending({ anchor: item !== null ? { ...anchor, rects: item.rects } : anchor, pageNo: pageNo!, x, y })
   }
+
+  return { visual, full }
 }
diff --git a/src/renderer/features/reader/selection-geometry.ts b/src/renderer/features/reader/selection-geometry.ts
index 7259648135..58af10d401 100644
--- a/src/renderer/features/reader/selection-geometry.ts
+++ b/src/renderer/features/reader/selection-geometry.ts
@@ -97,36 +97,33 @@ export function toolbarMountPos(pageRoot: HTMLElement, sel: ViewportBox): { x: n
   return { x: (vp.x - mountBox.x) * scale, y: (vp.y - mountBox.y) * scale }
 }
 
-/** [B1 回炉] selectionchange 双路调度器：自绘层视觉=leading+trailing 节流
- *  （拖选全程持续触发时纯防抖的 timer 永远重置——::selection 已 transparent
- *  则拖选期零视觉反馈=历史删自绘轮的同型病根复活，ADR-0019 R1 修订档）；
- *  工具条评估=防抖（既有弹出语义零变）。工厂返回 handler（addEventListener
- *  直用）+cancel（mouseup/卸载成对清理——INV-14 同型）。 */
+/** [B1 回炉→F-A6-c rAF 对齐] selectionchange 双路调度器（设计书 §5.2）：
+ *  视觉路=首事件即排 requestAnimationFrame（leading ≤16ms——S1b 零反馈红线），
+ *  已排程则不重排=帧内合帧去重（同帧多次 selectionchange 恰一次 evaluateVisual
+ *  ——60Hz 上限+帧内天然合帧，取代 B1 的 200ms leading+trailing 节流[5Hz 步进
+ *  =D2a 病根，取证 §7 实测 mutation 间隔 ~200ms]）；settle 路=防抖 200ms 与
+ *  mouseup 即时全量逐字保持（工具条弹出语义/S1b 后半零变）。工厂返回 handler
+ *  （addEventListener 直用）+cancel（mouseup/卸载成对清理——rAF 句柄与防抖
+ *  双清，INV-14 同型）。rAF×React 并发面申报（设计书 §5.2）：rAF 后台/遮挡
+ *  暂停影响面=隐藏态程序化选区视觉陈旧（cosmetic——Electron 单窗口+拖选需
+ *  前台输入，真拖选不可触发）。 */
 export function createVisualScheduler(ops: {
   onVisual(): void
   onSettled(): void
   windowMs: number
 }): { handler(): void; cancel(): void } {
   let debounce: number | null = null
-  let trailing: number | null = null
-  let last = 0
+  let raf: number | null = null
   return {
     handler: () => {
-      const now = Date.now()
-      if (now - last >= ops.windowMs) {
-        last = now
-        if (trailing !== null) {
-          window.clearTimeout(trailing)
-          trailing = null
-        }
-        ops.onVisual()
-      } else if (trailing === null) {
-        trailing = window.setTimeout(() => {
-          trailing = null
-          last = Date.now()
+      // 视觉路：本帧未排程才排 rAF（帧内合帧去重）；回调读当下选区=帧随动
+      if (raf === null) {
+        raf = window.requestAnimationFrame(() => {
+          raf = null
           ops.onVisual()
-        }, ops.windowMs - (now - last))
+        })
       }
+      // settle 路：防抖（每事件重置——弹出语义零变）
       if (debounce !== null) window.clearTimeout(debounce)
       debounce = window.setTimeout(() => ops.onSettled(), ops.windowMs)
     },
@@ -135,9 +132,9 @@ export function createVisualScheduler(ops: {
         window.clearTimeout(debounce)
         debounce = null
       }
-      if (trailing !== null) {
-        window.clearTimeout(trailing)
-        trailing = null
+      if (raf !== null) {
+        window.cancelAnimationFrame(raf)
+        raf = null
       }
     }
   }
diff --git a/src/renderer/features/reader/selection-paint.tsx b/src/renderer/features/reader/selection-paint.tsx
index ae2533e7c8..632b28d2b8 100644
--- a/src/renderer/features/reader/selection-paint.tsx
+++ b/src/renderer/features/reader/selection-paint.tsx
@@ -27,6 +27,7 @@
  * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5+F-A5 段
  *   a1/a2/c1/c2）+selection-layer.test.tsx（F-A4 反转守卫）。
  */
+import { memo } from 'react'
 import { createPortal } from 'react-dom'
 import type { AnnotationRect } from '@shared/models/annotation'
 import { matchBand, type RowBand } from './annotation-resolve'
@@ -36,7 +37,11 @@ import { PAGE_LAYER_Z } from './page-layer-z'
 /** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
 const PAINT_BG = 'rgba(0, 0, 0, 0.20)'
 
-export function SelectionPaint(props: {
+/** [F-A6-c] React.memo+props 稳定化（设计书 §3.3 次因面收敛）：root/rects/bands
+ *  均来自 SelectionLayer 的 paint 状态对象——仅在 setPaint 时更换引用，组件
+ *  其余状态更新（pending/busy/color/zoom 订阅）不再重渲染 portal 全子树；
+ *  拖选期帧产物由快路径整对象更换（引用变=重渲染，值同=跳过） */
+export const SelectionPaint = memo(function SelectionPaint(props: {
   /** 选区所在页盒（[data-page-root]——portal 目标树的根） */
   root: HTMLElement
   /** 归一化并集矩形（evaluate 管线产物——与保存 rects 同源） */
@@ -76,4 +81,4 @@ export function SelectionPaint(props: {
     </div>,
     host
   )
-}
+})
diff --git a/tests/unit/renderer/annotation-anchor.test.ts b/tests/unit/renderer/annotation-anchor.test.ts
index bff7414096..ef1c6a1461 100644
--- a/tests/unit/renderer/annotation-anchor.test.ts
+++ b/tests/unit/renderer/annotation-anchor.test.ts
@@ -370,3 +370,39 @@ describe('F-A6-b2 W1 mergeLineRects —— 扩簇 y 区间膨胀副作用回归'
     }
   })
 })
+
+// always-active（F-A6-c 门二 W2——pitch 缺省+跨行中心距 ≤2px 极限单视觉行形态：
+// W1 机理结论未覆盖面[其夹具 pitch 恒有定义]的守卫夹具。守卫非缺陷修复——
+// 构造后实测绿，机理在档：此形态 centerLimit=lh（pitch 缺省走 lineH 单门），
+// centerOk 对全部矩形恒过（|Δc|≤lh/2）不设防，防线=高度可比带 hComparable
+// （[0.5,2]×主导高——高瘦碎片=多行载体[旋转/竖排形态，h≈3.3×行高]在带外）
+// ——扩簇比较（F-A6-b2 T3）只在满足判据的簇中取最近，无可满足者新建簇：
+// 行簇与高瘦簇互不吸收，无跨视觉行并块）。
+describe('F-A6-c W2 mergeLineRects —— pitch 缺省极限形态（单视觉行判定×多行高瘦碎片）守卫', () => {
+  it('W2 全部相邻中心差 <2px（pitch 缺省=单视觉行形态判定）但含多行高瘦碎片：行块几何（y/h/x 并集）不含高瘦碎片贡献、高瘦碎片自成块——centerOk（centerLimit=lh）单门不设防时高度可比带挡跨行并块', () => {
+    // 行片段（h 12，中心 100/100.25）+高瘦碎片（h 40≈3.3×行高，中心 100/101）
+    // ——中心链 100,100,100.25,101 相邻差全 <2px → estimateLinePitch 缺省
+    const r1 = px(10, 94, 40, 12) // 行片段 1（y 序 3）
+    const r2 = px(60, 94.5, 30, 12) // 行片段 2（y 序 4）
+    const t1 = px(100, 80, 10, 40) // 多行高瘦碎片 1（y 序 1——跨 3 行形态）
+    const t2 = px(120, 81, 10, 40) // 多行高瘦碎片 2（y 序 2）
+    expect(estimateLinePitch([r1, r2, t1, t2])).toBeUndefined() // 形态前提锚：pitch 缺省
+    const out = mergeLineRects([r1, r2, t1, t2], 612, 12)
+    expect(out.length).toBe(2)
+    // y 序输出：高瘦块（y=80）在前、行块（y=94）在后
+    const tall = out[0]!
+    const row = out[1]!
+    // 行块：y/h=行主导矩形原样（未被高瘦碎片抬高/膨胀=无跨行并块）；x 并集
+    // 10..90 不含高瘦碎片（100..130）——hComparable 删除（只 centerOk）在此红
+    expect(row.y).toBeCloseTo(94, 5)
+    expect(row.h).toBeCloseTo(12, 5)
+    expect(row.x).toBe(10)
+    expect(row.x + row.w).toBeCloseTo(90, 5)
+    // 高瘦碎片自成块（y/h 本体——不被行簇吸收钳制）；两碎片 x 间隙 10<簇内
+    // 断段阈值（1.5×主导高 40=60）并段
+    expect(tall.y).toBeCloseTo(80, 5)
+    expect(tall.h).toBeCloseTo(40, 5)
+    expect(tall.x).toBe(100)
+    expect(tall.x + tall.w).toBeCloseTo(130, 5)
+  })
+})
diff --git a/tests/unit/renderer/selection-item-chain.test.tsx b/tests/unit/renderer/selection-item-chain.test.tsx
index 9fa47f068f..9781d3241e 100644
--- a/tests/unit/renderer/selection-item-chain.test.tsx
+++ b/tests/unit/renderer/selection-item-chain.test.tsx
@@ -244,7 +244,11 @@ describe('F-A6-b2 项几何链接线（SelectionLayer×page-items.store 通道
     act(() => {
       fireSelectionChange()
     })
-    // 拖选期（visual tick，selectionchange leading 即触发）：抑制渲染
+    // 拖选期（visual tick）：抑制渲染。[F-A6-c 时序适配申告] rAF 改形后视觉评估
+    // 挂帧点——帧前断言恒真退化，推进 16ms（rAF 帧后）断言快路径 G2 门非空转
+    await act(async () => {
+      await vi.advanceTimersByTimeAsync(16)
+    })
     expect(firstRect()).toBeNull()
     await act(async () => {
       await vi.advanceTimersByTimeAsync(200)
diff --git a/tests/unit/renderer/selection-paint.test.tsx b/tests/unit/renderer/selection-paint.test.tsx
index e2747a9009..95c8d3273b 100644
--- a/tests/unit/renderer/selection-paint.test.tsx
+++ b/tests/unit/renderer/selection-paint.test.tsx
@@ -8,6 +8,8 @@
  * - a 面（S1~S5）：拖选防抖路径自绘并集层渲染（相邻行重叠输入→块数=行数
  *   +块两两垂直分离=「单层单绘不叠深」）+保存 rects 与自绘块同源（所见即
  *   所存 S2）+Escape 工具条收而自绘留至选区真清（INV-37 修订语义 S5）；
+ *   [F-A6-c] S1b/S1c 两 it 改写为 rAF 语义（调度 rAF 对齐——帧前零渲染/单帧
+ *   渲染/帧随动断言面；S1/S2/S5 走 mouseup/防抖零改）；
  * - b 面：rectStyle band 自适应（顶贴字形带顶/底贴底——F-11 分数语义的
  *   自适应实现）+缺省 band 分数路径回归锚+bandFromMetrics 纯几何+
  *   AnnotationLayer 挂 B 接线（resolve→band→渲染）；
@@ -162,64 +164,61 @@ describe('F-A4 a 面 —— 自绘并集层（单层单绘不叠深）', () => {
     }
   })
 
-  it('S1b 拖选期零视觉反馈回归守卫（B1/门一回炉）：连续 selectionchange 不 mouseup——首个事件 leading 节流立即渲染自绘层，工具条防抖语义保持（未到期不出条）', async () => {
+  it('S1b 拖选期零视觉反馈回归守卫（B1/门一回炉→F-A6-c rAF 语义改写）：首 selectionchange 即排 rAF——单帧（16ms）内自绘层渲染且帧前零渲染（rAF 对齐非同步节流），工具条防抖 200ms 语义保持（t=150 仍不出条——防抖窗改短在此红）', async () => {
     const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
     document.body.appendChild(page)
     await mountLayer(page)
     clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
     selectRange(span.firstChild!, 0, span.firstChild!, 4)
-    // 拖选中：selectionchange 连发（间隔 30ms——防抖 timer 持续重置的形态），
-    // 无 mouseup。修前纯防抖下 paint 到停顿 200ms 才出现（=SR2-F-08 病根复活）
-    for (let i = 0; i < 5; i += 1) {
-      fireSelectionChange()
-      await act(async () => {
-        await vi.advanceTimersByTimeAsync(30)
-      })
-    }
-    // 不再推进任何时间：自绘层已在场（leading+trailing 节流）
+    // 拖选首事件（无 mouseup）。修前纯防抖下 paint 到停顿 200ms 才出现
+    // （=SR2-F-08 病根复活）；rAF 改形后首事件即排程、帧前零同步渲染
+    fireSelectionChange()
+    expect(paintLayer()).toBeNull()
+    // 单帧（t=16）：leading 首事件即排 rAF——≤16ms 零反馈红线
+    await act(async () => {
+      await vi.advanceTimersByTimeAsync(16)
+    })
     expect(paintLayer()).not.toBeNull()
     expect(paintBlocks().length).toBeGreaterThanOrEqual(1)
-    // 工具条=防抖路径（既有弹出语义零变——末事件后 200ms 内不出条）
+    // 工具条=防抖路径（既有弹出语义零变——末事件后 200ms 内不出条；t=150 锚
+    // 防抖窗逐字保持，100ms 变异在此红）
     expect(toolbar()).toBeNull()
     await act(async () => {
-      await vi.advanceTimersByTimeAsync(210)
+      await vi.advanceTimersByTimeAsync(134)
+    })
+    expect(toolbar()).toBeNull()
+    await act(async () => {
+      await vi.advanceTimersByTimeAsync(66)
     })
     expect(toolbar()).not.toBeNull()
   })
 
-  it('S1c trailing 随动（B1/W6·门一 r2）：拖选中窗口内末事件变更选区→停顿推进越过窗口缘→自绘块几何随动到新位置（非首帧）——纯防抖/只留 leading 均在此红', async () => {
+  it('S1c 帧随动（B1/W6·门一 r2→F-A6-c rAF 语义改写）：拖选中窗口内末事件变更选区→下一帧自绘块几何随动到新位置（非首帧）——节流窗丢帧/只渲染首帧的退化在此红', async () => {
     const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
     document.body.appendChild(page)
     await mountLayer(page)
     // 首帧行 A：选区 alpha（0..4），行盒 y=200 → 归一 top=0%
     clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
     selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    fireSelectionChange()
     await act(async () => {
-      fireSelectionChange()
+      await vi.advanceTimersByTimeAsync(16)
     })
     expect(paintBlocks().length).toBe(1)
     expect(pct(paintBlocks()[0]!, 'top')).toBeCloseTo(0, 6)
-    // 拖选中：窗口内连发（40ms 间隔×3，未过 200ms 窗口）——纯防抖下 timer
-    // 持续重置；随后 t=150 变更选区到行 B（ta b 不同文字范围 2..6，行盒
-    // y=400 → 归一 top=25%）再发一事件，然后**停顿**（拖选未松手）
-    for (let i = 0; i < 3; i += 1) {
-      await act(async () => {
-        await vi.advanceTimersByTimeAsync(40)
-      })
-      fireSelectionChange()
-    }
+    // 拖选中（防抖 200ms 窗内，未松手）变更选区到行 B（ta b 不同文字范围 2..6，
+    // 行盒 y=400 → 归一 top=25%）再发一事件——rAF 下一帧读**当下**选区随动
+    //（节流窗内丢帧/只渲染首帧的旧退化在此红；旧口径 trailing 窗尾断言随 rAF
+    // 改形逐帧化，语义面=「窗口内末事件必随动」保持）
     clientRects = [{ x: 100, y: 400, width: 300, height: 20 }]
     selectRange(span.firstChild!, 2, span.firstChild!, 6)
     fireSelectionChange()
-    // 停顿推进越过窗口缘（trailing 落地于 t=200——读**当下**选区 B）；
-    // 不推进到防抖到期点（t=320）——此刻的更新只能来自节流 trailing
     await act(async () => {
-      await vi.advanceTimersByTimeAsync(85)
+      await vi.advanceTimersByTimeAsync(16)
     })
     const blocks = paintBlocks()
     expect(blocks.length).toBe(1)
-    // 随动到新行位置（25%）——非首帧位置（0%）：只留 leading 的退化在此红
-    //（t=150 窗口内事件被丢、无后续事件开新窗口→paint 停留 0%）
+    // 随动到新行位置（25%）——非首帧位置（0%）：首帧后不再渲染的退化在此红
     expect(pct(blocks[0]!, 'top')).toBeCloseTo(25, 4)
   })
 

```

## 5. 实现者声明摘要

- verify 154 文件/1324 用例 exit 0 亲验;e2e reader-text 13/13 主动跑绿(调度时序面保险);locks 277。
- 四轮 tick 对照表(§6);变异 4 件还原 diff 空。
- 门二开工条件三件:scale 共享常量(clampScale 单源)/pitch 极限守卫夹具(绿=无缺陷,MUT4 红证其牙——防线=hComparable 可比带)/AnnotationLayer seam 头注入档。
- 超票面申报 7 条(三锚旧实现即绿→变异交付红证/G2 时序适配/C3 口径自纠/tick 预算断言不设独立 it 的头注申报/e2e 主动跑/node -e workaround/f-a6-diag 零改动)。

## 6. 裁决表 §12 第四轮对照全文

## 12 第四轮对照（F-A6-c D2 调度与快路径落地，2026-09-04——只追加）

**落地面（B 案）**：调度器 rAF 对齐（selection-geometry.ts——视觉路=首事件即排 rAF+帧内合帧去重[60Hz 上限]，取代 B1 200ms leading+trailing 节流[5Hz 步进=D2a 病根]；settle 防抖 200ms 与 mouseup 即时全量逐字保持；cancel 清 rAF+防抖双句柄）；快路径 evaluateVisual（selection-evaluate.ts——四道守卫前置+轻量偏移 probe[Range.toString×2，selectionToAnchor 的 join/quote/prefix/suffix 切片与全量几何量测链全省]+page-items.store 直读+项几何链直取[INV-58 后半：与 settle 同族]+G2 同门拖选期抑制；失败回退=全量视觉评估，全量回退=DOM 量测[b2 在位]——三层快→全量→DOM）；SelectionPaint React.memo；scale [0.5,3] 共享常量 clampScale（门二 N1）。测试配套：selection-geometry.test 新 4 it（C1 帧内合帧去重=改形唯一新逻辑单元/C2 leading ≤16ms/C3 防抖逐字保持/C4 cancel）+selection-evaluate.test 新 3 it（快慢等价/同帧覆盖[mid-drag zoom 差分形态]/快路径跨页守卫）+S1b/S1c 改写 rAF 语义+item-chain G2 帧后断言强化+annotation-anchor W2 pitch 缺省极限守卫夹具（构造后绿=守卫入档非缺陷修复——MUT4[hComparable 删除]红证其牙）。变异红证 4：MUT1 合帧去重删除→C1/C4 红；MUT2 防抖 100ms→C3+S1b 后半红；MUT3 快路径守卫(ii)删除→跨页夹具红；MUT4 hComparable 删除→W2 红（文件备份法，还原 diff 空）。

**复跑口径**：b2 轮产物移档 `f-a6-diag-out-b2/`；修复代码 build 后经 out/renderer 生效；第四轮=`f-a6-diag-out/`（同脚本同节奏：N=20 次 dispatch 间隔 50ms，每轮选区末端 +1 字符）。

| 判据 | b2 轮 | 第四轮（c） | 达标 |
|---|---|---|---|
| mutations（20 次 dispatch 的可见层变更数） | 7 / 7 / 6 / 6 / 7 | **20 / 20 / 20 / 20 / 20** | ✅ 每事件必随动（b2=节流窗÷dispatch 间隔≈7） |
| mutation 间隔中位 (ms) | 200.4 / 202 / 201 / 200.5 / 200.1 | **59.5 / 59.4 / 50 / 50.2 / 50.1**（全列 47.5~62.9——50/60 交替=rAF 帧栅格 16.7ms 对 50ms dispatch 的量化） | ✅ 200ms 步进消灭；间隔上限=dispatch 节奏（50ms），rAF 上限 16.7ms（更密 dispatch 下贴帧栅格）——「5Hz→60Hz」的直接验证=mutations 7→20 全跟随+间隔 200→dispatch 界 |
| delta min(含 0)/med/max (ms)（dispatch→DOM 变更全链含 React commit） | 3882: 2/32.3/161.2 · 1c2d: 1.1/21.6/131.3 · s3base: 0.4/30.3/189.8 | 3882: **6.1/11.9/15.5** · 1c2d: **3/11.1/12** · s3base: **2.9/10.1/10.8** | ✅ med 降 2.5~3×；max 200ms 级 trailing 等待消灭（max≤15.5=rAF 帧点等待上界）；~10ms 恒定段=帧点量化等待（delta 含 dispatch→下一帧边界 ≤16.7ms），链本身亚毫秒 |
| 布局读 gBCR | 18 / 18 / 16 / 18 / 18 | 24 / 24 / 24 / 24 / 24 | ✅ 归一化后降：b2=2.6/mutation，c=1.2/mutation（每快 tick 恰 1 次=pixelBoxOf 基准盒；20 tick+settle） |
| getComputedStyle | 685 / 438 / 14 / 16 / 16 | **87 / 58 / 2 / 2 / 2** | ✅ −87%：快路径每 tick gCS=0（计数归因：b2 685≈8 次全量×~85[选区跨 ~83 节点的 medianFontSizeBetween]；c 87=仅末尾 settle 一次全量——快 tick 零 gCS） |
| getClientRects | 8 / 8 / 7 / 8 / 8 | **1 / 1 / 1 / 1 / 1** | ✅ 快路径每 tick clientRects=0（残余 1=末尾 settle 的 selectionToAnchor 量测批）——「全部布局读出链尽消」票面条款兑现 |
| Range.gBCR | 8 / 8 / 7 / 8 / 8 | 21 / 21 / 21 / 21 / 21 | 与 tick 数同增（守卫(iv) 每快 tick 恰 1 次）——布局读净面仍降（gBCR+clientRects+Range.gBCR 合计：b2≈4.9/mutation→c≈2.3/mutation） |
| D1 面回归检查 | 甲块 42/10/3/3/3 右溢 0 | 42 / 10 / 3 / 3 / 3 右溢 0 | ✅ 逐位不变（调度/快路径不动几何族——INV-58 同族构造保证） |

**快路径预算断言（头注「bands 现算不缓存」决策的实测依据）**：最重样本 real3882（829 span/8651 字符）快路径 20/20 帧全跟随零丢帧；链 CPU 增量 ≈ delta med 差（3882 11.9 − 合成页 10.1[纯帧等待+亚毫秒链]）≈ **<2ms**——「项几何链全程 <2ms 可不缓存」判据成立，bands 项几何链现算（bandsFromItems 纯函数零布局读）无缓存摊销必要；probe×2+对账 join 为残余 O(页文本) 纯 CPU（无布局读），60Hz 帧预算内无观测瓶颈。

**已知边界与申报**：①同帧覆盖断言以 mid-drag zoom 差分形态锚（快=zoom1/全量=zoom2，终态=zoom2）——已知边界②「mid-drag zoom 一帧陈旧由 settle 纠正」的正测试面；②rAF 后台/遮挡暂停=隐藏态程序化选区视觉陈旧（cosmetic——设计书 §5.2 申报，Electron 单窗口+拖选需前台输入不可触发）；③mutation 间隔受 dispatch 节奏 50ms 封顶——16.7ms 量级需更密 dispatch 口径方可观测（本轮口径下 50/60 交替的帧栅格量化已可分辨）；④AnnotationLayer 存量重锚域仍 DOM 量测域（门二 seam_ruling——INV-58 票外边界，独立票，SelectionLayer/selection-evaluate 头注入档）。

**结论：D2 调度与快路径落地达标**——5Hz 步进消灭（mutations 7→20 全跟随、间隔 200→50=dispatch 界）、每 tick 布局读尽消（gCS −87%/clientRects −87%/归一化布局读 −53%）、全链 delta med 降 2.5~3×、D1 面逐位零回归。快/慢路径同族（INV-58 后半）由构造保证+selection-evaluate.test 等价 it 锁定。



## 2. 门一 Kimi 全文

```
## 裁决
PASS_WITH_WARNINGS

## 发现（逐条）

- [WARN] 目标：diff 件数与关键顺序断言无实证。证据：包标题「改 10 件 diff」实见 9 段；票面范围口径「6 src+3 受锁测试+2 新测试」=11 件，三者互不一致；且「mouseup 形态=cancel 先清 rAF 再同步全量」（§12）在 SelectionLayer diff 中仅见 `evaluate.full(true)`，scheduler.cancel() 调用点不可见。建议：补齐缺失件/省略 hunk，或在档说明省略理由，否则「cancel-before-evaluate」竞态面（任务 1 点名项）无据。
- [WARN] 目标：MUT2 变异落点与判别链不自洽。证据：C3 显式传 `windowMs: 200`（调度器内无 200 字面量，全走 `ops.windowMs`），而 S1b 走组件常量 `SELECTION_DEBOUNCE_MS`——「防抖 100ms」单点变异难同红两件，材料未示变异 diff 落点（仅「文件备份法，还原 diff 空」）。建议：补变异体落点说明，否则该红证视为声明级。
- [NIT] 目标：测试件头注编号/注释失真。证据：selection-evaluate.test 写「ADR-2017」，geometry.test 写「ADR-0017」；夹具注释「span 盒=DOM 量测域值 y=200」与代码 `rects.set(span, {x:572, y:500,...})` 不符。建议：随下一票顺手修正。
- [NIT] 目标：布局读口径词偏审美。证据：gBCR 18→24、Range.gBCR 8→21 绝对量上行，达标列以「归一化后降/净面仍降」呈现——披露是诚实的，但「布局读出链尽消」宜限定为 clientRects/gCS 链。建议：措辞收敛即可，不构成数据粉饰。

## 五维逐条立场

- 修复正确性：调度器（rAF leading+帧内合帧+防抖逐字+双句柄清理、旧节流整段删除见 diff 左右对照）与快路径（四守卫顺序、probe 复刻、回退三层、visualOnly 单活调用方）逐行核验通过；坍缩竞态由守卫(i)兜住，唯一未实证面=mouseup cancel 顺序（见 WARN1）。
- 通道设计：page-items.store 直读+clampScale 单源归一（PdfPageCanvas/evaluate 双消费点同改）+memo 边界声明清晰，AnnotationLayer seam 以头注+独立票隔离，口径无私换。
- 测试纪律：C1 真新逻辑锚、C3 时序算术自洽（199/299/300）、S1b/S1c 改写后判别性保持（S1c 新形态下更新只能来自 rAF 帧，退化仍可红）；「三锚旧实现即绿→变异交付」申报可接受，唯 MUT2 落点存疑（WARN2）。
- 决策门忠实度：§12 归因链自洽（685≈8×~85、87=末尾 settle 一次；20 tick+settle 解释 gBCR 24/Range.gBCR 21；max≤15.5=rAF 等待上界），申报③（16.7ms 需更密口径）属主动削证据而非拔高，达标列归一化口径有披露；但「10 件」与 9 段之差不合忠实度要求（WARN1）。
- 红线：所见 9 件均落票面范围、无恒真断言（C1 帧前零调用+S1b 帧前 null 均为有效前置断言）、无占位、旧节流无残留（diff 删除面完整）。

## 总评

实现与测试本体扎实，归因链罕见地肯自曝上限（申报③、归一化口径）。两处 WARN 均为证据完整性问题而非正确性问题：缺第 10 件 diff 使 mouseup cancel 顺序这一被点名的竞态面悬空，MUT2 落点不明削弱一条红证。建议补件后放行，不阻塞主链几何迁移开工，但门二应回溯核验。
```

## 3. 回炉处置摘要（实现者报告）

- W1：新 it（预渲染 paint→重建在途 rAF→mouseup→改 zoom=3→推进 300ms,终态须=mouseup 时刻全量几何 zoom2 的 168/792）+先红（删 cancel→恰 W1 it 红,终态被覆盖 31.82%）+还原 diff 空;过程发现 live range 诱发链（四轮探针定位:portal 结构插入→原生 selectionchange→新 rAF→幂等重渲一次,生产无害=INV-58 等价性吸收;终版预渲染隔离,mouseup 后 handler +0 实测）。
- W2：MUT2 落点=调度器工厂 `window.setTimeout(()=>ops.onSettled(), ops.windowMs)` 的 windowMs→100（一处变异）;C3（显式 windowMs:200）与 S1b（组件常量 200 注入）流经同一消费点同红;重跑留档 C3+S1b 两红/19 绿,还原 diff 空。
- N1：ADR-0017 修正+夹具注释双域口径写死。
- N2：四处措辞收敛（clientRects/gCS 链限定+绝对量上行披露）。
- verify 154 文件/1325 用例 exit 0;locks 277 同步;探针/变异残留清零。

## 4. 裁决表 §12 全文（含门一回炉处置档段）

## 12 第四轮对照（F-A6-c D2 调度与快路径落地，2026-09-04——只追加）

**落地面（B 案）**：调度器 rAF 对齐（selection-geometry.ts——视觉路=首事件即排 rAF+帧内合帧去重[60Hz 上限]，取代 B1 200ms leading+trailing 节流[5Hz 步进=D2a 病根]；settle 防抖 200ms 与 mouseup 即时全量逐字保持；cancel 清 rAF+防抖双句柄）；快路径 evaluateVisual（selection-evaluate.ts——四道守卫前置+轻量偏移 probe[Range.toString×2，selectionToAnchor 的 join/quote/prefix/suffix 切片与全量几何量测链全省]+page-items.store 直读+项几何链直取[INV-58 后半：与 settle 同族]+G2 同门拖选期抑制；失败回退=全量视觉评估，全量回退=DOM 量测[b2 在位]——三层快→全量→DOM）；SelectionPaint React.memo；scale [0.5,3] 共享常量 clampScale（门二 N1）。测试配套：selection-geometry.test 新 4 it（C1 帧内合帧去重=改形唯一新逻辑单元/C2 leading ≤16ms/C3 防抖逐字保持/C4 cancel）+selection-evaluate.test 新 3 it（快慢等价/同帧覆盖[mid-drag zoom 差分形态]/快路径跨页守卫）+S1b/S1c 改写 rAF 语义+item-chain G2 帧后断言强化+annotation-anchor W2 pitch 缺省极限守卫夹具（构造后绿=守卫入档非缺陷修复——MUT4[hComparable 删除]红证其牙）。变异红证 4：MUT1 合帧去重删除→C1/C4 红；MUT2 防抖 100ms→C3+S1b 后半红；MUT3 快路径守卫(ii)删除→跨页夹具红；MUT4 hComparable 删除→W2 红（文件备份法，还原 diff 空）。

**复跑口径**：b2 轮产物移档 `f-a6-diag-out-b2/`；修复代码 build 后经 out/renderer 生效；第四轮=`f-a6-diag-out/`（同脚本同节奏：N=20 次 dispatch 间隔 50ms，每轮选区末端 +1 字符）。

| 判据 | b2 轮 | 第四轮（c） | 达标 |
|---|---|---|---|
| mutations（20 次 dispatch 的可见层变更数） | 7 / 7 / 6 / 6 / 7 | **20 / 20 / 20 / 20 / 20** | ✅ 每事件必随动（b2=节流窗÷dispatch 间隔≈7） |
| mutation 间隔中位 (ms) | 200.4 / 202 / 201 / 200.5 / 200.1 | **59.5 / 59.4 / 50 / 50.2 / 50.1**（全列 47.5~62.9——50/60 交替=rAF 帧栅格 16.7ms 对 50ms dispatch 的量化） | ✅ 200ms 步进消灭；间隔上限=dispatch 节奏（50ms），rAF 上限 16.7ms（更密 dispatch 下贴帧栅格）——「5Hz→60Hz」的直接验证=mutations 7→20 全跟随+间隔 200→dispatch 界 |
| delta min(含 0)/med/max (ms)（dispatch→DOM 变更全链含 React commit） | 3882: 2/32.3/161.2 · 1c2d: 1.1/21.6/131.3 · s3base: 0.4/30.3/189.8 | 3882: **6.1/11.9/15.5** · 1c2d: **3/11.1/12** · s3base: **2.9/10.1/10.8** | ✅ med 降 2.5~3×；max 200ms 级 trailing 等待消灭（max≤15.5=rAF 帧点等待上界）；~10ms 恒定段=帧点量化等待（delta 含 dispatch→下一帧边界 ≤16.7ms），链本身亚毫秒 |
| 布局读 gBCR | 18 / 18 / 16 / 18 / 18 | 24 / 24 / 24 / 24 / 24 | ✅ 归一化后降：b2=2.6/mutation，c=1.2/mutation（每快 tick 恰 1 次=pixelBoxOf 基准盒；20 tick+settle） |
| getComputedStyle | 685 / 438 / 14 / 16 / 16 | **87 / 58 / 2 / 2 / 2** | ✅ −87%：快路径每 tick gCS=0（计数归因：b2 685≈8 次全量×~85[选区跨 ~83 节点的 medianFontSizeBetween]；c 87=仅末尾 settle 一次全量——快 tick 零 gCS） |
| getClientRects | 8 / 8 / 7 / 8 / 8 | **1 / 1 / 1 / 1 / 1** | ✅ 快路径每 tick clientRects=0（残余 1=末尾 settle 的 selectionToAnchor 量测批）——clientRects/gCS 链尽消（票面「布局读出链尽消」条款的落地口径；gBCR/Range.gBCR 绝对量随 tick 数上行——1.2~2.3/tick 归一化净面与归因披露见上两行） |
| Range.gBCR | 8 / 8 / 7 / 8 / 8 | 21 / 21 / 21 / 21 / 21 | 与 tick 数同增（守卫(iv) 每快 tick 恰 1 次）——布局读净面仍降（gBCR+clientRects+Range.gBCR 合计：b2≈4.9/mutation→c≈2.3/mutation） |
| D1 面回归检查 | 甲块 42/10/3/3/3 右溢 0 | 42 / 10 / 3 / 3 / 3 右溢 0 | ✅ 逐位不变（调度/快路径不动几何族——INV-58 同族构造保证） |

**快路径预算断言（头注「bands 现算不缓存」决策的实测依据）**：最重样本 real3882（829 span/8651 字符）快路径 20/20 帧全跟随零丢帧；链 CPU 增量 ≈ delta med 差（3882 11.9 − 合成页 10.1[纯帧等待+亚毫秒链]）≈ **<2ms**——「项几何链全程 <2ms 可不缓存」判据成立，bands 项几何链现算（bandsFromItems 纯函数零布局读）无缓存摊销必要；probe×2+对账 join 为残余 O(页文本) 纯 CPU（无布局读），60Hz 帧预算内无观测瓶颈。

**已知边界与申报**：①同帧覆盖断言以 mid-drag zoom 差分形态锚（快=zoom1/全量=zoom2，终态=zoom2）——已知边界②「mid-drag zoom 一帧陈旧由 settle 纠正」的正测试面；②rAF 后台/遮挡暂停=隐藏态程序化选区视觉陈旧（cosmetic——设计书 §5.2 申报，Electron 单窗口+拖选需前台输入不可触发）；③mutation 间隔受 dispatch 节奏 50ms 封顶——16.7ms 量级需更密 dispatch 口径方可观测（本轮口径下 50/60 交替的帧栅格量化已可分辨）；④AnnotationLayer 存量重锚域仍 DOM 量测域（门二 seam_ruling——INV-58 票外边界，独立票，SelectionLayer/selection-evaluate 头注入档）。

**结论：D2 调度与快路径落地达标**——5Hz 步进消灭（mutations 7→20 全跟随、间隔 200→50=dispatch 界）、每 tick clientRects/gCS 链尽消（gCS −87%/clientRects −87%——绝对计数含末尾 settle 单次全量；gBCR/Range.gBCR 绝对量随 tick 数上行、按 mutation 归一 4.9→2.3 次/mutation）、全链 delta med 降 2.5~3×、D1 面逐位零回归。快/慢路径同族（INV-58 后半）由构造保证+selection-evaluate.test 等价 it 锁定。

**门一回炉处置档（Kimi PASS_WITH_WARNINGS，2026-09-04——W1/W2/N1/N2 四条落地，仅追加）**：
- **W1（mouseup cancel-before-evaluate 顺序锚）**：selection-evaluate.test 新增 W1 it——预渲染形态（快路径帧先落 paint 在场→再发 selectionchange 重建在途 rAF→mouseup→改 zoom=3→推进 300ms 越过帧点与防抖点）断言终态=mouseup 时刻全量产物（zoom2 几何 168/792）。红证=临时删除 onMouseUp 内 scheduler.cancel() 调用（文件备份法）：恰 W1 it 红（终态被 zoom3 快路径/防抖全量覆盖为 252/792）其余 3 it 绿，还原 diff 空后全绿。**探针过程发现并申报（live range 语义）**：初版形态（mouseup 前 paint 未在场）下，mouseup 后 toolbar/paint portal 的 DOM 结构插入会诱发浏览器/jsdom 原生 selectionchange（live range 对所在树结构变更的反应——设计书 §1 S8 态同机制，不经 JS dispatchEvent）→ 新 rAF 排程→t+16ms 快路径重渲一次——**生产语义无害**（快/全量同族同产物=INV-58 等价性吸收，visual 不动 pending），属票外已知行为非 cancel 顺序缺陷；W1 终版以预渲染形态隔离该噪声（portal 已在场时全量重渲经 React 节点复用无结构插入→零诱发——探针 trace 实测 mouseup 后 handler 调用 +0）。
- **W2（MUT2 变异落点说明+重跑）**：变异落点=**一处**——selection-geometry.ts 调度器工厂内 settle 防抖窗**消费点**（`window.setTimeout(() => ops.onSettled(), ops.windowMs)` 的 `ops.windowMs`→硬编码 `100`；非 SELECTION_DEBOUNCE_MS 常量）。两测试同红机制：C3 直测显式传 `windowMs: 200`、S1b 组件级经 `SELECTION_DEBOUNCE_MS=200` 注入——**两侧传参均为 200、流经同一被变异消费点**；变异体忽略传参按 100 执行→C3「距末事件 199ms 未 settle」断言红（settle 已于 100ms 发）+S1b「t=150 工具条仍无」断言红（toolbar 已于 100ms 弹出）。一处变异两件红=红证声明属实；门一回炉轮已重跑留档（本轮 vitest 输出：C3+S1b 两红、其余 19 绿；还原 diff 空）。
- **N1（测试件头注笔误）**：selection-evaluate.test「ADR-2017」→ADR-0017；夹具注释「span 盒 y=200」→「视口绝对 y=500=textLayer 盒 y300+盒本地 y200（DOM 回退链归一 top≈25.25%=(500−300)/792）」——注释与代码一致（绝对/本地两域口径写死）。
- **N2（§12 措辞收敛）**：「布局读出链尽消」→「clientRects/gCS 链尽消（gBCR/Range.gBCR 绝对量上行——归因与净面披露已在档）」——§12 两处+selection-evaluate.ts/SelectionLayer.tsx 头注同口径，数据不动。

