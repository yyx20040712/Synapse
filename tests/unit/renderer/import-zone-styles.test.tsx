// @vitest-environment jsdom
/**
 * [小挂账第 7/8 条] 空态导入区样式统一锁定测试（always-active）——
 * import-dropzone.test.tsx 姊妹件（受锁既有件零改动先例族）。
 *
 * 锁行为面（v90 §3 第 7 条+v91 §3 第 8 条，零交互语义变更）：
 * - 第 7 条 ImportTargetSelect「导入到」下拉：补边框+下拉箭头+按钮族视觉
 *   （appearance:none+内联 SVG 箭头+panel 底/border 描边——与同区 syn-btn
 *   按钮族一致；两分支（无 folder 单选项/有 folder 双选项）同皮肤）；
 * - 第 8 条 ImportDropZone 空态「导入 PDF 文件」按钮：改「导入文件夹」同款
 *   描边风格（primary→secondary）+字号/按钮高度各降一档（md→sm=text-xs
 *   档）——两钮同排同款（风格统一用户诉求）。
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
import { ImportTargetSelect } from '../../../src/renderer/features/library/ImportTargetSelect'

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

const FOLDER = { id: 'f-1', name: '水质模型', position: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.import_.fromDialog.mockReset()
  stubApi.import_.fromFolder.mockReset()
  stubApi.folders.list.mockReset()
  stubApi.papers.moveFolder.mockReset()
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [FOLDER] })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('第 7 条 ImportTargetSelect「导入到」——边框+箭头+按钮族视觉', () => {
  it('无 folder 分支（单选项）：appearance none+内联 SVG 箭头+panel 底/border 描边', () => {
    mount(<ImportTargetSelect value="" folderId={null} folderName={undefined} onChange={() => undefined} />)
    const select = document.querySelector('select[aria-label="导入到"]') as HTMLSelectElement | null
    expect(select, '下拉在场').not.toBeNull()
    expect(select!.style.appearance, '原生箭头关闭（自绘箭头接管）').toBe('none')
    const wrap = select!.parentElement
    expect(wrap?.classList.contains('relative'), '箭头锚容器 relative（绝对定位箭头）').toBe(true)
    const arrow = wrap?.querySelector('svg[aria-hidden="true"]')
    expect(arrow, '内联 SVG 下拉箭头在场（仓内 SVG 先例形态）').not.toBeNull()
    expect(select!.style.borderColor, '描边=按钮族 border token').toBe('var(--border)')
    expect(select!.style.background, '底色=按钮族 panel token').toBe('var(--panel)')
  })

  it('有 folder 分支（双选项）：同款皮肤（箭头+appearance none）——两分支视觉一致', () => {
    mount(
      <ImportTargetSelect value="" folderId="f-1" folderName="水质模型" onChange={() => undefined} />
    )
    const select = document.querySelector('select[aria-label="导入到"]') as HTMLSelectElement | null
    expect(select!.style.appearance).toBe('none')
    expect(select!.parentElement?.querySelector('svg[aria-hidden="true"]'), '双选项分支箭头同在').not.toBeNull()
  })
})

describe('第 8 条 ImportDropZone 空态导入按钮——描边风格+字号/高度降一档', () => {
  it('「导入 PDF 文件」改 secondary 描边（同「导入文件夹」款）+sm 档（text-xs 字号/矮一档高度）', () => {
    mount(<ImportDropZone onImported={() => undefined} />)
    const pdf = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === '导入 PDF 文件'
    )
    const folder = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === '导入文件夹'
    )
    expect(pdf, 'PDF 按钮在场').not.toBeUndefined()
    expect(pdf!.className, 'PDF=secondary 描边款（原 primary 退役）').toContain('syn-btn-secondary')
    expect(pdf!.className, '字号降一档=text-xs（sm 档）').toContain('text-xs')
    expect(pdf!.className, '高度降一档=py-0.5（sm 档）').toContain('py-0.5')
    expect(pdf!.className).not.toContain('syn-btn-primary')
    expect(folder?.className, '同排「导入文件夹」同款 sm 档（风格统一）').toContain('text-xs')
    expect(folder?.className).toContain('py-0.5')
    expect(folder?.className).toContain('syn-btn-secondary')
  })
})
