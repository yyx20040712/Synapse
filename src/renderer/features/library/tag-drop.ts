/**
 * [F-DBCAMP-01 DB-4 / F-TAGS-02 ⑥ B] tag-drop —— 标签拖放到文献行的打标
 * 收口（useFolderDrop/paper-move 仿体）。
 *
 * ── 行为层 ──
 * - dropTagOnPaper：TAG MIME 判别已在 PaperRow 侧；此处执行=域一致性预检
 *   （tag 域≠paper.folderId 且数据可及 →toast 拒绝零请求——all-scope 列表
 *   跨域行混列面；数据不可及=依赖服务端 019 触发器+R3 CONFLICT 映射兜底）
 *   →api.tags.attach →成功=library load（行 tagNames 徽标刷新——FilterBar
 *   onMutated→loadLibrary 同链）→失败=toast（ApiClientError.message 透传）
 *
 * ── 接口层 ──
 * - export async function dropTagOnPaper(paper: PaperSummary, ev: DragEvent): Promise<void>
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 本域 store 直取（library feature 内）；busy 拒收在 PaperRow 侧
 *   （useFolderDrop 双重校验同型）
 */
import type { DragEvent } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { TAG_DRAG_MIME, TAG_DRAG_FOLDER_MIME } from '../../shared/tag-dnd'
import { useLibraryStore } from './library.store'
import type { PaperSummary } from '@shared/models/paper'

/** 域预检拒绝文案（服务端 R3 映射同文案——单点语义双承载） */
const TAG_DOMAIN_MISMATCH = '标签与文献不在同一文件夹域——无法挂接'

/** 意外异常兜底中文消息 */
const TAG_DROP_FAILED = '打标签失败'

export async function dropTagOnPaper(paper: PaperSummary, ev: DragEvent<HTMLElement>): Promise<void> {
  const tagId = ev.dataTransfer.getData(TAG_DRAG_MIME)
  if (tagId === '') return
  const folderId = ev.dataTransfer.getData(TAG_DRAG_FOLDER_MIME)
  // 域一致性预检（数据可及时）：跨域拖放零请求拒绝（error 档——服务端 R3 同文案同档）
  if (folderId !== '' && folderId !== paper.folderId) {
    showToast(TAG_DOMAIN_MISMATCH, 'error')
    return
  }
  try {
    await unwrap(api.tags.attach({ paperId: paper.id, tagId }))
  } catch (e) {
    showToast(e instanceof ApiClientError ? e.message : TAG_DROP_FAILED, 'error')
    return
  }
  // 成功：行 tagNames 徽标刷新（library load——FilterBar onMutated 同链）
  await useLibraryStore.getState().load()
}
