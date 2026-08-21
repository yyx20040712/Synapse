/**
 * 全局常量 —— 单一出处（契约，已冻结）。
 * 修改任何一项都可能影响安全边界（如 host 白名单），需走 [locked-change]。
 */

/** 自定义协议：renderer 获取受管 PDF 的唯一通道（app-file://<paperId>） */
export const APP_FILE_SCHEME = 'app-file'

/** 受管文件在 userData 下的目录名（PDF 唯一存放地） */
export const MANAGED_FILES_DIR = 'files'

/** SQLite 数据库文件名（位于 userData） */
export const DB_FILE_NAME = 'synapse.db'

/** 设置 JSON 文件名（位于 userData） */
export const SETTINGS_FILE_NAME = 'settings.json'

/** 出网 host 白名单（安全 §6.4）：http-client 强制校验，新增需 ADR */
export const ALLOWED_REMOTE_HOSTS: readonly string[] = [
  'api.crossref.org',
  'api.openalex.org',
  'export.arxiv.org'
]

/** 礼貌池标识：CrossRef/OpenAlex 建议带 mailto（占位，Settings 可改） */
export const DEFAULT_CONTACT_EMAIL = 'synapse-remake-user@example.com'

/** HTTP 超时（毫秒）与重试 */
export const HTTP_TIMEOUT_MS = 15_000
export const HTTP_MAX_RETRIES = 2

/** 标注调色板（与 AnnotationColor 一一对应） */
export const ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'red', 'purple'] as const

/** 列表分页上限（防弱模型一次拉全表） */
export const MAX_PAGE_SIZE = 200
