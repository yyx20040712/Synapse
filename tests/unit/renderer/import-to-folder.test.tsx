// @vitest-environment jsdom
/**
 * [F-FOLDER-02·E] ImportDropZone「导入到」选择器（design §4.5——主控细化口径：
 * 无文件夹筛选态默认=仅入文献库；folder 态筛选时默认=该文件夹）+导入后
 * papers.moveFolder 挂接链（移动语义自动入图——最简合规路径：主进程 import 面
 * 零触碰）+busy 全局信号写面（S2 消费源）。
 *
 * 覆盖：①选择器两选项与默认随 folder 筛选态；②folder 目标导入→逐 imported
 * moveFolder(toFolderId)+onImported；③仅入文献库→零 moveFolder；④busy 期间
 * import-busy store 置位/终局复位。
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

async function render(targetFolderId: string | null): Promise<void> {
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

function targetSelect(): HTMLSelectElement {
  const el = host?.querySelector('select[aria-label="导入到"]')
  expect(el, '「导入到」选择器在场').toBeDefined()
  return el as HTMLSelectElement
}

function optionLabels(sel: HTMLSelectElement): string[] {
  return Array.from(sel.querySelectorAll('option')).map((o) => o.textContent ?? '')
}

async function clickImportButton(): Promise<void> {
  const btn = [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '') === '导入 PDF 文件'
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

describe('F-FOLDER-02·E 导入到选择器', () => {
  it('无 folder 筛选（targetFolderId=null）：默认=仅入文献库（无节点），无文件夹选项', async () => {
    await render(null)
    const sel = targetSelect()
    expect(sel.value).toBe('')
    expect(optionLabels(sel)).toEqual(['仅入文献库（无节点）'])
  })

  it('folder 筛选态（f-1）：默认=当前文件夹（自动建立脉络节点）', async () => {
    await render('f-1')
    const sel = targetSelect()
    expect(sel.value).toBe('f-1')
    expect(optionLabels(sel)).toEqual([
      '仅入文献库（无节点）',
      '当前文件夹「调研计划」（自动建立脉络节点）'
    ])
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

  it('仅入文献库：导入成功零 moveFolder（无节点行——design 矩阵「导入→全部」）', async () => {
    await render(null)
    stubApi.import_.fromDialog.mockResolvedValue({
      ok: true,
      data: { imported: [summary('p-3')], duplicates: [], failed: [] }
    })
    await clickImportButton()
    await settle()
    expect(stubApi.papers.moveFolder).not.toHaveBeenCalled()
    expect(importedCalls).toBeGreaterThan(0)
  })

  it('busy 全局信号：导入进行中置位、终局复位（S2 消费源）', async () => {
    await render(null)
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
})
