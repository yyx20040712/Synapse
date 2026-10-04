/**
 * [SR-SVC-03] import.service —— 导入编排（工单：done / weak）
 *
 * ── 行为层 ──
 * - importFiles(paths, targetFolderId)：逐个 file-store 拷贝（sha256 去重）→
 *   extractPdfMeta → 入库 → 结果三类：imported / duplicates（同 sha 已存在，记
 *   文件名）/ failed（原因中文）
 * - importFolder(folder, targetFolderId)：递归找 *.pdf（不区分大小写）；每个一级
 *   子目录名 upsert 成 collection 并挂接（落子目录夹）；根目录文件落
 *   targetFolderId（[F-ALIGN-01 D3 2026-10-04] main 侧单跳：原「根目录文件不挂
 *   集合/不建节点」行为废止——所有导入产物恒落夹并建节点，INV-NEW-2）；进度事件
 *   持续上报
 * - 单文件失败不中断整批（尽力而为），失败原因进 failed
 * - 会话身份两合一（F-D4，INV-52）：
 *   ①gate 互斥——importFiles/importFolder 每次调用入口 gate.enter()，**finally**
 *     gate.exit()（尽力而为路径/域错误抛出路径都必经 finally）。gate 由 bootstrap
 *     顶层一次创建（容器 assemble 闭包之外——每层 service 重建但 gate 同一对象），
 *     workspace.service 的 create/rename/switch 三入口据计数>0 拒绝（CONFLICT 中文，
 *     拒时零库副作用）。拒绝=用户稍后重试（低频窗=大文件夹导入分钟级）；in-flight
 *     判定=main 侧计数，renderer busy 不参与（两进程面各自独立）
 *   ②sessionId——每次调用入口 randomUUID() 生成一次会话 id，该次调用内全部进度
 *     事件（含 scanning/done）同 id；renderer（ImportDropZone）据它做跨会话迟到过滤
 *
 * ── 接口层 ──
 * - export interface ImportService {
 *     importFiles(paths: string[], targetFolderId: string): Promise<ImportResult>
 *     importFolder(folder: string, targetFolderId: string): Promise<ImportResult>
 *   }
 * - export function createImportService(deps: {
 *     repos: Repos; fileStore: FileStore;
 *     gate: { enter(): void; exit(): void };
 *     onProgress?: (e: ImportProgressEvent) => void;
 *     sendFoldersChanged?: () => void; sendLineageChanged?: () => void
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
import type { ImportProgressEvent, ImportResult } from '../../../shared/ipc/schemas'
import type { Collection } from '../../../shared/models/collection'
import type { PaperSummary } from '../../../shared/models/paper'
import type { PaperRow, Repos } from '../../db/repos'
import { DomainError } from '../shared/domain-error'
import { normalizeMonthSlot } from '../lineage/lineage.write-guards'
import type { FileStore } from './file-store'
import type { PdfMetaExtraction } from './pdf-meta.extract'

export interface ImportService {
  importFiles(paths: string[], targetFolderId: string): Promise<ImportResult>
  importFolder(folder: string, targetFolderId: string): Promise<ImportResult>
}

/**
 * 域错误：仅文件夹整体读不了时抛出（code 经 register 的 toAppError 保留语义）。
 * 单文件失败不抛——按"尽力而为"进 failed。
 * 基类一行继承=services/shared/domain-error（F-DEDUP-01 单源）。
 */
class ImportDomainError extends DomainError {}

/** 批处理单元：源路径 + 所属集合（importFiles 一律 null=落点取调用参数
 *  targetFolderId；importFolder 的根目录文件同为 null，一级子目录文件=该夹） */
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

/** 进度事件四字段 core（会话 id 由调用层组装——同次调用全程同 id） */
type ProgressCore = Omit<ImportProgressEvent, 'sessionId'>

export function createImportService(deps: {
  repos: Repos
  fileStore: FileStore
  /** PDF 元数据抽取（注入便于测试；生产传 extractPdfMeta） */
  extractMeta: (bytes: Uint8Array) => Promise<PdfMetaExtraction>
  /** 导入互斥 gate（F-D4 A 面：bootstrap 顶层一次创建并注入；enter/exit 必经
   *  finally 配对——workspace 变更三入口的互斥判定源） */
  gate: { enter(): void; exit(): void }
  onProgress?: (e: ImportProgressEvent) => void
  /** [F-ALIGN-01 D3] 双失效事件出口（可选缺省=静默——单测装配兼容；
   *  生产装配恒真值——LibraryServiceDeps 先例）。单跳落夹+建节点吸收了原
   *  renderer 后挂接链的 moveFolder 双播面：导入产物>0 → folders.changed
   *  （侧栏计数）+lineage.changed（图结构）双播（S3/S4 联动数据源） */
  sendFoldersChanged?: () => void
  sendLineageChanged?: () => void
}): ImportService {
  const { repos, fileStore, extractMeta, gate, onProgress } = deps
  const sendFoldersChanged = deps.sendFoldersChanged ?? (() => undefined)
  const sendLineageChanged = deps.sendLineageChanged ?? (() => undefined)

  /** [F-ALIGN-01 D3] 落夹产物广播（imported>0 才播——取消/全重复零播） */
  const reportMutated = (result: ImportResult): void => {
    if (result.imported.length > 0) {
      sendFoldersChanged()
      sendLineageChanged()
    }
  }

  /** 进度上报（onProgress 未注入时静默，便于无 UI 场景复用） */
  const report = (sessionId: string, core: ProgressCore): void => {
    onProgress?.({ ...core, sessionId })
  }

  /** 逐文件流水线结果三态 */
  type OneOutcome =
    | { kind: 'imported'; summary: PaperSummary }
    | { kind: 'duplicate'; fileName: string }
    | { kind: 'failed'; fileName: string; reason: string }

  /**
   * 单文件流水线：拷贝（含 sha256）→ 查重 → 抽取 → 入库 → 落夹建节点。
   * 任一步抛错（非 PDF / 读源失败等）都折叠成 failed，不中断整批。
   *
   * 写入顺序：insert 在前、folder 归属在后（[F-FOLDER-01] paper_collections
   * 退役——文件夹导入的一级子目录名→collections 行→papers.folder_id 单归属）。
   * 两条写入包在 repos.withTransaction 里——归属写失败（SQLITE_BUSY/IO 等）时
   * insert 一并回滚：没有事务时"失败"的文献已入库且 sha 被判重占用，永远无法重导。
   *
   * [F-ALIGN-01 D3 2026-10-04] main 侧单跳：落点=collection?.id ?? targetFolderId
   * （子目录文件→子目录夹；对话框/根散文件→targetFolderId），所有导入产物建
   * 节点（原「根文件不建节点」行为废止——INV-NEW-2 落夹恒非空+INV-88 投影恒等）。
   */
  async function importOne(
    entry: BatchEntry,
    current: number,
    total: number,
    sessionId: string,
    targetFolderId: string
  ): Promise<OneOutcome> {
    const fileName = fileNameOf(entry.path)
    try {
      report(sessionId, { phase: 'copying', current, total, fileName })
      const stored = await fileStore.storePdfFromPath(entry.path)
      // 去重语义（DUPLICATE_FILE）：同 sha 已入库（含本批次先行文件）→ 记文件名跳过，
      // 不抛错不重复入库；受管存储按内容寻址，重复拷贝只是复用既有分桶文件
      if (repos.papers.findBySha256(stored.sha256) !== null) {
        return { kind: 'duplicate', fileName }
      }
      report(sessionId, { phase: 'extracting', current, total, fileName })
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
      const collection = entry.collection
      const folderId = collection?.id ?? targetFolderId
      repos.withTransaction(() => {
        repos.papers.insert(row)
        // [F-FOLDER-01] 单归属直写（M2M attach 退役——一级子目录名→folder）+
        // [回炉码 2/k1-W4→F-ALIGN-01 D3] 落夹即自动入图（全形态统一）：
        // 节点 folder=papers.folder_id（setFolderId 先行——INV-88 统一规则同源）；
        // year 取抽取元数据、month 无源=null 缺省归未定年月组（W6 漏格）、
        // slot=目标图组现行 max+1（normalizeMonthSlot 新建分支单源）
        repos.papers.setFolderId(row.id, folderId)
        const seed = {
          paperId: row.id,
          title: row.title.trim() === '' ? '（无标题）' : row.title,
          year: meta.year,
          x: null,
          y: null,
          month: null,
          folderId
        }
        const { month, slot } = normalizeMonthSlot(seed, repos.lineage.listGraph().nodes)
        repos.lineage.upsertNode({ ...seed, month, slot })
      })
      return { kind: 'imported', summary: toSummary(row, meta.authors, collection?.id ?? targetFolderId) }
    } catch (e) {
      // FileStoreError（UNSUPPORTED_FILE/IO_ERROR）的 message 已是中文；兜底防空串
      const reason = e instanceof Error && e.message !== '' ? e.message : `导入失败：${fileName}`
      return { kind: 'failed', fileName, reason }
    }
  }

  /** 批驱动：逐个跑流水线并汇成 ImportResult；current 从 1 计数 */
  async function runBatch(
    sessionId: string,
    entries: BatchEntry[],
    targetFolderId: string
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: [], duplicates: [], failed: [] }
    for (const [idx, entry] of entries.entries()) {
      const outcome = await importOne(entry, idx + 1, entries.length, sessionId, targetFolderId)
      if (outcome.kind === 'imported') result.imported.push(outcome.summary)
      else if (outcome.kind === 'duplicate') result.duplicates.push(outcome.fileName)
      else result.failed.push({ fileName: outcome.fileName, reason: outcome.reason })
    }
    report(sessionId, { phase: 'done', current: entries.length, total: entries.length, fileName: '' })
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

  /** 扫描 folder：根目录 *.pdf 落 targetFolderId（[F-ALIGN-01 D3]）；一级子目录
   *  递归取 PDF 并记目录名与 position（落子目录夹） */
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
    // 路径列表已给定，无扫描阶段；进度直接从 copying 开始。
    // gate.enter/exit 必经 finally（F-D4 A 面——域错误上抛路径也释放互斥计数）
    async importFiles(paths: string[], targetFolderId: string): Promise<ImportResult> {
      gate.enter()
      try {
        const sessionId = randomUUID()
        const result = await runBatch(
          sessionId,
          paths.map((path): BatchEntry => ({ path, collection: null })),
          targetFolderId
        )
        reportMutated(result)
        return result
      } finally {
        gate.exit()
      }
    },

    async importFolder(folder: string, targetFolderId: string): Promise<ImportResult> {
      gate.enter()
      try {
        const sessionId = randomUUID()
        // 扫描阶段 total 未知（current=0 表示尚未处理任何文件）
        report(sessionId, { phase: 'scanning', current: 0, total: 0, fileName: fileNameOf(folder) })
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
        const result = await runBatch(
          sessionId,
          planned.map((p): BatchEntry => {
            const collection =
              p.collectionName === null ? null : collectionByName.get(p.collectionName) ?? null
            return { path: p.path, collection }
          }),
          targetFolderId
        )
        reportMutated(result)
        return result
      } finally {
        gate.exit()
      }
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

/** 刚插入的行 → 列表页摘要（新文献无标签/标注/笔记；[F-FOLDER-01] 归属=
 * folderId（单归属——[F-ALIGN-01 D3] 导入落点恒非空=collection 或 targetFolderId，
 * INV-NEW-2），impactFactor 新建恒 null，pubNo 无窗口语境省略——可选增量字段） */
function toSummary(row: PaperRow, authors: string[], folderId: string): PaperSummary {
  return {
    id: row.id,
    title: row.title,
    authors,
    year: row.year,
    venue: row.venue,
    doi: row.doi,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: row.last_read_page,
    addedAt: row.added_at,
    folderId,
    impactFactor: null
  }
}
