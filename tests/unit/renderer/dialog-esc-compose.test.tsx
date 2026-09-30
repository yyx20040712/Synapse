// @vitest-environment jsdom
/**
 * [F-FOLDER-02·T1] Dialog Esc 关闭的 IME 组词守卫（复审 P2-T1 搭车修——
 * AnnotationEditor.tsx:82-91 / TagLifecycle.tsx:90 同型先例池第 4 例）。
 *
 * 行为：document keydown Escape 且 e.isComposing=true → 不关对话框（组词期
 * Esc=取消候选词，非关闭意图）；isComposing=false → 照常 onClose。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Dialog } from '../../../src/renderer/shared/ui/Dialog'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let closeCalls = 0

beforeEach(() => {
  closeCalls = 0
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

/** 派发 document 级 keydown（Dialog 监听面）；isComposing 经 defineProperty 注入
 *  （jsdom 构造器 init 对该字段支持不稳定——同 AnnotationEditor 测试口径） */
function pressEscape(isComposing: boolean): void {
  const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  Object.defineProperty(ev, 'isComposing', { value: isComposing })
  document.dispatchEvent(ev)
}

describe('F-FOLDER-02·T1 Dialog Esc 的 IME 组词守卫', () => {
  it('组词中（isComposing=true）Esc 不关对话框——候选词取消不误伤弹窗', async () => {
    await act(async () => {
      root?.render(
        <Dialog open title="测试对话框" onClose={() => (closeCalls += 1)}>
          内容
        </Dialog>
      )
    })
    act(() => pressEscape(true))
    expect(closeCalls).toBe(0)
  })

  it('非组词 Esc 照常关闭（既有行为零变）', async () => {
    await act(async () => {
      root?.render(
        <Dialog open title="测试对话框" onClose={() => (closeCalls += 1)}>
          内容
        </Dialog>
      )
    })
    act(() => pressEscape(false))
    expect(closeCalls).toBe(1)
  })

  it('open=false 不挂监听（既有卸载语义零变）', async () => {
    await act(async () => {
      root?.render(
        <Dialog open={false} title="测试对话框" onClose={() => (closeCalls += 1)}>
          内容
        </Dialog>
      )
    })
    act(() => pressEscape(false))
    expect(closeCalls).toBe(0)
  })
})
