// @vitest-environment jsdom
/**
 * [SR2-TABS-02] TabBar 组件锁定测试（工单文化层条款）。
 * 数据自取 reader.store（模块级单例）——经 setState 注入 per-tab 状态直测
 * 展示面与回调接线（store 行为面已由 reader.store.test 18 用例锁定，本文件锁
 * 组件契约：渲染序/激活/关闭/loading/error/空态/ARIA 语义/roving 键盘）。
 * 注：静态 import（不 resetModules）——resetModules 会造成 React 双实例
 * （静态 act 与动态组件分属两份 react），instanceof 内部检查即炸。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TabBar } from '../../../src/renderer/features/reader/TabBar'
import type { TabState } from '../../../src/renderer/features/reader/reader.store'
import { useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { guardedDescribe } from '../../utils/guard'

/** 构造指定状态的 tab（默认 ready 态完整形状） */
function makeTab(id: string, patch: Partial<TabState> = {}): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false,
    ...patch
  }
}

/** 注入 store 状态并挂载（store 单例复用，setState 即时生效） */
function mountWith(props: { tabs: Record<string, TabState>; order: string[]; activeId: string | null }): void {
  useReaderStore.setState(props)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<TabBar />)
  })
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function tabItems(): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
}

function tabLabels(items: HTMLElement[]): string[] {
  return items.map((t) => t.querySelector('.truncate')?.textContent ?? '')
}

beforeEach(() => {
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.setState({ noteByPaper: {} })
  vi.restoreAllMocks()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

guardedDescribe('SR2-TABS-02', 'TabBar —— 多标签栏（展示面+回调接线）', () => {
  it('空态：order 为空时整栏不渲染（无 tablist 元素）', () => {
    mountWith({ tabs: {}, order: [], activeId: null })
    expect(host?.querySelector('[role="tablist"]')).toBeNull()
  })

  it('渲染序=order；标题=fileName 去扩展名', () => {
    mountWith({
      tabs: {
        'p-1': makeTab('p-1', { fileName: '论文甲.pdf' }),
        'p-2': makeTab('p-2', { fileName: '论文乙.pdf' }),
        'p-3': makeTab('p-3', { fileName: '论文丙.pdf' })
      },
      order: ['p-3', 'p-1', 'p-2'],
      activeId: 'p-1'
    })
    const items = tabItems()
    expect(items).toHaveLength(3)
    // 渲染序跟随 order（p-3, p-1, p-2），不按字典序
    expect(tabLabels(items)).toEqual(['论文丙', '论文甲', '论文乙'])
  })

  it('激活语义：activeId 的 tab aria-selected=true 其余 false；容器 role=tablist', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-2'
    })
    expect(host?.querySelector('[role="tablist"]')).not.toBeNull()
    const items = tabItems()
    expect(items[0]?.getAttribute('aria-selected')).toBe('false')
    expect(items[1]?.getAttribute('aria-selected')).toBe('true')
  })

  it('点击 tab 体 → activateTab（activeId 切换）', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    act(() => {
      tabItems()[1]?.click()
    })
    expect(useReaderStore.getState().activeId).toBe('p-2')
  })

  it('点击关闭叉 → closeTab（该 tab 移除；点击 tab 体不误触关闭）', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1', { fileName: '甲.pdf' }), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    const closeBtn = host?.querySelector<HTMLButtonElement>('[aria-label="关闭 甲"]')
    expect(closeBtn).not.toBeNull()
    // 关闭叉退出 roving 焦点环（键盘 Tab 序不进 tablist；Arrow 不因 button 焦点失效）
    expect(closeBtn?.tabIndex).toBe(-1)
    act(() => {
      closeBtn?.click()
    })
    const s = useReaderStore.getState()
    expect(s.tabs['p-1']).toBeUndefined()
    expect(s.order).toEqual(['p-2'])
    // 关的是 active → 收缩到右邻（p-2）
    expect(s.activeId).toBe('p-2')
  })

  it('loading 态显示「加载中…」；error 态显示「打开失败」', () => {
    mountWith({
      tabs: {
        'p-1': makeTab('p-1', { status: 'loading', fileName: '', fileUrl: '' }),
        'p-2': makeTab('p-2', { status: 'error', fileName: '' })
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    const labels = tabLabels(tabItems())
    expect(labels[0]).toContain('加载中')
    expect(labels[1]).toContain('打开失败')
  })

  it('键盘 roving：ArrowRight/Left 在 tab 项间移动焦点', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2'), 'p-3': makeTab('p-3') },
      order: ['p-1', 'p-2', 'p-3'],
      activeId: 'p-1'
    })
    const items = tabItems()
    // roving：激活项 tabIndex=0 其余 -1
    expect(items[0]?.tabIndex).toBe(0)
    expect(items[1]?.tabIndex).toBe(-1)
    items[0]?.focus()
    expect(document.activeElement).toBe(items[0])
    act(() => {
      items[0]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      )
    })
    expect(document.activeElement).toBe(items[1])
    // roving 完整语义：焦点所在项 tabIndex=0（跟随焦点，不锁定激活项）
    expect(items[1]?.tabIndex).toBe(0)
    expect(items[0]?.tabIndex).toBe(-1)
    act(() => {
      items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(document.activeElement).toBe(items[0])
  })

  it('键盘激活：焦点项按 Enter/Space 等价点击 tab 体（activateTab）', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    const items = tabItems()
    items[1]?.focus()
    act(() => {
      items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(useReaderStore.getState().activeId).toBe('p-2')
    items[0]?.focus()
    act(() => {
      items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    expect(useReaderStore.getState().activeId).toBe('p-1')
  })

  it('循环导航：末项 ArrowRight 回到首项（roving 循环语义）', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-2'
    })
    const items = tabItems()
    items[1]?.focus()
    act(() => {
      items[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      )
    })
    expect(document.activeElement).toBe(items[0])
  })

  it('焦点残留守卫：聚焦的 tab 被鼠标关闭后，tablist 仍恰有一项 tabIndex=0（不退出 Tab 序）', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    const items = tabItems()
    items[1]?.focus()
    // focusedId=p-2 已写入；经关闭叉（鼠标路径）关掉 p-2
    const closeBtn = host?.querySelectorAll<HTMLButtonElement>('[aria-label^="关闭"]')[1]
    act(() => {
      closeBtn?.click()
    })
    // focusedId 残留指向已关 tab——守卫必须回退激活项，roving 不变量保持
    const remaining = tabItems()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.tabIndex).toBe(0)
  })

  it('Delete 键关闭：纯键盘路径（关闭叉已退出 Tab 序的替代通道）', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-2'
    })
    const items = tabItems()
    items[1]?.focus()
    act(() => {
      items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })
    const s = useReaderStore.getState()
    expect(s.tabs['p-2']).toBeUndefined()
    expect(s.activeId).toBe('p-1')
  })
})
