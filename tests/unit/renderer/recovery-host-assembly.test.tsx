// @vitest-environment jsdom
/**
 * [F-RECOV-04 回炉 W2] RecoveryBarHost 真装配测试——真 store+真 Host 组件+可控
 * IPC fake。对治审查 M2H「integration 测试复制 Host 谓词而非消费生产装配」：
 * 本文件渲染生产 RecoveryBarHost（initRecoveryScheduler 装配=Host useEffect
 * 生产注入——hasUnsettledWrites/settleUnsettledWrites/askRestoreDecision/
 * runRestorePreflight 四钩子皆生产形），经 RecoveryBar 按钮驱动真实决策流。
 * 覆盖=B-2 四条件的真装配面：①queue 非空守卫→先落定后确认 ②草稿在守卫→
 * 既有 commit 入口收口 ③flushing 守卫→四条件不过停条可重试 ④预检读面
 * reject=阻断可重试不载入。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  folders: { list: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { RecoveryBarHost } from '../../../src/renderer/app/RecoveryBarHost'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import {
  noteDraftSnapshot,
  registerNoteDraftFlush,
  setNoteDraftSnapshot,
  unregisterNoteDraftFlush
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import { getRecoveryState, resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'
import type { FloatingNote, LineageNode } from '@shared/models/lineage'

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

function note(id: string, content: string): FloatingNote {
  return { id, folderId: '__main__', x: 10, y: 10, content, createdAt: 't', updatedAt: 't' }
}

const OLD_PAYLOAD: LineageRecoveryPayload = {
  folderId: '__main__',
  graph: {
    nodes: [node('OLD')],
    edges: [],
    lineTypeNames: ['一', '二', '三', '四', '五', '六'],
    floatingNotes: []
  },
  queue: [],
  draft: null
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mountHost(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<RecoveryBarHost />)
  })
}

const flush = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const btn = (id: string): HTMLButtonElement | null =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null

const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')

async function clickBar(id: string): Promise<void> {
  const b = btn(id)
  expect(b, `确认条应含 [data-testid="${id}"] 按钮`).not.toBeNull()
  await act(async () => {
    b!.click()
  })
  await flush()
}

async function clickDialogButton(label: string): Promise<void> {
  const d = dialog()
  expect(d, '确认框应在场').not.toBeNull()
  const b = Array.from(d!.querySelectorAll('button')).find((x) => x.textContent === label)
  expect(b, `确认框应含「${label}」按钮`).not.toBeNull()
  await act(async () => {
    b!.click()
  })
  await flush()
}

beforeEach(async () => {
  vi.clearAllMocks()
  resetRecoveryScheduler()
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: {
      slots: {
        'lineage-session': {
          status: 'available',
          epoch: 0,
          file: { token: 'tok-host', writtenAt: 'w', lastWriterSession: 'old', actionCount: 0, draftPresent: false }
        }
      }
    }
  })
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok-new', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: OLD_PAYLOAD } })
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [{ id: 'fold-1', name: '夹', position: 0, createdAt: 't' }]
  })
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], paperMetrics: {}, lineTypeNames: ['一', '二', '三', '四', '五', '六'], pubNos: {}, tagNames: {}, floatingNotes: [] }
  })
  stubApi.lineage.patchNode.mockImplementation(async (req: { id?: string }) => ({
    ok: true,
    data: { ...node(String(req.id ?? 'A')), x: 3, y: 4 }
  }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string; content?: string }) => ({
    ok: true,
    data: note(String(req.id ?? 'f1'), String(req.content ?? '草稿正文'))
  }))
  useWorkspaceStore.setState({
    items: [{ id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 }],
    currentId: 'w1',
    loading: false,
    error: null
  })
  useLineageStore.setState({
    nodes: [node('A')],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__',
    floatingNotes: []
  })
  mountHost()
  await flush() // ws-entry 屏障：enter→peek(available)→确认条
  expect(getRecoveryState().phase).toBe('await-decision')
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  unregisterNoteDraftFlush()
  // 收尾清残留脏态（防跨用例污染——integration 同族口径）
  useLineageStore.setState({
    saveStatus: 'clean',
    queue: [],
    undoStack: [],
    redoStack: [],
    flushing: false,
    needsReload: false
  })
})

describe('F-RECOV-04 回炉 W2：RecoveryBarHost 真装配（B-2 四条件/落定步/预检阻断）', () => {
  it('W2① queue 非空守卫：恢复先落定（真 flush clean）再弹替换确认，确认后才 read+载入', async () => {
    await clickBar('recovery-defer') // 开门进编辑期
    act(() => {
      useLineageStore.getState().moveNode('A', 3, 4) // 未落定写：queue 非空
    })
    expect(useLineageStore.getState().queue).toHaveLength(1)
    await clickBar('recovery-reopen') // 查看重开（冻结）
    await clickBar('recovery-restore')
    // 落定步已真跑：真 flush 收口 clean+queue 清空；确认前不 read
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(useLineageStore.getState().queue).toHaveLength(0)
    expect(noteDraftSnapshot()).toBeNull()
    expect(stubApi.recovery.read).not.toHaveBeenCalled()
    expect(dialog()).not.toBeNull()
    expect(dialog()!.textContent).toContain('已保存当前 1 项修改')
    expect(dialog()!.textContent).toContain('恢复将用副本替换当前图')
    // 确认→read→预检→真载入（生产 applyRecoverySession）→takeOver
    await clickDialogButton('继续恢复')
    expect(stubApi.recovery.read).toHaveBeenCalledTimes(1)
    expect(useLineageStore.getState().nodes.map((n) => n.id)).toEqual(['OLD'])
    expect(useLineageStore.getState().saveStatus).toBe('dirty')
    expect(useLineageStore.getState().undoStack).toEqual([])
    expect(stubApi.recovery.save).toHaveBeenCalledWith(expect.objectContaining({ takeOverToken: 'tok-host' }))
    expect(getRecoveryState().phase).toBe('open')
    expect(getRecoveryState().pendingChip).toBe(false)
  })

  it('W2② 草稿在守卫：落定步经既有 commit 入口收口草稿，确认框注明草稿', async () => {
    await clickBar('recovery-defer')
    act(() => {
      useLineageStore.setState({ floatingNotes: [note('f1', '旧文')] })
      registerNoteDraftFlush(() => {
        useLineageStore.getState().updateFloatingNote('f1', { content: '草稿正文' })
      })
      setNoteDraftSnapshot({ noteId: 'f1', text: '草稿正文' })
    })
    expect(noteDraftSnapshot()).not.toBeNull()
    await clickBar('recovery-reopen')
    await clickBar('recovery-restore')
    // 落定步：草稿经既有 commit 入口转队列→真 flush 收口（快照清+clean）
    expect(noteDraftSnapshot()).toBeNull()
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(useLineageStore.getState().queue).toHaveLength(0)
    expect(stubApi.recovery.read).not.toHaveBeenCalled()
    expect(dialog()).not.toBeNull()
    expect(dialog()!.textContent).toContain('已保存当前 1 项修改')
    expect(dialog()!.textContent).toContain('草稿')
    await clickDialogButton('继续恢复')
    expect(useLineageStore.getState().nodes.map((n) => n.id)).toEqual(['OLD'])
    expect(getRecoveryState().phase).toBe('open')
  })

  it('W2③ flushing 守卫：四条件不过=停条可重试（不弹确认不误判成功不误清队列）', async () => {
    await clickBar('recovery-defer')
    // [B4 L1 最小迁移] 真实在途 flush（patch 回包 deferred）替代 saveStatus/flushing
    // 字面夹具——串行写链下 `save()` 的「在途 flush 让位早退」须由真实在途任务承载
    let release!: (v: { ok: false; error: { code: string; message: string } }) => void
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => { release = r }))
    act(() => {
      useLineageStore.getState().moveNode('A', 3, 4)
      void useLineageStore.getState().save()
    })
    expect(useLineageStore.getState().flushing).toBe(true) // 在途 flush 窗
    await clickBar('recovery-reopen')
    await clickBar('recovery-restore')
    // save() 在 flushing 窗早退≠落定成功：四条件核验不过→停条 busy=f 可重试
    expect(dialog()).toBeNull()
    expect(getRecoveryState().busy).toBe(false)
    expect(getRecoveryState().phase).toBe('await-decision')
    expect(stubApi.recovery.read).not.toHaveBeenCalled()
    expect(useLineageStore.getState().queue).toHaveLength(1) // 未误清未误载
    // 在途 flush 以系统失败收场（队首保留）→重试：落定步真 flush 该 1 项→落定过
    // →确认框再现（可重试语义——「已保存当前 1 项修改」=重试窗口的真实落库计数）
    await act(async () => {
      release({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })
    expect(useLineageStore.getState().flushing).toBe(false)
    expect(useLineageStore.getState().queue).toHaveLength(1) // 失败写保留
    await clickBar('recovery-restore')
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(dialog()).not.toBeNull()
    expect(dialog()!.textContent).toContain('已保存当前 1 项修改')
  })

  it('W2④ 预检读面 reject=阻断可重试不载入（生产 runRestorePreflight 装配面）', async () => {
    stubApi.lineage.graph.mockRejectedValue(new Error('读面失败'))
    await clickBar('recovery-defer')
    await clickBar('recovery-reopen')
    await clickBar('recovery-restore')
    // read 已过、预检读面失败→「无法预检」通知框（与冲突清单不同态不同文案）
    expect(stubApi.recovery.read).toHaveBeenCalledTimes(1)
    expect(dialog()).not.toBeNull()
    expect(dialog()!.textContent).toContain('无法预检恢复副本')
    expect(useLineageStore.getState().nodes.map((n) => n.id)).toEqual(['A']) // 未载入
    await clickDialogButton('好')
    expect(getRecoveryState().busy).toBe(false)
    expect(getRecoveryState().phase).toBe('await-decision') // 条保留可重试
    expect(useLineageStore.getState().nodes.map((n) => n.id)).toEqual(['A'])
  })
})
