/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-estimate —— 上下文装配 token 估计器（§3.C
 * 按需分级检索：estimateTokens=cjk×a+other×b）。
 *
 * ── 行为层 ──
 * - CJK 判定四区间（码点）：U+4E00-U+9FFF 统一表意/U+3400-U+4DBF 扩展 A/
 *   U+3000-U+303F CJK 标点/U+FF00-U+FFEF 全角形式；区间外=other。
 * - 整数算术纪律（字节相等四威胁之③浮点）：初值 a=1.0/b=0.25 均四分母——
 *   内部一律 `cjk*4+other` 整数累计、`cap*4` 整数比较，杜绝浮点累计误差
 *   破坏「同键两次装配字节相等」链。对外值语义=ceil(cjk*a+other*b)。
 * - truncateToTokens：贪心逐码点累计（整数权重），返回累计 tok ≤cap 的最长
 *   前缀。片截断唯一实现点——「不截半片」的片级语义由调用方保证（先截断
 *   后计超）。
 * - 纯函数件：零 SQL 零 repo 依赖；禁 Date/随机/localeCompare（字节相等
 *   纪律全域适用——ai-context.service 头注 INV-J/字节相等四威胁清单）。
 *
 * ── 文化层 ──
 * - 系数 a/b 为初值冻结常量（校准协议=U2b-2b 面批——代表性语料对照目标
 *   分词器，偏差>20% 调系数；本批初值不动）。
 * - 测试：tests/unit/services/ai-estimate.test.ts（always-active 纯函数直测）。
 */

/** 系数 a（CJK 权重——校准批可调，初值冻结） */
export const ESTIMATE_CJK_WEIGHT = 1.0

/** 系数 b（other 权重——校准批可调，初值冻结） */
export const ESTIMATE_OTHER_WEIGHT = 0.25

/** 整数算术分母（a/b 四分母前提下的内部权重基准：cjk=4/other=1） */
const INT_DENOM = 4

/** 码点是否属 CJK 四区间（统一表意/扩展 A/CJK 标点/全角形式） */
export function isCjkCodePoint(cp: number): boolean {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff00 && cp <= 0xffef)
  )
}

/** 估计 token 数=ceil(cjk*a+other*b)；整数实现（n/4 二进制精确+ceil 无舍入面） */
export function estimateTokens(text: string): number {
  let cjk = 0
  let other = 0
  for (const ch of text) {
    if (isCjkCodePoint(ch.codePointAt(0)!)) cjk++
    else other++
  }
  if (cjk + other === 0) return 0
  return Math.ceil((cjk * INT_DENOM + other) / INT_DENOM)
}

/**
 * 截断至估计 token ≤cap 的最长前缀（贪心逐码点，整数权重累计：
 * cjk=4/other=1 对 cap*4 比较——与 estimateTokens 同源算术）。
 * cap≤0 → 空串。
 */
export function truncateToTokens(text: string, cap: number): string {
  if (cap <= 0) return ''
  const budget = cap * INT_DENOM
  let acc = 0
  const kept: string[] = []
  for (const ch of text) {
    const w = isCjkCodePoint(ch.codePointAt(0)!) ? INT_DENOM : 1
    if (acc + w > budget) break
    acc += w
    kept.push(ch)
  }
  return kept.join('')
}
