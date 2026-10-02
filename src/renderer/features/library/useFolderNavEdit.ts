/**
 * [F-UIRES-01 批 A RR1] useFolderNavEdit —— FolderNav 新建/重命名行内编辑流
 * 拆件（组件 250 行红线）。§2.2 契约：
 * - 新建：内联输入 Enter/失焦提交、Esc 取消、isComposing 守卫（键面在
 *   FolderNavRows.inlineKeyDown）；CONFLICT→toast+保留输入
 * - 重命名行内编辑单源（F2 等价入口在行键）；输入保留（value 持本 hook 态
 *   ——外部 folders.changed 重拉不卸载不丢输入）+本行提交结果权威
 * - [RR1-4/d1-W1] 提交门：Enter 直提（清 skipBlur 标记——Esc 卸载无 blur
 *   消费者，标记驻留会吞下一次提交）；blur 过标记门
 * - [RR1-7/k2-W5] 在途守卫：writePendingRef 单飞（在途窗 Enter/失焦零双发）
 */
import { useRef, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import type { RenameState } from './FolderNavRows'

/** 意外异常兜底中文 */
const FOLDER_CREATE_FAILED = '新建文件夹失败'
const FOLDER_RENAME_FAILED = '重命名文件夹失败'
const FOLDER_NAME_EMPTY = '文件夹名不能为空'

export function useFolderNavEdit(props: {
  onMutated(): void
  reloadFolders(): Promise<void>
  reloadUnfiledCount(): Promise<void>
}): {
  creating: boolean
  setCreating(v: boolean): void
  /** [RR2-4] 会话开口版（清 skipBlur 标记）——进入编辑用此口 */
  openCreating(): void
  renaming: RenameState | null
  setRenaming(state: RenameState | null): void
  /** [RR2-4] 会话开口版（清 skipBlur 标记）——进入编辑用此口 */
  openRenaming(state: RenameState): void
  skipBlur(): void
  commitCreate(name: string, viaBlur: boolean): void
  commitRename(state: RenameState, viaBlur: boolean): void
} {
  const { onMutated, reloadFolders, reloadUnfiledCount } = props
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<RenameState | null>(null)
  // Esc 收起标记（跳过紧随失焦提交——unmount 不触发 blur，防御窗口在）
  const skipBlurRef = useRef(false)
  // [RR1-7] create/rename 在途守卫（ref 同步检查——useBusyGuard 范式）
  const writePendingRef = useRef(false)

  async function createFolder(name: string): Promise<void> {
    const trimmed = name.trim()
    // [RR2-1] 两支拆分：空名=反馈+零 IPC；在途=静默拒（拒因是在途非空名）
    if (trimmed === '') {
      showToast(FOLDER_NAME_EMPTY, 'info')
      return
    }
    if (writePendingRef.current) return
    writePendingRef.current = true
    try {
      await unwrap(api.folders.create({ name: trimmed }))
      setCreating(false)
      await reloadFolders()
      void reloadUnfiledCount()
      onMutated()
    } catch (e) {
      // CONFLICT 域错误中文原文透传；输入保留（§2.2）
      showToast(e instanceof ApiClientError ? e.message : FOLDER_CREATE_FAILED, 'error')
    } finally {
      writePendingRef.current = false
    }
  }

  async function renameFolder(state: RenameState): Promise<void> {
    const trimmed = state.value.trim()
    if (trimmed === '') {
      showToast(FOLDER_NAME_EMPTY, 'info')
      return
    }
    if (writePendingRef.current) return
    writePendingRef.current = true
    try {
      await unwrap(api.folders.rename({ id: state.folderId, name: trimmed }))
      setRenaming(null)
      await reloadFolders()
      void reloadUnfiledCount()
      onMutated()
    } catch (e) {
      // CONFLICT 拒→toast+输入保留（本行提交权威——§2.2）
      showToast(e instanceof ApiClientError ? e.message : FOLDER_RENAME_FAILED, 'error')
    } finally {
      writePendingRef.current = false
    }
  }

  /** [RR2-4] 编辑会话开口：skipBlur 标记清零（生命周期绑定会话——上一会话
   *  Esc 驻留标记不得吞本会话首次失焦提交；Enter 可补救但失焦面须自愈） */
  function openCreating(): void {
    skipBlurRef.current = false
    setCreating(true)
  }

  function openRenaming(state: RenameState): void {
    skipBlurRef.current = false
    setRenaming(state)
  }

  /** [RR1-4] 提交门：Enter 直提清标记；blur 过标记门 */
  function commitCreate(name: string, viaBlur: boolean): void {
    if (viaBlur && skipBlurRef.current) {
      skipBlurRef.current = false
      return
    }
    skipBlurRef.current = false
    void createFolder(name)
  }

  function commitRename(state: RenameState, viaBlur: boolean): void {
    if (viaBlur && skipBlurRef.current) {
      skipBlurRef.current = false
      return
    }
    skipBlurRef.current = false
    void renameFolder(state)
  }

  function skipBlur(): void {
    skipBlurRef.current = true
  }

  return {
    creating,
    setCreating,
    openCreating,
    renaming,
    setRenaming,
    openRenaming,
    skipBlur,
    commitCreate,
    commitRename
  }
}
