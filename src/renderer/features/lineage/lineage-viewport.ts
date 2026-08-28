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
 */
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { NODE_H, nodeWidth } from './lineage-layout'
import type { LayoutResult } from './lineage-layout'

/** 缩放界+步长（wheel 锚点缩放与 auto-fit 钳制共用单源） */
export const ZOOM = { min: 0.25, max: 4, step: 0.0015 } as const
/** auto-fit 边距（票面 P1：上下 80/左右 120——层带年份标在左需宽边距） */
const FIT_PAD_X = 120
const FIT_PAD_Y = 80
/** 层带内容左缘（band line x1=-200/年份标 x=-190——取更左者为包围盒左界） */
const BAND_LEFT = -200

export type Viewport = { tx: number; ty: number; k: number }

/** auto-fit 视口计算（纯几何——包围盒+边距+钳制；DOM 尺寸由调用方量测） */
export function fitViewport(nodes: LineageNode[], layout: LayoutResult, vw: number, vh: number): Viewport {
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
    yMin = Math.min(yMin, p.y - NODE_H / 2)
    yMax = Math.max(yMax, p.y + NODE_H / 2)
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
}): ViewportController {
  const { nodes, edges, layout, svgRef } = args
  const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, k: 1 })
  const [userInteracted, setUserInteracted] = useState(false)

  // auto-fit effect：nodes/edges 引用变化（载入/导入替换/写回填）且用户
  // 未交互时整图入视口；视口宽高 0=不可量测（jsdom）→跳过保持现视口。
  useEffect(() => {
    if (userInteracted || nodes.length === 0) return
    const el = svgRef.current
    if (el === null) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    setViewport(fitViewport(nodes, layout, rect.width, rect.height))
  }, [nodes, edges, layout, userInteracted, svgRef])

  // zoom：非被动 wheel（preventDefault 阻页面滚动）；鼠标锚点缩放（缩放
  // 前后鼠标下的内容点不动）。函数式 set 取最新视口，无闭包过期。
  // （LG-02 原文搬迁——行为零变）
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      setUserInteracted(true) // auto-fit 抢占门置位（滚轮 zoom=用户接管视口）
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
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
      setViewport((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
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
