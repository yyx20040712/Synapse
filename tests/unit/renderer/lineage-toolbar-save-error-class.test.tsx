// @vitest-environment jsdom
/**
 * [回炉 W-C·R-D1 呈现修复] 工具组保存错误行的布局开关——修饰类与样式合约。
 *
 * 背景：保存错误行（.lg-save-error）原与工具钮、drag-hint 同处一个不换行的 flex 行；错误消息含整段
 * UUID 很长，各子项被挤压——[B4 L1 回炉 R-D1] 的出口钮「丢弃这条过期历史」一字一行竖排（高 122px），
 * 1024×768 下整行溢出工具组右缘、落到 lineage-side-panel 之下不可点（W-C 探针实证）。修复=错误行
 * 独占工具组下一行：开关是工具组根节点的修饰类 has-save-error（仅 saveState==='failed' 出现——与
 * 错误行同条件），可换行等布局规则只挂在该类下，无错误行时工具组布局逐项不变。
 *
 * 本文件锁两件事（always-active 裸 describe）：
 * - 修饰类「仅在 failed 态出现」：saved / dirty / saving 态工具组根不带该类；failed 态带且错误行在场；
 *   failed→clean 撤类；browse 模式的 slim 工具组恒不带。
 * - 样式合约（文本锚——jsdom 不做布局；几何面由 e2e tests/e2e/lineage-conflict.spec 的 R-D1 两例承担）：
 *   可换行与 drag-hint 单行省略只挂在修饰类下（基类规则不含 flex-wrap）；错误行占满整行、允许内部换行、
 *   长串可断；行内按钮不伸缩、不折行。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn(), historyUnit: vi.fn() }
})

import { useLineageStore, type LineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-tools.css'), 'utf8')

const MODIFIER = 'has-save-error'

let root: Root | null = null
let host: HTMLDivElement | null = null

/** store 直写经 act（React 订阅渲染同步——防 DOM 滞后一拍）。Partial 局部覆盖=zustand setState 合并
 *  语义——类型面经 as 收窄（lineage-toolbar-session.test 同型：写闸重赋值后的入参类型不含 Partial） */
const setState = (patch: Partial<LineageStore>): void => {
  act(() => {
    useLineageStore.setState(patch as Parameters<typeof useLineageStore.setState>[0])
  })
}

function mount(mode: 'edit' | 'browse' | 'focus'): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageToolbar mode={mode} />)
  })
}

/** 工具组根节点（工具组唯一根=.lg-toolbar） */
const toolbarRoot = (): HTMLElement => {
  const el = host?.querySelector('.lg-toolbar')
  if (!(el instanceof HTMLElement)) throw new Error('工具组根节点未渲染')
  return el
}
const hasModifier = (): boolean => toolbarRoot().classList.contains(MODIFIER)

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  useLineageStore.setState({
    nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [],
    unfinalized: false, editRevision: 0, folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], tool: 'select', paletteFor: null })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('[回炉 W-C·R-D1 呈现修复] 工具组修饰类 has-save-error 仅在 failed 态出现', () => {
  it('saved 态（Q0 无在途 U0）：工具组根=lg-toolbar tools，不带修饰类，无错误行', () => {
    mount('edit')
    expect(toolbarRoot().className).toBe('lg-toolbar tools')
    expect(hasModifier()).toBe(false)
    expect(host?.querySelector('[data-testid="lineage-save-error"]')).toBeNull()
  })

  it('dirty 态（有未定稿编辑）：不带修饰类、无错误行', () => {
    mount('edit')
    setState({ unfinalized: true, saveStatus: 'dirty' })
    expect(host?.querySelector('[data-testid="lineage-save-btn"]')).not.toBeNull()
    expect(hasModifier()).toBe(false)
    expect(host?.querySelector('[data-testid="lineage-save-error"]')).toBeNull()
  })

  it('saving 态（普通写在途）：不带修饰类、无错误行', () => {
    mount('edit')
    setState({ inflight: { kind: 'write' }, saveStatus: 'saving' })
    expect(hasModifier()).toBe(false)
    expect(host?.querySelector('[data-testid="lineage-save-error"]')).toBeNull()
  })

  it('failed 态（保存错误行在场）：带修饰类，且基类 lg-toolbar tools 保留', () => {
    mount('edit')
    setState({ saveStatus: 'error', lastWriteError: '写入失败（单测夹具）' })
    expect(toolbarRoot().className).toBe(`lg-toolbar tools ${MODIFIER}`)
    expect(host?.querySelector('[data-testid="lineage-save-error"]')?.textContent).toContain('写入失败（单测夹具）')
  })

  it('failed→clean：错误行消失的同时撤掉修饰类（不残留）', () => {
    mount('edit')
    setState({ saveStatus: 'error', lastWriteError: '写入失败（单测夹具）' })
    expect(hasModifier()).toBe(true)
    setState({ saveStatus: 'clean', lastWriteError: null })
    expect(toolbarRoot().className).toBe('lg-toolbar tools')
    expect(host?.querySelector('[data-testid="lineage-save-error"]')).toBeNull()
  })

  it('browse/focus 模式（slim 工具组）：即使会话 failed 也不带修饰类（slim 根无工具钮与错误行）', () => {
    setState({ saveStatus: 'error', lastWriteError: '写入失败（单测夹具）' })
    for (const mode of ['browse', 'focus'] as const) {
      act(() => { root?.unmount() })
      host?.remove()
      mount(mode)
      expect(toolbarRoot().className).toBe('lg-toolbar slim')
      expect(host?.querySelector('[data-testid="lineage-save-error"]')).toBeNull()
    }
  })
})

describe('[回炉 W-C·R-D1 呈现修复] 错误行独占工具组下一行——样式合约（theme-lineage-tools.css 文本锚）', () => {
  it('可换行只挂在修饰类下：基类 .lg-toolbar.tools 规则不含 flex-wrap；工具组容器的 flex-wrap 仅见于修饰类规则', () => {
    const base = css.match(/\.lg-toolbar\.tools\s*\{[^}]*\}/g) ?? []
    expect(base.length, '基类规则恰一条（不另立平行基类规则）').toBe(1)
    expect(base[0]).not.toMatch(/flex-wrap/)
    expect(css).toMatch(new RegExp(`\\.lg-toolbar\\.tools\\.${MODIFIER}\\s*\\{[^}]*flex-wrap:\\s*wrap`))
    // 负锚：凡选择器落在工具组容器（.lg-toolbar）上且含 flex-wrap 的规则，必须是修饰类选择器
    //（错误行本体 .lg-save-error 的内部换行另案——它只在错误态渲染；规则解析前先剥注释）
    const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = noComment.match(/[^{}]+\{[^}]*\}/g) ?? []
    const containerWrapRules = rules.filter((r) => {
      const selector = r.slice(0, r.indexOf('{'))
      return /\.lg-toolbar\b/.test(selector) && /flex-wrap/.test(r.slice(r.indexOf('{')))
    })
    expect(containerWrapRules.length).toBe(1)
    expect(containerWrapRules[0]!.slice(0, containerWrapRules[0]!.indexOf('{'))).toMatch(
      new RegExp(`^\\s*\\.lg-toolbar\\.tools\\.${MODIFIER}\\s*$`)
    )
  })

  it('修饰类下 drag-hint 单行省略（不把工具钮挤到换行）', () => {
    expect(css).toMatch(
      new RegExp(
        `\\.lg-toolbar\\.tools\\.${MODIFIER} \\.drag-hint\\s*\\{[^}]*white-space:\\s*nowrap;[^}]*overflow:\\s*hidden;[^}]*text-overflow:\\s*ellipsis`
      )
    )
  })

  it('错误行占满整行、允许内部换行、长串可断（整行落在工具组盒子内）', () => {
    const rule = css.match(/\.lg-save-error\s*\{[^}]*\}/)?.[0]
    expect(rule).toBeDefined()
    expect(rule!).toMatch(/flex:\s*1 0 100%/)
    expect(rule!).toMatch(/flex-wrap:\s*wrap/)
    expect(rule!).toMatch(/overflow-wrap:\s*anywhere/)
    expect(rule!).toMatch(/box-sizing:\s*border-box/)
  })

  it('错误行内的按钮（重试钮与出口钮）不伸缩、不折行——不得再出现一字一行竖排', () => {
    const rule = css.match(/\.lg-save-error button\s*\{[^}]*\}/)?.[0]
    expect(rule).toBeDefined()
    expect(rule!).toMatch(/flex:\s*0 0 auto/)
    expect(rule!).toMatch(/white-space:\s*nowrap/)
  })

  it('样式注释带缘由与锚（[回炉 W-C·R-D1 呈现修复]）；既有注释与色值 token 面不被改写', () => {
    expect(css).toContain('[回炉 W-C·R-D1 呈现修复]')
    // 既有两段头注与展开钮注记原样在场（不删既有注释）
    expect(css).toContain('[F-LGRAPH-01②U2/U3] 脉络编辑工具组+线型列表+画线预览皮肤')
    expect(css).toContain('[F-UIRES-03 C1] 展开 chevron 钮')
    // 错误行族不写字面量色值（颜色继续走 token）
    const errorRules = css.match(/\.lg-save-error[^{}]*\{[^}]*\}/g) ?? []
    expect(errorRules.length).toBeGreaterThanOrEqual(2)
    for (const rule of errorRules) expect(rule).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
