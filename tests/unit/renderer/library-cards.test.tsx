// @vitest-environment jsdom
/**
 * [R3-LIB] 文献库视觉重制 —— 卡片网格+菱形分隔+空 venue 隐藏（渲染级断言）
 * + theme.css 材质文本锁（theme.test.ts 同口径：CSS 字面断言防漂移）。
 *
 * 渲染面：PaperList→.lib-grid 卡片网格；卡根 .lib-card（渐变材质类钩）+
 * L 角饰 span×2；空 venue 条件渲染省略（mockup .venue:empty 的 DOM 等价）；
 * 单击选中/双击打开交互零变（按钮根元素契约）。页面组装面：LibraryPage 在
 * 筛选区与列表之间挂 DiamondRule（菱形语法：渐隐线×2+◆，装饰 aria-hidden）。
 * always-active 裸 describe（K3：不经 guardedDescribe 守卫）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, onImportProgressSpy, toastSpy } = vi.hoisted(() => ({
  stubApi: {
    library: { list: vi.fn(), collections: vi.fn() },
    tags: { list: vi.fn() }
  },
  onImportProgressSpy: vi.fn(() => () => undefined),
  toastSpy: vi.fn()
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi as unknown as typeof clientModule.api,
    apiEvents: { onImportProgress: onImportProgressSpy } as unknown as typeof clientModule.apiEvents
  }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { PaperList } from '../../../src/renderer/features/library/PaperList'
import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'
import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'
import { FilterBar } from '../../../src/renderer/features/library/FilterBar'
import { DiamondRule } from '../../../src/renderer/shared/ui/DiamondRule'

// act() 环境声明（selection-layer/page-column 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom 环境 import.meta.url 是 http: 协议——CSS 文本读取走 cwd 相对路径
// （theme.test.ts 的 URL 法仅 node 环境可用）。lib-* 规则住 feature 本地
// library.css（theme.css 500 行上限拆分，由 LibraryPage 挂载导入）；
// .lib-rule* 三段住 theme.css（回炉 W3：R3-U4 复用依赖的共享语法位）
const css = readFileSync(join(process.cwd(), 'src/renderer/features/library/library.css'), 'utf8')
const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')

/** 列表卡夹具：默认带年份/期刊/两标签（venue 空与 year 空由用例覆写） */
function makeSummary(id: string, patch: Partial<PaperSummary> = {}): PaperSummary {
  return {
    id,
    title: `论文 ${id}`,
    authors: ['张三', '李四'],
    year: 2021,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: ['水锤史', '雷诺数'],
    collectionNames: [],
    annotationCount: 6,
    noteCount: 22,
    lastReadPage: 0,
    addedAt: '2026-01-01T00:00:00Z',
    ...patch
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

function firstCard(): HTMLElement {
  const card = host?.querySelector('.lib-card')
  if (!(card instanceof HTMLElement)) throw new Error('未找到 .lib-card 卡根')
  return card
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom 未实现 scrollIntoView（PaperList 选中滚入 effect 的宿主 API 缺位）
  Element.prototype.scrollIntoView = () => undefined
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [makeSummary('p1')], total: 1 } })
  stubApi.library.collections.mockResolvedValue({ ok: true, data: [] })
  stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('R3-LIB 文献卡渲染（PaperList 卡片网格）', () => {
  it('卡根挂渐变材质类 lib-card，L 角饰元素×2（tl+br）在场', async () => {
    const onSelect = vi.fn()
    await render(
      <PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={onSelect} />
    )
    const card = firstCard()
    expect(card.classList.contains('lib-card')).toBe(true)
    const corners = card.querySelectorAll('.lib-corner')
    expect(corners.length).toBe(2)
    expect(card.querySelector('.lib-corner-tl')).not.toBeNull()
    expect(card.querySelector('.lib-corner-br')).not.toBeNull()
    // 装饰性角饰不参与可达性
    for (const c of Array.from(corners)) {
      expect(c.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('空 venue：期刊元素不渲染；有值：venue 类在场（空隐藏契约）', async () => {
    await render(
      <PaperList
        papers={[makeSummary('p1'), makeSummary('p2', { venue: '   ' })]}
        selectedId={null}
        onSelect={() => undefined}
      />
    )
    const cards = Array.from(host?.querySelectorAll('.lib-card') ?? [])
    expect(cards.length).toBe(2)
    const withVenue = cards[0]?.querySelector('.lib-card-venue')
    expect(withVenue?.textContent).toBe('Journal of Testing')
    expect(cards[1]?.querySelector('.lib-card-venue')).toBeNull()
  })

  it('年份衬线类+题名两行截断类+标签胶囊类+meta tabular-nums 类在场', async () => {
    await render(
      <PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />
    )
    const card = firstCard()
    expect(card.querySelector('.lib-card-year')?.textContent).toBe('2021')
    expect(card.querySelector('.lib-card-title')?.textContent).toBe('论文 p1')
    expect(card.querySelectorAll('.lib-tag').length).toBe(2)
    expect(card.querySelector('.lib-card-meta')).not.toBeNull()
  })

  it('交互零变：单击→onSelect(id)；双击→onOpen(id)；选中卡挂 lib-card-selected', async () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()
    await render(
      <PaperList
        papers={[makeSummary('p1'), makeSummary('p2')]}
        selectedId="p2"
        onSelect={onSelect}
        onOpen={onOpen}
      />
    )
    const cards = Array.from(host?.querySelectorAll('.lib-card') ?? [])
    expect(cards[1]?.classList.contains('lib-card-selected')).toBe(true)
    const target = cards[0]
    if (!(target instanceof HTMLElement)) throw new Error('卡根缺失')
    act(() => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith('p1')
    act(() => {
      target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(onOpen).toHaveBeenCalledWith('p1')
  })
})

describe('R3-LIB 菱形分隔线（筛选区与列表之间）', () => {
  it('DiamondRule 渲染：渐隐线×2+◆菱形+装饰 aria-hidden（渲染级存在性）', async () => {
    await render(<DiamondRule />)
    const rule = host?.querySelector('.lib-rule')
    expect(rule).not.toBeNull()
    expect(rule?.getAttribute('aria-hidden')).toBe('true')
    expect(rule?.querySelectorAll('.lib-rule-line').length).toBe(2)
    expect(rule?.querySelector('.lib-rule-gem')).not.toBeNull()
  })

  it('LibraryPage 组装：菱形分隔挂在筛选区之后、列表网格之前（页面级存在性）', async () => {
    await render(<LibraryPage />)
    const rule = host?.querySelector('.lib-rule') ?? null
    const grid = host?.querySelector('.lib-grid') ?? null
    expect(rule).not.toBeNull()
    expect(grid).not.toBeNull()
    if (rule === null || grid === null) throw new Error('unreachable')
    // DOM 位置：rule 先于 grid（分隔语义=筛选区|列表）
    expect(rule.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('R3-LIB library.css 材质文本锁（卡片/网格/分隔——mockup 逐值）', () => {
  it('卡片渐变材质：168° 渐变+inset 顶高光+background-clip:padding-box（亚像素缝隙锁）', () => {
    expect(css, '.lib-card 渐变（mockup .card 逐值）').toMatch(/\.lib-card\s*\{[^}]*linear-gradient\(168deg/)
    expect(css, 'inset 顶高光').toMatch(/\.lib-card\s*\{[^}]*inset 0 1px 0 rgba\(255, 255, 255, 0\.9\)/)
    expect(css, '背景裁到 padding-box（定稿注意事项②）').toMatch(
      /\.lib-card\s*\{[^}]*background-clip: padding-box/
    )
  })

  it('网格容器：repeat(auto-fill, minmax(340px, 1fr))', () => {
    expect(css).toMatch(/\.lib-grid\s*\{[^}]*repeat\(auto-fill, minmax\(340px, 1fr\)\)/)
  })

  it('hover 升档：金 hairline 描边+translateY(-1px)+shadow-2+角饰显形', () => {
    expect(css).toMatch(/\.lib-card:hover\s*\{[^}]*var\(--shadow-2\)/)
    expect(css).toMatch(/\.lib-card:hover\s*\{[^}]*translateY\(-1px\)/)
    expect(css).toMatch(/\.lib-card:hover\s*\{[^}]*var\(--border-gold\)/)
    expect(css, 'hover 角饰显形（金描边）').toMatch(/\.lib-card:hover \.lib-corner\s*\{[^}]*var\(--gold\)/)
  })

  it('菱形分隔窄窗防碰撞：line min-width 24px+flex:1；gem rotate(45deg)（注意事项③）', () => {
    // 回炉 W3：.lib-rule* 迁 theme.css（共享语法位——R3-U4 复用依赖）
    expect(cssTheme).toMatch(/\.lib-rule-line\s*\{[^}]*min-width: 24px/)
    expect(cssTheme).toMatch(/\.lib-rule-line\s*\{[^}]*flex: 1/)
    expect(cssTheme).toMatch(/\.lib-rule-gem\s*\{[^}]*rotate\(45deg\)/)
  })
})

describe('R3-LIB 回炉一（门一 3B+3W）', () => {
  it('R3 空年份：year 槽渲染 9px 淡金 ◆（min-width 44px 对齐槽）；有年份无 ◆', async () => {
    await render(
      <PaperList
        papers={[makeSummary('p1'), makeSummary('p2', { year: null })]}
        selectedId={null}
        onSelect={() => undefined}
      />
    )
    const cards = Array.from(host?.querySelectorAll('.lib-card') ?? [])
    expect(cards[0]?.querySelector('.lib-card-year-gem')).toBeNull()
    const gem = cards[1]?.querySelector('.lib-card-year-gem')
    expect(gem?.getAttribute('aria-hidden')).toBe('true')
    expect(cards[1]?.querySelector('.lib-card-year')?.textContent).toBe('')
    expect(css, '9px 淡金 ◆（gem 尺寸锁）').toMatch(/\.lib-card-year-gem\s*\{[^}]*width: 9px/)
    expect(css).toMatch(/\.lib-card-year-gem\s*\{[^}]*rotate\(45deg\)/)
  })

  it('R4 详情空态：.lib-detail-empty 复用 DiamondRule×2+文案逐字保留', async () => {
    await render(<PaperDetailPanel paperId={null} />)
    const empty = host?.querySelector('.lib-detail-empty')
    expect(empty).not.toBeNull()
    expect(empty?.querySelectorAll('.lib-rule').length).toBe(2)
    expect(host?.textContent).toContain('选中列表中的文献后显示详情')
    expect(css, '空态居中').toMatch(/\.lib-detail-empty\s*\{[^}]*align-items: center/)
  })

  it('R5 选中卡材质：渐变不覆盖+金描边+inset 金 ring .45+shadow-2+角饰常显（两档于 hover）', () => {
    // 渐变保留=.lib-card-selected 段不声明 background（继承 .lib-card 渐变），
    // 锁「不覆盖」形态：段内不得出现 background 覆盖声明
    const seg = css.match(/\.lib-card-selected\s*\{[^}]*\}/)?.[0] ?? ''
    expect(seg).toContain('border-color: var(--gold)')
    expect(seg).toContain('inset 0 0 0 1px rgba(201, 168, 106, 0.45)')
    expect(seg).toContain('var(--shadow-2)')
    expect(seg, '选中段不得平色覆盖渐变（门一独立裁）').not.toMatch(/background: var\(--accent-soft\)/)
    expect(css, '角饰常显').toMatch(/\.lib-card-selected \.lib-corner\s*\{[^}]*var\(--gold\)/)
    // 选中段源序在 :hover 之后（叠加时 selected 赢——两档语义的层叠保证）
    const hoverAt = css.indexOf('.lib-card:hover')
    const selectedAt = css.indexOf('.lib-card-selected')
    expect(selectedAt).toBeGreaterThan(hoverAt)
  })

  it('W2 chips active：有筛选值挂 lib-chip-on；排序不挂（视图非条件）', async () => {
    await render(
      <FilterBar
        query={{ sort: 'added_desc', offset: 0, limit: 50, collectionId: 'c1', year: 2021 }}
        onChange={() => undefined}
      />
    )
    const chips = Array.from(host?.querySelectorAll('.lib-chip') ?? []) as HTMLElement[]
    expect(chips.length).toBe(4)
    expect(chips[0]?.tagName).toBe('INPUT')
    expect(chips[1]?.classList.contains('lib-chip-on')).toBe(true)
    expect(chips[2]?.classList.contains('lib-chip-on')).toBe(true)
    expect(chips[3]?.classList.contains('lib-chip-on')).toBe(false)
    expect(css, 'on 态镜像 mockup .chip.on').toMatch(
      /\.lib-chip-on\s*\{[^}]*var\(--accent-soft\)[^}]*\}/
    )
    expect(css).toMatch(/\.lib-chip-on\s*\{[^}]*border-color: var\(--accent\)/)
  })

  it('R1+R2 材质微调：dropzone 透明底落纸面；题名 14px/600、venue 11px、meta 10.5px', () => {
    expect(css).toMatch(/\.lib-dropzone\s*\{[^}]*background: transparent/)
    expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-size: 14px/)
    expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-weight: 600/)
    expect(css).toMatch(/\.lib-card-venue\s*\{[^}]*font-size: 11px/)
    expect(css).toMatch(/\.lib-card-meta\s*\{[^}]*font-size: 10\.5px/)
  })

  it('W3 共享位：theme.css 含 .lib-rule 三段（line-l/line-r/gem 渐隐线语法）', () => {
    expect(cssTheme).toMatch(/\.lib-rule-line-l\s*\{[^}]*linear-gradient\(90deg, transparent, var\(--border-gold\)\)/)
    expect(cssTheme).toMatch(/\.lib-rule-line-r\s*\{[^}]*linear-gradient\(90deg, var\(--border-gold\), transparent\)/)
    expect(cssTheme).toMatch(/\.lib-rule-gem\s*\{[^}]*background: var\(--gold\)/)
  })
})
