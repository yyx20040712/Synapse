/**
 * [SR-NOTE-01] NotesPanel —— 笔记面板（工单：done / weak）
 *
 * ── 行为层 ──
 * - 每篇文献一篇 Markdown 笔记：标题输入 + textarea 正文（等宽字体）
 * - 载入 api.notes.get（经 notes.store.load，失败 toast + 载入重试）；
 *   加载中不禁用输入（store 有编辑期保护：发起后的 edit 不被响应覆盖），
 *   仅加载失败禁用；面板已切文献时迟到的失败不再作用（发起时记 paperId）
 * - 自动保存防抖 1.5s（内容变化后 store.saveSoon → api.notes.save）
 * - 保存状态指示（deriveSaveStatus 四态：保存中/保存失败/未保存/已保存）：
 *   "未保存"来自 store 的 pending 镜像（草稿含未落库编辑）——合并落地窗口、
 *   防抖窗口内切走切回（remount）均不误显"已保存"；失败判定=保存周期结束
 *   （saving true→false）而 savedAt 未推进（store 契约 INV-04），重试=再次 saveSoon
 *
 * ── 接口层 ──
 * - export function NotesPanel(props: { paperId: string }): JSX.Element
 *
 * ── 架构层 ──
 * - 消费 notes.store；面板自身只持"未保存/失败"的本地派生态（state 形状冻结在
 *   store 契约里，不扩字段）
 * - 消费方：PaperDetailPanel（打开笔记入口，随其工单装配）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - v1 纯 textarea（不引入 Markdown 预览/编辑器库——依赖预算）
 */
import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { NOTE_TITLE_MAX } from '@shared/ipc/schemas'
import { useNotesStore } from './notes.store'

// 保存状态推导已下沉 renderer/shared（C-03——阅读器 ReaderNotesPanel 共治
// 同一显示诚实性契约）；此处 re-export 保库侧既有消费方编译（C-06 随本面板删除）
export { deriveSaveStatus, detectSaveFailed } from '../../shared/save-status'
export type { SaveStatus } from '../../shared/save-status'
import { deriveSaveStatus, detectSaveFailed } from '../../shared/save-status'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const LOAD_FAILED = '笔记加载失败'

/** 标题接近上限计数器的显示阈（UI 显示策略，面板本地派生不自立字面量） */
const TITLE_WARN = Math.floor(NOTE_TITLE_MAX * 0.9)

export function NotesPanel(props: { paperId: string }): JSX.Element {
  const { paperId } = props
  const entry = useNotesStore((s) => s.noteByPaper[paperId])
  const load = useNotesStore((s) => s.load)
  const edit = useNotesStore((s) => s.edit)
  const saveSoon = useNotesStore((s) => s.saveSoon)

  const [loadFailed, setLoadFailed] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const saving = entry?.saving ?? false
  const savedAt = entry?.savedAt ?? null
  const pending = entry?.pending ?? false
  // 上一帧的 saving/savedAt：判定"保存周期结束而 savedAt 未推进 = 失败"
  const prevSaving = useRef(false)
  const prevSavedAt = useRef<string | null>(null)
  // 最新 paperId（迟到回调比对用）：面板已切文献时，旧请求的失败不得禁用当前输入框
  const paperIdRef = useRef(paperId)
  paperIdRef.current = paperId

  /** 载入（失败 toast + 重试态）；首挂与载入重试按钮共用 */
  const runLoad = (): void => {
    setLoadFailed(false)
    const requestedId = paperId
    load(paperId).catch((e: unknown) => {
      if (requestedId !== paperIdRef.current) return // 迟到失败：面板已切文献，忽略
      setLoadFailed(true)
      showToast(e instanceof ApiClientError ? e.message : LOAD_FAILED, 'error')
    })
  }

  useEffect(() => {
    runLoad()
  }, [paperId, load])

  useEffect(() => {
    // 周期终点判定走 detectSaveFailed（单一判定点，纯函数锁定）；非终点帧不动
    // 失败态。saveFailed 只在本判定点与用户动作（编辑/重试）清除——savedAt 的前进
    // 来源含合并落地（服务器值），不能证明本面板周期成功；记账无条件进行。
    // "未保存"显示不在本地推，一律由 store 的 pending 镜像给出（见 deriveSaveStatus）
    const verdict = detectSaveFailed(prevSaving.current, saving, prevSavedAt.current, savedAt)
    if (verdict !== null) {
      setSaveFailed(verdict)
    }
    prevSaving.current = saving
    prevSavedAt.current = savedAt
  }, [saving, savedAt])

  /** 编辑入口：写 store 草稿（pending 镜像随 edit 置 true）+ 重排防抖自动保存 */
  const onEdit = (patch: { title?: string; contentMd?: string }): void => {
    setSaveFailed(false)
    edit(paperId, patch)
    saveSoon(paperId)
  }

  const status = deriveSaveStatus(saving, saveFailed, pending)
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }
  const titleLength = entry?.title.length ?? 0

  return (
    <div className="flex h-full flex-col gap-2 p-3 text-sm">
      <div className="flex items-center gap-2">
        <input
          aria-label="笔记标题"
          className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
          style={inputStyle}
          value={entry?.title ?? ''}
          disabled={loadFailed}
          maxLength={NOTE_TITLE_MAX}
          title={`标题最长 ${NOTE_TITLE_MAX} 字`}
          onChange={(e) => onEdit({ title: e.target.value })}
        />
        {titleLength > TITLE_WARN && (
          <span className="shrink-0 text-xs" style={{ color: 'var(--danger)' }}>
            {titleLength}/{NOTE_TITLE_MAX}
          </span>
        )}
        {/* 加载中（entry 未到）不显示保存状态——四态无一为真，显示即误导；
            正文区另有"笔记加载中…"覆盖层 */}
        {entry !== undefined && (
          <span
            className="shrink-0 text-xs"
            style={{ color: saveFailed ? 'var(--danger)' : 'var(--text-dim)' }}
            role="status"
          >
            {status}
          </span>
        )}
        {saveFailed && (
          <button
            type="button"
            className="shrink-0 rounded border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => {
              setSaveFailed(false)
              saveSoon(paperId)
            }}
          >
            重试
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <textarea
          aria-label="笔记正文"
          className="h-full w-full resize-none rounded border p-2 font-mono text-sm"
          style={inputStyle}
          value={entry?.contentMd ?? ''}
          disabled={loadFailed}
          onChange={(e) => onEdit({ contentMd: e.target.value })}
        />
        {/* 草稿未到（加载中）的正文区提示：覆盖层实现——quality 关卡封禁原生提示属性的字样 */}
        {entry === undefined && !loadFailed && (
          <span
            className="pointer-events-none absolute left-[9px] top-[9px] font-mono text-sm"
            style={{ color: 'var(--text-dim)' }}
          >
            笔记加载中…
          </span>
        )}
      </div>
      {loadFailed && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          <span>{LOAD_FAILED}</span>
          <button
            type="button"
            className="rounded border px-2 py-0.5"
            style={{ borderColor: 'var(--border)' }}
            onClick={runLoad}
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}
