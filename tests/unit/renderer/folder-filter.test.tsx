// @vitest-environment jsdom
/**
 * [F-FOLDER-02·A/C] FolderFilter —— FilterBar 文件夹区重制（chip 范式复用
 * TagFilter 视觉族）+ FolderDeleteDialog 删除确认弹窗（design §4.3+N2 终裁文案）。
 *
 * 覆盖：①三态 chip（全部文献/未归档/各文件夹 ×N 计数）与 folderScope 载荷
 * （F4：unfiled 态选中显示「未归档」——判别联合三态显式）；②行内右键菜单=
 * 重命名/删除；③新建（Enter+isComposing 守卫；重名 CONFLICT 域错误中文
 * toast）；④删除弹窗文案逐字（nodeCount/edgeCount=renderer 经 lineage.graph
 * 派生+paperCount=folders.list 载荷）+危险色按钮；⑤删除选中文件夹→筛选回退
 * 全部文献；⑥S2=导入 busy 态 chip 禁用。
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

import { FolderFilter } from '../../../src/renderer/features/library/FolderFilter'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'
import type { LibraryQuery } from '../../../src/shared/models/paper'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let lastPatch: Partial<LibraryQuery> | null = null
let mutatedCalls = 0

const BASE_QUERY: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }

async function render(query: LibraryQuery = BASE_QUERY): Promise<void> {
  lastPatch = null
  await act(async () => {
    root?.render(
      <FolderFilter
        query={query}
        onChange={(patch) => {
          lastPatch = patch
        }}
        onMutated={() => {
          mutatedCalls += 1
        }}
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

/** chip 定位（aria-pressed 域内按钮——scope 缺省=整树） */
function chip(label: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((b) =>
    (b.textContent ?? '').trim().startsWith(label)
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

/** 受控输入驱动+回车（isComposing 可控——组词守卫断言面） */
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

describe('F-FOLDER-02·A FolderFilter 三态与载荷（F4）', () => {
  it('chip 面=全部文献/未归档/各文件夹（×N 计数真文本）；folder 态选中态', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    expect(chip('全部文献')).toBeDefined()
    expect(chip('未归档')).toBeDefined()
    expect(chip('调研计划')?.textContent).toContain('×1')
    expect(chip('调研计划')?.getAttribute('aria-pressed')).toBe('true')
    expect(chip('全部文献')?.getAttribute('aria-pressed')).toBe('false')
  })

  it('F4：unfiled 态选中显示「未归档」（chip 自持标签——旧下拉回落缺陷根治）', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'unfiled' } })
    expect(chip('未归档')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('点按载荷：未归档→{kind:"unfiled"}；文件夹→{kind:"folder",folderId}；全部文献→清 undefined', async () => {
    await render(BASE_QUERY)
    await click(chip('未归档'))
    expect(lastPatch).toEqual({ folderScope: { kind: 'unfiled' } })
    await click(chip('调研计划'))
    expect(lastPatch).toEqual({ folderScope: { kind: 'folder', folderId: 'f-1' } })
    await click(chip('全部文献'))
    expect(lastPatch).toEqual({ folderScope: undefined })
  })
})

describe('F-FOLDER-02·A 新建/重命名（isComposing 守卫+重名域错误）', () => {
  it('新建：+ 按钮展开输入→Enter 提交 create→列表刷新出新 chip', async () => {
    await render(BASE_QUERY)
    await click(buttonByText('+ 新建文件夹'))
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
    expect(chip('新领域')).toBeDefined()
  })

  it('重名 toast：create 拒 CONFLICT「文件夹名已被占用」→ error toast 中文原文', async () => {
    await render(BASE_QUERY)
    await click(buttonByText('+ 新建文件夹'))
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    stubApi.folders.create.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '文件夹名已被占用' }
    })
    enterValue(input as HTMLInputElement, '调研计划')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('文件夹名已被占用', 'error')
  })

  it('组词中 Enter 不提交（isComposing 守卫——仓内 3 先例池范式）', async () => {
    await render(BASE_QUERY)
    await click(buttonByText('+ 新建文件夹'))
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    stubApi.folders.create.mockResolvedValue({ ok: true, data: folder('f-3', 'x', 0) })
    enterValue(input as HTMLInputElement, '组词中的文件夹', true)
    await settle()
    expect(stubApi.folders.create).not.toHaveBeenCalled()
  })

  it('重命名：右键菜单→重命名→对话框 Enter 提交 rename（id+新名）', async () => {
    await render(BASE_QUERY)
    rightClick(chip('调研计划'))
    await click(buttonByText('重命名'))
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    expect(input).not.toBeNull()
    expect((input as HTMLInputElement).value).toBe('调研计划')
    stubApi.folders.rename.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.folders.list.mockImplementation(async () => ({
      ok: true,
      data: [folder('__main__', '主图', 2), folder('f-1', '改名后的图', 1)]
    }))
    enterValue(input as HTMLInputElement, '改名后的图')
    await settle()
    expect(stubApi.folders.rename).toHaveBeenCalledWith({ id: 'f-1', name: '改名后的图' })
    await settle()
    expect(chip('改名后的图')).toBeDefined()
  })
})

describe('F-FOLDER-02·C FolderDeleteDialog（design §4.3+N2 终裁文案）', () => {
  it('弹窗文案逐字：标题/正文计数（nodeCount·edgeCount=graph 派生+paperCount=载荷）+两按钮', async () => {
    await render(BASE_QUERY)
    // 图计数载荷：3 节点 2 边（folders.list paperCount=1）
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        edges: [{ id: 'e1' }, { id: 'e2' }],
        paperMetrics: {},
        lineTypes: [],
        pubNos: {}
      }
    })
    rightClick(chip('调研计划'))
    await click(buttonByText('删除'))
    await settle()
    const dialog = host?.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('删除文件夹「调研计划」？')
    expect(dialog?.textContent).toContain(
      '该文件夹的脉络图将一并删除（3 个节点及 2 条连线不可恢复）；其中 1 篇文献不会被删除，将移至「未归档」。'
    )
    expect(buttonByText('取消', dialog as ParentNode)).toBeDefined()
    const del = [...(dialog?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '删除文件夹'
    )
    expect(del).toBeDefined()
    expect(del?.className).toContain('syn-btn-danger')
  })

  it('确认删除：folders.delete({id})→刷新+onMutated；选中文件夹被删→筛选回退全部', async () => {
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    // 有资产环境（F-DELCONF-01 前置：菜单点击即查 graph——本用例=有资产弹窗
    // 确认路径回归，graph 须非空图）
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [{ id: 'a' }], edges: [], paperMetrics: {}, lineTypes: [], pubNos: {} }
    })
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    foldersNow = [folder('__main__', '主图', 3)]
    rightClick(chip('调研计划'))
    await click(buttonByText('删除'))
    await settle()
    const dialog = host?.querySelector('[role="dialog"]')
    const del = [...(dialog?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === '删除文件夹'
    )
    await click(del)
    await settle()
    expect(stubApi.folders.delete).toHaveBeenCalledWith({ id: 'f-1' })
    expect(lastPatch).toEqual({ folderScope: undefined })
    expect(mutatedCalls).toBeGreaterThan(0)
    expect(chip('调研计划')).toBeUndefined()
  })
})

describe('F-DELCONF-01 删除静默判据（①空图直删/有资产弹窗/fail-closed）', () => {
  it('静默直删：空图（nodes=[] ∧ edges=[]）→不弹 Dialog+folders.delete+graph 预检+回退联动（paperCount 不参与——非零亦直删）', async () => {
    // paperCount=7（非零）：文献仅移未归档可寻回，不构成保护资产
    foldersNow = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 7)]
    await render({ ...BASE_QUERY, folderScope: { kind: 'folder', folderId: 'f-1' } })
    stubApi.folders.delete.mockResolvedValue({ ok: true, data: { ok: true } })
    foldersNow = [folder('__main__', '主图', 2)]
    rightClick(chip('调研计划'))
    await click(buttonByText('删除'))
    await settle()
    expect(host?.querySelector('[role="dialog"]')).toBeNull()
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-1' })
    expect(stubApi.folders.delete).toHaveBeenCalledTimes(1)
    expect(stubApi.folders.delete).toHaveBeenCalledWith({ id: 'f-1' })
    expect(lastPatch).toEqual({ folderScope: undefined })
    expect(mutatedCalls).toBeGreaterThan(0)
    expect(chip('调研计划')).toBeUndefined()
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('有资产弹窗照弹（负锚）：edgeCount>0→Dialog 挂载+不静默删', async () => {
    await render(BASE_QUERY)
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: {
        nodes: [],
        edges: [{ id: 'e1' }],
        paperMetrics: {},
        lineTypes: [],
        pubNos: {}
      }
    })
    rightClick(chip('调研计划'))
    await click(buttonByText('删除'))
    await settle()
    expect(host?.querySelector('[role="dialog"]')).not.toBeNull()
    expect(stubApi.folders.delete).not.toHaveBeenCalled()
  })

  it('fail-closed：graph 预检失败→不删不弹+error toast（域错误透传/意外兜底）', async () => {
    await render(BASE_QUERY)
    stubApi.lineage.graph.mockResolvedValue({
      ok: false,
      error: { code: 'INTERNAL', message: '脉络图暂不可用' }
    })
    rightClick(chip('调研计划'))
    await click(buttonByText('删除'))
    await settle()
    expect(host?.querySelector('[role="dialog"]')).toBeNull()
    expect(stubApi.folders.delete).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('脉络图暂不可用', 'error')
    // 意外异常（非 ApiClientError）→兜底文案
    stubApi.lineage.graph.mockReset()
    stubApi.lineage.graph.mockRejectedValue(new Error('network down'))
    rightClick(chip('主图'))
    await click(buttonByText('删除'))
    await settle()
    expect(host?.querySelector('[role="dialog"]')).toBeNull()
    expect(stubApi.folders.delete).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('无法确认文件夹脉络图，已取消删除', 'error')
  })
})

describe('F-FOLDER-02·A 联动与禁用', () => {
  it('folders.changed→列表刷新（他页删除联动）', async () => {
    await render(BASE_QUERY)
    foldersNow = [folder('__main__', '主图', 2)]
    stubApi.folders.list.mockClear()
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(stubApi.folders.list).toHaveBeenCalled()
  })

  it('S2：导入 busy 态 chip 与新建入口禁用（禁切文件夹）', async () => {
    await render(BASE_QUERY)
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    expect(chip('调研计划')?.disabled).toBe(true)
    expect(chip('全部文献')?.disabled).toBe(true)
    expect(buttonByText('+ 新建文件夹')?.disabled).toBe(true)
  })
})
