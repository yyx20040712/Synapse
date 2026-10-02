/**
 * [F-UIRES-01 批 B] PaperDeleteDialog —— 文献删除保护弹窗（§3.9 S5b 三要素；
 * FolderDeleteDialog 形态参照：Dialog+danger Button+busy 守卫+取消 disabled busy）。
 *
 * ── 行为层 ──
 * - 三要素（§3.9 锚逐字）：标题「删除文献？」+正文含图名+连线数+「同时移除其
 *   节点与全部连线」+不可恢复语义
 * - **计数经 props 传入**（预检提示值——usePaperDelete 预检派生），不自取
 *   lineage.graph（与 FolderDeleteDialog 自取形态的差异=设计稿「弹窗计数=
 *   提示值」裁定）；事务内级联按实际状态为权威
 * - 确认=papers.delete（级联=DDL 承担）；成功经 onDone 上抛（宿主收尾链：
 *   load 重载+选中清空判定在 usePaperDelete.handleDeleted）
 * - [RR1-2b] confirm 两段独立捕获：delete 失败=toast+guard.end() 弹窗保持开
 *   可重试（FolderDeleteDialog 先例——主控裁定）；onDone（收尾）异常=「列表
 *   刷新失败」专用文案+仍关弹窗（删除已成，弹窗应关）
 *
 * ── 接口层 ──
 * - export function PaperDeleteDialog(props): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 写路径=api 直调（unwrap+ApiClientError toast——folders 域无 store 同族）
 * - busy 守卫（ref 同步检查防同批双击；域内自持不复用跨域 hook）
 */
import { useRef, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import { PAPER_RELOAD_FAILED } from './usePaperDelete'

/** 意外异常兜底中文。与 usePaperDelete PAPER_DELETE_FAILED 同文案异名=
 *  dup-constants warn 先例族互锚（RR1-5——非 CI 卡点） */
const PAPER_DELETE_DIALOG_FAILED = '删除文献失败'

/** busy 守卫（FolderDialogs 同型——ref 同步检查防同批双击） */
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

export function PaperDeleteDialog(props: {
  paperId: string
  /** 图名（预检提示值——null 归属已派生为「主图」） */
  graphName: string
  /** 连线数（预检提示值——事务内级联按实际状态为权威） */
  edgeCount: number
  onClose(): void
  /** 删除成功上抛（宿主=usePaperDelete.handleDeleted 收尾链） */
  onDone(deletedPaperId: string): void | Promise<void>
}): JSX.Element {
  const guard = useBusyGuard()

  async function confirm(): Promise<void> {
    if (!guard.begin()) return
    try {
      await unwrap(api.papers.delete({ paperId: props.paperId }))
    } catch (e) {
      // [RR1-2b] 删除失败=弹窗保持开可重试（FolderDeleteDialog 先例——主控裁定）
      showToast(e instanceof ApiClientError ? e.message : PAPER_DELETE_DIALOG_FAILED, 'error')
      guard.end()
      return
    }
    // 删除已成：收尾异常独立捕获——专用文案+仍关弹窗（RR1-2b）
    try {
      await props.onDone(props.paperId)
    } catch {
      showToast(PAPER_RELOAD_FAILED, 'error')
    }
    props.onClose()
  }

  return (
    <Dialog
      open
      title="删除文献？"
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
            onClick={() => void confirm()}
          >
            删除文献
          </Button>
        </>
      }
    >
      <p className="text-xs leading-6" style={{ color: 'var(--text)' }}>
        {`该文献在「${props.graphName}」中有 ${props.edgeCount} 条连线，删除后将同时移除其节点与全部连线，此操作不可恢复。`}
      </p>
    </Dialog>
  )
}
