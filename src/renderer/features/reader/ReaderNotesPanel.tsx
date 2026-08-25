// b3: P7-C
/**
 * [SR2-C-03] ReaderNotesPanel —— 阅读器笔记面板（α 双层，工单：open / strong）
 *
 * ── 行为层 ──
 * - α 双层落地面（B3 裁决 1：片段层=标注锚定+总评层=论文级综述，迁移阅读器
 *   侧栏修复可发现性）：
 *   · 总评层：textarea+标题（notes.store.load/edit/saveSoon 消费——**五模块
 *     编辑元数据结构与 ADR-0008 裁决不动，不坍缩不新增维度**）；本组件与库侧
 *     NotesPanel 同语义：挂载/paperId 变化即 load（动作型失败 toast+载入重试）；
 *     迟到失败比对 paperIdRef 丢弃；保存状态四态消费 deriveSaveStatus/
 *     detectSaveFailed（纯函数自 NotesPanel.tsx:40-63 **原样迁移**至
 *     src/renderer/shared/save-status.ts——renderer/shared 一切 feature 可下沉
 *     消费（check-quality 规则原文）；NotesPanel.tsx 改 re-export 保库侧编译
 *     （C-06 随面板删除）；notes-panel-status.test.ts 仅改 import 路径
 *     [locked-change]，断言零改动）
 *   · 片段层：FragmentNotesList 子组件（本单新文件，独立可测）：
 *     sortByDocumentOrder(annotations)（SR2-C-01 单源）序渲染；每条=kind 色点+
 *     quote 首行截断+comment 摘要；单击条目 → onLocate(annotation.id)（本单
 *     消费方仅回调上抛——接缝在 SR2-C-04 接页级、SR2-C-05 升三层防线）；
 *     highlightAnnotationId 条目高亮+scrollIntoView（C-05 标注单击反向同步的
 *     消费面）
 *   · 空态：无标注显示「在正文中划选即可添加片段笔记」
 * - per-tab 语义（U2 教训·宪法状态机前置——不新增状态机）：草稿态住
 *   notes.store.noteByPaper（按 paperId 键控字典，切 tab 不失忆——store 既有
 *   形状）；组件随 active tab 重挂/换 paperId 触发 load（五模块合并保护既有：
 *   pendingEdit 路径保用户字段、防抖窗口内切走切回不误显已保存——U2/A4 锁定
 *   用例覆盖，本单复用不重造）；面板本地态仅 loadFailed/saveFailed 两布尔
 *   （NotesPanel 同形）；**本单不新增任何 notes.store 字段**
 * - notes 面 dirty 投影（TABS-03 既有）零改动——noteByPaper[paperId].pending
 *   语义自动覆盖阅读器编辑面
 *
 * ── 接口层 ──
 * - export function ReaderNotesPanel(props: { annotations: Annotation[];
 *     onLocate(annotationId: string): void; highlightAnnotationId?: string | null }): JSX.Element
 * - export function FragmentNotesList(props: 同上子集（annotations/onLocate/
 *     highlightAnnotationId）): JSX.Element
 * - paperId 经 useActiveTab 自取（组件挂在 active tab 视图内——props 不传
 *   paperId，避免双源）
 *
 * ── 架构层 ──
 * - reader feature；import notes/notes.store 经 check-quality.mjs 白名单**增列**
 *   `reader/ReaderNotesPanel.tsx → notes/notes.store` [locked-change]
 *   （tab-dirty.ts:43 同型先例——notes.store 不迁不动，归属 notes 域维持）
 * - 改动面：本文件+FragmentNotesList.tsx（新）+shared/save-status.ts（新，
 *   迁移）+notes/NotesPanel.tsx（改 re-export）+notes-panel-status.test.ts
 *   （受锁 [locked-change] 路径迁移）+scripts/check-quality.mjs（受锁
 *   [locked-change] 白名单）
 *
 * ── 生命周期层 ──
 * - 预留：P7-G AI 面分节（AiNotesSection 随 AI 面板工单并入本面板下部分节——
 *   骨架 §2 notes-panel 三件指针）
 * - 不做：Markdown 预览/编辑器库（负面清单——textarea 即可）；片段层行内编辑
 *   （批注写面唯一=标注菜单→AnnotationEditor，双写面红线）
 *
 * ── 文化层 ──
 * - 组件级测试 tests/unit/renderer/reader-notes-panel.test.tsx（新文件）：总评层
 *   载入/编辑/保存四态（save-status 迁移后复用）；片段层序消费（C-01 比较器
 *   产物）/单击回调/空态/高亮滚动
 * - textarea 焦点下原生 undo=既有 keymap editable 避让（P7-A 已锚，
 *   reader-shortcuts.test 既有语义——本单不重测，头注声明依据）
 * - 组件 ≤250 行（两层拆 FragmentNotesList 正为守恒）；完成后：删除占位实现 →
 *   npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架占位（实现单元替换为真实实现） */
export function ReaderNotesPanel(): JSX.Element {
  return <div data-ticket="SR2-C-03">SR2-C-03 阅读器笔记面板（骨架占位）</div>
}
