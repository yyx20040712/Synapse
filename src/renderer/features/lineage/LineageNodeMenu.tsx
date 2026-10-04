// b3: P7-H
/**
 * [LG-03] LineageNodeMenu —— 节点右键菜单（Board 子组件，组件≤250 拆分预案）。
 *
 * 行为：fixed 定位于右键锚点；菜单首行=目标标识「卡「题名」● 命中」（②批
 * 右键反馈④——按下即高亮配套）；菜单项=连线到…/改父…（目标点选流沿承）/
 * 编辑核心想法/删除父连线（有入边时呈现）/删除节点（[A1b]「添加标签…」
 * 随脉络私有标签域退役删除——标签唯一源=文献库域）。
 * [②U5] 「连接父文献…/管理人工连线…」双入口随人工父对话框退役删除（画线
 * 工具+线身右键菜单替代）。透明遮罩点击关闭（ESC 关闭归 Dialog 域——菜单
 * 轻量面不挂键盘）。所有动作只上抛回调——写路径收口在 Board→store。
 * [F-LGRAPH-01②U8] ref 参考连接入口随综述边体系退役删除（mockup §3.8
 * 行 6）；kind 收敛后 tree/manual 入边区分消解——父边=首条入边、管理面对
 * 其余入边（菜单域重设计归轮 2 卡菜单域，本批最小重整）。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'

export interface LineageNodeMenuProps {
  node: LineageNode
  /** 该节点现有父边（首条入边）——无则「删除父连线」不呈现 */
  parentEdge: LineageEdge | null
  anchor: { x: number; y: number }
  onClose(): void
  onLinkTo(nodeId: string): void
  onReparent(nodeId: string): void
  onEditIdea(nodeId: string): void
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
        {/* [②U5/§3.6] 菜单标题行=目标标识（右键反馈④——卡「题名」● 命中） */}
        <div className="px-3 py-1 text-[10px] tracking-wide" style={{ color: 'var(--faint)' }} data-testid="node-menu-title">
          {`卡「${node.title}」● 命中`}
        </div>
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkTo(node.id)}>
          连线到…
        </button>
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onReparent(node.id)}>
          改父…
        </button>
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onEditIdea(node.id)}>
          编辑核心想法
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
