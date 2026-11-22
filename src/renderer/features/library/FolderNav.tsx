/**
 * [F-UIRES-01 批 A] FolderNav —— 左栏资源管理器导航（FolderFilter 退役承接
 * 件，设计稿 §2.1/§2.2+§3.1；mockup .fnav 逐值）。拆件：FolderNavRows.tsx
 * （列表段渲染——250 行红线 R9 预案）+useFolderDrop.ts（拖放目标逻辑）。
 *
 * ── 行为层 ──（详注释契约见拆件 FolderNavRows/useFolderDrop 头）
 * - 两态导航行+计数域独立（RR1-2：全部=Σ folders.paperCount（含主图行）/
 *   文件夹=paperCount——[F-ALIGN-01 D5] null 归属独立计数查询随 D5 退役）
 *   +引导态隐藏面（INV-87）；
 *   右键三件=行内重命名（三键+F2+双击等价——批 α 2026-10-03 用户裁决翻转）
 *   /静默判据删除/P-8 脉络跳转；
 *   CONFLICT→toast+保留输入；行内编辑×folders.changed=输入保留；busy 禁用
 *   清单（§2.1）；folders.changed 失效沿派生+选中夹消失回退（刷新落定后判）
 *
 * ── 接口层 ──
 * - export function FolderNav(props: { query; onChange; onMutated; guideHidden? })
 *
 * ── 架构层 ──
 * - 目录数据=folder-catalog.store 共享读面（B2①收口——folders.list 域内单飞
 *   单点）；写路径 api 直调（hook 内）；计数=folders.list 载荷单源（RR1-2）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/folder-nav.test.tsx
 */
import { useEffect, useRef, useState } from 'react'
import type { Folder } from '@shared/models/folder'
import type { LibraryQuery } from '@shared/models/paper'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { requestOpenLineage } from '../../shared/open-lineage-bus'
import { FolderDeleteDialog } from './FolderDialogs'
import { FolderMenu } from './FolderMenu'
import { FolderNavRows } from './FolderNavRows'
import { useFolderCatalog } from './folder-catalog.store'
import { useCascadeGuard } from './useCascadeGuard'
import { useFolderDeleteFlow } from './useFolderDelete'
import { useFolderNavEdit } from './useFolderNavEdit'
import { useFolderDrop } from './useFolderDrop'
import { useLibraryDnd } from './library-dnd.store'

interface MenuState {
  folder: Folder
  anchor: { x: number; y: number }
}

export function FolderNav(props: {
  query: LibraryQuery
  onChange: (patch: Partial<LibraryQuery>) => void
  /** 文件夹域变更后上抛（LibraryPage 注入 library load——计数/列表联动） */
  onMutated: () => void
  /** [INV-87] 引导态（App isGuideState 注入）——隐藏分隔线/列表/新建 */
  guideHidden?: boolean
}): JSX.Element {
  const { query, onChange, onMutated } = props
  const guideHidden = props.guideHidden ?? false
  // 共享目录读面（B2①收口——changed 订阅单点在 store；写路径收口链的 reload
  // 同走 catalog 单飞口）
  const { folders, invalidations, loading: catalogLoading, load: loadFolders } = useFolderCatalog()
  const catalogError = useFolderCatalog((s) => s.error)
  const importBusy = useImportBusyStore((s) => s.busy)
  const dndOver = useLibraryDnd((s) => s.over)
  const { rowDragOver, rowDragLeave, rowDrop, navDragOver, navDrop } = useFolderDrop(folders)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Folder | null>(null)

  // 受控筛选态现值镜像（useFolderDelete W2：落定回退按最新筛选态判定）；
  // [F-DBCAMP-01 U6] 级联两次确认=弹窗路径 onGate+静默路径 onSilentCascade
  //（第二窗/错误窗=cascade.dialog 挂载——LibraryPage 同型）
  const scopeRef = useRef(query.folderScope)
  scopeRef.current = query.folderScope
  const cascade = useCascadeGuard()
  const { requestDelete, handleDeleted } = useFolderDeleteFlow({
    getScope: () => scopeRef.current,
    onChange,
    onMutated,
    reload: loadFolders,
    onHasAssets: (f) => setDeleteDialog(f),
    onSilentCascade: (req) => cascade.runWithCascade(req)
  })

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  // folders.changed 派生语义（组件层保留——订阅收口在 store）：失效沿计数差
  // =changedRef 区分的等价物；首拉（seen=null）与自驱重载（新建/重命名/删除
  // 流 reload——计数不变）不触发 onMutated，仅失效沿落定后回退判别+联动
  //（计数面同沿刷新——moveFolder/删除/新建全走 folders.changed 广播）
  const seenInvRef = useRef<number | null>(null)
  useEffect(() => {
    if (catalogLoading || catalogError !== null || folders === null) return
    if (seenInvRef.current === null) {
      seenInvRef.current = invalidations
      return
    }
    if (invalidations === seenInvRef.current) return
    seenInvRef.current = invalidations
    const scope = query.folderScope
    if (scope?.kind === 'folder' && !folders.some((f) => f.id === scope.folderId)) {
      // 选中文件夹消失（并发删除）→回退全部文献（死 folderId 空列表窗防线）
      onChange({ folderScope: undefined })
    }
    onMutated()
  }, [folders, invalidations, catalogLoading, catalogError, onChange, onMutated, query.folderScope])

  // [RR1] 行内编辑流拆件（新建/重命名/提交门/在途守卫——useFolderNavEdit）
  const edit = useFolderNavEdit({
    onMutated,
    reloadFolders: loadFolders
  })

  const scope = query.folderScope
  const isAll = scope === undefined || scope.kind === 'all'
  // [RR1-2→F-ALIGN-01 D5] 全部文献=Σ folders.paperCount（含主图行）——计数
  // 载荷单源 folders.list（null 归属独立查询随 D5 退役删除）
  const allCount = (folders ?? []).reduce((acc, f) => acc + f.paperCount, 0)

  function openInLineageGraph(folderId: string): void {
    setMenu(null)
    onChange({ folderScope: { kind: 'folder', folderId } })
    requestOpenLineage()
  }

  return (
    <nav
      className="lib-fnav"
      aria-label="文件夹导航"
      onDragOver={navDragOver}
      onDrop={navDrop}
    >
      <div className="lib-fnav-head">
        文件夹
        {!guideHidden && <span className="lib-fnav-hint">右键：重命名 / 删除</span>}
      </div>
      <button
        type="button"
        className={`lib-fn-row${isAll ? ' sel' : ''}`}
        aria-current={isAll ? 'true' : undefined}
        disabled={importBusy}
        onClick={() => onChange({ folderScope: undefined })}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 10h16" />
        </svg>
        <span className="lib-fn-nm">全部文献</span>
        <span className="lib-fn-ct">{allCount}</span>
      </button>
      {!guideHidden && (
        <FolderNavRows
          folders={folders ?? []}
          scope={scope}
          importBusy={importBusy}
          renaming={edit.renaming}
          creating={edit.creating}
          dndOver={dndOver}
          setRenaming={edit.setRenaming}
          setCreating={edit.setCreating}
          openRenaming={edit.openRenaming}
          openCreating={edit.openCreating}
          submitCreate={edit.commitCreate}
          submitRename={edit.commitRename}
          skipBlur={edit.skipBlur}
          onChange={onChange}
          onFolderContextMenu={(f, pos) => setMenu({ folder: f, anchor: pos })}
          onRowDragOver={rowDragOver}
          onRowDragLeave={rowDragLeave}
          onRowDrop={rowDrop}
        />
      )}

      {menu !== null && (
        <FolderMenu
          folder={menu.folder}
          anchor={menu.anchor}
          busy={importBusy}
          onClose={() => setMenu(null)}
          onRename={(f) => {
            setMenu(null)
            edit.openRenaming({ folderId: f.id, value: f.name })
          }}
          onDelete={(f) => {
            setMenu(null)
            void requestDelete(f)
          }}
          onOpenLineage={(f) => openInLineageGraph(f.id)}
        />
      )}

      {deleteDialog !== null && (
        <FolderDeleteDialog
          key={deleteDialog.id}
          folder={deleteDialog}
          onGate={() => cascade.gate({ scope: 'folder', anchorId: deleteDialog.id })}
          onClose={() => setDeleteDialog(null)}
          onDone={handleDeleted}
        />
      )}
      {cascade.dialog}
    </nav>
  )
}
