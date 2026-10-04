// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U2] 工具组+线型列表锁定合约面——仅 edit 可见（browse/focus
 * 隐藏）/保存钮四态（dirty 亮·clean 灰禁·saving spinner·
 * error 行内错误+重试——退役行 4 chip）/A12 线型图标交互/线型列表 6 色行+
 * 行内改名=编辑单元/撤销重做钮接会话栈（mockup §3.3+A11/A12 仲裁）。
 * [F-ALIGN-01 2026-10-04] 添加节点钮随手动添加节点路径退役删除——控件清单
 * 收窄+零残留负锚（在场即红）。
 * always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS, LINE_TYPE_DEFAULT_NAME } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-tools.css'), 'utf8') // [②U2] 工具组皮肤拆件

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, coreIdea: '', year: 2022,
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

function mountToolbar(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageToolbar mode="edit" />)
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
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: string[]) => ({ ok: true, data: [...req] }))
  useLineageStore.setState({
    nodes: [node('A')], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: LINE_TYPE_COLORS[0], linetypeListOpenFor: null
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('F-LGRAPH-01②U2 工具组形态（仅 edit 可见——A11）', () => {
  it('edit 模式：全控件在场（保存/选择/实线/虚线/撤销/重做）+添加节点钮零残留负锚（[F-ALIGN-01]）', () => {
    mountToolbar()
    for (const id of ['lineage-save-btn', 'lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-undo', 'lineage-redo']) {
      expect(q(`[data-testid="${id}"]`)).not.toBeNull()
    }
    expect(q('[data-testid="lineage-add-node"]')).toBeNull()
  })

  it('browse/focus 模式：工具组隐藏+drag-hint 在场', () => {
    for (const mode of ['browse', 'focus'] as const) {
      mountEl(<LineageToolbar mode={mode} />)
      for (const id of ['lineage-save-btn', 'lineage-tool-select', 'lineage-undo']) {
        expect(q(`[data-testid="${id}"]`)).toBeNull()
      }
      expect(q('[data-testid="drag-hint"]')).not.toBeNull()
    }
  })
})

describe('F-LGRAPH-01②U2 保存钮四态（§2.2——退役行 4：chip 零残留）', () => {
  it('clean=灰暗禁用；dirty=亮可点；chip testid 退役负锚', () => {
    mountToolbar()
    expect(btn('lineage-save-btn').disabled).toBe(true) // clean 禁
    expect(q('[data-testid="lineage-save-status"]')).toBeNull() // 退役行 4
    expect(q('[data-testid="lineage-retry-save"]')).toBeNull()
    setState({ saveStatus: 'dirty' })
    expect(btn('lineage-save-btn').disabled).toBe(false) // dirty 亮
  })

  it('saving=spinner+工具组锁定（选择/画线/撤销重做禁用）；点击保存=store.save()', () => {
    const saveSpy = vi.fn()
    // 直驱 store.save 断言（组件→store 单点）
    mountToolbar()
    setState({ saveStatus: 'dirty' })
    click(btn('lineage-save-btn'))
    // [RR11] 具体态断言（原 toContain ['saving','clean'] 弱断言收紧）：
    // 空队列 flush 全程同步（while 不入+收尾 set 无 await）→点击即回 clean
    void saveSpy
    expect(useLineageStore.getState().saveStatus).toBe('clean')
  })

  it('error=行内错误+重试钮（新 testid lineage-save-error/lineage-save-retry）；重试=retrySave', () => {
    mountToolbar()
    setState({ saveStatus: 'error', lastWriteError: '写入失败', queue: [{ kind: 'remove-edge', id: 'e1' }] })
    expect(req('[data-testid="lineage-save-error"]').textContent).toContain('写入失败')
    click(btn('lineage-save-retry'))
    expect(['saving', 'clean']).toContain(useLineageStore.getState().saveStatus)
  })

  it('[回炉 R7] saving 断言补强：spinner 在场+交互钮全禁用（含栈非空撤销/重做=锁非栈空所致）', () => {
    mountToolbar()
    const snap = { nodes: [node('A')], edges: [], lineTypeNames: [], queue: [] }
    setState({ saveStatus: 'saving', flushing: true, undoStack: [snap], redoStack: [snap] })
    expect(q('.spinner')).not.toBeNull() // spinner 在场
    for (const id of ['lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-undo', 'lineage-redo']) {
      expect(btn(id).disabled, `${String(id)} 应禁用`).toBe(true)
    }
    expect(btn('lineage-save-btn').disabled).toBe(true) // saving 保存钮禁用
  })

  it('[回炉 R7] 重试成功路径：error→重试→flush 成功回 clean（保存钮回 clean 禁用锁定）', async () => {
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
    mountToolbar()
    setState({ saveStatus: 'error', lastWriteError: '写入失败', queue: [{ kind: 'remove-edge', id: 'e1' }] })
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

describe('F-LGRAPH-01②U2 线型图标+A12 交互+线型列表', () => {
  it('图标线样颜色=当前线型色（选色后变色——inline stroke）', () => {
    mountToolbar()
    setViewState({ currentLineColor: LINE_TYPE_COLORS[2]! })
    const solid = btn('lineage-tool-solid').querySelector('svg line') as SVGLineElement | null
    expect(solid?.getAttribute('stroke')).toBe(LINE_TYPE_COLORS[2])
  })

  it('A12：select 态点图标=armed+列表展开；再点同图标=取消回 select+列表收起', () => {
    mountToolbar()
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull() // 初始收起
    click(btn('lineage-tool-solid'))
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
    expect(useLineageViewStore.getState().linetypeListOpenFor).toBe('solid')
    expect(q('[data-testid="lineage-linetype-list"]')).not.toBeNull()
    click(btn('lineage-tool-solid')) // 再点同图标=取消
    expect(useLineageViewStore.getState().tool).toBe('select')
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull()
  })

  it('A12：armed 态点另一图标=切换+列表随迁展开', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
    click(btn('lineage-tool-dashed'))
    expect(useLineageViewStore.getState().tool).toBe('draw-dashed')
    expect(useLineageViewStore.getState().linetypeListOpenFor).toBe('dashed')
  })

  it('A12：列表开时点外部=收起（armed 保持）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
    act(() => {
      document.body.click()
    })
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull()
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // armed 保持
  })

  it('线型列表=6 色行（色板固定序）：色线样+名称；当前色行✓；选行=当前色变+列表收起', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
    const rows = [...(q('[data-testid="lineage-linetype-list"]')?.querySelectorAll('[data-testid="lineage-linetype-row"]') ?? [])]
    expect(rows).toHaveLength(6)
    expect(rows[0]!.textContent).toContain(LINE_TYPE_DEFAULT_NAME)
    // 当前色（首行）✓
    expect(rows[0]!.textContent).toContain('✓')
    click(rows[2]!)
    expect(useLineageViewStore.getState().currentLineColor).toBe(LINE_TYPE_COLORS[2])
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // 选行 armed 保持（A12）
    expect(q('[data-testid="lineage-linetype-list"]')).toBeNull() // 收起
  })

  it('行内改名=一编辑单元：提交→saveLineTypeNames 暂存（dirty+undo 栈 1）', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
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
    click(btn('lineage-tool-solid'))
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
    click(btn('lineage-tool-solid'))
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
    click(btn('lineage-tool-solid'))
    click(req('[data-testid="lineage-linetype-list"] [data-testid="lineage-linetype-name"]'))
    const input = q('[data-testid="lineage-linetype-name-input"]') as HTMLInputElement
    act(() => {
      input.focus()
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(useLineageStore.getState().lineTypeNames[0]).toBe('待命名') // 不自动提交
  })

  it('[回炉 R6] 列表挂当前展开图标正下方（随迁）：solid 开=挂 solid 锚内；切 dashed=随迁至 dashed 锚内', () => {
    mountToolbar()
    click(btn('lineage-tool-solid'))
    const solidAnchor = req('[data-testid="lineage-tool-anchor-solid"]')
    const list = q('[data-testid="lineage-linetype-list"]')
    expect(list).not.toBeNull()
    expect(solidAnchor.contains(list)).toBe(true) // 锚定=当前展开图标槽位
    click(btn('lineage-tool-dashed')) // armed 点另一图标=切换+列表随迁
    const dashedAnchor = req('[data-testid="lineage-tool-anchor-dashed"]')
    const list2 = q('[data-testid="lineage-linetype-list"]')
    expect(dashedAnchor.contains(list2)).toBe(true) // 随迁至 dashed 锚
    expect(solidAnchor.contains(list2)).toBe(false)
    // CSS 锚：锚槽 relative+列表 top:100%/left:0 定位于锚正下方
    expect(css).toMatch(/\.lg-tool-anchor\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.linetype-list\s*\{[^}]*position:\s*absolute;[^}]*top:\s*100%;[^}]*left:\s*0/)
  })
})

describe('F-LGRAPH-01②U2 撤销/重做钮（接 U1 会话栈）', () => {
  it('栈空=灰暗禁用；有栈=可点=undo/redo', () => {
    mountToolbar()
    expect(btn('lineage-undo').disabled).toBe(true)
    expect(btn('lineage-redo').disabled).toBe(true)
    act(() => {
      useLineageStore.getState().editCoreIdea('A', '甲')
    })
    expect(btn('lineage-undo').disabled).toBe(false)
    click(btn('lineage-undo'))
    expect(useLineageStore.getState().nodes[0]?.coreIdea).toBe('')
    expect(btn('lineage-redo').disabled).toBe(false)
    click(btn('lineage-redo'))
    expect(useLineageStore.getState().nodes[0]?.coreIdea).toBe('甲')
  })
})
