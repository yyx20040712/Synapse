/**
 * P7E-04 ipc/export_.clipboard 单测（always-active——三屋新测试不经 guardedDescribe）。
 * 覆盖态空间：E1/E2 委托逐参+count 回传、E3 schema 层空选集拒（零 service 调用）、
 * E5 先构建后写（service 抛错→剪贴板零调用）、E6 写失败上抛、E7 无对话框
 * （saveFile 零调用——与文件导出 exportTo 的语义差异锚）、E8 多篇 ids 直通
 * （顺序保持=buildBibtex 既有语义，handler 零加工）。deps 桩零 electron。
 */
import { describe, expect, it, vi } from 'vitest'
import { createExportIpc } from '../../../src/main/ipc/export_'
import { makeChannelHandler } from '../../../src/main/ipc/register'
import { clipboardReqSchema } from '../../../src/shared/ipc/schemas'
import { makeIpcDeps } from '../../utils/ipc-deps'

function makeExportService() {
  return {
    buildBibtex: vi.fn(async () => '@misc{zhang_smart,\n  title = {T}\n}'),
    buildCsv: vi.fn(async () => '\uFEFFTitle,Authors\n'),
    buildReport: vi.fn(async () => '# 报告'),
    writeToFile: vi.fn(async () => undefined)
  }
}

/** 组装 deps：clipboard 写口桩（零 electron）+dialogs.saveFile 间谍（E7 无对话框锚） */
function makeDeps(
  exportService: ReturnType<typeof makeExportService>,
  clipboard: { writeText: (text: string) => Promise<void> }
) {
  const saveFile = vi.fn(async () => 'E:/out/x')
  const deps = {
    ...makeIpcDeps({
      services: { export_: exportService as never },
      dialogs: { saveFile }
    }),
    clipboard
  }
  return { deps, saveFile }
}

describe('ipc/export_.clipboard —— 先构建后写剪贴板（无对话框即无 CANCELLED）', () => {
  it('bibtex 分支：委托 buildBibtex 逐参+写剪贴板收构建内容+count 回传+零对话框', async () => {
    const exportService = makeExportService()
    const clipboard = { writeText: vi.fn(async () => undefined) }
    const { deps } = makeDeps(exportService, clipboard)
    const ipc = createExportIpc(deps)
    const r = await ipc.clipboard({ format: 'bibtex', paperIds: ['p-1', 'p-2'] })
    expect(exportService.buildBibtex).toHaveBeenCalledWith(['p-1', 'p-2'])
    expect(exportService.buildCsv).not.toHaveBeenCalled()
    expect(clipboard.writeText).toHaveBeenCalledWith('@misc{zhang_smart,\n  title = {T}\n}')
    expect(r).toEqual({ count: 2 })
  })

  it('csv 分支：委托 buildCsv（buildBibtex 零调用），count=1', async () => {
    const exportService = makeExportService()
    const clipboard = { writeText: vi.fn(async () => undefined) }
    const { deps } = makeDeps(exportService, clipboard)
    const ipc = createExportIpc(deps)
    const r = await ipc.clipboard({ format: 'csv', paperIds: ['p-1'] })
    expect(exportService.buildCsv).toHaveBeenCalledWith(['p-1'])
    expect(exportService.buildBibtex).not.toHaveBeenCalled()
    expect(clipboard.writeText).toHaveBeenCalledWith('\uFEFFTitle,Authors\n')
    expect(r).toEqual({ count: 1 })
  })

  it('E5 先构建后写：service 抛错上抛且剪贴板零调用（零副作用）', async () => {
    const exportService = makeExportService()
    exportService.buildBibtex.mockRejectedValue(new Error('db 取数失败'))
    const clipboard = { writeText: vi.fn(async () => undefined) }
    const { deps } = makeDeps(exportService, clipboard)
    const ipc = createExportIpc(deps)
    await expect(ipc.clipboard({ format: 'bibtex', paperIds: ['p-1'] })).rejects.toThrow('db 取数失败')
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })

  it('E6 写失败上抛：clipboard.writeText 抛错时 handler rejects（register 层折叠既有面）', async () => {
    const exportService = makeExportService()
    const clipboard = { writeText: vi.fn(() => { throw new Error('clipboard locked') }) }
    const { deps } = makeDeps(exportService, clipboard)
    const ipc = createExportIpc(deps)
    await expect(ipc.clipboard({ format: 'csv', paperIds: ['p-1'] })).rejects.toThrow('clipboard locked')
  })

  it('E7 无对话框：剪贴板路径全程零 saveFile 调用（与文件导出语义差异）', async () => {
    const exportService = makeExportService()
    const clipboard = { writeText: vi.fn(async () => undefined) }
    const { deps, saveFile } = makeDeps(exportService, clipboard)
    const ipc = createExportIpc(deps)
    await ipc.clipboard({ format: 'bibtex', paperIds: ['p-1'] })
    expect(saveFile).not.toHaveBeenCalled()
  })

  it('E3 schema 层空选集拒：paperIds=[] → INVALID_REQUEST（零 service 调用）', async () => {
    const exportService = makeExportService()
    const clipboard = { writeText: vi.fn(async () => undefined) }
    const { deps } = makeDeps(exportService, clipboard)
    const ipc = createExportIpc(deps)
    const handler = makeChannelHandler(
      clipboardReqSchema,
      ipc.clipboard as unknown as (req: unknown) => Promise<unknown>
    )
    const r = (await handler({ format: 'bibtex', paperIds: [] })) as {
      ok: boolean
      error: { code: string }
    }
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('INVALID_REQUEST')
    expect(exportService.buildBibtex).not.toHaveBeenCalled()
  })
})
