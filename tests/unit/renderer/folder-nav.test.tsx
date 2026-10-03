// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U1] FolderNav —— 库页左栏资源管理器导航（FolderFilter 退役
 * 承接件，设计稿 §2.1/§2.2+R8/R9）。覆盖：三态导航行与 folderScope 载荷/
 * 计数（RR1-2 域独立：全部=Σ folders.paperCount+未归档、未归档=独立计数查询
 * total、文件夹=paperCount——store.total 查询态零参与）/
 * 引导态隐藏面（INV-87）/busy 禁用清单/右键三件菜单（重命名=行内编辑·三键
 * 范式/删除=静默判据分流/在脉络图中打开=P-8 通道）/新建内联输入/选中夹消失
 * 回退/folders.changed 双失效/W1/W2 删除在途族三用例（RR2-2 自 folder-filter
 * 移植——hangGraph 挂起桩范式照搬；行内编辑流拆件=folder-nav-edit.test.tsx）。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'

type Folder = { id: string; name: string; position: number; paperCount: number }
const folder = (id: string, name: string, paperCount = 0): Folder => ({
  id,
  name,
  position: 0,
  paperCount
})

let foldersNow: Folder[] = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]
const stubApi = makeApiStub({
  library: { list: vi.fn() },
  folders: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), delete: vi.fn() },
  lineage: { graph: vi.fn() }
})

/** folders.changed 订阅捕获（联动用例驱动面） */
let fireFoldersChanged: () => void = () => undefined
stubApiEvents({
  onFoldersChanged: (cb: () => void) => {
    fireFoldersChanged = () => cb()
    return () => undefined
  }
})

import { FolderNav } from '../../../src/renderer/features/library/FolderNav'
import { OPEN_LINEAGE_EVENT } from '../../../src/renderer/shared/open-lineage-bus'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import type { LibraryQuery } from '../../../src/shared/models/paper'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let lastPatch: Partial<LibraryQuery> | null = null
let mutatedCalls = 0

const BASE_QUERY: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }

async function render(query: LibraryQuery = BASE_QUERY, guideHidden = false): Promise<void> {
  lastPatch = null
  await act(async () => {
    root?.render(
      <FolderNav
        query={query}
        onChange={(patch) => {
          lastPatch = patch
        }}
        onMutated={() => {
          mutatedCalls += 1
        }}
        guideHidden={guideHidden}
      />
    )
  })
  await settle()
}

async function settle(turns = 6): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** 导航行定位（.lib-fn-row 按名前缀——scope 缺省=整树） */
function navRow(label: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll<HTMLButtonElement>('.lib-fn-row')].find((b) =>
    (b.textContent ?? '').startsWith(label)
  )
}

function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text)
}

async function click(el: HTMLElement | undefined): Promise<void> {
  expect(el).toBeDefined()
  await act(async () => {
    el!.click()
  })
}

function rightClick(el: HTMLElement | undefined): void {
  expect(el).toBeDefined()
  act(() => {
    el!.dispatchEvent(
      new MouseEvent('contextmenu', { clientX: 210, clientY: 160, bubbles: true, cancelable: true })
    )
  })
}

/** 受控/非受控输入驱动+回车（isComposing 可控——组词守卫断言面） */
function enterValue(input: HTMLInputElement, value: string, isComposing = false): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  Object.defineProperty(ev, 'isComposing', { value: isComposing })
  act(() => {
    input.dispatchEvent(ev)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.library.list.mockReset()
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 1 } })
  stubApi.folders.list.mockReset()
  stubApi.folders.create.mockReset()
  stubApi.folders.rename.mockReset()
  stubApi.folders.delete.mockReset()
  stubApi.lineage.graph.mockReset()
  foldersNow = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], paperMetrics: {}, lineTypes: [], pubNos: {} }
  })
  toastSpy.mockClear()
  mutatedCalls = 0
  useImportBusyStore.getState().setBusy(false)
  useLibraryStore.setState({ total: 3 })
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

describe('F-UIRES-01 U1 FolderNav 三态导航行与计数', () => {
  it('三态行渲染：全部文献/未归档/文件夹列表（folders.list 如实渲染含主图行零特判）+mono 计数', async () => {
    await render(BASE_QUERY)
    expect(navRow('全部文献')).toBeDefined()
    expect(navRow('未归档')).toBeDefined()
    expect(navRow('主图')).toBeDefined()
    expect(navRow('调研计划')?.textContent).toContain('1')
  })

  it('计数派生（RR1-2 域独立）：未归档=独立计数查询 total；全部文献=Σ paperCount+未归档', async () => {
    await render(BASE_QUERY)
    const cells = host?.querySelectorAll('.lib-fn-ct') ?? []
    // folders：主图 2+调研计划 1（Σ=3）+unfiled 计数查询 total=1 → 全部=4/未归档=1
    expect(cells[0]?.textContent).toBe('4')
    expect(cells[1]?.textContent).toBe('1')
    expect(stubApi.library.list).toHaveBeenCalledWith(
      expect.objectContaining({ folderScope: { kind: 'unfiled' }, limit: 1 })
    )
  })

  it('RR1-2 判别锚：folder 态选中下计数不随查询命中数漂移（store.total=99 恒不入计数）', async () => {
    useLibraryStore.setState({ total: 99 })
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    const cells = host?.querySelectorAll('.lib-fn-ct') ?? []
    expect(cells[0]?.textContent, '全部文献=Σ+未归档（非 store.total）').toBe('4')
    expect(cells[1]?.textContent).toBe('1')
    expect(cells[2]?.textContent, '主图行计数=paperCount').toBe('2')
    expect(cells[3]?.textContent, '调研计划行计数=paperCount').toBe('1')
  })

  it('点按载荷：未归档→{kind:"unfiled"}；文件夹→{kind:"folder",folderId}；全部文献→清 undefined', async () => {
    await render(BASE_QUERY)
    await click(navRow('未归档'))
    expect(lastPatch).toEqual({ folderScope: { kind: 'unfiled' } })
    await click(navRow('调研计划'))
    expect(lastPatch).toEqual({ folderScope: { kind: 'folder', folderId: 'f-1' } })
    await click(navRow('全部文献'))
    expect(lastPatch).toEqual({ folderScope: undefined })
  })

  it('选中锚：folder 态选中行挂 aria-current；其余行不挂（S1 e2e anchor 面）', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    expect(navRow('调研计划')?.getAttribute('aria-current')).toBe('true')
    expect(navRow('全部文献')?.getAttribute('aria-current')).toBe(null)
  })

  it('未归档态选中：未归档行 aria-current（判别联合三态显式——F4 承接）', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'unfiled' } })
    expect(navRow('未归档')?.getAttribute('aria-current')).toBe('true')
  })
})

describe('F-UIRES-01 U1 引导态（INV-87 三条件——guideHidden 注入）', () => {
  it('引导态隐藏面：未归档行/分隔线/文件夹列表/新建入口全隐藏；仅「全部文献」一行', async () => {
    await render(BASE_QUERY, true)
    expect(navRow('全部文献')).toBeDefined()
    expect(navRow('未归档')).toBeUndefined()
    expect(navRow('主图')).toBeUndefined()
    expect(buttonByText('新建文件夹')).toBeUndefined()
    expect(host?.querySelector('.lib-fn-sep')).toBeNull()
    const rows = host?.querySelectorAll('.lib-fn-row') ?? []
    expect(rows.length).toBe(1)
  })

  it('解除态（guideHidden=false）：完整结构再现（分隔线+文件夹+新建入口）', async () => {
    await render(BASE_QUERY, false)
    expect(host?.querySelector('.lib-fn-sep')).not.toBeNull()
    expect(buttonByText('新建文件夹')).toBeDefined()
    expect((host?.querySelectorAll('.lib-fn-row') ?? []).length).toBe(4)
  })
})

describe('F-UIRES-01 U1 busy 禁用清单（§2.1——导航行切换/新建锁定）', () => {
  it('导入 busy：全部文献/未归档/文件夹行与新建入口禁用（folderScope 锁定）', async () => {
    await render(BASE_QUERY)
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    expect(navRow('全部文献')?.disabled).toBe(true)
    expect(navRow('未归档')?.disabled).toBe(true)
    expect(navRow('调研计划')?.disabled).toBe(true)
    expect(buttonByText('新建文件夹')?.disabled).toBe(true)
  })
})

describe('F-UIRES-01 U1 右键三件菜单（§2.2）', () => {
  it('右键文件夹行→菜单三项文本：重命名/删除文件夹…/在脉络图中打开（空图直删子标注）', async () => {
    await render(BASE_QUERY)
    rightClick(navRow('调研计划'))
    const menu = host?.querySelector('[data-testid="folder-menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.textContent).toContain('重命名')
    expect(menu?.textContent).toContain('删除文件夹…')
    expect(menu?.textContent).toContain('空图直删')
    expect(menu?.textContent).toContain('在脉络图中打开')
  })

  it('busy 期菜单三项禁用（重命名/删除/导航均锁——§2.1 清单）', async () => {
    await render(BASE_QUERY)
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    rightClick(navRow('调研计划'))
    const items = host?.querySelectorAll<HTMLButtonElement>('[data-testid="folder-menu"] button')
    expect(items?.length).toBe(3)
    for (const item of items ?? []) {
      expect(item.disabled).toBe(true)
    }
  })

  it('P-8「在脉络图中打开」：setQuery folderScope(folderId)+广播 open-lineage 事件', async () => {
    const seen: string[] = []
    const listener = (): void => {
      seen.push('fired')
    }
    window.addEventListener(OPEN_LINEAGE_EVENT, listener)
    await render(BASE_QUERY)
    rightClick(navRow('调研计划'))
    await click(
      [...(host?.querySelectorAll<HTMLButtonElement>('[data-testid="folder-menu"] button') ?? [])].find(
        (b) => (b.textContent ?? '').includes('在脉络图中打开')
      )
    )
    expect(lastPatch).toEqual({ folderScope: { kind: 'folder', folderId: 'f-1' } })
    expect(seen.length).toBe(1)
    window.removeEventListener(OPEN_LINEAGE_EVENT, listener)
  })
})

describe('F-UIRES-01 U1 新建内联输入（底部常驻入口）', () => {
  it('新建：底部入口→内联输入 Enter 提交 create→列表刷新出新行', async () => {
    await render(BASE_QUERY)
    await click(buttonByText('新建文件夹'))
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    expect(input).not.toBeNull()
    stubApi.folders.create.mockImplementation(async () => ({
      ok: true,
      data: folder('f-2', '新领域', 0)
    }))
    stubApi.folders.list.mockImplementation(async () => ({
      ok: true,
      data: [...foldersNow, folder('f-2', '新领域', 0)]
    }))
    enterValue(input as HTMLInputElement, '新领域')
    await settle()
    expect(stubApi.folders.create).toHaveBeenCalledWith({ name: '新领域' })
    await settle()
    expect(navRow('新领域')).toBeDefined()
  })

  it('重名 toast：create 拒 CONFLICT→error toast 中文原文+输入保留（不收输入行）', async () => {
    await render(BASE_QUERY)
    await click(buttonByText('新建文件夹'))
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    stubApi.folders.create.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '文件夹名已被占用' }
    })
    enterValue(input as HTMLInputElement, '调研计划')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('文件夹名已被占用', 'error')
    expect(host?.querySelector('input[aria-label="新文件夹名"]')).not.toBeNull()
  })

  it('组词中 Enter 不提交（isComposing 守卫）+Esc 取消收起输入', async () => {
    await render(BASE_QUERY)
    await click(buttonByText('新建文件夹'))
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    stubApi.folders.create.mockResolvedValue({ ok: true, data: folder('f-3', 'x', 0) })
    enterValue(input as HTMLInputElement, '组词中的文件夹', true)
    await settle()
    expect(stubApi.folders.create).not.toHaveBeenCalled()
    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await settle()
    expect(host?.querySelector('input[aria-label="新文件夹名"]')).toBeNull()
  })
})

describe('F-UIRES-01 U1 删除流承接（useFolderDelete 拆件原样+FolderDeleteDialog 保留）', () => {
  async function clickDelete(): Promise<void> {
    rightClick(navRow('调研计划'))
    await click(
      [...(host?.querySelectorAll<HTMLButtonElement>('[data-testid="folder-menu"] button') ?? [])].find(
        (b) => (b.textContent ?? '').includes('删除文件夹')
      )
    )
    await settle()
  }

  it('静默直删：空图→folders.delete+graph 预检+选中夹回退全部+onMutated（无弹窗）', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    foldersNow = [folder('__main__', '主图', 2)]
    await clickDelete()
    expect(host?.querySelector('[role="dialog"]')).toBeNull()
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-1' })
    expect(stubApi.folders.delete).toHaveBeenCalledWith({ id: 'f-1' })
    expect(lastPatch).toEqual({ folderScope: undefined })
    expect(mutatedCalls).toBeGreaterThan(0)
    expect(navRow('调研计划')).toBeUndefined()
  })

  /** [RR2-2] W1/W2 删除在途族三用例（自 folder-filter.test.tsx 移植——
   * hangGraph 挂起桩范式照搬；useFolderDelete 本体零改，断言面适配 FolderNav） */
  function hangGraph(): (v: unknown) => void {
    let resolveGraph!: (v: unknown) => void
    stubApi.lineage.graph.mockImplementation(
      () => new Promise((res) => { resolveGraph = res })
    )
    return (v: unknown) => resolveGraph(v)
  }
  const EMPTY_GRAPH = {
    ok: true,
    data: { nodes: [], edges: [], paperMetrics: {}, lineTypes: [], pubNos: {} }
  }
  function menuItem(label: string): HTMLButtonElement | undefined {
    return [...(host?.querySelectorAll<HTMLButtonElement>('[data-testid="folder-menu"] button') ?? [])].find(
      (b) => (b.textContent ?? '').includes(label)
    )
  }

  async function clickDeleteMenu(): Promise<void> {
    rightClick(navRow('调研计划'))
    await click(menuItem('删除文件夹'))
    await settle()
  }

  it('W1：在途删除异目标→info toast 轻量告知+第二目标不执行（graph 预检都不发——hook 级串行语义保留）', async () => {
    const resolveGraph = hangGraph()
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    await render(BASE_QUERY)
    await clickDeleteMenu()
    // 在途窗内右键删除另一目标（主图）
    rightClick(navRow('主图'))
    await click(menuItem('删除文件夹'))
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('上一次删除仍在进行，请稍候', 'info')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    // 第一目标照常落定（不被第二请求干扰）
    resolveGraph(EMPTY_GRAPH)
    await settle()
    expect(stubApi.folders.delete).toHaveBeenCalledTimes(1)
    expect(stubApi.folders.delete).toHaveBeenCalledWith({ id: 'f-1' })
  })

  it('W1：同目标重复删除→静默早退（防双击面语义保留——无 toast+仅一次预检/删除）', async () => {
    const resolveGraph = hangGraph()
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    await render(BASE_QUERY)
    await clickDeleteMenu()
    rightClick(navRow('调研计划'))
    await click(menuItem('删除文件夹'))
    await settle()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()
    resolveGraph(EMPTY_GRAPH)
    await settle()
    expect(stubApi.folders.delete).toHaveBeenCalledTimes(1)
  })

  it('W2：删除在途用户切走筛选→落定后筛选不被清（仅当仍指向被删文件夹才回退）', async () => {
    const resolveGraph = hangGraph()
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    await clickDeleteMenu()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    // 在途窗内用户切换筛选到另一文件夹（受控 props 换新 scope——render 即重渲染）
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-9' } })
    resolveGraph(EMPTY_GRAPH)
    await settle()
    expect(stubApi.folders.delete).toHaveBeenCalledWith({ id: 'f-1' })
    expect(lastPatch).toBeNull()
    expect(mutatedCalls).toBeGreaterThan(0)
  })

  it('有资产→FolderDeleteDialog 保护弹窗（文案逐字承接）+确认删除回退联动', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [{ id: 'a' }], edges: [], paperMetrics: {}, lineTypes: [], pubNos: {} }
    })
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    foldersNow = [folder('__main__', '主图', 3)]
    await clickDelete()
    const dialog = host?.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('删除文件夹「调研计划」？')
    const del = [...(dialog?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '删除文件夹'
    )
    await click(del)
    await settle()
    expect(stubApi.folders.delete).toHaveBeenCalledWith({ id: 'f-1' })
    expect(lastPatch).toEqual({ folderScope: undefined })
    expect(navRow('调研计划')).toBeUndefined()
  })
})

describe('F-UIRES-01 U1 联动与回退（folders.changed 双失效）', () => {
  it('folders.changed→folders.list 重拉（他页删除联动）', async () => {
    await render(BASE_QUERY)
    foldersNow = [folder('__main__', '主图', 2)]
    stubApi.folders.list.mockClear()
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(stubApi.folders.list).toHaveBeenCalled()
  })

  it('选中文件夹消失（并发删除）→回退全部文献（disappearedId 同族顺序契约）', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    foldersNow = [folder('__main__', '主图', 2)]
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(lastPatch).toEqual({ folderScope: undefined })
    expect(mutatedCalls).toBeGreaterThan(0)
  })

  it('未指向消失夹（切走后抵达的 changed）→不触发回退（错误回退护栏）', async () => {
    await render(BASE_QUERY)
    foldersNow = [folder('__main__', '主图', 2)]
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(lastPatch).toBeNull()
  })
})
