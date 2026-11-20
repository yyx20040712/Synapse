/**
 * 脉络连线重算 hook：布局信号经 rAF 合并后采集快照，按 [F-LANEGRID-01 B3]
 * 增量计划执行（设计稿 §6 更新计算集——rerun.planRerun 决策单源）：
 * - zero（inputs 几何面全等+快照全等+全局信号未变=视觉字段-only/重复触发）
 *   → 零重算（paths/锚占用发布均不动）；
 * - single（恰一条边 via 变+布局未变）→ routeEdge 单边重投影（carried=其余
 *   边路径=当前占用快照）+其余边路径引用复用；
 * - full（布局变化/结构 diff/全局信号〔uiScale 档变/渲染组结构变〕/首算）
 *   → computeRerouteScope 计算集+routeAll 全集边（集外边 carried 直通——
 *   逐字节不变；viaClear 边的 via 已在 store 复合单元清除=自动边参算）。
 * blocked 边在一次连续阻塞期间只提示一次；恢复净空后再次阻塞可重新提示。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { showToast } from '../../shared/ui/toast-store'
import { publish } from './anchor-occupancy'
import { buildSnapshot } from './edge-overlay-geom'
import {
  planRerun,
  routeAll,
  routeEdge,
  type EdgeGeomInput,
  type RerunPrev,
  type RoutedPath
} from './lineage-routing'

export function useLineageRoutes(args: {
  hostRef: RefObject<SVGSVGElement | null>
  inputs: EdgeGeomInput[]
  shiftedIds: ReadonlySet<string>
  groups: readonly unknown[]
  routeEpoch: number
  uiScale?: number
}): RoutedPath[] {
  const [paths, setPaths] = useState<RoutedPath[]>([])
  const notifiedBlocked = useRef<Set<string>>(new Set())
  // 前次运行面（快照/输入/路径/全局信号键——增量差分基准；重挂载随 ref 重建）
  const prevRef = useRef<RerunPrev | null>(null)

  useLayoutEffect(() => {
    const content = args.hostRef.current?.parentElement
    if (!(content instanceof HTMLElement)) return
    let raf = 0
    const warn = (msg: string): void => console.warn(msg)
    const run = (): void => {
      raf = 0
      const snap = buildSnapshot(content)
      const plan = planRerun({
        prev: prevRef.current,
        snap,
        inputs: args.inputs,
        uiScale: args.uiScale
      })
      // 视觉字段-only：零重算（路径引用/发布/blocked 提示面均不动）
      if (plan.mode === 'zero') return
      const next: RoutedPath[] =
        plan.mode === 'single'
          ? args.inputs.map((e) =>
              e.edgeId === plan.input.edgeId
                ? routeEdge(plan.input, snap, warn, plan.carried)
                : plan.keep.get(e.edgeId)!
            )
          : routeAll(args.inputs, snap, warn, plan.carried)
      const blocked = new Set(next.filter((p) => p.clearance === 'blocked').map((p) => p.edgeId))
      for (const edgeId of blocked) {
        if (!notifiedBlocked.current.has(edgeId)) showToast('该连线暂无可行走线', 'error')
      }
      notifiedBlocked.current = blocked
      setPaths(next)
      // 锚占用仍发布完整路由结果；blocked 只撤销线条，不删除边或钉定锚数据。
      publish(next)
      prevRef.current = {
        snap,
        inputs: args.inputs,
        paths: next,
        uiScale: args.uiScale
      }
    }
    raf = requestAnimationFrame(run)
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (raf !== 0) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(run)
          })
    ro?.observe(content)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [args.hostRef, args.inputs, args.shiftedIds, args.groups, args.routeEpoch, args.uiScale])

  return paths
}
