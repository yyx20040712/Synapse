// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-4 / F-STAR-01 A1+A2] 文献星标切换交互（store 本地态口径
 * ——U2 简报裁决⑧：setStarred 无广播，列表行本地状态即可）。
 *
 * 覆盖：A1 行首星标点击→api.papers.setStarred 逐参+本地 isStarred 先行翻转；
 * 失败→回滚原值+toast；键盘 Enter/Space 触发（span role=button 承载）；A2
 * PaperRowMenu 星标 toggle 项（按 isStarred 定文案「星标/取消星标」+点击上抛
 * onToggleStar 后关菜单）。
 * 基建=api-client-mock（先 import 工厂后 import 被测模块——顺序契约）。
 * always-active（不经 guardedDescribe）。
 */
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'

const stubApi = makeApiStub({
  papers: { setStarred: vi.fn() },
  folders: { list: vi.fn(async () => ({ ok: true as const, data: [] })) }
})

import { PaperList } from '../../../src/renderer/features/library/PaperList'
import { PaperRowMenu } from '../../../src/renderer/features/library/PaperRowMenu'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeSummary(id: string, isStarred = false): PaperSummary {
  return {
    id,
    title: `论文 ${id}`,
    authors: [],
    year: 2021,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    folderId: '__main__',
    impactFactor: null,
    isStarred
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function setPapers(papers: PaperSummary[]): void {
  useLibraryStore.setState({
    papers,
    total: papers.length,
    loading: false,
    error: null,
    query: { sort: 'added_desc', offset: 0, limit: 50 }
  })
}

async function render(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
  toastSpy.mockClear()
  stubApi.papers.setStarred.mockClear()
  stubApi.papers.setStarred.mockImplementation(async () => ({ ok: true as const, data: { ok: true } }))
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-STAR-01 A1 行首星标切换', () => {
  it('点击：api.papers.setStarred 逐参+本地 isStarred 先行翻转（无广播口径——本地态）', async () => {
    setPapers([makeSummary('p-1', false)])
    await render(<PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />)
    await act(async () => {
      host?.querySelector('.lib-r-star')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(stubApi.papers.setStarred).toHaveBeenCalledWith({ paperId: 'p-1', starred: true })
    expect(useLibraryStore.getState().papers[0]?.isStarred).toBe(true)
  })

  it('键盘 Enter：span role=button 承载触发（不依赖真按钮元素）', async () => {
    setPapers([makeSummary('p-1', true)])
    await render(<PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />)
    await act(async () => {
      host?.querySelector('.lib-r-star')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(stubApi.papers.setStarred).toHaveBeenCalledWith({ paperId: 'p-1', starred: false })
    expect(useLibraryStore.getState().papers[0]?.isStarred).toBe(false)
  })

  it('双击链隔离（回炉 r1-R1/d1-W-1）：双击星标域不触发行双击（onOpen 零调用——星标双写+误开阅读器双缺陷面）', async () => {
    const onOpen = vi.fn()
    setPapers([makeSummary('p-1', false)])
    await render(
      <PaperList
        papers={useLibraryStore.getState().papers}
        selectedId={null}
        onSelect={() => undefined}
        onOpen={onOpen}
      />
    )
    await act(async () => {
      host?.querySelector('.lib-r-star')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('失败：本地回滚原值+toast（ApiClientError.message 透传）', async () => {
    stubApi.papers.setStarred.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'DB_ERROR', message: '库忙' }
    }))
    setPapers([makeSummary('p-1', false)])
    await render(<PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />)
    await act(async () => {
      host?.querySelector('.lib-r-star')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(stubApi.papers.setStarred).toHaveBeenCalledTimes(1)
    expect(useLibraryStore.getState().papers[0]?.isStarred).toBe(false)
    expect(toastSpy).toHaveBeenCalledWith('库忙', 'error')
  })
})

describe('F-STAR-01 A2 PaperRowMenu 星标项', () => {
  it('未星标行：菜单项「星标」；点击上抛 onToggleStar(paperId, true) 后关菜单', async () => {
    const onToggleStar = vi.fn()
    const onClose = vi.fn()
    await render(
      <PaperRowMenu
        paper={{ id: 'p-1', title: '甲', isStarred: false }}
        anchor={{ x: 10, y: 10 }}
        onClose={onClose}
        onOpen={() => undefined}
        onMove={() => undefined}
        onDelete={() => undefined}
        onToggleStar={onToggleStar}
      />
    )
    const item = Array.from(host?.querySelectorAll('[role="menuitem"]') ?? []).find(
      (b) => b.textContent === '星标'
    )
    expect(item, '菜单星标项在场').toBeDefined()
    await act(async () => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onToggleStar).toHaveBeenCalledWith('p-1', true)
    expect(onClose).toHaveBeenCalled()
  })

  it('已星标行：菜单项「取消星标」+onToggleStar(paperId, false)', async () => {
    const onToggleStar = vi.fn()
    await render(
      <PaperRowMenu
        paper={{ id: 'p-1', title: '甲', isStarred: true }}
        anchor={{ x: 10, y: 10 }}
        onClose={() => undefined}
        onOpen={() => undefined}
        onMove={() => undefined}
        onDelete={() => undefined}
        onToggleStar={onToggleStar}
      />
    )
    const item = Array.from(host?.querySelectorAll('[role="menuitem"]') ?? []).find(
      (b) => b.textContent === '取消星标'
    )
    await act(async () => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onToggleStar).toHaveBeenCalledWith('p-1', false)
  })
})
