/**
 * [SR-NOTE-01] NotesPanel —— 笔记面板（工单：done / weak）
 *
 * ── 行为层 ──
 * - 每篇文献一篇 Markdown 笔记：标题输入 + textarea 正文（等宽字体）
 * - 载入 api.notes.get（经 notes.store.load，失败 toast + 载入重试）；
 *   自动保存防抖 1.5s（内容变化后 store.saveSoon → api.notes.save）
 * - 保存状态指示：已保存 / 保存中… / 失败重试按钮——保存周期结束（saving
 *   true→false）而 savedAt 未推进即判失败（store 契约：失败不推进 savedAt），
 *   重试= 再次 saveSoon
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
import { useNotesStore } from './notes.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const LOAD_FAILED = '笔记加载失败'

export function NotesPanel(props: { paperId: string }): JSX.Element {
  const { paperId } = props
  const entry = useNotesStore((s) => s.noteByPaper[paperId])
  const load = useNotesStore((s) => s.load)
  const edit = useNotesStore((s) => s.edit)
  const saveSoon = useNotesStore((s) => s.saveSoon)

  const [loadFailed, setLoadFailed] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const saving = entry?.saving ?? false
  const savedAt = entry?.savedAt ?? null
  // 上一帧的 saving/savedAt：判定"保存周期结束而 savedAt 未推进 = 失败"
  const prevSaving = useRef(false)
  const prevSavedAt = useRef<string | null>(null)

  /** 载入（失败 toast + 重试态）；首挂与载入重试按钮共用 */
  const runLoad = (): void => {
    setLoadFailed(false)
    load(paperId).catch((e: unknown) => {
      setLoadFailed(true)
      showToast(e instanceof ApiClientError ? e.message : LOAD_FAILED, 'error')
    })
  }

  useEffect(() => {
    runLoad()
  }, [paperId, load])

  useEffect(() => {
    if (prevSaving.current && !saving) {
      // 保存周期结束：savedAt 与周期开始前相同 → 这次保存没有落上（失败）
      setSaveFailed(prevSavedAt.current === savedAt)
      setUnsaved(prevSavedAt.current === savedAt)
      prevSaving.current = saving
      return
    }
    prevSaving.current = saving
    if (savedAt !== prevSavedAt.current) {
      prevSavedAt.current = savedAt
      setUnsaved(false)
      setSaveFailed(false)
    }
  }, [saving, savedAt])

  /** 编辑入口：写 store 草稿 + 标记未保存 + 重排防抖自动保存 */
  const onEdit = (patch: { title?: string; contentMd?: string }): void => {
    setSaveFailed(false)
    setUnsaved(true)
    edit(paperId, patch)
    saveSoon(paperId)
  }

  const status = saving ? '保存中…' : saveFailed ? '保存失败' : unsaved ? '未保存' : '已保存'
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    <div className="flex h-full flex-col gap-2 p-3 text-sm">
      <div className="flex items-center gap-2">
        <input
          aria-label="笔记标题"
          className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
          style={inputStyle}
          value={entry?.title ?? ''}
          disabled={entry === undefined || loadFailed}
          onChange={(e) => onEdit({ title: e.target.value })}
        />
        <span
          className="shrink-0 text-xs"
          style={{ color: saveFailed ? 'var(--danger)' : 'var(--text-dim)' }}
          role="status"
        >
          {status}
        </span>
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
      <textarea
        aria-label="笔记正文"
        className="min-h-0 flex-1 resize-none rounded border p-2 font-mono text-sm"
        style={inputStyle}
        value={entry?.contentMd ?? ''}
        disabled={entry === undefined || loadFailed}
        onChange={(e) => onEdit({ contentMd: e.target.value })}
      />
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
