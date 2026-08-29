// @vitest-environment jsdom
/**
 * [R3-RDR+R3-SET] 阅读器周边+设置页视觉重制 —— 渲染级断言+theme.css 材质
 * 文本锁（library-cards.test 同口径：CSS 字面断言防漂移）。always-active 裸
 * describe（K3——不经 guardedDescribe 守卫）。
 *
 * 覆盖三面：①ReaderToolbar 玻璃浮层（--panel-glass+blur10+金 hairline 底缘）
 * ②TabBar 纸面 tab+active 金 hairline 底缘 ③SettingsPage 分节卡
 * （panel+radius-l+shadow-1）+金节标（h2 金左缘条）+节间菱形分隔（DiamondRule）。
 * 行为/aria/testid 零变面由既有锁定测试护栏（tab-bar/reader-notes-panel/
 * corpus-export 等）——本文件只锁新视觉语法。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

/** SettingsPage 渲染链隔离：api/Toast 桩+两个自持节组件桩（行为面各有己测锁定） */
const { stubApi, toastSpy } = vi.hoisted(() => ({
  stubApi: { settings: { get: vi.fn(async () => ({ ok: true, data: null })) } },
  toastSpy: vi.fn()
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})
vi.mock('../../../src/renderer/features/settings/CorpusExportSection', () => ({
  CorpusExportSection: () => null
}))
vi.mock('../../../src/renderer/features/settings/ZcodeLinkSection', () => ({
  ZcodeLinkSection: () => null
}))

import { ReaderToolbar } from '../../../src/renderer/features/reader/ReaderToolbar'
import { TabBar } from '../../../src/renderer/features/reader/TabBar'
import { SettingsPage } from '../../../src/renderer/features/settings/SettingsPage'
import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'

// act() 环境声明（library-cards 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom 环境 CSS 文本读取走 cwd 相对路径（theme.test 的 URL 法仅 node 环境可用）
const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')

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
function makeTab(id: string): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false
  }
}

describe('R3-U3 ReaderToolbar —— 玻璃浮层皮肤（装饰浓度最低：仅皮肤零布局变）', () => {
  it('工具条根挂 rdr-toolbar 玻璃浮层类；theme.css 值面=--panel-glass+blur10+金 hairline 底缘', () => {
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
    expect(bar.className, '玻璃浮层类钩 rdr-toolbar 应挂在根').toContain('rdr-toolbar')
    // 材质文本锁（theme.test 同口径）：值漂移/误删即红
    expect(cssTheme, '玻璃底=--panel-glass').toMatch(/\.rdr-toolbar\s*\{[^}]*background:\s*var\(--panel-glass\)/)
    expect(cssTheme, 'blur 10px').toMatch(/\.rdr-toolbar\s*\{[^}]*backdrop-filter:\s*blur\(10px\)/)
    expect(cssTheme, '金 hairline 底缘').toMatch(/\.rdr-toolbar\s*\{[^}]*var\(--border-gold\)/)
  })
})

describe('R3-U3 TabBar —— 纸面 tab+active 金 hairline 底缘', () => {
  beforeEach(() => {
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    useNotesStore.setState({ noteByPaper: {} })
  })

  it('active tab 挂 rdr-tab-active 类（非 active 不挂）；theme.css 值面=纸面底+inset 金底缘', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-2'
    })
    mount(<TabBar />)
    const tabs = [...(host?.querySelectorAll('[role="tab"]') ?? [])] as HTMLElement[]
    expect(tabs).toHaveLength(2)
    expect(tabs[1]?.className, 'active tab 应挂金缘类').toContain('rdr-tab-active')
    expect(tabs[0]?.className, '非 active 不挂').not.toContain('rdr-tab-active')
    // 材质文本锁：纸面底（--panel 非旧 accent-soft 满铺）+金 hairline 底缘（inset
    // 零占位——h-8 布局零变，F-05 滚动收敛面不扰动）
    expect(cssTheme, 'active 底=纸面 panel').toMatch(/\.rdr-tab-active\s*\{[^}]*background:\s*var\(--panel\)/)
    expect(cssTheme, '金 hairline 底缘').toMatch(/\.rdr-tab-active\s*\{[^}]*inset 0 -2px 0 0 var\(--border-gold\)/)
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
    expect(cssTheme, '金节标=衬线+金左缘条').toMatch(/\.syn-settings h2\s*\{[^}]*var\(--font-display\)/)
    expect(cssTheme, '金节标左缘条用 --gold').toMatch(/\.syn-settings h2\s*\{[^}]*3px solid var\(--gold\)/)
  })
})
