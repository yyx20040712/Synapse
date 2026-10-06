// @vitest-environment jsdom
/**
 * [F-UIRES-03 C2·P5] Esc 全局层序锁定（设计稿 v1.13 §2 C2 v1.11②承接——
 * C1 挂账①）：层序表=INPUT/IME（原生优先）＞对话框层（[role=dialog] 让路
 * ——Dialog 自治 Esc 承载）＞菜单层（EdgeMenu 两态+LineageNodeMenu——自治
 * Esc 保留，单口让路；pendingLink 提示条同族〔F-ESC-01 扩面〕）＞色板
 * paletteFor＞画线锚
 * anchor（迁 view.store）＞画线工具 tool（→select）；一次 Esc 只关最上层，
 * 无面=no-op。anchor 维迁 lineage-view.store（C1「驻 hook 现域」设计修订）
 * ——escapeStep 单口可达；NodeMenu 自治 Esc 补齐（原「ESC 归 Dialog 域」
 * 头注语义随本层序定稿修订）。always-active 裸 describe（K3）。
 */
import { act, useState } from 'react'
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
import { LineageBoardMenu, type PendingLink } from '../../../src/renderer/features/lineage/LineageBoardMenu'

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
  document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove())
  document.querySelectorAll('[data-esc-family="menu"]').forEach((d) => d.remove())
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

/** [F-ESC-01] 模拟对话框在场（脏确认框等共享 Dialog 同 role=dialog 探测面） */
const mountDialogDom = (): void => {
  const d = document.createElement('div')
  d.setAttribute('role', 'dialog')
  document.body.appendChild(d)
}

/** [F-ESC-01] 模拟提示条标记在场（pendingLink 同族 data-esc-family 探测面） */
const mountFamilyDom = (): void => {
  const d = document.createElement('div')
  d.setAttribute('data-esc-family', 'menu')
  document.body.appendChild(d)
}

/** [F-ESC-01] 提示条宿主探针：真挂 LineageBoardMenu+宿主态回写仿真
 * （自治 Esc 经 setPendingLink 回写→setPending 卸载提示条=生命周期闭环） */
function BoardMenuHost(props: { initial: PendingLink | null; onSet: (v: PendingLink | null) => void }): JSX.Element {
  const [pending, setPending] = useState<PendingLink | null>(props.initial)
  const writeBack = (v: PendingLink | null): void => {
    props.onSet(v)
    setPending(v)
  }
  return (
    <LineageBoardMenu menu={null} pendingLink={pending} setMenu={() => undefined} setPendingLink={writeBack} />
  )
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

describe('F-ESC-01 Esc 层序扩面（对话框层让路+pendingLink 提示条自治 Esc）', () => {
  it('对话框层让路：role=dialog DOM 在场→Esc 单口 no-op（store 全保持——Dialog 自治 Esc 承载）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    mountDialogDom()
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
  })

  it('pendingLink 让路：提示条标记 DOM 在场→Esc 单口 no-op（提示条自治 Esc 承载）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    mountFamilyDom()
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
  })

  it('提示条自治 Esc：pendingLink 激活→Esc→setPendingLink 恰一调 null（经 props 回写）', () => {
    const onSet = vi.fn()
    act(() => {
      root?.render(<BoardMenuHost initial={{ source: 'A', mode: 'link' }} onSet={onSet} />)
    })
    expect(host?.querySelector('[data-testid="lineage-pending-link"]')).not.toBeNull()
    expect(host?.querySelector('[data-esc-family="menu"]')).not.toBeNull()
    esc()
    expect(onSet).toHaveBeenCalledTimes(1)
    expect(onSet).toHaveBeenCalledWith(null)
  })

  it('提示条 IME 组词期 Esc=取消候选词非关闭（isComposing 守卫）', () => {
    const onSet = vi.fn()
    act(() => {
      root?.render(<BoardMenuHost initial={{ source: 'A', mode: 'link' }} onSet={onSet} />)
    })
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true })
      )
    })
    expect(onSet).not.toHaveBeenCalled()
  })

  it('提示条 INPUT 让路：输入焦点内 Esc=原生优先（提示条不关）', () => {
    const onSet = vi.fn()
    act(() => {
      root?.render(
        <>
          <Probe />
          <BoardMenuHost initial={{ source: 'A', mode: 'link' }} onSet={onSet} />
        </>
      )
    })
    const input = host?.querySelector('[data-testid="esc-input"]')
    if (input === null || input === undefined) throw new Error('INPUT 未渲染')
    esc(input)
    expect(onSet).not.toHaveBeenCalled()
  })

  it('提示条上层让路：对话框/菜单在场→自治监听 no-op（setPendingLink 零调）', () => {
    const onSet = vi.fn()
    act(() => {
      root?.render(<BoardMenuHost initial={{ source: 'A', mode: 'link' }} onSet={onSet} />)
    })
    mountDialogDom()
    esc()
    expect(onSet).not.toHaveBeenCalled()
    document.querySelector('[role="dialog"]')?.remove()
    mountMenuDom()
    esc()
    expect(onSet).not.toHaveBeenCalled()
    document.querySelector('[role="menu"]')?.remove()
  })

  it('层序跨格序列：dialog+提示条+板+锚+armed 叠加→五连 Esc 逐层各退一层', () => {
    const onSet = vi.fn()
    act(() => {
      root?.render(
        <>
          <Probe />
          <BoardMenuHost initial={{ source: 'A', mode: 'link' }} onSet={onSet} />
        </>
      )
    })
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid', anchor: 'A' })
    mountDialogDom()
    // ①对话框层：单口+提示条均让路（Dialog 自治 Esc 关闭承载——store 不动）
    esc()
    let v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
    expect(onSet).not.toHaveBeenCalled()
    document.querySelector('[role="dialog"]')?.remove() // Dialog 自治关闭完成
    // ②提示条层（菜单族同族）：单口让路+提示条自治 Esc 关闭（回写 null）
    esc()
    expect(onSet).toHaveBeenCalledTimes(1)
    expect(onSet).toHaveBeenLastCalledWith(null)
    v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
    // ③色板层
    esc()
    v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.anchor).toBe('A')
    expect(v.tool).toBe('draw-solid')
    // ④锚层
    esc()
    v = useLineageViewStore.getState()
    expect(v.anchor).toBeNull()
    expect(v.tool).toBe('draw-solid')
    // ⑤工具层
    esc()
    expect(useLineageViewStore.getState().tool).toBe('select')
  })
})
