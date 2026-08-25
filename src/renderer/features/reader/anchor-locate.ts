// b3: P7-C
/**
 * [SR2-C-05] anchor-locate —— N1 锚点定位服务（工单：open / strong）
 *
 * ⚠ INV-20 单入口（N2 裁决「三层防线升格验收条款」+N1/N3 共享）：一切跳转
 * 消费方（本单=阅读器片段列表 N1；未来=P7-G AI 面板/LG 脉络侧板 N3）共用
 * locateAnchor，**禁各写降级**。
 *
 * ── 行为层 ──
 * - locateAnchor(target)（骨架 §1 契约形状）：三层防线
 *   ①exact：目标 tab 已开且 ready → setPage(annotation.page) → 等文本层就绪
 *   （.textLayer 存在且 span 入 DOM——rAF 轮询，LOCATE_TEXT_READY_TIMEOUT_MS
 *   =3000 超时按 page 层降级：已在该页、仅无法精确验证）→ verifyQuote
 *   （annotation-anchor 唯一 DOM 遍历点纪律）成功 → 滚动 rect 元素至视野+
 *   闪烁 → 'exact'
 *   ②page：verifyQuote 失败或 findRangeAtOffset 无 rects → 停留该页+toast
 *   「锚定失效，已定位到所在页」→ 'page'
 *   ③paper：target.anchor 为 null（篇级）或 quoteText 空/无 anchorPage →
 *   setPage(0) 开篇 → 'paper'
 * - 跨视图：tab 未开/error 态 → requestOpenPaper（open-paper-bus.ts:17）→
 *   轮询 reader.store tabs[id].status==='ready'（LOCATE_OPEN_TIMEOUT_MS=8s）→
 *   activateTab(id)（定位语义=让用户看见——opening 完成必激活）→ 继续 ①
 * - 定位状态机（宪法状态机前置；态空间×事件全表）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | idle | locate(target)，tab 已开 ready | verifying |
 *   | idle | locate(target)，tab 未开/loading/error | opening |
 *   | opening | tabs[id].status → ready | activating |
 *   | activating | activateTab(id) 完成（同步） | verifying |
 *   | opening | 超时 8s | resolved(paper)+toast「打开超时，已停在当前视图」 |
 *   | verifying | verifyQuote 成功+rects 非空 | resolved(exact)——滚动+闪烁 |
 *   | verifying | verifyQuote 失败/rects 空 | resolved(page)——页级停留+提示 |
 *   | verifying | 文本层就绪超时 3s | resolved(page)（同上降级） |
 *   | verifying | anchor=null/quoteText 空 | resolved(paper) |
 *   | 任意非终态 | 目标 tab 被关闭 | resolved(paper)+无提示（S6——tab 已无展示面，提示即噪音） |
 *   | resolved | （终态，模块无持久态） | 随 Promise 返回归 idle |
 *   - 并发裁决（序号守卫，INV-03 同族）：locate 调用自增 locateSeq；每个迁移步
 *     （opening 完成后的 activateTab、verifying 的滚动/闪烁/提示）执行前校验
 *     序号仍最新，过期即静默作废副作用（不激活不滚动——**后到胜=旧请求的
 *     副作用被守卫截断**，前次 Promise 按已到达层正常 resolve，视觉收敛单点）
 *   - 跨格序列（锁定测试锚定）：
 *     S1 已开同页：免 setPage 直验证（exact 快路径）
 *     S2 已开跨页：setPage → 渲染异步（pageText 未就绪）→ 等待 → 验证
 *     S3 未开：opening → activating → verifying（全链）
 *     S4 opening 中用户切走 activeId：opening 完成后 activateTab(target) 拉回
 *     （定位请求语义=用户显式要求看见该锚）
 *     S5 opening 超时：降级 paper+提示（不抛错——降级链终点是合法结果）
 *     S6 目标 tab 在 opening/verifying 中被 close：作废（上表任意非终态行）
 * - reader.store 接口延展（改动面 reader.store.ts，397 行预算 ≤500 核对）：
 *   requestLocate(paperId, annotation)——setPage(annotation.page)+
 *   pendingLocate={paperId, annotationId, seq}（消费=AnnotationLayer 渲染 pass
 *   后清除；**F-aware 语义「页 P 的锚 R 滚动到视野」——P7-F 连续滚动后仅换
 *   消费实现，本签名与 locateAnchor 均不动**）；noteHighlight={annotationId,
 *   seq}——标注单击反向同步的信号位（下条）
 * - 标注单击反向（N1 方案a）：AnnotationLayer rect onClick（:213）追加
 *   noteHighlight 上报（既有四选项菜单语义零变化——「标注单击=方案a 四选项
 *   菜单+侧栏同步高亮」蓝图 §4.3 原文）；rect 元素增 data-annotation-id
 *   （:207 附近）；**行数守恒预案**：净增 2 行（onClick 一行+属性一行）→
 *   该文件 249/250 恰满，先压缩 2 行注释再入（注释压缩先例已三次）；OutlineAside
 *   消费 noteHighlight：自动切笔记 tab+FragmentNotesList 高亮滚动（C-03
 *   highlightAnnotationId 接缝消费）
 * - 闪烁实现：CSS 动画类（组件内 keyframes 或 tailwind animate——实现自决；
 *   text-layer.css 受锁面能不动则不动）
 *
 * ── 接口层 ──
 * - export interface LocateTarget { paperId: string; anchor: {
 *     quoteText: string; prefixText: string; suffixText: string;
 *     anchorPage?: number } | null }
 * - export type LocateResult = 'exact' | 'page' | 'paper'
 * - export async function locateAnchor(target: LocateTarget): Promise<LocateResult>
 *
 * ── 架构层 ──
 * - reader 域模块（不 import 组件；消费 annotation-anchor.verifyQuote/
 *   open-paper-bus/reader.store/toast-store（Toast 拆分消费指引——.ts 消费方
 *   一律 toast-store，勿撞 jsx 关卡））
 * - 改动面：本文件（新）+reader.store.ts（两信号位+两动作）+AnnotationLayer.tsx
 *   （onClick 一行+data-annotation-id 一行，行数守恒）+OutlineAside.tsx
 *   （noteHighlight 消费 effect，C-04 产物行数预算内）
 *
 * ── 生命周期层 ──
 * - 不做：定位动画队列/跨 tab 批量定位；redo 不适用
 * - P7-F：连续滚动模型落地后仅换「滚动到页 P 的锚 R」消费实现（F-aware 接口
 *   冻结——本头注即裁决记录）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/anchor-locate.test.ts（新文件）：三防线×S1~S6
 *   跨格序列（store 桩+rAF/timeout fake timers）+并发后到胜+INV-20 逐词对齐
 *   用例（消费方禁各写降级——本单只锚服务侧，消费方用例随 P7-G AI 面板与
 *   P7-H 脉络侧板工单）
 * - INV-20 随本单翻**已锚定**（服务单测级；消费方级随后续工单补）；
 *   INV-03 同族核对（pendingLocate 消费带 seq 防陈旧滚动）
 * - 完成后：删除占位导出 → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const ANCHOR_LOCATE_STUB = 'SR2-C-05'
