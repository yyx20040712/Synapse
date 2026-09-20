// @vitest-environment jsdom
/**
 * [F-UI-02] 阅读器工具栏+侧栏 tab 图标化 —— 锁定合约（always-active，不经
 * guardedDescribe——宪法 K3 条款：新测试不随工单状态门控）。
 *
 * 覆盖：
 * - ReaderToolbar 面：①五个图标化控件（上一页/下一页/适应宽度/双页/选择模式）
 *   各含 aria-hidden svg+textContent 恰=原文字（sr-only span 保受锁精确匹配
 *   断言：selection-mode:303/double-page findBtn——svg 无文本节点）；
 *   ②双页图标随 pageLayout 三元切换（single=单矩形 1 rect/double=双矩形
 *   2 rect）；③选择模式激活=background var(--accent-soft) 常亮填充叠加
 *   borderColor var(--accent)（F-UI-02 反馈强化——两断言并立防单侧退化）。
 * - OutlineAside 面：④三 tab（目录/缩略图/笔记）各含 aria-hidden svg+
 *   textContent 恰=标签（outline-aside:96 toEqual 精确数组兼容面）。
 *
 * 形态 crib selection-mode.test.tsx（jsdom 指令/api mock/act 环境/直植 props
 * 夹具）+outline-aside.test.tsx（IO 桩+store 布态）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

const stubApi = makeApiStub({ reader: {}, notes: { get: vi.fn(), save: vi.fn() } })

import { ReaderToolbar } from '../../../src/renderer/features/reader/view/ReaderToolbar'
import { OutlineAside } from '../../../src/renderer/features/reader/panels/OutlineAside'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

// jsdom 无 IntersectionObserver（缩略图懒渲染依赖——OutlineAside 子树）——最小桩
class IntersectionObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

/** 精确 textContent 找按钮（受锁 selection-mode:302/double-page:413 同口径） */
function findBtn(name: string): HTMLButtonElement {
  const b = [...host!.querySelectorAll('button')].find((x) => x.textContent === name)
  expect(b, `按钮 ${name} 应在场（textContent 精确匹配）`).toBeDefined()
  return b as HTMLButtonElement
}

/** selection-mode.test:296-313 直植 props 夹具（可选面按需覆盖） */
function toolbarProps(over: Partial<Parameters<typeof ReaderToolbar>[0]>): Parameters<typeof ReaderToolbar>[0] {
  return {
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    onNavigate: () => undefined,
    onZoom: () => undefined,
    onColor: () => undefined,
    ...over
  }
}

beforeEach(() => {
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', { totalPages: 20 }) }, order: ['p-1'], activeId: 'p-1' })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-UI-02 工具栏图标化 —— ReaderToolbar 面', () => {
  it('① 五个图标化控件各含 aria-hidden svg+textContent 恰=原文字（sr-only 保断言）', () => {
    mount(
      <ReaderToolbar
        {...toolbarProps({
          onFitWidth: () => undefined,
          onToggleSelectionMode: () => undefined,
          onTogglePageLayout: () => undefined
        })}
      />
    )
    for (const label of ['上一页', '下一页', '适应宽度', '双页', '选择模式']) {
      const btn = findBtn(label)
      const svg = btn.querySelector('svg[aria-hidden="true"]')
      expect(svg, `${label} 按钮应含 aria-hidden svg（图标本体）`).not.toBeNull()
    }
    // −/＋/100% 三控件保持字符数字（票面：符号信息性不图标化）
    for (const sym of ['−', '＋', '100%']) {
      expect(findBtn(sym).querySelector('svg'), `${sym} 应保持纯字符（无 svg）`).toBeNull()
    }
  })

  it('② 双页图标随 pageLayout 三元切换：single=单矩形（1 rect）/double=双矩形（2 rect）', () => {
    mount(<ReaderToolbar {...toolbarProps({ pageLayout: 'single', onTogglePageLayout: () => undefined })} />)
    expect(findBtn('双页').querySelectorAll('svg rect').length).toBe(1)
    act(() => {
      root?.render(
        <ReaderToolbar {...toolbarProps({ pageLayout: 'double', onTogglePageLayout: () => undefined })} />
      )
    })
    const rects = findBtn('双页').querySelectorAll('svg rect')
    expect(rects.length).toBe(2)
  })

  it('③ 选择模式激活=background var(--accent-soft) 常亮叠加 borderColor var(--accent)（双断言并立）', () => {
    mount(<ReaderToolbar {...toolbarProps({ selectionMode: true, onToggleSelectionMode: () => undefined })} />)
    const btn = findBtn('选择模式')
    expect(btn.style.background).toBe('var(--accent-soft)')
    expect(btn.style.borderColor).toBe('var(--accent)')
  })
})

describe('F-UI-02 侧栏 tab 图标化 —— OutlineAside 面', () => {
  it('④ 三 tab 各含 aria-hidden svg+textContent 恰=标签（outline-aside:96 精确数组兼容）', () => {
    mount(<OutlineAside pdfDoc={null} onCollapse={() => undefined} />)
    const tabs = Array.from(
      host!.querySelectorAll<HTMLButtonElement>('[data-testid="reader-aside"] [role="tab"]')
    )
    expect(tabs.map((b) => b.textContent)).toEqual(['目录', '缩略图', '笔记'])
    for (const t of tabs) {
      expect(t.querySelector('svg[aria-hidden="true"]'), 'tab 应含 aria-hidden svg').not.toBeNull()
    }
  })
})
