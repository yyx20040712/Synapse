import { expect, it, vi } from 'vitest'
import { createExportIpc } from '../../../src/main/ipc/export_'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

/**
 * [B3] ipc export/citation —— 引用预览通道（单篇×三格式；文本回传 renderer
 * 展示——与 clipboard 通道「内容不过 renderer」的差异见 api-surface 注记）。
 * 委托 service、零剪贴板副作用（沿 export_.test clipboard 用例形态）。
 */
function makeExportService() {
  return {
    buildBibtex: vi.fn(async () => '@article{x,\n  title = {T}\n}'),
    buildCsv: vi.fn(async () => '\uFEFFcsv'),
    buildReport: vi.fn(async () => '# r'),
    buildCorpus: vi.fn(async () => '# c'),
    buildCitation: vi.fn(async (paperId: string, format: string) => `cit:${format}:${paperId}`),
    writeToFile: vi.fn(async () => undefined)
  }
}

guardedDescribe('SR-IPC-07', 'ipc/export_.citation —— 引用预览（B3）', () => {
  it('委托 service.buildCitation 返回 {text}；三格式透传', async () => {
    const svc = makeExportService()
    const clipboardWrite = vi.fn(async () => undefined)
    const ipc = createExportIpc({
      ...makeIpcDeps({
        services: { export_: svc as never },
        dialogs: { saveFile: async () => 'E:/out.bib' }
      }),
      clipboard: { writeText: clipboardWrite }
    })
    for (const format of ['gbt7714', 'apa', 'bibtex'] as const) {
      const r = await ipc.citation({ format, paperId: 'p-1' })
      expect(r).toEqual({ text: `cit:${format}:p-1` })
      expect(svc.buildCitation).toHaveBeenCalledWith('p-1', format)
    }
    // 零剪贴板副作用（预览通道不写系统剪贴板——复制动作在 renderer 侧）
    expect(clipboardWrite).not.toHaveBeenCalled()
  })

  it('未知 paperId：service 错误透传（NOT_FOUND 形状）', async () => {
    const svc = makeExportService()
    svc.buildCitation = vi.fn(async () => {
      throw Object.assign(new Error('文献不存在：ghost'), { code: 'NOT_FOUND' })
    })
    const ipc = createExportIpc(
      makeIpcDeps({ services: { export_: svc as never }, dialogs: { saveFile: async () => null } })
    )
    await expect(ipc.citation({ format: 'apa', paperId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })
})
