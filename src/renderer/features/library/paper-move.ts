/**
 * [F-UIRES-01 批 A U4] paper-move —— 文献移动收口（菜单移动/拖放共用链，
 * §2.3/R12/R13）。moveFolder 既有通道（INV-88：节点随归属+同值幂等+跨图边拒）。
 *
 * ── 行为层 ──
 * - 成功：await library.load() 重载后判收尾两分支——行离开当前视图→
 *   selectPaper(null)（选中清空+抽屉清空同源——抽屉由 selectedId 驱动）；
 *   仍在→保持选中
 * - 失败：拒因中文 toast（ApiClientError.message 透传/意外兜底）非静默 no-op
 * - folders.changed 计数刷新=main 侧广播既有事件（FolderNav 订阅自愈，此处零耦合）
 *
 * ── 接口层 ──
 * - export async function movePaperToFolder(paperId, toFolderId): Promise<void>
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 本域 store 直取（library feature 内——消费方 LibraryPage/FolderNav）
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { useLibraryStore } from './library.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const MOVE_PAPER_FAILED = '移动文献失败'

export async function movePaperToFolder(paperId: string, toFolderId: string | null): Promise<void> {
  try {
    await unwrap(api.papers.moveFolder({ paperId, toFolderId }))
  } catch (e) {
    showToast(e instanceof ApiClientError ? e.message : MOVE_PAPER_FAILED, 'error')
    return
  }
  // 成功：列表重载后判行去留（两分支收尾——§2.3）
  await useLibraryStore.getState().load()
  if (!useLibraryStore.getState().papers.some((p) => p.id === paperId)) {
    useLibraryStore.getState().selectPaper(null)
  }
}
