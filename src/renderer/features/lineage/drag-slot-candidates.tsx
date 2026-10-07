// b3: P7-H
/**
 * [F-LGRAPH-01②U6] DragCandidates —— 拖拽候选占位槽族（mockup §3.5/S6②：
 * 拖动中源月框内每插入空位一槽——最近空位=实态（in-flow .drag-slot 由
 * TimelineYears 承载）、其余候选=faded 0.35 绝对定位不占布局）。
 * [F-SLOTGRID-01 U3/F-DRAGVIS-01] 候选阵列=算术网格（设计 v1.4 §5.5——
 * 含源网格全体 cell 0..total-1 逐格 candidateSlotAt 直读，含 φ_r 奇偶相位，
 * 随容量公式实时重排（frameW prop）；insertIdx 格=实态槽在流占位不重复渲染；
 * 与松手落点同源=松手落 cell insertIdx（settle 往返恒等）。**U1 期 rect 实测
 * 派生+stableEpoch 稳定重捕获机制随本批整体退役**（方案切换=删旧：算术直读
 * 无测量漂移面——框高 .38s 过渡/占位槽腾位不再触及候选几何）。
 */
import { candidateSlotAt } from './card-drag-grid'

export function DragCandidates(props: {
  /** 实态槽已占位的插入序（该序不重复渲染 faded 候选） */
  insertIdx: number
  /** 拖起相位（settle 落位即卸载——父件门控） */
  active: boolean
  /** [F-SLOTGRID-01 U3] 月框内容宽（capacity 同源——随容量实时重排） */
  frameW: number
  /** 含源组全序长（组卡数含拖卡——候选=含源网格全体 cell） */
  total: number
}): JSX.Element | null {
  if (!props.active) return null
  const cells = []
  for (let k = 0; k < props.total; k++) {
    if (k === props.insertIdx) continue // 实态槽在流占位（cell insertIdx）
    const pos = candidateSlotAt(k, props.frameW)
    cells.push(
      <div
        className="drag-slot cand faded"
        data-testid="drag-slot-cand"
        key={k}
        style={{ position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px` }}
      >
        置入
      </div>
    )
  }
  return <>{cells}</>
}
