// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U5] 三模式画布行为闸（mockup §2.1 定案——现行「view/edit
 * 双态无 mode 门槛」退役）：browse/focus 禁卡拖拽（拖卡=edit 专属）/平移
 * 小手（browse/focus 拖空白=滚动跟随+grab/grabbing；edit 不平移）/focus
 * [B5 设计稿 §4.1/§3.1/§3.5/§2.2 #16/§11.2——wave C 2026-11-25 断言翻转] 原「drag-hint 文案
 *   随三模式」「切图 focusSet 清空（全局）」两表述退役：drag-hint 删除（零残留负锚）；切图=按图
 *   挂起恢复（A 的集合驻 A 会话、返回 A 恢复）；三模式控件常驻、编辑工具非 edit 禁用（工具栏级）。
 *   （以下三行为 B5 前形态记录）
 * 点卡=toggle focusSet（再点取消+点空白 no-op）+P-8 聚焦视觉=仅被点卡
 * accent 边框（多卡独立）/切图 focusSet 清空（图域隔离）/drag-hint 文案
 * 随三模式/P-13 三模式点卡均联动详情面板（选中并行不冲突）。
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'
import type { LineagePaneControls } from '../../../src/renderer/features/lineage/use-lineage-pane-controls'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const onNodeClick = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={[]} onNodeClick={onNodeClick} />)
  })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const cardOf = (id: string): HTMLElement => req(`.tl-card[data-node-id="${id}"]`) as HTMLElement

const setMode = (m: 'edit' | 'browse' | 'focus'): void => {
  act(() => {
    useLineageViewStore.getState().setMode(m)
  })
}
const pDown = (el: Element, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y }))
  })
}
const pMove = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
  })
}
const pUp = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }))
  })
}
const click = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }))
  })
}

beforeEach(() => {
  onNodeClick.mockClear()
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
})

describe('F-LGRAPH-01①U5 三模式画布行为闸 —— 拖拽闸（拖卡=edit 专属）', () => {
  it('browse（缺省）禁拖：pointerdown+过阈值移动不激活占位槽；click 选中照常', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(170, 220)
    expect(q('.drag-slot')).toBeNull() // 闸拒（现「view 态可拖」退役）
    expect(cardOf('A').classList.contains('dragging')).toBe(false)
    pUp(170, 220)
    click(cardOf('A'))
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything()) // P-13 面板联动链保活
  })

  it('focus 禁拖同闸：占位槽不激活', () => {
    mount([node('A'), node('B')])
    setMode('focus')
    pDown(cardOf('A'), 150, 200)
    pMove(170, 220)
    expect(q('.drag-slot')).toBeNull()
    pUp(170, 220)
  })

  it('edit 闸开：过阈值激活占位槽（拖拽专属域）', () => {
    // [B3 §9 新增行] rAF 捕获队列（本例局部 stub——b3 守卫同族）：pMove 后即时断言先 flushRaf（两态兼容冲洗）
    const rafs: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => { rafs.push(cb); return rafs.length })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    mount([node('A'), node('B')])
    setMode('edit')
    pDown(cardOf('A'), 150, 200)
    pMove(158, 204)
    act(() => {
      rafs.splice(0).forEach((cb) => {
        cb(performance.now())
      })
    })
    expect(q('.drag-slot')).not.toBeNull()
    pUp(158, 204)
    // [B3 §9 断言迁移] propertyName 'left'→'translate'（飞行承载键 translate 化）
    act(() => {
      cardOf('A').dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
    })
    vi.unstubAllGlobals()
  })
})

describe('F-LGRAPH-01①U5 平移小手（browse/focus 拖空白=滚动跟随；edit 不平移）', () => {
  it('browse 拖画布空白：scrollLeft/scrollTop 跟随指针位移（反向——拖内容）', () => {
    mount([node('A')])
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    scroller.scrollTop = 50
    pDown(req('.tl-content'), 200, 300) // 空白（非卡/非月标/非工具条）
    // [②U7/挂账⑦] 激活帧 re-base：过阈值（58px）激活但零位移（阈值累积不瞬跳）
    pMove(150, 270)
    expect(scroller.scrollLeft).toBe(100) // 激活帧不跳
    pMove(140, 260) // dx=-10 dy=-10 → 滚动+10/+10（内容随手指）
    pUp(140, 260)
    expect(scroller.scrollLeft).toBe(110)
    expect(scroller.scrollTop).toBe(60)
    expect(scroller.classList.contains('panning')).toBe(false) // 松手摘 grabbing
  })

  it('[R12] 平移激活阈值 5px：阈值内微移不滚不进 grabbing（对照 DRAG_THRESHOLD 先例）；过阈值滚动', () => {
    mount([node('A')])
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    pDown(req('.tl-content'), 200, 300)
    pMove(197, 302) // 3.6px < 5——阈值内
    expect(scroller.scrollLeft).toBe(100) // 不滚
    expect(scroller.classList.contains('panning')).toBe(false) // 不进 grabbing
    pMove(194, 300) // 6px ≥ 5——激活（[挂账⑦] re-base：激活帧零位移不瞬跳）
    expect(scroller.scrollLeft).toBe(100)
    pMove(190, 300) // 再移 4px → +4
    expect(scroller.scrollLeft).toBe(104) // 反向随指
    expect(scroller.classList.contains('panning')).toBe(true)
    pUp(194, 300)
  })

  it('edit 拖画布空白不平移（编辑域无小手）', () => {
    mount([node('A')])
    setMode('edit')
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    pDown(req('.tl-content'), 200, 300)
    pMove(150, 300)
    pUp(150, 300)
    expect(scroller.scrollLeft).toBe(100) // 零滚动
  })

  it('browse 点卡身不平移（卡=点选/闸面，非空白）', () => {
    mount([node('A')])
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    pDown(cardOf('A'), 150, 200)
    pMove(100, 200)
    pUp(100, 200)
    expect(scroller.scrollLeft).toBe(100)
  })
})

describe('F-LGRAPH-01①U5 focus 域 —— toggle/视觉/图域隔离/文案', () => {
  it('focus 点卡=toggle focusSet+P-13 选中并行（详情面板联动不冲突）+P-8 仅被点卡 accent 边框', () => {
    mount([node('A'), node('B'), node('C')])
    setMode('focus')
    click(cardOf('A'))
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything()) // 选中照常转发（P-13）
    expect(cardOf('A').classList.contains('focused')).toBe(true) // P-8 accent 边框
    expect(cardOf('B').classList.contains('focused')).toBe(false)
    click(cardOf('B'))
    expect(useLineageViewStore.getState().focusSet).toEqual(['A', 'B']) // 多卡独立标记
    expect(cardOf('B').classList.contains('focused')).toBe(true)
    click(cardOf('A')) // 再点同卡取消
    expect(useLineageViewStore.getState().focusSet).toEqual(['B'])
    expect(cardOf('A').classList.contains('focused')).toBe(false)
  })

  it('focus 点空白=no-op（不取消聚焦——显式清空唯一入口=清空聚焦钮，见 lineage-mode-bar；模式切换不清集合）', () => {
    mount([node('A')])
    setMode('focus')
    click(cardOf('A'))
    click(req('.tl-content')) // 画布空白
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
  })

  it('[B5 §2.2 #16/#18 断言翻转] 切图=按图挂起恢复：A 的集合驻留 A 会话、目标图空集（图域隔离）、模式保持 focus；返回 A 恢复原集', () => {
    // 成员有效性以会话 nodes 为准（[B5 §5] 写点剪枝）——离开图前把卡 A 写进活动会话，集合才合法可恢复
    useLineageStore.setState({ nodes: [node('A')], status: 'ready' })
    mount([node('A')])
    setMode('focus')
    click(cardOf('A'))
    act(() => {
      useLineageStore.getState().setFolder('f-other')
    })
    expect(useLineageViewStore.getState().focusSet).toEqual([]) // 目标图空集（新图不继承 A 的 id）
    expect(useLineageViewStore.getState().mode).toBe('focus') // 模式保持（空集态合法）
    act(() => {
      useLineageStore.getState().setFolder('__main__')
    })
    expect(useLineageViewStore.getState().focusSet, '返回 A 恢复原集（不清 A、不重建第二份）').toEqual(['A'])
  })

  it('[B5 §3.5/§4.1 断言翻转] drag-hint 三态文案删除（零残留负锚）；三模式画布全亮：无 .dim、focus 模式本集卡 .focused、browse/edit 零描边', () => {
    mount([node('A'), node('B')])
    expect(q('[data-testid="drag-hint"]'), 'drag-hint 退役').toBeNull()
    expect(host?.querySelector('.drag-hint')).toBeNull()
    expect(host?.textContent).not.toContain('平移画布')
    expect(host?.textContent).not.toContain('编辑中：拖动')
    expect(cardOf('A').classList.contains('dim')).toBe(false) // browse 全亮
    setMode('focus')
    click(cardOf('A'))
    expect(cardOf('A').classList.contains('focused')).toBe(true) // focus 模式本集卡 accent 描边
    expect(cardOf('B').classList.contains('dim'), '非聚焦卡不 dim（全亮）').toBe(false)
    expect(cardOf('B').classList.contains('focused')).toBe(false)
    setMode('browse')
    expect(useLineageViewStore.getState().focusSet, '模式切换保集合').toEqual(['A'])
    expect(cardOf('A').classList.contains('focused'), 'browse 不显示聚焦描边').toBe(false)
    setMode('edit')
    expect(cardOf('A').classList.contains('focused'), 'edit 不显示聚焦描边').toBe(false)
    expect(cardOf('A').classList.contains('dim')).toBe(false)
    setMode('focus')
    expect(cardOf('A').classList.contains('focused'), '回 focus 恢复描边').toBe(true)
  })

  it('.timeline 挂模式类（mode-browse/mode-focus/mode-edit——CSS 光标域承载）', () => {
    mount([node('A')])
    expect(req('.timeline').classList.contains('mode-browse')).toBe(true)
    setMode('focus')
    expect(req('.timeline').classList.contains('mode-focus')).toBe(true)
    setMode('edit')
    // [回炉 R13] mode-edit 零消费类清理——edit 态不挂模式类（.editing 承载）
    expect(req('.timeline').classList.contains('mode-edit')).toBe(false)
    expect(req('.timeline').classList.contains('editing')).toBe(true) // 编辑态类同源保活
  })
})

// ── [B5 设计稿 §2.3/§3.1/§11.2——wave C 2026-11-25] 三模式工具栏控件（与画布同挂）──────────

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
const toolbarBtn = (testid: string): HTMLButtonElement | null =>
  host?.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`) ?? null

describe('[B5 §2.3/§3.1] 三模式工具栏控件（工具栏与画布同挂）', () => {
  it('三模式控件常驻：保存/撤销重做/缩放/清空聚焦/图名/左右栏开关在场；编辑工具在 browse/focus 禁用（点击无效）、edit 可用', () => {
    for (const mode of ['browse', 'focus', 'edit'] as const) {
      host = document.createElement('div')
      document.body.appendChild(host)
      root = createRoot(host)
      useLineageViewStore.setState({ mode, focusSet: [], tool: 'select', paletteFor: null, zoom: 1 })
      act(() => {
        root?.render(
          <>
            <LineageToolbar graphName="主图" panes={PANES} />
            <LineageTimeline nodes={[node('A'), node('B')]} edges={[]} onNodeClick={onNodeClick} />
          </>
        )
      })
      for (const id of [
        'lineage-save-btn', 'lineage-undo', 'lineage-redo',
        'lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed',
        'lineage-zoom-out', 'zoom-badge', 'lineage-zoom-in', 'lineage-focus-clear', 'lineage-graph-title',
        'lineage-nav-collapse', 'lineage-sidebar-collapse'
      ]) {
        expect(toolbarBtn(id), `${mode}：${id} 常驻在场`).not.toBeNull()
      }
      expect(toolbarBtn('lineage-graph-title')?.textContent).toBe('主图')
      const editTools = ['lineage-tool-select', 'lineage-tool-solid', 'lineage-tool-dashed', 'lineage-tool-solid-expand', 'lineage-tool-dashed-expand']
      for (const id of editTools) {
        expect(toolbarBtn(id)?.disabled, `${mode}：${id} ${mode === 'edit' ? '可用' : '禁用（不消失）'}`).toBe(mode !== 'edit')
      }
      // 禁用=点击无效（工具态不变）；可用=点击生效
      act(() => {
        toolbarBtn('lineage-tool-solid')?.click()
      })
      expect(useLineageViewStore.getState().tool, `${mode}：点实线钮后的工具态`).toBe(mode === 'edit' ? 'draw-solid' : 'select')
      expect(host?.querySelector('[data-testid="drag-hint"]'), `${mode}：drag-hint 退役`).toBeNull()
      act(() => {
        root?.unmount()
      })
      root = null
      host?.remove()
      host = null
    }
  })
})
