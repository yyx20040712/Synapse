/**
 * [F-UIRES-01 批 B] usePaperDelete —— 文献删除流 hook（§2.4 态空间；
 * useFolderDelete 拆件范式+paper-move 收口链同型）。
 *
 * ── 行为层 ──
 * - 预检数据源=既有 library.detail 通道（零新通道）：detail.lineage 省略=无
 *   节点；lineage.edgeCount=连线数。静默判据（F-DELCONF C5 承接）：无节点 ∨
 *   edgeCount=0 →静默直删；有边→上抛 onProtect 由宿主挂 PaperDeleteDialog
 *   （弹窗计数=预检提示值——落定瞬态规避，不再二次查询）
 * - 图名派生：detail.folderId→folders.list 找 name；folderId=null（未归档）
 *   →「主图」（§2.1 缺省图映射）；夹行消失竞态同落「主图」（事务内级联按
 *   实际状态为权威——弹窗值=提示值）
 * - fail-closed：预检失败（detail/保护分支 folders.list）→不删不弹，error
 *   toast（ApiClientError.message 透传+意外异常中文兜底）
 * - 在途守卫（useFolderDelete W1 先例）：prechecking/deleting 期 ref 记在途
 *   paperId——同 id 再点=静默早退；异 id=info toast「上一次删除仍在进行」
 *   +不执行；全部出口复位 null。[RR1-1] 保护分支 ref 释放点=onProtect 前
 *   （folders.list 窗受守卫；confirming 期不设流级 ref=主控裁定——Dialog
 *   模态遮罩拦列表交互+本地 busy 守卫已足）
 * - 成功收尾（§2.3 同型）：await load() 重载→被删行不在列表且=当前选中→
 *   selectPaper(null)（抽屉随 selectedId 同源清空）；他行选中→保持；
 *   [RR1-2] 收尾异常独立捕获——「列表刷新失败」专用文案（删除已成列表未刷，
 *   勿用「删除文献失败」误报）
 * - deleting 失败（弹窗路径）=toast+弹窗保持开可重试（FolderDeleteDialog
 *   先例——PaperDeleteDialog 头注同锚）；静默路径失败=idle toast 列表保持
 * - folders.changed 计数刷新=main 侧双播既有事件（FolderNav 订阅自愈，此处
 *   零耦合——paper-move.ts 同型注记）
 *
 * ── 接口层 ──
 * - export interface PaperDeletePrompt（弹窗载荷——计数经 props 传入不自取）
 * - export function usePaperDeleteFlow(props): {
 *     requestDelete(paperId): Promise<void>
 *     handleDeleted(deletedPaperId): Promise<void>
 *   }
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 本域 store 直取（library feature 内）；写路径=api 直调（unwrap+toast）
 * - hook 形态=在途 ref 守卫所需（简报建议二选一自裁——非纯函数收口链）
 */
import { useRef } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { useLibraryStore } from './library.store'

/** 预检失败兜底（fail-closed——不删不弹，动作型告知） */
const PAPER_PRECHECK_FAILED = '无法确认该文献的脉络图状态，已取消删除'
/** 删除失败兜底（意外异常）。与 PaperDeleteDialog PAPER_DELETE_DIALOG_FAILED
 *  同文案异名=dup-constants warn 先例族互锚（RR1-5——非 CI 卡点） */
const PAPER_DELETE_FAILED = '删除文献失败'
/** 在途删除异目标早退告知（动作型 info——同 id 静默，异 id 才告知） */
const PAPER_DELETE_IN_FLIGHT = '上一次删除仍在进行，请稍候'
/** [RR1-2] 收尾（列表重载）失败专用文案——删除已成列表未刷，勿用「删除文献
 *  失败」误报；PaperDeleteDialog 同语义单源 import（tags 域 TAG_OP_FAILED
 *  先例——组件→域件 import） */
export const PAPER_RELOAD_FAILED = '列表刷新失败'
/** §2.1 缺省图名（folderId=null 未归档映射）+竞态兜底；与 folders.list 主图
 *  行名互锚（__main__ 行恒在场——folders.list 真实载荷，RR1-5） */
const MAIN_GRAPH_NAME = '主图'

/** 保护弹窗载荷（预检提示值——宿主挂 PaperDeleteDialog 经 props 传入） */
export interface PaperDeletePrompt {
  paperId: string
  graphName: string
  edgeCount: number
}

export function usePaperDeleteFlow(props: {
  /** 有连线→宿主挂 PaperDeleteDialog（计数=预检提示值） */
  onProtect(payload: PaperDeletePrompt): void
}): { requestDelete(paperId: string): Promise<void>; handleDeleted(deletedPaperId: string): Promise<void> } {
  const { onProtect } = props
  /** 在途 paperId（null=空闲）——W1：区分同/异目标早退语义 */
  const deletingIdRef = useRef<string | null>(null)

  /** 删除成功收口（弹窗确认路径与静默路径同一语义——§2.3 收尾两分支） */
  async function handleDeleted(deletedPaperId: string): Promise<void> {
    await useLibraryStore.getState().load()
    const s = useLibraryStore.getState()
    // 被删行不在列表且=当前选中→选中清空（抽屉随 selectedId 同源清空）；
    // 他行选中→保持
    if (!s.papers.some((p) => p.id === deletedPaperId) && s.selectedId === deletedPaperId) {
      s.selectPaper(null)
    }
  }

  async function requestDelete(paperId: string): Promise<void> {
    if (deletingIdRef.current !== null) {
      if (deletingIdRef.current !== paperId) {
        showToast(PAPER_DELETE_IN_FLIGHT, 'info')
      }
      return
    }
    deletingIdRef.current = paperId
    let detail
    try {
      detail = await unwrap(api.library.detail({ paperId }))
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : PAPER_PRECHECK_FAILED, 'error')
      deletingIdRef.current = null
      return
    }
    // 静默判据（C5 承接）：无节点 ∨ 节点无边
    const silent = detail.lineage === undefined || detail.lineage.edgeCount === 0
    if (!silent) {
      // 图名派生（folderId→folders.list；null→主图）
      let folders
      try {
        folders = await unwrap(api.folders.list({}))
      } catch (e) {
        showToast(e instanceof ApiClientError ? e.message : PAPER_PRECHECK_FAILED, 'error')
        deletingIdRef.current = null
        return
      }
      const graphName = folders.find((f) => f.id === detail.folderId)?.name ?? MAIN_GRAPH_NAME
      // [RR1-1a] ref 释放点=onProtect 前一行——folders.list 悬置窗全程受守卫
      //（prechecking 相位连续）；confirming 期不设流级 ref=主控裁定（Dialog
      // 模态遮罩拦列表交互+弹窗本地 busy 守卫已足）
      deletingIdRef.current = null
      onProtect({ paperId, graphName, edgeCount: detail.lineage?.edgeCount ?? 0 })
      return
    }
    try {
      await unwrap(api.papers.delete({ paperId }))
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : PAPER_DELETE_FAILED, 'error')
      deletingIdRef.current = null
      return
    }
    // [RR1-1b/RR1-2a] 收尾独立捕获：ref 复位入 finally（load 异常不悬挂守卫）；
    // 删除已成、列表未刷=专用文案（load 列表型契约本不抛——防御面）
    try {
      await handleDeleted(paperId)
    } catch {
      showToast(PAPER_RELOAD_FAILED, 'error')
    } finally {
      deletingIdRef.current = null
    }
  }

  return { requestDelete, handleDeleted }
}
