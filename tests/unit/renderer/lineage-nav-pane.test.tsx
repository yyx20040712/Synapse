// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U4] LineageNavPane —— 左侧导航窗格容器（Word 导航窗格式：
 * 宽 208 缺省/右缘手柄拖动调宽 160–320/收起钮在窗格头/收起态 40px 窄条仅
 * 展开图标 T4）+P-17 宽度记忆（renderer localStorage 单键 JSON map——随图
 * 保存）+时间线索引（年>月两级，点击=画布滚动定位信号；当前视口所在月=
 * accent 指示条）。always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'

const stubApi = makeApiStub({
  folders: { list: vi.fn() },
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn()
  }
})
stubApiEvents({
  // NavGraphPicker 订阅面（mock 代理未覆盖键透传 undefined——直调即抛）
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { LineageNavPane } from '../../../src/renderer/features/lineage/LineageNavPane'
import { readNavPrefs } from '../../../src/renderer/features/lineage/nav-pane-prefs'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, year: number | null, month: number | null): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year,
    x: null,
    y: null,
    month,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageNavPane />)
  })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const paneStyle = (): CSSStyleDeclaration =>
  (req('[data-testid="lineage-nav-pane"]') as HTMLElement).style

const pDown = (el: Element, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, buttons: 1, clientX: x, clientY: y })
    )
  })
}
/** pointermove（缺省 buttons=1——真实拖动序列主键恒按住；[R4] 用例显式传 0 模拟异常释放） */
const pMove = (x: number, y: number, buttons = 1): void => {
  act(() => {
    document.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y, buttons })
    )
  })
}
const pUp = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-x', name: '测试图乙', position: 1, paperCount: 0 }
    ]
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  localStorage.clear()
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'browse',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    navScrollTarget: null,
    activeFrameKey: null
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  localStorage.clear()
})

describe('F-LGRAPH-01①U4 LineageNavPane —— 容器（宽度/收起/P-17 记忆）', () => {
  it('缺省形态：宽 208（内联 width）+窗格头收起钮+图/文件夹下拉+时间线索引在场', () => {
    mount()
    expect(req('[data-testid="lineage-nav-pane"]')).not.toBeNull()
    expect(paneStyle().width).toBe('208px') // P-17 缺省 208
    expect(q('[data-testid="lineage-nav-collapse"]')).not.toBeNull() // 收起钮在窗格头
    expect(q('[data-testid="lineage-nav-graph"]')).not.toBeNull()
    expect(q('[data-testid="lineage-nav-index"]')).not.toBeNull()
  })

  it('T4 收起钮：点一下收起（40px 窄条仅展开图标）再点展开（记忆宽恢复）', () => {
    mount()
    act(() => {
      req('[data-testid="lineage-nav-collapse"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(useLineageViewStore.getState().navCollapsed).toBe(true)
    expect(paneStyle().width).toBe('40px')
    expect(q('[data-testid="lineage-nav-graph"]')).toBeNull() // 窄条仅展开图标——下拉/索引不渲染
    expect(q('[data-testid="lineage-nav-expand"]')).not.toBeNull()
    act(() => {
      req('[data-testid="lineage-nav-expand"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(useLineageViewStore.getState().navCollapsed).toBe(false)
    expect(paneStyle().width).toBe('208px') // 记忆宽恢复
  })

  it('右缘手柄拖宽：pointer 拖动→宽度跟随+钳 160–320（越界回落边界）', () => {
    mount()
    const handle = req('[data-testid="lineage-nav-resize"]')
    pDown(handle, 208, 100)
    pMove(260, 100) // +52 → 260
    pUp(260, 100)
    expect(useLineageViewStore.getState().navWidth).toBe(260)
    expect(paneStyle().width).toBe('260px')
    pDown(handle, 260, 100)
    pMove(999, 100) // 远超 → 钳 320
    pUp(999, 100)
    expect(useLineageViewStore.getState().navWidth).toBe(320)
    pDown(handle, 320, 100)
    pMove(10, 100) // 远低 → 钳 160
    pUp(10, 100)
    expect(useLineageViewStore.getState().navWidth).toBe(160)
  })

  it('[R4] pointercancel 同径收口：拖宽中系统取消=落当前宽不粘滞（后续 move 零动作）', () => {
    mount()
    const handle = req('[data-testid="lineage-nav-resize"]')
    pDown(handle, 208, 100)
    pMove(250, 100) // +42 → 250（拖动中）
    act(() => {
      document.dispatchEvent(
        new MouseEvent('pointercancel', { bubbles: true, clientX: 250, clientY: 100 })
      )
    })
    expect(useLineageViewStore.getState().navWidth).toBe(250) // 落当前宽
    pMove(300, 100) // 会话已收口——零动作（不粘滞）
    expect(useLineageViewStore.getState().navWidth).toBe(250)
  })

  it('[R4] buttons 校验：主键释放（无 up 异常路径）move 即止——不粘滞', () => {
    mount()
    const handle = req('[data-testid="lineage-nav-resize"]')
    pDown(handle, 208, 100)
    pMove(250, 100)
    pMove(280, 100, 0)
    expect(useLineageViewStore.getState().navWidth).toBe(250) // buttons=0 即止
    pMove(320, 100) // 会话已废——零动作
    expect(useLineageViewStore.getState().navWidth).toBe(250)
  })

  it('P-17 宽度+收起随图记忆：拖宽+收起→localStorage 单键 JSON map；切图回切=记忆恢复；他图=缺省', async () => {
    mount()
    const handle = req('[data-testid="lineage-nav-resize"]')
    pDown(handle, 208, 100)
    pMove(300, 100)
    pUp(300, 100)
    act(() => {
      req('[data-testid="lineage-nav-collapse"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    const raw = localStorage.getItem('synapse:lineage:nav-pane')
    expect(raw).not.toBeNull()
    const map = JSON.parse(raw!) as Record<string, { width: number; collapsed: boolean }>
    expect(map['__main__']).toEqual({ width: 300, collapsed: true }) // 单键 JSON map（主控裁决）
    // 切图（f-x 无记忆）→缺省 208 展开；回切主图→记忆恢复（300+收起）
    act(() => {
      useLineageStore.getState().setFolder('f-x')
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(useLineageViewStore.getState().navWidth).toBe(208)
    expect(useLineageViewStore.getState().navCollapsed).toBe(false)
    act(() => {
      useLineageStore.getState().setFolder('__main__')
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(useLineageViewStore.getState().navWidth).toBe(300)
    expect(useLineageViewStore.getState().navCollapsed).toBe(true)
  })
})

describe('[回炉 R5] nav-pane-prefs 容错三分支（坏 JSON/字段类型越界→缺省）', () => {
  it('坏 JSON（parse 抛）→缺省 208 展开；width 非 number→缺省；collapsed 非 boolean→缺省', () => {
    localStorage.setItem('synapse:lineage:nav-pane', '{bad json')
    expect(readNavPrefs('__main__')).toEqual({ width: 208, collapsed: false }) // parse 失败不抛
    localStorage.setItem('synapse:lineage:nav-pane', '{"f-1":{"width":"wide","collapsed":true}}')
    expect(readNavPrefs('f-1')).toEqual({ width: 208, collapsed: false }) // width 类型越界=整条缺省
    localStorage.setItem('synapse:lineage:nav-pane', '{"f-2":{"width":260,"collapsed":"yes"}}')
    expect(readNavPrefs('f-2')).toEqual({ width: 208, collapsed: false }) // collapsed 类型越界=整条缺省
    // 合法记忆+越界值回落（写时钳读时同钳）
    localStorage.setItem('synapse:lineage:nav-pane', '{"f-3":{"width":999,"collapsed":true}}')
    expect(readNavPrefs('f-3')).toEqual({ width: 320, collapsed: true }) // 钳 320
  })
})

describe('F-LGRAPH-01①U4 LineageNavPane —— 时间线索引', () => {
  it('年（衬线数字）>月（两位数）两级渲染+点击月→navScrollTarget 发射（nonce 递增）', () => {
    useLineageStore.setState({
      nodes: [node('A', 2022, 9), node('B', 2022, 10), node('C', 2023, 1)]
    })
    mount()
    const index = req('[data-testid="lineage-nav-index"]')
    expect([...index.querySelectorAll('.nav-year-num')].map((e) => e.textContent)).toEqual([
      '2022',
      '2023'
    ])
    expect(
      [...index.querySelectorAll('.nav-month')].map((e) => e.querySelector('.nm')?.textContent)
    ).toEqual(['09', '10', '01'])
    act(() => {
      index.querySelectorAll('.nav-month')[1]!.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    const t1 = useLineageViewStore.getState().navScrollTarget
    expect(t1).toEqual({ key: '2022|10', nonce: 1 })
    act(() => {
      index.querySelectorAll('.nav-month')[1]!.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(useLineageViewStore.getState().navScrollTarget).toEqual({ key: '2022|10', nonce: 2 }) // 同 key 重发（nonce 递增）
  })

  it('当前视口所在月=accent 指示条：activeFrameKey 匹配月挂 .on', () => {
    useLineageStore.setState({ nodes: [node('A', 2022, 9), node('B', 2022, 10)] })
    mount()
    act(() => {
      useLineageViewStore.getState().setActiveFrameKey('2022|10')
    })
    const months = [...req('[data-testid="lineage-nav-index"]').querySelectorAll('.nav-month')]
    expect(months[0]!.classList.contains('on')).toBe(false)
    expect(months[1]!.classList.contains('on')).toBe(true) // 指示条=当前月
  })
})
