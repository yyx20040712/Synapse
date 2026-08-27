/**
 * [SR-SVC-02] reader.service —— 阅读用例（工单：done / weak）
 *
 * ── 行为层 ──
 * - open：papers.detailById → { fileUrl: `app-file://${id}`, fileName（fileRef 的 basename，
 *   正斜杠取末段）, title（文献名——PaperDetail.title 透传，标签页可读名单源）,
 *   lastReadPage }；不存在抛 NOT_FOUND
 *   （fileUrl/fileName 的实际组装在 papers.repo.detailById 内完成，本层薄取四字段）
 * - 标注读写：转调 annotations repo（insert/update/delete/listByPaper）；
 *   update 返回 null（目标标注已不存在）→ 抛 NOT_FOUND，其余转调失败语义由 repo 层持有
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
 * - NOT_FOUND 抛本文件私有的域错误类（与 library.service 的 DomainError /
 *   import.service 的 ImportDomainError 同构：带 code 的 Error，register 经
 *   toAppError 保留语义折叠为 AppError；各自私有是既定惯例，避免服务间横向依赖）
 * - 测试：tests/unit/services/reader.service.test.ts（已锁定）
 */
import type { AppErrorCode } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

/** 域错误：open 的"文献不存在"与 update 的"标注不存在"载体 */
class ReaderDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'ReaderDomainError'
    this.code = code
  }
}

export function createReaderService(deps: { repos: Repos }): ApiHandlers['reader'] {
  const { papers, annotations } = deps.repos

  return {
    async open(req) {
      const d = papers.detailById(req.paperId)
      if (d === null) {
        throw new ReaderDomainError('NOT_FOUND', `文献不存在：${req.paperId}`)
      }
      return { fileUrl: d.fileUrl, fileName: d.fileName, title: d.title, lastReadPage: d.lastReadPage }
    },

    async saveAnnotation(req) {
      return annotations.insert(req.paperId, req.annotation)
    },

    async updateAnnotation(req) {
      const updated = annotations.update(req.annotation)
      if (updated === null) {
        throw new ReaderDomainError('NOT_FOUND', `标注不存在：${req.annotation.id}`)
      }
      return updated
    },

    // 删除按幂等语义处理：repo 对不存在的 id 返回 false，仍回 { ok: true }
    async deleteAnnotation(req) {
      annotations.delete(req.annotationId)
      return { ok: true as const }
    },

    async listAnnotations(req) {
      return annotations.listByPaper(req.paperId)
    },

    // 页码从 0 计，范围合法性已由上游 zod（int min 0）保证，此处薄转调
    async saveProgress(req) {
      papers.updateReadPage(req.paperId, req.page)
      return { ok: true as const }
    }
  }
}
