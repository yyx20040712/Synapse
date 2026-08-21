/**
 * [SR-SVC-02] reader.service —— 阅读用例（工单：open / weak）
 *
 * ── 行为层 ──
 * - open：papers.detailById → { fileUrl: `app-file://${id}`, fileName（fileRef 的 basename，
 *   正斜杠取末段）, lastReadPage }；不存在抛 NOT_FOUND
 * - 标注读写：转调 annotations repo（insert/update/delete/listByPaper）
 * - saveProgress：papers.updateReadPage（页码从 0 计）
 *
 * ── 接口层 ──
 * - export function createReaderService(deps: { repos: Repos }): ApiHandlers['reader']
 *
 * ── 架构层 ──
 * - 文件字节不经此层——renderer 直接用 fileUrl 走 app-file:// 协议
 * - 只依赖 repos 桶
 *
 * ── 生命周期层 ──
 * - 预留：阅读时长统计（002 迁移加列）
 * - 不做：多设备同步进度
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/reader.service.test.ts（已锁定）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

export function createReaderService(_deps: { repos: Repos }): ApiHandlers['reader'] {
  return unimplementedObject<ApiHandlers['reader']>('SR-SVC-02', 'reader.service')
}
