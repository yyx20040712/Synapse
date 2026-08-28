// b3: P7-G
/**
 * AiNoteGroupList —— AI 笔记分节列表（纯展示+单击定位上抛）。
 *
 * question 分组（呈现轴=AI_NOTE_QUESTIONS 单源序——呈现轴转置 2026-08-28
 * 缺陷 F，用户口径「问题N 分组+组内一审/二审/裁决分段」）：组头=QUESTION_LABEL+QUESTION_
 * COLOR 左缘色条；组内条目按 role 分段标注（ROLE_LABEL 单源一审/二审/裁决
 * +ROLE_ORDER 组内序）+七问分色色点（QUESTION_COLOR 单源——ai-note-style
 * INV-11）；条目=锚定段引用块+content_md 纯文本呈现（负面清单「Markdown
 * 富文本编辑器」红线——md 不渲染只展示）；只读零写路径（INV-19）。
 * 单击→onLocate(note)——locateAnchor 单入口消费方（INV-20）；exact 层接缝
 * 声明见 AiNotesSection 头注（AI-09 交付 data-ai-note-id 渲染节点+
 * anchor-locate 延展）。highlightAiNoteId=AI-09 标注单击反向同步高亮
 * 消费面（C-05 同型）。
 */
import { useEffect, useRef } from 'react'
import { AI_NOTE_QUESTIONS } from '@shared/models/ai-note'
import type { AiNote, AiNoteQuestion } from '@shared/models/ai-note'
import { QUESTION_COLOR, QUESTION_LABEL, ROLE_LABEL, ROLE_ORDER } from './ai-note-style'

/** question 分组（呈现序=AI_NOTE_QUESTIONS；空组剔除；组内条目按 ROLE_ORDER 排序） */
export function groupNotes(notes: AiNote[]): Array<{ question: AiNoteQuestion; items: AiNote[] }> {
  return AI_NOTE_QUESTIONS.map((question) => ({
    question,
    items: notes
      .filter((n) => n.question === question)
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
  })).filter((g) => g.items.length > 0)
}

export function AiNoteGroupList(props: {
  notes: AiNote[]
  onLocate(note: AiNote): void
  highlightAiNoteId?: string | null
}): JSX.Element {
  const { notes, onLocate, highlightAiNoteId = null } = props
  const groups = groupNotes(notes)
  const rootRef = useRef<HTMLDivElement>(null)

  // 高亮条目滚动进视野（AI-09 单击反向同步——FragmentNotesList 同型：
  // 仅随信号变化触发，notes 更新不重滚）
  useEffect(() => {
    if (highlightAiNoteId == null || rootRef.current === null) return
    const el = rootRef.current.querySelector(`[data-ai-note-id="${highlightAiNoteId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightAiNoteId])

  return (
    <div className="flex flex-col gap-1" data-testid="ai-note-groups" ref={rootRef}>
      {groups.map((g) => (
        <div key={g.question} data-question={g.question}>
          <h4
            className="m-0 pl-1 text-xs font-medium"
            style={{ borderLeft: `3px solid ${QUESTION_COLOR[g.question]}`, color: 'var(--text-dim)' }}
          >
            {QUESTION_LABEL[g.question]}
          </h4>
          {g.items.map((n) => {
            const highlighted = n.id === highlightAiNoteId
            return (
              <button
                type="button"
                key={n.id}
                data-ai-note-id={n.id}
                data-highlight={highlighted}
                className="mt-0.5 block w-full rounded border px-2 py-1 text-left text-xs"
                style={{
                  borderColor: highlighted ? 'var(--accent)' : 'var(--border)',
                  background: highlighted ? 'var(--accent-soft)' : 'transparent'
                }}
                onClick={() => onLocate(n)}
                title={n.quoteText !== '' ? n.quoteText : n.contentMd}
              >
                <span className="flex items-center gap-1">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: QUESTION_COLOR[n.question] }}
                  />
                  <span style={{ color: 'var(--text-dim)' }}>
                    {ROLE_LABEL[n.role]}
                    {n.anchorPage !== null ? ` · p.${n.anchorPage}` : ''}
                  </span>
                </span>
                {n.quoteText !== '' && (
                  <span className="mt-0.5 block truncate" style={{ color: 'var(--text-dim)' }}>
                    {n.quoteText}
                  </span>
                )}
                <span className="mt-0.5 block whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                  {n.contentMd}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
