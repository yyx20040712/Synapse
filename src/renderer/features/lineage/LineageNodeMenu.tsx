// b3: P7-H
/**
 * [LG-03] LineageNodeMenu —— 节点右键菜单（Board 子组件，组件≤250 拆分预案）。
 *
 * 行为：fixed 定位于右键锚点；菜单项=连线到…/改父…/添加参考连接（R2-LG12：
 * 仅 paperId≠null 且 isSurvey 的综述文献节点呈现——菜单项级限定，service 双
 * 守「参考边只能由综述节点发出」）/编辑核心想法/添加标签…（F-LG14——文献/
 * 主题节点均呈现：标签面不区分绑定态；动作=Board 弹标签对话框）/删除父连线
 * （仅有父边时呈现）/删除节点。透明遮罩点击关闭（ESC 关闭归 Dialog 域——
 * 菜单轻量面不挂键盘）。所有动作只上抛回调——写路径收口在 Board→store。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { isSurvey } from './lineage-classify'

export interface LineageNodeMenuProps {
  node: LineageNode
  /** 该节点现有父边（toNode=节点）——无则「删除父连线」不呈现 */
  parentEdge: LineageEdge | null
  anchor: { x: number; y: number }
  onClose(): void
  onLinkTo(nodeId: string): void
  onReparent(nodeId: string): void
  /** 进入参考连接模式（R2-LG12——仅综述文献节点菜单项呈现） */
  onAddRefLink(nodeId: string): void
  onEditIdea(nodeId: string): void
  /** F-LG14 添加标签入口（标签对话框弹起） */
  onAddTag(nodeId: string): void
  onRemoveParentEdge(edgeId: string): void
  onRemoveNode(nodeId: string): void
}

const ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'

export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
  const { node, parentEdge, anchor } = props
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-40" onClick={props.onClose} />
      <div
        data-testid="lineage-node-menu"
        role="menu"
        aria-label={`节点菜单：${node.title}`}
        className="fixed z-50 w-40 rounded border py-1 shadow-lg"
        style={{
          left: anchor.x,
          top: anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkTo(node.id)}>
          连线到…
        </button>
        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onReparent(node.id)}>
          改父…
        </button>
        {node.paperId !== null && isSurvey(node.title) && (
          <button
            type="button"
            role="menuitem"
            className={ITEM_STYLE}
            style={{ color: 'var(--text)' }}
            onClick={() => props.onAddRefLink(node.id)}
          >
            添加参考连接
          </button>
        )}
        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onEditIdea(node.id)}>
          编辑核心想法
        </button>
        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onAddTag(node.id)}>
          添加标签…
        </button>
        {parentEdge !== null && (
          <button
            type="button"
            role="menuitem"
            className={ITEM_STYLE}
            style={{ color: 'var(--text)' }}
            onClick={() => props.onRemoveParentEdge(parentEdge.id)}
          >
            删除父连线
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className={ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onRemoveNode(node.id)}
        >
          删除节点
        </button>
      </div>
    </>
  )
}
