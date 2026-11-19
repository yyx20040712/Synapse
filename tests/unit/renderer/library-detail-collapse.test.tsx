// @vitest-environment jsdom
/**
 * [v2 第二期 2026-11-19] 文献库详情收起/展开状态机锁（use-detail-open）。
 *
 * 规则枚举（计划 docs/design/2026-11-19_frontend-rework-plan.md §4 第二期
 * 状态表——「store+用户输入」行为改动先列枚举后实现）：
 * 1. 会话首次进入（store.detailOpen===null）：视口 ≤1320 默认收起，
 *    >1320 默认展开——默认值只应用这一次；
 * 2. 点击开关（FilterBar「详情」钮/详情头「收起详情」钮）：切换并记录
 *    会话选择；
 * 3. 已定值后任意 resize：保持选择，不覆盖（微小 resize 不反复翻转）；
 * 4. 切分类/切文献/卸载重挂（LibraryPage 按视图条件挂载）：值驻 store
 *    不重置；应用重启 store 重建回 null（不写 settings/localStorage/DB）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

makeApiStub({
  library: { list: vi.fn(), detail: vi.fn() },
  folders: { list: vi.fn() },
  tags: { list: vi.fn() }
})

import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { useDetailOpen } from '../../../src/renderer/features/library/use-detail-open'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 挂载探针宿主：渲染 hook 并把控制面挂到 DOM（钮/状态文本） */
async function mountProbe(): Promise<void> {
  function Probe(): JSX.Element {
    const d = useDetailOpen()
    return (
      <div>
        <span data-testid="open">{String(d.open)}</span>
        <button type="button" data-testid="toggle" onClick={() => d.toggle()} />
        <button type="button" data-testid="close" onClick={() => d.close()} />
      </div>
    )
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<Probe />)
  })
}

const text = (): string | null => host?.querySelector('[data-testid="open"]')?.textContent ?? null

/** 复位 store 到「会话未定」态（null=应用重启后的初态） */
function resetStore(): void {
  useLibraryStore.setState({ detailOpen: null })
}

beforeEach(() => {
  resetStore()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetStore()
  vi.restoreAllMocks()
})

describe('use-detail-open 状态机', () => {
  it('规则 1a：窄视口（≤1320）首次进入默认收起', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280)
    await mountProbe()
    expect(text()).toBe('false')
    // 默认值已写入 store（会话已定——后续 resize 不再动）
    expect(useLibraryStore.getState().detailOpen).toBe(false)
  })

  it('规则 1b：宽视口（>1320）首次进入默认展开', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
    await mountProbe()
    expect(text()).toBe('true')
  })

  it('规则 2：点击开关切换并记录会话选择', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
    await mountProbe()
    expect(text()).toBe('true')
    await act(async () => {
      host?.querySelector<HTMLButtonElement>('[data-testid="toggle"]')?.click()
    })
    expect(text()).toBe('false')
    expect(useLibraryStore.getState().detailOpen).toBe(false)
  })

  it('规则 3：已定值后 resize 不覆盖选择（窄→宽→窄均保持）', async () => {
    const iw = vi.spyOn(window, 'innerWidth', 'get')
    iw.mockReturnValue(1280)
    await mountProbe()
    expect(text()).toBe('false')
    // 用户显式选择展开
    await act(async () => {
      host?.querySelector<HTMLButtonElement>('[data-testid="toggle"]')?.click()
    })
    expect(text()).toBe('true')
    // 宽 resize：不得回落到任何视口默认
    iw.mockReturnValue(1440)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(text()).toBe('true')
    // 窄 resize：保持
    iw.mockReturnValue(1000)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(text()).toBe('true')
  })

  it('规则 3 补：默认定值后（未点过钮）resize 同样不覆盖', async () => {
    const iw = vi.spyOn(window, 'innerWidth', 'get')
    iw.mockReturnValue(1280)
    await mountProbe()
    expect(text()).toBe('false')
    iw.mockReturnValue(1440)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(text()).toBe('false')
  })

  it('规则 4：卸载重挂（切视图往返）不重置——值驻 store；重启语义=复位 null 后按视口重定', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
    await mountProbe()
    await act(async () => {
      host?.querySelector<HTMLButtonElement>('[data-testid="close"]')?.click()
    })
    expect(useLibraryStore.getState().detailOpen).toBe(false)
    // 卸载（离开文献库）→重挂（返回）：不重置
    act(() => {
      root?.unmount()
    })
    root = null
    await mountProbe()
    expect(text()).toBe('false')
    // 应用重启语义（store 重建=null）：重按视口定默认
    resetStore()
    act(() => {
      root?.unmount()
    })
    root = null
    await mountProbe()
    expect(text()).toBe('true')
  })

  it('close()：显式收起（详情头「收起详情」钮语义）', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
    await mountProbe()
    await act(async () => {
      host?.querySelector<HTMLButtonElement>('[data-testid="close"]')?.click()
    })
    expect(text()).toBe('false')
  })
})
