// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U2] 工具栏+线型列表锁定合约面——[B5 设计稿 §2.3/§3.1/§11.2 断言翻转] 单排工具栏
 * 三模式常驻（原「仅 edit 可见、browse/focus 隐藏+drag-hint」退役：保存/撤销重做/编辑工具/缩放/
 * 清空聚焦/图名/左右栏开关全部三模式在场，编辑工具在 browse/focus 只禁用不消失）/保存钮四态
 * （dirty 亮·clean 灰禁·saving spinner·error 按失败源分流告警——退役行 4 chip）/A12 线型图标交互/
 * 线型列表 6 色行+行内改名=编辑单元/撤销重做钮接会话栈（mockup §3.3+A11/A12 仲裁）。
 * [B5 设计稿 §3.1/§3.2/§6.2——wave C 2026-11-25] 工具栏=页面顶部稳定外壳：DOM 顺序锁（编辑/浏览/
 * 聚焦｜保存/撤销/重做｜选择/实线/虚线｜缩放 −/百分比复位/+｜清空聚焦｜图名｜左右栏开关）+三层壳
 * （shell/scroll/toolbar）。三模式命令面／保存钮 title 恒定／history 来源告警／缩放控件=
 * lineage-toolbar-controls.test.tsx（[B5] 自本件拆出——.tsx 受 ESLint max-lines 500 约束）；history 来源告警无保存
 * 重试；缩放控件（纯 N%、边界禁用、非 ready 禁用）。告警几何/三模式可达=lineage-toolbar-save-
 * error-class；侧栏开关=use-lineage-pane-controls；清空聚焦=lineage-mode-bar。
 * [F-ALIGN-01 2026-10-04] 添加节点钮随手动添加节点路径退役删除——控件清单
 * 收窄+零残留负锚（在场即红）。
 * [B4 L1 迁移——设计稿 §12.2] 保存钮/撤销重做钮=纯受控件（LineageSaveButton/
 * LineageHistoryButtons），状态单源=use-lineage-command-state：clean/dirty 钮态改
 * 读 IO+U（Q0 且 U1 仍可点——idle-flush 后保存仍可点）；finalize 后 undo 可点
 * redo 灰；saving 期仍锁同会话编辑工具（INV-94），撤销/重做不禁用（#13d 排队）。
 * always-active 裸 describe（K3）。
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

import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { makeHistoryEntry } from '../../utils/factories'

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS, LINE_TYPE_DEFAULT_NAME } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'
import type { LineagePaneControls } from '../../../src/renderer/features/lineage/use-lineage-pane-controls'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-tools.css'), 'utf8') // [②U2] 工具组皮肤拆件

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mountEl(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

/** store 直写经 act（React 订阅渲染同步——防 DOM 滞后一拍；Partial 局部
 * 覆盖=zustand setState 合并语义——类型面经 as 收窄） */
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

/** [B5 §3.1] 工具栏挂载——模式取 view.store（工具栏不再收 mode prop：三模式同一 DOM），挂载前置模式 */
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

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: { names: string[] }) => ({ ok: true, data: [...req.names] }))
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })
  )
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit) // [B4 L1] undo/redo=history-unit
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
    paletteFor: null,
    zoom: 1
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('F-LGRAPH-01②U2 工具栏形态（[B5 §2.3/§3.1] 三模式常驻）', () => {
  it('edit 模式：全控件在场（保存/选择/实线/虚线/撤销/重做/缩放三钮/清空聚焦/图名/左右栏开关）+添加节点钮零残留负锚（[F-ALIGN-01]）', () => {
    mountToolbar()
    for (const id of [
      'lineage-save-btn', 'lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-undo', 'lineage-redo',
      'lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in', 'lineage-focus-clear', 'lineage-graph-title',
      'lineage-nav-collapse', 'lineage-sidebar-collapse'
    ]) {
      expect(q(`[data-testid="${id}"]`)).not.toBeNull()
    }
    expect(q('[data-testid="lineage-add-node"]')).toBeNull()
  })

  it('[B5 §11.2 断言翻转] browse/focus：保存/撤销重做/编辑工具/缩放/清空聚焦常驻不消失；编辑工具只禁用（点击无效）；drag-hint 零残留负锚', () => {
    for (const mode of ['browse', 'focus'] as const) {
      useLineageViewStore.setState({ mode })
      mountEl(<LineageToolbar graphName="主图" panes={PANES} />)
      for (const id of [
        'lineage-save-btn', 'lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-undo', 'lineage-redo',
        'lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in', 'lineage-focus-clear'
      ]) {
        expect(q(`[data-testid="${id}"]`), `${mode}：${id} 应常驻在场`).not.toBeNull()
      }
      for (const id of ['lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-tool-solid-expand', 'lineage-tool-dashed-expand']) {
        expect(btn(id).disabled, `${mode}：编辑工具 ${id} 应禁用（不消失）`).toBe(true)
      }
      // 禁用=点击无效：工具态/色板不因 browse/focus 的点击而变
      click(btn('lineage-tool-solid'))
      expect(useLineageViewStore.getState().tool).toBe('select')
      expect(useLineageViewStore.getState().paletteFor).toBeNull()
      // 缩放三钮在 browse/focus 可用（§2.3：缩放三模式同一判据——只看图 ready）
      for (const id of ['lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in']) {
        expect(btn(id).disabled, `${mode}：${id} 不随模式禁用`).toBe(false)
      }
      // [B5 §3.5 文案删除 1] drag-hint 三态退役——零残留负锚（在场即红）
      expect(q('[data-testid="drag-hint"]')).toBeNull()
      expect(host?.querySelector('.drag-hint')).toBeNull()
      act(() => {
        root?.unmount()
      })
      root = null
      host?.remove()
    }
  })

  it('[B5 §3.1] 单排工具栏 DOM 顺序锁：编辑/浏览/聚焦｜保存/撤销/重做｜选择/实线/虚线｜缩放 −/百分比复位/+｜清空聚焦｜图名｜左导航开关/右详情开关', () => {
    mountToolbar()
    const order = [
      'lineage-mode-bar', 'lineage-save-btn', 'lineage-undo', 'lineage-redo',
      'lineage-tool-select', 'lineage-tool-anchor-solid', 'lineage-tool-anchor-dashed',
      'lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in',
      'lineage-focus-clear', 'lineage-graph-title', 'lineage-nav-collapse', 'lineage-sidebar-collapse'
    ].map((id) => req(`[data-testid="${id}"]`))
    for (let i = 0; i + 1 < order.length; i++) {
      const follows = (order[i]!.compareDocumentPosition(order[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      expect(follows, `槽位序：第 ${i} 项应先于第 ${i + 1} 项`).toBe(true)
    }
    // 全部控件同驻一条轨道（.lg-toolbar 直接子树）；模式栏不再承载图名（图名=父工具栏槽位）
    const track = req('.lg-toolbar')
    for (const el of order) expect(track.contains(el)).toBe(true)
    expect(req('[data-testid="lineage-mode-bar"]').contains(req('[data-testid="lineage-graph-title"]'))).toBe(false)
    expect(req('[data-testid="lineage-graph-title"]').textContent).toBe('主图') // 图名=folders 单源经编排注入
  })

  it('[B5 §3.2] 三层壳：shell（flex 列 shrink-0）> scroll（role=toolbar、可键盘聚焦、aria-label「脉络工具栏」）> toolbar；写失败告警=滚动容器的兄弟节点', () => {
    mountToolbar()
    const scroll = req('.lg-toolbar-scroll')
    expect(scroll.getAttribute('role')).toBe('toolbar')
    expect(scroll.getAttribute('aria-label')).toBe('脉络工具栏')
    expect(scroll.getAttribute('tabindex')).toBe('0')
    expect(scroll.parentElement?.classList.contains('lg-toolbar-shell')).toBe(true)
    expect(req('.lg-toolbar').parentElement).toBe(scroll)
    expect(q('[data-testid="lineage-save-error"]')).toBeNull() // 无错=无告警
    setState({ saveStatus: 'error', lastWriteError: '写入失败', lastWriteErrorSource: 'save', queue: [{ kind: 'remove-edge', id: 'e1' }] })
    const alert = req('[data-testid="lineage-save-error"]')
    expect(alert.getAttribute('role')).toBe('alert')
    expect(scroll.contains(alert), '告警不得落在横滚容器内（不占工具控件轨道）').toBe(false)
    expect(req('.lg-toolbar-shell').contains(alert)).toBe(true)
  })
})

describe('F-LGRAPH-01②U2 保存钮四态（§2.2——退役行 4：chip 零残留）', () => {
  it('clean（Q0/U0）=灰暗禁用；dirty（Q≥1 且 U）=亮可点；chip testid 退役负锚', () => {
    mountToolbar()
    expect(btn('lineage-save-btn').disabled).toBe(true) // saved（Q0/U0）禁
    expect(q('[data-testid="lineage-save-status"]')).toBeNull() // 退役行 4
    expect(q('[data-testid="lineage-retry-save"]')).toBeNull()
    // [B4 L1] 钮态读 IO+U：待写+未定稿=dirty（夹具拨真实 IO/U 轴——非 saveStatus 单字段）
    setState({ saveStatus: 'dirty', unfinalized: true, queue: [{ kind: 'patch-node', id: 'A', patch: { x: 1 } }] })
    expect(btn('lineage-save-btn').disabled).toBe(false) // dirty 亮
  })

  it('[B4 L1] idle-flush 后保存仍可点（Q0 且 U1=dirty——即使无待写）；finalize 后回 saved 禁用', () => {
    mountToolbar()
    setState({ saveStatus: 'clean', unfinalized: true }) // 已落库未定稿
    expect(btn('lineage-save-btn').disabled).toBe(false)
    setState({ unfinalized: false }) // 显式保存成功=定稿
    expect(btn('lineage-save-btn').disabled).toBe(true)
  })

  it('saving=spinner+工具组锁定（选择/画线禁用）；点击保存=显式保存 saveActiveFolder（空队列即定稿：clean+U 清）', async () => {
    mountToolbar()
    setState({ saveStatus: 'dirty', unfinalized: true })
    click(btn('lineage-save-btn'))
    expect(useLineageStore.getState().saveStatus).toBe('clean') // [RR11] 具体态：空队列 drain 同步不入循环→clean
    // [B4 L1] 定稿清账=drain 之后的链步（微任务级）——await 链落定后 U 清
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })
    expect(useLineageStore.getState().unfinalized).toBe(false)
  })

  it('error=行内错误+重试钮（新 testid lineage-save-error/lineage-save-retry）；重试=retrySave', () => {
    mountToolbar()
    setState({ saveStatus: 'error', lastWriteError: '写入失败', queue: [{ kind: 'remove-edge', id: 'e1' }], lastWriteErrorSource: 'save' }) // [B5 §6.1] 夹具机械补来源（save 场景）
    expect(req('[data-testid="lineage-save-error"]').textContent).toContain('写入失败')
    click(btn('lineage-save-retry'))
    expect(['saving', 'clean']).toContain(useLineageStore.getState().saveStatus)
  })

  it('[回炉 R7→B4 L1] saving 断言补强：spinner 在场+编辑工具全禁用（同会话编辑锁 INV-94）；栈非空时撤销/重做**不禁用**（#13d 排队不并发——原「锁非栈空所致」翻转）', () => {
    mountToolbar()
    setState({ saveStatus: 'saving', flushing: true, inflight: { kind: 'write' }, undoStack: [makeHistoryEntry()], redoStack: [makeHistoryEntry()] })
    expect(q('.spinner')).not.toBeNull() // spinner 在场
    for (const id of ['lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed']) {
      expect(btn(id).disabled, `${String(id)} 应禁用`).toBe(true)
    }
    expect(btn('lineage-undo').disabled).toBe(false) // 栈非空=可点（排队）
    expect(btn('lineage-redo').disabled).toBe(false)
    expect(btn('lineage-save-btn').disabled).toBe(true) // saving 保存钮禁用
  })

  it('[回炉 R7] 重试成功路径：error→重试→flush 成功回 clean（保存钮回 clean 禁用锁定）', async () => {
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
    mountToolbar()
    setState({ saveStatus: 'error', lastWriteError: '写入失败', queue: [{ kind: 'remove-edge', id: 'e1' }], lastWriteErrorSource: 'save' }) // [B5 §6.1] 夹具机械补来源（save 场景）
    click(btn('lineage-save-retry'))
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(useLineageStore.getState().lastWriteError).toBeNull()
    expect(btn('lineage-save-btn').disabled).toBe(true) // clean=灰暗禁用锁定
    expect(q('.spinner')).toBeNull()
  })
})

describe('F-LGRAPH-01②U2 线型图标+[F-UIRES-03 C1] 交互+线型列表', () => {
  it('图标线样颜色=per-kind 当前色（INV-108：solid 变色 dashed 不动——inline stroke）', () => {
    mountToolbar()
    setViewState({ currentLineColor: { solid: LINE_TYPE_COLORS[2]!, dashed: LINE_TYPE_COLORS[0] } })
    const solid = btn('lineage-tool-solid').querySelector('svg line') as SVGLineElement | null
    expect(solid?.getAttribute('stroke')).toBe(LINE_TYPE_COLORS[2])
    const dashed = btn('lineage-tool-dashed').querySelector('svg line') as SVGLineElement | null
    expect(dashed?.getAttribute('stroke')).toBe(LINE_TYPE_COLORS[0])
  })

  it('C1：select 态点图标=进 draw-X 且收板（切模式即收板 delta-W5）；draw-X 再点同图标=no-op（N9 非双击退出）', () => {
    mountToolbar()
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull() // 初始收起
    click(btn('lineage-tool-solid'))
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
    expect(useLineageViewStore.getState().paletteFor).toBeNull() // 不开板
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull()
    click(btn('lineage-tool-solid')) // 再点同图标=no-op（N9）
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull()
  })

  it('C1：draw-X+点另一 kind 图标=切换 draw-Y 且收板（delta-W5 错位态根除）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
    click(btn('lineage-tool-solid-expand'))
    expect(useLineageViewStore.getState().paletteFor).toBe('solid') // 板开（下步验切换收板）
    click(btn('lineage-tool-dashed'))
    expect(useLineageViewStore.getState().tool).toBe('draw-dashed')
    expect(useLineageViewStore.getState().paletteFor).toBeNull() // 切换=收板
  })

  it('C1：展开钮 toggle（任意 tool）：点开 paletteFor=K+aria-expanded；再点同钮=收', () => {
    mountToolbar()
    const expand = btn('lineage-tool-solid-expand')
    // [RR1-W1] svg 规格类判别（icons.tsx D7：stroke 走 CSS 类唯一供应者
    // theme-buttons.css .syn-icon-btn——同排 hand/undo/redo 先例对齐）
    expect(expand.classList.contains('syn-icon-btn')).toBe(true)
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    click(expand)
    expect(useLineageViewStore.getState().paletteFor).toBe('solid')
    expect(expand.getAttribute('aria-expanded')).toBe('true')
    expect(q('[data-testid="lineage-linetype-list"]')).not.toBeNull()
    click(btn('lineage-tool-solid-expand'))
    expect(useLineageViewStore.getState().paletteFor).toBeNull()
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull()
  })

  it('C1：列表开时点外部=收板（tool 不动——点击不吞伴随效果）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
    click(btn('lineage-tool-solid-expand'))
    act(() => {
      document.body.click()
    })
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull()
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // tool 保持
  })

  it('线型列表=6 色行（色板固定序）：色线样+名称；当前色行✓；选行=per-kind 色变+列表收起（另一 kind 不动——INV-108）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid-expand'))
    const rows = [...(q('[data-testid="lineage-linetype-list"]')?.querySelectorAll('[data-testid="lineage-linetype-row"]') ?? [])]
    expect(rows).toHaveLength(6)
    expect(rows[0]!.textContent).toContain(LINE_TYPE_DEFAULT_NAME)
    // 当前色（首行）✓
    expect(rows[0]!.textContent).toContain('✓')
    click(rows[2]!)
    expect(useLineageViewStore.getState().currentLineColor.solid).toBe(LINE_TYPE_COLORS[2])
    expect(useLineageViewStore.getState().currentLineColor.dashed).toBe(LINE_TYPE_COLORS[0])
    expect(useLineageViewStore.getState().tool).toBe('select') // 选行 tool 不动（C1）
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull() // 收起
  })

  it('行内改名=一编辑单元：提交→saveLineTypeNames 暂存（dirty+undo 栈 1）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid-expand'))
    const rows = [...(q('[data-testid="lineage-linetype-list"]')?.querySelectorAll('[data-testid="lineage-linetype-row"]') ?? [])]
    // 点名称进入编辑
    click(req('[data-testid="lineage-linetype-list"] [data-testid="lineage-linetype-name"]'))
    const input = q('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '主供水线')
      input!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    })
    // 编辑单元入会话：dirty+撤销栈 1+色行名乐观更新
    expect(useLineageStore.getState().saveStatus).toBe('dirty')
    expect(useLineageStore.getState().undoStack).toHaveLength(1)
    expect(useLineageStore.getState().lineTypeNames[0]).toBe('主供水线')
    expect(stubApi.lineage.upsertLineTypes).not.toHaveBeenCalled() // 不自动落库
    void rows
  })

  it('[回炉 R12] IME 组词期 Enter（isComposing）→no-op：编辑态保持零写（INV-85 同面）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid-expand'))
    click(req('[data-testid="lineage-linetype-list"] [data-testid="lineage-linetype-name"]'))
    const input = q('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '主供水')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }))
    })
    expect(q('[data-testid="lineage-linetype-name-input"]')).not.toBeNull() // 编辑态保持
    expect(useLineageStore.getState().lineTypeNames[0]).toBe('待命名') // 零写
    expect(useLineageStore.getState().undoStack).toHaveLength(0)
  })

  it('[回炉 R12] 组词中 blur→拒提交；compositionend 后到=定案文本补提交（取 DOM 值非滞后 state）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid-expand'))
    click(req('[data-testid="lineage-linetype-list"] [data-testid="lineage-linetype-name"]'))
    const input = q('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement
    act(() => {
      input.focus() // 焦点态建模（组词发生在聚焦输入中）
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '组词中文本')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    act(() => {
      input.blur() // 序 B：blur 先行（activeElement 离开 input）
    })
    expect(useLineageStore.getState().lineTypeNames[0]).toBe('待命名') // 组词中 blur=拒
    // DOM 直改定案文本（state 滞后——R2 d1-W1 同型）后 compositionend 到达
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '定案名')
    })
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(useLineageStore.getState().lineTypeNames[0]).toBe('定案名') // 补提交取 DOM 值
    expect(useLineageStore.getState().undoStack).toHaveLength(1)
  })

  it('[回炉 R12] 聚焦态常规组词确认（compositionend 未失焦）→不自动提交（Enter/blur 路自负）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid-expand'))
    click(req('[data-testid="lineage-linetype-list"] [data-testid="lineage-linetype-name"]'))
    const input = q('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement
    act(() => {
      input.focus()
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(useLineageStore.getState().lineTypeNames[0]).toBe('待命名') // 不自动提交
  })

  it('[回炉 R6/F-UIRES-03 C1] 列表挂 paletteFor 指向展开钮锚槽内（随迁）：solid 开=挂 solid 锚内；切 dashed 展开钮=随迁至 dashed 锚内', () => {
    mountToolbar()
    click(btn('lineage-tool-solid-expand'))
    const solidAnchor = req('[data-testid="lineage-tool-anchor-solid"]')
    const list = q('[data-testid="lineage-linetype-list"]')
    expect(list).not.toBeNull()
    expect(solidAnchor.contains(list)).toBe(true) // 锚定=当前展开钮槽位
    click(btn('lineage-tool-dashed-expand')) // 异钮展开=单例随迁
    const dashedAnchor = req('[data-testid="lineage-tool-anchor-dashed"]')
    const list2 = q('[data-testid="lineage-linetype-list"]')
    expect(dashedAnchor.contains(list2)).toBe(true) // 随迁至 dashed 锚
    expect(solidAnchor.contains(list2)).toBe(false)
    // CSS 锚：锚槽 relative+列表 top:100%/left:0 定位于锚正下方
    expect(css).toMatch(/\.lg-tool-anchor\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.linetype-list\s*\{[^}]*position:\s*absolute;[^}]*top:\s*100%;[^}]*left:\s*0/)
  })
})

describe('F-LGRAPH-01②U2 撤销/重做钮（接历史栈——[B4 L1] async history-unit）', () => {
  const settle = async (): Promise<void> => {
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })
  }

  it('栈空=灰暗禁用；有栈=可点=undo/redo（await 真实链结果）', async () => {
    mountToolbar()
    expect(btn('lineage-undo').disabled).toBe(true)
    expect(btn('lineage-redo').disabled).toBe(true)
    act(() => {
      useLineageStore.getState().moveNode('A', 10, 10)
    })
    expect(btn('lineage-undo').disabled).toBe(false)
    click(btn('lineage-undo'))
    await settle()
    expect(useLineageStore.getState().nodes[0]?.x).toBe(null)
    expect(btn('lineage-redo').disabled).toBe(false)
    click(btn('lineage-redo'))
    await settle()
    expect(useLineageStore.getState().nodes[0]?.x).toBe(10)
  })

  it('[B4 L1] finalize 后 undo 可点、redo 灰（显式保存只清 redo——原「保存后 undo 灰」翻转）', async () => {
    mountToolbar()
    act(() => {
      useLineageStore.getState().moveNode('A', 10, 10)
    })
    await act(async () => {
      await useLineageStore.getState().saveActiveFolder()
    })
    expect(useLineageStore.getState().unfinalized).toBe(false)
    expect(btn('lineage-save-btn').disabled).toBe(true) // saved
    expect(btn('lineage-undo').disabled).toBe(false) // undo 保留
    expect(btn('lineage-redo').disabled).toBe(true) // redo 清
    click(btn('lineage-undo'))
    await settle()
    expect(btn('lineage-redo').disabled).toBe(false) // undo 后 redo 可点
    expect(btn('lineage-save-btn').disabled).toBe(false) // undo 置 U→保存可点
  })
})
