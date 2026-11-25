// @vitest-environment jsdom
/**
 * [B5 设计稿 §3.2/§6.2/§6.3——wave C 2026-11-25；§11.4 断言翻转] 写失败告警=横滚容器的兄弟节点、
 * 三模式可达、不改变工具控件轨道。
 *
 * 原合同（[回炉 W-C·R-D1 呈现修复]）：错误行与工具钮、drag-hint 同处一个不换行的 flex 行；消息含整段
 * UUID 很长→出口钮「丢弃这条过期历史」一字一行竖排、1024×768 下整行溢出到侧板之下不可点；修法=修饰类
 * has-save-error 挂工具组根（仅 saveState==='failed' 出现），可换行与 drag-hint 单行省略只挂在该类下。
 * B5 起错误告警脱离工具控件 flex 轨道（DOM=.lg-toolbar-scroll 的兄弟节点），工具控件行恒不换行——旧修饰类
 * has-save-error、「slim 工具组」与 drag-hint 省略规则一并退役（方案切换=删旧）。
 *
 * 本文件锁三面（always-active 裸 describe）：
 * - 结构：告警只随 saveStatus==='error' 出现/消失；落在 .lg-toolbar-shell 内、.lg-toolbar-scroll 外；
 *   控件轨道根类名恒为 lg-toolbar（不随错误态挂修饰类）；
 * - 三模式可达（R4）：edit/browse/focus 下同一告警在场、动作钮条件只看失败来源（save=保存重试在场；
 *   history-undo/redo=无保存重试；缺源=无任何重试）；
 * - 样式合约（文本锚——jsdom 不做布局；几何面由 e2e lineage-conflict.spec 承担）：控件轨道 nowrap、
 *   基类规则不含 flex-wrap:wrap；告警自身可换行、长串可断；行内按钮不伸缩、不折行。
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
import type { LineagePaneControls } from '../../../src/renderer/features/lineage/use-lineage-pane-controls'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-tools.css'), 'utf8')

const RETIRED_MODIFIER = 'has-save-error'

let root: Root | null = null
let host: HTMLDivElement | null = null

/** store 直写经 act（React 订阅渲染同步——防 DOM 滞后一拍）。Partial 局部覆盖=zustand setState 合并
 *  语义——类型面经 as 收窄（lineage-toolbar-session.test 同型：写闸重赋值后的入参类型不含 Partial） */
const setState = (patch: Partial<LineageStore>): void => {
  act(() => {
    useLineageStore.setState(patch as Parameters<typeof useLineageStore.setState>[0])
  })
}

const PANES: LineagePaneControls = {
  navCollapsed: false,
  toggleNav: () => undefined,
  sidebar: {
    width: 252,
    collapsed: false,
    onResizeStart: () => undefined,
    onResizeKey: () => undefined,
    collapse: () => undefined,
    expand: () => undefined
  }
}

function mount(mode: 'edit' | 'browse' | 'focus'): void {
  useLineageViewStore.setState({ mode })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageToolbar graphName="主图" panes={PANES} />)
  })
}
function unmountNow(): void {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
}

/** 控件轨道根节点（工具控件行=.lg-toolbar，唯一） */
const trackRoot = (): HTMLElement => {
  const el = host?.querySelector('.lg-toolbar')
  if (!(el instanceof HTMLElement)) throw new Error('工具控件轨道根节点未渲染')
  return el
}
const alertEl = (): Element | null => host?.querySelector('[data-testid="lineage-save-error"]') ?? null
const scrollEl = (): HTMLElement => {
  const el = host?.querySelector('.lg-toolbar-scroll')
  if (!(el instanceof HTMLElement)) throw new Error('横滚容器未渲染')
  return el
}

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
  unmountNow()
})

describe('[B5 §3.2/§6.2] 写失败告警只在 error 相位出现，且落在横滚容器之外', () => {
  it('saved 态（Q0 无在途 U0）：控件轨道根=lg-toolbar，无告警', () => {
    mount('edit')
    expect(trackRoot().className).toBe('lg-toolbar')
    expect(alertEl()).toBeNull()
  })

  it('dirty 态（有未定稿编辑）：无告警', () => {
    mount('edit')
    setState({ unfinalized: true, saveStatus: 'dirty' })
    expect(host?.querySelector('[data-testid="lineage-save-btn"]')).not.toBeNull()
    expect(alertEl()).toBeNull()
  })

  it('saving 态（普通写在途）：无告警', () => {
    mount('edit')
    setState({ inflight: { kind: 'write' }, saveStatus: 'saving' })
    expect(alertEl()).toBeNull()
  })

  it('failed 态（save 来源）：告警在场=横滚容器的兄弟节点；控件轨道根类名不变（不挂任何错误态修饰类）', () => {
    mount('edit')
    setState({ saveStatus: 'error', lastWriteError: '写入失败（单测夹具）', lastWriteErrorSource: 'save', queue: [] })
    const alert = alertEl()
    expect(alert, '告警在场').not.toBeNull()
    expect(alert!.textContent).toContain('写入失败（单测夹具）')
    const scroll = scrollEl()
    expect(scroll.contains(alert), '告警不得落在横滚容器内（不占工具控件轨道）').toBe(false)
    expect(alert!.parentElement, '告警与横滚容器同父=.lg-toolbar-shell').toBe(scroll.parentElement)
    expect(scroll.parentElement?.classList.contains('lg-toolbar-shell')).toBe(true)
    expect(trackRoot().className, '控件轨道不随错误态挂修饰类').toBe('lg-toolbar')
    expect(trackRoot().contains(alert)).toBe(false)
  })

  it('failed→clean：告警消失（不残留）', () => {
    mount('edit')
    setState({ saveStatus: 'error', lastWriteError: '写入失败（单测夹具）', lastWriteErrorSource: 'save', queue: [] })
    expect(alertEl()).not.toBeNull()
    setState({ saveStatus: 'clean', lastWriteError: null, lastWriteErrorSource: null })
    expect(alertEl()).toBeNull()
    expect(trackRoot().className).toBe('lg-toolbar')
  })
})

describe('[B5 §6.3 R4] 三模式可达：同一告警在 edit/browse/focus 均在场，动作钮条件只看失败来源', () => {
  it('save 来源：三模式告警在场＋保存重试在场（原「browse/focus slim 工具组无错误行」翻转）', () => {
    setState({ saveStatus: 'error', lastWriteError: '写入失败（单测夹具）', lastWriteErrorSource: 'save', queue: [] })
    for (const mode of ['edit', 'browse', 'focus'] as const) {
      mount(mode)
      expect(trackRoot().className, `${mode}：同一控件轨道`).toBe('lg-toolbar')
      expect(alertEl()?.textContent, `${mode}：告警在场`).toContain('保存失败：写入失败（单测夹具）')
      expect(host?.querySelector('[data-testid="lineage-save-retry"]'), `${mode}：save 来源保留保存重试`).not.toBeNull()
      expect(host?.querySelector('[data-testid="lineage-save-error"]')?.getAttribute('role')).toBe('alert')
      unmountNow()
    }
  })

  it.each([
    ['history-undo', '撤销事务失败', '撤销失败：撤销事务失败', '重按撤销即可重试'],
    ['history-redo', '重做事务失败', '重做失败：重做事务失败', '重按重做即可重试']
  ] as const)('%s 来源：三模式告警在场、方向文案、无保存重试', (source, message, title, hint) => {
    setState({ saveStatus: 'error', lastWriteError: message, lastWriteErrorSource: source, queue: [] })
    for (const mode of ['edit', 'browse', 'focus'] as const) {
      mount(mode)
      const alert = alertEl()
      expect(alert, `${mode}：告警在场`).not.toBeNull()
      expect(alert!.textContent, `${mode}：方向文案`).toContain(title)
      expect(alert!.textContent, `${mode}：指引文案`).toContain(hint)
      expect(host?.querySelector('[data-testid="lineage-save-retry"]'), `${mode}：history 来源不渲染保存重试`).toBeNull()
      unmountNow()
    }
  })

  it('缺源非法态（error＋message＋source=null）：告警显示原始真实消息、不显示任何重试钮（UI fail closed）', () => {
    setState({ saveStatus: 'error', lastWriteError: '来源缺失的失败', lastWriteErrorSource: null, queue: [] })
    for (const mode of ['edit', 'browse', 'focus'] as const) {
      mount(mode)
      expect(alertEl()?.textContent).toContain('来源缺失的失败')
      expect(host?.querySelector('[data-testid="lineage-save-retry"]')).toBeNull()
      expect(host?.querySelector('[data-testid="lineage-stale-drop"]')).toBeNull()
      unmountNow()
    }
  })
})

describe('[B5 §3.2/§6.2] 告警脱离控件轨道——样式合约（theme-lineage-tools.css 文本锚）', () => {
  const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '')

  it('控件轨道恒不折行：凡选择器落在 .lg-toolbar 上的规则，无 flex-wrap:wrap（告警不再需要换行规则）', () => {
    const rules = noComment.match(/[^{}]+\{[^}]*\}/g) ?? []
    const containerWrapRules = rules.filter((r) => {
      const selector = r.slice(0, r.indexOf('{'))
      return /\.lg-toolbar\b/.test(selector) && /flex-wrap:\s*wrap/.test(r.slice(r.indexOf('{')))
    })
    expect(containerWrapRules, '控件轨道不得出现可换行规则').toHaveLength(0)
    // 旧修饰类与 drag-hint 省略规则零残留（方案切换=删旧；在场即红）
    expect(css).not.toContain(RETIRED_MODIFIER)
    expect(css).not.toContain('.drag-hint')
  })

  it('告警本体允许内部换行、长串可断（完整消息换行显示，不截断）', () => {
    const rule = css.match(/\.lg-save-error\s*\{[^}]*\}/)?.[0]
    expect(rule).toBeDefined()
    expect(rule!).toMatch(/flex-wrap:\s*wrap/)
    expect(rule!).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('告警内的按钮（重试钮与出口钮）不伸缩、不折行——不得再出现一字一行竖排', () => {
    const rule = css.match(/\.lg-save-error button\s*\{[^}]*\}/)?.[0]
    expect(rule).toBeDefined()
    expect(rule!).toMatch(/flex:\s*0 0 auto/)
    expect(rule!).toMatch(/white-space:\s*nowrap/)
  })

  it('样式注释带缘由与锚（[B5 §3.2/§6.2]）；既有头注与展开钮注记原样在场；告警族不写字面量色值', () => {
    expect(css).toContain('[B5 设计稿 §3.2/§6.2')
    expect(css).not.toContain('[回炉 W-C·R-D1 呈现修复]')
    // 既有两段头注与展开钮注记原样在场（不删既有注释）
    expect(css).toContain('[F-LGRAPH-01②U2/U3] 脉络编辑工具组+线型列表+画线预览皮肤')
    expect(css).toContain('[F-UIRES-03 C1] 展开 chevron 钮')
    // 告警族不写字面量色值（颜色继续走 token）
    const errorRules = css.match(/\.lg-save-error[^{}]*\{[^}]*\}/g) ?? []
    expect(errorRules.length).toBeGreaterThanOrEqual(2)
    for (const rule of errorRules) expect(rule).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
