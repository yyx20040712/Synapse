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
import { unimplementedObject } from '../../../shared/app-error'
import type { ImportProgressEvent, ImportResult } from '../../../shared/ipc/schemas'
import type { Repos } from '../../db/repos'
import type { FileStore } from './file-store'
import type { PdfMetaExtraction } from './pdf-meta.extract'

export interface ImportService {
  importFiles(paths: string[]): Promise<ImportResult>
  importFolder(folder: string): Promise<ImportResult>
}

export function createImportService(_deps: {
  repos: Repos
  fileStore: FileStore
  /** PDF 元数据抽取（注入便于测试；生产传 extractPdfMeta） */
  extractMeta: (bytes: Uint8Array) => Promise<PdfMetaExtraction>
  onProgress?: (e: ImportProgressEvent) => void
}): ImportService {
  return unimplementedObject<ImportService>('SR-SVC-03', 'import.service')
}
