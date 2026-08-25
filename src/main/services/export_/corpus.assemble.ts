// b3: P7-C
/**
 * [SR2-C-02] corpus.assemble —— corpus md 装配纯函数（工单：open / strong）
 *
 * ⚠ 装配单源条款（计划审查 R12，红线）：本文件是 corpus md 装配的**唯一纯函数源**。
 * P7-G 五件套导出会话工单（ai-module-plan 序列三——manifest/INTERFACE/fulltext/
 * figures 编排层）只能在本文件**延展**（签名增参与 [ai:*] 节装配），禁止在
 * corpus.export.service 或任何别处另写一套 md 装配——两套装配=INV-11
 * 违例。消费侧新增（P7-G 回灌联动组语料）同样只经本函数。
 *
 * ── 行为层 ──
 * - assembleCorpusMd(input)：单篇语料 md 装配（ADR-0011 v1.1 全口径——文档=
 *   docs/adr/0011-md-corpus-interface-contract.md（含文末 v1.1 修订记录六项），
 *   验收细目来源）：
 *   · front-matter（YAML）：schemaVersion: 1 / paperId / title / authors / year /
 *     venue / doi / source / citationKey（复用 bibtex.serializer.makeCitationKey）/
 *     annotationCount / noteCount——**不含 exportedAt**（INV-17：时间戳只进
 *     manifest，per-paper md 字节幂等）；可选含金量字段 citedByCount/venueTier
 *     （enrich 域既有缓存数据可得则装配，不可得整个键省略；新增字段必须可选）
 *   · 正文三段序（ADR-0011 §正文结构）：①总评层一节（note 存在时：标题+
 *     contentMd；无 note 省略整节）→ ②片段层：sortByDocumentOrder(annotations)
 *     （SR2-C-01 单源序）逐条 `> 引文原文` + `（p.<1 基页码>）` 标注 + 缩进批注
 *     行 `[user] <comment>`（comment 空则省略批注行）→ ③[ai:*] 段：aiNotes
 *     入参按序追加 `[ai:<source>] <内容>` 缩进段——**v1 生产者=测试夹具**
 *     （真实生产者随 P7-G 回灌联动工单落地；本装配位先行使语法成形）
 *   · 页码基准：引文块 p.N 为 1 基显示（存储 0 基——Annotation.page；口径声明
 *     处=本头注，AI-03 的 INTERFACE.md 同口径复述）
 *   · 幂等：同输入逐字节稳定（无时间戳/无随机/序全由比较器与入参序决定）——
 *     即 INV-17「contentSha=文件字节 sha256 幂等基线」的装配层前提（sha 计算
 *     归 P7-G 会话工单，本单 golden 断言两次调用逐字节全等）；空集（无 note
 *     无标注）=仅 front-matter 合法产物
 * - 前缀常量单源：CORPUS_USER_PREFIX='[user]'/corpusAiPrefix(source)——语法
 *   变更=改这里+[locked-change]（schemaVersion 联动评估）
 * - export.service 延伸（本单改动面）：buildCorpus(paperId)（取数 detail+
 *   annotations+note → 装配字符串；NOT_FOUND 抛域错误同 buildReport 先例）；
 *   buildCorpusSet()（全库 papers.repo.listAllIds() 逐篇装配 → {entries,
 *   skipped: [{paperId, reason}]}——单篇取数失败跳过收集**不中断**全库，
 *   skipped 即失败清单，INV-02 可见性由消费方 toast 承载）
 * - ipc/export_ 延伸（本单改动面）：corpus 通道（单篇：装配 → dialogs.saveFile
 *   `<title 安全化>.md` → writeToFile，取消=CANCELLED——exportTo 先例）；corpusSet
 *   通道（全库：装配全部 → dialogs.pickFolder（null=取消 → CANCELLED，同
 *   saveFile 语义）→ **先 mkdir `<目录>/corpus`（recursive）** 再逐篇写
 *   `<目录>/corpus/<paperId>.md`；写盘失败抛 IO_ERROR 中断（已写文件留盘，
 *   重跑覆盖——无 manifest 概念，会话协议归 P7-G INV-18）；成功 Res 的 count=
 *   成功篇数，skipped 非空由消费方成功 toast 附「跳过 M 篇」）
 * - schemas.ts/api-surface.ts 增 corpus（corpusReqSchema {paperId}）/corpusSet
 *   （空对象 schema）两通道与 Res（exportResSchema 复用）[locked-change]
 * - 入口（本单改动面）：PaperDetailPanel runAction 增 'corpus'+按钮「导出语料
 *   md」（符号锚=runAction 'bibtex' 分支与「导出 BibTeX」按钮邻位——bibtex
 *   同型；开单时行号 :87/:190-211，C-06 实现行号会漂，以符号锚为准）；
 *   LibraryPage 头部按钮「导出语料集合」（全库——v1 无选择语义，验收=手动视检）
 *
 * ── 接口层 ──
 * - export interface AiNoteEntry { source: string; content: string; page?: number }
 * - export interface CorpusAssembleInput { paper: PaperDetail; note: Note | null;
 *   annotations: Annotation[]; aiNotes?: AiNoteEntry[] }
 * - export function assembleCorpusMd(input: CorpusAssembleInput): string
 * - export const CORPUS_USER_PREFIX / export function corpusAiPrefix(source): string
 *
 * ── 架构层 ──
 * - main services/export_/ 纯函数：零 IO、零 Electron、零出网；import
 *   @shared/annotation-order + bibtex.serializer.makeCitationKey + shared 模型
 * - 改动面：本文件（新建）/export.service.ts/papers.repo.ts（listAllIds 只读，
 *   预编译，repo 行数预算 ≤300 核对）/ipc/export_.ts/shared/ipc/schemas.ts+
 *   api-surface.ts（受锁 [locked-change]）/PaperDetailPanel.tsx/LibraryPage.tsx
 *
 * ── 生命周期层 ──
 * - 不做：manifest.json/INTERFACE.md/fulltext/figures（P7-G 五件套会话——
 *   INV-18 终局单写+清空重建+单飞协议）；不做增量导出（v1 全量）；不做 md 回写
 * - P7-G 消费侧只依赖本装配+未来 INTERFACE.md，不依赖 DB 内部结构（ADR-0011 后果）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/corpus.assemble.test.ts（新文件）：golden 固定夹具
 *   逐字节比对/幂等两次调用全等/结构断言（front-matter 字段齐、无 exportedAt、
 *   引文块数=DB 标注数、序=sortKey 序、[user]/[ai:*] 前缀）+ export_.test 扩展
 *   （受锁 [locked-change]：corpus 取消 CANCELLED/corpusSet 目录写入路径）
 * - INV-17 幂等口径随本单部分锚定（装配级 golden；会话级随 AI-03 补全）
 * - 完成后：删除占位导出 → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const CORPUS_ASSEMBLE_STUB = 'SR2-C-02'
