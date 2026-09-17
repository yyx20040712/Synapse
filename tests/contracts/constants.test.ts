import { describe, expect, it } from 'vitest'
import {
  ALLOWED_REMOTE_HOSTS,
  ANNOTATION_COLORS,
  APP_FILE_SCHEME,
  DB_FILE_NAME,
  DEFAULT_CONTACT_EMAIL,
  HTTP_MAX_RETRIES,
  HTTP_TIMEOUT_MS,
  MANAGED_FILES_DIR,
  MAX_PAGE_SIZE,
  SETTINGS_FILE_NAME
} from '../../src/shared/constants'
import { annotationColorSchema } from '../../src/shared/models/annotation'
import { libraryQuerySchema } from '../../src/shared/models/paper'

/**
 * [F-TESTREF-W3] src/shared/constants.ts 直接契约测试——全局常量冻结 pin。
 * 「修改任何一项都可能影响安全边界（如 host 白名单）」是文件头注的冻结
 * 声明——本文件把声明变成机器断言：白名单/协议名/预算值任何漂移即红，
 * 增删须意识化过目（[locked-change] 审查锚）。新测试 always-active。
 */

describe('contracts/constants —— 全局常量冻结 pin（单一出处）', () => {
  it('出网 host 白名单冻结（安全 §6.4——新增需 ADR+[locked-change]）', () => {
    expect([...ALLOWED_REMOTE_HOSTS]).toEqual(['api.crossref.org', 'api.openalex.org', 'export.arxiv.org'])
  })

  it('标注调色板与 annotationColorSchema 一一对应（zod enum options 反射——两处漂移即红）', () => {
    // W3 门二 P2-3 搭车（W4 落）：原 [ ...ANNOTATION_COLORS ].sort() 对照系
    // z.enum(ANNOTATION_COLORS) 反射回 ANNOTATION_COLORS——同源构造等式自反
    // 恒真；改两侧字面量 pin 使 constants/schema 任一侧漂移真红。本件系 W3
    // 新增未入战役前基线（指纹门 NEW delta 形态）——改写无契约面损失，裁决
    // 留痕=relay.md batch 5 门二 P2-3。
    expect([...ANNOTATION_COLORS]).toEqual(['yellow', 'green', 'blue', 'red', 'purple'])
    expect([...annotationColorSchema.options].sort()).toEqual(['blue', 'green', 'purple', 'red', 'yellow'])
    expect(ANNOTATION_COLORS).toHaveLength(5)
  })

  it('协议/目录/文件名 pin（app-file 协议与 userData 布局契约）', () => {
    expect(APP_FILE_SCHEME).toBe('app-file')
    expect(MANAGED_FILES_DIR).toBe('files')
    expect(DB_FILE_NAME).toBe('synapse.db')
    expect(SETTINGS_FILE_NAME).toBe('settings.json')
  })

  it('HTTP 预算 pin：超时 15s / 重试 2', () => {
    expect(HTTP_TIMEOUT_MS).toBe(15_000)
    expect(HTTP_MAX_RETRIES).toBe(2)
  })

  it('MAX_PAGE_SIZE=200 与 libraryQuery limit max 同源对账（constants 与 paper.ts 两处字面量漂移即红）', () => {
    expect(MAX_PAGE_SIZE).toBe(200)
    expect(libraryQuerySchema.safeParse({ limit: MAX_PAGE_SIZE }).success).toBe(true)
    expect(libraryQuerySchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false)
  })

  it('默认礼貌池标识在场（R2-SH1 改名同步锚）', () => {
    expect(DEFAULT_CONTACT_EMAIL).toBe('synapse-user@example.com')
  })
})
