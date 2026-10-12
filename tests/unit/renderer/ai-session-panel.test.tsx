// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-2 UI U3·r1′ R4] AiSessionPanel —— 会话壳渲染分支单测
 * （always-active 裸 describe，K3——门一 k3-W4 处置：主控显式授权第 22 件）。
 *
 * 锁定面：notFound 态渲染「锚对象不存在或已删除」；error 态渲染
 * 「请求无效，请重试」（role=alert 在场）——错误码映射驻 store（渲染=纯消费），
 * 此处钉终态字面与 role 锚。api 桩走 api-client-mock 形态（工厂 import 先于
 * 被测模块——顺序契约见该件头注）；open 恒 ok 的缺省桩被本文件覆盖
 * （makeApiStub 同键后写者胜）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  ai_sessions: {
    open: vi.fn(),
    listMessages: vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
  }
})

import { AiSessionPanel } from '../../../src/renderer/features/ai/AiSessionPanel'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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

/** 微任务排空（open→(listMessages) 链收敛——8 tick 富余） */
async function flush(ticks = 8): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  stubApi.ai_sessions.open.mockReset()
  stubApi.ai_sessions.listMessages.mockClear()
  stubApi.ai_sessions.listMessages.mockResolvedValue({ ok: true, data: { messages: [] } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-DBCAMP-01 U3 r1′ R4 AiSessionPanel —— 错误终态渲染分支字面', () => {
  it('open 拒 NOT_FOUND→notFound 态：渲染「锚对象不存在或已删除」（幽灵锚文案锚）', async () => {
    stubApi.ai_sessions.open.mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: '锚不存在' }
    })
    mount(<AiSessionPanel scope="paper" anchorId="ghost-paper" />)
    await flush()
    expect(stubApi.ai_sessions.open, '挂载即 open+载荷透传').toHaveBeenCalledWith({
      scope: 'paper',
      anchorId: 'ghost-paper'
    })
    expect(host?.textContent, '幽灵锚终态字面').toContain('锚对象不存在或已删除')
    expect(host?.textContent, '错误态文案不得串场').not.toContain('请求无效，请重试')
  })

  it('open 拒 INVALID_REQUEST→error 态：渲染「请求无效，请重试」+role=alert 在场', async () => {
    stubApi.ai_sessions.open.mockResolvedValue({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: '矩阵拒' }
    })
    mount(<AiSessionPanel scope="global" anchorId={null} />)
    await flush()
    expect(host?.textContent, '通用错误终态字面').toContain('请求无效，请重试')
    expect(host?.textContent, '幽灵锚文案不得串场').not.toContain('锚对象不存在或已删除')
    const alert = host?.querySelector('[role="alert"]')
    expect(alert, 'error 态 role=alert 在场').not.toBeNull()
    expect(alert?.textContent).toContain('请求无效，请重试')
  })
})
