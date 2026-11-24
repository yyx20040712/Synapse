// @vitest-environment jsdom
/**
 * [B4-A R2 §10.1/§15 → B4 L1 接管] Rail U 角标测试（always-active）。
 * 锁面：两个 U 角标 props（readerUnfinalized/lineageUnfinalized）——props 注入
 * 本件不引域 store；reader 角标随输入翻转；lineage 角标=真实 U（[B4 L1] R2
 * 占位常量 LINEAGE_UNFINALIZED_R2 与占位断言随批删除——聚合输入=lineage.store
 * unfinalized）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ workspaces: { list: vi.fn() } })
stubApi.workspaces.list.mockResolvedValue({ ok: true, data: { items: [], currentId: '' } })

import { Rail } from '../../../src/renderer/app/Rail'
import { useSaveAggregates } from '../../../src/renderer/app/use-save-aggregates'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

let root: Root | null = null
let host: HTMLDivElement | null = null

function mountRail(readerU: boolean, lineageU: boolean): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<Rail view="library" onView={() => undefined} readerUnfinalized={readerU} lineageUnfinalized={lineageU} />)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('Rail U 角标 —— props 注入（§10.1「不引域 store」）', () => {
  it('reader 角标随输入翻转：true=在场（rail-reader-dot）、false=缺席', () => {
    mountRail(false, false)
    expect(host?.querySelector('[data-testid="rail-reader-dot"]')).toBeNull()
    mountRail(true, false)
    expect(host?.querySelector('[data-testid="rail-reader-dot"]')).not.toBeNull()
  })

  it('lineage 角标接线面存在（props=true 可渲染）——占位移除后 L1 直接换真值', () => {
    mountRail(false, true)
    expect(host?.querySelector('[data-testid="rail-lineage-dot"]')).not.toBeNull()
  })

  it('聚合输入=真实 lineage U（[B4 L1] 接管 R2 占位）：lineage.store.unfinalized 翻转→useSaveAggregates.lineageUnfinalized 同步翻转', () => {
    let lineageU: boolean | null = null
    function Probe(): JSX.Element {
      lineageU = useSaveAggregates().lineageUnfinalized
      return <span />
    }
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      useLineageStore.setState({ unfinalized: true })
      root?.render(<Probe />)
    })
    expect(lineageU).toBe(true)
    act(() => {
      useLineageStore.setState({ unfinalized: false })
    })
    expect(lineageU).toBe(false)
  })
})
