/**
 * [SR-LIB-06] ImportDropZone —— 导入入口（工单：done / weak）
 *
 * ── 行为层 ──
 * - 两个按钮：「导入 PDF 文件」→ api.import_.fromDialog({})；
 *   「导入文件夹」→ api.import_.fromFolder({})
 * - 拖拽：v1 仅高亮提示"请使用按钮"（webUtils.getPathForFile 需 preload 暴露，v2）
 * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
 * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并经 onImported 通知父级刷新 library.store
 * - 取消（空结果）静默
 *
 * ── 接口层 ──
 * - export function ImportDropZone(props: { onImported(): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 路径全部由 main 侧对话框产生，renderer 无路径（安全 §6.3）
 * - 进度订阅在卸载时退订；busy 期间按钮禁点防重复发起
 */
import { useEffect, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
import type { ImportProgressEvent, ImportResult } from '@shared/ipc/schemas'
import { showToast } from '../../shared/ui/Toast'
import type { ToastKind } from '../../shared/ui/Toast'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const IMPORT_FAILED = '导入失败'

/** 拖拽高亮时的提示（Electron 沙箱下 renderer 拿不到真实路径，v1 不支持拖入） */
const DROP_HINT = '暂不支持拖拽导入，请使用下方按钮选择文件或文件夹'

/** 进度阶段中文标签（与 ImportProgressEvent.phase 一一对应） */
const PHASE_LABEL: Record<ImportProgressEvent['phase'], string> = {
  scanning: '扫描文件',
  copying: '复制文件',
  extracting: '提取元数据',
  done: '完成'
}

type ImportMode = 'dialog' | 'folder'

/** 主按钮（accent 底白字）；禁用态降不透明度 */
const BTN_PRIMARY: CSSProperties = {
  background: 'var(--accent)',
  color: '#ffffff',
  cursor: 'pointer'
}

/** 次按钮（panel 底 + 边框） */
const BTN_SECONDARY: CSSProperties = {
  background: 'var(--panel)',
  color: 'var(--text)',
  borderColor: 'var(--border)',
  cursor: 'pointer'
}

/** 组装进度文案：阶段 + （current/total）+ 文件名 */
function progressText(e: ImportProgressEvent): string {
  const pos = e.total > 0 ? `（${e.current}/${e.total}）` : ''
  return e.fileName !== '' ? `${PHASE_LABEL[e.phase]}${pos} ${e.fileName}` : `${PHASE_LABEL[e.phase]}${pos}`
}

/**
 * 结果反馈契约（ImportResult 语义）：
 * - 三项计数全为 0 → 用户取消，静默返回；
 * - 否则 toast 一条汇总（仅列非零项），失败>0 用 error（停留更久），
 *   纯新增用 success，仅重复用 info；
 * - 有新增时回调 onImported 让父级刷新 library.store。
 */
function reportImportResult(result: ImportResult, onImported: () => void): void {
  const parts: string[] = []
  if (result.imported.length > 0) parts.push(`成功 ${result.imported.length}`)
  if (result.duplicates.length > 0) parts.push(`重复 ${result.duplicates.length}`)
  if (result.failed.length > 0) parts.push(`失败 ${result.failed.length}`)
  if (parts.length === 0) return

  const kind: ToastKind =
    result.failed.length > 0 ? 'error' : result.imported.length > 0 ? 'success' : 'info'
  showToast(`导入完成：${parts.join('，')}`, kind)
  if (result.imported.length > 0) onImported()
}

export function ImportDropZone(props: { onImported: () => void }): JSX.Element {
  const { onImported } = props
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null)
  const [dragging, setDragging] = useState(false)

  // 订阅 main 侧导入进度推送；卸载时退订，避免泄漏回调
  useEffect(() => {
    const unsubscribe = apiEvents.onImportProgress(setProgress)
    return unsubscribe
  }, [])

  async function runImport(mode: ImportMode): Promise<void> {
    if (busy) return
    setBusy(true)
    setProgress(null)
    try {
      const result =
        mode === 'dialog'
          ? await unwrap(api.import_.fromDialog({}))
          : await unwrap(api.import_.fromFolder({}))
      reportImportResult(result, onImported)
    } catch (e) {
      // unwrap 已把 IPC 错误折叠为带中文 message 的 ApiClientError
      showToast(e instanceof ApiClientError ? e.message : IMPORT_FAILED, 'error')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  // 拖拽仅做高亮 + 提示：沙箱 renderer 拿不到绝对路径，真实导入一律走 main 侧对话框
  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    setDragging(true)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault() // 同时阻止浏览器默认打开文件
    setDragging(false)
    showToast(DROP_HINT, 'info')
  }

  const disabledStyle = busy ? { opacity: 0.6, cursor: 'not-allowed' } : {}

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6"
      style={{
        borderColor: dragging ? 'var(--accent)' : 'var(--border)',
        background: dragging ? 'var(--accent-soft)' : 'var(--panel)'
      }}
    >
      <p className="text-sm" style={{ color: dragging ? 'var(--accent)' : 'var(--text-dim)' }}>
        {dragging ? DROP_HINT : '将 PDF 拖到此处，或使用按钮导入'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runImport('dialog')}
          className="rounded px-3 py-1.5 text-sm"
          style={{ ...BTN_PRIMARY, ...disabledStyle }}
        >
          导入 PDF 文件
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runImport('folder')}
          className="rounded border px-3 py-1.5 text-sm"
          style={{ ...BTN_SECONDARY, ...disabledStyle }}
        >
          导入文件夹
        </button>
      </div>
      {busy && (
        <p role="status" className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {progress !== null ? progressText(progress) : '正在打开选择窗口…'}
        </p>
      )}
    </div>
  )
}
