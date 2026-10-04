/**
 * [F-FOLDER-02·A/C→F-UIRES-01 批 A] FolderDialogs —— 文件夹域保护弹窗
 * （FolderNav 子组件）。[F-UIRES-01] FolderRenameDialog 随批退役（重命名
 * 单源=FolderNav 行内编辑——消费面单点实证，方案切换=删除旧方案）；本件仅存
 * FolderDeleteDialog（有资产分支保护弹窗；[F-ALIGN-01 D4 2026-10-04] 文案
 * 重写=域删级联预告——「将永久删除夹内 N 篇文献及其脉络图、笔记与标注」）。
 *
 * ── 行为层 ──
 * - FolderDeleteDialog：nodeCount/edgeCount=挂载时 lineage.graph({folderId})
 *   派生（folders.service 删除前取数面注释同口径——不经 folders 通道）；
 *   paperCount=folders.list 载荷（FolderNav 传入）；危险色按钮=Button
 *   variant="danger"；确认=folders.delete
 *
 * ── 接口层 ──
 * - export function FolderDeleteDialog(props): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 写路径=api 直调（unwrap+ApiClientError toast——folders 域无 store，静态
 *   参考数据自取先例）；成功经 onDone 上抛（宿主刷新+筛选回退收口在 FolderNav）
 */
import { useEffect, useState, useRef } from 'react'
import type { Folder } from '@shared/models/folder'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import { useAsync } from '../../shared/hooks/useAsync'

/** 意外异常兜底中文 */
const FOLDER_WRITE_FAILED = '文件夹操作失败'

/** busy 守卫（ref 同步检查防同批双击；域内自持不复用跨域 hook） */
function useBusyGuard(): { busy: boolean; begin(): boolean; end(): void } {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  return {
    busy,
    begin(): boolean {
      if (pending.current) return false
      pending.current = true
      setBusy(true)
      return true
    },
    end(): void {
      pending.current = false
      setBusy(false)
    }
  }
}

export function FolderDeleteDialog(props: {
  folder: Folder
  onClose(): void
  /** 删除成功上抛（宿主=刷新列表+被删文件夹筛选回退） */
  onDone(deletedFolderId: string): void
}): JSX.Element {
  const guard = useBusyGuard()
  // 计数面：nodeCount/edgeCount=该图子图派生（lineage.graph——folders.service
  // 头注同口径）；paperCount=FolderDTO 载荷（folders.list 单源）
  const { data: graph, run: loadGraph } = useAsync(
    () => unwrap(api.lineage.graph({ folderId: props.folder.id })),
    [props.folder.id]
  )
  useEffect(() => {
    void loadGraph()
  }, [loadGraph])

  const nodeCount = graph?.nodes.length
  const edgeCount = graph?.edges.length

  async function confirm(): Promise<void> {
    if (!guard.begin()) return
    try {
      await unwrap(api.folders.delete({ id: props.folder.id }))
      props.onDone(props.folder.id)
      props.onClose()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : FOLDER_WRITE_FAILED, 'error')
      guard.end()
    }
  }

  return (
    <Dialog
      open
      title={`删除文件夹「${props.folder.name}」？`}
      onClose={() => {
        if (!guard.busy) props.onClose()
      }}
      actions={
        <>
          <Button variant="ghost" size="sm" disabled={guard.busy} onClick={props.onClose}>
            取消
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={guard.busy}
            disabled={nodeCount === undefined || edgeCount === undefined}
            onClick={() => void confirm()}
          >
            删除文件夹
          </Button>
        </>
      }
    >
      <p className="text-xs leading-6" style={{ color: 'var(--text)' }}>
        {`将永久删除该文件夹内的 ${props.folder.paperCount} 篇文献及其脉络图（${nodeCount ?? '…'} 个节点、${edgeCount ?? '…'} 条连线）、笔记与标注——全部不可恢复。`}
      </p>
    </Dialog>
  )
}
