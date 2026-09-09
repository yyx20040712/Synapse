// b3: P7-H
/**
 * [LG-03] LineageNodeMenu —— 节点右键菜单（Board 子组件，组件≤250 拆分预案）。
 *
 * 行为：fixed 定位于右键锚点；菜单项=连线到…/改父…/添加参考连接（R2-LG12：
 * 仅 paperId≠null 且 isSurvey 的综述文献节点呈现——菜单项级限定，service 双
 * 守「参考边只能由综述节点发出」）/连接父文献…（F-LG15 人工第二父——所有
 * 节点呈现，守卫票面无 from 限定；动作=Board 弹目标选择对话框）/管理人工
 * 连线…（F-LG15——仅节点有 manual 入边时呈现；label 后编辑+删除入口）/
 * 编辑核心想法/添加标签…（F-LG14——文献/主题节点均呈现：标签面不区分绑定
 * 态；动作=Board 弹标签对话框）/删除父连线（仅有 tree 父边时呈现——manual
 * 入边不算 tree 父，F-LG15）/删除节点。透明遮罩点击关闭（ESC 关闭归 Dialog
 * 域——菜单轻量面不挂键盘）。所有动作只上抛回调——写路径收口在 Board→store。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
import { isSurvey } from './lineage-classify'

export interface LineageNodeMenuProps {
  node: LineageNode
  /** 该节点现有 tree 父边（toNode=节点且 kind=tree）——无则「删除父连线」不呈现
   *  （manual 入边不算 tree 父——F-LG15 人工父走管理对话框删除） */
  parentEdge: LineageEdge | null
  /** 该节点现有 manual 入边（F-LG15）——无则「管理人工连线…」不呈现 */
  manualParentEdges: LineageEdge[]
  anchor: { x: number; y: number }
  onClose(): void
  onLinkTo(nodeId: string): void
  onReparent(nodeId: string): void
  /** 进入参考连接模式（R2-LG12——仅综述文献节点菜单项呈现） */
  onAddRefLink(nodeId: string): void
  /** 连接父文献…（F-LG15 人工第二父——对话框目标选取） */
  onLinkManualParent(nodeId: string): void
  /** 管理人工连线…（F-LG15 label 后编辑+删除入口） */
  onManageManualParents(nodeId: string): void
  onEditIdea(nodeId: string): void
  /** F-LG14 添加标签入口（标签对话框弹起） */
  onAddTag(nodeId: string): void
  onRemoveParentEdge(edgeId: string): void
  onRemoveNode(nodeId: string): void
}

export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
  const { node, parentEdge, anchor } = props
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-(--z-pop-veil)" onClick={props.onClose} />
      <div
        data-testid="lineage-node-menu"
        role="menu"
        aria-label={`节点菜单：${node.title}`}
        className="fixed z-(--z-pop) w-40 rounded border py-1 shadow-lg"
        style={{
          left: anchor.x,
          top: anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkTo(node.id)}>
          连线到…
        </button>
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onReparent(node.id)}>
          改父…
        </button>
        {node.paperId !== null && isSurvey(node.title) && (
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onAddRefLink(node.id)}
        >
          添加参考连接
        </button>
        )}
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkManualParent(node.id)}>
          连接父文献…
        </button>
        {props.manualParentEdges.length > 0 && (
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_STYLE}
            style={{ color: 'var(--text)' }}
            onClick={() => props.onManageManualParents(node.id)}
          >
            管理人工连线…
          </button>
        )}
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onEditIdea(node.id)}>
          编辑核心想法
        </button>
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onAddTag(node.id)}>
          添加标签…
        </button>
        {parentEdge !== null && (
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_STYLE}
            style={{ color: 'var(--text)' }}
            onClick={() => props.onRemoveParentEdge(parentEdge.id)}
          >
            删除父连线
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onRemoveNode(node.id)}
        >
          删除节点
        </button>
      </div>
    </>
  )
}
