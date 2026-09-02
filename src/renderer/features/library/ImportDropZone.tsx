/**
 * [SR-LIB-06] ImportDropZone —— 导入入口（工单：done / weak）
 *
 * ── 行为层 ──
 * - 两个按钮：「导入 PDF 文件」→ api.import_.fromDialog({})；
 *   「导入文件夹」→ api.import_.fromFolder({})
 * - 拖拽：v1 仅高亮提示"请使用按钮"（webUtils.getPathForFile 需 preload 暴露，v2）
 * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
 * - 进度事件会话身份过滤（F-D4 B 面，INV-52——范式=corpus-export.store INV-18
 *   同族）：busy=false 时忽略（终局后跨通道迟到事件不写 state——渲染门之外的
 *   第二道门）；sessionRef 首事件锚定会话身份，异身份忽略（reload 后旧会话残留
 *   事件不得污染新会话进度显示）；runImport 入口重置 sessionRef=null。busy 的
 *   订阅回调读旧闭包问题用 busyRef 镜像解决（state 与 ref 双写）。
 *   残余窗（照 corpus-export.store 注释同口径）：新会话 start 后首事件前——
 *   旧事件须跨越终局+用户点击两层，理论窗
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
import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
import type { ImportProgressEvent, ImportResult } from '@shared/ipc/schemas'
import { Button } from '../../shared/ui/Button'
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
  // busy 镜像（订阅回调读旧闭包问题——state 与 ref 双写，F-D4）
  const busyRef = useRef(false)
  // 会话身份锚点：本会话首个进度事件建立；runImport 入口重置（F-D4）
  const sessionRef = useRef<string | null>(null)

  // 订阅 main 侧导入进度推送；卸载时退订，避免泄漏回调。
  // 三滤（F-D4 B 面，INV-52）：busy=false 忽略 + 异身份忽略 + 首事件锚定
  useEffect(() => {
    const unsubscribe = apiEvents.onImportProgress((e) => {
      // 终局后迟到事件不改在途相（busy 门挡渲染之外，state 写也挡住）
      if (!busyRef.current) return
      if (sessionRef.current === null) sessionRef.current = e.sessionId
      else if (sessionRef.current !== e.sessionId) return
      setProgress(e)
    })
    return unsubscribe
  }, [])

  async function runImport(mode: ImportMode): Promise<void> {
    if (busy) return
    sessionRef.current = null
    busyRef.current = true
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
      busyRef.current = false
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`lib-dropzone flex flex-col items-center gap-3 p-6${dragging ? ' lib-dropzone-dragging' : ''}`}
    >
      <p className="text-sm" style={{ color: dragging ? 'var(--accent)' : 'var(--text-dim)' }}>
        {dragging ? DROP_HINT : '将 PDF 拖到此处，或使用按钮导入'}
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void runImport('dialog')}
        >
          导入 PDF 文件
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void runImport('folder')}
        >
          导入文件夹
        </Button>
      </div>
      {busy && (
        <p role="status" className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {progress !== null ? progressText(progress) : '正在打开选择窗口…'}
        </p>
      )}
    </div>
  )
}
