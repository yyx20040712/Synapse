// @vitest-environment jsdom
/**
 * [F-N1] AiNoteGroupList —— 组内三段（一审/二审/裁决）可折叠测试（新增合约）。
 *
 * 覆盖：①默认态（一审/二审 collapsed 条目不在 DOM、裁决 expanded 条目在）
 * ②段头点击展开（条目出现+aria-expanded 真；段间不联动）③再点收起
 * ④段头条数标注「段名(N)」（折叠只藏视觉不删数据——条数在段头可见）
 * ⑤无该段数据不渲染空段头（per-组 per-段）。
 * 折叠=会话级组件内 state，不持久化（刷新/换文献回默认——F-N1 §4）。
 * always-active（ADR-0017 裁决 3，不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'
import type { AiNote, AiNoteRole, AiNoteQuestion } from '../../../src/shared/models/ai-note'
import { AiNoteGroupList } from '../../../src/renderer/features/reader/AiNoteGroupList'

function note(id: string, role: AiNoteRole, question: AiNoteQuestion): AiNote {
  return {
    id,
    paperId: 'p-1',
    annotationId: null,
    role,
    question,
    model: 'test-model',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    anchorPage: 3,
    contentMd: `内容-${id}`,
    createdAt: 't',
    updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(notes: AiNote[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<AiNoteGroupList notes={notes} onLocate={() => undefined} />)
  })
}

/** 段头折叠器按钮（data-role-section=段 role） */
const secBtn = (role: AiNoteRole): HTMLButtonElement | null =>
  (host?.querySelector(`button[data-role-section="${role}"]`) as HTMLButtonElement | null) ?? null

/** 条目按钮（data-ai-note-id=条目 id） */
const item = (id: string): HTMLElement | null => host?.querySelector(`[data-ai-note-id="${id}"]`) ?? null

beforeEach(() => {
  root = null
  host = null
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

it('①默认态：一审/二审条目不在 DOM（collapsed），裁决条目在（expanded）+三段头 aria-expanded 各就位', () => {
  mount([
    note('a1', 'first-read', 'Q1'),
    note('a2', 'first-read', 'Q1'),
    note('b1', 'second-read', 'Q1'),
    note('c1', 'adjudicate', 'Q1')
  ])
  expect(item('a1')).toBeNull()
  expect(item('a2')).toBeNull()
  expect(item('b1')).toBeNull()
  expect(item('c1')).not.toBeNull()
  expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('false')
  expect(secBtn('second-read')?.getAttribute('aria-expanded')).toBe('false')
  expect(secBtn('adjudicate')?.getAttribute('aria-expanded')).toBe('true')
})

it('②点一审段头：条目出现+aria-expanded 真（段间不联动——二审仍收起；再点二审同理展开）', () => {
  mount([note('a1', 'first-read', 'Q1'), note('b1', 'second-read', 'Q1')])
  act(() => {
    secBtn('first-read')?.click()
  })
  expect(item('a1')).not.toBeNull()
  expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('true')
  expect(item('b1')).toBeNull()
  act(() => {
    secBtn('second-read')?.click()
  })
  expect(item('b1')).not.toBeNull()
})

it('③再点一审段头：收起（条目退场+aria-expanded 假）', () => {
  mount([note('a1', 'first-read', 'Q1')])
  act(() => {
    secBtn('first-read')?.click()
  })
  act(() => {
    secBtn('first-read')?.click()
  })
  expect(item('a1')).toBeNull()
  expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('false')
})

it('④段头条数标注：段名(条数)（一审(3)/二审(1)/裁决(1)——折叠只藏视觉不删数据）', () => {
  mount([
    note('a1', 'first-read', 'Q1'),
    note('a2', 'first-read', 'Q1'),
    note('a3', 'first-read', 'Q1'),
    note('b1', 'second-read', 'Q1'),
    note('c1', 'adjudicate', 'Q1')
  ])
  expect(secBtn('first-read')?.textContent).toMatch(/一审\(3\)/)
  expect(secBtn('second-read')?.textContent).toMatch(/二审\(1\)/)
  expect(secBtn('adjudicate')?.textContent).toMatch(/裁决\(1\)/)
})

it('⑥B1 高亮自动展开：highlightAiNoteId 命中折叠段条目（点 AI 标注语义）→段自动展开+该条目滚动进视口+data-highlight', () => {
  const notes = [note('a1', 'first-read', 'Q1'), note('c1', 'adjudicate', 'Q1')]
  mount(notes)
  expect(item('a1')).toBeNull() // 前置：一审默认折叠
  // jsdom 无 scrollIntoView——挂桩记录调用元（finally 还原，不留跨测污染）
  const scrolled: Element[] = []
  const proto = Element.prototype as unknown as Record<string, unknown>
  const hadOwn = 'scrollIntoView' in proto
  const original = proto.scrollIntoView
  proto.scrollIntoView = function (this: Element): void {
    scrolled.push(this)
  }
  try {
    act(() => {
      root?.render(<AiNoteGroupList notes={notes} onLocate={() => undefined} highlightAiNoteId="a1" />)
    })
    expect(item('a1')).not.toBeNull() // 自动展开（门一 B1：点 AI 标注=最强「需要核对」信号）
    expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('true')
    expect(scrolled.map((el) => el.getAttribute('data-ai-note-id'))).toEqual(['a1']) // 滚的是目标条目
    expect(item('a1')?.getAttribute('data-highlight')).toBe('true')
  } finally {
    if (hadOwn) proto.scrollIntoView = original
    else delete proto.scrollIntoView
  }
})

it('⑤无该段数据不渲染空段头（组内无裁决段→无裁决段头；段头缺失 per-组 per-段判定）', () => {
  mount([note('a1', 'first-read', 'Q1'), note('b1', 'second-read', 'Q2')])
  expect(secBtn('adjudicate')).toBeNull()
  const q1 = host?.querySelector('[data-question="Q1"]') ?? null
  const q2 = host?.querySelector('[data-question="Q2"]') ?? null
  expect(q1?.querySelector('button[data-role-section="first-read"]')).not.toBeNull()
  expect(q1?.querySelector('button[data-role-section="second-read"]')).toBeNull()
  expect(q2?.querySelector('button[data-role-section="first-read"]')).toBeNull()
  expect(q2?.querySelector('button[data-role-section="second-read"]')).not.toBeNull()
})
