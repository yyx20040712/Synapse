/**
 * [回炉 W-B3·R-D1] 过期历史出口测试夹具（lineage-history-stale-exit / lineage-history-stale-boundary 共用）。
 * 顺序契约（tests/utils/api-client-mock）：本件先 import 桩工厂、后 import 被测模块——测试文件必须把本件
 * 写在第一条 import，契约随之成立（先例=lineage-remap-test-fixture）。
 *
 * 夹具形态：
 * - 真 service 链：内存真库（完整迁移链）＋真 lineage.service / lineage-history-unit.service 接到 api 桩位
 *   （桩只承载传输——Req→service→Res，错误经 toAppError 折叠，与 main ipc/register 同一出口）。四种拒因
 *   全部由真 service 发射；「真实分叉」＝历史项落库后由 repo 直接改该实体。
 * - 每例一套新库（setupStaleExitFixture 注册 beforeEach/afterEach：清全部脉络会话、重置桩、关旧库、建新库、
 *   接真链、卸载工具组）。
 * - 工具组＝保存错误行与出口的宿主（仅 edit 模式渲染）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

export const stubApi = makeApiStub({
  papers: { setStarred: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn(),
    historyUnit: vi.fn()
  }
})

import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { createLineageHistoryUnitService } from '../../../src/main/services/lineage/lineage-history-unit.service'
import { toAppError, type AppError } from '../../../src/shared/app-error'
import { makeLineageDb } from '../../utils/lineage-history-db'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { SqliteDb } from '../../../src/main/db/connection'
import type { LineageHistoryUnitReq } from '../../../src/shared/ipc/lineage-history.schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

export interface Rig {
  db: SqliteDb
  repos: ReturnType<typeof makeLineageDb>['repos']
  write: ReturnType<typeof createLineageService>
  unit: ReturnType<typeof createLineageHistoryUnitService>
}
let current: Rig | null = null
/** 本例的真库与服务链（setupStaleExitFixture 的 beforeEach 之后可用） */
export const rig = (): Rig => current as Rig
/** 真 service 的 graph 读回包（LineageGraphRes 形——接到 api.lineage.graph 桩位的数据面） */
export type GraphPayload = ReturnType<Rig['write']['graph']>

function makeRig(): Rig {
  const { db, repos } = makeLineageDb()
  return {
    db,
    repos,
    write: createLineageService({ repo: repos.lineage }),
    // 与生产装配同一依赖面（tests/unit/services/lineage-history-unit.service.test.ts makeRig 同形）
    unit: createLineageHistoryUnitService({
      historyRepo: repos.lineageHistory,
      meta: repos.lineage,
      listGraph: () => repos.lineage.listGraph(),
      folderExists: (id) => repos.folders.findById(id) !== null,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderIdOf: (id) => repos.papers.folderIdOf(id),
      withTransaction: repos.withTransaction
    })
  }
}

/** 真 service 链接到 api 桩位：桩只承载传输（Req→service→Res/Error；错误折叠=ipc/register 的同一 toAppError） */
function wireRealChain(r: Rig): void {
  /** service 同步调用→Result 信封（域错误/系统错误经 toAppError 折叠——与 main ipc/register 出口同一函数） */
  async function fold<T>(fn: () => T): Promise<{ ok: true; data: T } | { ok: false; error: AppError }> {
    try {
      return { ok: true as const, data: fn() }
    } catch (e) {
      return { ok: false as const, error: toAppError(e) }
    }
  }
  stubApi.lineage.patchNode.mockImplementation(async (req: { id: string } & Record<string, unknown>) => {
    const { id, ...patch } = req
    return fold(() => r.write.patchNode(id, patch))
  })
  stubApi.lineage.removeNode.mockImplementation(async (req: { id: string }) => fold(() => r.write.removeNode(req.id)))
  stubApi.lineage.removeEdge.mockImplementation(async (req: { id: string }) => fold(() => r.write.removeEdge(req.id)))
  stubApi.lineage.upsertEdge.mockImplementation(async (req: Parameters<typeof r.write.upsertEdge>[0]) => fold(() => r.write.upsertEdge(req)))
  stubApi.lineage.historyUnit.mockImplementation(async (req: LineageHistoryUnitReq) => fold(() => r.unit.unit(req)))
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => fold(() => r.write.graph(req.folderId)))
}

/** 注册每例的前后置：新库＋真链＋会话复位；用后关库、卸载工具组 */
export function setupStaleExitFixture(): void {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
    resetLineageSessionsForTests()
    closeRig()
    current = makeRig()
    wireRealChain(current)
    useLineageViewStore.setState({ mode: 'edit', tool: 'select', paletteFor: null, focusSet: [] })
  })
  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    hostEl?.remove()
    hostEl = null
    resetLineageSessionsForTests()
    closeRig()
  })
}
function closeRig(): void {
  if (current === null) return
  try {
    current.db.close()
  } catch {
    // 用例内已关库（真系统型失败格）——幂等
  }
  current = null
}

// ── 读点 ──
export const state = () => useLineageStore.getState()
export const dbNode = (id: string): LineageNode | undefined => rig().repos.lineage.listGraph().nodes.find((n) => n.id === id)
export const unitCalls = (): LineageHistoryUnitReq[] => stubApi.lineage.historyUnit.mock.calls.map((c) => c[0] as LineageHistoryUnitReq)
export const undoIds = (): string[] => state().undoStack.map((e) => e.id)
export const redoIds = (): string[] => state().redoStack.map((e) => e.id)
/** 活动会话的过期历史标记（registry entry.data=单源；无标记=null） */
export const staleMark = (): unknown => lineageRegistry.entry(lineageRegistry.activeFolder())?.data.staleHistory ?? null
/** 丢弃前后对照的 IPC 调用总数（lineage 域全部通道） */
export const ipcCallCount = (): number => Object.values(stubApi.lineage).reduce((n, fn) => n + fn.mock.calls.length, 0)
/** main 的 HISTORY_STALE 拒因消息（lineage-history-unit.service stale()） */
export const staleMessage = (id: string): string => `节点已被其他操作改变（${id}），撤销/重做未执行`

// ── 库侧种子与分叉 ──
export function seedNode(r: Rig, id: string, paperId: string, folderId = '__main__'): void {
  r.repos.lineage.upsertNode({ id, paperId, title: `节点${id}`, year: 2020, x: 0, y: 0, month: 1, slot: 0, folderId })
}

/** 「由 repo 直接改该实体」的行输入（只带 upsert 面字段——时间戳由 repo 刷新） */
export function forkInput(n: LineageNode, over: Partial<Pick<LineageNode, 'x' | 'y'>>): Parameters<Rig['repos']['lineage']['upsertNode']>[0] {
  return { id: n.id, paperId: n.paperId, title: n.title, year: n.year, x: n.x, y: n.y, month: n.month, slot: n.slot, folderId: n.folderId, ...over }
}

/** 两文献两节点（主图）——两项编辑分别落在不同实体上，使「栈顶项过期」不影响更旧项 */
export function seedTwoNodes(): void {
  seedNode(rig(), 'A', 'p-a')
  seedNode(rig(), 'B', 'p-b')
}

/** 会话植入：图取该 folder 的真库现行（历史项 before/after 的 createdAt 须与库行一致——指纹含 createdAt） */
export function seedSession(folderId = '__main__'): void {
  const g = rig().write.graph(folderId)
  useLineageStore.setState({
    folderId,
    nodes: g.nodes,
    edges: g.edges,
    floatingNotes: g.floatingNotes,
    paperMetrics: g.paperMetrics,
    pubNos: g.pubNos,
    tagNames: g.tagNames,
    lineTypeNames: g.lineTypeNames,
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0
  })
}

// ── store 动作（React act 内驱动——工具组已挂载时 store 变更经 act 提交渲染）──
export async function drove<T>(fn: () => Promise<T>): Promise<T> {
  let value!: T
  await act(async () => {
    value = await fn()
  })
  return value
}
export const save = (): Promise<void> =>
  drove(async () => {
    await state().save()
  })
export const undo = (): Promise<boolean> => drove(() => state().undo())
export const redo = (): Promise<boolean> => drove(() => state().redo())
export function edit(fn: () => void): void {
  act(() => {
    fn()
  })
}
/** 微任务轮转（让链任务推进到下一个 await 边界） */
export const settle = async (turns = 14): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

// ── 工具组（错误行与出口的宿主）──
let root: Root | null = null
let hostEl: HTMLDivElement | null = null
export const DROP_BTN = '[data-testid="lineage-stale-drop"]'
export const ERROR_ROW = '[data-testid="lineage-save-error"]'
/** 出口动作文案（ui-constants LINEAGE_STALE_DROP_ACTION） */
export const ACTION_TEXT = '丢弃这条过期历史'

export function mountToolbar(): void {
  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)
  root = createRoot(hostEl)
  act(() => {
    root?.render(<LineageToolbar mode="edit" />)
  })
}
/** 工具组子树内查（确认框经 portal 挂 document.body——不在子树内，用 dialog()） */
export const q = (sel: string): Element | null => hostEl?.querySelector(sel) ?? null
export const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')
export function click(el: Element | null, what = '元素'): void {
  expect(el, `${what}应已渲染`).not.toBeNull()
  act(() => {
    ;(el as HTMLElement).click()
  })
}
export function clickDialogButton(label: string): void {
  const b = Array.from(dialog()?.querySelectorAll('button') ?? []).find((x) => x.textContent === label)
  expect(b, `确认框应含「${label}」按钮`).toBeDefined()
  click(b!, `确认框「${label}」按钮`)
}
