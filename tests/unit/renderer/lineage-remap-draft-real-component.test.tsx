// @vitest-environment jsdom
/**
 * [回炉 W-B2·实验② / 设计稿 §2.3 会话身份、§8.1 步骤 1「提交 A 的悬浮笔记草稿」、§8.4 末段、
 * R-remap 终态规则④「草稿先提交」] remap 落库时有打开的悬浮笔记草稿——真实 LineageFloatingNotes
 * 组件复验（原只有手工注册句柄的单测：lineage-session-remap.test.ts「④ 草稿先提交」）。
 *
 * 锁链（生产装配：recovery-host-ports.buildRecoverySchedulerInit + RecoveryBar 真渲染）：
 * 被矫正会话上打开草稿 → ghost remap 落库 → 草稿经组件自身的收口入口提交进存活会话队列 →
 * 落库 IPC 的 content=草稿正文 → DOM 渲染文本=草稿正文（正文不丢）→ 草稿信号归零 →
 * 落定后恢复条容器与「多图未受保护」chip 不驻留。
 * 夹具=lineage-remap-test-fixture（先工厂后被测模块）。always-active 裸 describe（K3）。
 */
import {
  DOOM, MAIN, cleanupRemapFixture, conflict, mainSessions, registry, resetRemapFixture, settle, state, stubApi
} from './lineage-remap-test-fixture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { noteDraftPending, noteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { getConflictState, resolveGhostFolderDecision } from '../../../src/renderer/features/lineage/conflictResolution'
import { buildRecoverySchedulerInit } from '../../../src/renderer/features/lineage/recovery-host-ports'
import {
  enterWorkspaceRecovery,
  getRecoveryState,
  initRecoveryScheduler,
  resetRecoveryScheduler,
  subscribeRecoveryState
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import { RecoveryBar } from '../../../src/renderer/features/recovery/RecoveryBar'
import { defaultLineTypeNames, type FloatingNote } from '@shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 恢复条宿主（RecoveryBarHost 同形：订阅调度器状态→RecoveryBar 纯展示件） */
function BarHost(): JSX.Element | null {
  const recovery = useSyncExternalStore(subscribeRecoveryState, getRecoveryState)
  return <RecoveryBar state={recovery} onRestore={() => undefined} onDiscard={() => undefined} onDefer={() => undefined} onReopen={() => undefined} />
}

let barRoot: Root | null = null
let barHost: HTMLDivElement | null = null
let notesRoot: Root | null = null
let notesHost: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

function mountBar(): void {
  barHost = document.createElement('div')
  document.body.appendChild(barHost)
  barRoot = createRoot(barHost)
  act(() => { barRoot?.render(<BarHost />) })
}
function mountNotes(): void {
  notesHost = document.createElement('div')
  document.body.appendChild(notesHost)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  notesHost.appendChild(contentEl)
  contentEl.getBoundingClientRect = () => ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  notesRoot = createRoot(notesHost)
  act(() => { notesRoot?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />) })
}
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const noteText = (id: string): string | null => noteElOf(id)?.querySelector('.tl-note-text')?.textContent ?? null
const openEditor = (id: string): void => {
  act(() => { noteElOf(id)!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 150, clientY: 150 })) })
}
const type = async (value: string): Promise<void> => {
  const ta = document.querySelector('.tl-note-input') as HTMLTextAreaElement | null
  if (ta === null) throw new Error('编辑会话 textarea 未挂载')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(ta, value)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
/** 渲染落定后的恢复条呈现（chip 元素文本＋容器是否在场） */
async function rendered(): Promise<{ chip: string | null; bar: boolean }> {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve()
  })
  const chip = document.querySelector('[data-testid="recovery-unprotected-chip"]')
  const bar = document.querySelector('[data-testid="recovery-chips"],[data-testid="recovery-bar"]')
  return { chip: chip?.textContent ?? null, bar: bar !== null }
}

const DRAFT_TEXT = '甲（未收口草稿）'

/** ghost 桩：死夹 upsert→CONFLICT·GHOST_FOLDER；主图 upsert→落库（content=请求载荷）并由主图权威读回显 */
function ghostStubsEchoContent(): void {
  let saved: FloatingNote | null = null
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string; id?: string; content: string }) => {
    if (req.folderId === DOOM) return conflict()
    saved = { id: req.id ?? 'n1', folderId: MAIN, x: 0, y: 0, content: req.content, createdAt: 't', updatedAt: 't' }
    return { ok: true as const, data: saved }
  })
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => ({
    ok: true,
    data: {
      nodes: [], edges: [], lineTypeNames: defaultLineTypeNames(), paperMetrics: {}, pubNos: {}, tagNames: {},
      floatingNotes: req.folderId === MAIN && saved !== null ? [saved] : []
    }
  }))
}

beforeEach(async () => {
  await resetRemapFixture()
})

afterEach(async () => {
  await act(async () => {
    notesRoot?.unmount()
    barRoot?.unmount()
  })
  notesRoot = null
  barRoot = null
  notesHost?.remove()
  barHost?.remove()
  notesHost = null
  barHost = null
  contentEl = null
  cleanupRemapFixture()
})

describe('remap 时有打开的草稿（真实组件复验）', () => {
  it('被矫正会话上打开草稿时 remap 落库：草稿提交进存活会话队列、正文不丢、恢复条与 chip 不驻留', async () => {
    ghostStubsEchoContent()
    // 生产装配（owner keyed）：恢复条与 chip 的呈现面走真实装配
    vi.useFakeTimers()
    resetRecoveryScheduler()
    initRecoveryScheduler(buildRecoverySchedulerInit(async () => false, { workspaceId: () => 'ws-1' }))
    await enterWorkspaceRecovery()
    useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
    mountBar()
    mountNotes()
    // 切到死夹、建笔记、打开编辑器、输入未收口正文
    await act(async () => {
      state().setFolder(DOOM)
      await settle()
    })
    await act(async () => {
      state().addFloatingNote(0, 0, '甲')
    })
    const noteId = state().floatingNotes[0]!.id
    expect(noteElOf(noteId), '前提：笔记行已渲染').not.toBeNull()
    openEditor(noteId)
    await type(DRAFT_TEXT)
    const ta = document.querySelector('.tl-note-input')
    expect(ta, '前提：编辑器在场').not.toBeNull()
    expect(noteDraftPending(), '前提：未收口草稿').toBe(true)
    expect(noteDraftSnapshot()).toEqual({ noteId, text: DRAFT_TEXT })
    // 撞 GHOST_FOLDER（显式 IO 收口——不提交草稿、不关编辑器）→「保存到主图」
    let flushing: Promise<void> | null = null
    await act(async () => {
      flushing = state().save()
      await settle()
    })
    expect(getConflictState().pending).toEqual({ folderId: DOOM })
    resolveGhostFolderDecision('remap-main-graph')
    await act(async () => {
      await flushing
      await settle(40)
    })
    // 终态：被矫正会话离场、存活会话=主图
    expect(registry.entry(DOOM)).toBeUndefined()
    expect(state().folderId).toBe(MAIN)
    expect(mainSessions()).toHaveLength(1)
    // 草稿经组件自身的收口入口提交进存活会话队列（不是手工句柄）
    expect(noteDraftSnapshot()).toBeNull()
    expect(noteDraftPending()).toBe(false)
    expect(document.querySelector('.tl-note-input'), '编辑器已随迁移收口').toBeNull()
    const queued = registry.entry(MAIN)!.data.queue
    expect(queued).toHaveLength(1)
    expect(queued[0]).toMatchObject({ kind: 'upsert-floating-note', input: { id: noteId, folderId: MAIN, content: DRAFT_TEXT } })
    // 随后照常落库（存活会话的 idle-flush→链尾和解）
    await advance(IDLE_FLUSH_MS + 300)
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledWith(expect.objectContaining({ id: noteId, folderId: MAIN, content: DRAFT_TEXT }))
    expect(registry.entry(MAIN)!.data.queue).toEqual([])
    expect(registry.entry(MAIN)!.data.saveStatus).toBe('clean')
    expect(registry.entry(MAIN)!.data.needsReload).toBe(false)
    // 正文不丢：store 与渲染文本
    expect(state().floatingNotes.map((n) => n.id)).toEqual([noteId])
    expect(state().floatingNotes[0]!.content).toBe(DRAFT_TEXT)
    expect(noteText(noteId)).toBe(DRAFT_TEXT)
    // 恢复条与 chip 不驻留
    expect(getRecoveryState().unprotectedChip).toBe(false)
    expect(await rendered()).toEqual({ chip: null, bar: false })
  })
})
