/**
 * 脉络连线重算 hook：布局信号经 rAF 合并后采集快照并执行 routeAll。
 * blocked 边在一次连续阻塞期间只提示一次；恢复净空后再次阻塞可重新提示。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { showToast } from '../../shared/ui/toast-store'
import { publish } from './anchor-occupancy'
import { buildSnapshot } from './edge-overlay-geom'
import { routeAll, type EdgeGeomInput, type RoutedPath } from './lineage-routing'

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

  useLayoutEffect(() => {
    const content = args.hostRef.current?.parentElement
    if (!(content instanceof HTMLElement)) return
    let raf = 0
    const run = (): void => {
      raf = 0
      const next = routeAll(args.inputs, buildSnapshot(content), (msg) => console.warn(msg))
      const blocked = new Set(next.filter((p) => p.clearance === 'blocked').map((p) => p.edgeId))
      for (const edgeId of blocked) {
        if (!notifiedBlocked.current.has(edgeId)) showToast('该连线暂无可行走线', 'error')
      }
      notifiedBlocked.current = blocked
      setPaths(next)
      // 锚占用仍发布完整路由结果；blocked 只撤销线条，不删除边或钉定锚数据。
      publish(next)
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
