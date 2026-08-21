/**
 * [SR-DB-02] annotations.repo —— annotations 表仓储（工单：open / weak）
 *
 * ── 行为层 ──
 * - 标注 CRUD + 按文献列出（按 page、sort_key 稳定排序）
 * - quote/comment 的 FTS 搜索（阅读器内搜高亮/评论）
 *
 * ── 接口层 ──
 * - export interface AnnotationsRepo：
 *     insert(paperId: string, input: AnnotationInput): Annotation   // id/时间戳在此生成
 *     update(annotation: Annotation): Annotation | null              // 整体替换
 *     delete(id: string): boolean                                    // 影响行数>0
 *     listByPaper(paperId: string): Annotation[]                     // ORDER BY page, sort_key
 *     search(paperId: string | null, q: string): Annotation[]        // FTS；paperId 可选过滤
 *     countByPaper(paperId: string): number
 *
 * ── 架构层 ──
 * - 依赖：db/connection、db/fts 转义、shared/models/annotation
 * - rects 与 DB 列 rects_json 的编解码在此封装（JSON.parse/stringify + 校验）
 * - SQL 一律预编译参数化；FTS 输入必须经 escapeFtsQuery
 *
 * ── 生命周期层 ──
 * - 不做：跨实体级联（外键 ON DELETE CASCADE 已由 schema 保证）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/annotations.repo.test.ts（已锁定）
 * - 完成后删除 NotImplementedError 并翻 registry 状态
 */
import { unimplementedObject } from '../../../shared/app-error'
import type { Annotation, AnnotationInput } from '../../../shared/models/annotation'
import type { SqliteDb } from '../connection'

export interface AnnotationsRepo {
  insert(paperId: string, input: AnnotationInput): Annotation
  update(annotation: Annotation): Annotation | null
  delete(id: string): boolean
  listByPaper(paperId: string): Annotation[]
  search(paperId: string | null, q: string): Annotation[]
  countByPaper(paperId: string): number
}

export function createAnnotationsRepo(_db: SqliteDb): AnnotationsRepo {
  return unimplementedObject<AnnotationsRepo>('SR-DB-02', 'annotations.repo')
}
