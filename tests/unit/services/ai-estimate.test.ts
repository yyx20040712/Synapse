/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-estimate 用例（always-active——纯函数直测，零夹具）。
 * 覆盖简报 §3.a：CJK 四区间判定/整数算术估计（a=1.0/b=0.25 四分母整数比较）/
 * ceil 进位边界/空串/truncateToTokens 贪心恰界+cap=0+前缀保真。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  ESTIMATE_CJK_WEIGHT,
  ESTIMATE_OTHER_WEIGHT,
  estimateTokens,
  isCjkCodePoint,
  truncateToTokens
} from '../../../src/main/services/ai/ai-estimate'

describe('F-DBCAMP-01 DB-2 U2b-2a ai-estimate —— 估计器纯函数', () => {
  it('E1 纯 CJK：1 字=1 tok（a=1.0 整权重）', () => {
    expect(estimateTokens('你好世界')).toBe(4)
    expect(estimateTokens('水')).toBe(1)
  })

  it('E2 纯 ASCII×0.25 进位：ceil 边界（3 字=1/4 字=1/1 字恰 0 停界）', () => {
    expect(estimateTokens('a')).toBe(1) // ceil(0.25)=1
    expect(estimateTokens('ab')).toBe(1) // ceil(0.5)=1
    expect(estimateTokens('abc')).toBe(1) // ceil(0.75)=1
    expect(estimateTokens('abcd')).toBe(1) // ceil(1.0)=1 恰界不进位
    expect(estimateTokens('abcde')).toBe(2) // ceil(1.25)=2
  })

  it('E3 混合 ceil：CJK 整数+ASCII 四分位合并后一次 ceil（非逐字进位）', () => {
    expect(estimateTokens('你a')).toBe(2) // 1+0.25 → ceil(1.25)=2
    expect(estimateTokens('你abc')).toBe(2) // 1+0.75 → ceil(1.75)=2
    expect(estimateTokens('你abcd')).toBe(2) // 1+1.0 → ceil(2.0)=2 恰界
    expect(estimateTokens('你abcde')).toBe(3) // ceil(2.25)=3
    expect(estimateTokens('你ab你')).toBe(3) // 2+0.5 → ceil(2.5)=3
  })

  it('E4 空串=0', () => {
    expect(estimateTokens('')).toBe(0)
    expect(truncateToTokens('', 10)).toBe('')
  })

  it('E5 CJK 四区间各一例（含边界内外侧）', () => {
    // 统一表意 U+4E00-U+9FFF
    expect(isCjkCodePoint(0x4e00)).toBe(true)
    expect(isCjkCodePoint(0x9fff)).toBe(true)
    expect(isCjkCodePoint(0x9fff + 1)).toBe(false)
    // 扩展 A U+3400-U+4DBF
    expect(isCjkCodePoint(0x3400)).toBe(true)
    expect(isCjkCodePoint(0x4dbf)).toBe(true)
    expect(isCjkCodePoint(0x4dbf + 1)).toBe(false)
    // CJK 标点 U+3000-U+303F（U+3001 顿号）
    expect(isCjkCodePoint(0x3000)).toBe(true)
    expect(isCjkCodePoint(0x3001)).toBe(true)
    expect(isCjkCodePoint(0x303f)).toBe(true)
    expect(isCjkCodePoint(0x303f + 1)).toBe(false)
    // 全角形式 U+FF00-U+FFEF（U+FF01 全角叹号）
    expect(isCjkCodePoint(0xff00)).toBe(true)
    expect(isCjkCodePoint(0xff01)).toBe(true)
    expect(isCjkCodePoint(0xffef)).toBe(true)
    expect(isCjkCodePoint(0xffef + 1)).toBe(false)
    // 区间外=other（ASCII/假名邻域）
    expect(isCjkCodePoint(0x41)).toBe(false)
    expect(isCjkCodePoint(0x3040)).toBe(false) // 平假名邻域（303F+1）
  })

  it('E6 四区间字符按 CJK 权重计数（㐀/、/！全角各计 1）', () => {
    const text = String.fromCodePoint(0x3400) + '、' + String.fromCodePoint(0xff01) + '你'
    expect([...text]).toHaveLength(4)
    expect(estimateTokens(text)).toBe(4)
  })

  it('E7 truncateToTokens 贪心恰界（cjk 边界片：cap=2 三 CJK 取前二）', () => {
    expect(truncateToTokens('你好世', 2)).toBe('你好')
    expect(truncateToTokens('你好世', 3)).toBe('你好世')
  })

  it('E8 truncate 混合贪心：整权+四分权累计（cap=2 取「你ab」停界）', () => {
    // 你=1.0+a=0.25+b=0.25 累计 1.5≤2；再入 你=2.5>2 止
    expect(truncateToTokens('你ab你', 2)).toBe('你ab')
    // cap=1：你=1.0 恰界；a 再入=1.25>1 止
    expect(truncateToTokens('你ab你', 1)).toBe('你')
  })

  it('E9 truncate cap=0 → 空串', () => {
    expect(truncateToTokens('你好', 0)).toBe('')
  })

  it('E10 长文本前缀保真：截断点后原文不动（prefix+余部=原文）', () => {
    const head = '水'.repeat(30)
    const tail = 'abc'.repeat(20)
    const text = head + tail
    const out = truncateToTokens(text, 10)
    expect(out).toBe(head.slice(0, 10))
    expect(out + text.slice([...out].length)).toBe(text)
    expect(estimateTokens(out)).toBeLessThanOrEqual(10)
  })

  it('E11 系数常量冻结（a=1.0/b=0.25——校准批可调，本批初值锁）', () => {
    expect(ESTIMATE_CJK_WEIGHT).toBe(1.0)
    expect(ESTIMATE_OTHER_WEIGHT).toBe(0.25)
  })
})
