import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import {
  createCorpusExportService,
  type CorpusExportDeps
} from '../../../src/main/services/export_/corpus.export.service'
import { createExportService } from '../../../src/main/services/export_/export.service'
import { assembleCorpusMd, orderAiNotes } from '../../../src/main/services/export_/corpus.assemble'
import { createRepos, type Repos } from '../../../src/main/db/repos'
import type { ExportCorpusEvent, ExtractRequestEvent } from '../../../src/shared/ipc/schemas'
import type { AnnotationRect } from '../../../src/shared/models/annotation'
import type { AiNoteQuestion } from '../../../src/shared/models/ai-note'
import { createTestDb } from '../../utils/fixtures'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR2-AI-03', 'corpus.export.service —— 五件套导出会话（状态机+manifest+幂等）', () => {
  interface Harness {
    db: ReturnType<typeof createTestDb>
    repos: Repos
    dir: string
    events: ExportCorpusEvent[]
    missingFiles: Set<string>
    svc: ReturnType<typeof createCorpusExportService>
    dispose: () => Promise<void>
  }

  async function makeHarness(): Promise<Harness> {
    const db = createTestDb()
    const repos = createRepos(db)
    const dir = await mkdtemp(join(tmpdir(), 'corpus-session-'))
    const events: ExportCorpusEvent[] = []
    const missingFiles = new Set<string>()
    const deps: CorpusExportDeps = {
      repos,
      fileStore: {
        // 桩：fileRef=篇 id 的受管路径映射；missingFiles 模拟文件缺失篇
        resolveManagedPath: (fileRef: string) =>
          missingFiles.has(fileRef) ? join(dir, 'missing', fileRef) : join(dir, 'files', fileRef)
      },
      sendEvent: (e) => {
        events.push(e)
      },
      now: () => '2026-08-27T00:00:00.000Z'
    }
    const svc = createCorpusExportService(deps)
    return {
      db, repos, dir, events, missingFiles,
      svc,
      dispose: async () => {
        db.close()
        await import('node:fs/promises').then((fs) => fs.rm(dir, { recursive: true, force: true }))
      }
    }
  }

  /** 插入一篇可用文献+真实源 PDF 文件（files/<id>.pdf——文件存在性判定走真路径） */
  async function seedPaper(h: Harness, id: string, title: string): Promise<void> {
    await mkdir(join(h.dir, 'files'), { recursive: true })
    await writeFile(join(h.dir, 'files', `${id}.pdf`), '%PDF-1.4 test fixture')
    h.db
      .prepare(
        'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?,?,?,?,?,?)'
      )
      .run(id, `${id}.pdf`, `sha-${id}`, title, 't', 't')
  }

  function seedAnnotation(h: Harness, id: string, paperId: string, page: number, comment: string): void {
    const rects: AnnotationRect[] = [{ page, x: 0.1, y: 0.1, w: 0.5, h: 0.1 }]
    h.db
      .prepare(
        `INSERT INTO annotations (id, paper_id, page, kind, quote_text, prefix_text, suffix_text,
           start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(id, paperId, page, 'highlight', `引文-${id}`, '前', '后', 0, 1, JSON.stringify(rects), `${page}:0`, comment, 't', 't')
  }

  function seedAiNote(h: Harness, paperId: string, role: 'first-read' | 'second-read' | 'adjudicate', question: AiNoteQuestion, content: string): void {
    h.repos.aiNotes.insert({
      paperId, annotationId: null, role, question, model: 'glm-5.3',
      quoteText: '', prefixText: '', suffixText: '', anchorPage: null, contentMd: content
    })
  }

  /** 模拟 renderer 提取器：对一篇 extract-request 逐项回传 */
  async function emulateExtractor(h: Harness, req: ExtractRequestEvent, opts: { failWith?: string } = {}): Promise<void> {
    const base = { sessionId: req.sessionId, paperId: req.paperId }
    if (opts.failWith !== undefined) {
      await h.svc.corpusItem({ ...base, kind: 'error', reason: opts.failWith })
      return
    }
    await h.svc.corpusItem({ ...base, kind: 'fulltext', page: 1, payload: `TEXT-A ${req.paperId}` })
    await h.svc.corpusItem({ ...base, kind: 'fulltext', page: 2, payload: `TEXT-B ${req.paperId}` })
    await h.svc.corpusItem({ ...base, kind: 'figure', figure: 'page', page: 1, payload: Buffer.from('PNG1').toString('base64') })
    for (const a of req.annotations) {
      await h.svc.corpusItem({ ...base, kind: 'figure', figure: 'anno', page: 1, annotationId: a.id, payload: Buffer.from(`ANNO-${a.id}`).toString('base64') })
    }
    await h.svc.corpusItem({ ...base, kind: 'complete' })
  }

  /** 轮询等下一篇 extract-request（异步编排——事件序推进） */
  async function nextExtract(h: Harness, afterIndex: number): Promise<ExtractRequestEvent> {
    for (let i = 0; i < 200; i += 1) {
      const reqs = h.events.filter((e): e is ExtractRequestEvent => e.type === 'extract-request')
      const hit = reqs[afterIndex]
      if (reqs.length > afterIndex && hit !== undefined) return hit
      await new Promise((r) => setTimeout(r, 5))
    }
    throw new Error(`等待 extract-request #${afterIndex + 1} 超时`)
  }

  it('正常全链：两篇→五件套落盘（corpus md golden/fulltext 页界 \\f/figures/manifest sha 全匹配）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '智慧水务论文一')
      await seedPaper(h, 'p-2', '智慧水务论文二')
      seedAnnotation(h, 'a-1', 'p-1', 0, '用户批注一')
      seedAiNote(h, 'p-1', 'first-read', 'Q1', 'AI 一读回答')

      const session = h.svc.exportCorpusSession({ dir: h.dir })
      // 篇序=listAllIds 库序（added_at DESC——最新在前），两篇同刻插入序不写死：
      // 动态取请求，断言集合而非顺序
      const r1 = await nextExtract(h, 0)
      expect(['p-1', 'p-2']).toContain(r1.paperId)
      expect(r1.url).toBe(`app-file://${r1.paperId}`)
      const second = r1.paperId === 'p-1' ? 'p-2' : 'p-1'
      if (r1.paperId === 'p-1') {
        expect(r1.annotations.map((a) => a.id)).toEqual(['a-1'])
      }
      await emulateExtractor(h, r1)
      const r2 = await nextExtract(h, 1)
      expect(r2.paperId).toBe(second)
      await emulateExtractor(h, r2)
      const result = await session
      expect(result).toEqual({ dir: h.dir, fileCount: 2, errorCount: 0 })

      // corpus md golden：p-1 内容=装配纯函数输出逐字节（含 [ai:*] 段与引文块）
      const detail1 = h.repos.papers.detailById('p-1')
      expect(detail1).not.toBeNull()
      const expectedMd = assembleCorpusMd({
        paper: detail1!,
        note: null,
        annotations: h.repos.annotations.listByPaper('p-1'),
        aiNotes: orderAiNotes(h.repos.aiNotes.listByPaper('p-1'))
      })
      const md1 = await readFile(join(h.dir, 'corpus', 'p-1.md'), 'utf8')
      expect(md1).toBe(expectedMd)
      expect(md1).toContain('[user] 用户批注一')
      expect(md1).toContain('[ai:glm-5.3]')

      // fulltext：页界 \f
      const ft1 = await readFile(join(h.dir, 'fulltext', 'p-1.txt'), 'utf8')
      expect(ft1).toBe(`TEXT-A p-1\fTEXT-B p-1`)

      // figures：页图+anno 图（anno-<id>.png 命名）
      const figs1 = (await readdir(join(h.dir, 'figures', 'p-1'))).sort()
      expect(figs1).toEqual(['anno-a-1.png', 'page-1.png'])

      // manifest：终局存在+结构断言（sha=文件字节；papers[] 只列成功篇）
      const manifest = JSON.parse(await readFile(join(h.dir, 'manifest.json'), 'utf8')) as {
        schemaVersion: number
        exportedAt: string
        papers: Array<{ paperId: string; contentSha: string; fulltextSha: string; figures: string[] }>
      }
      expect(manifest.schemaVersion).toBe(1)
      // papers[] 序=处理序（listAllIds 库序 added_at DESC）——排序无关断言
      expect([...manifest.papers.map((p) => p.paperId)].sort()).toEqual(['p-1', 'p-2'])
      const first = manifest.papers.find((p) => p.paperId === 'p-1')
      expect(first).toBeDefined()
      expect(first!.contentSha).toBe(createHash('sha256').update(md1).digest('hex'))
      expect(first!.fulltextSha).toBe(createHash('sha256').update(ft1).digest('hex'))
      expect(first!.figures).toContain('figures/p-1/page-1.png')
      // INTERFACE.md 静态单源存在
      expect((await readdir(h.dir)).map((f) => f.toLowerCase())).toContain('interface.md')
    } finally {
      await h.dispose()
    }
  })

  it('幂等重导：同库重跑=产物文件逐字节稳定（manifest exportedAt 不参与断言）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '稳定篇')
      seedAnnotation(h, 'a-1', 'p-1', 2, '批注')
      let extractSeq = 0
      const run = async (): Promise<{ md: string; ft: string; fig: Buffer }> => {
        const session = h.svc.exportCorpusSession({ dir: h.dir })
        await emulateExtractor(h, await nextExtract(h, extractSeq))
        extractSeq += 1
        await session
        return {
          md: await readFile(join(h.dir, 'corpus', 'p-1.md'), 'utf8'),
          ft: await readFile(join(h.dir, 'fulltext', 'p-1.txt'), 'utf8'),
          fig: await readFile(join(h.dir, 'figures', 'p-1', 'page-1.png'))
        }
      }
      const first = await run()
      const second = await run()
      expect(second.md).toBe(first.md)
      expect(second.ft).toBe(first.ft)
      expect(second.fig.equals(first.fig)).toBe(true)
    } finally {
      await h.dispose()
    }
  })

  it('篇失败：文件缺失篇进 errors[] 会话继续（部分成功）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-ok', '好篇')
      await seedPaper(h, 'p-bad', '坏篇')
      h.missingFiles.add('p-bad.pdf')
      const session = h.svc.exportCorpusSession({ dir: h.dir })
      const r = await nextExtract(h, 0)
      expect(r.paperId).toBe('p-ok') // 坏篇不进 streaming
      await emulateExtractor(h, r)
      const result = await session
      expect(result.errorCount).toBe(1)
      expect(result.fileCount).toBe(1)
      const manifest = JSON.parse(await readFile(join(h.dir, 'manifest.json'), 'utf8')) as {
        papers: Array<{ paperId: string }>
        errors: Array<{ paperId: string; reason: string }>
      }
      expect(manifest.papers.map((p) => p.paperId)).toEqual(['p-ok'])
      expect(manifest.errors[0]?.paperId).toBe('p-bad')
    } finally {
      await h.dispose()
    }
  })

  it('renderer 篇失败（kind:error）：errors[] 接续——errors 会话继续跨格', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-a', 'A')
      await seedPaper(h, 'p-b', 'B')
      const session = h.svc.exportCorpusSession({ dir: h.dir })
      const ra = await nextExtract(h, 0)
      await emulateExtractor(h, ra, { failWith: '提取渲染失败' })
      const rb = await nextExtract(h, 1)
      await emulateExtractor(h, rb)
      const result = await session
      expect(result).toEqual({ dir: h.dir, fileCount: 1, errorCount: 1 })
    } finally {
      await h.dispose()
    }
  })

  it('EXPORT_BUSY：会话进行中第二会话拒绝（单飞）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '单飞篇')
      const first = h.svc.exportCorpusSession({ dir: h.dir })
      await nextExtract(h, 0)
      await expect(h.svc.exportCorpusSession({ dir: h.dir })).rejects.toMatchObject({
        code: 'EXPORT_BUSY'
      })
      await emulateExtractor(h, (await nextExtract(h, 0)))
      await first
    } finally {
      await h.dispose()
    }
  })

  it('落盘失败：会话 failed（无 manifest）——同名目录占位致写盘 ENOTDIR', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '落盘篇')
      const session = h.svc.exportCorpusSession({ dir: h.dir })
      const r = await nextExtract(h, 0)
      // 占位目录在 cleanRebuild 之后建（extract-request 已到=清理已过）：
      // figures/<paperId>/page-1.png 为目录 → writeFile 抛 ENOTDIR
      await mkdir(join(h.dir, 'figures', r.paperId, 'page-1.png'), { recursive: true })
      await h.svc.corpusItem({ sessionId: r.sessionId, paperId: r.paperId, kind: 'fulltext', page: 1, payload: 'x' })
      await expect(
        h.svc.corpusItem({
          sessionId: r.sessionId, paperId: r.paperId, kind: 'figure', figure: 'page', page: 1,
          payload: Buffer.from('P').toString('base64')
        })
      ).rejects.toThrow()
      await expect(session).rejects.toThrow()
      await expect(readFile(join(h.dir, 'manifest.json'), 'utf8')).rejects.toThrow()
      // failed 后 session 释放：新会话可开（重跑修复语义）
      await import('node:fs/promises').then((fs) => fs.rm(join(h.dir, 'figures'), { recursive: true, force: true }))
      const retry = h.svc.exportCorpusSession({ dir: h.dir })
      await emulateExtractor(h, await nextExtract(h, 1))
      const r2 = await retry
      expect(r2.errorCount).toBe(0)
    } finally {
      await h.dispose()
    }
  })

  it('会话开始清空重建：旧 manifest+残留产物清除（中断重跑幂等）；目录根用户文件不动', async () => {
    const h = await makeHarness()
    try {
      // 预置残留：旧 manifest+corpus 旧篇+目录根用户文件
      await mkdir(join(h.dir, 'corpus'), { recursive: true })
      await writeFile(join(h.dir, 'manifest.json'), '{"stale":true}', 'utf8')
      await writeFile(join(h.dir, 'manifest.tmp.json'), '{"stale":true}', 'utf8')
      await writeFile(join(h.dir, 'corpus', 'old-paper.md'), '旧', 'utf8')
      await writeFile(join(h.dir, 'user-notes.txt'), '用户自己的文件', 'utf8')

      await seedPaper(h, 'p-new', '新篇')
      const session = h.svc.exportCorpusSession({ dir: h.dir })
      await emulateExtractor(h, await nextExtract(h, 0))
      await session
      const corpusFiles = await readdir(join(h.dir, 'corpus'))
      expect(corpusFiles).toEqual(['p-new.md']) // 旧篇已清
      const manifest = JSON.parse(await readFile(join(h.dir, 'manifest.json'), 'utf8'))
      expect(manifest.stale).toBeUndefined()
      expect(await readFile(join(h.dir, 'user-notes.txt'), 'utf8')).toBe('用户自己的文件') // 目录根不动
    } finally {
      await h.dispose()
    }
  })

  it('corpusItem 载荷失配：sessionId/paperId 与在途不符→INVALID_REQUEST（防御）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '失配篇')
      const session = h.svc.exportCorpusSession({ dir: h.dir })
      const r = await nextExtract(h, 0)
      await expect(
        h.svc.corpusItem({ sessionId: r.sessionId, paperId: '别的篇', kind: 'complete' })
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
      await expect(
        h.svc.corpusItem({ sessionId: '别的会话', paperId: 'p-1', kind: 'complete' })
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
      // 原会话不受防御拒绝影响，照常完成
      await emulateExtractor(h, r)
      expect((await session).fileCount).toBe(1)
    } finally {
      await h.dispose()
    }
  })

  it('目录隔离守卫：corpusSet 目标目录含 manifest.json→拒绝（防轻量导出污染五件套目录）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '守卫篇')
      await writeFile(join(h.dir, 'manifest.json'), '{}', 'utf8')
      const exportSvc = createExportService({ repos: h.repos })
      const entries = [{ paperId: 'p-1', content: 'md' }]
      await expect(exportSvc.writeCorpusSet(h.dir, entries)).rejects.toMatchObject({
        code: 'CONFLICT'
      })
    } finally {
      await h.dispose()
    }
  })

  it('orderAiNotes：role→question→createdAt 分组序（first-read Q1 在 second-read Q1 前；divergence 殿后）', async () => {
    const h = await makeHarness()
    try {
      await seedPaper(h, 'p-1', '序篇')
      seedAiNote(h, 'p-1', 'adjudicate', 'divergence', '分歧')
      seedAiNote(h, 'p-1', 'second-read', 'Q1', '二读')
      seedAiNote(h, 'p-1', 'first-read', 'Q2', '一读Q2')
      seedAiNote(h, 'p-1', 'first-read', 'Q1', '一读Q1')
      const ordered = orderAiNotes(h.repos.aiNotes.listByPaper('p-1'))
      expect(ordered.map((e) => `${e.sourceRole}:${e.question ?? ''}`)).toEqual([
        'first-read:Q1',
        'first-read:Q2',
        'second-read:Q1',
        'adjudicate:divergence'
      ])
    } finally {
      await h.dispose()
    }
  })
})
