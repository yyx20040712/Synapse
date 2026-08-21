/**
 * [SR-SVC-03] import.service —— 导入编排（工单：open / weak）
 *
 * ── 行为层 ──
 * - importFiles(paths)：逐个 file-store 拷贝（sha256 去重）→ extractPdfMeta → 入库
 *   → 结果三类：imported / duplicates（同 sha 已存在，记文件名）/ failed（原因中文）
 * - importFolder(folder)：递归找 *.pdf（不区分大小写）；每个一级子目录名 upsert 成
 *   collection 并挂接；根目录文件不挂集合；进度事件持续上报
 * - 单文件失败不中断整批（尽力而为），失败原因进 failed
 *
 * ── 接口层 ──
 * - export interface ImportService {
 *     importFiles(paths: string[]): Promise<ImportResult>
 *     importFolder(folder: string): Promise<ImportResult>
 *   }
 * - export function createImportService(deps: {
 *     repos: Repos; fileStore: FileStore;
 *     onProgress?: (e: ImportProgressEvent) => void
 *   }): ImportService
 *
 * ── 架构层 ──
 * - 组合 repos.papers（findBySha256/insert）、repos.collections、fileStore、extractPdfMeta
 * - PaperRow 由本层构造（uuid/时间戳在此生成，source='local'，enrich_status='pending'）
 * - title 空时回退文件名（去 .pdf 扩展名）
 *
 * ── 生命周期层 ──
 * - 不做：网络增强（enrich 单独手动触发）；不做删除/移动源文件（只读源）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/import.service.test.ts（已锁定，fileStore/extract 用桩）
 * - 进度事件 phase: scanning→copying→extracting→done；current 从 1 计数
 */
import { randomUUID } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppErrorCode } from '../../../shared/app-error'
import type { ImportProgressEvent, ImportResult } from '../../../shared/ipc/schemas'
import type { Collection } from '../../../shared/models/collection'
import type { PaperSummary } from '../../../shared/models/paper'
import type { PaperRow, Repos } from '../../db/repos'
import type { FileStore } from './file-store'
import type { PdfMetaExtraction } from './pdf-meta.extract'

export interface ImportService {
  importFiles(paths: string[]): Promise<ImportResult>
  importFolder(folder: string): Promise<ImportResult>
}

/**
 * 域错误：仅文件夹整体读不了时抛出（code 经 register 的 toAppError 保留语义）。
 * 单文件失败不抛——按"尽力而为"进 failed。
 */
class ImportDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'ImportDomainError'
    this.code = code
  }
}

/** 批处理单元：源路径 + 所属集合（importFiles 一律 null，根目录文件也为 null） */
interface BatchEntry {
  path: string
  collection: Collection | null
}

/** importFolder 扫描产物：文件 + 所属一级子目录名（null=根目录文件）与集合 position */
interface PlannedFile {
  path: string
  collectionName: string | null
  /** 一级子目录在字典序中的序号，作为集合 position（根目录文件不用） */
  position: number
}

export function createImportService(deps: {
  repos: Repos
  fileStore: FileStore
  /** PDF 元数据抽取（注入便于测试；生产传 extractPdfMeta） */
  extractMeta: (bytes: Uint8Array) => Promise<PdfMetaExtraction>
  onProgress?: (e: ImportProgressEvent) => void
}): ImportService {
  const { repos, fileStore, extractMeta, onProgress } = deps

  /** 进度上报（onProgress 未注入时静默，便于无 UI 场景复用） */
  const report = (e: ImportProgressEvent): void => {
    onProgress?.(e)
  }

  /** 逐文件流水线结果三态 */
  type OneOutcome =
    | { kind: 'imported'; summary: PaperSummary }
    | { kind: 'duplicate'; fileName: string }
    | { kind: 'failed'; fileName: string; reason: string }

  /**
   * 单文件流水线：拷贝（含 sha256）→ 查重 → 抽取 → 入库 → 挂集合。
   * 任一步抛错（非 PDF / 读源失败等）都折叠成 failed，不中断整批。
   *
   * 写入顺序说明：insert 在前、attach 在后（paper_collections 有 papers(id) 外键）。
   * deps 只注入 repos 桶、无事务句柄，而 better-sqlite3 单连接同步执行——两条写入
   * 相邻调用间无并发窗口（与 collections.repo 的 upsert 注释同口径），故不开显式事务。
   */
  async function importOne(
    entry: BatchEntry,
    current: number,
    total: number
  ): Promise<OneOutcome> {
    const fileName = fileNameOf(entry.path)
    try {
      report({ phase: 'copying', current, total, fileName })
      const stored = await fileStore.storePdfFromPath(entry.path)
      // 去重语义（DUPLICATE_FILE）：同 sha 已入库（含本批次先行文件）→ 记文件名跳过，
      // 不抛错不重复入库；受管存储按内容寻址，重复拷贝只是复用既有分桶文件
      if (repos.papers.findBySha256(stored.sha256) !== null) {
        return { kind: 'duplicate', fileName }
      }
      report({ phase: 'extracting', current, total, fileName })
      // 从受管副本读字节抽取（内容寻址后即规范副本，无需再碰源文件）
      const meta = await extractMeta(await fileStore.readFileBytes(stored.fileRef))
      const now = new Date().toISOString()
      const row: PaperRow = {
        id: randomUUID(),
        file_ref: stored.fileRef,
        sha256: stored.sha256,
        title: titleOf(meta.title, stored.fileName),
        authors_json: JSON.stringify(meta.authors),
        year: meta.year,
        venue: '',
        doi: meta.doi,
        arxiv_id: meta.arxivId,
        abstract: '',
        source: 'local',
        enrich_status: 'pending',
        added_at: now,
        updated_at: now,
        last_read_page: 0
      }
      repos.papers.insert(row)
      const collectionNames: string[] = []
      if (entry.collection !== null) {
        repos.collections.attach(row.id, entry.collection.id)
        collectionNames.push(entry.collection.name)
      }
      return { kind: 'imported', summary: toSummary(row, meta.authors, collectionNames) }
    } catch (e) {
      // FileStoreError（UNSUPPORTED_FILE/IO_ERROR）的 message 已是中文；兜底防空串
      const reason = e instanceof Error && e.message !== '' ? e.message : `导入失败：${fileName}`
      return { kind: 'failed', fileName, reason }
    }
  }

  /** 批驱动：逐个跑流水线并汇成 ImportResult；current 从 1 计数 */
  async function runBatch(entries: BatchEntry[]): Promise<ImportResult> {
    const result: ImportResult = { imported: [], duplicates: [], failed: [] }
    for (const [idx, entry] of entries.entries()) {
      const outcome = await importOne(entry, idx + 1, entries.length)
      if (outcome.kind === 'imported') result.imported.push(outcome.summary)
      else if (outcome.kind === 'duplicate') result.duplicates.push(outcome.fileName)
      else result.failed.push({ fileName: outcome.fileName, reason: outcome.reason })
    }
    report({ phase: 'done', current: entries.length, total: entries.length, fileName: '' })
    return result
  }

  /** 递归收集 dir 下全部 *.pdf（不区分大小写）；子树读不了就跳过（尽力而为） */
  async function collectPdfs(dir: string): Promise<string[]> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const out: string[] = []
    const subdirs: string[] = []
    for (const e of entries) {
      if (e.isFile() && isPdfName(e.name)) out.push(join(dir, e.name))
      else if (e.isDirectory()) subdirs.push(e.name)
    }
    for (const name of subdirs.sort()) {
      out.push(...(await collectPdfs(join(dir, name))))
    }
    return out
  }

  /** 扫描 folder：根目录 *.pdf 不挂集合；一级子目录递归取 PDF 并记目录名与 position */
  async function scanFolder(folder: string): Promise<PlannedFile[]> {
    let firstLevel
    try {
      firstLevel = await readdir(folder, { withFileTypes: true })
    } catch (e) {
      // 文件夹整体读不了：没有任何文件可导入，作为结构化域错误上抛
      throw new ImportDomainError(
        'IO_ERROR',
        `读取文件夹失败：${fileNameOf(folder)}（${e instanceof Error ? e.message : String(e)}）`
      )
    }
    // 一级目录名字典序编号：集合 position 稳定可复现（与 collections list 排序口径一致）
    const dirNames = firstLevel
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
    const positionOf = new Map(dirNames.map((name, i) => [name, i]))
    const planned: PlannedFile[] = []
    for (const e of firstLevel) {
      if (e.isFile() && isPdfName(e.name)) {
        planned.push({ path: join(folder, e.name), collectionName: null, position: 0 })
      }
    }
    for (const name of dirNames) {
      const pdfs = await collectPdfs(join(folder, name))
      for (const p of pdfs) {
        planned.push({ path: p, collectionName: name, position: positionOf.get(name) ?? 0 })
      }
    }
    return planned
  }

  return {
    // 路径列表已给定，无扫描阶段；进度直接从 copying 开始
    async importFiles(paths: string[]): Promise<ImportResult> {
      return runBatch(paths.map((path): BatchEntry => ({ path, collection: null })))
    },

    async importFolder(folder: string): Promise<ImportResult> {
      // 扫描阶段 total 未知（current=0 表示尚未处理任何文件）
      report({ phase: 'scanning', current: 0, total: 0, fileName: fileNameOf(folder) })
      const planned = await scanFolder(folder)
      // 惰性 upsert：只给实际含 PDF 的一级子目录建集合（空目录不产生空集合），幂等可重跑
      const collectionByName = new Map<string, Collection>()
      for (const p of planned) {
        if (p.collectionName !== null && !collectionByName.has(p.collectionName)) {
          collectionByName.set(
            p.collectionName,
            repos.collections.upsertByName(p.collectionName, p.position)
          )
        }
      }
      return runBatch(
        planned.map((p): BatchEntry => {
          const collection =
            p.collectionName === null ? null : collectionByName.get(p.collectionName) ?? null
          return { path: p.path, collection }
        })
      )
    }
  }
}

// ── 模块级纯函数 ───────────────────────────────────────────────────────────

/** 路径 → 文件名（\ 与 / 都容忍，与 file-store 的 basename 口径一致） */
function fileNameOf(p: string): string {
  const norm = p.replaceAll('\\', '/')
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? norm : norm.slice(idx + 1)
}

const isPdfName = (name: string): boolean => /\.pdf$/i.test(name)

/** 标题回退：抽取标题为空 → 文件名去 .pdf 扩展名（大小写不敏感） */
function titleOf(extracted: string, fileName: string): string {
  const t = extracted.trim()
  return t !== '' ? t : fileName.replace(/\.pdf$/i, '')
}

/** 刚插入的行 → 列表页摘要（新文献无标签/标注/笔记；集合名来自本次挂接） */
function toSummary(row: PaperRow, authors: string[], collectionNames: string[]): PaperSummary {
  return {
    id: row.id,
    title: row.title,
    authors,
    year: row.year,
    venue: row.venue,
    doi: row.doi,
    tagNames: [],
    collectionNames,
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: row.last_read_page,
    addedAt: row.added_at
  }
}
