// b3: B3 commit C（2026-11-22）——G 空槽 occupancy mask（设计稿 §6.8：旧方案
// 「含源网格全体 cell 0..total−1 除 insertIdx 逐格 faded+被卡覆盖靠 .cand z3
// 提层兜可见」整体退役=方案切换删旧；候选不再与卡同 cell，覆盖场景不存在）。
/**
 * [F-LGRAPH-01②U6→B3 §6] DragCandidates —— 拖拽候选空槽族（occupancy mask
 * 形态：候选=candidateCells(total,frameW)——末行未占 cell 全画（物理追加位
 * 提示面），被预览卡占用的 cell 零 faded；候选槽是「该行有空位」的提示，
 * 非逐格插入位预告）。坐标=candidateSlotAt（与松手落点/占位槽同源单源——
 * positionOf 同一数学，含 φ_r 奇偶相位，随容量公式实时重排）。
 * `.drag-slot.cand` z-index:3 层级声明保留（INV-145④ 层级契约不撤——旧
 * 「被卡覆盖」病灶描述随方案退役）。unmeasured（frameW≤0）→候选=∅
 * （有限网格降级）。
 */
import { candidateCells, candidateSlotAt } from './card-drag-grid'

export function DragCandidates(props: {
  /** 实态槽插入序（B3 §6 起 mask 面不消费——对外 props 契约保持，TimelineMonthFrame 接线零变） */
  insertIdx: number
  /** 拖起相位（settle 落位即卸载——父件门控） */
  active: boolean
  /** [F-SLOTGRID-01 U3] 月框内容宽（capacity 同源——随容量实时重排；≤0=unmeasured→候选=∅） */
  frameW: number
  /** 含源组全序长（组卡数含拖卡——预览行集合=partitionRows(total,frameW)） */
  total: number
}): JSX.Element | null {
  if (!props.active) return null
  const cells = []
  for (const k of candidateCells(props.total, props.frameW)) {
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
