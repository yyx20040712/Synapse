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
 * - listByPaper/listByRole 基础序=created_at,rowid：**确定性兜底非业务序**
 *   （rowid=SQLite 插入序，同毫秒平局按导入批内顺序决胜——id=随机 uuid 不
 *   可作决胜键，缺陷③ 2026-08-27：导入器同步循环逐条写入（无事务包裹），
 *   快速循环内多行可同毫秒打戳成常态平局，id 决胜=uuid 彩票 flaky；同库
 *   同序维持；锚定段业务序归装配层 AI-03 按 role→question 分组重排，
 *   INV-24 同哲学分工）
 * - **v1 无生产者声明解除（回灌导入工单，2026-08-27）**：生产者=回灌导入器
 *   ai_sensor/ai-notes-import.service（经本 repo insert/deleteByPaper 幂等
 *   重灌）；消费者=语料导出装配（corpus.assemble 的 aiNotes 入参面，AI-03）
 *   + ai-notes/list 读通道（AI-07）
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
import { randomUUID } from 'node:crypto'
import type { AiNote, AiNoteInput, AiNoteRole } from '../../../shared/models/ai-note'
import type { SqliteDb } from '../connection'

export interface AiNotesRepo {
  insert(input: AiNoteInput): AiNote
  updateContent(id: string, contentMd: string): AiNote | null
  deleteByPaper(paperId: string): number
  listByPaper(paperId: string): AiNote[]
  listByRole(paperId: string, role: AiNoteRole): AiNote[]
  countByPaper(paperId: string): number
}

/** ai_notes 表行形状（列名原样，蛇形） */
interface AiNoteRow {
  id: string
  paper_id: string
  annotation_id: string | null
  role: string
  question: string
  model: string
  quote_text: string
  prefix_text: string
  suffix_text: string
  anchor_page: number | null
  content_md: string
  created_at: string
  updated_at: string
}

function toNote(row: AiNoteRow): AiNote {
  return {
    id: row.id,
    paperId: row.paper_id,
    annotationId: row.annotation_id,
    role: row.role as AiNote['role'],
    question: row.question as AiNote['question'],
    model: row.model,
    quoteText: row.quote_text,
    prefixText: row.prefix_text,
    suffixText: row.suffix_text,
    anchorPage: row.anchor_page,
    contentMd: row.content_md,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createAiNotesRepo(db: SqliteDb): AiNotesRepo {
  const insertStmt = db.prepare(
    `INSERT INTO ai_notes (id, paper_id, annotation_id, role, question, model,
       quote_text, prefix_text, suffix_text, anchor_page, content_md, created_at, updated_at)
     VALUES (@id, @paperId, @annotationId, @role, @question, @model,
       @quoteText, @prefixText, @suffixText, @anchorPage, @contentMd, @now, @now)`
  )
  const listByPaperStmt = db.prepare(
    `SELECT * FROM ai_notes WHERE paper_id = ? ORDER BY created_at, rowid`
  )
  const countStmt = db.prepare(`SELECT COUNT(*) AS n FROM ai_notes WHERE paper_id = ?`)
  const byIdStmt = db.prepare(`SELECT * FROM ai_notes WHERE id = ?`)
  const updateContentStmt = db.prepare(
    `UPDATE ai_notes SET content_md = ?, updated_at = ? WHERE id = ?`
  )
  const deleteByPaperStmt = db.prepare(`DELETE FROM ai_notes WHERE paper_id = ?`)
  const listByRoleStmt = db.prepare(
    `SELECT * FROM ai_notes WHERE paper_id = ? AND role = ? ORDER BY created_at, rowid`
  )

  return {
    insert(input: AiNoteInput): AiNote {
      const now = new Date().toISOString()
      const note: AiNote = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
      insertStmt.run({
        id: note.id,
        paperId: note.paperId,
        annotationId: note.annotationId,
        role: note.role,
        question: note.question,
        model: note.model,
        quoteText: note.quoteText,
        prefixText: note.prefixText,
        suffixText: note.suffixText,
        anchorPage: note.anchorPage,
        contentMd: note.contentMd,
        now
      })
      return note
    },

    updateContent(id: string, contentMd: string): AiNote | null {
      const row = byIdStmt.get(id) as AiNoteRow | undefined
      if (row === undefined) return null
      const now = new Date().toISOString()
      updateContentStmt.run(contentMd, now, id)
      return { ...toNote(row), contentMd, updatedAt: now }
    },

    deleteByPaper(paperId: string): number {
      return deleteByPaperStmt.run(paperId).changes
    },

    listByPaper(paperId: string): AiNote[] {
      return (listByPaperStmt.all(paperId) as AiNoteRow[]).map(toNote)
    },

    listByRole(paperId: string, role: AiNoteRole): AiNote[] {
      return (listByRoleStmt.all(paperId, role) as AiNoteRow[]).map(toNote)
    },

    countByPaper(paperId: string): number {
      return (countStmt.get(paperId) as { n: number }).n
    }
  }
}
