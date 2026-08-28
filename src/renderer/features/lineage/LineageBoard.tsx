// b3: P7-H
/**
 * LineageBoard —— 脉络图交互编辑+自动保存+退出聚合
 *
 * ── 行为层 ──
 * - 交互编辑面（ADR-0014：手工拖拽位置/加删边/改父+改 core_idea）：
 *   **节点拖拽**=写 x/y 覆盖（JSON Canvas 模式——拖拽落点存库，重置
 *   自动布局=清空 x/y 的按钮动作）；**加节点**两型（从文献库添加=
 *   搜索选取 paper 建节点（paperId 绑定+title/year 取元数据默认可改）/
 *   添加主题节点=纯手工 title——「阶段分组」语义）；**加边**=源节点
 *   菜单「连线到…」目标选取；**删边/删节点**=节点菜单；**改父**=既有
 *   子边删除+新边添加两动作组合（UI 呈现单操作，service 两调用——
 *   树约束下改父=换父）；core_idea 编辑=textarea（负面清单红线——
 *   md 只展示不渲染同族）
 * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三
 *   拒绝路径=动作型 toast 中文 reason（**树守卫宿主=LG-01 service
 *   upsertEdge 运行时守卫**（门一 W1 闭合）——本单零守卫代码只接
 *   toast 呈现=双保险同 08 按钮禁用语义）；拒绝用例消费方级断言
 * - **自动保存**（ADR-0014「保存语义对齐标注/笔记」——**INV-04 同型
 *   不新立号**）：autosave-first（编辑动作即经写通道落库，无「保存」
 *   按钮）；失败不推进 savedAt+脏态投影（lineage.store 保存态三态：
 *   saved/saving/error+重试——notes.store save-status 先例族）；写
 *   面=**LG-01 已交付 service 四写方法（含守卫），本单接线 IPC 四
 *   通道**（lineage/upsert-node 等——[locked-change] 扩 schemas/
 *   api-surface：契约扩展非放宽，十一域穷举不变）
 * - **退出拦截聚合面扩**（ADR-0014 接缝条款：图视图工单自带，**不动
 *   TABS-04 已冻结行为面**）：lineage.store 导出 dirty 布尔（保存态≠
 *   saved 即脏）；App.tsx 退出判定=useTabDirtyAggregate() ||
 *   useLineageDirty()（组合根单点扩——tab-dirty.ts **行为面零触碰**，
 *   仅其头注 :14「（TABS-04 的 dirty 输入）」stale 声明行随单更新为
 *   「tabs∪lineage」——注释级非行为；**接缝双向锚定两文件=lineage.
 *   store.ts+App.tsx（门一 N3 指名）+tab-dirty.ts stale 行三方**）；
 *   **INV-22 行随本单扩面**（renderer 聚合信号构成=tab dirty ∪
 *   lineage dirty——invariants.md 登记行扩写，门一 N2）
 * - **改父部分失败语义（门一 N5）**：改父=删旧边+加新边两 service 调用
 *   非原子——删成功+加失败=节点暂无父（**合法中间态**：森林语义兜底
 *   无数据丢失）；呈现=error 保存态+toast 指明「旧连线已移除，新连线
 *   未建立」+重试按钮重发加边（或用户手动重连）——不静默回滚不假报成功
 * - 状态机（编辑动作×保存态，宪法前置）：edit→saving→saved（正常）/
 *   edit→saving→error（失败：脏保持+toast+重试按钮——**禁本地乐观
 *   覆盖 savedAt**）/error→retry→saving（恢复）；跨格序列：连续编辑
 *   中保存失败→后续编辑不丢（动作排队=最后写胜出，stale-guard 请求
 *   序号 INV-03 同族）——全量迁移表见 lineage.store.ts 头注（写面
 *   单源在此）
 *
 * ── 接口层 ──
 * - export function LineageBoard(props: { onSelectNode(id: string |
 *     null): void; selectedNodeId?: string | null }): JSX.Element
 *   （选择上抛=04 侧板消费面；本实现为 LG-03 交付）
 *
 * ── 架构层 ──
 * - renderer/features/lineage 域内聚（Board 编辑层与 Canvas 渲染层
 *   分文件——组件 ≤250 行红线拆分预案：节点菜单/添加节点对话框子
 *   组件化=LineageNodeMenu/LineageAddNodeDialog/LineageEditIdeaDialog
 *   三件）；依赖 window.api 写四通道+02 交付（layout/canvas/store）；
 *   禁直调 ipc/禁 Node API
 *
 * ── 生命周期层 ──
 * - 预留：批量撤销（v1 无 undo——标注 undo 栈 UNDO-01 不同域不混）；
 *   多选批量操作；重置自动布局（清 x/y 按钮动作）
 * - 不做：DAG 多父编辑（v2 升版条件）；协作/云同步（负面清单）；
 *   md 渲染（textarea 级）
 *
 * ── 文化层 ──
 * - 错误：写失败=动作型 toast+error 保存态+重试（INV-02）；树拒绝三
 *   路径=动作型 toast；读面沿用 02 store.error；禁静默吞错
 * - 实现注（LG-03 交付）：写路径/保存态/dirty 全收口 lineage.store
 *   （Board 只编排交互与呈现）；树拒绝 toast 由 store flush 按
 *   CONFLICT 折叠码分支（守卫宿主=service——reason 透传链=
 *   LineageDomainError→toAppError→ApiClientError.code）；导入草稿入口
 *   =工具栏按钮（回炉 1 轮主控裁决①——LG-01 票面「确认对话框『导入将
 *   替换现有脉络图』」条款兑现，动作体拆 lineage-import.ts——组件行数
 *   红线拆分预案落点：confirm→lineage/import→成功计数 toast+graph
 *   刷新；校验失败=汇总计数+首条明细 toast；取消=轻量反馈无操作）
 */
import { useState } from 'react'
import { useLineageStore } from './lineage.store'
import { importLineageDraft } from './lineage-import'
import { LineageCanvas } from './LineageCanvas'
import { LineageNodeMenu } from './LineageNodeMenu'
import { LineageAddNodeDialog } from './LineageAddNodeDialog'
import { LineageEditIdeaDialog } from './LineageEditIdeaDialog'
import type { LineageNode } from '@shared/models/lineage'

/** 目标选取模式（源节点菜单发起：「连线到…」/「改父…」） */
interface PendingLink {
  source: string
  mode: 'link' | 'reparent'
}

const MODE_HINT: Record<PendingLink['mode'], string> = {
  link: '连线模式：点击目标节点（源 → 目标，目标成为子节点）',
  reparent: '改父模式：点击新父节点'
}

export function LineageBoard(props: {
  onSelectNode(id: string | null): void
  selectedNodeId?: string | null
}): JSX.Element {
  const nodes = useLineageStore((s) => s.nodes)
  const edges = useLineageStore((s) => s.edges)
  const saveStatus = useLineageStore((s) => s.saveStatus)
  const lastWriteError = useLineageStore((s) => s.lastWriteError)
  const store = useLineageStore.getState

  const [menu, setMenu] = useState<{ node: LineageNode; anchor: { x: number; y: number } } | null>(null)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [ideaNodeId, setIdeaNodeId] = useState<string | null>(null)

  const menuParentEdge =
    menu === null ? null : edges.find((e) => e.toNode === menu.node.id) ?? null
  const ideaNode = ideaNodeId === null ? null : nodes.find((n) => n.id === ideaNodeId) ?? null

  const handleNodeClick = (nodeId: string): void => {
    if (pendingLink !== null) {
      if (pendingLink.mode === 'link') store().linkNodes(pendingLink.source, nodeId)
      else store().reparentNode(pendingLink.source, nodeId)
      setPendingLink(null)
      return
    }
    props.onSelectNode(nodeId)
  }

  return (
    <div className="relative h-full">
      {/* 工具条：添加节点入口+保存态指示（autosave-first——无「保存」按钮） */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
        <button
          type="button"
          data-testid="lineage-add-node"
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          onClick={() => setAddOpen(true)}
        >
          添加节点
        </button>
        <button
          type="button"
          data-testid="lineage-import"
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          onClick={importLineageDraft}
        >
          导入草稿
        </button>
        {saveStatus === 'saving' && (
          <span className="rounded px-2 py-1 text-xs" style={{ background: 'var(--panel)', color: 'var(--text-dim)' }} data-testid="lineage-save-status">
            保存中…
          </span>
        )}
        {saveStatus === 'error' && (
          <span
            className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
            role="alert"
            style={{ borderColor: 'var(--danger)', background: 'var(--panel)', color: 'var(--danger)' }}
            data-testid="lineage-save-status"
          >
            保存失败：{lastWriteError}
            <button
              type="button"
              data-testid="lineage-retry-save"
              className="rounded px-1.5 py-0.5"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              onClick={() => store().retrySave()}
            >
              重试
            </button>
          </span>
        )}
      </div>

      {/* 目标选取模式提示条（连线到…/改父…激活期） */}
      {pendingLink !== null && (
        <div
          className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--accent)', background: 'var(--panel)', color: 'var(--accent)' }}
          data-testid="lineage-pending-link"
        >
          <span>{MODE_HINT[pendingLink.mode]}</span>
          <button type="button" className="underline" onClick={() => setPendingLink(null)}>
            取消
          </button>
        </div>
      )}

      <LineageCanvas
        nodes={nodes}
        edges={edges}
        selectedNodeId={props.selectedNodeId ?? null}
        onNodeDrag={(id, x, y) => store().moveNode(id, x, y)}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={(id, anchor) => {
          const node = nodes.find((n) => n.id === id)
          if (node !== undefined) setMenu({ node, anchor })
        }}
      />

      {menu !== null && (
        <LineageNodeMenu
          node={menu.node}
          parentEdge={menuParentEdge}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onLinkTo={(id) => { setPendingLink({ source: id, mode: 'link' }); setMenu(null) }}
          onReparent={(id) => { setPendingLink({ source: id, mode: 'reparent' }); setMenu(null) }}
          onEditIdea={(id) => { setIdeaNodeId(id); setMenu(null) }}
          onRemoveParentEdge={(edgeId) => { store().removeEdge(edgeId); setMenu(null) }}
          onRemoveNode={(id) => { store().removeNode(id); setMenu(null) }}
        />
      )}

      <LineageAddNodeDialog
        open={addOpen}
        existingPaperIds={nodes.map((n) => n.paperId).filter((p): p is string => p !== null)}
        onClose={() => setAddOpen(false)}
        onAddPaper={(p) => store().addPaperNode(p)}
        onAddTheme={(t) => store().addThemeNode(t)}
      />

      {ideaNode !== null && (
        <LineageEditIdeaDialog
          key={ideaNode.id}
          open
          node={ideaNode}
          onClose={() => setIdeaNodeId(null)}
          onSave={(id, idea) => store().editCoreIdea(id, idea)}
        />
      )}
    </div>
  )
}
