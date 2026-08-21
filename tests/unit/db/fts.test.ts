import { describe, expect, it } from 'vitest'
import { buildFtsMatchExpression, escapeFtsQuery } from '../../../src/main/db/fts'

describe('db/fts —— FTS5 查询转义（防 FTS 语法注入）', () => {
  it('普通词被包成双引号短语', () => {
    expect(escapeFtsQuery('智慧水务')).toBe('"智慧水务"')
  })

  it('内嵌双引号按 FTS5 规则翻倍', () => {
    expect(escapeFtsQuery('a"b')).toBe('"a""b"')
  })

  it('注入向量 a" OR b 被当作字面短语（不产生布尔语义）', () => {
    const escaped = escapeFtsQuery('a" OR b')
    expect(escaped).toBe('"a"" OR b"')
    expect(escaped).not.toMatch(/" OR "$/)
  })

  it('NEAR/NOT 注释向量同样被字面化', () => {
    expect(escapeFtsQuery('x NEAR(y)')).toBe('"x NEAR(y)"')
    expect(escapeFtsQuery('*')).toBe('"*"')
  })

  it('空白输入返回空串', () => {
    expect(escapeFtsQuery('')).toBe('')
    expect(escapeFtsQuery('   ')).toBe('')
  })

  it('buildFtsMatchExpression：多短语 AND 连接、空串忽略', () => {
    expect(buildFtsMatchExpression(['水', '模型', ''])).toBe('"水" "模型"')
    expect(buildFtsMatchExpression([])).toBe('')
    expect(buildFtsMatchExpression(['', ''])).toBe('')
  })
})
