// @vitest-environment jsdom
/**
 * [B4-A R2 §10.1/§15 R2 占位——主控终裁 7] Rail U 角标测试（新建，always-active）。
 * 锁面：两个 U 角标 props（readerUnfinalized/lineageUnfinalized）——props 注入
 * 本件不引域 store；reader 角标随输入翻转；lineage 角标=R2 恒 false 占位
 * （LINEAGE_UNFINALIZED_R2 单源——App 侧恒注 false，真值随 L1）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ workspaces: { list: vi.fn() } })
stubApi.workspaces.list.mockResolvedValue({ ok: true, data: { items: [], currentId: '' } })

import { Rail } from '../../../src/renderer/app/Rail'
import { LINEAGE_UNFINALIZED_R2, useSaveAggregates } from '../../../src/renderer/app/use-save-aggregates'

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

  it('lineage 角标=R2 占位恒 false：占位常量输入下恒缺席（主控终裁 7——L1 换真值）', () => {
    expect(LINEAGE_UNFINALIZED_R2).toBe(false)
    mountRail(false, LINEAGE_UNFINALIZED_R2)
    expect(host?.querySelector('[data-testid="rail-lineage-dot"]')).toBeNull()
  })

  it('lineage 角标接线面存在（props=true 可渲染）——占位移除后 L1 直接换真值', () => {
    mountRail(false, true)
    expect(host?.querySelector('[data-testid="rail-lineage-dot"]')).not.toBeNull()
  })

  it('占位常量有消费者（禁无消费预留）：useSaveAggregates.lineageUnfinalized=占位常量', async () => {
    // useSaveAggregates 需 React 渲染上下文（多 hook 订阅）——经探针组件消费
    let lineageU: boolean | null = null
    function Probe(): JSX.Element {
      lineageU = useSaveAggregates().lineageUnfinalized
      return <span />
    }
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(<Probe />)
    })
    expect(lineageU).toBe(LINEAGE_UNFINALIZED_R2)
  })
})
