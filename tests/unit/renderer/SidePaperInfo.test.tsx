// @vitest-environment jsdom
/**
 * [F-UIRES-04 批 3c] SidePaperInfo 连接件单测（F-PINFO-01 顺带补锁——v196
 * §1-1 三断言：M1 error 面/重试观察链/extracting 省略面；消费面测试盲区
 * 3b 批零覆盖）。jsdom 零 IPC：paperInfoStore 面与 M2 面（PaperImageExtractor）
 * 均模块级 mock（最小面——store 直调 getState 桩；PaperInfoSection 用真件
 * 经 mock 后的提取面渲染）。
 * - ①M1 error 面=「信息加载失败」行+重试钮在场；②重试钮点击→store.retry
 *   被调（参数=paperId）；③extracting 态→strip 与降级行双缺席（C2-② 瞬态
 *   非 error 面）；④重试观察链最小锁=mock getPaperImages 首返 error 引用、
 *   advanceTimers(250) 后返 extracting 新引用→断言下传 PaperInfoSection 的
 *   images 更新（250ms 轮询捕捉 error→extracting 转移——I8 通道）。
 * - always-active（不经 guardedDescribe——三屋结构性缺位教训 K3 沿承）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import { makeDetail } from '../../utils/factories'

/** store 桩（模块级单例——view 直改后重挂即生效；getState 返回同引用） */
const storeState = {
  view: { status: 'idle' } as { status: 'idle' | 'loading' | 'ready' | 'error'; data?: PaperDetail; error?: string },
  select: vi.fn(),
  retry: vi.fn(),
  unmount: vi.fn()
}
vi.mock('../../../src/renderer/shared/paperInfoStore', () => ({
  usePaperInfoStore: Object.assign(
    (sel: (s: typeof storeState) => unknown) => sel(storeState),
    { getState: () => storeState }
  )
}))
/** M2 桩（PaperInfoSection 的 retryPaperImages/paperIdFromFileUrl 一并覆盖） */
vi.mock('../../../src/renderer/shared/PaperImageExtractor', () => ({
  selectPaperImages: vi.fn(),
  getPaperImages: vi.fn(),
  unmountPaperImages: vi.fn(),
  paperIdFromFileUrl: (u: string) => u.slice('app-file://'.length),
  retryPaperImages: vi.fn()
}))
import { getPaperImages } from '../../../src/renderer/shared/PaperImageExtractor'
import { SidePaperInfo } from '../../../src/renderer/features/lineage/SidePaperInfo'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const EXTRACTING = { status: 'extracting' as const, images: [], failedPages: 0 }
const ERROR_ENTRY = { status: 'error' as const, images: [], failedPages: 0 }

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(paperId: string): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<SidePaperInfo paperId={paperId} />)
  })
}

function setView(view: typeof storeState.view): void {
  storeState.view = view
}

beforeEach(() => {
  vi.clearAllMocks()
  storeState.view = { status: 'ready', data: makeDetail() }
  vi.mocked(getPaperImages).mockReturnValue(EXTRACTING)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.useRealTimers()
})

describe('[F-UIRES-04 批 3c F-PINFO-01] SidePaperInfo 连接件（store/M2 双 mock）', () => {
  it('M1 error 面：「信息加载失败」行+重试钮在场（aria-label=重试）', () => {
    setView({ status: 'error', error: 'IPC 崩' })
    mount('paper-1')
    expect(host?.textContent).toContain('信息加载失败')
    const btn = host?.querySelector('[data-testid="paper-info-error"] button[aria-label="重试"]')
    expect(btn).not.toBeNull()
  })

  it('M1 重试钮点击→store.retry 被调（参数=paperId）', () => {
    setView({ status: 'error', error: 'IPC 崩' })
    mount('paper-1')
    act(() => {
      host
        ?.querySelector('[data-testid="paper-info-error"] button[aria-label="重试"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(storeState.retry).toHaveBeenCalledTimes(1)
    expect(storeState.retry).toHaveBeenCalledWith('paper-1')
  })

  it('extracting 态：strip 与降级行双缺席（借出弃置瞬态非 error 面——C2-②）', () => {
    mount('paper-1')
    expect(host?.querySelector('[data-testid="paper-info-section"]')).not.toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-strip-retry"]')).toBeNull()
    expect(host?.textContent).not.toContain('文中图片提取失败')
  })

  it('重试观察链：getPaperImages 首返 error 引用→250ms 轮询捕捉 extracting 新引用→下传 images 更新（降级行转缺席）', () => {
    vi.useFakeTimers()
    vi.mocked(getPaperImages).mockReturnValueOnce(ERROR_ENTRY).mockReturnValue(EXTRACTING)
    mount('paper-1')
    // 扇出帧（layout effect）快照=error 引用→PaperInfoSection 降级行在场
    expect(host?.textContent).toContain('文中图片提取失败')
    // 轮询 250ms：error 续轮（I8 通道）捕捉 retryPaperImages 拉起的 extracting 转移
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(host?.textContent).not.toContain('文中图片提取失败')
    expect(host?.querySelector('[data-testid="paper-info-section"]')).not.toBeNull()
  })
})
