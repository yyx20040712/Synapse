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

/** 礼貌池标识：CrossRef/OpenAlex 建议带 mailto（占位，Settings 可改；R2-SH1 改名同步） */
export const DEFAULT_CONTACT_EMAIL = 'synapse-user@example.com'

/** HTTP 超时（毫秒）与重试 */
export const HTTP_TIMEOUT_MS = 15_000
export const HTTP_MAX_RETRIES = 2

/** 标注调色板（与 AnnotationColor 一一对应） */
export const ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'red', 'purple'] as const

/**
 * [F-TAGS-01] 标签颜色预设 swatch（取色器快捷 8 色——zotero 式；用户可经
 * 原生 input[type=color] 任选 hex，预设只是快捷入口）。数据域常量非主题
 * token：值随标签行落库（tags.color），与 ANNOTATION_COLORS 同域（用户数据
 * 身份色），INV-11 主题消费单源（--* token）不适用——着色渲染经
 * renderer/shared/ui-constants tagColorStyle 单源。
 */
export const TAG_COLOR_PRESETS = [
  '#e11d48',
  '#f97316',
  '#eab308',
  '#16a34a',
  '#0ea5e9',
  '#4f46e5',
  '#a855f7',
  '#475569'
] as const

/** [F-TAGS-01] 取色器在「默认色」态的原生 input[type=color] 展示值（仅
 *  展示——真实语义 null 由「恢复默认」承载，交互即切离默认态） */
export const TAG_COLOR_NONE_DISPLAY = '#9aa4b2'

/** 列表分页上限（防弱模型一次拉全表） */
export const MAX_PAGE_SIZE = 200
