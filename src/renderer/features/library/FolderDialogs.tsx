/**
 * [F-FOLDER-02·A/C] FolderDialogs —— 文件夹域两对话框（FolderFilter 子组件，
 * TagLifecycle.tsx 同型范式：Dialog 底座+useBusyGuard 同构+失败 toast 保持开）。
 *
 * ── 行为层 ──
 * - FolderRenameDialog：input（初值=现名）Enter/按钮提交 folders.rename；
 *   IME 组词 Enter 不提交（isComposing 守卫——仓内先例池范式）；空名禁提
 * - FolderDeleteDialog（design §4.3+N2 终裁文案逐字）：nodeCount/edgeCount=
 *   挂载时 lineage.graph({folderId}) 派生（folders.service 删除前取数面注释
 *   同口径——不经 folders 通道）；paperCount=folders.list 载荷（FolderFilter
 *   传入）；危险色按钮=Button variant="danger"；确认=folders.delete
 *
 * ── 接口层 ──
 * - export function FolderRenameDialog(props): JSX.Element
 * - export function FolderDeleteDialog(props): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 写路径=api 直调（unwrap+ApiClientError toast——folders 域无 store，静态
 *   参考数据自取先例）；成功经 onDone 上抛（宿主刷新+筛选回退收口在 FolderFilter）
 */
import { useEffect, useRef, useState } from 'react'
import type { Folder } from '@shared/models/folder'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import { useAsync } from '../../shared/hooks/useAsync'

/** 意外异常兜底中文 */
const FOLDER_WRITE_FAILED = '文件夹操作失败'

/** busy 守卫（TagLifecycle useBusyGuard 同构——ref 同步检查防同批双击；域内
 *  自持不复用跨域 hook） */
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

export function FolderRenameDialog(props: {
  folder: Folder
  onClose(): void
  onDone(): void
}): JSX.Element {
  const [value, setValue] = useState(props.folder.name)
  const guard = useBusyGuard()
  const trimmed = value.trim()

  async function save(): Promise<void> {
    if (trimmed === '' || !guard.begin()) return
    try {
      await unwrap(api.folders.rename({ id: props.folder.id, name: trimmed }))
      props.onDone()
      props.onClose()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : FOLDER_WRITE_FAILED, 'error')
      guard.end()
    }
  }

  return (
    <Dialog
      open
      title={`重命名文件夹：${props.folder.name}`}
      onClose={() => {
        if (!guard.busy) props.onClose()
      }}
      actions={
        <>
          <Button variant="ghost" size="sm" disabled={guard.busy} onClick={props.onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={guard.busy}
            disabled={trimmed === ''}
            onClick={() => void save()}
          >
            重命名
          </Button>
        </>
      }
    >
      <input
        aria-label="新文件夹名"
        className="w-full rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        value={value}
        disabled={guard.busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // IME 组词确认回车不提交（AnnotationEditor/TagEditor 先例池范式）
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') void save()
        }}
      />
    </Dialog>
  )
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
        {`该文件夹的脉络图将一并删除（${nodeCount ?? '…'} 个节点及 ${edgeCount ?? '…'} 条连线不可恢复）；其中 ${props.folder.paperCount} 篇文献不会被删除，将移至「未归档」。`}
      </p>
    </Dialog>
  )
}
