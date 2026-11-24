// @vitest-environment jsdom
/**
 * [回炉 W-D1·T-B02 / 设计稿 §12.2 app-shell 行「全量 flush 后才 switch、失败不 switch」、§2.5 #38、
 * plan §6.2.13] App 组合根的课题切换全量 flush 全链。
 *
 * 既有 app-shell.test.tsx 只覆盖「dirty 且确认取消」。本件走真实入口：`<App />`→Rail「课题」→
 * WorkspacesPage 点目标卡→window.confirm（SWITCH_DIRTY_TEXT）→ViewHost 注入的
 * prepareWorkspaceSwitch（全 registry flush+reset）→prepareRecoveryWorkspaceSwitch→
 * api.workspaces.switch→location.reload。lineage 两会话（主图活动、f-b 挂起）各持一条待写；
 * 写通道接真 lineage.service+内存真库——「switch IPC 前 DB 落库」在 switch 桩内回读真库。
 * always-active（app-shell 族同口径）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn() },
  library: { list: vi.fn() },
  settings: { get: vi.fn(), set: vi.fn() },
  system: { setQuitDirty: vi.fn(), windowControl: vi.fn() },
  workspaces: { list: vi.fn(), switch: vi.fn() },
  folders: { list: vi.fn() },
  recovery: { peek: vi.fn(), release: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { DomainError } from '../../../src/main/services/shared/domain-error'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { makeLineageDb, seedFolder, type Db } from '../../utils/lineage-history-db'
import { App } from '../../../src/renderer/app/App'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import type { LineageNode } from '../../../src/shared/models/lineage'

// App 级真渲染：声明 act 环境（React 的 act 配置检查——未声明时每次 act 都告警）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'
const SUSPENDED = 'f-b'

function node(id: string, folderId: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let reloadSpy: ReturnType<typeof vi.fn>
/** window.confirm 桩的结构类型（vi.spyOn 的泛型实例类型随重载形参漂移——只取本件用到的两面） */
let confirmSpy: { mock: { calls: unknown[][] }; mockRestore(): void }
let db: Db

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const flush = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** rail 内按 aria-label 取按钮（app-shell.test 同式） */
function railButton(label: string): HTMLButtonElement {
  const rail = document.querySelector('nav.rail')
  const btn = Array.from(rail?.querySelectorAll('button') ?? []).find((b) => b.getAttribute('aria-label') === label)
  if (btn === undefined) throw new Error(`rail 应含 aria-label「${label}」的 button`)
  return btn
}

/** 进入课题管理页并点击目标课题卡 w2（确认框按 confirmSpy 返回） */
async function pickWorkspace(): Promise<void> {
  act(() => {
    railButton('课题').click()
  })
  const cards = document.querySelectorAll('main .ws-card')
  expect(cards.length).toBe(2)
  await act(async () => {
    cards[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush(20)
}

const patchIds = (): Array<string | undefined> => stubApi.lineage.patchNode.mock.calls.map((c) => (c[0] as { id?: string }).id).sort()
/** 真库回读（id→坐标） */
const dbNodes = (): Array<{ id: string; x: number | null; y: number | null }> =>
  (db.prepare('SELECT id, x, y FROM lineage_nodes ORDER BY id').all() as Array<{ id: string; x: number | null; y: number | null }>)
/** 注册表全部会话的 U/历史/队列快照 */
const historyOf = (): Array<{ key: string; undo: number; redo: number; unfinalized: boolean; queue: number; phase: string }> =>
  lineageRegistry
    .sessions()
    .map((e) => ({ key: e.key, undo: e.data.undoStack.length, redo: e.data.redoStack.length, unfinalized: e.data.unfinalized, queue: e.data.queue.length, phase: e.data.saveStatus }))
    .sort((a, b) => a.key.localeCompare(b.key))

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockReset()
  stubApi.lineage.patchNode.mockReset()
  stubApi.library.list.mockReset()
  stubApi.workspaces.list.mockReset()
  stubApi.workspaces.switch.mockReset()
  // jsdom location.reload not implemented：整体替换（app-shell.test 同型）
  reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } })
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { system: { setQuitDirty: stubApi.system.setQuitDirty, windowControl: stubApi.system.windowControl } }
  })
  Object.defineProperty(window, 'apiEvents', {
    configurable: true,
    value: { onWindowState: vi.fn(() => () => undefined) }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [] })
  stubApi.settings.get.mockResolvedValue({ ok: true, data: { contactEmail: 'a@b.c', theme: 'light', uiScale: 'small' } })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: {
      items: [
        { id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 },
        { id: 'w2', name: '智慧水务水质模型课题', createdAt: '2026-08-29T00:00:00Z', paperCount: 7 }
      ],
      currentId: 'w1'
    }
  })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.recovery.peek.mockResolvedValue({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
  // 真库：主图节点 A1、f-b 节点 B1（各在原位 (1,1)）
  const made = makeLineageDb()
  db = made.db
  seedFolder(db, SUSPENDED, '夹乙')
  const insert = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, created_at, updated_at, folder_id)
     VALUES (?, NULL, ?, '', 2022, 1, 1, 9, 0, 't', 't', ?)`
  )
  insert.run('A1', '节点A1', null)
  insert.run('B1', '节点B1', SUSPENDED)
  // 写通道接真 lineage.service（桩只承载传输）
  const svc = createLineageService({ repo: made.repos.lineage })
  stubApi.lineage.patchNode.mockImplementation(async (req: { id: string } & Record<string, unknown>) => {
    const { id, ...patch } = req
    try {
      return { ok: true as const, data: svc.patchNode(id, patch as Parameters<typeof svc.patchNode>[1]) }
    } catch (e) {
      if (e instanceof DomainError) return { ok: false as const, error: { code: e.code, message: e.message } }
      throw e
    }
  })
  resetRecoveryScheduler()
  resetLineageSessionsForTests()
  useWorkspaceStore.setState({ items: [], currentId: '', loading: false, error: null })
  // lineage 两会话各持一条待写（主图活动、f-b 挂起）：Q=1、undo 1、U=1
  useLineageStore.setState({
    nodes: [node('A1', MAIN)], edges: [], floatingNotes: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [], unfinalized: false, folderId: MAIN
  })
  lineageRegistry.ensure(SUSPENDED)
  lineageRegistry.update(SUSPENDED, { nodes: [node('B1', SUSPENDED)], status: 'ready' })
  useLineageStore.getState().moveNode('A1', 10, 10)
  lineageRegistry.lane(SUSPENDED).commands.moveNode('B1', 20, 20)
  expect(historyOf()).toEqual([
    { key: MAIN, undo: 1, redo: 0, unfinalized: true, queue: 1, phase: 'dirty' },
    { key: SUSPENDED, undo: 1, redo: 0, unfinalized: true, queue: 1, phase: 'dirty' }
  ])
  stubApi.lineage.patchNode.mockClear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  confirmSpy.mockRestore()
  lineageRegistry.cancelAllIdle()
  resetRecoveryScheduler()
  resetLineageSessionsForTests()
  db.close()
})

describe('App 组合根：课题切换全量 flush 全链（[回炉 W-D1] §2.5 #38、§12.2 app-shell 行）', () => {
  it('确认通过：活动图与挂起图的写都在 switch IPC 之前落库（switch 时真库回读）→switch({id})→reload；成功后全部会话历史/U/队列清', async () => {
    let atSwitch: unknown = null
    stubApi.workspaces.switch.mockImplementation(async (req: { id: string }) => {
      // switch IPC 到达时刻的真库与注册表现场（判别「switch 前 DB 落库」「全成功后才清史」）
      atSwitch = { req, nodes: dbNodes(), history: historyOf(), sessions: lineageRegistry.sessions().map((e) => e.key) }
      return { ok: true, data: { ok: true } }
    })
    mount(<App />)
    await flush()
    expect(document.querySelector('main .ws-page')).toBeNull()
    await pickWorkspace()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(String(confirmSpy.mock.calls[0]![0])).toContain('先保存全部修改')
    // switch IPC 到达时刻的现场：真库已落两图的写、全部会话历史已清、注册表只剩新主图会话
    expect(atSwitch, 'switch IPC 到达时：真库已落两图的写、全部会话历史已清、注册表只剩新主图会话').toEqual({
      req: { id: 'w2' },
      nodes: [
        { id: 'A1', x: 10, y: 10 },
        { id: 'B1', x: 20, y: 20 }
      ],
      history: [{ key: MAIN, undo: 0, redo: 0, unfinalized: false, queue: 0, phase: 'clean' }],
      sessions: [MAIN]
    })
    expect(patchIds(), '两图的写都已发出').toEqual(['A1', 'B1'])
    expect(
      Math.max(...stubApi.lineage.patchNode.mock.invocationCallOrder),
      '写 IPC 全部先于 switch IPC'
    ).toBeLessThan(stubApi.workspaces.switch.mock.invocationCallOrder[0]!)
    expect(stubApi.workspaces.switch).toHaveBeenCalledTimes(1)
    expect(reloadSpy, '切换成功即 reload 一次').toHaveBeenCalledTimes(1)
  })

  it('挂起会话写失败：确认通过仍不 switch、不 reload——失败写未落库、留旧课题、全部会话历史与失败写保留；修复后重试同链成功', async () => {
    const okImpl = stubApi.lineage.patchNode.getMockImplementation()!
    stubApi.lineage.patchNode.mockImplementation(async (req: { id: string } & Record<string, unknown>) =>
      req.id === 'B1' ? { ok: false as const, error: { code: 'DB_ERROR', message: '挂起会话写失败' } } : okImpl(req)
    )
    mount(<App />)
    await flush()
    await pickWorkspace()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(stubApi.workspaces.switch, '任一会话未落库：不 switch').not.toHaveBeenCalled()
    expect(reloadSpy, '不 switch 即不 reload').not.toHaveBeenCalled()
    expect(dbNodes(), '失败写未落库（活动图的写已落库）').toEqual([
      { id: 'A1', x: 10, y: 10 },
      { id: 'B1', x: 1, y: 1 }
    ])
    expect(historyOf(), '零清账：两会话历史保留、失败写保留在队首').toEqual([
      { key: MAIN, undo: 1, redo: 0, unfinalized: true, queue: 0, phase: 'clean' },
      { key: SUSPENDED, undo: 1, redo: 0, unfinalized: true, queue: 1, phase: 'error' }
    ])
    expect(lineageRegistry.entry(SUSPENDED)!.data.lastWriteError).toBe('挂起会话写失败')
    expect(useWorkspaceStore.getState().currentId, '留旧课题').toBe('w1')
    expect(document.querySelector('main .ws-page'), '留在课题页可重试').not.toBeNull()
    expect(patchIds(), '两图的写都确曾发出').toEqual(['A1', 'B1'])
    // 写面恢复→同链重试成功（失败零副作用：历史未丢、未 discard）
    stubApi.lineage.patchNode.mockImplementation(okImpl)
    stubApi.lineage.patchNode.mockClear()
    await pickWorkspace()
    expect(confirmSpy).toHaveBeenCalledTimes(2)
    expect(patchIds(), '活动图已落库的写不重发；只重发失败写').toEqual(['B1'])
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'w2' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(dbNodes()).toEqual([
      { id: 'A1', x: 10, y: 10 },
      { id: 'B1', x: 20, y: 20 }
    ])
  })
})
