/**
 * [SR-LIB-06] ImportDropZone —— 导入入口（工单：done / weak）
 *
 * ── 行为层 ──
 * - 两个按钮：「导入 PDF 文件」→ api.import_.fromDialog({})；
 *   「导入文件夹」→ api.import_.fromFolder({})
 * - 拖拽（P7E-02，原 v1 预留注记已兑现）：drop → window.apiDrag.importDropped(files)
 *   ——File 经 preload webUtils 解析（.pdf 滤+数量上限）→ import/from-paths，
 *   renderer 全程不接触路径串；busy 期 drop 短路提示（零 invoke）
 * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
 * - 进度事件会话身份过滤（F-D4 B 面，INV-52——范式=corpus-export.store INV-18
 *   同族）：busy=false 时忽略（终局后跨通道迟到事件不写 state——渲染门之外的
 *   第二道门）；sessionRef 首事件锚定会话身份，异身份忽略（reload 后旧会话残留
 *   事件不得污染新会话进度显示）；runImport 入口重置 sessionRef=null。busy 的
 *   订阅回调读旧闭包问题用 busyRef 镜像解决（state 与 ref 双写）。
 *   残余窗（照 corpus-export.store 注释同口径）：新会话 start 后首事件前——
 *   旧事件须跨越终局+用户点击两层，理论窗
 * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并经 onImported 通知父级刷新 library.store
 *   [F-FOLDER-02·E]「导入到」选择器（拆件 ImportTargetSelect）：目标=当前文件夹
 *   →导入成功后逐 imported 论文 papers.moveFolder 挂接（移动语义自动入图——
 *   最简合规路径，主进程 import 面零触碰）；仅入文献库→零挂接（无节点行）；
 *   busy 全程置 import-busy store（S2 消费源——文件夹区/图切换器禁切）
 * - 取消（空结果）静默
 *
 * ── 接口层 ──
 * - export function ImportDropZone(props: { onImported(): void;
 *     targetFolderId?: string | null }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 路径合法来源=main 侧系统对话框 + 拖拽 File 经 preload webUtils 解析
 *   （apiDrag 单口，P7E-02/INV-07 修订）；renderer 无路径字面量（INV-09 不变）
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
import { ImportTargetSelect } from './ImportTargetSelect'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const IMPORT_FAILED = '导入失败'

/** 拖拽悬停提示（P7E-02 已接线：松手即经 preload 桥导入） */
const DROP_HINT = '松开以导入 PDF 文件'

/** busy 期再拖入的短路提示（D5——不发起第二次导入） */
const IMPORT_BUSY_HINT = '导入进行中，请稍候'

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
  /** [F-FOLDER-02·E] folder 筛选态文件夹 id（null=无筛选——「导入到」默认口径：
   *  无筛选=仅入文献库；folder 态=该文件夹）；缺省 null */
  targetFolderId?: string | null
}): JSX.Element {
  const { onImported } = props
  const targetFolderId = props.targetFolderId ?? null
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null)
  const [dragging, setDragging] = useState(false)
  // [F-FOLDER-02·E] 导入目标（''=仅入文献库）：默认随 folder 筛选态联动重置
  // （主控细化口径——筛选切走即换默认，用户显式选择只活到下次筛选变化）
  const [target, setTarget] = useState('')
  useEffect(() => setTarget(targetFolderId ?? ''), [targetFolderId])
  // 文件夹名解析（folders.list 自取静态参考数据——计数非本面语义，仅取名）：
  // targetFolderId 变化（本页筛选切换/新建后选中）+folders.changed（他页变更）
  // 双触发重取——挂载单取会漏掉挂载后新建的文件夹名
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])
  useEffect(() => {
    void loadFolders()
  }, [loadFolders, targetFolderId])
  useEffect(
    () => apiEvents.onFoldersChanged(() => void loadFolders()),
    [loadFolders]
  )
  const targetName = folders?.find((f) => f.id === targetFolderId)?.name
  // busy 全局信号（S2 消费源——文件夹区/图切换器禁切）
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
      // [F-FOLDER-02·E] 目标=当前文件夹→逐 imported 论文移动挂接（moveFolder
      // 移动语义：未归档→folder 自动建节点——「导入到文件夹=节点自动建」）；
      // 失败逐篇 toast 继续（S1 闸拒绝等场景——文献已入库，归属失败可见）
      if (result.imported.length > 0 && target !== '') {
        for (const p of result.imported) {
          try {
            await unwrap(api.papers.moveFolder({ paperId: p.id, toFolderId: target }))
          } catch (e) {
            showToast(
              e instanceof ApiClientError
                ? `文献已入库但移入文件夹失败：${e.message}`
                : '文献已入库但移入文件夹失败',
              'error'
            )
          }
        }
      }
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
      mode === 'dialog' ? () => api.import_.fromDialog({}) : () => api.import_.fromFolder({})
    )
  }

  // 拖拽悬停高亮（D1）；导入动作在 drop 落点（handleDrop）
  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    setDragging(true)
  }

  // 拖拽导入（P7E-02）：busy 短路提示（D5，零 invoke）；否则 File 列表交 preload 桥
  // ——解析/.pdf 滤/数量上限全在 preload 堆内，路径串零接触 renderer（INV-54）
  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault() // 同时阻止浏览器默认打开文件
    setDragging(false)
    if (busyRef.current) {
      showToast(IMPORT_BUSY_HINT, 'info')
      return
    }
    const files = [...e.dataTransfer.files]
    void runImport(() => window.apiDrag.importDropped(files))
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
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => startButtonImport('dialog')}
        >
          导入 PDF 文件
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => startButtonImport('folder')}
        >
          导入文件夹
        </Button>
        {/* [F-FOLDER-02·E]「导入到」选择器（拆件 ImportTargetSelect——组件 250
            行红线；与导入按钮同行=零垂直增量，dropzone 高度变化会挤压详情抽屉
            可视高——tag-input e2e 实证） */}
        <ImportTargetSelect
          value={target}
          folderId={targetFolderId}
          folderName={targetName}
          disabled={busy}
          onChange={setTarget}
        />
      </div>
      {busy && (
        <p role="status" className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {progress !== null ? progressText(progress) : '正在打开选择窗口…'}
        </p>
      )}
    </div>
  )
}
