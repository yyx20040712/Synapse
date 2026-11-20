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
  folderId: '__main__',
  impactFactor: null,
  isStarred: false, // [F-DBCAMP-01 DB-1 U2 / F-STAR-01] paperSummarySchema 必填随链
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
  tags: []
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

  it('[B3] buildCitation gbt7714/apa：装配 detail 全字段逐字（venue/年份/DOI 段）', async () => {
    const svc = createExportService({ repos: stubRepos() })
    expect(await svc.buildCitation('p-1', 'gbt7714')).toBe(
      'Wang. Water Quality[J]. Water Research, 2024. DOI: 10.1/x.'
    )
    expect(await svc.buildCitation('p-1', 'apa')).toBe(
      'Wang (2024). Water Quality. Water Research. https://doi.org/10.1/x'
    )
  })

  it('[B3] buildCitation bibtex：单条完整 golden（citation key 沿 makeCitationKey 单源）+与 buildBibtex 单篇对账', async () => {
    const svc = createExportService({ repos: stubRepos() })
    const bib = await svc.buildCitation('p-1', 'bibtex')
    // golden 按序全串锁定（防重复 entry/尾结构漂移——[B3 审查回炉 W-3]）
    expect(bib).toBe(
      '@article{wang2024water,\n' +
        '  author = {Wang},\n' +
        '  title = {Water Quality},\n' +
        '  journal = {Water Research},\n' +
        '  year = {2024},\n' +
        '  doi = {10.1/x}\n' +
        '}\n'
    )
    // 对账：与批量通道单篇结果一致（bibtexEntryOf 单源装配）
    expect(bib).toBe(await svc.buildBibtex(['p-1']))
  })

  it('[B3] buildCitation：未知 paperId 抛 NOT_FOUND（沿 buildReport 错误约定）', async () => {
    const svc = createExportService({
      repos: { ...stubRepos(), papers: { ...stubRepos().papers, detailById: () => null } }
    })
    await expect(svc.buildCitation('ghost', 'apa')).rejects.toMatchObject({ code: 'NOT_FOUND' })
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
