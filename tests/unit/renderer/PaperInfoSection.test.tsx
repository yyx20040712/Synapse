// @vitest-environment jsdom
/**
 * [F-VISFB-43 U7] PaperInfoSection 纯件单测（换源版：props={data, figures?}——
 * DB 图表清单注入，<img src=app-file://<paperId>/figures/<figureId>>；零提取
 * 调用/零轮询/断网不现场渲染）。沿承 3b r2 覆盖面：strip 双图/空省略/作者与
 * 摘要空省略/M3 展开往返+key 换篇复位。always-active（K3 沿承）。
 */
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { PaperInfoSection } from '../../../src/renderer/shared/PaperInfoSection'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { FigureItem } from '../../../src/shared/ipc/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makePaper(patch: Partial<PaperDetail> = {}): PaperDetail {
  return {
    id: 'p-1',
    title: '纯件测试论文',
    authors: ['张三丰', '李四光'],
    year: 2024,
    venue: 'Water Res.',
    doi: null,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: '2026-01-01T00:00:00Z',
    folderId: '__main__',
    impactFactor: null,
    isStarred: false,
    abstract: '面向智慧水务场景的长文摘要锚句。',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: 'app-file://p-1',
    fileName: 'paper.pdf',
    updatedAt: '2026-01-01T00:00:00Z',
    tags: [],
    ...patch
  }
}

const FIGS: FigureItem[] = [
  { figureId: 'fig-a', page: 3, width: 308, height: 209 },
  { figureId: 'fig-b', page: 7, width: 481, height: 300 }
]

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('[F-VISFB-43 U7] PaperInfoSection 纯件（props 注入零 IPC 零提取）', () => {
  it('figures 两项：strip 在场 2 图且 src=app-file 协议形态+alt 含页码', () => {
    mount(<PaperInfoSection data={makePaper()} figures={FIGS} />)
    const imgs = host?.querySelectorAll('.pi-strip img')
    expect(imgs?.length).toBe(2)
    expect(imgs?.[0]?.getAttribute('src')).toBe('app-file://p-1/figures/fig-a')
    expect(imgs?.[1]?.getAttribute('src')).toBe('app-file://p-1/figures/fig-b')
    expect(imgs?.[0]?.getAttribute('alt')).toContain('第 3 页')
  })

  it('figures 缺席→strip 省略（断网/无提取不现场渲染——非 error 面零降级行）', () => {
    mount(<PaperInfoSection data={makePaper()} />)
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-strip-retry"]')).toBeNull()
  })

  it('figures 空数组→strip 省略（提取过零资产=无图可显）', () => {
    mount(<PaperInfoSection data={makePaper()} figures={[]} />)
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
  })

  it('空省略：authors=[]→作者块缺席；abstract=""→摘要块与 toggle 均缺席', () => {
    mount(<PaperInfoSection data={makePaper({ authors: [], abstract: '' })} figures={FIGS} />)
    expect(host?.querySelector('[data-testid="paper-info-authors"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-abstract"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-abstract-toggle"]')).toBeNull()
  })

  it('M3：toggle 展开/收起往返（class open）；key={data.id} 换篇重挂载→expanded 复位', () => {
    const p1 = makePaper()
    mount(<PaperInfoSection key={p1.id} data={p1} figures={FIGS} />)
    const abs = () => host?.querySelector('[data-testid="paper-info-abstract"]')
    const toggle = () => host?.querySelector('[data-testid="paper-info-abstract-toggle"]')
    expect(abs()?.classList.contains('open')).toBe(false)
    act(() => {
      toggle()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(abs()?.classList.contains('open')).toBe(true)
    act(() => {
      toggle()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(abs()?.classList.contains('open')).toBe(false)
    act(() => {
      toggle()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(abs()?.classList.contains('open')).toBe(true)
    const p2 = makePaper({ id: 'p-2', fileUrl: 'app-file://p-2' })
    act(() => {
      root?.render(<PaperInfoSection key={p2.id} data={p2} figures={FIGS} />)
    })
    expect(abs()?.classList.contains('open')).toBe(false)
  })
})
