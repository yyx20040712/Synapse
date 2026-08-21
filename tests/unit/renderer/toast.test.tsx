// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { guardedDescribe } from '../../utils/guard'

/** 挂 ToastHost 并返回宿主节点（模块级队列随 resetModules 隔离） */
async function mountHost(): Promise<HTMLElement> {
  vi.resetModules()
  const { ToastHost } = await import('../../../src/renderer/shared/ui/Toast')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(<ToastHost />)
  })
  return host
}

function cardCount(host: HTMLElement): number {
  return host.querySelectorAll('[role="status"],[role="alert"]').length
}

guardedDescribe('SR-UI-03', 'Toast —— 去重语义（message+kind）', () => {
  it('同文案同 kind 窗口内去重：连弹两次只出一张卡', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('保存失败', 'error')
      showToast('保存失败', 'error')
    })
    expect(cardCount(host)).toBe(1)
  })

  it('A→B→A 穿插序列：第二条 A 仍被拦截（单槽记忆的漏洞）', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('A 文案', 'error')
      showToast('B 文案', 'error')
      showToast('A 文案', 'error')
    })
    expect(cardCount(host)).toBe(2) // A + B；第二条 A 被窗口内去重
  })

  it('同文案不同 kind 不互吞：info 与 error 各自展示', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('同一句话', 'info')
      showToast('同一句话', 'error')
    })
    expect(cardCount(host)).toBe(2)
  })
})
