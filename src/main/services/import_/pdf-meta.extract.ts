/**
 * [SR-SVC-04] pdf-meta.extract —— PDF 元数据抽取（工单：open / weak）
 *
 * ── 行为层 ──
 * - 输入 PDF 字节，输出候选元数据（纯提取，不查库不出网）
 * - 优先级：PDF Info 字典（Title/Author）→ 首两页文本正则（DOI、arXiv id、年份）
 * - 抽不到的字段给安全默认值（空串/null），绝不抛"抽取失败"——抽取尽力而为
 *
 * ── 接口层 ──
 * - export interface PdfMetaExtraction {
 *     title: string; authors: string[]; year: number | null;
 *     doi: string | null; arxivId: string | null
 *   }
 * - export async function extractPdfMeta(bytes: Uint8Array): Promise<PdfMetaExtraction>
 *
 * ── 架构层 ──
 * - 用 pdfjs-dist 的 legacy 构建（Node 环境可跑）：
 *   import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
 *   getDocument({ data }) → doc.getMetadata() 与前两页 getTextContent()
 * - DOI 正则：/10\.\d{4,9}\/[^\s"<>]+/i（取首个匹配，去尾部标点）
 * - arXiv 正则：/arXiv:(\d{4}\.\d{4,5})(v\d+)?/i 或裸 ID 形态
 * - 解析异常（坏 PDF）→ 返回全默认值并 console.warn，不抛
 *
 * ── 生命周期层 ──
 * - 不做：出版社/openalex 查询（那是 enrich.service）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/pdf-meta.extract.test.ts（已锁定，用 tests/utils/pdf-factory 生成夹具）
 * - workerSrc 不需要（legacy 构建禁 worker 即可：GlobalWorkerOptions.workerSrc 留空 + disableWorker 不适用 v4；直接用即可）
 */
import { NotImplementedError } from '../../../shared/app-error'

export interface PdfMetaExtraction {
  title: string
  authors: string[]
  year: number | null
  doi: string | null
  arxivId: string | null
}

export async function extractPdfMeta(_bytes: Uint8Array): Promise<PdfMetaExtraction> {
  throw new NotImplementedError('SR-SVC-04', 'PDF 元数据抽取')
}
