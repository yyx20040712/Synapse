/**
 * [F-UIRES-04 批 3a] SideCapRow —— 详情面板骑缝行（「节点详情」+骑缝号 ·
 * 三位补零〔F-FOLDER-01〕+星标禁用钮〔F-STAR-01 A4 点亮：文献节点交互
 * toggle、主题节点零渲染、回调缺席=no-op〕）。自 LineageSidePanel 拆出（行为
 * 零变搬移；e2e 锚 testid 一字不动——panel-star）。
 * [B5 设计稿 §3.4/§10.2/§11.4——wave C 2026-11-25 断言翻转] 原头部收起钮〔F-UIRES-03 B4③：onCollapse
 * prop、testid lineage-sidebar-collapse、类 side-collapse-btn〕退役：侧栏收起/展开开关迁工具栏
 * LineagePaneToggles（动态 testid），本件只剩标题/编号/星标。
 */

import type { LineageNode } from '@shared/models/lineage'
import { StarToggleSpan } from './StarGlyphs'

export function SideCapRow(props: {
  node: LineageNode
  /** [F-FOLDER-01] 骑缝编号（INV-92 pubNo——Page 自 store pubNos 分发） */
  pubNo?: number | null
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
      </span>
    </div>
  )
}
