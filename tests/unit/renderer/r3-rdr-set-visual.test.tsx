// @vitest-environment jsdom
/**
 * [R3-RDR+R3-SET+T3-P4] 阅读器周边+设置页视觉 —— 渲染级断言+theme-reader.css
 * 材质文本锁（library-cards.test 同口径：CSS 字面断言防漂移）。always-active 裸
 * describe（K3——不经 guardedDescribe 守卫）。
 *
 * 覆盖四面：①ReaderToolbar 工具栏（T3-P4 金族退役→mockup .toolbar：panel 底
 * +line 下缘；.rdr-tool-btn 28px 图标钮语汇）②TabBar（T3-P4→mockup .tabbar：
 * line-soft 条+圆角顶 tab+active panel 底+inset accent 底缘；关闭叉 hover token
 * 承载）③侧栏节标 accent 左缘（.rdr-aside-h4 金→accent）④SettingsPage 分节卡
 * （panel+radius-l+shadow-1）+金节标（h2 金左缘条）+节间菱形分隔（DiamondRule
 * ——settings 域非 T3-P4 票面，金族保活）。
 * 行为/aria/testid 零变面由既有锁定测试护栏（tab-bar/reader-toolbar-icons/
 * reader-notes-panel/corpus-export 等）——本文件只锁新视觉语法。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

/** SettingsPage 渲染链隔离：api/Toast 桩+两个自持节组件桩（行为面各有己测锁定） */
makeApiStub({ settings: { get: vi.fn(async () => ({ ok: true, data: null })) } })
vi.mock('../../../src/renderer/features/settings/CorpusExportSection', () => ({
  CorpusExportSection: () => null
}))
vi.mock('../../../src/renderer/features/settings/ZcodeLinkSection', () => ({
  ZcodeLinkSection: () => null
}))

import { makeTab } from '../../utils/factories'
import { ReaderToolbar } from '../../../src/renderer/features/reader/view/ReaderToolbar'
import { TabBar } from '../../../src/renderer/features/reader/view/TabBar'
import { SettingsPage } from '../../../src/renderer/features/settings/SettingsPage'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'

// act() 环境声明（library-cards 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom 环境 CSS 文本读取走 cwd 相对路径（theme.test 的 URL 法仅 node 环境可用）
// [F-CSS-01] 拆件再锚：阅读器周边+设置卡皮肤段自 theme.css 迁 theme-reader.css
const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-reader.css'), 'utf8')

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

/** ready 态完整 tab 形状（tab-bar.test 同配方） */
describe('T3-P4 ReaderToolbar —— panel 底工具栏皮肤（mockup .toolbar 语汇）', () => {
  it('工具条根挂 rdr-toolbar 类；theme-reader.css 值面=--panel 底+--line 下缘（金族退役：无 glass 无 blur）', () => {
    mount(
      <ReaderToolbar
        page={0}
        totalPages={10}
        zoom={1}
        color="yellow"
        onNavigate={() => undefined}
        onZoom={() => undefined}
        onColor={() => undefined}
      />
    )
    const bar = host?.firstElementChild as HTMLElement
    expect(bar, '工具条根元素应在场').toBeDefined()
    expect(bar.className, '工具栏类钩 rdr-toolbar 应挂在根').toContain('rdr-toolbar')
    // 材质文本锁（theme.test 同口径）：值漂移/误删即红——T3-P4 金族退役换
    // mockup .toolbar 值面（panel 底+line 下缘；padding/gap 由组件类承载）
    expect(cssTheme, '工具栏底=--panel').toMatch(/\.rdr-toolbar\s*\{[^}]*background:\s*var\(--panel\)/)
    expect(cssTheme, '工具栏下缘=--line').toMatch(/\.rdr-toolbar\s*\{[^}]*border-bottom:\s*1px solid var\(--line\)/)
    // 金族退役负锚（阅读器皮肤域回填即红；--gold 系仅 .syn-settings 段保活）
    expect(cssTheme, '阅读器域 panel-glass 消费应清零').not.toContain('panel-glass')
    expect(cssTheme, '阅读器域 border-gold 消费应清零').not.toContain('border-gold')
    // 门一回炉（k2-N6）：--gold 本词消费负锚（旧 .rdr-aside-h4 即此形态——.rdr-*
    // 规则体内回填即红；.syn-settings 段=settings 域合法驻留同文件，精确锚不误伤）
    expect(cssTheme, '阅读器 .rdr-* 规则 var(--gold) 消费应清零').not.toMatch(
      /\.rdr-[a-z-]+\s*\{[^}]*var\(--gold\)/
    )
  })

  it('图标钮 .rdr-tool-btn 语汇：28px 方格+7px 圆角+hover line-soft+on 态 accent-soft 底+inset accent ring', () => {
    // 值面=mockup .tb-btn/.tb-btn.on（L152-154 逐值）
    expect(cssTheme, '基形 28px 方格+7px 圆角').toMatch(
      /\.rdr-tool-btn\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*border-radius:\s*7px;/
    )
    expect(cssTheme, 'hover=line-soft 底').toMatch(
      /\.rdr-tool-btn:not\(:disabled\):hover\s*\{[^}]*background:\s*var\(--line-soft\)/
    )
    expect(cssTheme, 'on 态=accent-soft 底+inset accent ring').toMatch(
      /\.rdr-tool-btn\.on\s*\{[^}]*background:\s*var\(--accent-soft\);[^}]*box-shadow:\s*inset 0 0 0 1px var\(--accent\)/
    )
    // 门一回炉（d1-W1/k2-W1）：on∩hover 交汇=accent-soft 保持（mockup 源序 on 胜出
    // 语义——:not(:disabled) 计权倒挂由升特异性规则闭合）
    expect(cssTheme, 'on 态悬停保 accent-soft 底').toMatch(
      /\.rdr-tool-btn\.on:not\(:disabled\):hover\s*\{[^}]*background:\s*var\(--accent-soft\)/
    )
  })
})

describe('T3-P4 TabBar —— mockup .tabbar 语汇（line-soft 条+圆角顶 tab+active accent 底缘）', () => {
  beforeEach(() => {
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    useNotesStore.setState({ noteByPaper: {} })
  })

  it('容器挂 rdr-tabbar；active tab 挂 rdr-tab-active（非 active 不挂）；值面=34px line-soft 条+圆角顶 tab+panel 底+inset accent 底缘', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-2'
    })
    mount(<TabBar />)
    const bar = host?.firstElementChild as HTMLElement
    expect(bar, 'tabbar 根元素应在场').toBeDefined()
    expect(bar.className, '容器挂 rdr-tabbar 条类').toContain('rdr-tabbar')
    const tabs = [...(host?.querySelectorAll('[role="tab"]') ?? [])] as HTMLElement[]
    expect(tabs).toHaveLength(2)
    expect(tabs[1]?.className, 'active tab 应挂 active 类').toContain('rdr-tab-active')
    expect(tabs[0]?.className, '非 active 不挂').not.toContain('rdr-tab-active')
    expect(tabs[0]?.className, 'tab 基类 rdr-tab 应挂').toContain('rdr-tab')
    // 材质文本锁（mockup .tabbar/.tab/.tab.active L142-146 逐值；active 底缘=
    // box-shadow inset 零占位手法——jsdom 可断言形态，::after 伪元素不可测）
    expect(cssTheme, '条=line-soft 底+--line 下缘').toMatch(
      /\.rdr-tabbar\s*\{[^}]*background:\s*var\(--line-soft\);[^}]*border-bottom:\s*1px solid var\(--line\);/
    )
    expect(cssTheme, 'tab=圆角顶 7px+透明边+下缘 none').toMatch(
      /\.rdr-tab\s*\{[^}]*border-radius:\s*7px 7px 0 0;[^}]*border-bottom:\s*none;/
    )
    expect(cssTheme, 'active 底=panel+line 边').toMatch(
      /\.rdr-tab-active\s*\{[^}]*background:\s*var\(--panel\);[^}]*border-color:\s*var\(--line\)/
    )
    expect(cssTheme, 'active 底缘=inset accent 2px').toMatch(
      /\.rdr-tab-active\s*\{[^}]*inset 0 -2px 0 0 var\(--accent\)/
    )
    // 关闭叉 hover=token 承载（旧 bg-black/10 硬编码退役）
    expect(cssTheme, '关闭叉 hover=line-soft').toMatch(
      /\.rdr-tab-close:not\(:disabled\):hover\s*\{[^}]*background:\s*var\(--line-soft\)/
    )
  })
})

describe('T3-P4 阅读器侧栏 —— accent 左缘节标（金族退役）', () => {
  it('theme-reader.css .rdr-aside-h4 左缘=var(--accent)（ReaderNotesPanel 消费同享）', () => {
    expect(cssTheme, '节标左缘=accent').toMatch(
      /\.rdr-aside-h4\s*\{[^}]*border-left:\s*3px solid var\(--accent\)/
    )
  })
})

describe('R3-U4 SettingsPage —— 分节卡+金节标+节间菱形分隔', () => {
  it('根挂 syn-settings；分节卡值面=panel+radius-l+shadow-1；h2 金左缘条节标；节间 DiamondRule 在场', () => {
    mount(<SettingsPage />)
    const page = host?.firstElementChild as HTMLElement
    expect(page, '设置页根元素应在场').toBeDefined()
    expect(page.className, '设置页根应挂 syn-settings 作用域类').toContain('syn-settings')
    expect(page.querySelectorAll('section').length, '分节（section）≥2').toBeGreaterThanOrEqual(2)
    expect(page.querySelector('.lib-rule'), '节间菱形分隔（DiamondRule）应在场').not.toBeNull()
    // 材质文本锁：作用域皮肤（> section 直达自持节——CorpusExportSection 等
    // 票面外文件零触碰的同视觉收敛法）
    expect(cssTheme, '分节卡底=panel').toMatch(/\.syn-settings > section\s*\{[^}]*background:\s*var\(--panel\)/)
    expect(cssTheme, '分节卡圆角=radius-l').toMatch(/\.syn-settings > section\s*\{[^}]*var\(--radius-l\)/)
    expect(cssTheme, '分节卡阴影=shadow-1').toMatch(/\.syn-settings > section\s*\{[^}]*var\(--shadow-1\)/)
    // R2-SH2 决5：衬线消费清零（.syn-settings h2 font-family 删，回继承 UI 字体）
    // ——旧「衬线+金左缘条」形态锁随裁决改写为负锚（与 theme.test 负锚同向）
    expect(cssTheme, '金节标衬线消费已清零（决5）').not.toMatch(
      /\.syn-settings h2\s*\{[^}]*var\(--font-display\)/
    )
    expect(cssTheme, '金节标左缘条用 --gold').toMatch(/\.syn-settings h2\s*\{[^}]*3px solid var\(--gold\)/)
  })
})
