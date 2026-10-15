/**
 * [F-DBCAMP-01 DB-4 / F-STAR-01 A1+A2] paper-star —— 文献星标切换收口
 * （行首星标钮/行菜单星标项共用链；paper-move.ts 同型）。
 *
 * ── 行为层 ──
 * - 乐观先行：patchPaperStarred 本地翻转（无广播口径——U2 简报裁决⑧：
 *   library.service setStarred 无事件广播，列表行本地状态即可）→
 *   api.papers.setStarred
 * - 失败：回滚原值+toast（ApiClientError.message 透传/意外兜底）非静默
 * - 成功：零重载（本地态即真值——行 tagNames/计数等零关涉）
 *
 * ── 接口层 ──
 * - export async function togglePaperStar(paperId, starred): Promise<void>
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 本域 store 直取（library feature 内——消费方 PaperRow/PaperRowMenu 宿主）
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { useLibraryStore } from './library.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const STAR_TOGGLE_FAILED = '星标操作失败'

export async function togglePaperStar(paperId: string, starred: boolean): Promise<void> {
  const prev = useLibraryStore.getState().papers.find((p) => p.id === paperId)?.isStarred ?? false
  useLibraryStore.getState().patchPaperStarred(paperId, starred)
  try {
    await unwrap(api.papers.setStarred({ paperId, starred }))
  } catch (e) {
    useLibraryStore.getState().patchPaperStarred(paperId, prev)
    showToast(e instanceof ApiClientError ? e.message : STAR_TOGGLE_FAILED, 'error')
  }
}
