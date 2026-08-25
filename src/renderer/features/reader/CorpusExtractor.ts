// b3: P7-G
/**
 * [SR2-AI-02] CorpusExtractor —— 全文/图提取器（工单：open / strong）
 *
 * ── 行为层 ──
 * - App 层监听 exportCorpus 事件（useExportCorpusEvents 挂载，AI-04 交付），
 *   收 {type:'extract-request', sessionId, paperId, url} → 自持 pdfjs 文档
 *   生命周期：getDocument(url)→逐页提取→destroy（R2 裁决：不复用 ReaderPage
 *   句柄——句柄在组件 state 模块外不可达；getDocument 无跨调用缓存；与
 *   阅读器挂载态零耦合）
 * - fulltext：全页 getTextContent items 拼接，页界 \f；逐页 invoke
 *   export/corpus-item {kind:'fulltext', page, payload} 回传
 * - figures：page-N.png（离屏 canvas 全页快照，R7）+anno-<id>.png（WADM
 *   归一化 rects 从页图裁）——anno 图随标注所在页同批回传；快照分辨率=
 *   EXPORT_SNAPSHOT_SCALE 常量（模块导出单源，v1=2.0——PDF 矢量放大不失真，
 *   多模态 OCR 友好；测试断言 PNG 尺寸=页原始尺寸×常量）
 * - 背压（母本 ai-module-plan §2.2）：每页一 invoke，await ack 后发下一页
 *   （禁大 payload 整块）；篇毕 {kind:'complete'}｜{kind:'error', reason}
 * - 事件桥**单向**（R3）：main→renderer 事件仅 extract-request/progress 两
 *   载荷形态；renderer→main 一律常规 invoke（export/corpus-item——zod 校验
 *   +Result 折叠，api-surface 事件通道单向声明不变）
 * - 状态机（renderer 侧提取器；会话全表母本=ai-plan-review §6，main 侧会话
 *   态归 AI-03——两层互指单源，禁两处复写全表）态空间×事件迁移全表：
 *   | 当前态 | 事件 | 迁移 | 动作/守卫 |
 *   | --- | --- | --- | --- |
 *   | idle | extract-request | →extracting | getDocument(url) 起拉；sessionId 记录 |
 *   | extracting | fulltext 页数据就绪 | extracting | invoke corpus-item{kind:'fulltext'}，await ack 后再取下页（背压） |
 *   | extracting | figure 就绪（页快照/anno 裁剪） | extracting | invoke corpus-item{kind:'figure'} 同上背压 |
 *   | extracting | 篇毕（末页 ack 完成） | →done | invoke corpus-item{kind:'complete'}；destroy；→idle |
 *   | extracting | 文档加载失败/invoke 折叠错误/提取异常 | →failed | invoke corpus-item{kind:'error',reason}；destroy（失败也释放）；→idle |
 *   | extracting | 第二 extract-request 到达 | extracting（忽略） | 防御分支——main 编排保证串行（上一篇 complete/error 后才发下一篇），该分支仅防事件重发；sessionId 不同=日志+忽略 |
 *   | done/failed | （瞬时态） | →idle | 上报后立即回 idle（无驻留终态——终态语义在 main 侧会话） |
 *   跨格序列（审计面）：①篇失败→error 上报→idle→main 下一篇请求正常接续
 *   ②destroy 失败不阻断（尽力而为+console 日志，无 UI 面——文档对象已 detach
 *   即可）③全链多篇=extracting↔idle 交替，无跨篇状态残留
 *
 * ── 接口层 ──
 * - export function createCorpusExtractor(deps): CorpusExtractor（deps 注入
 *   invoke/getDocument 端点——测试桩面）；export const EXPORT_SNAPSHOT_SCALE
 * - corpusItemSchema（export/corpus-item Req，随本单入 schemas [受锁]）：
 *   { sessionId, paperId, kind: 'fulltext'|'figure'|'complete'|'error',
 *     page?: number（1 基，fulltext/figure 页号）, figure?: 'page'|'anno'
 *     （figure 子类）, annotationId?: string（anno 图裁剪源标注）,
 *     payload?: string（fulltext=该页文本；figure=base64 PNG）,
 *     reason?: string（error 失败原因） }
 * - pdfjs-dist 运行时 import 白名单第三成员（INV-16——白名单=PdfCanvas/
 *   TextLayer/CorpusExtractor 三文件清单；本单落地 ESLint 规则即 INV-16
 *   由未锚定翻已锚定）：仅许三文件运行时 import pdfjs-dist——ESLint
 *   no-restricted-imports 机器锚（eslint.config.js [locked-change] 随本单）；
 *   类型消费循 PdfCanvas 再导出模式（白名单内惯例）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域（pdfjs 消费惯例域）；零 React 组件面（纯
 *   TS 模块——监听归 App 层 hook）
 * - IPC 契约 [受锁]：api-surface EVENT_CHANNELS 增 exportCorpus+schemas 增
 *   corpusItemSchema（export/corpus-item 通道）+preload/env.d.ts 同源
 *   onExportCorpus——[locked-change]
 * - 接缝归责（R1/R10）：PdfCanvas.tsx「唯一允许」与 TextLayer.tsx「唯一…」
 *   两处头注措辞随本单改白名单表述（行号漂移——按符号锚 not 行号）
 *
 * ── 生命周期层 ──
 * - 不做：取消 UI（v1 极简——会话单飞拒绝归 AI-03）；阅读器句柄复用（R2
 *   废除假设）；对象级图像 XObject 提取（ADR-0011 边界）
 *
 * ── 文化层 ──
 * - 错误反馈两型：提取失败=error 载荷上抛 main 会话（会话 toast 归 AI-04）；
 *   本模块无独立 UI 面
 * - 测试：tests/unit/renderer/corpus-extractor.test.ts：多页夹具页界 \f/
 *   文本序/全页快照+裁剪 rects 归一化数学断言（离屏 canvas mock）/事件
 *   通道契约三面/背压序（逐页 await ack）/状态机跨格序列
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const CORPUS_EXTRACTOR_STUB = 'SR2-AI-02'
