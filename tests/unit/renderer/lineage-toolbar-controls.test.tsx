// @vitest-environment jsdom
/**
 * [B5 设计稿 §2.3/§3.1/§6.2/§6.3——wave C 2026-11-25 新增] LineageToolbar 三模式命令面＋保存钮 title 恒定
 * ＋history 来源告警＋缩放控件。
 *
 * 自 lineage-toolbar-session.test.tsx 拆出（该件锁「[②U2] 工具组+线型列表」既有合同；本组为 B5 新增面，
 * 独立成件——该 .tsx 受 ESLint max-lines 500 约束）。harness 与 lineage-toolbar-session 同型
 * （createRoot+act+makeApiStub 工厂——受锁件禁为复用改面）。always-active 裸 describe（K3）。
 *
 * - 三模式命令面（§2.3/§6.3）：browse/focus 下保存=显式保存定稿（清 redo/U、undo 保留）、撤销/重做按栈可用。
 * - 保存钮 title/aria 恒为「保存全部修改（Ctrl+S——落库并标记为已保存）」（§6.2：failed 态不再变成
 *   通用重试——重试入口=告警内 lineage-save-retry，只随 save 来源渲染）。
 * - history 来源告警（§2.4）：方向文案＋「历史栈未变化」指引、无保存重试；重按原方向命令即重试。
 * - 缩放控件 LineageZoomControls（§3.1）：zoom-badge 迁百分比复位钮（纯 N%）、−/+ 边界禁用、图非 ready 禁用。
 * - 稳定外壳（§2.3 loading/error 追加门）：图非 ready 时保存/撤销/重做/清空聚焦禁用，模式钮与左右栏开关可用。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn(), historyUnit: vi.fn() }
})

import { echoHistoryUnit } from '../../utils/lineage-history-stub'

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'
import type { LineagePaneControls } from '../../../src/renderer/features/lineage/use-lineage-pane-controls'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** [B5 §3.1] 工具栏注入面=页面组合层的左右栏控制（本件不测开关行为——lineage-pane-controls 承载） */
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

/** 工具栏挂载——模式取 view.store（工具栏不再收 mode prop：三模式同一 DOM），挂载前置模式 */
function mountToolbar(mode: 'edit' | 'browse' | 'focus' = 'edit'): void {
  useLineageViewStore.setState({ mode })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageToolbar graphName="主图" panes={PANES} />)
  })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const btn = (testid: string): HTMLButtonElement => req(`[data-testid="${testid}"]`) as HTMLButtonElement
const click = (el: Element): void => {
  act(() => {
    ;(el as HTMLElement).click()
  })
}

/** store 直写经 act（React 订阅渲染同步——防 DOM 滞后一拍；Partial 局部覆盖=zustand setState 合并语义） */
type StorePatch<T> = Partial<T> | ((state: T) => Partial<T>)
const setState = (patch: StorePatch<typeof useLineageStore.getState>): void => {
  act(() => {
    useLineageStore.setState(patch as Parameters<typeof useLineageStore.setState>[0])
  })
}
const setViewState = (patch: StorePatch<typeof useLineageViewStore.getState>): void => {
  act(() => {
    useLineageViewStore.setState(patch as Parameters<typeof useLineageViewStore.setState>[0])
  })
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })
  )
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit) // undo/redo=history-unit
  useLineageStore.setState({
    nodes: [node('A')], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [],
    unfinalized: false, editRevision: 0, folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select',
    currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] },
    paletteFor: null, zoom: 1
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

// ── [B5 设计稿 §2.3/§3.1/§6.2——wave C 2026-11-25] 三模式命令面＋保存钮 title 恒定＋history 来源告警＋缩放控件 ──

describe('[B5 §6.2/§6.3] 三模式命令面＋保存钮 title 恒定＋history 来源告警', () => {
  const settleTurns = async (): Promise<void> => {
    await act(async () => {
      for (let i = 0; i < 12; i++) await Promise.resolve()
    })
  }
  const unmountNow = (): void => {
    act(() => { root?.unmount() })
    root = null
    host?.remove()
    host = null
  }

  it('[B5 §6.2] 保存钮 title/aria-label 恒为「保存全部修改（Ctrl+S——落库并标记为已保存）」——failed 态不再变成通用重试（主保存钮只表示显式保存）', () => {
    mountToolbar()
    const TITLE = '保存全部修改（Ctrl+S——落库并标记为已保存）'
    expect(btn('lineage-save-btn').title).toBe(TITLE)
    expect(btn('lineage-save-btn').getAttribute('aria-label')).toBe(TITLE)
    // save 来源失败：主保存钮名称不变；重试入口=告警内的 lineage-save-retry
    setState({ saveStatus: 'error', lastWriteError: '写入失败', queue: [{ kind: 'remove-edge', id: 'e1' }], lastWriteErrorSource: 'save' })
    expect(btn('lineage-save-btn').title).toBe(TITLE)
    expect(btn('lineage-save-btn').getAttribute('aria-label')).toBe(TITLE)
    expect(btn('lineage-save-btn').textContent).toBe('保存')
    expect(q('[data-testid="lineage-save-retry"]')).not.toBeNull()
    // history 来源失败：主保存钮名称同样不变
    setState({ lastWriteError: '重做事务失败', lastWriteErrorSource: 'history-redo', queue: [] })
    expect(btn('lineage-save-btn').title).toBe(TITLE)
    expect(q('[data-testid="lineage-save-retry"]')).toBeNull()
  })

  it('[B5 §2.4] history 来源告警（单告警 testid 沿用）：撤销/重做方向文案＋「历史栈未变化」指引；无保存重试；撤销钮重发原方向命令', async () => {
    mountToolbar()
    act(() => {
      useLineageStore.getState().moveNode('A', 10, 10)
    })
    act(() => {
      useLineageStore.getState().moveNode('A', 20, 20)
    })
    setState({ saveStatus: 'error', lastWriteError: '撤销事务失败', lastWriteErrorSource: 'history-undo', queue: [] })
    const undoAlert = req('[data-testid="lineage-save-error"]')
    expect(undoAlert.textContent).toContain('撤销失败：撤销事务失败')
    expect(undoAlert.textContent).toContain('历史栈未变化，重按撤销即可重试')
    expect(undoAlert.textContent).not.toContain('保存失败')
    expect(q('[data-testid="lineage-save-retry"]'), 'history-undo 来源不渲染保存重试').toBeNull()
    expect(btn('lineage-undo').disabled, '重试入口=重按撤销').toBe(false)
    // 重按撤销=重发 undo（成功后栈推进）
    click(btn('lineage-undo'))
    await settleTurns()
    expect(useLineageStore.getState().nodes[0]?.x).toBe(10)
    expect(q('[data-testid="lineage-save-error"]'), '成功=message/source 同清→告警消失').toBeNull()
    setState({ saveStatus: 'error', lastWriteError: '重做事务失败', lastWriteErrorSource: 'history-redo', queue: [] })
    const redoAlert = req('[data-testid="lineage-save-error"]')
    expect(redoAlert.textContent).toContain('重做失败：重做事务失败')
    expect(redoAlert.textContent).toContain('重按重做即可重试')
    expect(q('[data-testid="lineage-save-retry"]')).toBeNull()
    expect(btn('lineage-redo').disabled).toBe(false)
    expect(btn('lineage-save-btn').disabled, 'history 失败不改变保存钮自身的四态（此处 U 真可点）').toBe(false)
  })

  it('[B5 §2.3/§6.3] 三模式命令面：browse/focus 下保存=显式保存定稿（清 redo/U，undo 保留）、撤销/重做按栈可用', async () => {
    for (const mode of ['browse', 'focus'] as const) {
      mountToolbar(mode)
      act(() => {
        useLineageStore.getState().moveNode('A', 10, 10)
      })
      expect(btn('lineage-undo').disabled, `${mode}：有栈可撤`).toBe(false)
      click(btn('lineage-undo'))
      await settleTurns()
      expect(useLineageStore.getState().nodes[0]?.x).toBe(null)
      expect(btn('lineage-redo').disabled, `${mode}：撤销后可重做`).toBe(false)
      click(btn('lineage-redo'))
      await settleTurns()
      expect(useLineageStore.getState().nodes[0]?.x).toBe(10)
      expect(btn('lineage-save-btn').disabled, `${mode}：U 真=保存可点`).toBe(false)
      click(btn('lineage-save-btn'))
      await settleTurns()
      expect(useLineageStore.getState().unfinalized).toBe(false)
      expect(useLineageStore.getState().redoStack).toHaveLength(0) // 显式保存只清 redo
      expect(useLineageStore.getState().undoStack).toHaveLength(1) // undo 保留
      unmountNow()
    }
  })
})

describe('[B5 §3.1] 缩放控件 LineageZoomControls（zoom-badge 迁百分比复位钮；−/+ 新增）', () => {
  const zoom = (): number => useLineageViewStore.getState().zoom

  it('百分比复位钮文本=纯 N%（无「▾」）；−/+ 步进 10%；点击百分比=复位 100%（100% 处仍可点=等效 no-op）', () => {
    mountToolbar()
    expect(btn('zoom-badge').textContent).toBe('100%')
    expect(btn('zoom-badge').title).toBe('复位缩放到 100%')
    click(btn('lineage-zoom-in'))
    expect(zoom()).toBeCloseTo(1.1)
    expect(btn('zoom-badge').textContent).toBe('110%')
    click(btn('lineage-zoom-in'))
    expect(btn('zoom-badge').textContent).toBe('120%')
    click(btn('lineage-zoom-out'))
    expect(zoom()).toBeCloseTo(1.1)
    click(btn('zoom-badge'))
    expect(zoom()).toBe(1)
    expect(btn('zoom-badge').textContent).toBe('100%')
    expect(btn('zoom-badge').disabled, '100% 复位钮仍可点击').toBe(false)
    click(btn('zoom-badge')) // 等效 no-op
    expect(zoom()).toBe(1)
  })

  it('边界禁用：50% 处 − 禁用（+ 可用）；200% 处 + 禁用（− 可用）；图非 ready 时三钮全禁用', () => {
    mountToolbar()
    setViewState({ zoom: 0.5 })
    expect(btn('lineage-zoom-out').disabled).toBe(true)
    expect(btn('lineage-zoom-in').disabled).toBe(false)
    expect(btn('zoom-badge').textContent).toBe('50%')
    setViewState({ zoom: 2 })
    expect(btn('lineage-zoom-in').disabled).toBe(true)
    expect(btn('lineage-zoom-out').disabled).toBe(false)
    expect(btn('zoom-badge').textContent).toBe('200%')
    setViewState({ zoom: 1 })
    for (const status of ['loading', 'error'] as const) {
      setState({ status })
      for (const id of ['lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in']) {
        expect(btn(id).disabled, `图 ${status}：${id} 应禁用`).toBe(true)
      }
    }
    setState({ status: 'ready' })
    for (const id of ['lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in']) {
      expect(btn(id).disabled).toBe(false)
    }
  })

  it('[B5 §2.3] 图非 ready：保存禁用、撤销/重做禁用、清空聚焦禁用；模式钮与左右栏开关仍可用（稳定外壳）', () => {
    mountToolbar('focus')
    setViewState({ focusSet: ['A'] }) // 集非空：清空聚焦钮在 ready 下本可用——非 ready 才是禁用原因
    setState({ status: 'loading' })
    expect(btn('lineage-save-btn').disabled).toBe(true)
    expect(btn('lineage-undo').disabled).toBe(true)
    expect(btn('lineage-redo').disabled).toBe(true)
    expect(btn('lineage-focus-clear').disabled).toBe(true)
    setState({ status: 'ready' })
    expect(btn('lineage-focus-clear').disabled, '对照：ready 且集非空=可用').toBe(false)
    for (const id of ['lineage-mode-edit', 'lineage-mode-browse', 'lineage-mode-focus', 'lineage-nav-collapse', 'lineage-sidebar-collapse']) {
      expect(btn(id).disabled, `${id} 不随图状态禁用`).toBe(false)
    }
    expect(req('[data-testid="lineage-graph-title"]').textContent).toBe('主图') // 图名显示编排注入值
  })
})

// ── [B5 §2.3 loading/error 追加门——closeout 隔离一审 B1 回炉 2026-11-26] edit 模式下编辑工具与色板行同门 ──
// 既有稳定外壳用例自 focus 模式出发（「非 edit 禁用」掩盖了缺 graphReady 门的交错），本组补 edit × loading/error。
describe('[B5 §2.3·closeout B1] edit × 图非 ready：五编辑控件禁用；色板行不可达；改名零入队', () => {
  const EDIT_IDS = ['lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-solid-expand', 'lineage-tool-dashed', 'lineage-tool-dashed-expand']

  it('edit × loading 与 edit × error：选择/实线/虚线/两展开钮禁用（可见不消失）；模式钮可用（对照）', () => {
    mountToolbar('edit')
    for (const status of ['loading', 'error'] as const) {
      setState({ status })
      for (const id of EDIT_IDS) {
        expect(btn(id).disabled, `edit × ${status}：${id} 应禁用`).toBe(true)
      }
      for (const id of ['lineage-mode-edit', 'lineage-mode-browse', 'lineage-mode-focus']) {
        expect(btn(id).disabled, `edit × ${status}：${id}（三模式钮）应可用`).toBe(false)
      }
    }
    setState({ status: 'ready' })
    for (const id of EDIT_IDS) {
      expect(btn(id).disabled, `对照：ready × edit＝${id} 可用`).toBe(false)
    }
  })

  it('edit × loading：色板行不可达——点击行名不进入改名输入；点击非当前色行选色无效（列表在场也不放开写口）', () => {
    mountToolbar('edit')
    setViewState({ paletteFor: 'solid' }) // ready 期已展开（展开钮禁用只挡新开，不追溯收起在场列表）
    setState({ status: 'loading' })
    const names = host?.querySelectorAll('[data-testid="lineage-linetype-name"]') ?? []
    expect(names.length, '色板列表在场（六行）').toBe(6)
    act(() => {
      ;(names[0] as HTMLElement).click()
    })
    expect(q('[data-testid="lineage-linetype-name-input"]'), 'loading 期点击行名不得进入改名输入').toBe(null)
    // [closeout 终审 O2] 行级选色门回归锁：点非当前色行——currentLineColor 不换、列表不收
    const row = host?.querySelector(`[data-testid="lineage-linetype-row"][data-color="${LINE_TYPE_COLORS[1]}"]`) as HTMLElement
    act(() => {
      row.click()
    })
    expect(useLineageViewStore.getState().currentLineColor.solid, '锁期选色不得换当前线色').toBe(LINE_TYPE_COLORS[0])
    expect(useLineageViewStore.getState().paletteFor, '锁期选色不得收起色板（选色未发生）').toBe('solid')
  })

  it('判别：ready 期已进入改名、图转 loading 后提交——改名不得入队（零写）', async () => {
    mountToolbar('edit')
    setViewState({ paletteFor: 'solid' })
    act(() => {
      ;(host?.querySelector('[data-testid="lineage-linetype-name"]') as HTMLElement).click()
    })
    const setNative = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const typeDraft = (value: string): void => {
      const el = req('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement
      setNative?.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    act(() => { typeDraft('新名') })
    setState({ status: 'loading' })
    // 状态切换重渲后重取在场输入（防脱挂节点 dispatch 空转致恒真）；修前本断言通过、写口判别在其后
    const input2 = req('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement
    expect(input2.isConnected, '改名输入在场（编辑态跨状态切换存活）').toBe(true)
    await act(async () => {
      input2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      for (let i = 0; i < 12; i++) await Promise.resolve()
    })
    expect(stubApi.lineage.upsertLineTypes, 'loading 期改名不得落库').not.toHaveBeenCalled()
    expect(useLineageStore.getState().queue.length, 'loading 期改名不得入队').toBe(0)
    expect(useLineageStore.getState().lineTypeNames[0], '行名不被 loading 期改名改写').toBe('待命名')
  })
})
