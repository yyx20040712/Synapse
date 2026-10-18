// @vitest-environment jsdom
/**
 * [F-UIRES-03 C2·P5→F-VISFB-66] Esc 全局层序锁定：层序表=INPUT/IME（原生
 * 优先）＞对话框层（[role=dialog] 让路——Dialog 自治 Esc 承载）＞菜单层
 * （EdgeMenu 两态+LineageNodeMenu——自治 Esc 保留，单口让路）＞色板
 * paletteFor＞画线工具 tool（→select）——[F-VISFB-66 裁定 2] 画线锚层与
 * pendingLink 提示条层随点两卡链/右键链路退役删除（E-ESC-01：armed idle
 * Esc 单层直达）；一次 Esc 只关最上层，无面=no-op。always-active 裸
 * describe（K3）。
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
    zoom: 1
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

describe('F-UIRES-03 C2·P5 Esc 全局层序（[F-VISFB-66] 锚层删除后四层+空面 no-op+INPUT/菜单让路）', () => {
  it('空面 no-op：select+无板+无菜单→Esc store 零变化', () => {
    esc()
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
  })

  it('菜单层让路：菜单 DOM 在场→Esc 单口 no-op（store 全保持——菜单自治关闭承载）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    mountMenuDom()
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid') // 全保持（最上层=菜单层）
    expect(v.tool).toBe('draw-solid')
  })

  it('色板层：板开（叠加 armed）→Esc 只关板（画线保持）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.tool).toBe('draw-solid') // 画线保持
  })

  it('工具层（E-ESC-01 单层直达）：板 null+armed→Esc 退画线（→select）', () => {
    useLineageViewStore.setState({ tool: 'draw-dashed', paletteFor: null })
    esc()
    expect(useLineageViewStore.getState().tool).toBe('select')
  })

  it('INPUT 让路：输入焦点内 Esc=原生优先（板/画线全保持）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    const input = host?.querySelector('[data-testid="esc-input"]')
    if (input === null || input === undefined) throw new Error('INPUT 未渲染')
    esc(input)
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.tool).toBe('draw-solid')
  })

  it('组合跨格序列：菜单+板+armed 叠加→三连 Esc 逐层退全清（一次只关最上层）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    mountMenuDom()
    esc() // ①菜单层（让路——store 不动，菜单自治关闭=DOM 移除模拟）
    let v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.tool).toBe('draw-solid')
    document.querySelector('[role="menu"]')?.remove() // 菜单自治关闭完成
    esc() // ②色板层
    v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.tool).toBe('draw-solid')
    esc() // ③工具层（[F-VISFB-66] 锚层删除后单层直达）
    expect(useLineageViewStore.getState().tool).toBe('select')
    esc() // ④空面 no-op（全退后再 Esc 无面可退）
    expect(useLineageViewStore.getState().tool).toBe('select')
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

/** [F-VISFB-66] 残留 family 标记 DOM 探针（退役负锚用——提示条本体已删） */
function mountFamilyDom(): void {
  const el = document.createElement('div')
  el.setAttribute('data-esc-family', 'menu')
  document.body.append(el)
}

describe('F-ESC-01 Esc 层序扩面（对话框层让路——[F-VISFB-66] pendingLink 提示条族随链路退役删）', () => {
  it('对话框层让路：role=dialog DOM 在场→Esc 单口 no-op（store 全保持——Dialog 自治 Esc 承载）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    mountDialogDom()
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid')
    expect(v.tool).toBe('draw-solid')
  })

  it('data-esc-family 探测面退役负锚：pendingLink 提示条 DOM（data-esc-family=menu）在场→不再让路（Esc 直接关板——探测集只剩 dialog/menu）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    mountFamilyDom()
    esc()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull() // 探测面已删——family 标记不再拦截
    expect(v.tool).toBe('draw-solid')
  })
})
