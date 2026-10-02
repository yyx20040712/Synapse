// @vitest-environment jsdom
/**
 * [W3 小挂账] 课题名输入框 maxLength 兑现锁定测试（always-active）——
 * workspaces-page.test.tsx 姊妹件（受锁既有件零改动先例族；mock 配方同型）。
 *
 * 锁行为面（v87 P2-W3）：WORKSPACE_NAME_MAX 注释宣称「schema 校验与 WS2
 * 输入框 maxLength 同源消费」未兑现——41 字名收英文 zod 报错。本件锁两输入
 * 框（新建/行内改名）maxLength=WORKSPACE_NAME_MAX（shared 常量单源——断言
 * 面同源引用，两处字面量对齐禁）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { WORKSPACE_NAME_MAX } from '../../../src/shared/ipc/schemas'

const stubApi = makeApiStub({
  workspaces: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), switch: vi.fn() }
})

import { WorkspacesPage } from '../../../src/renderer/features/workspaces/WorkspacesPage'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'

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

const WS_A = { id: 'w1', name: '默认课题', createdAt: '2026-01-01T00:00:00Z', paperCount: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.workspaces.list.mockReset()
  stubApi.workspaces.create.mockReset()
  stubApi.workspaces.rename.mockReset()
  stubApi.workspaces.switch.mockReset()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: vi.fn() } })
  vi.spyOn(window, 'confirm').mockImplementation(() => false)
  useWorkspaceStore.setState({ items: [WS_A], currentId: 'w1', loading: false, error: null })
  stubApi.workspaces.list.mockResolvedValue({ ok: true, data: { items: [WS_A], currentId: 'w1' } })
  stubApi.workspaces.create.mockResolvedValue({ ok: true, data: { id: 'w2' } })
  stubApi.workspaces.rename.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('W3 课题名输入框 maxLength=WORKSPACE_NAME_MAX（schema 同源兑现）', () => {
  it('新建输入框（aria-label=新课题名称）携带 maxLength=WORKSPACE_NAME_MAX', () => {
    mount(<WorkspacesPage dirty={false} />)
    const input = document.querySelector('input[aria-label="新课题名称"]') as HTMLInputElement | null
    expect(input, '新建输入框在场').not.toBeNull()
    expect(input!.maxLength, `maxLength=${WORKSPACE_NAME_MAX}（shared 常量单源）`).toBe(WORKSPACE_NAME_MAX)
  })

  it('行内改名输入框（aria-label=课题名称）携带 maxLength=WORKSPACE_NAME_MAX', () => {
    mount(<WorkspacesPage dirty={false} />)
    const renameBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === '重命名'
    )
    act(() => {
      renameBtn!.click()
    })
    const input = document.querySelector('input[aria-label="课题名称"]') as HTMLInputElement | null
    expect(input, '改名编辑器已开（行内输入框在场）').not.toBeNull()
    expect(input!.maxLength, `maxLength=${WORKSPACE_NAME_MAX}（shared 常量单源）`).toBe(WORKSPACE_NAME_MAX)
  })
})
