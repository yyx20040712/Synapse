// b3: T3-P8
/**
 * [T3-P8] MonthPop —— 改月弹层（mockup L1101-1128 .month-pop；弹层视口钳制
 * [原 popover-shared clampPopoverPos——随线型弹层退役迁驻本件单一消费面]）。
 * 月份列表=Timeline groups 派生单源（MonthOption）；行=dot[当前月 on
 * 态]+月份名+篇数计数；foot-note 语义自锁（移动带飞行动画·月份是数据字段
 * 非拖拽语义）。Esc/外点关闭驻 useCardDrag（排除弹层自身与 .c-ym——mockup
 * L770）；根 onClick stopPropagation=外点排除面第二重。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { moveTargetLabel } from './useCardDrag'
import type { MonthOption } from './useMonthPop'

/** 弹层视口钳制（mockup L1031-1034 语义——纯函数；left=clamp(6,cx−125,vw−258)
 *  /top=clamp(6,cy+14,vh−h−10)，h=实测弹层高） */
function clampPopoverPos(
  cx: number,
  cy: number,
  vw: number,
  vh: number,
  h: number
): { left: number; top: number } {
  const left = Math.max(6, Math.min(cx - 125, vw - 258))
  const top = Math.max(6, Math.min(cy + 14, vh - h - 10))
  return { left, top }
}

export function MonthPop(props: {
  /** 开层锚点（视口坐标） */
  cx: number
  cy: number
  /** 当前月（on 态判定；null=查无节点防御） */
  current: { year: number | null; month: number | null } | null
  months: MonthOption[]
  onPick(year: number | null, month: number | null): void
}): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState(() =>
    clampPopoverPos(props.cx, props.cy, window.innerWidth, window.innerHeight, 0)
  )
  useLayoutEffect(() => {
    const h = rootRef.current?.offsetHeight ?? 0
    setPos(clampPopoverPos(props.cx, props.cy, window.innerWidth, window.innerHeight, h))
  }, [props.cx, props.cy, props.months])

  return (
    <div
      className="pop month-pop"
      data-testid="month-pop"
      ref={rootRef}
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>移 动 到 月 份</h4>
      {props.months.map((m) => {
        const on =
          props.current !== null && m.year === props.current.year && m.month === props.current.month
        return (
          <button
            type="button"
            key={`${String(m.year)}|${String(m.month)}`}
            className={on ? 'ws-item on' : 'ws-item'}
            data-ym={`${String(m.year)}|${String(m.month)}`}
            onClick={() => props.onPick(m.year, m.month)}
          >
            <span className="dot" style={{ background: on ? 'var(--ok)' : 'var(--line)' }} />
            <span className="nm">{moveTargetLabel(m.year, m.month)}</span>
            <span className="ct">{m.count} 篇</span>
          </button>
        )
      })}
      <div className="foot-note">移动带飞行动画 · 月份是数据字段（非拖拽语义）</div>
    </div>
  )
}
