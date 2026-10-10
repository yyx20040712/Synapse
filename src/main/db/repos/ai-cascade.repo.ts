/**
 * [F-DBCAMP-01 DB-2 U2] ai-cascade.repo —— 随锚级联预览计数原语（两次确认
 * 第一跳的计数面；级联删除本体=020 papers/collections_ai_anchor_cascade 触发器
 * ——设计稿 §1.6，本层零删除语句，P2 预裁）。
 *
 * ── 行为层 ──
 * - countPaperAnchor/countLineageAnchor：单锚四计数（同语句异参——scope 经绑定
 *   参数）——sessions=COUNT ai_sessions（scope+anchor_id，**含空会话**=N-4 诚实
 *   计数）/messages=COUNT ai_messages（session_id IN 该 sessions 子查询）/
 *   memories+tasks=同锚直计。
 * - countFolder：folder 双面合计——夹内 papers（papers WHERE folder_id=?）的
 *   paper 档四计数+该夹 id 的 lineage 档四计数（单聚合语句 OR 谓词承载——
 *   与两面单查逐字段等价，C2 用例对账锁定）。
 *
 * ── 文化层 ──
 * - 两条固定聚合语句（标量子查询），参数全绑定（named @a/@s 多次出现绑定一次
 *  ——better-sqlite3 named binding）——零值拼接进 SQL 文本。
 * - 测试：tests/unit/services/ai-cascade.service.test.ts（经 service/Repos 面
 *  承载——本件无独立测试文件，ai-task-audit.repo 同型）。
 */
import type { SqliteDb } from '../connection'

/** 四计数形状（IPC=aiCascadeCountsSchema 同构——DB 侧本件自持） */
export interface AiCascadeCountsRow {
  sessions: number
  messages: number
  memories: number
  tasks: number
}

export interface AiCascadeRepo {
  /** paper 档单锚四计数（含空会话） */
  countPaperAnchor(anchorId: string): AiCascadeCountsRow
  /** lineage 档单锚四计数（含空会话） */
  countLineageAnchor(anchorId: string): AiCascadeCountsRow
  /** folder 双面合计四计数（夹内 papers 的 paper 档+夹 id 的 lineage 档） */
  countFolder(folderId: string): AiCascadeCountsRow
}

export function createAiCascadeRepo(db: SqliteDb): AiCascadeRepo {
  const anchorCountStmt = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM ai_sessions WHERE scope = @s AND anchor_id = @a) AS sessions,
       (SELECT COUNT(*) FROM ai_messages WHERE session_id IN
          (SELECT id FROM ai_sessions WHERE scope = @s AND anchor_id = @a)) AS messages,
       (SELECT COUNT(*) FROM ai_memory WHERE scope = @s AND anchor_id = @a) AS memories,
       (SELECT COUNT(*) FROM ai_tasks WHERE scope = @s AND anchor_id = @a) AS tasks`
  )
  // folder 面：paper 档锚集=夹内 papers 子查询；lineage 档锚=夹 id（OR 谓词双面合计）
  const folderStmt = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM ai_sessions WHERE (scope = 'paper' AND anchor_id IN
          (SELECT id FROM papers WHERE folder_id = @a)) OR (scope = 'lineage' AND anchor_id = @a)) AS sessions,
       (SELECT COUNT(*) FROM ai_messages WHERE session_id IN
          (SELECT id FROM ai_sessions WHERE (scope = 'paper' AND anchor_id IN
             (SELECT id FROM papers WHERE folder_id = @a)) OR (scope = 'lineage' AND anchor_id = @a))) AS messages,
       (SELECT COUNT(*) FROM ai_memory WHERE (scope = 'paper' AND anchor_id IN
          (SELECT id FROM papers WHERE folder_id = @a)) OR (scope = 'lineage' AND anchor_id = @a)) AS memories,
       (SELECT COUNT(*) FROM ai_tasks WHERE (scope = 'paper' AND anchor_id IN
          (SELECT id FROM papers WHERE folder_id = @a)) OR (scope = 'lineage' AND anchor_id = @a)) AS tasks`
  )

  return {
    countPaperAnchor(anchorId) {
      return anchorCountStmt.get({ s: 'paper', a: anchorId }) as AiCascadeCountsRow
    },
    countLineageAnchor(anchorId) {
      return anchorCountStmt.get({ s: 'lineage', a: anchorId }) as AiCascadeCountsRow
    },
    countFolder(folderId) {
      return folderStmt.get({ a: folderId }) as AiCascadeCountsRow
    }
  }
}
