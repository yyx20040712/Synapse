/**
 * FTS5 查询转义（SR-INFRA-02，已完成）。
 *
 * 职责：把用户输入安全地变成 FTS5 短语查询，杜绝 FTS 语法注入。
 * 策略：整段输入包成双引号短语，内嵌双引号按 FTS5 规则翻倍转义。
 * 用户输入 `a" OR b` 不会变成布尔表达式，只会被当作字面短语查找。
 */
export function escapeFtsQuery(userInput: string): string {
  const trimmed = userInput.trim()
  if (trimmed === '') {
    return ''
  }
  return `"${trimmed.replace(/"/g, '""')}"`
}

/** 组合查询辅助：多个非空短语以 AND 连接（空串忽略） */
export function buildFtsMatchExpression(parts: string[]): string {
  return parts
    .map((p) => escapeFtsQuery(p))
    .filter((p) => p !== '')
    .join(' ')
}
