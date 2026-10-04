/**
 * [SR-LIB-01→F-UIRES-01 批 A] LibraryPage —— 文献库页面（资源管理器形态：
 * 导入条→筛选行→FolderNav 224px+主区+抽屉 316px 三栏体）。
 *
 * ── 行为层 ──
 * - 组装文献库主视图（.lib-page 容器）：ImportDropZone（导入条）→ 筛选行
 *   （FilterBar）→ error 行 → .lib-body（左=FolderNav 224px 导航栏，中=表头+
 *   密度列表 flex-1，右=316px 规格表抽屉）
 * - 数据经 library.store（列表状态/筛选/选中）；页面自身无数据逻辑
 * - 挂载时拉取列表（useAsync + library.store.load()）；列表序号续页传
 *   query.offset（PaperRow ordinal 消费）
 * - [INV-87] guideHidden 由 App 组合根 isGuideState 注入（禁跨 feature import
 *   workspace.store——组合根 props 注入先例=StatusBar 哑件）→ FolderNav
 *   引导态隐藏面
 *
 * ── 接口层 ──
 * - export function LibraryPage(props: { guideHidden?: boolean }): JSX.Element
 *
 * ── 架构层 ──
 * - 只 import 本域组件与 store、shared/ui、shared/hooks、api/client；禁止 import 其他 features
 * - FilterBar/PaperDetailPanel 按冻结 props 契约接线（两者作为组合根跨域
 *   引用 notes/tags 子组件，见 check-quality 白名单）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 布局：FolderNav+列表+抽屉；测试见 tests/unit/renderer/folder-nav.test.tsx
 */
import { useEffect, useState } from 'react'
import type { PaperSummary } from '@shared/models/paper'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { RetryButton } from '../../shared/ui/RetryButton'
import { FilterBar } from './FilterBar'
import { FolderNav } from './FolderNav'
import { ImportDropZone } from './ImportDropZone'
import { LibraryDragGhost } from './LibraryDragGhost'
import { PaperDeleteDialog } from './PaperDeleteDialog'
import { PaperDetailPanel } from './PaperDetailPanel'
import { PaperList } from './PaperList'
import { PaperRowMenu } from './PaperRowMenu'
import { useLibraryDnd } from './library-dnd.store'
import { useLibraryStore } from './library.store'
import { movePaperToFolder } from './paper-move'
import { usePaperDeleteFlow, type PaperDeletePrompt } from './usePaperDelete'
// 文献库皮肤（lib-* 类挂载点——feature 树全件共享；T3-P3 核心域+
// [F-UIRES-01] 资源管理器形态域分域拆件=library-explorer.css[CSS 450 上限]）
import './library.css'
import './library-explorer.css'

export function LibraryPage(props: { guideHidden?: boolean }): JSX.Element {
  const papers = useLibraryStore((s) => s.papers)
  const query = useLibraryStore((s) => s.query)
  const selectedId = useLibraryStore((s) => s.selectedId)
  const loading = useLibraryStore((s) => s.loading)
  const error = useLibraryStore((s) => s.error)
  const load = useLibraryStore((s) => s.load)
  const setQuery = useLibraryStore((s) => s.setQuery)
  const selectPaper = useLibraryStore((s) => s.selectPaper)
  const openPaper = useLibraryStore((s) => s.openPaper)
  // [F-TAGS-01] 标签颜色映射（tags 域数据经 TagDropdown→FilterBar 上抛——
  // 跨域白名单墙下的合规通道；下发 PaperRow 徽标着色，INV-86 三面之三）
  const [tagColorByName, setTagColorByName] = useState<ReadonlyMap<string, string | null>>(
    () => new Map()
  )
  // [F-UIRES-01 U4] 行右键菜单态（命中行=按下即高亮）
  const [rowMenu, setRowMenu] = useState<{
    paper: PaperSummary
    anchor: { x: number; y: number }
  } | null>(null)
  // [F-UIRES-01 批 B] 删除流（预检分流 hook+保护弹窗态——FolderNav 挂
  // FolderDeleteDialog 宿主模式同型）
  const [deleteDialog, setDeleteDialog] = useState<PaperDeletePrompt | null>(null)
  const { requestDelete, handleDeleted } = usePaperDeleteFlow({
    onProtect: (p) => setDeleteDialog(p)
  })

  // 挂载即拉取（useAsync 是显式 run 语义，故在 effect 中手动触发一次）
  const { run } = useAsync(load, [load])
  useEffect(() => {
    void run()
  }, [run])

  // [F-UIRES-01 U4] busy 上升沿取消进行中拖拽（§2.5 N-2：高亮/ghost 即清）
  const importBusy = useImportBusyStore((s) => s.busy)
  useEffect(() => {
    if (importBusy && useLibraryDnd.getState().drag !== null) {
      useLibraryDnd.getState().end()
    }
  }, [importBusy])

  return (
    <div className="lib-page">
      {/* [RR1-1/d1-B1] 布局构图=设计稿 §3.1+mockup .frame 子序：FolderNav 与
          主区并列纵贯（顶带=导入条同高）；导入条/筛选行只横跨主区（右列内） */}
      <FolderNav
        query={query}
        onChange={setQuery}
        onMutated={() => void load()}
        guideHidden={props.guideHidden ?? false}
      />
      <div className="lib-main">
        {/* [F-UIRES-01 R2→F-ALIGN-01 D3] 导入目标恒定：folder 态=该夹；无筛选
            =主图（MAIN_GRAPH_ID——folders.list 真实行，main 侧单跳落夹建节点） */}
        <ImportDropZone
          onImported={() => void load()}
          targetFolderId={
            query.folderScope?.kind === 'folder' ? query.folderScope.folderId : MAIN_GRAPH_ID
          }
        />
        <FilterBar query={query} onChange={setQuery} onTagColorMap={setTagColorByName} />
        {error !== null && (
          <div
            className="mx-[18px] mb-2 flex items-center justify-between rounded border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            role="alert"
          >
            <span>{error}</span>
            {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton */}
            <RetryButton onClick={() => void load()} />
          </div>
        )}
        <div className="lib-body">
          <div className="lib-main-col">
          {loading && (
            <p className="px-1 py-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
              正在加载文献列表…
            </p>
          )}
            <PaperList
              papers={papers}
              offset={query.offset}
              selectedId={selectedId}
              onSelect={selectPaper}
              onOpen={openPaper}
              tagColorByName={tagColorByName}
              hitPaperId={rowMenu?.paper.id ?? null}
              onRowContextMenu={(paper, pos) => setRowMenu({ paper, anchor: pos })}
            />
          </div>
          <aside className="lib-drawer">
            <PaperDetailPanel paperId={selectedId} />
          </aside>
        </div>
      </div>
      {rowMenu !== null && (
        <PaperRowMenu
          paper={rowMenu.paper}
          anchor={rowMenu.anchor}
          onClose={() => setRowMenu(null)}
          onOpen={openPaper}
          onMove={(paperId, toFolderId) => void movePaperToFolder(paperId, toFolderId)}
          onDelete={(paperId) => void requestDelete(paperId)}
        />
      )}
      {deleteDialog !== null && (
        <PaperDeleteDialog
          key={deleteDialog.paperId}
          paperId={deleteDialog.paperId}
          graphName={deleteDialog.graphName}
          edgeCount={deleteDialog.edgeCount}
          onClose={() => setDeleteDialog(null)}
          onDone={handleDeleted}
        />
      )}
      <LibraryDragGhost />
    </div>
  )
}
