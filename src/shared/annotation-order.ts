// b3: P7-C
/**
 * [SR2-C-01] annotation-order —— 片段序单源（工单：done / strong）
 *
 * ── 行为层 ──
 * - 「页码:序号」排序键（annotation.ts 头注概念）的机器实现=派生比较器，全序：
 *   ① page 升序（0 基，文档序）→ ② startOffset 升序（页内文本偏移=「序号」）
 *   → ③ createdAt 升序（同段多重标注按创建序——ROADMAP P7-C 验收「文档位置序+
 *   同段创建序」）→ ④ id 字典序（唯一键兜底，全序确定、永无「相等」歧义）
 * - **排序禁字符串字典序**："页码:序号" 字符串形态（sortKeyOf）仅供显示/调试，
 *   比较一律走 compareAnnotations 数值比较——页码跨位数字典序失真（"10:2" <
 *   "2:1" 字典序为真、数值序为假），该反例锁定为用例
 * - sortByDocumentOrder(list)：返回新数组（入参不动——消费方多为 store 态的
 *   派生视图，禁就地改序污染 TabState.annotations 引用语义）；稳定序（同键
 *   保持入参相对序，与 ③④ 兜底共同保证确定性）
 * - 消费面（INV-24 单源）：阅读器片段列表（C-03）与 corpus md 装配
 *   （C-02）同序；未来 AI 装配（P7-G 五件套会话）延展同源
 *
 * ── 接口层 ──
 * - export function compareAnnotations(a: Annotation, b: Annotation): number
 * - export function sortByDocumentOrder(list: readonly Annotation[]): Annotation[]
 * - export function sortKeyOf(a: Annotation): string  // `${page+1}:${startOffset}` 1 基显示
 *
 * ── 架构层 ──
 * - src/shared 跨进程单源（renderer 与 main 同一实现，INV-11/INV-24）；
 *   仅类型 import（./models/annotation），零运行时依赖、零 IO
 * - 受锁路径：变更走 unlock → 改 → 即时 apply，提交带 [locked-change] 尾注
 *
 * ── 生命周期层 ──
 * - 不做：DB sortKey 持久列（annotation schema 已冻结，排序键=派生；写库不加列）
 * - P7-F 连续滚动模型变更不影响本序（文档序语义与渲染几何无关）
 *
 * ── 文化层 ──
 * - 纯函数无失败面（INV-02 不适用——规约记录依据）；禁止 any；文件 ≤120 行
 * - 测试：tests/unit/shared/annotation-order.test.ts：跨页序/同页偏移序/
 *   同偏移创建序/id 兜底/入参不可变/字符串字典序反例（锁定数值比较）
 * - INV-24 已随本单登记 docs/invariants.md（单测锚）
 */
import type { Annotation } from './models/annotation'

/** 文档序全序比较器：页码→页内偏移→创建序→id 兜底（INV-24 单源，禁字符串比较）。
 *  createdAt 用 ASCII 字典序（ISO-8601 按位比较跨环境确定——localeCompare 受
 *  运行 locale 影响威胁全序确定性，deepseek W1 裁决不采） */
export function compareAnnotations(a: Annotation, b: Annotation): number {
  if (a.page !== b.page) return a.page - b.page
  if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** 文档序新数组（入参不动——禁污染 store 态引用语义） */
export function sortByDocumentOrder(list: readonly Annotation[]): Annotation[] {
  return [...list].sort(compareAnnotations)
}

/** "页码:序号" 显示形态（1 基页码——与人读页码及 corpus 装配 p.N 同口径；
 *  仅调试/展示，排序一律走 compareAnnotations 数值比较） */
export function sortKeyOf(a: Annotation): string {
  return `${a.page + 1}:${a.startOffset}`
}
