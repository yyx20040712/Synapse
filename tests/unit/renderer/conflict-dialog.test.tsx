// @vitest-environment jsdom
/**
 * [F-VISFB-65 单元二] ConflictDialog —— 自绘 alertdialog 呈现面（§7：role/
 * 文案/焦点圈禁/禁 Esc——不收态+阻断外层退出链）。createRoot/act 直渲染=
 * repo 组件测试惯例。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ConflictDialog } from '../../../src/renderer/features/lineage/ConflictDialog'
import {
  getConflictState,
  requestGhostFolderDecision,
  resetConflictResolution,
  resolveGhostFolderDecision
} from '../../../src/renderer/features/lineage/conflictResolution'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

function mountDialog(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<ConflictDialog />)
  })
}

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  resetConflictResolution()
  host?.remove()
  root = null
  host = null
})

const dialog = (): HTMLElement | null => document.querySelector('[data-testid="conflict-dialog"]')

describe('F-VISFB-65 单元二 ConflictDialog —— alertdialog 纪律', () => {
  it('无待决渲染 null；待决呈现 role=alertdialog+标题「原文件夹已删除」+两钮文案；决出即收', async () => {
    mountDialog()
    expect(dialog()).toBeNull()
    let decided: string | null = null
    const p = requestGhostFolderDecision('f-doom')
    p.then((c) => {
      decided = c
    })
    await act(async () => {
      await settle()
    })
    expect(dialog()).not.toBeNull()
    expect(dialog()!.getAttribute('role')).toBe('alertdialog')
    expect(dialog()!.textContent).toContain('原文件夹已删除')
    expect(document.querySelector('[data-testid="conflict-remap"]')!.textContent).toBe('保存到主图')
    expect(document.querySelector('[data-testid="conflict-discard"]')!.textContent).toBe('放弃这条修改')
    // 初始焦点=首钮（alertdialog 焦点纪律）
    expect(document.activeElement?.getAttribute('data-testid')).toBe('conflict-remap')
    act(() => {
      ;(document.querySelector('[data-testid="conflict-discard"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      await settle()
    })
    expect(decided).toBe('discard')
    expect(dialog()).toBeNull() // 决出即收
  })

  it('Esc 不关闭（不收态+阻断外层退出链）；Tab 圈禁在按钮组内环绕', async () => {
    mountDialog()
    const p = requestGhostFolderDecision('f-doom')
    await act(async () => {
      await settle()
    })
    const dlg = dialog()!
    // Esc：不收态+外层 keydown 记录器零命中（stopPropagation——外层退出链同阻）
    let outerEsc = 0
    const rec = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') outerEsc += 1
    }
    document.addEventListener('keydown', rec)
    dlg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.removeEventListener('keydown', rec)
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' })
    expect(outerEsc).toBe(0)
    // Tab：首钮→次钮→环绕回首钮；Shift+Tab 反向
    const remapBtn = document.querySelector('[data-testid="conflict-remap"]') as HTMLButtonElement
    const discardBtn = document.querySelector('[data-testid="conflict-discard"]') as HTMLButtonElement
    remapBtn.focus()
    remapBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(discardBtn)
    discardBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(remapBtn) // 环绕
    remapBtn.focus()
    remapBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(discardBtn) // Shift 反向
    act(() => {
      resolveGhostFolderDecision('remap-main-graph')
    })
    await p
  })

  it('W4 点遮罩后 Tab 不逃逸（capture 圈禁+遮罩不夺焦）；dialog 外目标的 Tab/Esc 也被截停', async () => {
    mountDialog()
    const p = requestGhostFolderDecision('f-doom')
    await act(async () => {
      await settle()
    })
    const remapBtn = document.querySelector('[data-testid="conflict-remap"]') as HTMLButtonElement
    const discardBtn = document.querySelector('[data-testid="conflict-discard"]') as HTMLButtonElement
    remapBtn.focus()
    // 点遮罩（mousedown preventDefault——焦点不被夺走）
    const overlay = document.querySelector('[data-testid="conflict-overlay"]') as HTMLElement
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(document.activeElement).toBe(remapBtn)
    // 点遮罩后 Tab：仍在按钮组内环绕（不逃逸到 body/外元素）
    remapBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(discardBtn)
    // dialog 外目标（body 直发）的 Tab/Esc 在 capture 层截停——焦点不外泄
    let outerTab = 0
    let outerEsc = 0
    const rec = (ev: KeyboardEvent): void => {
      if (ev.key === 'Tab') outerTab += 1
      if (ev.key === 'Escape') outerEsc += 1
    }
    document.body.addEventListener('keydown', rec) // 非 capture——到达即逃逸证据
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.body.removeEventListener('keydown', rec)
    expect(outerTab).toBe(0)
    expect(outerEsc).toBe(0)
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' }) // 未决保持
    act(() => {
      resolveGhostFolderDecision('discard')
    })
    await p
  })

  it('遮罩无点击通道（点遮罩不决出）', async () => {
    mountDialog()
    const p = requestGhostFolderDecision('f-doom')
    await act(async () => {
      await settle()
    })
    const overlay = document.querySelector('[data-testid="conflict-overlay"]') as HTMLElement
    overlay.click()
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' }) // 不可遮罩关
    act(() => {
      resolveGhostFolderDecision('discard')
    })
    await p
  })
})
