// @vitest-environment jsdom
/**
 * [F-VISFB-43 U8] App 提取桥单测（useFigureExtractionBridge——FigureExtractor
 * 模块级 mock+figures 域 api 桩：挂载沿驱动/串行序/begin null 跳过/store 硬拒
 * 中止补账/提取异常补账/import done 事件再驱动）。always-active（K3 沿承）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const pendingFigures = vi.fn()
const beginFigure = vi.fn()
const storeFigure = vi.fn()
const completeFigure = vi.fn()
makeApiStub({
  figures: {
    pending: pendingFigures,
    begin: beginFigure,
    store: storeFigure,
    complete: completeFigure
  }
})

/** FigureExtractor 模块级 mock（零 pdfjs/零真渲染——编排面归 U3 单测锁） */
const loadFigureDocument = vi.fn()
const extractDocFigures = vi.fn()
vi.mock('../../../src/renderer/shared/figures/FigureExtractor', () => ({
  loadFigureDocument: (...a: unknown[]) => loadFigureDocument(...(a as [string])),
  loadFigureOpCodes: vi.fn(async () => ({ save: 1, restore: 2, transform: 3, formBegin: 4, formEnd: 5, paintImageXObject: 6 })),
  makeProductionDeps: (over: { sendAsset: (a: unknown) => Promise<boolean> }) => ({
    ops: { save: 1, restore: 2, transform: 3, formBegin: 4, formEnd: 5, paintImageXObject: 6 },
    digest: async () => 'd',
    encodePng: async () => new Uint8Array(4),
    sendAsset: over.sendAsset,
    sleep: async () => undefined,
    now: () => 0
  }),
  extractDocFigures: (...a: unknown[]) => extractDocFigures(...(a as [unknown, unknown]))
}))
import { useFigureExtractionBridge } from '../../../src/renderer/shared/figures/useFigureExtractionBridge'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const ASSET = { digest: 'a'.repeat(64), bytes: new Uint8Array(4), page: 1, width: 10, height: 10, ctmX: 0, ctmY: 0, ctmW: 100, ctmH: 100 }

let root: Root | null = null
let host: HTMLDivElement | null = null
let importDone: ((e: { phase: string }) => void) | null = null

function mountBridge(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<Probe />)
  })
}

function Probe(): JSX.Element {
  useFigureExtractionBridge()
  return <div />
}

async function flush(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  pendingFigures.mockResolvedValue({ ok: true, data: { jobs: [] } })
  beginFigure.mockResolvedValue({ ok: true, data: { token: 't-1', sha256: 'sha-1' } })
  storeFigure.mockResolvedValue({ ok: true, data: { stored: true, figureId: 'fig-1', reason: null } })
  completeFigure.mockResolvedValue({ ok: true, data: { status: 'ready' } })
  loadFigureDocument.mockResolvedValue({ numPages: 0, getPage: vi.fn(), destroy: vi.fn(async () => undefined) })
  extractDocFigures.mockImplementation(async (_doc: unknown, deps: { sendAsset(a: typeof ASSET): Promise<boolean> }) => {
    const stored = await deps.sendAsset(ASSET)
    return { stored: stored ? 1 : 0, excess: 0, failed: 0 }
  })
  importDone = null
  stubApiEvents({
    onImportProgress: (cb: (e: { phase: string }) => void) => {
      importDone = cb
      return () => {
        importDone = null
      }
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

describe('[F-VISFB-43 U8] App 提取桥（mock 编排件+figures api 桩）', () => {
  it('挂载沿驱动：pending 2 篇→begin×2·提取×2·store/complete 各 2（串行=pending 序）', async () => {
    pendingFigures.mockResolvedValue({
      ok: true,
      data: { jobs: [{ paperId: 'p-1', sha256: 's1' }, { paperId: 'p-2', sha256: 's2' }] }
    })
    mountBridge()
    await flush()
    expect(pendingFigures).toHaveBeenCalledTimes(1)
    expect(beginFigure).toHaveBeenCalledTimes(2)
    expect(loadFigureDocument).toHaveBeenCalledWith('p-1')
    expect(loadFigureDocument).toHaveBeenCalledWith('p-2')
    expect(storeFigure).toHaveBeenCalledTimes(2)
    expect(completeFigure).toHaveBeenCalledTimes(2)
    expect(completeFigure).toHaveBeenCalledWith({ token: 't-1', excess: 0, failed: 0 })
  })

  it('begin null（非 pending/无单）→跳过该篇（零提取零补账）', async () => {
    pendingFigures.mockResolvedValue({ ok: true, data: { jobs: [{ paperId: 'p-1', sha256: 's1' }] } })
    beginFigure.mockResolvedValue({ ok: true, data: null })
    mountBridge()
    await flush()
    expect(loadFigureDocument).not.toHaveBeenCalled()
    expect(completeFigure).not.toHaveBeenCalled()
  })

  it('store 硬拒（Result err=会话死）→中止该篇→complete({failed:1}) 补账→续下一篇', async () => {
    pendingFigures.mockResolvedValue({
      ok: true,
      data: { jobs: [{ paperId: 'p-1', sha256: 's1' }, { paperId: 'p-2', sha256: 's2' }] }
    })
    storeFigure.mockResolvedValueOnce({ ok: false, error: { code: 'CONFLICT', message: '会话失效' } })
    mountBridge()
    await flush()
    expect(extractDocFigures).toHaveBeenCalledTimes(2)
    expect(storeFigure).toHaveBeenCalledTimes(2)
    expect(completeFigure).toHaveBeenCalledWith({ token: 't-1', excess: 0, failed: 1 })
    expect(loadFigureDocument).toHaveBeenCalledWith('p-2')
  })

  it('提取编排抛错→complete({failed:1}) 补账（job failed 落账径）', async () => {
    pendingFigures.mockResolvedValue({ ok: true, data: { jobs: [{ paperId: 'p-1', sha256: 's1' }] } })
    extractDocFigures.mockRejectedValue(new Error('op 流崩溃'))
    mountBridge()
    await flush()
    expect(completeFigure).toHaveBeenCalledWith({ token: 't-1', excess: 0, failed: 1 })
  })

  it('import done 事件沿再驱动：首轮空→事件后补查 pending（导入建单后的触发沿）', async () => {
    mountBridge()
    await flush()
    expect(beginFigure).not.toHaveBeenCalled()
    pendingFigures.mockResolvedValue({ ok: true, data: { jobs: [{ paperId: 'p-9', sha256: 's9' }] } })
    await act(async () => {
      importDone?.({ phase: 'done' })
      await Promise.resolve()
    })
    await flush()
    expect(beginFigure).toHaveBeenCalledWith({ paperId: 'p-9' })
  })

  it('〔回炉轮2 ⒞补强〕提取中到达 done→queued 置位→首轮毕补跑第二轮且 begin 第二发（第二轮 pending 非空新 job）', async () => {
    let releaseFirst: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      releaseFirst = r
    })
    pendingFigures.mockResolvedValueOnce({
      ok: true,
      data: { jobs: [{ paperId: 'p-1', sha256: 's1' }] }
    }).mockResolvedValueOnce({
      ok: true,
      data: { jobs: [{ paperId: 'p-9', sha256: 's9' }] }
    }).mockResolvedValue({ ok: true, data: { jobs: [] } })
    extractDocFigures.mockImplementationOnce(async () => {
      await gate
      return { stored: 0, excess: 0, failed: 0 }
    })
    mountBridge()
    await act(async () => {
      await Promise.resolve()
    })
    expect(beginFigure).toHaveBeenCalledTimes(1)
    await act(async () => {
      importDone?.({ phase: 'done' })
      await Promise.resolve()
    })
    expect(pendingFigures).toHaveBeenCalledTimes(1)
    expect(extractDocFigures).toHaveBeenCalledTimes(1)
    await act(async () => {
      releaseFirst?.()
      for (let i = 0; i < 12; i += 1) await Promise.resolve()
    })
    expect(pendingFigures).toHaveBeenCalledTimes(2)
    expect(beginFigure).toHaveBeenCalledTimes(2)
    expect(beginFigure).toHaveBeenLastCalledWith({ paperId: 'p-9' })
    expect(loadFigureDocument).toHaveBeenLastCalledWith('p-9')
  })

  it('〔回炉轮2 ⒝〕跨格：running 中 done 置 queued→unmount→release 首轮→零后续 pending/begin 驱动（disposed 代际）', async () => {
    let releaseFirst: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      releaseFirst = r
    })
    pendingFigures.mockResolvedValue({
      ok: true,
      data: { jobs: [{ paperId: 'p-1', sha256: 's1' }] }
    })
    extractDocFigures.mockImplementationOnce(async () => {
      await gate
      return { stored: 0, excess: 0, failed: 0 }
    }).mockImplementation(async () => ({ stored: 0, excess: 0, failed: 0 }))
    mountBridge()
    await act(async () => {
      await Promise.resolve()
    })
    expect(beginFigure).toHaveBeenCalledTimes(1)
    await act(async () => {
      importDone?.({ phase: 'done' })
      await Promise.resolve()
    })
    expect(pendingFigures).toHaveBeenCalledTimes(1)
    act(() => {
      root?.unmount()
    })
    await act(async () => {
      releaseFirst?.()
      for (let i = 0; i < 12; i += 1) await Promise.resolve()
    })
    expect(pendingFigures).toHaveBeenCalledTimes(1)
    expect(beginFigure).toHaveBeenCalledTimes(1)
  })

  it('〔回炉轮1 W-1⒝〕在飞轮卸载→无崩溃+后续事件零驱动（off 生效）', async () => {
    let releaseFirst: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      releaseFirst = r
    })
    pendingFigures.mockResolvedValue({
      ok: true,
      data: { jobs: [{ paperId: 'p-1', sha256: 's1' }] }
    })
    extractDocFigures.mockImplementationOnce(async () => {
      await gate
      return { stored: 0, excess: 0, failed: 0 }
    }).mockImplementation(async () => ({ stored: 0, excess: 0, failed: 0 }))
    mountBridge()
    await act(async () => {
      await Promise.resolve()
    })
    expect(beginFigure).toHaveBeenCalledTimes(1)
    act(() => {
      root?.unmount()
    })
    expect(() => {
      releaseFirst?.()
    }).not.toThrow()
    await act(async () => {
      for (let i = 0; i < 10; i += 1) await Promise.resolve()
    })
    expect(importDone).toBeNull()
    expect(pendingFigures).toHaveBeenCalledTimes(1)
    expect(beginFigure).toHaveBeenCalledTimes(1)
  })

  it('pending 失败（Result err）→静默弃轮（下次事件沿重试——零补账）', async () => {
    pendingFigures.mockResolvedValue({ ok: false, error: { code: 'IO_ERROR', message: '库不可用' } })
    mountBridge()
    await flush()
    expect(beginFigure).not.toHaveBeenCalled()
    expect(completeFigure).not.toHaveBeenCalled()
  })
})
