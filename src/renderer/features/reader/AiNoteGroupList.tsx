// b3: P7-G
/**
 * AiNoteGroupList —— AI 笔记分节列表（纯展示+单击定位上抛+组内三段折叠）。
 *
 * question 分组（呈现轴=AI_NOTE_QUESTIONS 单源序——呈现轴转置 2026-08-28
 * 缺陷 F，用户口径「问题N 分组+组内一审/二审/裁决分段」）：组头=「第N问：
 * 原始命题」（QUESTION_LABEL：QUESTION_TEXT 拼接——2026-08-28 复测三问题 P2
 * 组头对号；divergence 无原文保持短标签）+QUESTION_
 * COLOR 左缘色条；组内条目按 role 分段标注（ROLE_LABEL 单源一审/二审/裁决
 * +ROLE_ORDER 组内序）+七问分色色点（QUESTION_COLOR 单源——ai-note-style
 * INV-11）；条目=锚定段引用块+content_md 纯文本呈现（负面清单「Markdown
 * 富文本编辑器」红线——md 不渲染只展示）；只读零写路径（INV-19）。
 * 单击→onLocate(note)——locateAnchor 单入口消费方（INV-20）；exact 层接缝
 * 声明见 AiNotesSection 头注（AI-09 交付 data-ai-note-id 渲染节点+
 * anchor-locate 延展）。highlightAiNoteId=AI-09 标注单击反向同步高亮
 * 消费面（C-05 同型）。
 *
 * 组内三段折叠（F-N1 2026-08-31，用户口径：裁决=最终结论优先呈现，
 * 一审/二审=过程证据默认收起降噪）：段头 button（段名+条数「一审(3)」
 * +aria-expanded+▾/▸ 文本图标，键盘可达=按钮原生）；默认态
 * =ROLE_DEFAULT_EXPANDED（一审/二审 collapsed、裁决 expanded）；折叠只藏
 * 视觉不删数据（条目数在段头可见）；无该段数据不渲染空段头；组整体折叠
 * 态零变（无——组级本无折叠）。折叠 state=本组件内 overrides（受控 per
 * `${question}:${role}` 段，缺省回落默认态；B1 回炉受控化），不持久化；
 * 换文献（paperId 变）经组 key 重挂载回默认（F-N1 §4）。
 *
 * B1 高亮自动展开（门一回炉裁决 2026-08-31）：highlightAiNoteId 命中的
 * 条目若在折叠段→**先自动展开该段**再滚动定位+既有 data-highlight 高亮
 * （点 AI 标注块=最强「需要核对」信号，不接受手动展开）；信号去重
 * （scrolledForRef）保「notes 更新不重滚」不变量+不与用户随后手动收起
 * 拉锯。边界：面板未打开时不自动开面板（开面板归 OutlineAside/宿主既有
 * 信号链——本组件只在已挂载面板内生效，申报此边界）。
 */
import { useEffect, useRef, useState } from 'react'
import { AI_NOTE_QUESTIONS } from '@shared/models/ai-note'
import type { AiNote, AiNoteQuestion, AiNoteRole } from '@shared/models/ai-note'
import { QUESTION_COLOR, QUESTION_LABEL, QUESTION_TEXT, ROLE_LABEL, ROLE_ORDER } from './anchors/ai-note-style'

/** question 分组（呈现序=AI_NOTE_QUESTIONS；空组剔除；组内条目按 ROLE_ORDER 排序） */
export function groupNotes(notes: AiNote[]): Array<{ question: AiNoteQuestion; items: AiNote[] }> {
  return AI_NOTE_QUESTIONS.map((question) => ({
    question,
    items: notes
      .filter((n) => n.question === question)
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
  })).filter((g) => g.items.length > 0)
}

/** 段默认折叠态（F-N1 §0 态空间表：一审/二审=过程证据默认折叠，裁决=最终结论默认展开） */
const ROLE_DEFAULT_EXPANDED: Record<AiNoteRole, boolean> = {
  'first-read': false,
  'second-read': false,
  adjudicate: true
}

/** 段折叠态覆盖表键（per 组 per 段——B1 受控化） */
type SectionKey = `${AiNoteQuestion}:${AiNoteRole}`

const sectionKey = (question: AiNoteQuestion, role: AiNoteRole): SectionKey => `${question}:${role}`

/** 组内单 role 段：段头折叠器+条目列表（条目渲染逻辑与分段前逐字同——只条件隐藏） */
function RoleSection(props: {
  role: AiNoteRole
  items: AiNote[]
  expanded: boolean
  onToggle(): void
  onLocate(note: AiNote): void
  highlightAiNoteId: string | null
}): JSX.Element {
  const { role, items, expanded, onToggle, onLocate, highlightAiNoteId } = props
  return (
    <>
      <button
        type="button"
        data-role-section={role}
        aria-expanded={expanded}
        className="mt-0.5 flex w-full items-center gap-1 border-0 bg-transparent px-1 py-0.5 text-left text-xs"
        style={{ color: 'var(--text-dim)' }}
        onClick={onToggle}
      >
        <span aria-hidden>{expanded ? '▾' : '▸'}</span>
        {`${ROLE_LABEL[role]}(${items.length})`}
      </button>
      {expanded &&
        items.map((n) => {
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
    </>
  )
}

export function AiNoteGroupList(props: {
  notes: AiNote[]
  onLocate(note: AiNote): void
  highlightAiNoteId?: string | null
}): JSX.Element {
  const { notes, onLocate, highlightAiNoteId = null } = props
  const groups = groupNotes(notes)
  const rootRef = useRef<HTMLDivElement>(null)
  // 换文献回默认：组 key 掺 paperId（F-N1 §4——重挂载重置段折叠态）
  const paperKey = notes[0]?.paperId ?? ''
  /** 段折叠态覆盖（B1 受控化：缺省回落 ROLE_DEFAULT_EXPANDED——默认态单源不裂） */
  const [overrides, setOverrides] = useState<Partial<Record<SectionKey, boolean>>>({})
  const expandedOf = (question: AiNoteQuestion, role: AiNoteRole): boolean =>
    overrides[sectionKey(question, role)] ?? ROLE_DEFAULT_EXPANDED[role]
  /** 已滚动定位的信号值（B1：一次信号一滚——notes 更新/手动 toggle 不重滚不拉锯） */
  const scrolledForRef = useRef<string | null>(null)

  // 高亮条目自动展开+滚动进视野（AI-09 单击反向同步——FragmentNotesList 同型；
  // B1 回炉：目标在折叠段→先展开该段（setState）→overrides 入 deps 本 effect
  // 复跑→再滚动定位；条目 data-highlight 高亮随渲染自带）
  useEffect(() => {
    if (highlightAiNoteId == null || rootRef.current === null) return
    if (scrolledForRef.current === highlightAiNoteId) return
    const target = notes.find((n) => n.id === highlightAiNoteId)
    if (target === undefined) return
    const key = sectionKey(target.question, target.role)
    if ((overrides[key] ?? ROLE_DEFAULT_EXPANDED[target.role]) !== true) {
      setOverrides((prev) => ({ ...prev, [key]: true }))
      return // 展开重渲后复跑本 effect 再滚动
    }
    const el = rootRef.current.querySelector(`[data-ai-note-id="${highlightAiNoteId}"]`)
    if (el === null) return
    scrolledForRef.current = highlightAiNoteId
    el.scrollIntoView({ block: 'nearest' })
  }, [highlightAiNoteId, overrides, notes])

  return (
    <div className="flex flex-col gap-1" data-testid="ai-note-groups" ref={rootRef}>
      {groups.map((g) => (
        <div key={`${paperKey}:${g.question}`} data-question={g.question}>
          <h4
            className="m-0 pl-1 text-xs font-medium"
            style={{ borderLeft: `3px solid ${QUESTION_COLOR[g.question]}`, color: 'var(--text-dim)' }}
          >
            {g.question === 'divergence'
              ? QUESTION_LABEL[g.question]
              : `${QUESTION_LABEL[g.question]}：${QUESTION_TEXT[g.question]}`}
          </h4>
          {ROLE_ORDER.map((role) => {
            const sectionItems = g.items.filter((n) => n.role === role)
            if (sectionItems.length === 0) return null
            return (
              <RoleSection
                key={role}
                role={role}
                items={sectionItems}
                expanded={expandedOf(g.question, role)}
                onToggle={() => {
                  const next = !expandedOf(g.question, role)
                  setOverrides((prev) => ({ ...prev, [sectionKey(g.question, role)]: next }))
                }}
                onLocate={onLocate}
                highlightAiNoteId={highlightAiNoteId}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
