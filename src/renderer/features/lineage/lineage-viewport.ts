// b3: P7-H
/**
 * [R2-LG10] lineage-viewport —— 画布视口域模块（auto-fit+pan+zoom，LineageCanvas
 * 拆件——组件 ≤250 行红线，LG9 LineageNodeCard/LineageEdges 拆件同型先例）。
 *
 * auto-fit 状态机（票面 P1；宪法前置）——态空间 idle→fitting→fitted +
 * manual 抢占门（userInteracted 布尔，非第四态——fitted 后可再入）：
 * | 态/标志 | 进入事件 | 行为 |
 * | idle（nodes 空） | 挂载/图清空 | 不 fit，保持现视口 |
 * | fitting | nodes/edges 引用变化 且 !userInteracted 且视口可量测（宽高>0） | 计算全节点+层带左缘包围盒→setViewport（瞬时，v1 无缓动） |
 * | fitted | fitting 完成 | 等待下一触发 |
 * | manual（userInteracted=true） | panbg pointerdown / 滚轮 wheel | 后续 nodes 变化**不抢视口**（fit 跳过） |
 * | manual→fitting | 「适应视图」按钮（lineage-fit-view，resetFit 唯一复位口） | userInteracted 置 false→effect 重触发 fit |
 *
 * 包围盒=x∈[层带标签左缘 -200, 最右节点右缘]（LG9 N5：年份标初始视口
 * 外，fit 后必可见）∪ y∈全节点上下缘；边距上下 80/左右 120；k=min(容纳
 * 比) 钳制 [0.25,4]（ZOOM 界内）。视口宽高 0（jsdom 无布局/未挂载）=
 * 不可量测→跳过（防御，不产生退化 fit——既有 pan/zoom it 面保持绿的兼容
 * 前提）。fit 逻辑驻本拆件（依赖 DOM 视口尺寸——禁入 lineage-layout 纯
 * 函数，票面架构层）；节点半宽=nodeWidth(title) 分档单源（INV-36）。
 * pan/zoom 自 LG-02 起即本域行为（原驻 Canvas，拆件搬迁行为零变）：
 * zoom=非被动 wheel+鼠标锚点缩放；pan=panbg pointer 拖拽（节点上不
 * pan）；INV-14 window/svg 同 type 同函数引用成对注册成对清理。
 * 视口瞬态（tx/ty/k）驻 hook state 不入 store（LG-02 既有语义）。
 *
 * [F-L2] 两坐标系口径（INV-43；SET1 接缝：theme.css `.app-content-row {
 * zoom: var(--ui-scale) }`——lineage svg 在该缩放子树内，改挂载点/加档
 * 两侧互指）：**根框 px**（getBoundingClientRect/事件 clientX——含祖先
 * zoom，根坐标系视觉值）vs **svg 本地 px**（SVG 用户坐标系/transform 数学
 * ——不含 zoom）。视口数学（fit 量测/wheel 锚点/pan 增量）恒以 svg 本地
 * 口径计量：fit=clientWidth/clientHeight 直取（本地布局 px，Q1 实测不含
 * 祖先 zoom）；wheel/pan=根框差值×rootToLocalScale 归一（比值=1/有效
 * zoom，嵌套自动复合）。祖先 zoom 下的根框量测不得直接入 transform 数学
 * （k 虚大→内容溢出视口——修前 large 档溢出 211.75px）。
 *
 * [F-L4] fit 触发源扩面「视口尺寸变化」：ResizeObserver 观察 svg 布局盒
 * （uiScale 换档/窗口 resize 均为其二阶来源，布局盒变化=一阶原因——RO
 * 回调天然发生在布局更新之后，读到新值零时序陷阱，票面 §0 候选 B）。RO
 * 回调与既有 fit effect 共用同一 doFit（早退链顺序零变：userInteracted
 * 不抢/nodes=0 不 fit/svgRef null 跳过/量测 0 跳过）；门语义零变
 * （userInteracted=true 时换档/resize 都不抢视口——与 nodes 变化同门）。
 * S5 无自激励不变量：setViewport 只改 <g data-viewport> transform，svg
 * 布局盒由父布局决定（h-full w-full）→不再触发 RO。RO effect deps
 * [svgRef] 挂载一次常活（svg 常驻 W2——空→非空转场无重绑），数据经
 * doFitRef 镜像取最新（cbRef 先例）；卸载 disconnect 成对清理（INV-14
 * 同型）。typeof ResizeObserver === 'undefined' 极端环境守卫→不注册
 * 不报错（既有 fit 路径不受影响）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { BAND_LEFT, nodeHeight, nodeWidth } from './lineage-layout'
import type { LayoutResult } from './lineage-layout'

/** 缩放界+步长（wheel 锚点缩放与 auto-fit 钳制共用单源） */
export const ZOOM = { min: 0.25, max: 4, step: 0.0015 } as const
/** auto-fit 边距（票面 P1：上下 80/左右 120——层带年份标在左需宽边距） */
const FIT_PAD_X = 120
const FIT_PAD_Y = 80
// BAND_LEFT 已迁 lineage-layout.ts 导出（R2-LG11 B1 单源化：本模块+
// Canvas 层带线/年份标三消费同源）；包围盒 y 半高=nodeHeight(title)/2
// （INV-38——chain 夹具题名全 1 行恒等旧 NODE_H=64，fit 数值不变）

export type Viewport = { tx: number; ty: number; k: number }

/**
 * 根框→svg 本地坐标比值（[F-L2] 归一单源；INV-43；消费域单一驻本文件
 * ——ADR-0017 主控裁决不拆文件）。
 * 原理：clientWidth（CSS 本地布局 px，不含祖先 zoom）/gBCR.width（根框
 * 视觉 px，含全部祖先 zoom 复合）=1/有效 zoom——任意嵌套 zoom 自动复合
 * （逐祖乘积的解析等价），零 CSS 类耦合（不查 .app-content-row——SET1
 * 改挂载点/加档不破）。任一量测 ≤0（未挂载/不可量测/CSS 布局退化——
 * jsdom 桩面 clientWidth 恒 0）→1（防御：退化直通，不产生除零/NaN）。
 * 可选 rect：调用方已读 gBCR 时传入，复用其 width 作根框宽（不自读
 * gBCR）——锚点差值 rect.left 与比值分母同源同帧（同帧两次 gBCR 的
 * 自洽假设消除——门一 W-2）；缺省自读（既有调用/测试零变）。
 * 已知噪声：clientWidth 整数舍入（规范）→比值误差 ≈0.03%（实测 0.05%）
 * ——锚点/增量/fit 语义不可感，声明接受（票面 §0）。
 */
export function rootToLocalScale(el: Element, rect?: DOMRect): number {
  const rw = (rect ?? el.getBoundingClientRect()).width
  const cw = el.clientWidth
  return rw > 0 && cw > 0 ? cw / rw : 1
}

/** labelBoxes 缺省常量（引用稳定——防 effect 依赖每渲染新 [] 引发的
 *  setState 无限循环；Canvas 侧传 useMemo 产物同语义） */
const EMPTY_LABEL_BOXES: Array<{ x: number; y: number; hw: number; hh: number }> = []

/** auto-fit 视口计算（纯几何——包围盒+边距+钳制；DOM 尺寸由调用方量测）。
 *  vw/vh 语义=svg 本地口径 px（[F-L2] INV-43：effect 调用方传
 *  clientWidth/clientHeight——根框 gBCR 量测含祖先 zoom 会使 k 虚大）。
 *  第 5 参 labelBoxes（F-L1-C，缺省 []——既有调用零破）：边标签槽位盒
 *  参与包围盒——被防重叠放置器推出的标签不可消失在 fit 视野外。 */
export function fitViewport(
  nodes: LineageNode[],
  layout: LayoutResult,
  vw: number,
  vh: number,
  labelBoxes: Array<{ x: number; y: number; hw: number; hh: number }> = []
): Viewport {
  let xMin = BAND_LEFT
  let xMax = BAND_LEFT
  let yMin = Infinity
  let yMax = -Infinity
  for (const n of nodes) {
    const p = layout.positions.get(n.id)
    if (p === undefined) continue
    const hw = nodeWidth(n.title) / 2
    xMin = Math.min(xMin, p.x - hw)
    xMax = Math.max(xMax, p.x + hw)
    const hh = nodeHeight(n.title) / 2
    yMin = Math.min(yMin, p.y - hh)
    yMax = Math.max(yMax, p.y + hh)
  }
  for (const b of labelBoxes) {
    xMin = Math.min(xMin, b.x - b.hw)
    xMax = Math.max(xMax, b.x + b.hw)
    yMin = Math.min(yMin, b.y - b.hh)
    yMax = Math.max(yMax, b.y + b.hh)
  }
  if (yMin === Infinity) return { tx: 0, ty: 0, k: 1 } // 无可拟合内容（调用方已查 nodes.length——理论不可达防御）
  const k = Math.min(
    ZOOM.max,
    Math.max(ZOOM.min, Math.min((vw - 2 * FIT_PAD_X) / (xMax - xMin), (vh - 2 * FIT_PAD_Y) / (yMax - yMin)))
  )
  return { k, tx: FIT_PAD_X - xMin * k, ty: FIT_PAD_Y - yMin * k }
}

export interface ViewportController {
  viewport: Viewport
  /** 「适应视图」复位（唯一 fit 重触发口） */
  resetFit(): void
}

/**
 * 视口控制器 hook（状态机宿主——头注表）：auto-fit 单一 fit 路径（按钮
 * 复位=userInteracted 置 false 经同一 effect 重触发）；zoom/pan 监听随
 * 挂载注册（依赖全稳定 identity——挂载一次常活，INV-14 成对清理）。
 */
export function useViewportController(args: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  layout: LayoutResult
  svgRef: RefObject<SVGSVGElement | null>
  /** 边标签槽位盒（F-L1-C，缺省 []——LineageCanvas 从放置器 slots 构建） */
  labelBoxes?: Array<{ x: number; y: number; hw: number; hh: number }>
}): ViewportController {
  const { nodes, edges, layout, svgRef } = args
  const labelBoxes = args.labelBoxes ?? EMPTY_LABEL_BOXES
  const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, k: 1 })
  const [userInteracted, setUserInteracted] = useState(false)

  // [F-L4] doFit ref 镜像：fit 逻辑单一定义点（早退链+量测+fitViewport，
  // 顺序零变），两消费点（既有 fit effect+RO 回调）经 ref 共用同一套；每
  // 渲染提交后更新（crib LineageCanvas.tsx cbRef 先例——effect 期更新，
  // RO 回调无闭包过期）。声明序=先于两消费 effect（同提交内 ref 先就位）。
  // [回炉 1 W1] 赋值用 useLayoutEffect 非 passive useEffect：passive 在
  // paint 后异步跑，存在「渲染提交→赋值前」窗口，期间 RO 回调可能读到上
  // 一渲染闭包（如 wheel 刚置 userInteracted=true 而 RO 仍用 false 旧闭包
  // 抢视口）；layout effect 在 DOM commit 后同步执行，先于浏览器渲染步骤
  // 的 RO 回调帧——竞态窗口消除（门一 W1 裁决）。
  const doFitRef = useRef<() => void>(() => undefined)
  useLayoutEffect(() => {
    doFitRef.current = () => {
      // auto-fit 早退链（[F-L4] 前内联于 fit effect——抽取零变）：用户已
      // 交互（pan/zoom 接管）不抢；空图不 fit；svg 未挂载/量测 0（jsdom
      // 无布局）跳过保持现视口。[F-L2] 量测=clientWidth/clientHeight 直取
      // （svg 本地口径，INV-43——不含祖先 zoom；gBCR 根框口径会 k 虚大→
      // 溢出视口）。clientWidth=0 且 gBCR>0 = CSS 布局不可量测的退化态
      // （jsdom 桩面）→回退 gBCR（不劣于修前；真机恒有布局走直取主路径）。
      if (userInteracted || nodes.length === 0) return
      const el = svgRef.current
      if (el === null) return
      const rect = el.getBoundingClientRect()
      const vw = el.clientWidth || rect.width
      const vh = el.clientHeight || rect.height
      if (vw <= 0 || vh <= 0) return
      setViewport(fitViewport(nodes, layout, vw, vh, labelBoxes))
    }
  })

  // auto-fit effect：nodes/edges 引用变化（载入/导入替换/写回填）触发——
  // 体改调 doFitRef（[F-L4] §3：deps 语义零变原样保留，fit 逻辑上移共用）。
  useEffect(() => {
    doFitRef.current()
  }, [nodes, edges, layout, userInteracted, svgRef, labelBoxes])

  // [F-L4] RO effect：视口尺寸变化（svg 布局盒——换档/窗口 resize 一阶
  // 源）重触发 fit。deps [svgRef] 挂载一次常活（svg 常驻，不随 nodes 重
  // 注册——消 observe/disconnect 抖动），回调经 doFitRef 取最新数据。
  // 卸载 disconnect 成对清理（S6，INV-14 同型）；无 RO 环境守卫不注册。
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const el = svgRef.current
    if (el === null) return
    const ro = new ResizeObserver(() => {
      doFitRef.current()
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [svgRef])

  // zoom：非被动 wheel（preventDefault 阻页面滚动）；鼠标锚点缩放（缩放
  // 前后鼠标下的内容点不动）。函数式 set 取最新视口，无闭包过期。
  // （LG-02 原文搬迁——行为零变）
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      setUserInteracted(true) // auto-fit 抢占门置位（滚轮 zoom=用户接管视口）
      // [F-L2] clientX/rect.left 同根框（含祖先 zoom）自洽，差值×比值归一
      // 到 svg 本地口径（INV-43）——锚点偏 zoom 倍 = 缩放中心漂移。
      // rect 传 helper 复用同一次 gBCR（单帧单读，比值的分母与锚点差值
      // 同源——同帧两次 gBCR 的自洽假设消除——门一 W-2）
      const rect = el.getBoundingClientRect()
      const s = rootToLocalScale(el, rect)
      const mx = (e.clientX - rect.left) * s
      const my = (e.clientY - rect.top) * s
      setViewport((v) => {
        const k2 = Math.min(ZOOM.max, Math.max(ZOOM.min, v.k * Math.exp(-e.deltaY * ZOOM.step)))
        return {
          k: k2,
          tx: mx - ((mx - v.tx) / v.k) * k2,
          ty: my - ((my - v.ty) / v.k) * k2
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [svgRef])

  // pan：背景按下进入拖拽（节点上不触发）；move/up 挂 window（拖出画布
  // 仍跟随）。增量位移（每 move 与上一位置差），卸载三 listener 成对移除。
  // （LG-02 原文搬迁——行为零变）
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    let dragging = false
    let lastX = 0
    let lastY = 0
    const onDown = (e: PointerEvent): void => {
      if (!(e.target instanceof Element) || !e.target.hasAttribute('data-panbg')) return
      setUserInteracted(true) // auto-fit 抢占门置位（panbg 拖拽=用户接管视口）
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    const onMove = (e: PointerEvent): void => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      // [F-L2] 拖拽增量=根框差×比值归一到 svg 本地口径（INV-43）——直用
      // 根框差会使拖拽手感快 zoom 倍
      const s = rootToLocalScale(el)
      setViewport((v) => ({ ...v, tx: v.tx + dx * s, ty: v.ty + dy * s }))
    }
    const onUp = (): void => {
      dragging = false
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [svgRef])

  return {
    viewport,
    resetFit: () => setUserInteracted(false)
  }
}
