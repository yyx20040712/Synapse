// @vitest-environment jsdom
/**
 * [F-VISFB-43 U7] SidePaperInfo 连接件单测（换源版：图表清单=figures.list IPC
 * 单发拉取——零轮询零提取调用；M1 面沿承 3c）。jsdom：paperInfoStore 模块级
 * mock+api-client-mock 工厂（figures.list 桩）。always-active（K3 沿承）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeDetail } from '../../utils/factories'

const listFigures = vi.fn()
makeApiStub({ figures: { list: listFigures } })

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
import { SidePaperInfo } from '../../../src/renderer/features/lineage/SidePaperInfo'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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
  listFigures.mockResolvedValue({
    ok: true,
    data: {
      figures: [
        { figureId: 'fig-a', page: 3, width: 308, height: 209 },
        { figureId: 'fig-b', page: 7, width: 481, height: 300 }
      ],
      job: { status: 'ready', excess: 0, failedCount: 0 }
    }
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

describe('[F-VISFB-43 U7] SidePaperInfo 连接件（store mock+figures.list 桩）', () => {
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

  it('图表清单拉取：figures.list 以 paperId 调用→strip 2 图（app-file 协议 src）', async () => {
    mount('paper-1')
    await act(async () => {
      await Promise.resolve()
    })
    expect(listFigures).toHaveBeenCalledWith({ paperId: 'paper-1' })
    const imgs = host?.querySelectorAll('.pi-strip img')
    expect(imgs?.length).toBe(2)
    expect(imgs?.[0]?.getAttribute('src')).toBe('app-file://paper-1/figures/fig-a')
  })

  it('零资产（figures=[]）：strip 省略且零降级重试行（断网/无提取不现场渲染）', async () => {
    listFigures.mockResolvedValue({ ok: true, data: { figures: [], job: null } })
    mount('paper-1')
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-strip-retry"]')).toBeNull()
  })

  it('拉取失败静默：Result err→strip 省略不抛（派生面子件不挡主件）', async () => {
    listFigures.mockResolvedValue({ ok: false, error: { code: 'NOT_FOUND', message: '文献不存在' } })
    mount('paper-1')
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelector('[data-testid="paper-info-section"]')).not.toBeNull()
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
  })

  it('〔回炉轮2 条件⒝〕换篇 deferred 首帧锚：新拉取挂起期间零旧 strip img 在场（新 paperId 拼旧 figureId 破图帧不可达）', async () => {
    mount('paper-1')
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelectorAll('.pi-strip img').length).toBe(2)
    let release: (() => void) | null = null
    listFigures.mockReturnValueOnce(
      new Promise((r) => {
        release = () => r({ ok: true, data: { figures: [{ figureId: 'fig-n', page: 2, width: 100, height: 100 }], job: null } })
      })
    )
    setView({ status: 'ready', data: makeDetail({ id: 'paper-2' } as Partial<PaperDetail>) })
    act(() => {
      root?.render(<SidePaperInfo paperId="paper-2" />)
    })
    expect(host?.querySelectorAll('.pi-strip img').length).toBe(0)
    await act(async () => {
      release?.()
      await Promise.resolve()
    })
    const img = host?.querySelector('.pi-strip img')
    expect(img?.getAttribute('src')).toBe('app-file://paper-2/figures/fig-n')
  })

  it('换篇重拉：paperId 变→figures.list 以新 id 再调且 strip 换源', async () => {
    mount('paper-1')
    await act(async () => {
      await Promise.resolve()
    })
    setView({ status: 'ready', data: makeDetail({ id: 'paper-2' } as Partial<PaperDetail>) })
    act(() => {
      root?.render(<SidePaperInfo paperId="paper-2" />)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(listFigures).toHaveBeenCalledWith({ paperId: 'paper-2' })
    const imgs = host?.querySelectorAll('.pi-strip img')
    expect(imgs?.[0]?.getAttribute('src')).toBe('app-file://paper-2/figures/fig-a')
  })
})
