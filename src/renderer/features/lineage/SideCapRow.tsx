/**
 * [F-UIRES-04 批 3a] SideCapRow —— 详情面板骑缝行（「节点详情」+骑缝号 ·
 * 三位补零〔F-FOLDER-01〕+星标禁用钮〔F-STAR-01 A4 点亮：文献节点交互
 * toggle、主题节点零渲染、回调缺席=no-op〕+头部收起钮〔F-UIRES-03 B4③：
 * 回调缺席零渲染〕）。自 LineageSidePanel 拆出（行为零变搬移；e2e 锚 testid
 * 一字不动——panel-star / lineage-sidebar-collapse）。
 */
import type { LineageNode } from '@shared/models/lineage'
import { ICON_CHEVRONS_RIGHT } from '../../shared/icons'
import { StarToggleSpan } from './StarGlyphs'

export function SideCapRow(props: {
  node: LineageNode
  /** [F-FOLDER-01] 骑缝编号（INV-92 pubNo——Page 自 store pubNos 分发） */
  pubNo?: number | null
  onCollapse?: () => void
  onToggleStar?: (node: { id: string; paperId: string; isStarred?: boolean }) => void
}): JSX.Element {
  const { node } = props
  const paperPid = node.paperId
  const toggleStar = (): void => {
    if (paperPid !== null) props.onToggleStar?.({ id: node.id, paperId: paperPid, isStarred: node.isStarred })
  }
  return (
    <div className="insp-cap">
      <span>节点详情</span>
      <span className="flex items-center gap-2">
        {props.pubNo != null && <span>{`·${String(props.pubNo).padStart(3, '0')}`}</span>}
        {node.paperId !== null && (
          <StarToggleSpan isStarred={node.isStarred === true} className="panel-star" testid="panel-star" label="星标" onActivate={toggleStar} />
        )}
        {/* [F-UIRES-04 批 3d D8] collapse-btn=视觉款公共类（theme-buttons.css）——语义类/testid 零动 */}
        {props.onCollapse !== undefined && (
          <button type="button" className="side-collapse-btn syn-icon-btn collapse-btn" data-testid="lineage-sidebar-collapse"
            title="收起详情面板" aria-label="收起详情面板" onClick={props.onCollapse}>
            {ICON_CHEVRONS_RIGHT}
          </button>
        )}
      </span>
    </div>
  )
}
