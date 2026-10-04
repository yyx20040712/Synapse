/**
 * [SR-LIB-06→F-UIRES-01 批 A U2] ImportDropZone —— 导入条（42px 横条形态，
 * mockup .ibar 逐值；ImportTargetSelect 随批退役——「仅入文献库」选项退役
 * 2026-09-30 用户裁决，目标恒定语义 R2：folder 态=该文件夹；无筛选=主图
 * MAIN_GRAPH_ID，由 LibraryPage 投影注入）。
 * [F-ALIGN-01 D3 2026-10-04] main 侧单跳：三调用点（fromDialog/fromFolder/
 * apiDrag.importDropped）必携 targetFolderId——导入产物在 main 侧落夹建节点；
 * 原「导入成功逐 imported 论文 papers.moveFolder 挂接」后挂接链删除（中间
 * 失败窗口与逐个挂接的未落夹中间态消亡）。
 *
 * ── 行为层 ──
 * - 两按钮：「导入 PDF」→ api.import_.fromDialog({targetFolderId})；「导入
 *   文件夹」→ api.import_.fromFolder({targetFolderId})（R4 文案——hint=
 *   「或将 PDF 拖到此处导入」）
 * - 拖拽（P7E-02）：drop → window.apiDrag.importDropped(files, targetFolderId)
 *   ——File 经 preload webUtils 解析（.pdf 滤+数量上限）→ import/from-paths，
 *   renderer 全程不接触路径串；busy 期 drop 短路提示（零 invoke）
 * - drop 热区=导入条本体 div 级保持零变（R3——div 级热区语义不变）
 * - 目标徽标（.lib-import-target）：恒显「导入到：X」——X=当前夹名或主图名
 *   （folders.list 名解析=每渲染 find；取数两路=挂载+folders.changed）
 * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
 * - 进度事件会话身份过滤（F-D4 B 面，INV-52）：busy=false 忽略+sessionRef
 *   首事件锚定异身份忽略；busyRef 镜像解决订阅回调旧闭包
 * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并经 onImported 通知父级刷新
 *   library.store；取消（空结果）静默
 *
 * ── 接口层 ──
 * - export function ImportDropZone(props: { onImported(): void;
 *     targetFolderId: string }): JSX.Element
 * - targetFolderId=导入目标文件夹 id（folder 态=该夹；无筛选=主图 '__main__'
 *   ——投影单源在 LibraryPage，恒非空 INV-NEW-2）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 路径合法来源=main 侧系统对话框 + 拖拽 File 经 preload webUtils 解析
 *   （apiDrag 单口，INV-07 修订）；renderer 无路径字面量（INV-09 不变）
 * - 进度订阅在卸载时退订；busy 期间按钮禁点防重复发起
 */
import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
import type { Result } from '@shared/app-error'
import type { ImportProgressEvent, ImportResult } from '@shared/ipc/schemas'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import type { ToastKind } from '../../shared/ui/Toast'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const IMPORT_FAILED = '导入失败'

/** 拖拽悬停提示（P7E-02 已接线：松手即经 preload 桥导入） */
const DROP_HINT = '松开以导入 PDF 文件'

/** busy 期再拖入的短路提示（D5——不发起第二次导入） */
const IMPORT_BUSY_HINT = '导入进行中，请稍候'

/** [R4] hint 文案（div 级热区事实口径——非 mockup「窗口任意位置」勘误版） */
const DRAG_HINT = '或将 PDF 拖到此处导入'

/** 进度阶段中文标签（与 ImportProgressEvent.phase 一一对应） */
const PHASE_LABEL: Record<ImportProgressEvent['phase'], string> = {
  scanning: '扫描文件',
  copying: '复制文件',
  extracting: '提取元数据',
  done: '完成'
}

type ImportMode = 'dialog' | 'folder'

/** 导入调用形态：dialog/folder/drag 三入口共用 runImport 壳（P7E-02 泛化，壳行为零变） */
type ImportCall = () => Promise<Result<ImportResult>>

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

export function ImportDropZone(props: {
  onImported: () => void
  /** [F-UIRES-01 R2→F-ALIGN-01 D3] 导入目标文件夹 id（folder 态=该夹；无筛选
   *  =主图 '__main__'——LibraryPage 投影单源；三调用点必携，恒非空 INV-NEW-2） */
  targetFolderId: string
}): JSX.Element {
  const { onImported, targetFolderId } = props
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null)
  const [dragging, setDragging] = useState(false)
  // [RR1-9/d1-N7 勘正] 文件夹名解析（folders.list 自取静态参考数据——仅取名）：
  // 取数两路=挂载+folders.changed（他页变更/导入链 moveFolder 广播）；名解析=
  // 每渲染 find（targetFolderId 切换不重取——数据已覆盖全部文件夹行）
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])
  useEffect(() => {
    void loadFolders()
  }, [loadFolders])
  useEffect(
    () => apiEvents.onFoldersChanged(() => void loadFolders()),
    [loadFolders]
  )
  const targetName = folders?.find((f) => f.id === targetFolderId)?.name
  // busy 全局信号（S2 消费源——FolderNav 导航/脉络页图切换器禁切）
  const setImportBusy = useImportBusyStore((s) => s.setBusy)
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

  async function runImport(call: ImportCall): Promise<void> {
    if (busy) return
    sessionRef.current = null
    busyRef.current = true
    setBusy(true)
    setImportBusy(true)
    setProgress(null)
    try {
      const result = await unwrap(call())
      // [F-ALIGN-01 D3] main 侧单跳：落夹+建节点在 importOne 事务内完成——
      // renderer 无后挂接链（逐个 moveFolder 的中间失败窗口消亡）
      reportImportResult(result, onImported)
    } catch (e) {
      // unwrap 已把 IPC 错误折叠为带中文 message 的 ApiClientError
      // （拖拽面的 none/too-many 拒绝也是 Result 错误——同路折叠为中文 toast）
      showToast(e instanceof ApiClientError ? e.message : IMPORT_FAILED, 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
      setImportBusy(false)
      setProgress(null)
    }
  }

  function startButtonImport(mode: ImportMode): void {
    void runImport(
      mode === 'dialog'
        ? () => api.import_.fromDialog({ targetFolderId })
        : () => api.import_.fromFolder({ targetFolderId })
    )
  }

  // 拖拽悬停高亮（D1）；[F-UIRES-01 §2.5] 两域判别——仅响应 OS 文件拖入
  // （types 含 Files）；内部行拖拽（自定义 MIME）不触发导入辉光/热区
  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setDragging(true)
  }

  // 拖拽导入（P7E-02）：busy 短路提示（D5，零 invoke）；否则 File 列表交 preload 桥
  // ——解析/.pdf 滤/数量上限全在 preload 堆内，路径串零接触 renderer（INV-54）
  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault() // 同时阻止浏览器默认打开文件
    setDragging(false)
    // [F-UIRES-01 §2.5] 内部行拖拽释放在导入条=非导入语义（无 Files）→忽略
    if (!e.dataTransfer.types.includes('Files')) return
    if (busyRef.current) {
      showToast(IMPORT_BUSY_HINT, 'info')
      return
    }
    const files = [...e.dataTransfer.files]
    void runImport(() => window.apiDrag.importDropped(files, targetFolderId))
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`lib-dropzone${dragging ? ' lib-dropzone-dragging' : ''}`}
    >
      <div className="lib-ibar-main">
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => startButtonImport('dialog')}>
          导入 PDF
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => startButtonImport('folder')}>
          导入文件夹
        </Button>
        <span className="lib-ibar-hint">{dragging ? DROP_HINT : DRAG_HINT}</span>
      </div>
      <span className="lib-import-target">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 6c0-1 1-2 2-2h4l2 2h6c1 0 2 1 2 2v9c0 1-1 2-2 2H6c-1 0-2-1-2-2z" />
        </svg>
        {`导入到：`}
        <b>{targetName ?? '…'}</b>
      </span>
      {busy && (
        <span role="status" className="lib-ibar-progress">
          {progress !== null ? progressText(progress) : '正在打开选择窗口…'}
        </span>
      )}
    </div>
  )
}
