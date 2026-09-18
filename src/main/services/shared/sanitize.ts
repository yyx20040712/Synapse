/**
 * [F-DEDUP-01] 路径段清洗单源——白名单 [a-zA-Z0-9_-] 之外的字符一律换 '_'。
 * C-02 家族：renderer 载荷自由串不裸拼路径的纵深防御（id 由应用生成本可信，
 * 防篡改载荷携带 ../ 等路径穿越片段）。收敛前 2 处同正则副本：
 * export.service safeId（corpus/<safeId>.md）/corpus.export safeName
 * （figures/<paperId>/anno-<safeName>.png）。
 *
 * 排除面（异构家族不迁，票面裁决）：ipc/export_ safeFileName（展示名消毒：
 * 全角冒号+空白归一+截断 80，语义不同）；db 层 LIKE 转义 ×3（SQL 家族+db 层
 * 禁 import services）。测试：tests/unit/services/shared/sanitize.test.ts。
 */
export function sanitizePathToken(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_')
}
