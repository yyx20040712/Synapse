// b3: P7-H
/**
 * LineageSideManualNote —— 侧板人工笔记总评层（LG-04 交付件，
 * LineageSidePanel 区4；C-03 notes/get 数据面复用——只读呈现）。
 *
 * 行为：选中节点 paperId 驱动惰性取数（notes/get→Note|null）；loading/
 * error+重试/空态（null=「暂无人工笔记」非错误——INV-02 列表型）/
 * contentMd 纯文本呈现（负面清单红线——md 不渲染只展示）。stale 守卫
 * 同 LineageSideAiNotes（请求序号）。无跳转交互（无锚语义，票面测试面
 * 仅 AI 条目——见 LineageSidePanel 实现注）。
 */
import { useEffect, useState } from 'react'
import { api, unwrap } from '../../api/client'
import type { Note } from '@shared/models/note'

type Phase = 'loading' | 'ready' | 'error'

export function LineageSideManualNote(props: { paperId: string }): JSX.Element {
  const { paperId } = props
  const [note, setNote] = useState<Note | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState('')
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let seq = 0
    setPhase('loading')
    unwrap(api.notes.get({ paperId }))
      .then((data) => {
        if (seq !== 0) return
        setNote(data)
        setPhase('ready')
      })
      .catch((e: unknown) => {
        if (seq !== 0) return
        setMessage(e instanceof Error ? e.message : String(e))
        setPhase('error')
      })
    return () => {
      seq = 1
    }
  }, [paperId, retryTick])

  return (
    <section data-testid="lineage-side-manual-note" className="flex flex-col gap-1">
      <h4 className="m-0 font-medium" style={{ color: 'var(--text-dim)' }}>人工笔记</h4>
      {phase === 'loading' && <p className="m-0" style={{ color: 'var(--text-dim)' }}>人工笔记加载中…</p>}
      {phase === 'error' && (
        <div
          role="alert"
          data-testid="lineage-side-note-error"
          className="flex items-center gap-2 rounded border px-2 py-1"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>人工笔记加载失败：{message}</span>
          <button
            type="button"
            data-action="retry"
            className="rounded px-1"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={() => setRetryTick((t) => t + 1)}
          >
            重试
          </button>
        </div>
      )}
      {phase === 'ready' &&
        (note === null ? (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>暂无人工笔记</p>
        ) : (
          <p className="m-0 whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{note.contentMd}</p>
        ))}
    </section>
  )
}
