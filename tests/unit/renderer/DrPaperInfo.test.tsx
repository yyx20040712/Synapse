// @vitest-environment jsdom
/**
 * [F-VISFB-43 回炉轮1 W-4] DrPaperInfo 连接件单测（换源版行为锁）：
 * 挂载拉取→strip 协议 src/**换篇首帧零 strip img**（snapshot+render 期派生
 * 重置——新 paperId 拼旧 figureId 破图帧结构性不可达）/零资产省略。
 * jsdom：api-client-mock 工厂（figures.list 桩）。always-active（K3 沿承）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeDetail } from '../../utils/factories'

const listFigures = vi.fn()
makeApiStub({ figures: { list: listFigures } })

import { DrPaperInfo } from '../../../src/renderer/features/library/DrPaperInfo'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(detail: ReturnType<typeof makeDetail>): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<DrPaperInfo detail={detail} />)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  listFigures.mockResolvedValue({
    ok: true,
    data: {
      figures: [{ figureId: 'fig-a', page: 3, width: 308, height: 209 }],
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

describe('[F-VISFB-43 回炉轮1] DrPaperInfo 连接件（figures.list 桩）', () => {
  it('挂载拉取：strip 1 图且 src=app-file 协议形态', async () => {
    mount(makeDetail())
    await act(async () => {
      await Promise.resolve()
    })
    expect(listFigures).toHaveBeenCalledWith({ paperId: 'paper-1' })
    const img = host?.querySelector('.pi-strip img')
    expect(img?.getAttribute('src')).toBe('app-file://paper-1/figures/fig-a')
  })

  it('换篇首帧零 strip img（W-4：新拉取未落 snap 前=undefined 下传，破图帧不可达）', async () => {
    mount(makeDetail())
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelectorAll('.pi-strip img').length).toBe(1)
    let release: (() => void) | null = null
    listFigures.mockReturnValueOnce(
      new Promise((r) => {
        release = () => r({ ok: true, data: { figures: [{ figureId: 'fig-z', page: 9, width: 100, height: 100 }], job: null } })
      })
    )
    act(() => {
      root?.render(<DrPaperInfo detail={makeDetail({ id: 'paper-2', fileUrl: 'app-file://paper-2' })} />)
    })
    expect(host?.querySelectorAll('.pi-strip img').length).toBe(0)
    await act(async () => {
      release?.()
      await Promise.resolve()
    })
    const img = host?.querySelector('.pi-strip img')
    expect(img?.getAttribute('src')).toBe('app-file://paper-2/figures/fig-z')
  })

  it('零资产（figures=[]）：strip 省略', async () => {
    listFigures.mockResolvedValue({ ok: true, data: { figures: [], job: null } })
    mount(makeDetail())
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelector('[data-testid="paper-info-strip"]')).toBeNull()
  })
})
