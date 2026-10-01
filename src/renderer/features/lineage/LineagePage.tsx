// b3: P7-H
/**
 * [LG-02] LineagePage —— 「脉络」顶层视图宿主（E4）。
 *
 * 行为：挂载经 lineage.store.load() 取数（lineage/graph 单点——接缝
 * 双向锚定：本行+lineage.store 头注；03 编辑层/04 侧板同经 store 消费
 * **禁双取**）；三态呈现（门一 N6）：loading/error/ready（空图空态在画布内）。
 * 编排（LG-03 接入）：selectedNodeId 驻本页 state——Board 的 onSelectNode
 * 上抛落此（04 侧板 LineageSidePanel 消费）。
 *
 * ── F-LGRAPH-01①U4 编排重构（顶栏并集切换器退役行 1）──
 * - 顶栏=LineageModeBar（三模式分段+图名 mono 小字——图名=folders 单源经
 *   NavGraphPicker 上抛 folders 派生）；左侧=LineageNavPane（Word 导航窗格
 *   兼任图/文件夹切换——S2/S3/S4 语义迁驻）。
 * - 缺省图=库页文件夹上下文同步（mockup §3.2：进哪个文件夹开哪张图；
 *   未选=主图——挂载时读 library.store query.folderScope，接缝双向锚定
 *   两 store 头注：lineage.store+library.store）。
 * - 「该文件夹无脉络图」空态提示保留（顶栏紧邻模式栏——executor 定位申报）。
 * - 跳转接缝三方头注锚定（回炉 R10 回锚）：本页+LineageSidePanel+open-paper-
 *   bus（阅读器消费侧=open-paper-anchor.ts）——SidePanel/bus 两头注仍指本页，
 *   本页头注随 U4 重写曾失锚，本行恢复三方互指闭环。
 */
import { useEffect, useState } from 'react'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { requestOpenPaperAnchored } from '../../shared/open-paper-bus'
import { useLibraryStore } from '../library/library.store'
import { useLineageStore } from './lineage.store'
import { LineageBoard } from './LineageBoard'
import { LineageModeBar } from './LineageModeBar'
import { LineageNavPane } from './LineageNavPane'
import type { NavFolder } from './nav-graph-picker'
import { LineageSidePanel } from './LineageSidePanel'
import { isCore } from './lineage-classify'

export function LineagePage(): JSX.Element {
  const status = useLineageStore((s) => s.status)
  const error = useLineageStore((s) => s.error)
  const load = useLineageStore((s) => s.load)
  // [F-LGRAPH-01①U4] 图作用域+节点计数（空态提示消费面）+folders 图名链
  const folderId = useLineageStore((s) => s.folderId)
  const nodeCount = useLineageStore((s) => s.nodes.length)
  const [folders, setFolders] = useState<NavFolder[] | null>(null)
  // 选中节点 id（04 侧板数据源——Board 上抛落此，store 查找分发在下行 selector）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = useLineageStore((s) => s.nodes.find((n) => n.id === selectedNodeId) ?? null)
  // [T3-P8] 侧板徽章分发单源：骑缝编号（INV-76 全图一次）+核心档+含金量摘要
  const edges = useLineageStore((s) => s.edges)
  const paperMetrics = useLineageStore((s) => s.paperMetrics)
  // [F-FOLDER-01] 侧板徽章=该文献 pubNo（库级同源 INV-92——catalogNo 退役）
  const pubNos = useLineageStore((s) => s.pubNos)
  const selCore = selectedNode !== null && isCore(selectedNode, edges)
  const selMetrics =
    selectedNode !== null && selectedNode.paperId !== null
      ? (paperMetrics[selectedNode.paperId] ?? null)
      : null

  useEffect(() => {
    // 缺省图=库页文件夹上下文同步（进哪个文件夹开哪张图；未选=主图）——
    // setFolder 内含重取（挂载取数单点）；图名兜底=主图（folders 未落定期）
    const scope = useLibraryStore.getState().query.folderScope
    useLineageStore.getState().setFolder(
      scope?.kind === 'folder' ? scope.folderId : MAIN_GRAPH_ID
    )
  }, [])

  /** 侧板跳转上抛→总线发送（payload 构造在 SidePanel，本页只转发归一） */
  const handleJumpToPaper = (payload: {
    paperId: string
    anchor?: { quoteText: string; prefixText: string; suffixText: string; anchorPage: number | null }
    aiNoteId?: string
  }): void => {
    requestOpenPaperAnchored({
      paperId: payload.paperId,
      anchor:
        payload.anchor === undefined
          ? undefined
          : { ...payload.anchor, anchorPage: payload.anchor.anchorPage ?? undefined },
      aiNoteId: payload.aiNoteId
    })
  }

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm" style={{ color: 'var(--text-dim)' }}>
        正在加载脉络图…
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          className="flex items-center gap-3 rounded border px-4 py-3 text-xs"
          role="alert"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>脉络图加载失败：{error}</span>
          <button
            type="button"
            className="rounded px-2 py-1"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={() => void load()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }
  const graphName = folders?.find((f) => f.id === folderId)?.name ?? '主图'
  return (
    <div className="flex h-full flex-col">
      {/* [F-LGRAPH-01①U4] 顶栏=模式栏（图名随 folders 单源）+空图提示：folder
          选中且子图空=「该文件夹无脉络图」（区别于时间线通用空态——含
          「未选中文件夹」语境；主图空图不提示——bootstrap 添加节点路径） */}
      <div className="flex items-center gap-3 px-2 pt-2">
        <LineageModeBar graphName={graphName} />
        {folderId !== MAIN_GRAPH_ID && nodeCount === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            该文件夹无脉络图
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 gap-1 p-1">
        <LineageNavPane onFoldersChange={setFolders} />
        <div className="min-w-0 flex-1">
          <LineageBoard onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
        </div>
        {/* R2-LG11：白玻璃底/描边/圆角归 LineageSidePanel 根——aside 只留
            尺寸直通（接线零动，纯容器样式归并） */}
        <aside className="w-72 shrink-0 overflow-hidden">
          <LineageSidePanel
            node={selectedNode}
            onJumpToPaper={handleJumpToPaper}
            onSetTags={(id, tags) => useLineageStore.getState().setNodeTags(id, tags)}
            pubNo={
              selectedNode !== null && selectedNode.paperId !== null
                ? (pubNos[selectedNode.paperId] ?? null)
                : null
            }
            core={selCore}
            metrics={selMetrics}
          />
        </aside>
      </div>
    </div>
  )
}
