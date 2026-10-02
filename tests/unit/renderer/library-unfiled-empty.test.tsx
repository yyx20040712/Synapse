// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U5] S6 未归档空态（R14——设计稿 §3.9 锚：空态句+归档双通道
 * 句）。实现位置自裁=PaperList 加 scope 感知 prop emptyScope（LibraryPage 按
 * folderScope 注入）。覆盖：未归档态空列表→图标+两句真文本；非未归档空列表
 * →现行「暂无文献」引导零变（负锚）。always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import type { PaperSummary } from '../../../src/shared/models/paper'

const stubApi = makeApiStub({
  library: { list: vi.fn() },
  folders: { list: vi.fn() },
  tags: { list: vi.fn() }
})
stubApiEvents({
  onFoldersChanged: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined)
})

import { PaperList } from '../../../src/renderer/features/library/PaperList'
import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [] })
  stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
  useLibraryStore.setState({
    papers: [] as PaperSummary[],
    total: 0,
    query: { sort: 'added_desc', offset: 0, limit: 50 },
    selectedId: null,
    loading: false,
    error: null
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-01 U5 S6 未归档空态（R14）', () => {
  it('未归档态+空列表：空态=图标+「未归档文献将出现在这里」+归档双通道句（§3.9 锚逐字）', async () => {
    await render(
      <PaperList papers={[]} selectedId={null} onSelect={() => undefined} emptyScope="unfiled" />
    )
    expect(host?.textContent).toContain('未归档文献将出现在这里')
    expect(host?.textContent).toContain('拖拽文献行至左侧文件夹，或右键文献行『移动到文件夹』')
    expect(host?.querySelector('.lib-empty-unfiled svg'), '空态图标在场').not.toBeNull()
  })

  it('非未归档空列表：现行「暂无文献」引导零变（负锚——空态双通道句不在场）', async () => {
    await render(<PaperList papers={[]} selectedId={null} onSelect={() => undefined} />)
    expect(host?.textContent).toContain('暂无文献')
    expect(host?.textContent).not.toContain('未归档文献将出现在这里')
  })

  it('LibraryPage 装配：folderScope=unfiled 空列表→S6 空态注入（scope 感知 prop 接线）', async () => {
    useLibraryStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'unfiled' } }
    })
    await render(<LibraryPage />)
    expect(host?.textContent).toContain('未归档文献将出现在这里')
  })

  it('RR1-10 未归档态非空列表：正常行渲染（S6 空态不渲染——真非空分支）', async () => {
    await render(
      <PaperList
        papers={[
          {
            id: 'p1',
            title: '未归档在途文献',
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
        ]}
        selectedId={null}
        onSelect={() => undefined}
        emptyScope="unfiled"
      />
    )
    expect(host?.querySelector('.lib-row'), '行渲染在场').not.toBeNull()
    expect(host?.textContent).not.toContain('未归档文献将出现在这里')
    expect(host?.textContent).not.toContain('归档方式：')
  })
})
