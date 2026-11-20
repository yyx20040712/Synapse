// @vitest-environment jsdom
/**
 * [前端四期 B2] 设置页五类归并 —— 五类导航渲染与切换（aria-current/
 * aria-pressed 语义）、分类互斥只显示当前分类、模块级分类会话态（卸载重挂
 * 恢复选中、新会话默认通用——DrCitation preferredFormat 模块态范式）、主题
 * 预览卡选中态与保存载荷、「阅读与标注」空态说明文本、水合/草稿保护回归。
 * mock 配方沿 settings-page-enter.test（SettingsPage 挂载段）。
 *
 * 注意：分类选中=模块级会话态，跨用例存续——「新会话默认通用」用例须保持
 * 首例位（dr-citation.test 同纪律）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  settings: { get: vi.fn(), set: vi.fn() }
})

import { SettingsPage } from '../../../src/renderer/features/settings/SettingsPage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  stubApi.settings.get.mockReset()
  stubApi.settings.set.mockReset()
  toastSpy.mockClear()
  stubApi.settings.get.mockResolvedValue({
    ok: true,
    data: { contactEmail: 'old@example.com', theme: 'light', uiScale: 'small' }
  })
  stubApi.settings.set.mockResolvedValue({ ok: true, data: { ok: true } })
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

async function renderPage(): Promise<void> {
  await act(async () => {
    root?.render(<SettingsPage />)
  })
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function navButtons(): HTMLButtonElement[] {
  return [...(host?.querySelectorAll('.settings-nav nav button, nav.settings-nav button') ?? [])] as HTMLButtonElement[]
}

function pickNav(label: string): void {
  const btn = navButtons().find((b) => b.textContent === label)
  if (btn === undefined) throw new Error(`导航项「${label}」不在场`)
  act(() => {
    btn.click()
  })
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '').replace('⟳', '') === label
  )
}

function textOf(host2: HTMLElement | null): string {
  return (host2?.textContent ?? '').replace(/\s+/g, ' ')
}

describe('前端四期 B2 设置页五类归并', () => {
  it('新会话默认「通用」：五类导航逐字渲染+aria-current 单选；仅通用内容在场（须保持首例——模块态跨用例存续）', async () => {
    await renderPage()
    const labels = navButtons().map((b) => b.textContent)
    expect(labels, '五类导航顺序与名称逐字（v2 nav）').toEqual([
      '通用',
      '外观',
      '阅读与标注',
      'AI 助手',
      '数据与网络'
    ])
    const current = navButtons().map((b) => b.getAttribute('aria-current'))
    expect(current, 'aria-current 单选（通用唯一 true）').toEqual([
      'true',
      null,
      null,
      null,
      null
    ])
    expect(host?.querySelector('input[aria-label="联系邮箱"]'), '通用：联系邮箱在场').not.toBeNull()
    expect(textOf(host).includes('AI 管理'), '分类互斥：AI 管理不在场').toBe(false)
  })

  it('点「AI 助手」：aria-current 移动；AI 管理/AI 预算/AI 语料导出节标在场；联系邮箱不在场（分类互斥）', async () => {
    await renderPage()
    pickNav('AI 助手')
    const current = navButtons().map((b) => b.getAttribute('aria-current'))
    expect(current).toEqual([null, null, null, 'true', null])
    const headings = [...(host?.querySelectorAll('h3') ?? [])].map((h) => h.textContent)
    for (const title of ['AI 助手', 'AI 管理', 'AI 预算', 'AI 语料导出']) {
      expect(headings, `「${title}」节标在场`).toContain(title)
    }
    expect(host?.querySelector('input[aria-label="联系邮箱"]'), '通用内容已切走').toBeNull()
  })

  it('点「数据与网络」：网络诊断按钮+同步密钥节标在场；AI 管理不在场', async () => {
    await renderPage()
    pickNav('数据与网络')
    expect(findButton('网络诊断'), '网络诊断按钮在场').toBeDefined()
    const headings = [...(host?.querySelectorAll('h3') ?? [])].map((h) => h.textContent)
    expect(headings, '同步密钥节标在场').toContain('同步密钥')
    expect(textOf(host).includes('AI 管理'), '分类互斥：AI 管理不在场').toBe(false)
  })

  it('模块级分类会话态：选「外观」卸载重挂仍在外观（界面缩放在场）', async () => {
    await renderPage()
    pickNav('外观')
    expect(host?.querySelector('[aria-label="界面缩放档位"]'), '外观：界面缩放档位在场').not.toBeNull()
    // 卸载（重挂=新 host+新 root——卸载重挂用例范式，v236 模块级会话态）
    await act(async () => {
      root?.unmount()
    })
    host?.remove()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await renderPage()
    const current = navButtons().map((b) => b.getAttribute('aria-current'))
    expect(current, '卸载重挂恢复会话选中（外观）').toEqual([null, 'true', null, null, null])
    expect(host?.querySelector('[aria-label="界面缩放档位"]'), '重挂后外观内容在场').not.toBeNull()
  })

  it('主题预览卡：两卡 aria-pressed 选中态+文案；点护眼卡保存→载荷 theme=sepia 全量携带', async () => {
    await renderPage()
    pickNav('外观')
    const cards = [...(host?.querySelectorAll('[aria-pressed]') ?? [])].filter((el) =>
      el.textContent?.includes('模式')
    ) as HTMLButtonElement[]
    expect(cards, '主题预览卡恰两张').toHaveLength(2)
    expect(cards[0]?.getAttribute('aria-pressed'), '默认 light 选中').toBe('true')
    expect(cards[1]?.getAttribute('aria-pressed'), 'sepia 未选中').toBe('false')
    expect(cards[0]?.textContent, 'light 卡文案（THEME_LABEL 单源）').toContain('正常模式')
    expect(cards[0]?.textContent).toContain('清亮中性色')
    expect(cards[1]?.textContent).toContain('护眼模式')
    expect(cards[1]?.textContent).toContain('牛皮纸暖米色')

    act(() => {
      cards[1]!.click()
    })
    expect(cards[0]?.getAttribute('aria-pressed'), '点卡后选中态翻转').toBe('false')
    expect(cards[1]?.getAttribute('aria-pressed')).toBe('true')
    const save = findButton('保存设置')
    if (save === undefined) throw new Error('外观分类保存按钮不在场')
    await act(async () => {
      save.click()
    })
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(stubApi.settings.set).toHaveBeenCalledTimes(1)
    const req = stubApi.settings.set.mock.calls[0]![0] as {
      contactEmail: string
      theme: string
      uiScale: string
    }
    expect(req.theme, '保存载荷携带所选主题').toBe('sepia')
    expect(req.contactEmail, '全量载荷：邮箱随行').toBe('old@example.com')
    expect(req.uiScale, '全量载荷：档位兜底随行').toBe('small')
  })

  it('「阅读与标注」空态：如实文案（自动随文献保存，无可配置项），无输入控件', async () => {
    await renderPage()
    pickNav('阅读与标注')
    expect(textOf(host)).toContain('阅读进度与标注自动随文献保存')
    expect(textOf(host)).toContain('当前无可配置项')
    expect(host?.querySelector('input, select, textarea'), '不新增任何设置字段').toBeNull()
  })

  it('草稿保护回归：改邮箱→点缩放档（store 替换）→邮箱草稿保持（hydratedRef 一次水合）', async () => {
    await renderPage()
    pickNav('外观')
    const scale = findButton('中 110%')
    if (scale === undefined) throw new Error('界面缩放档位钮不在场')
    pickNav('通用')
    const email = host?.querySelector('input[aria-label="联系邮箱"]') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(email, 'draft@example.com')
      email.dispatchEvent(new Event('input', { bubbles: true }))
    })
    pickNav('外观')
    await act(async () => {
      scale.click()
    })
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    pickNav('通用')
    const emailAfter = host?.querySelector('input[aria-label="联系邮箱"]') as HTMLInputElement
    expect(emailAfter.value, 'store 替换后草稿不被回填抹除').toBe('draft@example.com')
  })
})
