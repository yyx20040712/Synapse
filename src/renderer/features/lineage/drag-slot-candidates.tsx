// b3: P7-H
/**
 * [F-LGRAPH-01②U6] DragCandidates —— 拖拽候选占位槽族（mockup §3.5/S6②：
 * 拖动中源月框内每插入空位一槽——**最近空位=实态**（in-flow .drag-slot 由
 * TimelineYears 承载）、**其余候选=faded 0.35 绝对定位**（.drag-slot-cand
 * ——不占 flex 布局，槽位几何=其余卡 rect 派生）。
 *
 * - 候选 k（k<其余卡数）=插入 others[k] 前 → 槽位=该卡左上；k=末位=尾卡右
 *   侧 +20 隙（超框宽右界=换行首 padding 位——近似承载，瀑布布局无列格）。
 * - 坐标域=框内内容坐标（rect 差/z 逆变换——[②U7] 缩放正交）。
 * - 纯受控子件（拖相位 props 驱动——slot.insertIdx 变化即重排候选）。
 */
import { useMemo } from 'react'
import { contentScale } from './timeline-zoom'

/** 槽位几何（框内内容坐标 px） */
interface SlotPos {
  x: number
  y: number
}

export function DragCandidates(props: {
  /** 源月框 key（frame 定位=data-frame-key 查询） */
  frameKey: string
  /** 拖卡 id（候选=其余卡空位） */
  nodeId: string
  /** 实态槽已占位的插入序（该序不重复渲染 faded 候选） */
  insertIdx: number
  /** 拖起相位（settle 落位即卸载——父件门控） */
  active: boolean
}): JSX.Element | null {
  // 候选位测量：拖相位 props 变化即重算（卡片布局拖中稳定——仅实态槽在流）
  const cands = useMemo(() => {
    const frame = document.querySelector(`.month-frame[data-frame-key="${props.frameKey}"]`)
    if (!(frame instanceof HTMLElement)) return [] as Array<SlotPos & { idx: number }>
    const f = frame.getBoundingClientRect()
    const z = contentScale()
    const others = Array.from(frame.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))
      .filter((c) => c.dataset.nodeId !== props.nodeId)
    const local = (el: HTMLElement): SlotPos & { w: number; h: number } => {
      const r = el.getBoundingClientRect()
      return { x: (r.left - f.left) / z, y: (r.top - f.top) / z, w: r.width / z, h: r.height / z }
    }
    const out: Array<SlotPos & { idx: number }> = []
    const frameW = f.width / z
    others.forEach((el, k) => {
      if (k === props.insertIdx) return // 实态槽占位（in-flow）——不重复渲染
      const p = local(el)
      out.push({ x: p.x, y: p.y, idx: k })
    })
    // 末位候选（k=others.length）：尾卡右侧 +20 隙；超框右界（−padding 12）=
    // 换行首位（x=12 padding、y=尾卡下 +20）
    const last = others.length > 0 ? local(others[others.length - 1]!) : null
    if (last !== null && props.insertIdx !== others.length) {
      let x = last.x + last.w + 20
      let y = last.y
      if (x + 128 > frameW - 12) {
        x = 12
        y = last.y + last.h + 20
      }
      out.push({ x, y, idx: others.length })
    }
    return out
  }, [props.frameKey, props.nodeId, props.insertIdx, props.active])

  if (!props.active) return null
  return (
    <>
      {cands.map((c) => (
        <div
          className="drag-slot cand faded"
          data-testid="drag-slot-cand"
          key={c.idx}
          style={{ position: 'absolute', left: `${c.x}px`, top: `${c.y}px` }}
        >
          置入
        </div>
      ))}
    </>
  )
}
