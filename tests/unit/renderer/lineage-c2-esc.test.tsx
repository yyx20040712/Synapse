// @vitest-environment jsdom
/**
 * [F-UIRES-03 C2·P5] Esc 全局层序锁定（设计稿 v1.13 §2 C2 v1.11②承接——
 * C1 挂账①）：层序表=INPUT/IME（原生优先）＞菜单层（EdgeMenu 两态+
 * LineageNodeMenu——自治 Esc 保留，单口让路）＞色板 paletteFor＞画线锚
 * anchor（迁 view.store）＞画线工具 tool（→select）；一次 Esc 只关最上层，
 * 无面=no-op。anchor 维迁 lineage-view.store（C1「驻 hook 现域」设计修订）
 * ——escapeStep 单口可达；NodeMenu 自治 Esc 补齐（原「ESC 归 Dialog 域」
 * 头注语义随本层序定稿修订）。always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeEdge: vi.fn(), upsertEdge: vi.fn(), removeNode: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageEscapeKey } from '../../../src/renderer/features/lineage/use-lineage-esc'
import { LineageNodeMenu } from '../../../src/renderer/features/lineage/LineageNodeMenu'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 接线探针（hook 直挂小组组件+INPUT 面——c1-esc 同型） */
function Probe(): JSX.Element {
  useLineageEscapeKey()
  return (
    <div>
      <input data-testid="esc-input" />
    </div>
  )
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] }, paletteFor: null,
    anchor: null, zoom: 1
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<Probe />)
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  document.querySelectorAll('[role="menu"]').forEach((m) => m.remove())
})

const esc = (target: Element = document.body): void => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  })
}

/** 模拟菜单在场（EdgeMenu/LineageNodeMenu 同 role=menu 探测面） */
const mountMenuDom = (): void => {
  const m = document.createElement('div')
  m.setAttribute('role', 'menu')
  document.body.appendChild(m)
}

describe('F-UIRES-03 C2·P5 Esc 全局层序（五层+空面 no-op+INPUT/菜单让路）', () => {
  it('空面 no-op：select+无板+无锚+无菜单→Esc store 零变化', () => {
    esc()
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
    expect(v.anchor).toBeNull()
  })

  it('菜单层让路：菜单 DOM 在场→Esc 单口 no-op（store 全保持——菜单自治关闭承载）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    mountMenuDom()
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid') // 全保持（最上层=菜单层）
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
  })

  it('色板层：板开（叠加锚+armed）→Esc 只关板（锚/画线保持）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.anchor).toBe('A') // 锚保持（下层未触）
    expect(v.tool).toBe('draw-solid') // 画线保持
  })

  it('锚层：板 null+锚 picked+armed→Esc 只清锚（tool 保持=连画域不退）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: null, anchor: 'A' })
    esc()
    const v = useLineageViewStore.getState()
    expect(v.anchor).toBeNull()
    expect(v.tool).toBe('draw-solid') // 连画域不退（层序表语义）
  })

  it('工具层：板 null+锚 null+armed→Esc 退画线（→select）', () => {
    useLineageViewStore.setState({ tool: 'draw-dashed', paletteFor: null, anchor: null })
    esc()
    expect(useLineageViewStore.getState().tool).toBe('select')
  })

  it('INPUT 让路（锚在场变体）：输入焦点内 Esc=原生优先（板/锚/画线全保持）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    const input = host?.querySelector('[data-testid="esc-input"]')
    if (input === null || input === undefined) throw new Error('INPUT 未渲染')
    esc(input)
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
  })

  it('组合跨格序列：菜单+板+锚+armed 叠加→四连 Esc 逐层退全清（一次只关最上层）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    mountMenuDom()
    esc() // ①菜单层（让路——store 不动，菜单自治关闭=DOM 移除模拟）
    let v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
    document.querySelector('[role="menu"]')?.remove() // 菜单自治关闭完成
    esc() // ②色板层
    v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
    esc() // ③锚层
    v = useLineageViewStore.getState()
    expect(v.anchor).toBeNull()
    expect(v.tool).toBe('draw-solid')
    esc() // ④工具层
    expect(useLineageViewStore.getState().tool).toBe('select')
    esc() // ⑤空面 no-op（全退后再 Esc 无面可退）
    expect(useLineageViewStore.getState().tool).toBe('select')
  })
})

describe('F-UIRES-03 C2·P5 anchor 维（迁 view.store——写点收敛）', () => {
  it('setDrawAnchor 写读+resetTool 清锚（工具态中止=锚无残留）', () => {
    useLineageViewStore.getState().setDrawAnchor('A')
    expect(useLineageViewStore.getState().anchor).toBe('A')
    useLineageViewStore.getState().resetTool()
    expect(useLineageViewStore.getState().anchor).toBeNull()
  })

  it('setMode 清锚（模式切换=退出画线域）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', anchor: 'A' })
    useLineageViewStore.getState().setMode('browse')
    expect(useLineageViewStore.getState().anchor).toBeNull()
  })

  it('kind 切换（draw-X→draw-Y）锚保留（仍在画线域——C1 语义沿承）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', anchor: 'A' })
    useLineageViewStore.getState().toggleLineTool('dashed')
    expect(useLineageViewStore.getState().anchor).toBe('A')
  })

  it('resetForMount 清锚（进页缺省）', () => {
    useLineageViewStore.setState({ anchor: 'A' })
    useLineageViewStore.getState().resetForMount()
    expect(useLineageViewStore.getState().anchor).toBeNull()
  })
})

describe('F-UIRES-03 C2·P5 LineageNodeMenu 自治 Esc（补齐——原「归 Dialog 域」语义修订）', () => {
  const menuNode = (): LineageNode => ({
    id: 'A', paperId: 'p-1', title: '节点A', year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  })

  const mountNodeMenu = (onClose: () => void): void => {
    act(() => {
      root?.render(
        <LineageNodeMenu
          node={menuNode()}
          parentEdge={null}
          anchor={{ x: 10, y: 10 }}
          onClose={onClose}
          onLinkTo={() => undefined}
          onReparent={() => undefined}
          onRemoveParentEdge={() => undefined}
          onRemoveNode={() => undefined}
        />
      )
    })
  }

  it('Esc=onClose（自治关闭——EdgeMenu 同型 document keydown）', () => {
    const onClose = vi.fn()
    mountNodeMenu(onClose)
    esc()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('IME 组词期 Esc=取消候选词非关闭（isComposing 守卫）', () => {
    const onClose = vi.fn()
    mountNodeMenu(onClose)
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true })
      )
    })
    expect(onClose).not.toHaveBeenCalled() // 组词期不关（tag-dropdown-row 先例：init 字典传 isComposing）
  })
})
