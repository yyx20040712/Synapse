// @vitest-environment jsdom
/**
 * [B1 批] 阅读器双侧栏开合收口 ReaderToolbar 锁定测试（always-active）。
 *
 * 旧件 outline-aside-collapse-icon.test.tsx（收起钮图标化）随 OutlineAside
 * 收起钮+浮动展开 chevron 退役整件改写：左右栏开合唯一入口=toolbar 两端
 * 开关钮（aria-pressed 反映开合态；toggle 语义在装配面——本组件纯受控只
 * 上抛）。覆盖：两钮在场（aria-label 字面=v2 设计稿）+aria-pressed 双态+
 * 点击调 handler+图标（aria-hidden svg）在场。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ reader: {}, notes: { get: vi.fn(), save: vi.fn() } })
void stubApi

import { ReaderToolbar } from '../../../src/renderer/features/reader/view/ReaderToolbar'

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

/** 直植 props 夹具（reader-toolbar-icons.test 同口径） */
function toolbarProps(over: Partial<Parameters<typeof ReaderToolbar>[0]>): Parameters<typeof ReaderToolbar>[0] {
  return {
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    onNavigate: () => undefined,
    onZoom: () => undefined,
    onColor: () => undefined,
    ...over
  }
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

describe('B1 阅读器双侧栏开合 —— ReaderToolbar 两端开关（无障碍不回退）', () => {
  it('目录侧栏开关：aria-label「展开或收起目录侧栏」+aria-pressed 双态+图标在场+点击上抛', () => {
    const onToggleOutline = vi.fn()
    mount(
      <ReaderToolbar
        {...toolbarProps({ outlineOpen: true, onToggleOutline })}
      />
    )
    const btn = host!.querySelector('button[aria-label="展开或收起目录侧栏"]') as HTMLButtonElement | null
    expect(btn, '目录侧栏开关钮在场（工具栏左端）').not.toBeNull()
    expect(btn!.getAttribute('aria-pressed'), '开合态经 aria-pressed 透出（开）').toBe('true')
    expect(btn!.querySelector('svg[aria-hidden="true"]'), '图标（inline SVG 先例形态）在场').not.toBeNull()
    act(() => {
      btn!.click()
    })
    expect(onToggleOutline, '点击上抛（toggle 语义在装配面）').toHaveBeenCalledTimes(1)
    // 收起态：aria-pressed=false（重挂受控面）
    mount(
      <ReaderToolbar
        {...toolbarProps({ outlineOpen: false, onToggleOutline })}
      />
    )
    const btnClosed = host!.querySelector('button[aria-label="展开或收起目录侧栏"]') as HTMLButtonElement | null
    expect(btnClosed!.getAttribute('aria-pressed')).toBe('false')
  })

  it('研究面板开关：aria-label「展开或收起研究面板」（v2 设计稿字面）+aria-pressed 双态+图标在场+点击上抛', () => {
    const onToggleResearch = vi.fn()
    mount(
      <ReaderToolbar
        {...toolbarProps({ researchOpen: false, onToggleResearch })}
      />
    )
    const btn = host!.querySelector('button[aria-label="展开或收起研究面板"]') as HTMLButtonElement | null
    expect(btn, '研究面板开关钮在场（搜索槽之后右端）').not.toBeNull()
    expect(btn!.getAttribute('aria-pressed'), '开合态经 aria-pressed 透出（收）').toBe('false')
    expect(btn!.querySelector('svg[aria-hidden="true"]'), '图标（inline SVG 先例形态）在场').not.toBeNull()
    act(() => {
      btn!.click()
    })
    expect(onToggleResearch, '点击上抛（toggle 语义在装配面）').toHaveBeenCalledTimes(1)
    mount(
      <ReaderToolbar
        {...toolbarProps({ researchOpen: true, onToggleResearch })}
      />
    )
    const btnOpen = host!.querySelector('button[aria-label="展开或收起研究面板"]') as HTMLButtonElement | null
    expect(btnOpen!.getAttribute('aria-pressed')).toBe('true')
  })
})
