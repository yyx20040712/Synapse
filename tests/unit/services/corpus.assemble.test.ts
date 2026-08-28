/**
 * [SR2-C-02] corpus.assemble —— corpus md 装配纯函数+导出通道（测试：锁定合约）
 *
 * 覆盖四层：装配纯函数（golden/幂等/结构断言/序=[C-01] 比较器序/前缀语义）/
 * export.service（buildCorpus NOT_FOUND/buildCorpusSet skipped 语义/writeCorpusSet
 * 落盘）/ipc corpus·corpusSet（取消=CANCELLED/全库写盘/空库 NOT_FOUND）。
 * ADR-0011 v1.1 验收口径的机器锚（front-matter 无 exportedAt/幂等逐字节）。
 */
import { expect, it } from 'vitest'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCorpusMd,
  CORPUS_USER_PREFIX,
  corpusAiPrefix,
  type CorpusAssembleInput
} from '../../../src/main/services/export_/corpus.assemble'
import { createExportService } from '../../../src/main/services/export_/export.service'
import { createExportIpc } from '../../../src/main/ipc/export_'
import type { Repos } from '../../../src/main/db/repos'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { Annotation } from '../../../src/shared/models/annotation'
import type { Note } from '../../../src/shared/models/note'
import { guardedDescribe } from '../../utils/guard'

const detail: PaperDetail = {
  id: 'p-1',
  title: 'Water Quality Model',
  authors: ['Wang', 'Li'],
  year: 2024,
  venue: 'Water Research',
  doi: '10.1/x',
  tagNames: [],
  collectionNames: [],
  annotationCount: 2,
  noteCount: 1,
  lastReadPage: 0,
  addedAt: '2026-01-01T00:00:00Z',
  abstract: 'abs',
  arxivId: null,
  source: 'local',
  enrichStatus: 'pending',
  fileUrl: 'app-file://p-1',
  fileName: 'a.pdf',
  updatedAt: '2026-01-02T00:00:00Z',
  tags: [],
  collections: []
}

function ann(id: string, page: number, off: number, comment: string): Annotation {
  return {
    id,
    paperId: 'p-1',
    page,
    kind: 'highlight',
    color: 'yellow',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    startOffset: off,
    endOffset: off + 1,
    rects: [],
    comment,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  }
}

const note: Note = {
  id: 'n-1',
  paperId: 'p-1',
  title: '总评标题',
  contentMd: '这篇论文提出……',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z'
}

/** 固定夹具：注乱序入参（页 1 在前页 0 在后）→ 装配必须按文档序重排 */
function fixture(): CorpusAssembleInput {
  return {
    paper: detail,
    note,
    annotations: [ann('a-b', 1, 5, '第二条批注'), ann('a-a', 0, 3, '')],
    aiNotes: [{ source: 'deepseek', content: '一阶读法摘要', page: 0 }]
  }
}

guardedDescribe('SR2-C-02', 'corpus.assemble —— corpus md 装配（ADR-0011 v1.1 口径）', () => {
  it('golden 全量：固定夹具逐字节比对（front-matter+总评+片段+ai 段）', () => {
    const md = assembleCorpusMd(fixture())
    expect(md).toBe(
      [
        '---',
        'schemaVersion: 1',
        "paperId: 'p-1'",
        "title: 'Water Quality Model'",
        "authors: ['Wang', 'Li']",
        'year: 2024',
        "venue: 'Water Research'",
        "doi: '10.1/x'",
        "source: 'local'",
        "citationKey: 'wang2024water'",
        'annotationCount: 2',
        'noteCount: 1',
        '---',
        '# Water Quality Model',
        '',
        '## 总评',
        '',
        '**总评标题**',
        '',
        '这篇论文提出……',
        '',
        '## 片段',
        '',
        '> quote-a-a（p.1）',
        '',
        '> quote-a-b（p.2）',
        '',
        `    ${CORPUS_USER_PREFIX} 第二条批注`,
        '',
        `    ${corpusAiPrefix('deepseek')} 一阶读法摘要（p.1）`,
        '',
        ''
      ].join('\n')
    )
  })

  it('ENR-02 有值形：citedByCount+venueTier 进 front-matter（noteCount 后逐行序）', () => {
    const md = assembleCorpusMd({
      paper: {
        ...detail,
        venue: 'Nature Water',
        citedByCount: 12,
        citedByFetchedAt: '2026-08-28T00:00:00Z',
        citedByCountSource: 'openalex'
      },
      note: null,
      annotations: []
    })
    const fm = md.split('\n')
    const i = fm.indexOf('noteCount: 1')
    expect(i).toBeGreaterThan(-1)
    expect(fm[i + 1]).toBe('citedByCount: 12')
    expect(fm[i + 2]).toBe("venueTier: 'T1'")
    expect(fm[i + 3]).toBe('---')
  })

  it('ENR-02 0 值边界：citedByCount=0 是合法缓存值照常装配（禁 falsy 判空）', () => {
    const md = assembleCorpusMd({
      paper: {
        ...detail,
        citedByCount: 0,
        citedByFetchedAt: '2026-08-28T00:00:00Z',
        citedByCountSource: 'crossref'
      },
      note: null,
      annotations: []
    })
    expect(md).toContain('citedByCount: 0')
    // venue='Water Research' 未命中种子表：venueTier 整键省略（两形独立可选）
    expect(md).not.toContain('venueTier')
  })

  it('ENR-02 缺省形：无缓存指标夹具 → 两字段整键省略（两形成对口径）', () => {
    const md = assembleCorpusMd(fixture())
    expect(md).not.toContain('citedByCount')
    expect(md).not.toContain('venueTier')
  })

  it('幂等：同输入两次装配逐字节全等（INV-17 基线——无时间戳无随机）', () => {
    expect(assembleCorpusMd(fixture())).toBe(assembleCorpusMd(fixture()))
  })

  it('front-matter 无 exportedAt（ADR-0011 v1.1 修订 2——时间戳只进 manifest）', () => {
    expect(assembleCorpusMd(fixture())).not.toMatch(/exportedAt/)
  })

  it('结构断言：引文块数=DB 标注数；输出序=文档序（乱序入参按页重排）', () => {
    const md = assembleCorpusMd(fixture())
    const quotes = md.match(/^> quote-/gm) ?? []
    expect(quotes).toHaveLength(2)
    expect(md.indexOf('quote-a-a')).toBeLessThan(md.indexOf('quote-a-b'))
  })

  it('[user] 批注行：comment 空省略、非空缩进前缀行', () => {
    const md = assembleCorpusMd(fixture())
    expect(md).toContain(`    ${CORPUS_USER_PREFIX} 第二条批注`)
    // a-a 的 comment 为空：quote-a-a 之后不得紧跟批注行
    expect(md).not.toMatch(new RegExp(`quote-a-a（p\\.1）\\n\\n\\s*\\[user\\]`))
  })

  it('空集：无 note 无标注=仅 front-matter+标题（无总评/片段节）', () => {
    const md = assembleCorpusMd({ paper: detail, note: null, annotations: [] })
    expect(md).toContain('---')
    expect(md).not.toContain('## 总评')
    expect(md).not.toContain('## 片段')
    expect(md).toContain('# Water Quality Model')
  })

  it('YAML 对抗面：换行归一空格（单行标量）+单引号翻倍+流指示符在引号内原样（deepseek B1 采纳/B2 证伪锚）', () => {
    const md = assembleCorpusMd({
      paper: {
        ...detail,
        title: "Ti'tle\nSecond: #line",
        authors: ['Zhang, San', 'Li[4]']
      },
      note: null,
      annotations: []
    })
    // 换行被归一为空格：title 字段仍是一行（front-matter 行结构不被破坏）
    expect(md).toContain("title: 'Ti''tle Second: #line'")
    expect(md.split('\n').filter((l) => l.startsWith('title:'))).toHaveLength(1)
    // YAML 规范：单引号标量在 flow 上下文豁免流指示符（, [ ] { } 原样合法）
    expect(md).toContain("authors: ['Zhang, San', 'Li[4]']")
  })

  it('正文多行续行：引文逐行 > 前缀+页码附末行；批注/AI 段逐行缩进（r2 W1 锚）', () => {
    const multi = ann('a-m', 2, 9, '批注一\n批注二')
    multi.quoteText = '引文首行\n引文次行'
    const md = assembleCorpusMd({
      paper: detail,
      note: null,
      annotations: [multi],
      aiNotes: [{ source: 'glm', content: 'AI 首行\nAI 次行', page: 2 }]
    })
    expect(md).toContain('> 引文首行\n> 引文次行（p.3）')
    expect(md).toContain(`    ${CORPUS_USER_PREFIX} 批注一\n    批注二`)
    expect(md).toContain(`    ${corpusAiPrefix('glm')} AI 首行\n    AI 次行（p.3）`)
  })
})

/** stub repos（export.service 取数面） */
function stubRepos(over?: { detail?: PaperDetail | null; anns?: Annotation[]; note?: Note | null }): Repos {
  return {
    papers: {
      listSummariesByIds: () => [],
      detailById: () => over?.detail === undefined ? detail : over.detail,
      listAllIds: () => ['p-1', 'p-2', 'p-3']
    },
    annotations: {
      listByPaper: () => over?.anns ?? []
    },
    notes: { findByPaper: () => over?.note === undefined ? note : over.note }
  } as unknown as Repos
}

guardedDescribe('SR2-C-02', 'export.service —— buildCorpus/buildCorpusSet/writeCorpusSet', () => {
  const svc = () => createExportService({ repos: stubRepos() })

  it('buildCorpus：装配产物含 front-matter 与片段；NOT_FOUND 抛域错误', async () => {
    const md = await svc().buildCorpus('p-1')
    expect(md).toContain('schemaVersion: 1')
    const missing = createExportService({
      repos: stubRepos({ detail: null })
    })
    await expect(missing.buildCorpus('p-x')).rejects.toThrow('文献不存在')
  })

  it('buildCorpusSet：单篇取数失败跳过收集 skipped，不中断全库', async () => {
    let calls = 0
    const repos = stubRepos()
    ;(repos.papers as { detailById: (id: string) => PaperDetail | null }).detailById = (id: string) => {
      calls += 1
      return id === 'p-2' ? null : detail
    }
    const r = await createExportService({ repos }).buildCorpusSet()
    expect(r.entries.map((e) => e.paperId)).toEqual(['p-1', 'p-3'])
    expect(r.skipped).toEqual([{ paperId: 'p-2', reason: '文献不存在：p-2' }])
    expect(calls).toBe(3)
  })

  it('writeCorpusSet：mkdir corpus/ 前置+逐篇写入+返回成功数', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'synapse-c02-'))
    try {
      const n = await svc().writeCorpusSet(dir, [
        { paperId: 'p-1', content: 'md-1' },
        { paperId: 'p-2', content: 'md-2' }
      ])
      expect(n).toBe(2)
      expect(await readdir(join(dir, 'corpus'))).toEqual(['p-1.md', 'p-2.md'])
      expect(await readFile(join(dir, 'corpus', 'p-1.md'), 'utf8')).toBe('md-1')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

/** ipc stub：dialogs 与 services 桩（corpus/corpusSet 通道契约） */
function stubDeps(over?: { folder?: string | null; savePath?: string | null }) {
  const wrote: string[] = []
  const setCalls: { dir: string; entries: unknown[] }[] = []
  const deps = {
    dialogs: {
      saveFile: async () => over?.savePath === undefined ? 'C:/out/x.md' : over.savePath,
      pickFolder: async () => over?.folder === undefined ? 'C:/out' : over.folder
    },
    services: {
      library: { detail: async () => ({ title: 'Water Quality Model' }) },
      export_: {
        buildCorpus: async () => 'md-content',
        buildCorpusSet: async () => ({
          entries: [
            { paperId: 'p-1', content: 'md-1' },
            { paperId: 'p-2', content: 'md-2' }
          ],
          skipped: [] as { paperId: string; reason: string }[]
        }),
        writeCorpusSet: async (dir: string, entries: unknown[]) => {
          setCalls.push({ dir, entries })
          return (entries as unknown[]).length
        },
        writeToFile: async (p: string) => {
          wrote.push(p)
        }
      }
    }
  }
  return { deps, wrote, setCalls }
}

guardedDescribe('SR2-C-02', 'ipc/export_ —— corpus·corpusSet 通道', () => {
  it('corpus：构建→saveFile→writeToFile→{filePath,count:1}', async () => {
    const { deps, wrote } = stubDeps()
    const r = await createExportIpc(deps as never).corpus({ paperId: 'p-1' })
    expect(r).toEqual({ filePath: 'C:/out/x.md', count: 1 })
    expect(wrote).toEqual(['C:/out/x.md'])
  })

  it('corpus 取消（saveFile null）→CANCELLED 错误', async () => {
    const { deps } = stubDeps({ savePath: null })
    await expect(createExportIpc(deps as never).corpus({ paperId: 'p-1' })).rejects.toThrow('已取消')
  })

  it('corpusSet：全库→pickFolder→writeCorpusSet→count=2+skipped 回传+filePath 指 corpus/ 子目录', async () => {
    const { deps, setCalls } = stubDeps()
    const r = await createExportIpc(deps as never).corpusSet({})
    expect(r).toEqual({ filePath: join('C:/out', 'corpus'), count: 2, skipped: [] })
    expect(setCalls).toHaveLength(1)
    expect(setCalls[0]?.dir).toBe('C:/out')
  })

  it('corpusSet 取消（pickFolder null）→CANCELLED；空库（entries 0）→NOT_FOUND', async () => {
    const cancelled = stubDeps({ folder: null })
    await expect(
      createExportIpc(cancelled.deps as never).corpusSet({})
    ).rejects.toThrow('已取消')
    const empty = stubDeps()
    ;(empty.deps.services.export_ as { buildCorpusSet: () => Promise<unknown> }).buildCorpusSet =
      async () => ({ entries: [], skipped: [] })
    await expect(createExportIpc(empty.deps as never).corpusSet({})).rejects.toThrow('没有可导出的文献')
  })
})
