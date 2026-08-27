// b3: P7-H
/**
 * LineageSideAiNotes —— 侧板 AI 笔记分节（LG-04 交付件，LineageSidePanel 区3）。
 *
 * 行为：选中节点 paperId 驱动惰性取数（ai_sensor.listByPaper——W4 直连
 * window.api 预裁，接缝声明见 LineageSidePanel/ai-notes.store 头注）；
 * loading/error+重试/空态/分节呈现。role 三组中文标签×七问分色=
 * **ai-note-style 单源跨域只读消费**（check-quality COMPOSITION_ROOT_
 * ALLOW 受控例外——分色映射禁本域复写，接缝双向锚定：本行+ai-note-style
 * 头注）；分组逻辑本域重写（AiNoteGroupList 属 reader 域不可引——Rule
 * of Three 第 2 次保持重复）。条目双击上抛（单击无操作——防误触）。
 * stale 守卫：请求序号（选中节点切换后晚到旧响应丢弃——anchor-locate
 * locateSeq 同族思想，票面 N7 校准字面）。
 */
import { useEffect, useState } from 'react'
import { api, unwrap } from '../../api/client'
import type { AiNote, AiNoteRole } from '@shared/models/ai-note'
import { QUESTION_COLOR, QUESTION_LABEL, ROLE_LABEL, ROLE_ORDER } from '../reader/ai-note-style'

type Phase = 'loading' | 'ready' | 'error'

export function LineageSideAiNotes(props: {
  paperId: string
  onNoteDblClick(note: AiNote): void
}): JSX.Element {
  const { paperId, onNoteDblClick } = props
  const [notes, setNotes] = useState<AiNote[] | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState('')
  /** 请求序号 stale 守卫 + 重试计数（retryTick 变化即重发） */
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let seq = 0
    setPhase('loading')
    unwrap(api.ai_sensor.listByPaper({ paperId }))
      .then((data) => {
        if (seq !== 0) return
        setNotes(data)
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
    <section data-testid="lineage-side-ai-notes" className="flex flex-col gap-1">
      <h4 className="m-0 font-medium" style={{ color: 'var(--text-dim)' }}>AI 笔记</h4>
      {phase === 'loading' && <p className="m-0" style={{ color: 'var(--text-dim)' }}>AI 笔记加载中…</p>}
      {phase === 'error' && (
        <div
          role="alert"
          data-testid="lineage-side-ai-error"
          className="flex items-center gap-2 rounded border px-2 py-1"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>AI 笔记加载失败：{message}</span>
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
        (notes === null || notes.length === 0 ? (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>暂无 AI 笔记</p>
        ) : (
          ROLE_ORDER.filter((role) => notes.some((n) => n.role === role)).map((role: AiNoteRole) => (
            <div key={role} data-role={role}>
              <h5 className="m-0 font-medium" style={{ color: 'var(--text-dim)' }}>{ROLE_LABEL[role]}</h5>
              {notes
                .filter((n) => n.role === role)
                .map((n) => (
                  <div
                    key={n.id}
                    data-ai-note-id={n.id}
                    className="mt-0.5 rounded border px-2 py-1"
                    style={{ borderColor: 'var(--border)' }}
                    onDoubleClick={() => onNoteDblClick(n)}
                  >
                    <span className="flex items-center gap-1">
                      <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: QUESTION_COLOR[n.question] }} />
                      <span style={{ color: 'var(--text-dim)' }}>
                        {QUESTION_LABEL[n.question]}
                        {n.anchorPage !== null ? ` · p.${n.anchorPage}` : ''}
                      </span>
                    </span>
                    {n.quoteText !== '' && (
                      <span className="mt-0.5 block truncate" style={{ color: 'var(--text-dim)' }}>{n.quoteText}</span>
                    )}
                    <span className="mt-0.5 block whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{n.contentMd}</span>
                  </div>
                ))}
            </div>
          ))
        ))}
    </section>
  )
}
