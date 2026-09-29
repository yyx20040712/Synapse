// @vitest-environment jsdom
/**
 * [T3-P3] 文献库密度列表 —— 结构锁（渲染级断言+library.css 逐值文本锁）。
 * 值源=docs/design/mockups/2026-09-26_v2_theme-light.html L80-139
 * （.filter-row/.cols/.row 五列/.t-mini 族——.tier 族随档次列 F-LIBUI-01 退役），设计真相源=
 * docs/design/2026-09-26_theme-trio-final-design.md §2 文献库段。
 *
 * 渲染面：PaperList→.lib-cols 五列表头+.lib-row 五路信息列（序号三位零
 * 填充/题名·期刊/年月/引用/标签前 3+折叠+N——档次列 F-LIBUI-01 退役、
 * 序号 # 前缀 F-LIBUI-01 删）；listbox 键盘
 * 导航/单击选中/双击打开行为面零变。页面组装面：.lib-page/.lib-body/
 * .lib-drawer 在场+DiamondRule 库域退役（settings 域消费保留）+
 * corpusSet「导出语料集合」入口退役负锚（F-LIBUI-01 ⑨，D4 裁决）+
 * DrActions 两列 grid CSS 锁（F-LIBUI-01 ⑥）。always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  library: { list: vi.fn(), collections: vi.fn() },
  tags: { list: vi.fn() }
})
const onImportProgressSpy = vi.fn(() => () => undefined)
stubApiEvents({ onImportProgress: onImportProgressSpy })

import { PaperList } from '../../../src/renderer/features/library/PaperList'
import { FilterBar } from '../../../src/renderer/features/library/FilterBar'
import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'
import { DiamondRule } from '../../../src/renderer/shared/ui/DiamondRule'

// act() 环境声明（selection-layer/page-column 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom 环境 import.meta.url 是 http: 协议——CSS 文本读取走 cwd 相对路径
// （theme.test.ts 的 URL 法仅 node 环境可用）。lib-* 规则住 feature 本地
// library.css（theme.css 500 行上限拆分，由 LibraryPage 挂载导入）；
// .lib-rule* 三段住 theme-buttons.css（DiamondRule 语法位——T3-P3 起库域
// 退役、settings 域消费保留，本件续锚防回漂）
const css = readFileSync(join(process.cwd(), 'src/renderer/features/library/library.css'), 'utf8')
const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-buttons.css'), 'utf8')

/** 列表行夹具：默认带年份/期刊/两标签（venue/year/citedByCount 由用例覆写） */
function makeSummary(id: string, patch: Partial<PaperSummary> = {}): PaperSummary {
  return {
    id,
    title: `论文 ${id}`,
    authors: ['张三', '李四'],
    year: 2021,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: ['水锤史', '雷诺数'],
    folderId: null,
    impactFactor: null,
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

/** 指定下标行根元素（.lib-row——密度行按钮根） */
function rowAt(index: number): HTMLElement {
  const rows = host?.querySelectorAll('.lib-row')
  const row = rows?.[index]
  if (!(row instanceof HTMLElement)) throw new Error(`未找到第 ${index} 行 .lib-row`)
  return row
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

describe('T3-P3 密度列表渲染（PaperList 五列结构）', () => {
  it('五列表头在场：.lib-cols 五格文本=编号/题名 · 期刊/年月/引用/标签（档次列 F-LIBUI-01 退役）', async () => {
    await render(
      <PaperList papers={[makeSummary('p1')]} selectedId={null} onSelect={() => undefined} />
    )
    const cols = host?.querySelector('.lib-cols')
    expect(cols).not.toBeNull()
    const cells = Array.from(cols?.querySelectorAll('span') ?? [])
    expect(cells.map((c) => c.textContent)).toEqual([
      '编号',
      '题名 · 期刊',
      '年月',
      '引用',
      '标签'
    ])
    // 列头列宽类逐一在场（46/flex1/74/52/180 与行列对齐）
    for (const cls of ['lib-c-id', 'lib-c-title', 'lib-c-year', 'lib-c-cite', 'lib-c-tags']) {
      expect(cols?.querySelector(`.${cls}`), `表头列类 ${cls}`).not.toBeNull()
    }
    expect(cols?.querySelector('.lib-c-tier'), '档次列头已退役（F-LIBUI-01 ④）').toBeNull()
  })

  it('行五路信息列：001 序号（offset 起算，# 前缀已删 F-LIBUI-01）/题名/期刊斜体副行/年份/引用/标签前 3+折叠 +N', async () => {
    await render(
      <PaperList
        papers={[
          makeSummary('p1', { tagNames: ['甲', '乙', '丙', '丁', '戊'] }),
          makeSummary('p2')
        ]}
        offset={10}
        selectedId={null}
        onSelect={() => undefined}
      />
    )
    const row1 = rowAt(0)
    // 序号=index+offset+1 三位零填充、无 # 前缀（pubNo 派生重排=F-FOLDER-01 票）
    expect(row1.querySelector('.lib-r-id')?.textContent).toBe('011')
    expect(rowAt(1).querySelector('.lib-r-id')?.textContent).toBe('012')
    expect(row1.querySelector('.lib-r-title')?.textContent).toBe('论文 p1')
    expect(row1.querySelector('.lib-r-j')?.textContent).toBe('Journal of Testing')
    expect(row1.querySelector('.lib-r-year')?.textContent).toBe('2021')
    expect(row1.querySelectorAll('.lib-t-mini').length).toBe(3)
    expect(row1.querySelector('.lib-t-more')?.textContent).toBe('+2')
  })

  it('F-TAGS-01 徽标着色（INV-86 三面之三）：tagColorByName 命中=背景 hex22/边框 1px solid hex66；未命中=现状无 inline', async () => {
    await render(
      <PaperList
        papers={[makeSummary('p1')]}
        selectedId={null}
        onSelect={() => undefined}
        tagColorByName={new Map([['水锤史', '#e11d48']])}
      />
    )
    const badges = rowAt(0).querySelectorAll<HTMLElement>('.lib-t-mini')
    expect(badges[0]!.textContent).toBe('水锤史')
    // jsdom 将 hex+alpha 归一 rgba——三元组锚（#e11d48 → 225, 29, 72）
    expect(badges[0]!.style.background, '命中名→着色').toContain('225, 29, 72')
    expect(badges[0]!.style.border).toContain('225, 29, 72')
    // alpha/边框形态锁（R2 d1-W7——三面同源失败锚：防退化自写无 alpha 内联仍绿）
    expect(badges[0]!.style.background).toMatch(/rgba\(225, 29, 72, 0\.13/)
    expect(badges[0]!.style.border).toMatch(/rgba\(225, 29, 72, 0\.4\)/)
    expect(badges[0]!.style.border).toContain('1px solid')
    expect(badges[1]!.style.background, '未命中名→现状零变').toBe('')
  })

  it('空 venue：期刊副行不渲染（空隐藏契约沿旧卡语义）；空题名回退「（无标题）」', async () => {
    await render(
      <PaperList
        papers={[makeSummary('p1', { venue: '   ' }), makeSummary('p2', { title: '  ' })]}
        selectedId={null}
        onSelect={() => undefined}
      />
    )
    expect(rowAt(0).querySelector('.lib-r-j')).toBeNull()
    expect(rowAt(1).querySelector('.lib-r-title')?.textContent).toBe('（无标题）')
  })

  it('缺值列：年份 null→「—」；引用 citedByCount 缺→「—」/有值→数字', async () => {
    await render(
      <PaperList
        papers={[makeSummary('p1', { year: null }), makeSummary('p2', { citedByCount: 17 })]}
        selectedId={null}
        onSelect={() => undefined}
      />
    )
    expect(rowAt(0).querySelector('.lib-r-year')?.textContent).toBe('—')
    expect(rowAt(0).querySelector('.lib-r-cite')?.textContent).toBe('—')
    expect(rowAt(1).querySelector('.lib-r-cite')?.textContent).toBe('17')
  })

  it('F-LIBUI-01 ④ 档次列退役负锚：行内无 .lib-r-tier/.lib-tier 元素（venueToTier 库保留——lineage join 与 corpus manifest 两消费点不触）', async () => {
    await render(
      <PaperList
        papers={[makeSummary('p1', { venue: 'Nature Water' })]}
        selectedId={null}
        onSelect={() => undefined}
      />
    )
    expect(rowAt(0).querySelector('.lib-r-tier'), '档次单元格已退役').toBeNull()
    expect(rowAt(0).querySelector('.lib-tier'), '档次徽章已退役（T1 命中 venue 也不渲染）').toBeNull()
    expect(rowAt(0).querySelector('.lib-r-id')?.textContent, '序号列零变（001 三位零填充无 #）').toBe('001')
  })

  it('交互零变：单击→onSelect(id)；双击→onOpen(id)；选中行挂 sel 类', async () => {
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
    expect(rowAt(1).classList.contains('sel')).toBe(true)
    expect(rowAt(0).classList.contains('sel')).toBe(false)
    act(() => {
      rowAt(0).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith('p1')
    act(() => {
      rowAt(0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(onOpen).toHaveBeenCalledWith('p1')
  })

  it('listbox 键盘导航保活：容器 listbox+行 option/aria-selected；↓ 无选中落首行/Home/End', async () => {
    const onSelect = vi.fn()
    await render(
      <PaperList papers={[makeSummary('p1'), makeSummary('p2')]} selectedId={null} onSelect={onSelect} />
    )
    const listbox = host?.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox?.getAttribute('aria-label')).toBe('文献列表')
    expect(host?.querySelectorAll('[role="option"]').length).toBe(2)
    expect(host?.querySelector('[role="option"][aria-selected="true"]')).toBeNull()
    act(() => {
      listbox?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith('p1')
    act(() => {
      listbox?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(onSelect).toHaveBeenLastCalledWith('p2')
  })

  it('空态文案保活：papers 空→「暂无文献」引导', async () => {
    await render(<PaperList papers={[]} selectedId={null} onSelect={() => undefined} />)
    expect(host?.textContent).toContain('暂无文献')
    expect(host?.textContent).toContain('可拖入 PDF 导入，或调整筛选条件')
  })
})

describe('T3-P3 密度列表 CSS 逐值锁（library.css——mockup L80-139 誊录）', () => {
  it('表头列宽：46/flex1/74/52/180+gap 14px+10px letter-spacing 1.5px faint（档次 42px 列 F-LIBUI-01 退役）', () => {
    expect(css, 'c-id 46px').toMatch(/\.lib-c-id\s*\{[^}]*width:\s*46px/)
    expect(css, 'c-title flex:1').toMatch(/\.lib-c-title\s*\{[^}]*flex:\s*1/)
    expect(css, 'c-year 74px 右对齐').toMatch(/\.lib-c-year\s*\{[^}]*width:\s*74px;[^}]*text-align:\s*right/)
    expect(css, 'c-cite 52px 右对齐').toMatch(/\.lib-c-cite\s*\{[^}]*width:\s*52px;[^}]*text-align:\s*right/)
    expect(css, 'c-tags 180px').toMatch(/\.lib-c-tags\s*\{[^}]*width:\s*180px/)
    expect(css, '.lib-cols gap 14px+letter-spacing 1.5px+faint').toMatch(
      /\.lib-cols\s*\{[^}]*gap:\s*14px;[^}]*letter-spacing:\s*1\.5px;[^}]*var\(--faint\)/
    )
  })

  it('hover 皮肤：panel 底+shadow-card+信号橙游标线（2.5px left 18px top/bottom 12px 圆角 2px）', () => {
    expect(css).toMatch(/\.lib-row:hover\s*\{[^}]*background:\s*var\(--panel\);[^}]*var\(--shadow-card\)/)
    expect(css, '游标线（mockup .row:hover::before 逐值）').toMatch(
      /\.lib-row:hover::before\s*\{[^}]*left:\s*18px;[^}]*top:\s*12px;[^}]*bottom:\s*12px;[^}]*width:\s*2\.5px;[^}]*border-radius:\s*2px;[^}]*background:\s*var\(--signal\)/
    )
  })

  it('选中皮肤：sel=inset 1.5px accent 描边+左缘条 3.5px left0+外辉 token 单源', () => {
    expect(css).toMatch(
      /\.lib-row\.sel\s*\{[^}]*background:\s*var\(--panel\);[^}]*inset 0 0 0 1\.5px var\(--accent\), var\(--shadow-sel-glow\)/
    )
    expect(css, '左缘条（mockup .row.sel::before 逐值）').toMatch(
      /\.lib-row\.sel::before\s*\{[^}]*left:\s*0;[^}]*top:\s*10px;[^}]*bottom:\s*10px;[^}]*width:\s*3\.5px;[^}]*background:\s*var\(--accent\)/
    )
    // sel 规则源序在 :hover 之后（同命中时选中态赢——层叠保证）
    expect(css.indexOf('.lib-row.sel')).toBeGreaterThan(css.indexOf('.lib-row:hover'))
  })

  it('列值排印：r-id mono caption/r-title strong nowrap ellipsis/r-year·cite mono body tabular-nums', () => {
    expect(css).toMatch(/\.lib-r-id\s*\{[^}]*font-family:\s*var\(--mono\);[^}]*font-size:\s*var\(--fs-caption\)/)
    expect(css).toMatch(/\.lib-r-title\s*\{[^}]*font-size:\s*var\(--fs-strong\);[^}]*text-overflow:\s*ellipsis/)
    expect(css).toMatch(
      /\.lib-r-year,\s*\.lib-r-cite\s*\{[^}]*font-family:\s*var\(--mono\);[^}]*font-size:\s*var\(--fs-body\);[^}]*font-variant-numeric:\s*tabular-nums/
    )
  })

  it('F-LIBUI-01 ④⑤⑨ 退役负锚（方案切换=删除旧方案）：tier 列族/后置徽章/集合导出钮 CSS 零残留', () => {
    expect(css, '表头档次列宽类已删').not.toContain('.lib-c-tier')
    expect(css, '行内档次单元格类已删').not.toContain('.lib-r-tier')
    expect(css, '档次徽章族已删（含 t1/t2/t3/none）').not.toContain('.lib-tier')
    expect(css, 'AI 评估后置徽章类已删（行随关联节退役）').not.toContain('.lib-postpone')
    expect(css, '「导出语料集合」按钮类已删（corpusSet 退役）').not.toContain('.lib-export-btn')
  })

  it('F-LIBUI-01 ⑥ 动作区两列 grid：.lib-dr-actions repeat(2,1fr)+gap 8px；primary 首行跨两列', () => {
    expect(css, 'actions 容器 grid 化（flex-wrap 退役）').toMatch(/\.lib-dr-actions\s*\{[^}]*display:\s*grid/)
    expect(css, '两列等宽轨道').toMatch(/\.lib-dr-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/)
    expect(css, '钮间 8px 量级沿用').toMatch(/\.lib-dr-actions\s*\{[^}]*gap:\s*8px/)
    expect(css, 'primary 跨两列（首行整行）').toMatch(/\.lib-dr-btn-primary\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/)
  })

  it('旧卡片族退役负锚（方案切换=删除旧方案）：网格/卡片/角饰/宝石位零残留', () => {
    expect(css).not.toContain('.lib-grid')
    expect(css).not.toContain('.lib-card')
    expect(css).not.toContain('.lib-corner')
    expect(css).not.toContain('.lib-tag')
  })

  it('筛选行语汇：search 290px+shadow-card；chip 99px 圆角+on 态 accent-soft；sort 8px 圆角', () => {
    expect(css).toMatch(/\.lib-search\s*\{[^}]*width:\s*290px;[^}]*var\(--shadow-card\)/)
    expect(css).toMatch(/\.lib-chip\s*\{[^}]*border-radius:\s*99px/)
    expect(css).toMatch(
      /\.lib-chip-on\s*\{[^}]*border-color:\s*var\(--accent\);[^}]*color:\s*var\(--accent\);[^}]*background:\s*var\(--accent-soft\);[^}]*font-weight:\s*600/
    )
    expect(css).toMatch(/\.lib-sort\s*\{[^}]*border-radius:\s*8px/)
  })

  it('门一回炉批锁：sort-on 筛选生效态+搜索焦点环+表头 sticky 共容器+定宽列 flex:none+抽屉空态居中', () => {
    // d1-W1：集合/年份下拉筛选生效可见性（accent 描边+accent 字）
    expect(css).toMatch(/\.lib-sort-on\s*\{[^}]*border-color:\s*var\(--accent\);[^}]*color:\s*var\(--accent\)/)
    // d1-W2：搜索框键盘焦点环（focus-within 承接 input outline:none）
    expect(css).toMatch(/\.lib-search:focus-within\s*\{[^}]*border-color:\s*var\(--accent\)/)
    // d1-W6/k1-N1：表头驻滚动容器 sticky（与行共享内容盒——滚动条/收缩两态同位）
    expect(css).toMatch(/\.lib-cols\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*background:\s*var\(--bg\)/)
    expect(css, '定宽列表头列与行侧一致不收缩（d1-N5 回炉补全五格）').toMatch(/\.lib-c-id\s*\{[^}]*width:\s*46px;[^}]*flex:\s*none/)
    expect(css).toMatch(/\.lib-c-year\s*\{[^}]*width:\s*74px;[^}]*flex:\s*none/)
    expect(css).toMatch(/\.lib-c-cite\s*\{[^}]*width:\s*52px;[^}]*flex:\s*none/)
    expect(css).toMatch(/\.lib-c-tags\s*\{[^}]*width:\s*180px;[^}]*flex:\s*none/)
    // k1-N2：键盘导航行滚入预留 sticky 表头高度
    expect(css).toMatch(/\.lib-list \[role='option'\]\s*\{[^}]*scroll-margin-top:\s*28px/)
    // d1-W5：空态居中锁（旧 .lib-detail-empty 居中断言同强度后继）
    expect(css).toMatch(/\.lib-dr-empty\s*\{[^}]*align-items:\s*center/)
  })
})

describe('T3-P3 LibraryPage 组装（页面布局+DiamondRule 库域退役）', () => {
  it('.lib-page/.lib-cols/.lib-list/.lib-drawer 在场；DiamondRule 库域退役（.lib-rule 零挂载）', async () => {
    await render(<LibraryPage />)
    expect(host?.querySelector('.lib-page')).not.toBeNull()
    expect(host?.querySelector('.lib-body')).not.toBeNull()
    expect(host?.querySelector('.lib-cols')).not.toBeNull()
    expect(host?.querySelector('.lib-list')).not.toBeNull()
    // d1 复审 N1 回炉：表头驻 .lib-list 内（sticky 吸附链的结构前提——回退兄弟位即红）
    expect(host?.querySelector('.lib-list .lib-cols')).not.toBeNull()
    const drawer = host?.querySelector('.lib-drawer')
    expect(drawer).not.toBeNull()
    // DiamondRule 退役：库域不再挂菱形分隔（settings 域消费保留在彼处）
    expect(host?.querySelector('.lib-rule')).toBeNull()
  })

  it('d1 复审 N1 回炉：空列表态表头随之隐去（空态=整区引导，无残表头）', async () => {
    stubApi.library.list.mockResolvedValueOnce({ ok: true, data: { items: [], total: 0 } })
    await render(<LibraryPage />)
    expect(host?.querySelector('.lib-cols')).toBeNull()
    expect(host?.textContent).toContain('暂无文献')
  })

  it('F-LIBUI-01 ⑨ corpusSet 退役负锚：「导出语料集合」按钮不在场（D4 裁决——设置页 corpusSession 五件套零触碰）', async () => {
    await render(<LibraryPage />)
    const btn = [...(host?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '导出语料集合'
    )
    expect(btn, '导出语料集合按钮已退役（通道三方收窄）').toBeUndefined()
  })

  it('门一回炉批（d1-W1）：集合/年份下拉筛选生效挂 .lib-sort-on；清除即摘', async () => {
    const base = { sort: 'added_desc', offset: 0, limit: 50 } as const
    await render(
      <FilterBar
        query={{ ...base, folderScope: { kind: 'folder', folderId: 'c-1' }, year: 2024 }}
        onChange={() => undefined}
      />
    )
    const byCollection = host?.querySelector('select[aria-label="按文件夹筛选"]')
    const byYear = host?.querySelector('select[aria-label="按年份筛选"]')
    expect(byCollection?.classList.contains('lib-sort-on')).toBe(true)
    expect(byYear?.classList.contains('lib-sort-on')).toBe(true)
    await render(<FilterBar query={{ ...base }} onChange={() => undefined} />)
    expect(
      host?.querySelector('select[aria-label="按文件夹筛选"]')?.classList.contains('lib-sort-on')
    ).toBe(false)
    expect(
      host?.querySelector('select[aria-label="按年份筛选"]')?.classList.contains('lib-sort-on')
    ).toBe(false)
    // d1 复审 W9：排序下拉=视图态非条件态，永不挂 on（旧「排序不挂」负锚豁免后回植）
    expect(
      host?.querySelector('select[aria-label="排序方式"]')?.classList.contains('lib-sort-on')
    ).toBe(false)
  })
})

// [T3-P3] 邻面保活三件：DiamondRule 库域退役（settings 域消费保留）后
// 组件与 theme-buttons.css 语法位仍在——原 describe 归位续锚（describe 路径
// 入指纹键，改名即断基线配对——test-surface 口径）
describe('R3-LIB 菱形分隔线（筛选区与列表之间）', () => {
  it('DiamondRule 渲染：渐隐线×2+◆菱形+装饰 aria-hidden（渲染级存在性）', async () => {
    await render(<DiamondRule />)
    const rule = host?.querySelector('.lib-rule')
    expect(rule).not.toBeNull()
    expect(rule?.getAttribute('aria-hidden')).toBe('true')
    expect(rule?.querySelectorAll('.lib-rule-line').length).toBe(2)
    expect(rule?.querySelector('.lib-rule-gem')).not.toBeNull()
  })
})

describe('R3-LIB library.css 材质文本锁（卡片/网格/分隔——mockup 逐值）', () => {
  it('菱形分隔窄窗防碰撞：line min-width 24px+flex:1；gem rotate(45deg)（注意事项③）', () => {
    // 回炉 W3：.lib-rule* 迁共享语法位（R3-U4 复用依赖;F-CSS-01 起住
    // theme-buttons.css）
    expect(cssTheme).toMatch(/\.lib-rule-line\s*\{[^}]*min-width: 24px/)
    expect(cssTheme).toMatch(/\.lib-rule-line\s*\{[^}]*flex: 1/)
    expect(cssTheme).toMatch(/\.lib-rule-gem\s*\{[^}]*rotate\(45deg\)/)
  })
})

describe('R3-LIB 回炉一（门一 3B+3W）', () => {
  it('W3 共享位：theme-buttons.css 含 .lib-rule 三段（line-l/line-r/gem 渐隐线语法）', () => {
    expect(cssTheme).toMatch(/\.lib-rule-line-l\s*\{[^}]*linear-gradient\(90deg, transparent, var\(--border-gold\)\)/)
    expect(cssTheme).toMatch(/\.lib-rule-line-r\s*\{[^}]*linear-gradient\(90deg, var\(--border-gold\), transparent\)/)
    expect(cssTheme).toMatch(/\.lib-rule-gem\s*\{[^}]*background: var\(--gold\)/)
  })
})
