// b3: T3-P8
/**
 * [F-LGRAPH-01①U2] useMonthPop —— 改月弹层（MonthPop）域状态（自 useCardDrag
 * 拆出，行为零变）。Esc/外点关闭（mockup L770/L1097——排除弹层自身与月标
 * .c-ym）；月份行=groups 派生单源（count=组内节点数）。
 */
import { useEffect, useMemo, useState } from 'react'
import type { TimelineYearGroup } from './lineage-timeline'

/** MonthPop 月份行（groups 派生单源） */
export interface MonthOption {
  year: number | null
  month: number | null
  count: number
}

/** 改月弹层开位（position:fixed——沿 popover-shared 钳制） */
export interface MonthPopState {
  nodeId: string
  cx: number
  cy: number
  year: number | null
  month: number | null
}

export function useMonthPopState(groups: TimelineYearGroup[]): {
  monthPop: MonthPopState | null
  setMonthPop: (v: MonthPopState | null) => void
  monthPopMonths: MonthOption[]
} {
  const [monthPop, setMonthPop] = useState<MonthPopState | null>(null)

  const monthPopMonths = useMemo<MonthOption[]>(
    () =>
      groups.flatMap((g) =>
        g.months.map((m) => ({ year: g.year, month: m.month, count: m.nodes.length }))
      ),
    [groups]
  )

  // Esc/外点关闭（mockup L770/L1097——排除弹层自身与月标）
  useEffect(() => {
    if (monthPop === null) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMonthPop(null)
    }
    const onDoc = (e: MouseEvent): void => {
      const t = e.target
      if (
        t instanceof Element &&
        (t.closest('[data-testid="month-pop"]') !== null || t.closest('.c-ym') !== null)
      ) {
        return
      }
      setMonthPop(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onDoc)
    }
  }, [monthPop])

  return { monthPop, setMonthPop, monthPopMonths }
}
