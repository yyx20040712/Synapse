// @vitest-environment jsdom
/**
 * [B2 红测试] library 域 folders.list 三路独立取——现状缺陷红证（plan-v1 §4.1
 * 「三个库组件的 folders.list 独立读取收为 library 域共享目录读面」的先红半场）。
 *
 * 现状缺陷（summary §3 路径一②）：文献库一次会话内 folders.list 被
 * FolderNav（FolderNav.tsx:55）/ImportDropZone（ImportDropZone.tsx:113）/
 * PaperRowMenu（PaperRowMenu.tsx:34）各自 useAsync 独立取三次，无共享缓存；
 * folders.changed 广播再各自重拉（三倍失效）。目标行为：library 域共享目录
 * 读面（folder-catalog.store——同飞+folders.changed 单订阅失效），三消费面
 * 共挂=单次取数、单次 changed=单次重取。
 *
 * 夹具说明：三组件直接共挂（合成面）——LibraryPage 组合中 PaperRowMenu 仅
 * 右键挂载，但取数缺陷=组件各自的挂载 useAsync，共挂夹具是同一缺陷面的
 * 最小可测形（不引入列表行右键交互的无关脆弱性）。数据正确性守卫用例锁
 * 「收面不丢数据」（FolderNav 行/导入条目标名解析）。
 * mock 面申报：makeApiStub（api/client 展开型）+onFoldersChanged/onImportProgress
 * 订阅捕获（folder-nav.test.tsx 配方同族）。always-active（ADR-0017 裁决 3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

type Folder = { id: string; name: string; position: number; paperCount: number }
const folder = (id: string, name: string, paperCount = 0): Folder => ({
  id,
  name,
  position: 0,
  paperCount
})

const FOLDERS: Folder[] = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]

const stubApi = makeApiStub({
  library: { list: vi.fn() },
  folders: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), delete: vi.fn() }
})

/** folders.changed 订阅捕获（失效联动用例驱动面——多订阅者全录，广播=全体回调；
 *  单变量捕获会被后订阅者覆盖，FolderNav 回调丢失=计数假绿） */
const foldersChangedCbs: Array<() => void> = []
stubApiEvents({
  onFoldersChanged: (cb: () => void) => {
    foldersChangedCbs.push(cb)
    return () => undefined
  },
  onImportProgress: vi.fn(() => () => undefined)
})
const fireFoldersChanged = (): void => {
  for (const cb of foldersChangedCbs) cb()
}

import { FolderNav } from '../../../src/renderer/features/library/FolderNav'
import { useFolderCatalog } from '../../../src/renderer/features/library/folder-catalog.store'
import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'
import { PaperRowMenu } from '../../../src/renderer/features/library/PaperRowMenu'
import type { LibraryQuery } from '../../../src/shared/models/paper'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const BASE_QUERY: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }
const PAPER = { id: 'p1', title: '示例文献', isStarred: false }

/** 三消费面共挂夹具（目录读面缺陷的最小合成面——见文件头注）；
 *  targetFolderId 参数化=重渲染切目标的 reconcile 保持面（换根类型=整树重挂，
 *  会污染取数计数） */
function CatalogConsumers(props: { targetFolderId?: string }): JSX.Element {
  return (
    <>
      <FolderNav query={BASE_QUERY} onChange={() => undefined} onMutated={() => undefined} />
      <ImportDropZone onImported={() => undefined} targetFolderId={props.targetFolderId ?? '__main__'} />
      <PaperRowMenu
        paper={PAPER}
        anchor={{ x: 10, y: 10 }}
        onClose={() => undefined}
        onOpen={() => undefined}
        onMove={() => undefined}
        onDelete={() => undefined}
        onToggleStar={() => undefined}
      />
    </>
  )
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(tree: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(tree)
  })
}

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const listCalls = (): number => stubApi.folders.list.mock.calls.length

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.folders.list.mockResolvedValue({ ok: true, data: FOLDERS })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  foldersChangedCbs.length = 0
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('[B2] library 域共享目录读面——folders.list 收口（红→实现批转绿）', () => {
  it('红证：三消费面共挂=folders.list 单次取数（现状=三路独立取 3 次）', async () => {
    const before = listCalls()
    mount(<CatalogConsumers />)
    await settle()
    const delta = listCalls() - before
    expect(
      delta,
      '目录读面收口后：三个消费面共挂=共享读面单次取数（现状：FolderNav/ImportDropZone/PaperRowMenu 各自挂载 useAsync 独立取=3，本断言红）'
    ).toBe(1)
    // 数据正确性守卫（收面不丢数据）：导航行与导入条目标名照常解析
    expect(host?.textContent, 'FolderNav 行数据在场').toContain('调研计划')
    expect(host?.textContent, '导入条目标名解析（主图）在场').toContain('主图')
    expect(host?.querySelector('[role="menu"]'), 'PaperRowMenu 菜单挂载').not.toBeNull()
  })

  it('红证：folders.changed 单次广播=单次重取（现状=FolderNav/ImportDropZone 各自重拉 2 次）', async () => {
    mount(<CatalogConsumers />)
    await settle()
    expect(listCalls(), '前提自证：changed 前=挂载取数面（三消费面共挂）').toBeGreaterThan(0)
    stubApi.folders.list.mockClear()
    const before = listCalls()
    act(() => {
      fireFoldersChanged()
    })
    await settle()
    const delta = listCalls() - before
    expect(
      delta,
      '目录读面收口后：changed 失效+单飞=单次重取（现状：FolderNav 与 ImportDropZone 各自 onFoldersChanged 重拉=2，本断言红）'
    ).toBe(1)
  })
})

describe('[B2] 目录读面消费语义守卫（全程保持绿——实现批不得削弱）', () => {
  it('收面后 FolderNav 计数域仍=folders.list 载荷单源（RR1-2：全部=Σ paperCount）', async () => {
    mount(<CatalogConsumers />)
    await settle()
    const rows = [...(host?.querySelectorAll<HTMLButtonElement>('.lib-fn-row') ?? [])]
    const allRow = rows.find((b) => (b.textContent ?? '').includes('全部文献'))
    const mainRow = rows.find((b) => (b.textContent ?? '').includes('主图'))
    expect(allRow?.querySelector('.lib-fn-ct')?.textContent, '全部文献计数=2+1（载荷单源）').toBe('3')
    expect(mainRow?.querySelector('.lib-fn-ct')?.textContent, '主图行计数=paperCount 2').toBe('2')
  })

  it('收面后 ImportDropZone 名解析随 targetFolderId 切换不重取（静态参考数据语义保持）', async () => {
    mount(<CatalogConsumers />)
    await settle()
    const callsAtSteady = listCalls()
    act(() => {
      root?.render(<CatalogConsumers targetFolderId="f-1" />)
    })
    await settle()
    expect(host?.textContent, '目标名解析随 folderId 切换（f-1=调研计划）在场').toContain('调研计划')
    expect(
      listCalls(),
      'targetFolderId 切换零新增取数（数据已覆盖全部文件夹行——现状语义保持）'
    ).toBe(callsAtSteady)
  })

  it('失效重取失败不消费失效沿：后续成功 reload 仍执行消失夹回退', async () => {
    useFolderCatalog.setState({ folders: null, loading: false, error: null })
    const onChange = vi.fn()
    const onMutated = vi.fn()
    mount(
      <FolderNav
        query={{ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } }}
        onChange={onChange}
        onMutated={onMutated}
      />
    )
    await settle()
    stubApi.folders.list.mockResolvedValueOnce({
      ok: false,
      error: { code: 'INTERNAL', message: '目录重取失败' }
    })
    act(() => {
      fireFoldersChanged()
    })
    await settle()
    expect(useFolderCatalog.getState().error, '前提：失效重取确实失败且保留旧目录').toBe('目录重取失败')
    expect(useFolderCatalog.getState().folders).toEqual(FOLDERS)
    expect(onChange, '失败时旧目录仍在，不得提前回退').not.toHaveBeenCalled()

    stubApi.folders.list.mockResolvedValueOnce({ ok: true, data: [folder('__main__', '主图', 2)] })
    await act(async () => {
      await useFolderCatalog.getState().load()
    })
    await settle()
    expect(onChange, '未消费失效沿须在下一次成功落定后执行消失夹回退').toHaveBeenCalledWith({
      folderScope: undefined
    })
    expect(onMutated, '仅成功落定消费失效沿并联动一次').toHaveBeenCalledTimes(1)
  })
})

