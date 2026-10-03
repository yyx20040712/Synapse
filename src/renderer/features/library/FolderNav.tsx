/**
 * [F-UIRES-01 批 A] FolderNav —— 左栏资源管理器导航（FolderFilter 退役承接
 * 件，设计稿 §2.1/§2.2+§3.1；mockup .fnav 逐值）。拆件：FolderNavRows.tsx
 * （列表段渲染——250 行红线 R9 预案）+useFolderDrop.ts（拖放目标逻辑）。
 *
 * ── 行为层 ──（详注释契约见拆件 FolderNavRows/useFolderDrop 头）
 * - 三态导航行+计数域独立（RR1-2：全部=Σ+未归档独立查询/未归档=独立查询/
 *   文件夹=paperCount）+引导态隐藏面（INV-87）；
 *   右键三件=行内重命名（三键+F2+双击等价——批 α 2026-10-03 用户裁决翻转）
 *   /静默判据删除/P-8 脉络跳转；
 *   CONFLICT→toast+保留输入；行内编辑×folders.changed=输入保留；busy 禁用
 *   清单（§2.1）；folders.changed 双失效+选中夹消失回退（刷新落定后判）
 *
 * ── 接口层 ──
 * - export function FolderNav(props: { query; onChange; onMutated; guideHidden? })
 *
 * ── 架构层 ──
 * - folders.list 自取；写路径 api 直调；计数=api.library 独立查询（RR1-2——零 store 消费）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/folder-nav.test.tsx
 */
import { useEffect, useRef, useState } from 'react'
import type { Folder } from '@shared/models/folder'
import type { LibraryQuery } from '@shared/models/paper'
import { api, unwrap, apiEvents } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { requestOpenLineage } from '../../shared/open-lineage-bus'
import { FolderDeleteDialog } from './FolderDialogs'
import { FolderMenu } from './FolderMenu'
import { FolderNavRows } from './FolderNavRows'
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
  /** [INV-87] 引导态（App isGuideState 注入）——隐藏未归档/分隔线/列表/新建 */
  guideHidden?: boolean
}): JSX.Element {
  const { query, onChange, onMutated } = props
  const guideHidden = props.guideHidden ?? false
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])
  // [RR1-2/k2-B1] 计数域独立：未归档数经独立计数查询（limit:1 只取 total）——
  // 与列表查询态解耦（folder 态选中下计数不随查询命中数漂移/负数钳 0 失真根除）
  const { data: unfiledTotal, run: loadUnfiledCount } = useAsync(
    () => unwrap(api.library.list({ folderScope: { kind: 'unfiled' }, limit: 1 })),
    []
  )
  const importBusy = useImportBusyStore((s) => s.busy)
  const dndOver = useLibraryDnd((s) => s.over)
  const { rowDragOver, rowDragLeave, rowDrop, navDragOver, navDrop } = useFolderDrop(folders)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Folder | null>(null)

  // 受控筛选态现值镜像（useFolderDelete W2：落定回退按最新筛选态判定）
  const scopeRef = useRef(query.folderScope)
  scopeRef.current = query.folderScope
  const { requestDelete, handleDeleted } = useFolderDeleteFlow({
    getScope: () => scopeRef.current,
    onChange,
    onMutated,
    reload: loadFolders,
    onHasAssets: (f) => setDeleteDialog(f)
  })

  useEffect(() => {
    void loadFolders()
    void loadUnfiledCount()
  }, [loadFolders, loadUnfiledCount])

  // folders.changed 双失效消费（首拉不触发 onMutated——changedRef 区分）；
  // 计数面同沿刷新（moveFolder/删除/新建全走 folders.changed 广播）
  const changedRef = useRef(false)
  useEffect(
    () =>
      apiEvents.onFoldersChanged(() => {
        changedRef.current = true
        void loadFolders()
        void loadUnfiledCount()
      }),
    [loadFolders, loadUnfiledCount]
  )
  useEffect(() => {
    if (folders === null || !changedRef.current) return
    changedRef.current = false
    const scopeNow = query.folderScope
    if (
      scopeNow?.kind === 'folder' &&
      !folders.some((f) => f.id === (scopeNow.kind === 'folder' ? scopeNow.folderId : ''))
    ) {
      // 选中文件夹消失（并发删除）→回退全部文献（死 folderId 空列表窗防线）
      onChange({ folderScope: undefined })
    }
    onMutated()
  }, [folders])

  // [RR1] 行内编辑流拆件（新建/重命名/提交门/在途守卫——useFolderNavEdit）
  const edit = useFolderNavEdit({
    onMutated,
    reloadFolders: loadFolders,
    reloadUnfiledCount: loadUnfiledCount
  })

  const scope = query.folderScope
  const isAll = scope === undefined || scope.kind === 'all'
  const folderCountSum = (folders ?? []).reduce((acc, f) => acc + f.paperCount, 0)
  // [RR1-2] 全部文献=Σ folders.paperCount（含主图行）+未归档数；未归档=独立查询
  const unfiledCount = unfiledTotal?.total ?? 0
  const allCount = folderCountSum + unfiledCount

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
          unfiledCount={unfiledCount}
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
          onClose={() => setDeleteDialog(null)}
          onDone={handleDeleted}
        />
      )}
    </nav>
  )
}
