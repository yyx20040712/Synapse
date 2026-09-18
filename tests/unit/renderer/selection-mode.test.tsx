// @vitest-environment jsdom
/**
 * [F-A3] 标注「选择模式」——票面 5.1 用例 ①~⑧（锁定合约，always-active，
 * 不经 guardedDescribe——ADR-0017 裁决 3；⑧=回炉 1 W1 编辑器臂补锁）。
 *
 * 覆盖：store 面（setSelectionMode 写 active/per-tab 记忆 S3/activeId=null
 * no-op）、AnnotationLayer 面（rect pointerEvents 常规全 auto/选择全 none+
 * 点击零副作用+进入选择关菜单/编辑器 S1 不自动恢复）、AiAnnotationLayer 面
 * （rect none+选中描边清除 S4+点击守卫）、ReaderToolbar 面（aria-pressed/
 * 选中态强调边框/onToggle 恰调一次）。SelectionToolbar 不消费模式（正交零改动）。
 * 形态 crib annotation-layer.test.tsx（jsdom 指令/api mock/act 环境/存量
 * rects 夹具）+ai-annotation-layer.test.tsx（pageRoot+.textLayer 真锚+syncRaf）。
 * 布态=useReaderStore.setState 直植完整 TabState+activeId（免 openPaper 异步
 * 链）；afterEach setState(createReaderStoreInitialState()) 复位（zustand
 * 浅合并保 actions）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import type { AiNote } from '../../../src/shared/models/ai-note'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

makeApiStub({ reader: {} })
import { AnnotationLayer } from '../../../src/renderer/features/reader/view/AnnotationLayer'
import { AiAnnotationLayer } from '../../../src/renderer/features/reader/view/AiAnnotationLayer'
import { ReaderToolbar } from '../../../src/renderer/features/reader/view/ReaderToolbar'
import {
  createReaderStoreInitialState,
  useReaderStore
} from '../../../src/renderer/features/reader/state/reader.store'

/** 归一化域矩形夹具 */
function rect(x: number, y: number, w: number, h: number): AnnotationRect {
  return { page: 0, x, y, w, h }
}

/** 单标注（非零宽两行块——本票锁模式交互，归并面归 F-A1 既有测试） */
function ann(): Annotation {
  return {
    id: 'a-1',
    paperId: 'p-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '选择模式测试引文',
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 8,
    rects: [rect(0.1, 0.3, 0.3, 0.02), rect(0.1, 0.318, 0.4, 0.02)],
    comment: '',
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-08-30T00:00:00Z'
  }
}

/** ready 态完整 tab（tab-bar.test 同配方+selectionMode 维度） */
/** AI 段夹具（ai-annotation-layer.test 同配方） */
function aiNoteFixture(): AiNote {
  return {
    id: 'n1',
    paperId: 'p-1',
    annotationId: null,
    role: 'first-read',
    question: 'Q1',
    model: 'test-model',
    quoteText: 'WATER',
    prefixText: '',
    suffixText: '',
    anchorPage: 1,
    contentMd: '内容-n1',
    createdAt: 't',
    updatedAt: 't'
  }
}

/** 页根：.textLayer 内单 span 全文（AI 层重锚管线真锚） */
function makePageRoot(text: string): HTMLDivElement {
  const root = document.createElement('div')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = text
  textLayer.appendChild(span)
  root.appendChild(textLayer)
  return root
}

/** rAF 同步化（jsdom 假帧——重锚 effect 即时收敛，测试确定性） */
function syncRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    cb(0)
    return 0
  })
}

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

const annRects = (): NodeListOf<HTMLElement> =>
  host!.querySelectorAll<HTMLElement>('[data-testid="annotation-rect"]')

const aiRects = (): NodeListOf<HTMLElement> =>
  host!.querySelectorAll<HTMLElement>('[data-testid="ai-note-rect"]')

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  syncRaf()
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1') },
    order: ['p-1'],
    activeId: 'p-1',
    noteHighlight: null,
    aiNoteHighlight: null
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  useReaderStore.setState(createReaderStoreInitialState())
})

describe('F-A3 选择模式 —— store 面（TabState.selectionMode 生命周期）', () => {
  it('① setSelectionMode：true 写入 active tab，再 false 回；activeId=null 时 no-op', () => {
    useReaderStore.getState().setSelectionMode(true)
    expect(useReaderStore.getState().tabs['p-1']?.selectionMode).toBe(true)
    useReaderStore.getState().setSelectionMode(false)
    expect(useReaderStore.getState().tabs['p-1']?.selectionMode).toBe(false)
    useReaderStore.setState({ activeId: null })
    const before = useReaderStore.getState().tabs
    useReaderStore.getState().setSelectionMode(true)
    expect(useReaderStore.getState().tabs).toBe(before)
    expect(useReaderStore.getState().tabs['p-1']?.selectionMode).toBe(false)
  })

  it('② S3 per-tab：A(true)/B(false) 切换各自记忆；setSelectionMode 只动 active', () => {
    useReaderStore.setState({
      tabs: { 'p-a': makeTab('p-a', { selectionMode: true }), 'p-b': makeTab('p-b', { selectionMode: false }) },
      order: ['p-a', 'p-b'],
      activeId: 'p-a'
    })
    useReaderStore.getState().activateTab('p-b')
    expect(useReaderStore.getState().tabs['p-b']?.selectionMode).toBe(false)
    useReaderStore.getState().activateTab('p-a')
    expect(useReaderStore.getState().tabs['p-a']?.selectionMode).toBe(true)
    useReaderStore.getState().activateTab('p-b')
    useReaderStore.getState().setSelectionMode(true)
    expect(useReaderStore.getState().tabs['p-b']?.selectionMode).toBe(true)
    useReaderStore.getState().activateTab('p-a')
    useReaderStore.getState().setSelectionMode(false)
    expect(useReaderStore.getState().tabs['p-a']?.selectionMode).toBe(false)
    expect(useReaderStore.getState().tabs['p-b']?.selectionMode).toBe(true)
  })
})

describe('F-A3 选择模式 —— AnnotationLayer 面', () => {
  function mountLayer(): void {
    mount(
      <AnnotationLayer annotations={[ann()]} page={0} pageRoot={null} onChanged={vi.fn()} />
    )
  }

  it('③ rect pointerEvents：常规全部 auto；进入选择模式 → 全部 none', () => {
    mountLayer()
    for (const r of Array.from(annRects())) {
      expect(r.style.pointerEvents).toBe('auto')
    }
    act(() => {
      useReaderStore.getState().setSelectionMode(true)
    })
    for (const r of Array.from(annRects())) {
      expect(r.style.pointerEvents).toBe('none')
    }
  })

  it('④ 常规点击 rect：菜单出现+noteHighlight 信号 seq 变；选择模式点击同一 rect：菜单不出现+信号不变', () => {
    mountLayer()
    act(() => {
      annRects()[0]!.click()
    })
    expect(host!.querySelector('[data-testid="annotation-menu"]')).not.toBeNull()
    expect(useReaderStore.getState().noteHighlight).toEqual({ annotationId: 'a-1', seq: 1 })
    act(() => {
      useReaderStore.getState().setSelectionMode(true)
    })
    act(() => {
      annRects()[0]!.click()
    })
    expect(host!.querySelector('[data-testid="annotation-menu"]')).toBeNull()
    expect(useReaderStore.getState().noteHighlight).toEqual({ annotationId: 'a-1', seq: 1 })
  })

  it('⑤ S1：菜单开 → 切选择 → 菜单关；切回常规不自动恢复', () => {
    mountLayer()
    act(() => {
      annRects()[0]!.click()
    })
    expect(host!.querySelector('[data-testid="annotation-menu"]')).not.toBeNull()
    act(() => {
      useReaderStore.getState().setSelectionMode(true)
    })
    expect(host!.querySelector('[data-testid="annotation-menu"]')).toBeNull()
    act(() => {
      useReaderStore.getState().setSelectionMode(false)
    })
    expect(host!.querySelector('[data-testid="annotation-menu"]')).toBeNull()
  })

  it('⑧ S1 编辑器臂：菜单→添加笔记→editor 开 → 切选择 → editor 关；切回不自动恢复', () => {
    mountLayer()
    act(() => {
      annRects()[0]!.click()
    })
    const addNote = [...host!.querySelectorAll('button')].find(
      (b) => b.textContent === '添加笔记'
    )
    expect(addNote).toBeDefined()
    act(() => {
      addNote!.click()
    })
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(host!.querySelector('[data-testid="annotation-menu"]')).toBeNull()
    act(() => {
      useReaderStore.getState().setSelectionMode(true)
    })
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
    act(() => {
      useReaderStore.getState().setSelectionMode(false)
    })
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
  })
})

describe('F-A3 选择模式 —— AiAnnotationLayer 面', () => {
  it('⑥ 常规点击置 selectedId（有 true）→ 切选择：rect none+data-highlight 全 false（S4）+点击守卫', () => {
    const onJump = vi.fn()
    mount(
      <AiAnnotationLayer
        aiNotes={[aiNoteFixture()]}
        page={0}
        pageRoot={makePageRoot('SMART WATER TEST DOC')}
        onJumpToNote={onJump}
      />
    )
    expect(aiRects().length).toBeGreaterThan(0)
    expect(aiRects()[0]!.style.pointerEvents).toBe('auto')
    act(() => {
      aiRects()[0]!.click()
    })
    const hasTrue = Array.from(aiRects()).some(
      (r) => r.getAttribute('data-highlight') === 'true'
    )
    expect(hasTrue).toBe(true)
    expect(onJump).toHaveBeenCalledTimes(1)
    act(() => {
      useReaderStore.getState().setSelectionMode(true)
    })
    expect(aiRects()[0]!.style.pointerEvents).toBe('none')
    for (const r of Array.from(aiRects())) {
      expect(r.getAttribute('data-highlight')).toBe('false')
    }
    act(() => {
      aiRects()[0]!.click()
    })
    expect(onJump).toHaveBeenCalledTimes(1)
  })
})

describe('F-A3 选择模式 —— ReaderToolbar 面', () => {
  it('⑦ aria-pressed 反映 selectionMode；选中态强调边框；点击恰调一次 onToggleSelectionMode', () => {
    const onToggle = vi.fn()
    mount(
      <ReaderToolbar
        page={0}
        totalPages={10}
        zoom={1}
        color="yellow"
        onNavigate={() => undefined}
        onZoom={() => undefined}
        onColor={() => undefined}
        selectionMode={false}
        onToggleSelectionMode={onToggle}
      />
    )
    const btn = [...host!.querySelectorAll('button')].find(
      (b) => b.textContent === '选择模式'
    )
    expect(btn).toBeDefined()
    expect(btn!.getAttribute('aria-pressed')).toBe('false')
    act(() => {
      root?.render(
        <ReaderToolbar
          page={0}
          totalPages={10}
          zoom={1}
          color="yellow"
          onNavigate={() => undefined}
          onZoom={() => undefined}
          onColor={() => undefined}
          selectionMode={true}
          onToggleSelectionMode={onToggle}
        />
      )
    })
    expect(btn!.getAttribute('aria-pressed')).toBe('true')
    expect((btn as HTMLElement).style.borderColor).toBe('var(--accent)')
    act(() => {
      ;(btn as HTMLElement).click()
    })
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
