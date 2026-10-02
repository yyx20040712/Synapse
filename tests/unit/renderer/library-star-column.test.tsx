// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U4] 星标占位列（P-9/P-10——DB 窗口前=静态禁用占位：
 * 淡色 ★ 字形、aria-hidden、零交互零 cursor 变化；布局锚稳定——F-STAR-01
 * 点亮即激活[退出条件]。无 props 开关——PaperRow 直加列）。覆盖：PaperRow
 * 行首星标 span+PaperList 表头 ★ 列；aria-hidden；无星标菜单项（不渲染禁用
 * 项=零死交互）；五列既有语义零变（INV-73——编号/题名/年月/引用/标签俱在）。
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'
import { PaperList } from '../../../src/renderer/features/library/PaperList'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeSummary(id: string): PaperSummary {
  return {
    id,
    title: `论文 ${id}`,
    authors: [],
    year: 2021,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: ['甲'],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    folderId: null,
    impactFactor: null
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-01 U4 星标占位列（P-9 静态禁用占位）', () => {
  it('行首星标 span（.lib-r-star ★ aria-hidden）+表头 ★ 首列（.lib-c-star）——批 A 恒淡色零交互', async () => {
    await render(<PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />)
    const head = host?.querySelector('.lib-cols')
    expect(head?.querySelector('.lib-c-star'), '表头 ★ 列在场').not.toBeNull()
    expect(head?.querySelector('.lib-c-star')?.getAttribute('aria-hidden')).toBe('true')
    const row = host?.querySelector('.lib-row')
    const star = row?.querySelector('.lib-r-star')
    expect(star, '行首星标 span 在场').not.toBeNull()
    expect(star?.getAttribute('aria-hidden')).toBe('true')
    expect(star?.textContent).toBe('★')
  })

  it('五列既有语义零变（INV-73）：编号/题名 · 期刊/年月/引用/标签列表头俱在', async () => {
    await render(<PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />)
    const cells = Array.from(host?.querySelectorAll('.lib-cols span') ?? []).map((c) => c.textContent)
    expect(cells).toEqual(['★', '编号', '题名 · 期刊', '年月', '引用', '标签'])
  })

  it('星标零交互：无 onClick 独立钮形态（span 非按钮——P-10 菜单星标项不渲染的行内对应面）', async () => {
    await render(<PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />)
    const star = host?.querySelector('.lib-r-star')
    expect(star instanceof HTMLSpanElement, '星标=纯 span（无按钮交互面）').toBe(true)
  })
})
