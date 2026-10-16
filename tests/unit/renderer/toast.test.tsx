// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/**
 * [F-E2EFLK-04] 在场折叠族（always-active——不经 guardedDescribe：核心队列
 * 语义锁非工单延期面）。fake timers 同时假化 Date（vitest 默认）——
 * advanceTimersByTime 同步驱动 1s 去重窗与 3.5s 停留计时两套时钟。
 * vi.resetModules() 不清 fake 计时器队列：beforeEach/afterEach
 * clearAllTimers 防前测残留回调跨模块态串扰。取卡 id 经 getToastItems
 * （toast-store 直出——与 × 按钮同源 dismiss）。
 * B6-B8=挂账 B6 候补销号（v203 §1-1，runId=20261016-b6fold）：error 6s fold 计时/窗内 fold 次序/fold 后窗拦。
 */
describe('SR-UI-03 Toast —— 在场折叠族（fold，INV-134）[F-E2EFLK-04]', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('B1 fold 基本形：出 1s 窗仍在场，再弹同文案同 kind 不叠卡', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('设置已保存', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(1500) // 出 1s 去重窗；3.5s 停留未满仍在场
    })
    act(() => {
      showToast('设置已保存', 'success')
    })
    expect(cardCount(host)).toBe(1) // 旧行为=窗口外重弹叠第二卡（2）
  })

  it('B2 fold 计时刷新：折叠重置全程停留计时（t=3000 折叠→6500 退场）', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('设置已保存', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    act(() => {
      showToast('设置已保存', 'success') // fold：停留计时重置为 3000+3500
    })
    act(() => {
      vi.advanceTimersByTime(3400) // t=6400：若不重置，首播 3500 已退场=0 卡
    })
    expect(cardCount(host)).toBe(1)
    act(() => {
      vi.advanceTimersByTime(200) // t=6600＞3000+3500=6500 折叠退场点
    })
    expect(cardCount(host)).toBe(0)
  })

  it('B3 慢速穿插 A→B→A 全在场：末次 A 折叠恒 2 卡（无折叠=3）', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('A 文案', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    act(() => {
      showToast('B 文案', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(1200) // t=2400：首 A 停留 3500 未满仍场
    })
    act(() => {
      showToast('A 文案', 'success') // A 在场→折叠（旧行为=3 卡）
    })
    expect(cardCount(host)).toBe(2)
  })

  it('B4 慢速异 kind 不折叠：error 与 success 同文案各占一卡', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('同一句话', 'error')
    })
    act(() => {
      vi.advanceTimersByTime(1200) // 出 1s 窗（异 kind 键本就互不相拦）
    })
    act(() => {
      showToast('同一句话', 'success')
    })
    expect(cardCount(host)).toBe(2)
  })

  it('B5 fold 后手动关闭再弹（>1s 窗）：新卡——用户已明确关闭后再弹=新卡', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    const { dismiss, getToastItems } = await import(
      '../../../src/renderer/shared/ui/toast-store'
    )
    act(() => {
      showToast('设置已保存', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    act(() => {
      showToast('设置已保存', 'success') // fold：恒单卡，recentShown 刷新至 t=1200
    })
    const card = getToastItems().find((it) => it.message === '设置已保存')
    expect(card).toBeDefined()
    act(() => {
      dismiss(card!.id) // 手动 × 语义（同源 dismiss）
    })
    act(() => {
      vi.advanceTimersByTime(1200) // t=2400：出 1s 窗——窗口不再拦截
    })
    act(() => {
      showToast('设置已保存', 'success')
    })
    expect(cardCount(host)).toBe(1) // 新卡（旧行为=折叠前已叠 2 卡关 1 剩 1+新弹）
  })

  it('B6 error kind fold 计时刷新：t=5000 折叠→9500 在场→11100 退场', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('删除失败', 'error')
    })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    act(() => {
      showToast('删除失败', 'error') // fold：清旧计时→退场点 5000+6000=11000
    })
    act(() => {
      vi.advanceTimersByTime(4500) // t=9500：无重置=首播 6000 已退场
    })
    expect(cardCount(host)).toBe(1)
    act(() => {
      vi.advanceTimersByTime(1600) // t=11100＞11000 折叠退场点（计时过长形态）
    })
    expect(cardCount(host)).toBe(0)
  })

  it('B7 窗内 fold 先于 1s 窗：t=600 窗内折叠→3900 在场（次序颠倒即红）', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    act(() => {
      showToast('已复制到剪贴板', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(600) // t=600：仍在 1s 去重窗内
    })
    act(() => {
      showToast('已复制到剪贴板', 'success') // 在场折叠先于窗：计时→600+3500=4100
    })
    act(() => {
      vi.advanceTimersByTime(3300) // t=3900：次序颠倒（窗先拦）=计时停 3500→已退场
    })
    expect(cardCount(host)).toBe(1)
    act(() => {
      vi.advanceTimersByTime(300) // t=4200＞4100 折叠退场点
    })
    expect(cardCount(host)).toBe(0)
  })

  it('B8 fold 后 1s 内 ×关再弹被窗拦：1800 重弹=0 卡、2400 出窗=1 卡', async () => {
    const host = await mountHost()
    const { showToast } = await import('../../../src/renderer/shared/ui/Toast')
    const { dismiss, getToastItems } = await import(
      '../../../src/renderer/shared/ui/toast-store'
    )
    act(() => {
      showToast('设置已保存', 'success')
    })
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    act(() => {
      showToast('设置已保存', 'success') // fold：recentShown 刷新至 t=1200
    })
    const card = getToastItems().find((it) => it.message === '设置已保存')
    expect(card).toBeDefined()
    act(() => {
      dismiss(card!.id) // 手动 × 语义（同源 dismiss）
    })
    act(() => {
      vi.advanceTimersByTime(600) // t=1800：距 fold 600＜1000 仍在 1s 窗内
    })
    act(() => {
      showToast('设置已保存', 'success') // 被窗拦
    })
    expect(cardCount(host)).toBe(0)
    act(() => {
      vi.advanceTimersByTime(600) // t=2400：距 fold 1200≥1000 出窗
    })
    act(() => {
      showToast('设置已保存', 'success') // 新卡（放行半面——与 B5 的 >1s 面独立双锁）
    })
    expect(cardCount(host)).toBe(1)
  })
})
