/**
 * [SR-SVC-06] export.service —— 导出编排（工单：open / weak）
 *
 * ── 行为层 ──
 * - buildBibtex(paperIds)：papers.listSummariesByIds + detailById 补摘要 →
 *   makeCitationKey + serializeBibtex；ids 顺序保持调用方顺序
 * - buildCsv(paperIds)：UTF-8 BOM + 表头 Title,Authors,Year,Venue,DOI,AddedAt；
 *   字段双引号包裹、内嵌双引号翻倍、换行替换为空格（Excel 友好）
 * - buildReport(paperId)：paper detail + annotations.listByPaper + notes.findByPaper
 *   → buildReadingReport；不存在抛 NOT_FOUND
 * - writeToFile(path, content)：fs 写入，失败抛 IO_ERROR（DomainError 形状）
 *
 * ── 接口层 ──
 * - export interface ExportService {
 *     buildBibtex(paperIds: string[]): Promise<string>
 *     buildCsv(paperIds: string[]): Promise<string>
 *     buildReport(paperId: string): Promise<string>
 *     writeToFile(path: string, content: string): Promise<void>
 *   }
 * - export function createExportService(deps: { repos: Repos }): ExportService
 *
 * ── 架构层 ──
 * - 序列化纯函数已就位（bibtex.serializer / markdown.report，各自独立工单）；
 *   本层只做取数与拼装；保存对话框在 ipc 层（UI 胶水）
 *
 * ── 生命周期层 ──
 * - 不做：导出到剪贴板（v2 预留：ipc 加通道）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/export.service.test.ts（已锁定，repos 桩）
 */
import { unimplementedObject } from '../../../shared/app-error'
import type { Repos } from '../../db/repos'

export interface ExportService {
  buildBibtex(paperIds: string[]): Promise<string>
  buildCsv(paperIds: string[]): Promise<string>
  buildReport(paperId: string): Promise<string>
  writeToFile(path: string, content: string): Promise<void>
}

export function createExportService(_deps: { repos: Repos }): ExportService {
  return unimplementedObject<ExportService>('SR-SVC-06', 'export.service')
}
