// b3: P7-G
/**
 * AiNoteGroupList —— AI 笔记分节列表（纯展示+单击定位上抛）。
 *
 * role 三组中文标签（ROLE_LABEL 单源）×组内 question 条目（七问分色
 * QUESTION_COLOR 单源——ai-note-style INV-11）；条目=锚定段引用块+
 * content_md 纯文本呈现（负面清单「Markdown 富文本编辑器」红线——md 不渲染
 * 只展示）；只读零写路径（INV-19）。单击→onLocate(note)——locateAnchor
 * 单入口消费方（INV-20）；exact 层接缝声明见 AiNotesSection 头注（AI-09
 * 交付 data-ai-note-id 渲染节点+anchor-locate 延展）。
 * highlightAiNoteId=AI-09 标注单击反向同步高亮消费面（C-05 同型）。
 */
import type { AiNote, AiNoteRole } from '@shared/models/ai-note'
import { QUESTION_COLOR, QUESTION_LABEL, ROLE_LABEL, ROLE_ORDER } from './ai-note-style'

/** role 分组（呈现序=ROLE_ORDER；空组剔除） */
export function groupNotes(notes: AiNote[]): Array<{ role: AiNoteRole; items: AiNote[] }> {
  return ROLE_ORDER.map((role) => ({ role, items: notes.filter((n) => n.role === role) })).filter(
    (g) => g.items.length > 0
  )
}

export function AiNoteGroupList(props: {
  notes: AiNote[]
  onLocate(note: AiNote): void
  highlightAiNoteId?: string | null
}): JSX.Element {
  const { notes, onLocate, highlightAiNoteId = null } = props
  const groups = groupNotes(notes)

  return (
    <div className="flex flex-col gap-1" data-testid="ai-note-groups">
      {groups.map((g) => (
        <div key={g.role} data-role={g.role}>
          <h4 className="m-0 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            {ROLE_LABEL[g.role]}
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
                    {QUESTION_LABEL[n.question]}
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
