import { expect, it, vi } from 'vitest'
import { createExportIpc } from '../../../src/main/ipc/export_'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

function makeExportService() {
  return {
    buildBibtex: vi.fn(async () => '@article{x,\n  title = {T}\n}'),
    buildCsv: vi.fn(async () => '\uFEFFcsv'),
    buildReport: vi.fn(async () => '# 智慧水务：综述\n内容'),
    writeToFile: vi.fn(async () => undefined)
  }
}

const detail = {
  id: 'p-1',
  title: '智慧水务：综述/展望',
  authors: [],
  year: null,
  venue: '',
  doi: null,
  tagNames: [],
  collectionNames: [],
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: 't',
  abstract: '',
  arxivId: null,
  source: 'local' as const,
  enrichStatus: 'pending' as const,
  fileUrl: '',
  fileName: '',
  updatedAt: '',
  tags: [],
  collections: []
}

guardedDescribe('SR-IPC-07', 'ipc/export_ —— 构建内容→对话框→写文件', () => {
  it('bibtex：确认保存 → 写文件并返回 {filePath,count}', async () => {
    const exportService = makeExportService()
    const ipc = createExportIpc(
      makeIpcDeps({
        services: { export_: exportService as never },
        dialogs: { saveFile: async () => 'E:/out/synapse-export.bib' }
      })
    )
    const r = await ipc.bibtex({ paperIds: ['p-1', 'p-2'] })
    expect(r).toEqual({ filePath: 'E:/out/synapse-export.bib', count: 2 })
    expect(exportService.writeToFile).toHaveBeenCalledWith(
      'E:/out/synapse-export.bib',
      '@article{x,\n  title = {T}\n}'
    )
  })

  it('取消保存抛 code=CANCELLED（不写文件）', async () => {
    const exportService = makeExportService()
    const ipc = createExportIpc(
      makeIpcDeps({
        services: { export_: exportService as never },
        dialogs: { saveFile: async () => null }
      })
    )
    await expect(ipc.bibtex({ paperIds: ['p-1'] })).rejects.toMatchObject({ code: 'CANCELLED' })
    expect(exportService.writeToFile).not.toHaveBeenCalled()
  })

  it('report：文件名取论文标题并安全化（非法字符→下划线），count=1', async () => {
    const exportService = makeExportService()
    const savedNames: string[] = []
    const ipc = createExportIpc(
      makeIpcDeps({
        services: {
          export_: exportService as never,
          library: { detail: vi.fn(async () => detail) } as never
        },
        dialogs: {
          saveFile: async (name) => {
            savedNames.push(name)
            return `E:/out/${name}`
          }
        }
      })
    )
    const r = await ipc.report({ paperId: 'p-1' })
    expect(savedNames[0]).toBe('智慧水务_综述_展望.md')
    expect(r.count).toBe(1)
  })

  it('csv：默认名 .csv 扩展', async () => {
    const exportService = makeExportService()
    const savedNames: string[] = []
    const ipc = createExportIpc(
      makeIpcDeps({
        services: { export_: exportService as never },
        dialogs: {
          saveFile: async (name) => {
            savedNames.push(name)
            return `E:/out/${name}`
          }
        }
      })
    )
    await ipc.csv({ paperIds: ['p-1'] })
    expect(savedNames[0]).toMatch(/\.csv$/)
  })
})
