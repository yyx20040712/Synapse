/**
 * [F-DELCONF-01] useFolderDelete —— 文件夹删除流（FolderFilter 拆件：删除
 * 预检/静默判据/分流逻辑独立，组件文件 250 行红线）。 FolderDeleteDialog
 * 保留弹窗形态零改（本件只管「要不要弹」的分流）。
 *
 * ── 行为层 ──
 * - 静默判据（用户裁决 2026-09-30，v90 §4 第 5 条）：保护资产=脉络图唯一
 *   （edgeCount/nodeCount——摆位/月槽不视为资产，自动重派低成本）。
 *   nodeCount=0 ∧ edgeCount=0 →静默直删（不弹窗）；paperCount 不参与
 *   （文献仅移「未归档」可寻回）
 * - 有资产（nodeCount>0 ∨ edgeCount>0）→上抛 onHasAssets 由宿主挂
 *   FolderDeleteDialog（现状保护弹窗）
 * - fail-closed：lineage.graph 预检失败（含超时/异常）→不删不弹，动作型
 *   error toast（域错误 ApiClientError.message 透传+意外异常中文兜底）
 * - busy：双异步（预检+删除）全程 ref 守卫防同批双击（useBusyGuard pending
 *   ref 同型——菜单点击即关，无持续 busy 挂载面故不持 state）
 * - 成功收口 handleDeleted（FolderDeleteDialog onDone 同一语义：reload+
 *   被删文件夹=当前筛选态→回退全部+onMutated）
 *
 * ── 接口层 ──
 * - export function useFolderDeleteFlow(props): {
 *     requestDelete(folder: Folder): Promise<void>
 *     handleDeleted(deletedId: string): void
 *   }
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 写路径=api 直调（unwrap+toast——folders 域无 store 先例同族）；scope
 *   闭包捕获与 FolderDeleteDialog onDone 同型（挂载时捕获当次筛选态）
 */
import { useRef } from 'react'
import type { Folder } from '@shared/models/folder'
import type { LibraryQuery } from '@shared/models/paper'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'

/** 预检失败兜底（fail-closed——不删不弹，动作型告知） */
const FOLDER_PRECHECK_FAILED = '无法确认文件夹脉络图，已取消删除'
/** 静默删除失败兜底（FolderDialogs FOLDER_WRITE_FAILED 同范式异串——彼件
 * 零改，同名同值跨文件触发 dup-constants 红层故语义收紧为删除面文案） */
const FOLDER_DELETE_FAILED = '删除文件夹失败'

export function useFolderDeleteFlow(props: {
  scope: LibraryQuery['folderScope']
  onChange(patch: Partial<LibraryQuery>): void
  onMutated(): void
  reload(): Promise<void>
  /** 有保护资产→宿主挂 FolderDeleteDialog */
  onHasAssets(folder: Folder): void
}): { requestDelete(folder: Folder): Promise<void>; handleDeleted(deletedId: string): void } {
  const { scope, onChange, onMutated, reload, onHasAssets } = props
  const deletingRef = useRef(false)

  /** 删除成功收口（弹窗确认路径与静默路径同一语义） */
  function handleDeleted(deletedId: string): void {
    void reload()
    if (scope?.kind === 'folder' && scope.folderId === deletedId) {
      onChange({ folderScope: undefined })
    }
    onMutated()
  }

  async function requestDelete(folder: Folder): Promise<void> {
    if (deletingRef.current) return
    deletingRef.current = true
    let silent: boolean
    try {
      const graph = await unwrap(api.lineage.graph({ folderId: folder.id }))
      silent = graph.nodes.length === 0 && graph.edges.length === 0
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : FOLDER_PRECHECK_FAILED, 'error')
      deletingRef.current = false
      return
    }
    if (!silent) {
      deletingRef.current = false
      onHasAssets(folder)
      return
    }
    try {
      await unwrap(api.folders.delete({ id: folder.id }))
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : FOLDER_DELETE_FAILED, 'error')
      deletingRef.current = false
      return
    }
    deletingRef.current = false
    handleDeleted(folder.id)
  }

  return { requestDelete, handleDeleted }
}
