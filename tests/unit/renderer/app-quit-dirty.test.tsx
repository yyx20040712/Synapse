// @vitest-environment jsdom
/**
 * [P7-C 崩溃回归锁] App 组合根 hook 链稳定性 —— tab dirty 翻转序列。
 *
 * 背景（2026-08-27 e2e reader-text.spec P7-C 稳定崩溃根因）：App.tsx 曾把
 * 退出拦截聚合写成 `useTabDirtyAggregate() || useLineageDirty()`——`||`
 * 短路求值使 useLineageDirty 在 tab dirty=true 的渲染中缺席（Rules of
 * Hooks 违规：同一 fiber 两次渲染 hooks 数量不同）。生产 bundle 无 dev
 * 警告（fewer-hooks 检查 __DEV__ only），commit 阶段 updateEffect 对上
 * 错位的 prev hook 产物（zustand 订阅对象，无 deps 字段）→
 * areHookInputsEqual 崩 "Cannot read properties of undefined (reading
 * 'length')" → App fiber 无边界自捕 → 整树卸载（#root 空）。触发沿=
 * P7-C fill('笔记正文') → notes pending 翻转 → aggregate=true。
 *
 * 组件级 614 用例全绿的原因：无人构造「aggregate false→true」翻转序列
 * （lineage-board.test.tsx 的 INV-22 用例走 lineage-dirty 路径，aggregate
 * 恒 false 不触发短路）。本用例锁该序列：
 * - dev 探针：console.error 无 'Rendered fewer hooks'（错位必出此警告）
 * - 崩溃自证：错位 TypeError 上抛则本用例直接失败（无边界兜底）
 * - 行为面：dirty 仍沿 system/set-quit-dirty 上报（修复不改变语义）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'

const { stubApi } = vi.hoisted(() => ({
  stubApi: {
    lineage: {
      graph: vi.fn(),
      upsertNode: vi.fn(),
      removeNode: vi.fn(),
      upsertEdge: vi.fn(),
      removeEdge: vi.fn(),
      importDraft: vi.fn()
    },
    library: { list: vi.fn() },
    system: { setQuitDirty: vi.fn() }
  }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi as unknown as typeof clientModule.api,
    apiEvents: {
      onExportCorpus: vi.fn(() => () => undefined),
      onImportProgress: vi.fn(() => () => undefined)
    }
  }
})

import { App } from '../../../src/renderer/app/App'
import { useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'

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

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.library.list.mockReset()
  stubApi.system.setQuitDirty.mockReset()
  // App.tsx 组合根直用 window.api.system（非 client 门面）——jsdom 下 stub
  // （lineage-board.test.tsx 同型）
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { system: { setQuitDirty: stubApi.system.setQuitDirty } }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  // 模块级 store 常驻：跨用例状态复位
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.setState({ noteByPaper: {} })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('App 组合根 —— hook 链稳定性（P7-C 崩溃回归锁）', () => {
  it('tab dirty false→true 翻转（notes pending 沿）无 fewer-hooks 错位且 dirty 仍上报', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      // 初始全 clean：aggregate=false，useLineageDirty 参与本次 hook 链
      mount(<App />)
      // P7-C fill('笔记正文') 的真实驱动链：notes pending 翻转 → aggregate
      // =true →（缺陷形态）短路 useLineageDirty → hooks 数量变少
      act(() => {
        useReaderStore.setState({ order: ['p1'] })
        useNotesStore.setState({
          noteByPaper: {
            p1: { title: '', contentMd: 'e2e 总评内容', saving: false, savedAt: null, pending: true }
          }
        })
      })
      await flush()
      // 行为面：或聚合语义不因修复漂移——dirty=true 仍上报 main
      const calls = stubApi.system.setQuitDirty.mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)
      expect(calls[calls.length - 1]?.[0]).toEqual({ dirty: true })
      // dev 探针：hook 错位必出 dev 警告（生产 build 无警告直接崩——组件级
      // 用例只能经 dev 探针锁住同一缺陷）
      const fewer = errSpy.mock.calls.filter((a) => String(a[0]).includes('Rendered fewer hooks'))
      expect(fewer).toEqual([])
    } finally {
      errSpy.mockRestore()
    }
  })
})
