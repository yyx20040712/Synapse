// b3: P7-G
/**
 * [SR2-AI-01] ai_notes.repo —— AI 语料数据基座（工单：open / strong）
 *
 * ── 行为层 ──
 * - ai_notes 独立表（迁移 003，DDL 唯一真相源）+ 仓储：一行=一锚定段×一问
 *   （N2 粒度，ADR-0015）；自持锚定三元组 quote/prefix/suffix+anchor_page，
 *   与 annotations 表零耦合（D3 独立表彻底化：AI 语料不污染用户标注 schema；
 *   渲染/装配走 verifyQuote 文本重锚既有路径）
 * - role CHECK 约束（'first-read'|'second-read'|'adjudicate'——枚举真相=DDL，
 *   shared/models/ai-note.ts zod 枚举镜像消费，接缝双向锚定声明在两文件头注）；
 *   question 列 v1 取值 'Q1'..'Q7'|'divergence'（七问 v1 冻结，蓝图 §4.2），
 *   DDL 不加 CHECK（应用层校验归 zod——DDL 收窄需迁移，扩展性优先；七问
 *   枚举未来扩展=zod 层变更，shared/models 受锁=[locked-change] 流程）
 * - 级联语义：paper 删→CASCADE；annotation 删→SET NULL（锚定段降级篇级，
 *   语料不丢）；FTS v1 不入（检索面先由 zcode 侧 grep 承担，接入应用搜索
 *   属 P7-E 候选）
 * - **v1 无生产者声明（计划审查 R4，死代码红线豁免依据）**：生产者=测试
 *   夹具（本单）；真实生产者=回灌联动组导入器（AI-07，未开单）；消费者=
 *   语料导出装配（corpus.assemble 的 aiNotes 入参面，AI-03 会话接线）
 *
 * ── 接口层 ──
 * - export interface AiNotesRepo：
 *     insert(input: AiNoteInput): AiNote
 *     updateContent(id: string, contentMd: string): AiNote | null  // updated_at 刷新；v1 无消费方（预留修订场景）
 *     deleteByPaper(paperId: string): number                       // 重灌清面（AI-07 导入器幂等原语）
 *     listByPaper(paperId: string): AiNote[]                       // 导出装配消费（role/question 分组归装配层）
 *     listByRole(paperId: string, role: AiNoteRole): AiNote[]
 *     countByPaper(paperId: string): number
 * - 交付面：migrations/003_ai_notes.sql [受锁新增]+shared/models/ai-note.ts
 *   [受锁新增]+migrate.ts MIGRATIONS 追加（version 3）+repos/index.ts 注册
 *
 * ── 架构层 ──
 * - 分层：repos→db（禁 service 逻辑混入）；行形状蛇形↔驼峰映射收敛在本文件
 * - 依赖：db/connection（SqliteDb）、shared/models/ai-note（类型单源）
 *
 * ── 生命周期层 ──
 * - 预留：AI-07 导入器消费 insert/deleteByPaper（幂等重灌=清面+整套重插）
 * - 不做：annotations 表任何改动（实现 diff 证明零触碰）；model 列枚举冻结
 *   （自由文本——运行时记录实际模型标识，D2b 可配）
 *
 * ── 文化层 ──
 * - repo 同步操作（better-sqlite3 同步语义，异常上抛无折叠面）
 * - 测试：tests/unit/db/repos/ai_notes.repo.test.ts [受锁新增]：insert/
 *   查询（byPaper/byRole）/级联两路径（paper CASCADE/annotation SET NULL）/
 *   role CHECK 拒非法值/updateContent/deleteByPaper
 * - 新增受锁文件（003/ai-note.ts/测试）随实现提交 locks:generate+apply
 *   同步+[locked-change] 尾注（禁跨提交延迟重生成）
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const AI_NOTES_REPO_STUB = 'SR2-AI-01'
