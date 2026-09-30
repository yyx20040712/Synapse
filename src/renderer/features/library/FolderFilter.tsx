/**
 * [F-FOLDER-02·A] FolderFilter —— FilterBar 文件夹区（重制件：旧「按文件夹
 * 筛选」下拉已退役删除——方案切换=删除旧方案）。chip 范式复用 TagFilter
 * 视觉族（.lib-chip 胶囊+mono ×N 计数，library.css 既有皮肤零改）。
 *
 * ── 行为层 ──
 * - 三态 chip（folderScope 判别联合——W5）：「全部文献」（清 undefined）/
 *   「未归档」（{kind:'unfiled'}——F4：自持标签不再回落「全部分类」）/
 *   各文件夹（{kind:'folder',folderId}，含 paperCount 徽标）；单选语义
 *   （点按即置态；全部文献=清除面）
 * - 行内操作：文件夹 chip 右键→菜单（重命名/删除——TagLifecycleMenu 同型
 *   fixed 锚点+遮罩关闭）；删除先经 lineage.graph 静默判据（F-DELCONF-01①：
 *   空图直删不弹窗，有节点/连线才走 FolderDeleteDialog 保护弹窗，预检失败
 *   fail-closed 不删不弹）
 * - 新建：行尾「+ 新建文件夹」chip→内联输入；Enter 提交（isComposing 守卫）
 *   /Esc 取消；重名 CONFLICT 域错误中文 toast
 * - 联动：folders.changed→重拉 folders.list+library 重载（onMutated）+
 *   选中文件夹消失→筛选回退全部（TagFilter disappearedId 顺序契约同族）
 * - S2：导入 busy（shared/import-busy.store）→chip 与新建入口禁用
 *
 * ── 接口层 ──
 * - export function FolderFilter(props: { query: LibraryQuery;
 *     onChange(patch: Partial<LibraryQuery>): void; onMutated(): void })
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - folders.list 自取（useAsync 静态参考数据先例=FilterBar collections）；
 *   写路径=api 直调（域无 store）；对话框拆件 FolderDialogs.tsx（组件 250
 *   行红线拆分预案）
 */
import { useEffect, useRef, useState } from 'react'
import type { Folder } from '@shared/models/folder'
import type { LibraryQuery } from '@shared/models/paper'
import { api, unwrap, ApiClientError, apiEvents } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { showToast } from '../../shared/ui/Toast'
import { FolderRenameDialog, FolderDeleteDialog } from './FolderDialogs'
import { FolderMenu } from './FolderMenu'
import { useFolderDeleteFlow } from './useFolderDelete'

/** 意外异常兜底中文 */
const FOLDER_CREATE_FAILED = '新建文件夹失败'

interface MenuState {
  folder: Folder
  anchor: { x: number; y: number }
}
interface DialogState {
  kind: 'rename' | 'delete'
  folder: Folder
}

export function FolderFilter(props: {
  query: LibraryQuery
  onChange: (patch: Partial<LibraryQuery>) => void
  /** 文件夹域变更后上抛（FilterBar 注入 library load——计数/列表联动） */
  onMutated: () => void
}): JSX.Element | null {
  const { query, onChange, onMutated } = props
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])
  const importBusy = useImportBusyStore((s) => s.busy)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [creating, setCreating] = useState(false)
  // F-DELCONF-01① 删除流拆件（组件 250 行红线）：静默判据/分流/收口在
  // useFolderDelete——空图直删，有资产经 onHasAssets 挂 FolderDeleteDialog。
  // [W2 回炉] 筛选态现值注入：本组件受控（props query=store 投影单源），
  // 每渲染同步 scopeRef——删除落定时 hook 经 getScope() 读最新筛选态判定
  // 回退，消除旧闭包误清（在途切筛选后落定不再把新筛选踢回「全部」）
  const scopeRef = useRef(query.folderScope)
  scopeRef.current = query.folderScope
  const { requestDelete, handleDeleted } = useFolderDeleteFlow({
    getScope: () => scopeRef.current,
    onChange,
    onMutated,
    reload: loadFolders,
    onHasAssets: (f) => setDialog({ kind: 'delete', folder: f })
  })

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  // 双失效通知消费：他页（脉络页/移动链/本页删除对话框）文件夹变更→重拉+
  // library 重载；changedRef 区分事件后刷新与首拉（首拉不触发重载——防挂载
  // 双取）；回退判定在刷新落定后（旧列表仍含被删行，即刻判恒不中）
  const changedRef = useRef(false)
  useEffect(
    () =>
      apiEvents.onFoldersChanged(() => {
        changedRef.current = true
        void loadFolders()
      }),
    [loadFolders]
  )
  useEffect(() => {
    if (folders === null || !changedRef.current) return
    changedRef.current = false
    const scopeNow = query.folderScope
    if (
      scopeNow?.kind === 'folder' &&
      !folders.some((f) => f.id === (scopeNow.kind === 'folder' ? scopeNow.folderId : ''))
    ) {
      // 选中文件夹消失（删除级联）→先回退筛选（死 folderId 查询空列表窗——
      // TagFilter 死 id 顺序契约同族）后重载
      onChange({ folderScope: undefined })
    }
    onMutated()
  }, [folders])

  async function createFolder(name: string): Promise<void> {
    const trimmed = name.trim()
    if (trimmed === '') {
      showToast('文件夹名不能为空', 'info')
      return
    }
    try {
      await unwrap(api.folders.create({ name: trimmed }))
      setCreating(false)
      await loadFolders()
      onMutated()
    } catch (e) {
      // CONFLICT「文件夹名已被占用」等域错误中文原文透传
      showToast(e instanceof ApiClientError ? e.message : FOLDER_CREATE_FAILED, 'error')
    }
  }

  if (folders === null) {
    return null
  }

  const scope = query.folderScope
  const isAll = scope === undefined || scope.kind === 'all'
  const isUnfiled = scope?.kind === 'unfiled'

  const chipCls = (active: boolean): string => `lib-chip${active ? ' lib-chip-on' : ''}`

  return (
    <div className="lib-chips" role="group" aria-label="文件夹筛选">
      <button
        type="button"
        aria-pressed={isAll}
        className={chipCls(isAll)}
        disabled={importBusy}
        onClick={() => onChange({ folderScope: undefined })}
      >
        全部文献
      </button>
      <button
        type="button"
        aria-pressed={isUnfiled}
        className={chipCls(isUnfiled)}
        disabled={importBusy}
        onClick={() => onChange({ folderScope: { kind: 'unfiled' } })}
      >
        未归档
      </button>
      {folders.map((f) => {
        const active = scope?.kind === 'folder' && scope.folderId === f.id
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={active}
            className={chipCls(active)}
            disabled={importBusy}
            onClick={() => onChange({ folderScope: { kind: 'folder', folderId: f.id } })}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu({ folder: f, anchor: { x: e.clientX, y: e.clientY } })
            }}
          >
            {f.name} <span className="lib-chip-n">{`×${f.paperCount}`}</span>
          </button>
        )
      })}
      {creating ? (
        <input
          aria-label="新文件夹名"
          className="rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--accent)', background: 'var(--bg)', width: '8rem' }}
          autoFocus
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') {
              const v = (e.target as HTMLInputElement).value
              void createFolder(v)
            }
            if (e.key === 'Escape') setCreating(false)
          }}
        />
      ) : (
        <button
          type="button"
          className="lib-chip"
          disabled={importBusy}
          onClick={() => setCreating(true)}
        >
          + 新建文件夹
        </button>
      )}

      {menu !== null && (
        <FolderMenu
          folder={menu.folder}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onRename={(f) => {
            setDialog({ kind: 'rename', folder: f })
            setMenu(null)
          }}
          onDelete={(f) => {
            setMenu(null)
            void requestDelete(f)
          }}
        />
      )}

      {dialog?.kind === 'rename' && (
        <FolderRenameDialog
          key={dialog.folder.id}
          folder={dialog.folder}
          onClose={() => setDialog(null)}
          onDone={() => {
            void loadFolders()
            onMutated()
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <FolderDeleteDialog
          key={dialog.folder.id}
          folder={dialog.folder}
          onClose={() => setDialog(null)}
          onDone={handleDeleted}
        />
      )}
    </div>
  )
}
