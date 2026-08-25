// b3: P7-C
/**
 * [SR2-C-01] annotation-order —— 片段序单源（工单：open / strong）
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
 * - 消费面（INV-24 单源）：阅读器片段列表（SR2-C-03）与 corpus md 装配
 *   （SR2-C-02）同序；未来 AI 装配（P7-G 五件套会话）延展同源
 *
 * ── 接口层 ──
 * - export function compareAnnotations(a: Annotation, b: Annotation): number
 * - export function sortByDocumentOrder(list: readonly Annotation[]): Annotation[]
 * - export function sortKeyOf(a: Annotation): string  // `${page}:${startOffset}` 仅显示
 *
 * ── 架构层 ──
 * - src/shared 新文件（跨进程单源：renderer 与 main 同一实现，INV-11/INV-24）；
 *   仅类型 import（@shared/models/annotation），零运行时依赖、零 IO
 * - 受锁路径新增：locks:generate + apply 随本工单实现提交 [locked-change]
 *
 * ── 生命周期层 ──
 * - 不做：DB sortKey 持久列（annotation schema 已冻结，排序键=派生；写库不加列）
 * - P7-F 连续滚动模型变更不影响本序（文档序语义与渲染几何无关）
 *
 * ── 文化层 ──
 * - 纯函数无失败面（INV-02 不适用——规约记录依据）；禁止 any；文件 ≤120 行
 * - 测试：tests/unit/shared/annotation-order.test.ts（新文件）：跨页序/同页偏移
 *   序/同偏移创建序/id 兜底/入参不可变/字符串字典序反例（锁定数值比较）
 * - INV-24 随本工单登记 docs/invariants.md（未锚定→实现后单测锚）
 * - 完成后：删除占位导出 → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const ANNOTATION_ORDER_STUB = 'SR2-C-01'
