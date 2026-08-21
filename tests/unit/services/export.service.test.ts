import { expect, it } from 'vitest'
import { createExportService } from '../../../src/main/services/export_/export.service'
import type { Repos } from '../../../src/main/db/repos'
import type { PaperDetail } from '../../../src/shared/models/paper'
import { guardedDescribe } from '../../utils/guard'

const detail: PaperDetail = {
  id: 'p-1',
  title: 'Water Quality',
  authors: ['Wang'],
  year: 2024,
  venue: 'Water Research',
  doi: '10.1/x',
  tagNames: [],
  collectionNames: [],
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: 't',
  abstract: 'abs',
  arxivId: null,
  source: 'local',
  enrichStatus: 'pending',
  fileUrl: 'app-file://p-1',
  fileName: 'a.pdf',
  updatedAt: 't',
  tags: [],
  collections: []
}

function stubRepos(): Repos {
  return {
    papers: {
      listSummariesByIds: () => [],
      detailById: () => detail
    },
    annotations: {
      listByPaper: () => []
    },
    notes: { findByPaper: () => null }
  } as unknown as Repos
}

guardedDescribe('SR-SVC-06', 'export.service —— 取数拼装与写文件', () => {
  it('buildBibtex：含 @article 头与 citation key', async () => {
    const svc = createExportService({ repos: stubRepos() })
    const bib = await svc.buildBibtex(['p-1'])
    expect(bib).toContain('@article{wang2024water')
    expect(bib).toContain('title = {Water Quality}')
  })

  it('buildCsv：BOM + 表头 + 字段引号转义', async () => {
    const svc = createExportService({ repos: stubRepos() })
    const csv = await svc.buildCsv(['p-1'])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Title,Authors,Year,Venue,DOI,AddedAt')
    expect(csv).toContain('"Water Quality"')
  })

  it('buildReport：不存在抛 NOT_FOUND', async () => {
    const svc = createExportService({
      repos: { ...stubRepos(), papers: { ...stubRepos().papers, detailById: () => null } }
    })
    await expect(svc.buildReport('ghost')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('writeToFile：内容落盘 UTF-8；失败抛 IO_ERROR', async () => {
    const svc = createExportService({ repos: stubRepos() })
    const { mkdtemp, readFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = await mkdtemp(join(tmpdir(), 'exp-'))
    const target = join(dir, 'out.bib')
    await svc.writeToFile(target, '中文内容')
    expect(await readFile(target, 'utf-8')).toBe('中文内容')
    await expect(svc.writeToFile('Z:/不存在/盘符/x', 'x')).rejects.toMatchObject({ code: 'IO_ERROR' })
  })
})
