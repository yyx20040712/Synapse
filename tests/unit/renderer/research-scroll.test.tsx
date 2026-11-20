// @vitest-environment jsdom
/**
 * [B2] 研究面板滚动会话记忆 —— 组件级锁定合约（always-active）。
 *
 * 覆盖任务书事件表：页签点击收账+恢复（点击时序读瞬时 scrollTop——切页签即
 * 卸载旧面板，事后不可读）/文献切换复合序列（activeId 变化 effect 收账旧文献
 * +恢复新文献，不漏写）/卸载收账+重挂恢复（离开阅读器再返回）/新文献缺省
 * 0/收账点不双写（点击路径单次写）/挂载不误收账。
 * 有效滚动容器解析：笔记页签=fragment-list 父容器、AI 页签=ai-message-list
 * （面板内部自持滚动——host 本体不溢出），与实现同口径的测试侧解析器断言。
 * 高亮让位（noteHighlight 驱动切换跳过恢复）归装配面
 * （reader-research-assembly.test.tsx——切换由装配层副作用驱动）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

makeApiStub({
  notes: { get: vi.fn(async () => ({ ok: true as const, data: null })), save: vi.fn() }
})

import { ResearchAside } from '../../../src/renderer/features/reader/panels/ResearchAside'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useAiSessionStore } from '../../../src/renderer/features/ai/aiSessionStore'
import type { Annotation } from '../../../src/shared/models/annotation'
import type { AiMessage } from '../../../src/shared/models/ai-domain'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom 无 scrollIntoView（FragmentNotesList 高亮滚动宿主 API 缺位）
Element.prototype.scrollIntoView = () => undefined

function ann(id: string, page: number): Annotation {
  return {
    id,
    paperId: 'p-1',
    page,
    kind: 'highlight',
    color: 'yellow',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 1,
    rects: [],
    comment: '',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  }
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

function unmount(): void {
  act(() => {
    root?.unmount()
  })
  root = null
}

/** 有效滚动容器（与实现 use-research-scroll 同口径——面板内部自持滚动面） */
function scrollerOf(tab: 'ai' | 'notes'): HTMLElement {
  const body = host?.querySelector('.rdr-research-body') as HTMLElement
  expect(body, 'host 滚动容器在场').not.toBeNull()
  if (tab === 'notes') {
    const list = body.querySelector('[data-testid="fragment-list"]')
    return (list?.parentElement as HTMLElement) ?? body
  }
  return (body.querySelector('[data-testid="ai-message-list"]') as HTMLElement) ?? body
}

function tabBtn(label: string): HTMLElement {
  const b = Array.from(host!.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (x) => x.textContent === label
  )
  expect(b, `页签 ${label} 在场`).toBeDefined()
  return b as HTMLButtonElement
}

beforeEach(() => {
  vi.clearAllMocks()
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], totalPages: 20 }) },
    order: ['p-1'],
    activeId: 'p-1',
    noteHighlight: null,
    researchOpen: true
  })
})

afterEach(() => {
  unmount()
  root = null
  host?.remove()
  host = null
})

describe('B2 研究面板滚动会话记忆 —— 组件面（收账三点+恢复）', () => {
  it('页签点击：先存旧页签瞬时 scrollTop→切换→恢复目标页签（点击时序收账——事后面板已卸载）', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], researchScroll: { notes: 80 } }) },
      order: ['p-1'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    // ai 页签滚动到 120（消息列表未挂=host 兜底承载）
    scrollerOf('ai').scrollTop = 120
    act(() => {
      tabBtn('笔记').click()
    })
    expect(useReaderStore.getState().tabs['p-1']?.researchScroll?.ai, '旧页签收账=点击前瞬时值').toBe(120)
    expect(scrollerOf('notes').scrollTop, '新页签恢复其记忆位置').toBe(80)
    expect(useReaderStore.getState().tabs['p-1']?.researchTab).toBe('notes')
  })

  it('点击路径单写（不双写）：一次页签切换恰一次 saveResearchScroll（点击收账+effect 收账不叠加）', () => {
    const real = useReaderStore.getState().saveResearchScroll
    const calls: Array<[string, 'ai' | 'notes', number]> = []
    useReaderStore.setState({
      saveResearchScroll: (paperId: string, tab: 'ai' | 'notes', scrollTop: number) => {
        calls.push([paperId, tab, scrollTop])
        real(paperId, tab, scrollTop)
      }
    })
    try {
      mount(<ResearchAside />)
      scrollerOf('ai').scrollTop = 120
      act(() => {
        tabBtn('笔记').click()
      })
      expect(calls, '点击切换恰一次收账').toHaveLength(1)
      expect(calls[0]).toEqual(['p-1', 'ai', 120])
    } finally {
      useReaderStore.setState({ saveResearchScroll: real })
    }
  })

  it('文献切换复合序列（不漏写）：p-1(ai,60)→p-2(notes,90) 双向收账+恢复互不覆盖', () => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)] }),
        'p-2': makeTab('p-2', { researchTab: 'notes', researchScroll: { notes: 90 } })
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    scrollerOf('ai').scrollTop = 60
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    expect(useReaderStore.getState().tabs['p-1']?.researchScroll?.ai, '旧文献旧页签收账').toBe(60)
    expect(scrollerOf('notes').scrollTop, '新文献页签位置恢复').toBe(90)
    // 回 p-1：p-2 的 notes 位置收账；p-1 的 ai 位置恢复
    act(() => {
      useReaderStore.setState({ activeId: 'p-1' })
    })
    expect(useReaderStore.getState().tabs['p-2']?.researchScroll?.notes, '往返收账（不漏写）').toBe(90)
    expect(scrollerOf('ai').scrollTop, '回程恢复（不丢位）').toBe(60)
  })

  it('卸载收账+重挂恢复（离开阅读器再返回）：unmount 存当前页签位置，remount 恢复', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], researchTab: 'notes' }) },
      order: ['p-1'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    scrollerOf('notes').scrollTop = 260
    unmount()
    expect(useReaderStore.getState().tabs['p-1']?.researchScroll?.notes, '卸载收账').toBe(260)
    // 重挂（返回阅读器）：恢复当前页签记忆位置
    mount(<ResearchAside />)
    expect(scrollerOf('notes').scrollTop, '重挂恢复').toBe(260)
  })

  it('新文献无字段=0/顶部：切到无 researchScroll 的文献回顶部', () => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)] }),
        'p-2': makeTab('p-2', {})
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    scrollerOf('ai').scrollTop = 77
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    expect(scrollerOf('ai').scrollTop, '无字段缺省回顶部').toBe(0)
    expect(useReaderStore.getState().tabs['p-2']?.researchScroll).toBeUndefined()
  })

  it('挂载不误收账：无切换交互零写入（收账仅由三个收账点驱动）', () => {
    const real = useReaderStore.getState().saveResearchScroll
    const calls: Array<[string, 'ai' | 'notes', number]> = []
    useReaderStore.setState({
      saveResearchScroll: (paperId: string, tab: 'ai' | 'notes', scrollTop: number) => {
        calls.push([paperId, tab, scrollTop])
        real(paperId, tab, scrollTop)
      }
    })
    try {
      mount(<ResearchAside />)
      expect(calls, '挂载/静默渲染零收账').toHaveLength(0)
    } finally {
      useReaderStore.setState({ saveResearchScroll: real })
    }
  })
})

// ── [B2 审查回炉] 探针红测（B-1×2/W-1/B-2——审查档 b2-review-699 复现配方；
//    真实 ready AI 消息列表挂载（aiSessionStore 直播态），消灭「消息列表未挂
//    =host 兜底」假绿夹具）──
const aiMessage: AiMessage = {
  id: 1,
  sessionId: 1,
  role: 'assistant',
  content: '真实 AI 消息列表条目',
  pinned: false,
  createdAt: '2026-05-01T00:00:00Z'
}

/** 直播 ready 会话态（消息列表真实挂载——open 微任务未冲刷窗口内确定性） */
function seedReadyAiPanel(): void {
  useAiSessionStore.setState({
    panels: { 'paper:p-1': { status: 'ready', sessionId: 1, messages: [aiMessage] } }
  })
}

function aiList(): HTMLElement {
  const el = host!.querySelector('[data-testid="ai-message-list"]') as HTMLElement | null
  expect(el, '真实 AI 消息列表在场（ready 直播态）').not.toBeNull()
  return el as HTMLElement
}

describe('B2 审查回炉 —— 收账读切换前旧值（B-1/W-1）', () => {
  beforeEach(() => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)] }),
        'p-2': makeTab('p-2', {})
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1',
      researchOpen: true
    })
    useAiSessionStore.setState({ panels: {} })
  })

  afterEach(() => {
    useAiSessionStore.setState({ panels: {} })
  })

  it('B-1①：切文献收账=切换前真实 AI 列表位置（非新 DOM 的 host 兜底 0）', () => {
    seedReadyAiPanel()
    mount(<ResearchAside />)
    aiList().scrollTop = 120
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    expect(useReaderStore.getState().tabs['p-1']?.researchScroll?.ai, '存实测 120 非 0').toBe(120)
  })

  it('B-1②：高亮驱动 AI→笔记切换收账=切换前真实 AI 列表位置', () => {
    seedReadyAiPanel()
    mount(<ResearchAside />)
    aiList().scrollTop = 90
    act(() => {
      useReaderStore.getState().notifyNoteHighlight('a-x')
    })
    act(() => {
      useReaderStore.getState().setResearchTab('notes')
    })
    expect(useReaderStore.getState().tabs['p-1']?.researchScroll?.ai, '信号驱动切换同样存旧值').toBe(90)
  })

  it('W-1：重复点击当前页签不得遗留 skip 标记（后续滚动+切文献照常收账）', () => {
    mount(<ResearchAside />)
    scrollerOf('ai').scrollTop = 10
    act(() => {
      tabBtn('AI 对话').click()
    })
    scrollerOf('ai').scrollTop = 70
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    expect(useReaderStore.getState().tabs['p-1']?.researchScroll?.ai, '存续滚后的 70 非 10').toBe(70)
  })
})

// ── [B2 审查回炉 B-2/N-1] rAF 恢复循环：新信号作废在途+生命周期（帧队列桩
//    驱动；scrollTop 属性夹取桩制造「目标暂不可达」的在途窗口）──
describe('B2 审查回炉 —— rAF 恢复循环作废与生命周期（B-2/N-1）', () => {
  let frames: FrameRequestCallback[]

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      frames.push(callback)
      return frames.length
    })
    useAiSessionStore.setState({ panels: {} })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useAiSessionStore.setState({ panels: {} })
  })

  /** scrollTop 属性夹取桩（max=内容上限——制造恢复目标暂不可达的在途窗口） */
  function clampScroll(el: HTMLElement): { get(): number; setMax(v: number): void; restore(): void } {
    let value = 0
    let max = 0
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => value,
      set: (next: number) => {
        value = Math.min(next, max)
      }
    })
    return {
      get: () => value,
      setMax: (v: number) => {
        max = v
      },
      restore: () => Reflect.deleteProperty(el, 'scrollTop')
    }
  }

  function notesScroller(): HTMLElement {
    const list = host!.querySelector('[data-testid="fragment-list"]') as HTMLElement | null
    expect(list, '片段列表在场').not.toBeNull()
    return (list?.parentElement as HTMLElement) ?? body2()
  }

  function body2(): HTMLElement {
    return host!.querySelector('.rdr-research-body') as HTMLElement
  }

  function pump(count: number): void {
    for (let i = 0; i < count && frames.length > 0; i += 1) {
      const cb = frames.shift()
      cb?.(0)
    }
  }

  it('B-2：已在 notes 页签+在途恢复+新 noteHighlight 信号→在途循环立即作废（高亮位不被写回）', () => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], researchTab: 'notes' }),
        'p-2': makeTab('p-2', { annotations: [ann('a-y', 7)], researchTab: 'notes', researchScroll: { notes: 500 } })
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    const stub = clampScroll(notesScroller())
    try {
      // 切文献：恢复 500 暂不可达（max=0）→ 在途（1 帧队列）
      act(() => {
        useReaderStore.setState({ activeId: 'p-2' })
      })
      expect(frames, '恢复进入在途重试').toHaveLength(1)
      // 新信号（同页签——无 changed 分支）：须立即作废在途循环
      act(() => {
        useReaderStore.getState().notifyNoteHighlight('a-y')
      })
      // 高亮滚动落位 50（FragmentNotesList 消费面语义——桩为直写）
      stub.setMax(1000)
      notesScroller().scrollTop = 50
      act(() => {
        frames.shift()?.(0)
      })
      expect(notesScroller().scrollTop, '在途帧不写回旧记忆位 500').toBe(50)
    } finally {
      stub.restore()
    }
  })

  it('N-1①：旧 token 回调不写 DOM 不续帧（连续切换旧循环不竞写）', () => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], researchTab: 'notes' }),
        'p-2': makeTab('p-2', { annotations: [ann('a-y', 7)], researchTab: 'notes', researchScroll: { notes: 500 } }),
        'p-3': makeTab('p-3', { annotations: [ann('a-z', 7)], researchTab: 'notes', researchScroll: { notes: 700 } })
      },
      order: ['p-1', 'p-2', 'p-3'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    const stub = clampScroll(notesScroller())
    try {
      // 循环一（切 p-2：目标 500 恒夹 0）→ 在途
      act(() => {
        useReaderStore.setState({ activeId: 'p-2' })
      })
      expect(frames, '循环一在途').toHaveLength(1)
      // 循环二（切 p-3：目标 700）接管——循环一作废
      act(() => {
        useReaderStore.setState({ activeId: 'p-3' })
      })
      expect(frames).toHaveLength(2)
      const stale = frames.splice(0, 1) // 循环一排队帧
      stub.setMax(1000)
      for (const cb of stale) act(() => cb(0))
      expect(notesScroller().scrollTop, '旧循环帧零写入（仍 0）').toBe(0)
      expect(frames, '旧循环不续帧').toHaveLength(1)
      pump(10)
      // 新循环（目标 700，可达）落位；旧循环不复活
      expect(notesScroller().scrollTop).toBe(700)
      expect(frames, '命中后停止续帧').toHaveLength(0)
    } finally {
      stub.restore()
    }
  })

  it('N-1②：卸载即停——排队帧不写不续', () => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], researchTab: 'notes' }),
        'p-2': makeTab('p-2', { annotations: [ann('a-y', 7)], researchTab: 'notes', researchScroll: { notes: 500 } })
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    const scroller = notesScroller()
    const stub = clampScroll(scroller)
    try {
      act(() => {
        useReaderStore.setState({ activeId: 'p-2' })
      })
      expect(frames, '恢复在途').toHaveLength(1)
      unmount()
      stub.setMax(1000)
      const queued = frames.splice(0)
      for (const cb of queued) act(() => cb(0))
      expect(scroller.scrollTop, '卸载后排队帧零写入').toBe(0)
      expect(frames, '不续帧').toHaveLength(0)
    } finally {
      stub.restore()
    }
  })

  it('N-1③：120 帧上限有界（目标恒不可达→循环自行终止）', () => {
    useReaderStore.setState({
      tabs: {
        'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], researchTab: 'notes' }),
        'p-2': makeTab('p-2', { annotations: [ann('a-y', 7)], researchTab: 'notes', researchScroll: { notes: 500 } })
      },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    mount(<ResearchAside />)
    const stub = clampScroll(notesScroller())
    try {
      act(() => {
        useReaderStore.setState({ activeId: 'p-2' })
      })
      expect(frames, '恢复在途').toHaveLength(1)
      let executed = 0
      while (frames.length > 0 && executed < 300) {
        const cb = frames.shift()
        executed += 1
        act(() => cb?.(0))
      }
      expect(executed, '帧总数有界（排队帧=attempt1..121 恰 121）').toBe(121)
      expect(frames, '循环终止后零排队帧').toHaveLength(0)
    } finally {
      stub.restore()
    }
  })
})
