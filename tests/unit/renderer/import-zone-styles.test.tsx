// @vitest-environment jsdom
/**
 * [小挂账第 7/8 条→F-UIRES-01 批 A U2 改制] 导入区样式锁定测试（always-active）。
 *
 * [F-UIRES-01] ImportTargetSelect 已随批退役（目标恒定语义——R2/R4；「仅入
 * 文献库」选项 2026-09-30 用户裁决退役）：第 7 条选择器视觉两用例随之退役
 * （豁免在档 scripts/test-surface.exemptions.json）；第 8 条按钮款随导入条
 * 新形态保活适调（「导入 PDF 文件」→「导入 PDF」——R4 文案），并补目标徽标
 * （.lib-import-target）结构面。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  import_: { fromDialog: vi.fn(), fromFolder: vi.fn() },
  folders: { list: vi.fn() },
  papers: { moveFolder: vi.fn() }
})
stubApiEvents({
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'

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

const FOLDERS = [
  { id: '__main__', name: '主图', position: 0, paperCount: 0 },
  { id: 'f-1', name: '水质模型', position: 1, paperCount: 0 }
]

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.import_.fromDialog.mockReset()
  stubApi.import_.fromFolder.mockReset()
  stubApi.folders.list.mockReset()
  stubApi.papers.moveFolder.mockReset()
  stubApi.folders.list.mockResolvedValue({ ok: true, data: FOLDERS })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('第 8 条 导入条按钮款（F-UIRES-01 适调）——描边风格+字号/高度降一档', () => {
  it('「导入 PDF」secondary 描边（同「导入文件夹」款）+sm 档（text-xs 字号/矮一档高度）', () => {
    mount(<ImportDropZone onImported={() => undefined} targetFolderId="__main__" />)
    const pdf = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === '导入 PDF'
    )
    const folder = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === '导入文件夹'
    )
    expect(pdf, 'PDF 按钮在场（R4 文案）').not.toBeUndefined()
    expect(pdf!.className, 'PDF=secondary 描边款（原 primary 退役）').toContain('syn-btn-secondary')
    expect(pdf!.className, '字号降一档=text-xs（sm 档）').toContain('text-xs')
    expect(pdf!.className, '高度降一档=py-0.5（sm 档）').toContain('py-0.5')
    expect(pdf!.className).not.toContain('syn-btn-primary')
    expect(folder?.className, '同排「导入文件夹」同款 sm 档（风格统一）').toContain('text-xs')
    expect(folder?.className).toContain('py-0.5')
    expect(folder?.className).toContain('syn-btn-secondary')
  })

  it('旧选择器退役负锚：导入条不再渲染 select[aria-label="导入到"]（ImportTargetSelect 删除）', () => {
    mount(<ImportDropZone onImported={() => undefined} targetFolderId="f-1" />)
    expect(document.querySelector('select[aria-label="导入到"]'), '选择器已退役').toBeNull()
  })

  it('目标徽标结构面：.lib-import-target 胶囊=「导入到：」+粗体名+文件夹 SVG 图标', async () => {
    mount(<ImportDropZone onImported={() => undefined} targetFolderId="f-1" />)
    // folders.list 名解析异步落定（首帧 '…' 是合法中间态——poll 至名解析）
    await act(async () => {
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve()
      }
    })
    const pill = document.querySelector('.lib-import-target') as HTMLElement | null
    expect(pill, '目标徽标在场').not.toBeNull()
    expect(pill!.textContent).toContain('导入到：')
    expect(pill!.querySelector('b')?.textContent).toBe('水质模型')
    expect(pill!.querySelector('svg[aria-hidden="true"]'), '文件夹图标在场').not.toBeNull()
  })
})
