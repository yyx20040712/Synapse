// @vitest-environment jsdom
/**
 * [F-UIRES-04 批 3b 回炉 r2] PaperInfoSection 纯件单测（门一双审 R-补测——
 * 治纯件测试盲区）。jsdom 零 IPC：props 数据注入直测渲染分派（纯展示件
 * 无 store/无 window.api 面——api-client-mock 不需挂）。
 * - 覆盖面：strip ready 双图/partial 徽注计数锚/作者与摘要空省略/images
 *   缺席省略（C2-②）/error 降级行+重试微钮参数恒等锚（paperIdFromFileUrl
 *   派生单源——透传 mock）/M3 展开往返+key={data.id} 换篇复位（r2 R-帧修②）。
 * - mock 面：PaperImageExtractor 模块级 vi.mock（retryPaperImages=vi.fn；
 *   paperIdFromFileUrl=透传实现——pId 派生恒等锚）。类型 import 零涉。
 * - always-active（不经 guardedDescribe——三屋结构性缺位教训 K3 沿承）。
 */
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/renderer/shared/PaperImageExtractor', () => ({
  paperIdFromFileUrl: (u: string) => u.slice('app-file://'.length),
  retryPaperImages: vi.fn()
}))
import { retryPaperImages } from '../../../src/renderer/shared/PaperImageExtractor'
import { PaperInfoSection } from '../../../src/renderer/shared/PaperInfoSection'
import type { PaperDetail } from '../../../src/shared/models/paper'

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

const READY = { status: 'ready' as const, images: ['data:a', 'data:b'], failedPages: 0 }
const ERR = { status: 'error' as const, images: [], failedPages: 0 }

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
  vi.mocked(retryPaperImages).mockClear()
})

describe('[F-UIRES-04 批 3b r2] PaperInfoSection 纯件（props 注入零 IPC）', () => {
  it('ready：strip 在场 2 图（dataURL 横滚条）', () => {
    mount(<PaperInfoSection data={makePaper()} images={READY} />)
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).not.toBeNull()
    expect(host?.querySelectorAll('.pi-strip img').length).toBe(2)
  })

  it('partial：failedPages=3 徽注在场（计数锚）', () => {
    mount(<PaperInfoSection data={makePaper()} images={{ ...READY, status: 'partial', failedPages: 3 }} />)
    expect(host?.textContent).toContain('3 页提取失败')
  })

  it('空省略：authors=[]→作者块缺席；abstract=""→摘要块与 toggle 均缺席', () => {
    mount(<PaperInfoSection data={makePaper({ authors: [], abstract: '' })} images={READY} />)
    expect(host?.querySelector('[data-testid="paper-info-authors"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-abstract"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-abstract-toggle"]')).toBeNull()
  })

  it('images 缺席→strip 与降级行均缺席（C2-② 借出弃置瞬态非 error 面）', () => {
    mount(<PaperInfoSection data={makePaper()} />)
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-strip-retry"]')).toBeNull()
    expect(host?.textContent).not.toContain('文中图片提取失败')
  })

  it('error：降级行+重试微钮在场；点击→retryPaperImages(pId 派生单源, fileUrl) 恒等锚', () => {
    mount(<PaperInfoSection data={makePaper()} images={ERR} />)
    expect(host?.textContent).toContain('文中图片提取失败')
    const btn = host?.querySelector('[data-testid="paper-info-strip-retry"]')
    expect(btn).not.toBeNull()
    act(() => {
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(retryPaperImages).toHaveBeenCalledTimes(1)
    expect(retryPaperImages).toHaveBeenCalledWith('p-1', 'app-file://p-1')
  })

  it('M3：toggle 展开/收起往返（class open）；key={data.id} 换篇重挂载→expanded 复位', () => {
    const p1 = makePaper()
    mount(<PaperInfoSection key={p1.id} data={p1} />)
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
    // 换篇同位重挂（消费面 key={view.data.id}——r2 R-帧修②）：展开态随重挂复位
    act(() => {
      toggle()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(abs()?.classList.contains('open')).toBe(true)
    const p2 = makePaper({ id: 'p-2', fileUrl: 'app-file://p-2' })
    act(() => {
      root?.render(<PaperInfoSection key={p2.id} data={p2} />)
    })
    expect(abs()?.classList.contains('open')).toBe(false)
  })
})
