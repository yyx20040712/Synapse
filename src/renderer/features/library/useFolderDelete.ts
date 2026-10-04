/**
 * [F-DELCONF-01] useFolderDelete —— 文件夹删除流（FolderFilter 拆件起源；[F-UIRES-01] 宿主=FolderNav：删除
 * 预检/静默判据/分流逻辑独立，组件文件 250 行红线）。 FolderDeleteDialog
 * 保留弹窗形态零改（本件只管「要不要弹」的分流）。
 *
 * ── 行为层 ──
 * - 静默判据（[F-ALIGN-01 D4 2026-10-04] 域删语义重写——原 2026-09-30 裁决
 *   「paperCount 不参与」的前提「文献仅移出可寻回」随 D5 移出路径消亡而失效）：
 *   保护资产=paperCount/edgeCount/nodeCount 三计数。[RR1 W-A] 计数源=预检
 *   **实时查询**（快照 TOCTOU 修复——FolderNav 的 folders.list 快照滞后 0
 *   而库内有文献会 false-silent 直删=域删下文献灭失无预告）：graph/计数两
 *   查询 Promise.all 并行（library.list folderScope=folder+limit:1 只取 total
 *   ——FolderNav 旧计数查询同款手法）。total=0 ∧ nodeCount=0 ∧ edgeCount=0
 *   →静默直删（不弹窗）；任一非零→上抛 onHasAssets（paperCount=实时 total
 *   对象替换——FolderDeleteDialog 文案 K 值同步实时化，props 链零改）由宿主
 *   挂 FolderDeleteDialog（域删级联预告弹窗——INV-NEW-3）
 * - fail-closed：预检失败（graph/计数任一，含超时/异常）→不删不弹，动作型
 *   error toast（域错误 ApiClientError.message 透传+意外异常中文兜底）
 * - busy（W1 回炉 2026-09-30，门一）：双异步（预检+删除）全程 ref 守卫防
 *   同批双击（useBusyGuard pending ref 同型——菜单点击即关，无持续 busy
 *   挂载面故不持 state）；ref 记**在途 folderId** 而非布尔——同 id 再点=
 *   防双击面静默早退（原语义保留）；异 id 在途=info toast 轻量告知
 *   （「上一次删除仍在进行」——INV-02 动作型反馈同族：菜单已关零反馈易
 *   误读已执行）+不执行（hook 级串行语义保留，不引入并发删除）；全部
 *   出口复位 null
 * - 成功收口 handleDeleted（FolderDeleteDialog onDone 同一语义：reload+
 *   被删文件夹=当前筛选态→回退全部+onMutated）；W2 回炉（门一）：判定不
 *   再用渲染期闭包 scope（在途窗内用户切筛选后落定，旧闭包会把新筛选误
 *   踢回「全部」）——经 getScope() 读**最新筛选态**（宿主 ref 同步注入），
 *   仅当仍指向被删文件夹才回退；两路径（静默/弹窗确认 onDone）同缝同修
 *
 * ── 接口层 ──
 * - export function useFolderDeleteFlow(props): {
 *     requestDelete(folder: Folder): Promise<void>
 *     handleDeleted(deletedId: string): void
 *   }
 * - props.getScope(): 现值筛选态读取器（FolderNav 侧 scopeRef 每渲染
 *   同步注入——受控 props 即 store 投影，见 FolderNav W2 注）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 写路径=api 直调（unwrap+toast——folders 域无 store 先例同族）；筛选
 *   态读取经回调注入（hook 不持 store 依赖，受控组件 props 单源）
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
/** W1：在途删除异目标早退告知（动作型 info——同 id 静默，异 id 才告知） */
const FOLDER_DELETE_IN_FLIGHT = '上一次删除仍在进行，请稍候'

export function useFolderDeleteFlow(props: {
  getScope(): LibraryQuery['folderScope']
  onChange(patch: Partial<LibraryQuery>): void
  onMutated(): void
  reload(): Promise<void>
  /** 有保护资产→宿主挂 FolderDeleteDialog */
  onHasAssets(folder: Folder): void
}): { requestDelete(folder: Folder): Promise<void>; handleDeleted(deletedId: string): void } {
  const { getScope, onChange, onMutated, reload, onHasAssets } = props
  /** 在途 folderId（null=空闲）——W1：区分同/异目标早退语义 */
  const deletingIdRef = useRef<string | null>(null)

  /** 删除成功收口（弹窗确认路径与静默路径同一语义） */
  function handleDeleted(deletedId: string): void {
    void reload()
    // W2：现值判定（非渲染期闭包）——仅当最新筛选仍指向被删文件夹才回退
    const scopeNow = getScope()
    if (scopeNow?.kind === 'folder' && scopeNow.folderId === deletedId) {
      onChange({ folderScope: undefined })
    }
    onMutated()
  }

  async function requestDelete(folder: Folder): Promise<void> {
    if (deletingIdRef.current !== null) {
      if (deletingIdRef.current !== folder.id) {
        showToast(FOLDER_DELETE_IN_FLIGHT, 'info')
      }
      return
    }
    deletingIdRef.current = folder.id
    let silent: boolean
    let paperCountNow: number
    try {
      // [RR1 W-A] 双预检并行（实时源）：graph（node/edge）+library.list
      // folderScope=folder+limit:1（total=实时文献计数——快照 TOCTOU 修复）
      const [graph, count] = await Promise.all([
        unwrap(api.lineage.graph({ folderId: folder.id })),
        unwrap(api.library.list({ folderScope: { kind: 'folder', folderId: folder.id }, limit: 1 }))
      ])
      paperCountNow = count.total
      // [F-ALIGN-01 D4] 静默判据扩 paperCount（实时值——域删语义：任一非零=
      // 弹窗预告级联损失；全零=静默直删）
      silent = count.total === 0 && graph.nodes.length === 0 && graph.edges.length === 0
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : FOLDER_PRECHECK_FAILED, 'error')
      deletingIdRef.current = null
      return
    }
    if (!silent) {
      deletingIdRef.current = null
      // [RR1 W-A] 弹窗载荷 K 值=实时计数（对象替换——props 链零改）
      onHasAssets({ ...folder, paperCount: paperCountNow })
      return
    }
    try {
      await unwrap(api.folders.delete({ id: folder.id }))
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : FOLDER_DELETE_FAILED, 'error')
      deletingIdRef.current = null
      return
    }
    deletingIdRef.current = null
    handleDeleted(folder.id)
  }

  return { requestDelete, handleDeleted }
}
