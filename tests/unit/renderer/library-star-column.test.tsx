// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U4→F-DBCAMP-01 DB-4 / F-STAR-01 A1 点亮] 星标列
 * （P-9 退出条件兑现：静态禁用占位→可交互——button 语义〔span role=button，
 * 行本体=button 嵌套禁用 HTML 的合法承载〕+title 星标/取消星标+starred 态
 * aria-pressed/on 高亮 class）。覆盖：PaperRow 行首星标交互面+PaperList 表头
 * ★ 列（布局锚不动——票面无排序/筛选面）；五列既有语义零变（INV-73）。
 * [locked-change]（F-DBCAMP-01 DB-4 票面指令改写——原静态禁用断言随 A1 点亮退役）
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'
import { PaperList } from '../../../src/renderer/features/library/PaperList'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeSummary(id: string, isStarred = false): PaperSummary {
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
    folderId: '__main__',
    impactFactor: null,
    isStarred
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

describe('F-STAR-01 A1 星标列点亮（P-9 退出条件）', () => {
  it('表头 ★ 首列（.lib-c-star）布局锚不动（aria-hidden 静态——票面无排序/筛选面）', async () => {
    await render(<PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />)
    const head = host?.querySelector('.lib-cols')
    expect(head?.querySelector('.lib-c-star'), '表头 ★ 列在场').not.toBeNull()
    expect(head?.querySelector('.lib-c-star')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('行首星标交互面：role=button+aria-pressed+title 星标/取消星标（starred 态 on 高亮 class）', async () => {
    await render(
      <PaperList papers={[makeSummary('p1', false), makeSummary('p2', true)]} selectedId={null} onSelect={() => undefined} />
    )
    const rows = Array.from(host?.querySelectorAll('.lib-row') ?? [])
    const off = rows[0]?.querySelector('.lib-r-star')
    expect(off?.getAttribute('role')).toBe('button')
    expect(off?.getAttribute('aria-pressed')).toBe('false')
    expect(off?.getAttribute('title')).toBe('星标')
    expect(off?.classList.contains('on')).toBe(false)
    const on = rows[1]?.querySelector('.lib-r-star')
    expect(on?.getAttribute('aria-pressed')).toBe('true')
    expect(on?.getAttribute('title')).toBe('取消星标')
    expect(on?.classList.contains('on')).toBe(true)
  })

  it('五列既有语义零变（INV-73）：编号/题名 · 期刊/年月/引用/标签列表头俱在', async () => {
    await render(<PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />)
    const cells = Array.from(host?.querySelectorAll('.lib-cols span') ?? []).map((c) => c.textContent)
    expect(cells).toEqual(['★', '编号', '题名 · 期刊', '年月', '引用', '标签'])
  })
})
