// @vitest-environment jsdom
/**
 * [P7E-02] ImportDropZone 拖拽接线（always-active，无工单门）——态空间锚 D2/D3/D5/D6：
 * - D2 drop 全滤除（none）→ toast「仅支持拖入 PDF 文件」回 idle，onImported 零调用；
 * - D3 drop 有效 → apiDrag.importDropped(files) → busy（按钮禁用）→结果汇报
 *   （toast 汇总+onImported）→idle；
 * - D5 busy 期 drop → info toast「导入进行中，请稍候」短路（apiDrag 零新增调用）；
 * - D6 drop 超量（too-many）→ toast「一次最多拖入 100 个文件」busy 立即复位。
 * D1（高亮样式）为既有行为；D7/D8 复用 F-D4 既有壳（import-dropzone.test.tsx 已锚，
 * runImport 同一 try/catch/finally + busyRef 订阅门零改）。桩形态同 import-dropzone.test.tsx。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportProgressEvent, ImportResult } from '../../../src/shared/ipc/schemas'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ import_: { fromDialog: vi.fn(), fromFolder: vi.fn() } })
const onImportProgressSpy = vi.fn()
const offSpy = vi.fn()
stubApiEvents({
  onImportProgress: onImportProgressSpy,
  // [F-FOLDER-02·E] folders.changed 订阅面（「导入到」名解析重取——mock 代理
  // 未覆盖键透传 undefined，订阅直调即抛；生产面 preload 恒在场）
  onFoldersChanged: vi.fn(() => () => undefined)
})
const dragSpy = vi.fn()
const holder = { cb: null as ((e: ImportProgressEvent) => void) | null }

import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** Result 夹具（preload 桥语义面：ok/INVALID_REQUEST 中文 message） */
const okResult = (data: ImportResult): { ok: true; data: ImportResult } => ({ ok: true, data })
const invalid = (message: string): { ok: false; error: { code: string; message: string } } => ({
  ok: false,
  error: { code: 'INVALID_REQUEST', message }
})

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(onImported: () => void = () => undefined): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<ImportDropZone onImported={onImported} />)
  })
}

function findImportButton(): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '').replace('⟳', '') === '导入 PDF 文件'
  )
}

function busyNow(): boolean {
  return findImportButton()?.disabled ?? false
}

/** 在拖放区上派发原生 drop 事件（React 合成 onDrop 经 root 委托捕获） */
async function drop(files: { name: string }[]): Promise<void> {
  const zone = host?.querySelector('.lib-dropzone')
  expect(zone, '拖放区在场').toBeDefined()
  await act(async () => {
    const ev = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'dataTransfer', { value: { files } })
    zone!.dispatchEvent(ev)
  })
}

/** 微任务排空（pending Promise 落定后再断终态） */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  onImportProgressSpy.mockImplementation((cb: (e: ImportProgressEvent) => void) => {
    holder.cb = cb
    return offSpy
  })
  // jsdom 全局 window.apiDrag 桩（env.d.ts 声明的真实桥在 e2e 装配级覆盖）
  ;(window as unknown as { apiDrag: unknown }).apiDrag = { importDropped: dragSpy }
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  delete (window as unknown as { apiDrag?: unknown }).apiDrag
})

describe('P7E-02 ImportDropZone —— 拖拽导入接线（D2/D3/D5/D6）', () => {
  it('D2 drop 全滤除：apiDrag 返回 none → toast 中文文案，回 idle 且不触发刷新', async () => {
    dragSpy.mockResolvedValue(invalid('仅支持拖入 PDF 文件'))
    const onImported = vi.fn()
    await render(onImported)
    await drop([{ name: '合成.pdf' }])
    await settle()

    expect(dragSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('仅支持拖入 PDF 文件', 'error')
    expect(onImported).not.toHaveBeenCalled()
    expect(busyNow()).toBe(false)
  })

  it('D3 drop 有效：busy（按钮禁用）→apiDrag 载荷=File 列表→结果汇报 toast+onImported→idle', async () => {
    let resolveDrop!: (v: { ok: true; data: ImportResult }) => void
    dragSpy.mockImplementation(
      () => new Promise<{ ok: true; data: ImportResult }>((r) => { resolveDrop = r })
    )
    const onImported = vi.fn()
    await render(onImported)
    await drop([{ name: 'a.pdf' }, { name: 'b.pdf' }])

    // busy 相：按钮禁用；apiDrag 收到的正是 dataTransfer.files 展开
    expect(busyNow()).toBe(true)
    const sent = dragSpy.mock.calls[0]?.[0] as { name: string }[]
    expect(sent.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf'])

    resolveDrop(okResult({ imported: [{ id: 'p1' }] as never, duplicates: [], failed: [] }))
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('导入完成：成功 1', 'success')
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(busyNow()).toBe(false)
  })

  it('D5 busy 期 drop：info toast 短路，apiDrag 零新增调用', async () => {
    stubApi.import_.fromDialog.mockImplementation(
      () => new Promise<{ ok: true; data: ImportResult }>(() => undefined)
    )
    await render()
    await act(async () => {
      findImportButton()?.click()
    })
    expect(busyNow()).toBe(true)

    await drop([{ name: 'c.pdf' }])
    expect(toastSpy).toHaveBeenCalledWith('导入进行中，请稍候', 'info')
    expect(dragSpy).not.toHaveBeenCalled()
    expect(stubApi.import_.fromDialog).toHaveBeenCalledTimes(1)
  })

  it('D6 drop 超量：apiDrag 返回 too-many → toast 中文文案，busy 立即复位', async () => {
    dragSpy.mockResolvedValue(invalid('一次最多拖入 100 个文件'))
    const onImported = vi.fn()
    await render(onImported)
    await drop(Array.from({ length: 101 }, (_, i) => ({ name: `f${i}.pdf` })))
    await settle()

    expect(dragSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('一次最多拖入 100 个文件', 'error')
    expect(onImported).not.toHaveBeenCalled()
    expect(busyNow()).toBe(false)
  })
})
