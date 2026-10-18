// @vitest-environment jsdom
/**
 * [F-VISFB-65 U7] RecoveryBar —— 确认条呈现面（纯展示件 props 驱动——四行形
 * +chip 态+busy 禁用；createRoot/act 直渲染=repo 组件测试惯例；文案锚=e2e
 * recovery.spec 同源断言）。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryBar, type RecoveryBarState } from '../../../src/renderer/features/recovery/RecoveryBar'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const FILE = { token: 't', writtenAt: '2026-10-19T05:00:00.000Z', lastWriterSession: 's', actionCount: 3, draftPresent: true }

function state(over: Partial<RecoveryBarState> = {}): RecoveryBarState {
  return {
    phase: 'await-decision',
    slotKind: 'available',
    file: FILE,
    deadFolder: false,
    busy: false,
    pendingChip: false,
    degraded: false,
    ...over
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mountBar(s: RecoveryBarState): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <RecoveryBar state={s} onRestore={vi.fn()} onDiscard={vi.fn()} onDefer={vi.fn()} onReopen={vi.fn()} />
    )
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

const barText = (): string => document.querySelector('[data-testid="recovery-bar"]')?.textContent ?? ''
const testid = (id: string): HTMLElement | null => document.querySelector(`[data-testid="${id}"]`)

describe('F-VISFB-65 RecoveryBar —— 确认条四行形+chip（§6 呈现锚）', () => {
  it('available 行：会话名+本地时间+待保存动作 N（含草稿）+恢复/放弃', () => {
    mountBar(state())
    expect(barText()).toContain('脉络图暂存会话')
    expect(barText()).toContain('待保存动作 3')
    expect(barText()).toContain('含未收口草稿')
    expect(testid('recovery-restore')).not.toBeNull()
    expect(testid('recovery-discard')).not.toBeNull()
    expect(testid('recovery-defer')).toBeNull()
  })

  it('invalid 行：无法读取的副本——仅放弃（foreign-version 同形）', () => {
    mountBar(state({ slotKind: 'invalid', file: { ...FILE, writtenAt: '', actionCount: 0, draftPresent: false } }))
    expect(barText()).toContain('无法读取的副本')
    expect(testid('recovery-restore')).toBeNull()
    expect(testid('recovery-discard')).not.toBeNull()
  })

  it('死文件夹行：原文件夹已删除——恢复不呈现+放弃+稍后处理；busy=按钮全禁用', () => {
    mountBar(state({ deadFolder: true }))
    expect(barText()).toContain('原文件夹已删除，副本无法恢复')
    expect(testid('recovery-restore')).toBeNull()
    expect(testid('recovery-discard')).not.toBeNull()
    expect(testid('recovery-defer')).not.toBeNull()
    act(() => {
      root?.render(
        <RecoveryBar state={state({ deadFolder: true, busy: true })} onRestore={vi.fn()} onDiscard={vi.fn()} onDefer={vi.fn()} onReopen={vi.fn()} />
      )
    })
    expect((testid('recovery-discard') as HTMLButtonElement).disabled).toBe(true)
    expect((testid('recovery-defer') as HTMLButtonElement).disabled).toBe(true)
  })

  it('open 态 chip：待处理（可重开）+不可用（degraded）；无 chip=零渲染', () => {
    mountBar(state({ phase: 'open', file: null, slotKind: null }))
    expect(testid('recovery-chips')).toBeNull()
    act(() => {
      root?.render(
        <RecoveryBar
          state={state({ phase: 'open', file: null, slotKind: null, pendingChip: true, degraded: true })}
          onRestore={vi.fn()}
          onDiscard={vi.fn()}
          onDefer={vi.fn()}
          onReopen={vi.fn()}
        />
      )
    })
    const chips = testid('recovery-chips')?.textContent ?? ''
    expect(chips).toContain('恢复副本待处理，当前编辑未受保护')
    expect(chips).toContain('恢复副本不可用，当前编辑未受保护')
    expect(testid('recovery-reopen')).not.toBeNull()
  })
})
