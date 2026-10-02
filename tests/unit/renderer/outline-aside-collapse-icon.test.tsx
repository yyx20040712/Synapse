// @vitest-environment jsdom
/**
 * [小挂账第 9 条] 阅读器侧栏「收起」文字钮图标化锁定测试（always-active）——
 * outline-aside.test.tsx 姊妹件（受锁既有件零改动先例族）。
 *
 * 锁行为面（v94 §3 第 9 条，图 1 用户红框标注）：OutlineAside 头部「收起」
 * 文字按钮 → 图标按钮（仓内 inline SVG 先例形态=TAB_ICONS 24×24 单色描边）；
 * 无障碍不回退：aria-label+title 保「收起」语义（accessible name 不变）；
 * 点击行为零变（onCollapse 派发）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

/** OutlineAside 单件挂载零 api 消费面（ReaderNotesPanel 懒挂载——notes 态不触）
 * ——api mock 桩形沿 outline-aside.test.tsx（防后续挂载面扩需 stub 时漂移） */
const stubApi = makeApiStub({ notes: { get: vi.fn(), save: vi.fn() } })
void stubApi

import { OutlineAside } from '../../../src/renderer/features/reader/panels/OutlineAside'

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('第 9 条 OutlineAside「收起」图标化（无障碍不回退）', () => {
  it('收起钮=图标钮：aria-label/title 保「收起」+inline SVG 在场+无文字残留', () => {
    const onCollapse = vi.fn()
    mount(<OutlineAside pdfDoc={null} onCollapse={onCollapse} />)
    const btn = document.querySelector(
      '[data-testid="reader-aside"] > div > button:last-of-type'
    ) as HTMLButtonElement | null
    expect(btn, '头部收起钮在场').not.toBeNull()
    expect(btn!.getAttribute('aria-label'), 'accessible name 保持「收起」').toBe('收起')
    expect(btn!.getAttribute('title'), '悬停提示保持「收起」').toBe('收起')
    expect(btn!.querySelector('svg[aria-hidden="true"]'), '图标（inline SVG 先例形态）在场').not.toBeNull()
    expect(btn!.textContent?.trim(), '文字退役（图标承载）').toBe('')
    act(() => {
      btn!.click()
    })
    expect(onCollapse, '点击行为零变（onCollapse 派发）').toHaveBeenCalledTimes(1)
  })
})
