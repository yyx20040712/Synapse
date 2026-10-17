// @vitest-environment jsdom
/**
 * [F-VISFB-62] 悬浮笔记 UI 消费面测试（B6-62；任务书 §7 61-62 行 UI 面——
 * 组件测断言真实文本+变异红证 ≥3：坐标换算/零位移守卫/空回收）。
 *
 * 覆盖（消费接线面——61 号 store 级锁面〔lineage-floating-notes.test.ts：
 * undo/save/reload 族〕零重复）：右键空白开单项菜单（真实文本+遮罩/Esc
 * 关闭）/创建坐标换算（clientToOwnPt——s_eff=z×uiScale 矩阵面）/创建钳制
 * （负侧归零+右/下界=内容 own 域−笔记占位）/交互门（browse 只读+画线
 * armed 让位）/拖动柄位移提交与零位移守卫（44 号先例 live!==start 才提交）
 * /编辑 blur 提交+内容未变不提交/空笔记失焦回收（remove 入队——undo 可
 * 恢复）/笔记右键删除菜单/z 序置顶/flushing 域创建 no-op 不进编辑态。
 * [回炉轮 1] 基础件本轮更新=坐标断言非对称化（R7①）+y 下限=柄高（R6）
 * +空稿打断收口适配（R2③）；回炉新增面（R1-R7 全用例）拆驻
 * lineage-floating-note-rework.test.tsx（测试件有效行留余量）。
 * always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 *
 * 量测桩口径：内容层 rect/offset 全部 own 域语义（timeline-zoom 三域律
 * C 域——offset 族=布局读数正交于缩放）；left=40/top=20=origin，
 * 1000×800=own 尺寸。
 */
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloatingNote } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { NOTE_GRIP_H, NOTE_H, NOTE_W } from '../../../src/renderer/features/lineage/lineage-note-geom'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return {
    id: over.id ?? 'fn-1',
    folderId: '__main__',
    x: 100,
    y: 100,
    content: '内容甲',
    createdAt: 't0',
    updatedAt: 't0',
    ...over
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

/** 挂载被测组件：contentEl 扮 .tl-content（rect/offset 桩=own 域量测面） */
function mountNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host.appendChild(contentEl)
  contentEl.getBoundingClientRect = () =>
    ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  root = createRoot(host)
  act(() => {
    root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  })
}

const state = () => useLineageStore.getState()
const openBlankMenu = (clientX: number, clientY: number): void => {
  contentEl!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }))
}
const menuEl = (): HTMLElement | null => document.querySelector('[data-testid="note-anchor-menu"]')
const clickMenuItem = (label: string): void => {
  const btn = Array.from(document.querySelectorAll('[role="menuitem"]')).find((b) => b.textContent === label)
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const pdown = (el: Element, clientX: number, clientY: number): void => {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX, clientY }))
}
const pmove = (clientX: number, clientY: number): void => {
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX, clientY }))
}
const pup = (clientX: number, clientY: number): void => {
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX, clientY }))
}
const typeInto = (ta: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(ta, value)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
const blurTa = (ta: HTMLElement): void => {
  ta.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
  document.documentElement.style.removeProperty('--ui-scale')
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  contentEl = null
})

describe('F-VISFB-62 悬浮笔记 UI —— 创建面（右键空白+锚定菜单）', () => {
  it('右键空白开单项菜单：真实文本「新建悬浮笔记」；遮罩点击/Esc 关闭', () => {
    mountNotes()
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).not.toBeNull()
    expect(menuEl()?.textContent).toContain('新建悬浮笔记')
    act(() => {
      document.querySelector('[data-testid="note-menu-veil"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(menuEl()).toBeNull()
    act(() => {
      openBlankMenu(240, 220)
    })
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(menuEl()).toBeNull()
  })

  it('创建坐标换算：菜单点击→addFloatingNote own 坐标（clientToOwnPt：s_eff=z0.5×u1.25=0.625）+创建即编辑态聚焦', () => {
    mountNotes()
    useLineageViewStore.setState({ zoom: 0.5 })
    document.documentElement.style.setProperty('--ui-scale', '1.25')
    // [R7①] 非对称断言：own=((165−40)/0.625,(170−20)/0.625)=(200,240)——x/y 交换变异必红
    act(() => {
      openBlankMenu(165, 170)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    const created = state().floatingNotes[0]
    expect(created).toMatchObject({ x: 200, y: 240, content: '' })
    const ta = noteElOf(created!.id)?.querySelector('textarea')
    expect(ta).not.toBeNull()
    // [S7①] 进入编辑的=新笔记 id（after 末位追加假设锁面——非他笔记 textarea）
    expect(ta?.closest('.tl-note')?.getAttribute('data-note-id')).toBe(created!.id)
    expect(document.activeElement).toBe(ta)
  })

  it('创建钳制：右/下界=内容 own 域−笔记占位；负侧归零（防拖出域外不可寻回）', () => {
    mountNotes()
    act(() => {
      openBlankMenu(40 + 990, 20 + 790)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    // [R2③] 开第二菜单=打断收口：首笔记先给稿提交（空稿会被回收——回收
    // 语义在 R3① 空编辑全序用例单独锁）
    const ta1 = noteElOf(state().floatingNotes[0]!.id)!.querySelector('textarea')! as HTMLTextAreaElement
    act(() => {
      typeInto(ta1, '首笔记')
    })
    act(() => {
      blurTa(ta1)
    })
    expect(state().floatingNotes[0]).toMatchObject({ x: 1000 - NOTE_W, y: 800 - NOTE_H })
    act(() => {
      openBlankMenu(40 - 60, 20 - 30)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    // [R6] 负侧归零（x）+y 下限=柄高（贴顶创建 grip 不被内容域上缘裁剪）
    expect(state().floatingNotes[1]).toMatchObject({ x: 0, y: NOTE_GRIP_H })
  })

  it('saving/flushing 域创建让位（S5 非空转改造——R4 前置闸+S1 在飞关闸双锚）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-fl' })] })
    mountNotes()
    // 前置闸（R4）：真实组合 flushing+saving——菜单不开+既有笔记让位
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(noteElOf('fn-fl')!.style.pointerEvents).toBe('none')
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).toBeNull()
    // 在飞闸（S1①）：先开菜单再进 saving——菜单随 saving 消失+点击不可达
    act(() => {
      useLineageStore.setState({ flushing: false, saveStatus: 'clean' })
    })
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).not.toBeNull()
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(menuEl()).toBeNull()
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    expect(state().floatingNotes).toHaveLength(1)
  })
})

describe('F-VISFB-62 悬浮笔记 UI —— 交互门', () => {
  it('browse 模式只读：真实文本渲染+无 textarea/grip+pointer-events none+右键空白无菜单', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ content: '只读内容' })] })
    useLineageViewStore.setState({ mode: 'browse' })
    mountNotes()
    const note = document.querySelector('.tl-note') as HTMLElement
    expect(note.querySelector('.tl-note-text')?.textContent).toBe('只读内容')
    expect(note.querySelector('textarea')).toBeNull()
    expect(note.querySelector('.tl-note-grip')).toBeNull()
    expect(note.style.pointerEvents).toBe('none')
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).toBeNull()
  })

  it('画线 armed 让位：tool≠select 笔记 pointer-events none+右键空白无菜单', () => {
    useLineageStore.setState({ floatingNotes: [makeNote()] })
    useLineageViewStore.setState({ mode: 'edit', tool: 'draw-solid' })
    mountNotes()
    const armed = document.querySelector('.tl-note') as HTMLElement | null
    expect(armed!.style.pointerEvents).toBe('none')
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).toBeNull()
  })
})

describe('F-VISFB-62 悬浮笔记 UI —— 拖动柄（书签柄）', () => {
  it('拖动提交：pointer 拖动 live 位移（own 域换算）+pointerup 落定 update x/y', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-d', x: 100, y: 100 })] })
    mountNotes()
    const grip = noteElOf('fn-d')!.querySelector('.tl-note-grip')!
    act(() => {
      pdown(grip, 140, 120)
    })
    // [R7①] 非对称位移：Δx=50/Δy=75（own (150,175)）——x/y 交换变异必红
    act(() => {
      pmove(190, 195)
    })
    expect(noteElOf('fn-d')!.style.left).toBe('150px')
    expect(noteElOf('fn-d')!.style.top).toBe('175px')
    act(() => {
      pup(190, 195)
    })
    expect(state().floatingNotes[0]).toMatchObject({ x: 150, y: 175 })
    expect(state().queue.filter((a) => a.kind === 'upsert-floating-note')).toHaveLength(1)
  })

  it('零位移守卫（44 号先例）：按下即松零位移不提交（不入队不 dirty 零撤销单元）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-z', x: 100, y: 100 })] })
    mountNotes()
    const grip = noteElOf('fn-z')!.querySelector('.tl-note-grip')!
    act(() => {
      pdown(grip, 140, 120)
    })
    act(() => {
      pup(140, 120)
    })
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().undoStack).toHaveLength(0)
    expect(state().floatingNotes[0]).toMatchObject({ x: 100, y: 100 })
  })
})

describe('F-VISFB-62 悬浮笔记 UI —— 编辑/删除/z 序', () => {
  it('点击笔记进编辑：textarea 受控+blur 提交 content（真实文本入 store）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-e')!, 150, 150)
    })
    const ta = noteElOf('fn-e')!.querySelector('textarea')! as HTMLTextAreaElement
    expect(ta.value).toBe('旧稿')
    act(() => {
      typeInto(ta, '定稿')
    })
    act(() => {
      blurTa(ta)
    })
    expect(state().floatingNotes[0]!.content).toBe('定稿')
    expect(state().queue[0]).toMatchObject({ kind: 'upsert-floating-note', input: { id: 'fn-e', content: '定稿' } })
  })

  it('内容未变 blur 不提交（零写单元：不入队不 dirty）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-s', content: '同文' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-s')!, 150, 150)
    })
    const ta = noteElOf('fn-s')!.querySelector('textarea')!
    act(() => {
      blurTa(ta)
    })
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
  })

  it('空笔记失焦回收：blur 空 content→removeFloatingNote（undo 可恢复——remove 入队）', () => {
    mountNotes()
    act(() => {
      openBlankMenu(240, 220)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    const created = state().floatingNotes[0]!
    const ta = noteElOf(created.id)!.querySelector('textarea')!
    act(() => {
      blurTa(ta)
    })
    expect(state().floatingNotes).toHaveLength(0)
    expect(state().queue.some((a) => a.kind === 'remove-floating-note')).toBe(true)
  })

  it('笔记右键删除菜单：真实文本「删除笔记」+点击 remove（无确认框）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-x', content: '待删' })] })
    mountNotes()
    act(() => {
      noteElOf('fn-x')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 260 })
      )
    })
    expect(menuEl()?.textContent).toContain('删除笔记')
    act(() => {
      clickMenuItem('删除笔记')
    })
    expect(state().floatingNotes).toHaveLength(0)
    expect(state().queue[0]).toMatchObject({ kind: 'remove-floating-note', id: 'fn-x' })
  })

  it('z 序置顶：指针按下笔记→DOM 末位渲染（最后交互在上）', () => {
    useLineageStore.setState({
      floatingNotes: [makeNote({ id: 'fn-a', x: 0, y: 0 }), makeNote({ id: 'fn-b', x: 400, y: 400 })]
    })
    mountNotes()
    const layer = document.querySelector('.tl-notes-layer')!
    const ids = (): string[] =>
      Array.from(layer.querySelectorAll('.tl-note')).map((el) => el.getAttribute('data-note-id')!)
    expect(ids()).toEqual(['fn-a', 'fn-b'])
    act(() => {
      pdown(noteElOf('fn-a')!, 30, 60)
    })
    expect(ids()).toEqual(['fn-b', 'fn-a'])
  })
})

describe('S4 textarea 冒泡隔离（正文区点击不达容器画线处理器）', () => {
  it('select 态 textarea pointerdown 不达容器 onPointerDown（React 链隔离）——笔记体点击对照组照常冒泡', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    contentEl = document.createElement('div')
    contentEl.className = 'tl-content'
    host.appendChild(contentEl)
    contentEl.getBoundingClientRect = () =>
      ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
    Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
    Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-s4', content: '隔离文' })] })
    const containerDown = vi.fn()
    root = createRoot(host)
    act(() => {
      root?.render(
        <div onPointerDown={containerDown}>
          <LineageFloatingNotes contentRef={{ current: contentEl }} />
        </div>
      )
    })
    // 对照组：笔记体 pointerdown 冒泡达容器（无隔离面——两次：选中对照+进编辑）
    act(() => {
      noteElOf('fn-s4')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 150, clientY: 150 }))
    })
    expect(containerDown).toHaveBeenCalledTimes(1)
    act(() => {
      noteElOf('fn-s4')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 150, clientY: 150 }))
    })
    expect(containerDown).toHaveBeenCalledTimes(2)
    // 隔离面：进入编辑后 textarea 内 pointerdown 止于 textarea（不达容器=不递增）
    const ta = noteElOf('fn-s4')!.querySelector('textarea')!
    act(() => {
      ta.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 160, clientY: 160 }))
    })
    expect(containerDown).toHaveBeenCalledTimes(2)
  })
})
