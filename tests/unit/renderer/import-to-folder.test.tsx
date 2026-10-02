// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U2] ImportDropZone 导入条收敛（ImportTargetSelect 退役——
 * 「仅入文献库」选项随 2026-09-30 用户裁决退役；目标恒定语义 R2：folder 态=
 * 该文件夹；无筛选/未归档=主图 MAIN_GRAPH_ID 挂接）。覆盖：①导入条恒显
 * 「导入到：X」目标徽标（文件夹图标+名——folders.list 名解析+folders.changed
 * 重取）；②folder 目标导入→逐 imported moveFolder(toFolderId)+onImported；
 * ③主图目标（无筛选态投影）导入→moveFolder('__main__')；④busy 全局信号
 * 置位/终局复位（S2 消费源）；⑤按钮文案「导入 PDF」「导入文件夹」（R4）。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import type { PaperSummary } from '../../../src/shared/models/paper'

const stubApi = makeApiStub({
  import_: { fromDialog: vi.fn(), fromFolder: vi.fn() },
  folders: { list: vi.fn() },
  papers: { moveFolder: vi.fn() }
})
stubApiEvents({
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function summary(id: string): PaperSummary {
  return {
    id,
    title: `文献${id}`,
    authors: [],
    year: 2024,
    venue: '',
    doi: null,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    folderId: null,
    impactFactor: null
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let importedCalls = 0

async function render(targetFolderId: string | null | undefined): Promise<void> {
  importedCalls = 0
  await act(async () => {
    root?.render(
      <ImportDropZone
        targetFolderId={targetFolderId}
        onImported={() => {
          importedCalls += 1
        }}
      />
    )
  })
  await settle()
}

async function settle(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** 目标徽标（「导入到：X」文本容器——.lib-import-target） */
function targetPill(): HTMLElement | null {
  return host?.querySelector('.lib-import-target') ?? null
}

async function clickImportButton(): Promise<void> {
  const btn = [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '') === '导入 PDF'
  )
  expect(btn).toBeDefined()
  await act(async () => {
    btn!.click()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.folders.list.mockReset()
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-1', name: '调研计划', position: 1, paperCount: 0 }
    ]
  })
  stubApi.papers.moveFolder.mockResolvedValue({ ok: true, data: { ok: true } })
  useImportBusyStore.getState().setBusy(false)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-UIRES-01 U2 导入条目标恒定（ImportTargetSelect 退役）', () => {
  it('folder 态（f-1）：目标徽标恒显「导入到：调研计划」（文件夹名解析）', async () => {
    await render('f-1')
    const pill = targetPill()
    expect(pill, '目标徽标在场').not.toBeNull()
    expect(pill?.textContent).toContain('导入到：')
    expect(pill?.textContent).toContain('调研计划')
    expect(host?.querySelector('select[aria-label="导入到"]'), '旧选择器已退役').toBeNull()
  })

  it('无筛选态投影（__main__）：目标徽标显「导入到：主图」（R2 主图挂接口径）', async () => {
    await render('__main__')
    const pill = targetPill()
    expect(pill).not.toBeNull()
    expect(pill?.textContent).toContain('主图')
  })

  it('folder 目标导入：逐 imported 论文 moveFolder({paperId,toFolderId})+onImported（自动入图链）', async () => {
    await render('f-1')
    stubApi.import_.fromDialog.mockResolvedValue({
      ok: true,
      data: { imported: [summary('p-1'), summary('p-2')], duplicates: [], failed: [] }
    })
    await clickImportButton()
    await settle()
    expect(stubApi.papers.moveFolder).toHaveBeenCalledTimes(2)
    expect(stubApi.papers.moveFolder).toHaveBeenNthCalledWith(1, {
      paperId: 'p-1',
      toFolderId: 'f-1'
    })
    expect(stubApi.papers.moveFolder).toHaveBeenNthCalledWith(2, {
      paperId: 'p-2',
      toFolderId: 'f-1'
    })
    expect(importedCalls).toBeGreaterThan(0)
  })

  it('主图目标导入：moveFolder(toFolderId="__main__")（无筛选态=主图挂接——非零 moveFolder）', async () => {
    await render('__main__')
    stubApi.import_.fromDialog.mockResolvedValue({
      ok: true,
      data: { imported: [summary('p-3')], duplicates: [], failed: [] }
    })
    await clickImportButton()
    await settle()
    expect(stubApi.papers.moveFolder).toHaveBeenCalledWith({
      paperId: 'p-3',
      toFolderId: '__main__'
    })
    expect(importedCalls).toBeGreaterThan(0)
  })

  it('RR1-5 targetFolderId=undefined：零挂接（null 同语义——不进 moveFolder 链）', async () => {
    await render(undefined)
    stubApi.import_.fromDialog.mockResolvedValue({
      ok: true,
      data: { imported: [summary('p-9')], duplicates: [], failed: [] }
    })
    await clickImportButton()
    await settle()
    expect(stubApi.papers.moveFolder).not.toHaveBeenCalled()
  })

  it('busy 全局信号：导入进行中置位、终局复位（S2 消费源）', async () => {
    await render('__main__')
    let release: ((v: { ok: true; data: never }) => void) | undefined
    stubApi.import_.fromDialog.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve as typeof release
        })
    )
    await clickImportButton()
    await settle()
    expect(useImportBusyStore.getState().busy, 'busy 置位').toBe(true)
    await act(async () => {
      release?.({ ok: true, data: { imported: [], duplicates: [], failed: [] } as never })
    })
    await settle()
    expect(useImportBusyStore.getState().busy, '终局复位').toBe(false)
  })

  it('按钮文案 R4：「导入 PDF」「导入文件夹」（hint=或将 PDF 拖到此处导入）', async () => {
    await render('__main__')
    const labels = [...(host?.querySelectorAll('button') ?? [])].map((b) => b.textContent ?? '')
    expect(labels).toContain('导入 PDF')
    expect(labels).toContain('导入文件夹')
    expect(labels).not.toContain('导入 PDF 文件')
    expect(host?.textContent).toContain('或将 PDF 拖到此处导入')
  })
})
