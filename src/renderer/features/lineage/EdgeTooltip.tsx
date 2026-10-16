// b3: F-VISFB-23
/**
 * [F-VISFB-23 N2] EdgeTooltip —— browse 态边名 tooltip（EdgeOverlay 拆件
 * ——250 行红线）：数据源=边真实 label（空串门在宿主——空线名零展示面）；
 * 定位=随指针 client 域：portal 挂 document.body+fixed（transform 祖先劫持
 * fixed 包含块——先例=EdgeMenuHost R14）+视口钳制两相（先例=EdgeMenu R19，
 * Rule of Three 第 2 处保持重复）；pointer-events:none=INV-97 零指针截获。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** 指针偏移（tooltip 左上角距指针热点 px）/视口边距（钳制保边） */
const TIP_OFFSET = 14
const TIP_MARGIN = 6

/** 视口钳制（tooltip 宽高实测后复钳——右/下缘不溢出视口） */
function clampTipPos(cx: number, cy: number, w: number, h: number): { left: number; top: number } {
  const left = Math.max(TIP_MARGIN, Math.min(cx + TIP_OFFSET, window.innerWidth - w - TIP_MARGIN))
  const top = Math.max(TIP_MARGIN, Math.min(cy + TIP_OFFSET, window.innerHeight - h - TIP_MARGIN))
  return { left, top }
}

export function EdgeTooltip(props: { label: string; x: number; y: number }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  // [R19 同型] 首帧按指针直落（w/h=0 估）→ layout 后按实测尺寸复钳；
  // [回炉1 W-2] label 入 deps——同坐标换长短文本按新实测宽复钳
  const [pos, setPos] = useState(() => clampTipPos(props.x, props.y, 0, 0))
  useLayoutEffect(() => {
    const w = ref.current?.offsetWidth ?? 0
    const h = ref.current?.offsetHeight ?? 0
    setPos(clampTipPos(props.x, props.y, w, h))
  }, [props.x, props.y, props.label])
  return createPortal(
    <div
      ref={ref}
      className="tl-edge-tooltip"
      data-testid="tl-edge-tooltip"
      role="tooltip"
      style={{ left: pos.left, top: pos.top }}
    >
      {props.label}
    </div>,
    document.body
  )
}
