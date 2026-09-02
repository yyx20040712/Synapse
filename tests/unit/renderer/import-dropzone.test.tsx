// @vitest-environment jsdom
/**
 * [F-D4] ImportDropZone 组件合约（INV-52 B 面——always-active，三屋纪律不经
 * guardedDescribe）：导入进度事件的会话身份过滤（范式=corpus-export.store INV-18
 * 同族，桩形态参照 corpus-export.test.tsx）：
 * ①busy 中本会话事件→进度文案更新（原行为零变）；
 * ②busy 中异 sessionId 事件→文案不变（旧会话污染被滤）；
 * ③busy=false 时事件→不渲染进度且不锚定会话身份（state 不写深断言）。
 * 另锁订阅/退订成对（INV-14 消费方级）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportProgressEvent } from '../../../src/shared/ipc/schemas'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

/** 桩装配共享位（hoisted——vi.mock 工厂与用例两侧同引用） */
const { stubApi, onImportProgressSpy, offSpy, toastSpy, holder } = vi.hoisted(() => ({
  stubApi: {
    import_: { fromDialog: vi.fn(), fromFolder: vi.fn() }
  },
  onImportProgressSpy: vi.fn(),
  offSpy: vi.fn(),
  toastSpy: vi.fn(),
  holder: { cb: null as ((e: ImportProgressEvent) => void) | null }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi as unknown as typeof clientModule.api,
    apiEvents: { onImportProgress: onImportProgressSpy } as unknown as typeof clientModule.apiEvents
  }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'

// act() 环境声明（library-cards 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 进度事件夹具（缺省 copying 1/2 a.pdf——sessionId 为 F-D4 新增锚点字段） */
function ev(sessionId: string, patch: Partial<ImportProgressEvent> = {}): ImportProgressEvent {
  return { phase: 'copying', current: 1, total: 2, fileName: 'a.pdf', sessionId, ...patch }
}

/** 空结果 resolve 形状（用户取消静默面——reportImportResult 零 toast） */
const emptyOk = { ok: true as const, data: { imported: [], duplicates: [], failed: [] } }
type EmptyOk = typeof emptyOk

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '').replace('⟳', '') === label
  )
}

async function click(label: string): Promise<void> {
  const btn = findButton(label)
  expect(btn, `按钮存在：${label}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

/** 进度行文案（busy 门内 [role=status]；null=未渲染） */
function statusText(): string | null {
  return host?.querySelector('[role="status"]')?.textContent ?? null
}

async function emit(e: ImportProgressEvent): Promise<void> {
  expect(holder.cb, '事件回调已注册').not.toBeNull()
  await act(async () => {
    holder.cb!(e)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  onImportProgressSpy.mockImplementation((cb: (e: ImportProgressEvent) => void) => {
    holder.cb = cb
    return offSpy
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-D4 ImportDropZone —— 进度事件会话身份过滤', () => {
  it('挂载即订阅 importProgress；卸载成对退订（INV-14 消费方级）', async () => {
    await render(<ImportDropZone onImported={() => undefined} />)
    expect(onImportProgressSpy).toHaveBeenCalledTimes(1)
    await act(async () => {
      root?.unmount()
    })
    expect(offSpy).toHaveBeenCalledTimes(1)
  })

  it('busy 中本会话事件→进度文案更新（原行为零变）', async () => {
    let resolveInvoke!: (v: EmptyOk) => void
    stubApi.import_.fromDialog.mockImplementation(
      () => new Promise<EmptyOk>((r) => { resolveInvoke = r })
    )
    await render(<ImportDropZone onImported={() => undefined} />)
    await click('导入 PDF 文件')
    expect(statusText()).toBe('正在打开选择窗口…')
    await emit(ev('s1', { phase: 'copying', current: 1, total: 2, fileName: '论文一.pdf' }))
    expect(statusText()).toBe('复制文件（1/2） 论文一.pdf')
    await emit(ev('s1', { phase: 'extracting', current: 2, total: 2, fileName: '论文二.pdf' }))
    expect(statusText()).toBe('提取元数据（2/2） 论文二.pdf')
    await act(async () => {
      resolveInvoke(emptyOk)
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(statusText()).toBeNull()
  })

  it('busy 中异 sessionId 事件→文案不变（旧会话污染被滤）', async () => {
    stubApi.import_.fromDialog.mockImplementation(() => new Promise<EmptyOk>(() => undefined))
    await render(<ImportDropZone onImported={() => undefined} />)
    await click('导入 PDF 文件')
    await emit(ev('live', { phase: 'copying', current: 1, total: 3, fileName: '本会话.pdf' }))
    expect(statusText()).toBe('复制文件（1/3） 本会话.pdf')
    await emit(ev('stale', { phase: 'extracting', current: 3, total: 3, fileName: '旧会话.pdf' }))
    expect(statusText()).toBe('复制文件（1/3） 本会话.pdf')
  })

  it('busy=false 时事件→不渲染进度且不锚定会话身份（state 不写）', async () => {
    stubApi.import_.fromDialog.mockImplementation(() => new Promise<EmptyOk>(() => undefined))
    await render(<ImportDropZone onImported={() => undefined} />)
    await emit(ev('stale', { phase: 'done', current: 9, total: 9, fileName: '旧会话.pdf' }))
    expect(statusText()).toBeNull()
    // 深断言：idle 事件若写了 state 或锚定了会话身份，后续本会话首事件会被
    // 异身份过滤误吞——此处必须照常更新
    await click('导入 PDF 文件')
    await emit(ev('live2', { phase: 'copying', current: 1, total: 1, fileName: '新会话.pdf' }))
    expect(statusText()).toBe('复制文件（1/1） 新会话.pdf')
  })
})
