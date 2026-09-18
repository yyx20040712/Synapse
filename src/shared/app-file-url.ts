import { APP_FILE_SCHEME } from './constants'
/**
 * [F-DEDUP-01] app-file:// URL 拼装单源（微扩主目标）：收敛前 3 处拼装——
 * papers.repo fileUrl（用 APP_FILE_SCHEME 模板串）/app-file.protocol prefix
 * 解析（同型模板串）/corpus.export 提取请求 url（硬编码 'app-file://' 字面量
 * ——未走 APP_FILE_SCHEME 的漂移面）。scheme 单源仍是 shared/constants 的
 * APP_FILE_SCHEME（本件只派生 prefix 与拼装函数）。
 * 测试：tests/unit/shared/app-file-url.test.ts。
 */
export const APP_FILE_URL_PREFIX = `${APP_FILE_SCHEME}://`

export function appFileUrl(paperId: string): string {
  return `${APP_FILE_URL_PREFIX}${paperId}`
}
