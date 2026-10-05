// @vitest-environment jsdom
/**
 * [F-UIRES-03 C1·RR1 d1-N5①] Esc 分层键盘接线锁定（use-lineage-esc 拆件
 * 组件面——INPUT 焦点守卫分支+非 INPUT 分层对照）。always-active 裸
 * describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageEscapeKey } from '../../../src/renderer/features/lineage/use-lineage-esc'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 接线探针（hook 直挂小组件+INPUT 面） */
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
    tool: 'select', currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] }, paletteFor: null
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
})

const esc = (target: Element): void => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  })
}

describe('F-UIRES-03 C1·RR1 Esc 接线（use-lineage-esc——输入焦点守卫+分层）', () => {
  it('INPUT 焦点内 Esc=不退层（原生 Esc 优先——改名/对话框等输入面自治）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    const input = host?.querySelector('[data-testid="esc-input"]')
    if (input === null || input === undefined) throw new Error('INPUT 未渲染')
    esc(input)
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBe('solid') // 板保持（不关）
    expect(v.tool).toBe('draw-solid') // 画线保持（不退）
  })

  it('非 INPUT Esc=分层（对照）：板开只关板→再 Esc 退画线', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    esc(document.body)
    expect(useLineageViewStore.getState().paletteFor).toBeNull()
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
    esc(document.body)
    expect(useLineageViewStore.getState().tool).toBe('select')
  })
})
