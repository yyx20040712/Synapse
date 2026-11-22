// b3: B3 commit A 纯拆件（2026-11-22——自 TimelineYears.tsx 拆出；代码与锚
// 注释同迁，行为零变）
/**
 * [B3 §4] TimelineCardRow —— 卡行渲染件：单行 .tl-row（odd 相位类=奇行
 * padding-left 100 错位相位 o）+kids 切片+dragTail 挂载（拖起离流拖卡追加
 * 保育行**同一 children 数组槽**——keyed 同父调和节点保育=F-DRAGREMOUNT-01/
 * INV-140：拆槽渲染会被 React 判为跨槽位=旧节点卸载重挂，激活帧 ghost
 * inline 四键随旧节点消亡，故挂载必须与行内卡同数组）。行容器判据沿承：
 * **不得加 position**——拖拽 .dragging absolute 离流的包含块链
 * （.month-frame）不能变（theme-lineage.css .tl-row 规则注同源）。
 */

export function TimelineCardRow(props: {
  /** 行序（分区序 r——奇行挂 .odd 错位相位类） */
  index: number
  /** 行内卡列（kids 切片——占位/拖卡按 kids 原位入行） */
  row: JSX.Element[]
  /** 拖起离流拖卡（仅保育行非 null——追加行尾；其余行=null 零挂载） */
  dragTail: JSX.Element | null
}): JSX.Element {
  const children = props.row.slice()
  if (props.dragTail !== null) children.push(props.dragTail)
  return <div className={props.index % 2 === 1 ? 'tl-row odd' : 'tl-row'}>{children}</div>
}
