// b3: P7-G
/**
 * [SR2-AI-09] AiAnnotationLayer —— AI 标注渲染对等（重锚同管线/存储独立/
 * v1 只读，工单：open / strong）
 *
 * ── 行为层 ──
 * - N2 渲染对等（ADR-0015 §3）：AI 锚定段经 verifyQuote 重锚（annotation-
 *   anchor.ts:130——**唯一 DOM 遍历点纪律**，C-05 头注先例）取得 rects →
 *   rectsFromRange+mergeLineRects 同几何管线渲染高亮块——**几何对等**=
 *   与 AnnotationLayer 同一几何函数族（不另写几何）；分色=ai-note-style
 *   单源（AI-08 交付，question→CSS 变量；接缝双向锚定声明两文件头注）
 * - 数据源：ai-notes/list（AI-07 通道）按当前篇取 AI 笔记 → 有锚三元组行
 *   参与重锚；重锚失败（verifyQuote 假）→**该段不渲染 rects**（段仍在 08
 *   面板；跳转降级归 INV-20 locateAnchor 三防线，渲染面禁各写降级）；
 *   篇级/无锚行（Q3/Q6/Q7 允许——蓝图 §4.3 N2/ADR-0015 §3）天然无 rects 不入层
 * - **存储独立**（INV-19 本单锚定）：数据永不写 annotations 表（AI 笔记
 *   仅源自 ai_notes 渲染派生——实现 diff 证明 annotations 写面零触碰）；
 *   **v1 只读**：无编辑/删除/创建写路径；点击=高亮该段全部 rects+跳笔记
 *   面板对应条目（highlightAiNoteId 上抛→08 分节滚动高亮——C-05 标注单击
 *   反向同步同型；点击**不弹标注菜单**——AI 段无批注语义）
 * - 渲染节点带 **data-ai-note-id** 属性（exact 层滚动目标——anchor-locate
 *   延展见交付面，W08-3 处置对侧）
 * - **硬依赖声明（门一 W09-1 处置）**：消费 AI-08 两交付物（ai-note-style
 *   分色单源+ai-notes.store 数据单源）——**执行序=08 先于 09 串行**（v5
 *   「08∥09」偏序因共享交付物细化为定序；registry 注释同步）
 * - INV-20 三层防线（消费方级用例归 AI-08——门一 W09-2 处置：本层点击=
 *   跳面板非 PDF 定位，三防线断言在 08 行为面才可执行；本层锚定失效渲染
 *   降级=不渲染 rects，跳转降级单入口 locateAnchor 不在本层复制）
 * - 渲染时机：与 AnnotationLayer 同渲染周期（文本层就绪后重锚——挂载/
 *   翻页/缩放跟随既有层节奏；重锚结果组件本地缓存按 paperId+页键失效）
 *
 * ── 接口层 ──
 * - export function AiAnnotationLayer(props: { aiNotes: AiNote[];
 *     onJumpToNote(aiNoteId: string): void }): JSX.Element（data-ticket 骨架
 *   标记，翻 done 前移除；aiNotes 由 ReaderPage/面板层供给——数据获取不
 *   在本层，渲染纯消费）
 * - 交付面：ReaderPage 挂载（与 AnnotationLayer 同宿主并置）+
 *   ai-note-style 消费声明+**anchor-locate.ts 延展**（exact 层滚动目标
 *   选择器扩 [data-ai-note-id]——C-05 文件延展**非另写降级**，INV-20 单
 *   入口与三防线结构不动，仅扩 exact 层目标识别面；延展用例入本单测试面）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域；依赖 annotation-anchor（verifyQuote/
 *   rectsFromRange/mergeLineRects——纯函数族）+ai-note-style（08 交付）+
 *   AiNote 类型（shared 单源）；**零 DB/零 IPC 直调**（数据经 props——
 *   数据单源=ai-notes.store（AI-08 交付），宿主 ReaderPage 订阅分发，
 *   本层禁自取，接缝双向锚定声明两文件头注）
 *
 * ── 生命周期层 ──
 * - 预留：AI 段显隐开关（工具栏消费面）；rects 缓存失效粒度细化
 * - 不做：AI 段编辑/删除/批注化（INV-19 只读锚定）；annotations 表任何
 *   写（含「AI 段转标注」转换面——如需=P8+ 另裁）；md 渲染
 *
 * ── 文化层 ──
 * - 错误：重锚失败=静默跳过该段渲染（数据本就只读——非错误态不 toast；
 *   「锚定失效」提示归 INV-20 跳转面职责，禁双提示）；层级 IO 零（props
 *   纯消费——无错误面新增）
 * - 测试：tests/unit/renderer/ai-annotation-layer.test.tsx [受锁新增]——
 *   verifyQuote 真→rects 渲染+分色类名（ai-note-style 映射）/重锚失败→
 *   该段零 rects 且他段不受扰/篇级无锚行不入层/点击→高亮+onJumpToNote
 *   上抛/只读断言（无菜单无编辑元素）；anchor-locate 延展用例（data-ai-
 *   note-id 目标 exact 滚动+闪烁，data-annotation-id 既有行为不回归）；
 *   重锚缓存失效（翻页后重算）用例
 * - e2e：随 08 spec 同链（fixture 导入含锚行→阅读器 AI 高亮块可见+点击
 *   跳面板——渲染真实文本断言，宪法 e2e 纪律）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 data-ticket 与占位 → npm run verify 绿 → 人工审查
 *   git diff → 翻 registry
 */
import type { AiNote } from '@shared/models/ai-note'

export function AiAnnotationLayer(_props: {
  aiNotes: AiNote[]
  onJumpToNote(aiNoteId: string): void
}): JSX.Element {
  return <div data-ticket="SR2-AI-09" />
}
