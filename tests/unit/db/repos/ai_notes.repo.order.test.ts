/**
 * [缺陷③回归锁] ai_notes 列表序确定性 —— 同 created_at 平局按插入序（rowid）决胜。
 * 背景（docs/reports/2026-08-27_visual-check-findings.md 发现 3）：repo 生成的
 * id=随机 uuid 曾作平局决胜键 → 导入器同步循环逐条写入（无事务包裹；快速
 * 循环内多行可同毫秒打戳）顺序=uuid 彩票
 * （存量 flaky：ai-notes-import「无 archive 首导」notes[0] 间歇翻转）。
 * 合约：`ORDER BY created_at, rowid`——rowid=SQLite 插入序，同毫秒平局按导入
 * 批内顺序决胜，同库同序确定化（头注「确定性兜底非业务序」语义维持——业务
 * 序仍归装配层 role→question 分组重排，INV-24 分工不变）。
 *
 * 夹具法：db.prepare 直插两行（绕过 repo 的 id/时间戳生成），created_at 刻意
 * 同值、id 刻意与插入序字典序相反（先插 'z-first' 后插 'a-second'）——对
 * id 决胜的旧实现必红（id 序会给出 a-second 在前），对 rowid 决胜必绿。
 *
 * 激活方式（ADR-0017）：always-active 裸 describe，不经 guardedDescribe——
 * 缺陷回归锁恒开（恒绿和随机绿一样危险）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createAiNotesRepo } from '../../../../src/main/db/repos/ai_notes.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'

describe('ai_notes.repo 列表序确定性（缺陷③：同 created_at 平局=rowid 插入序决胜）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createAiNotesRepo>

  /** 直插一行 ai_notes（绕过 repo 的 id/created_at 生成——平局夹具单源） */
  const seedNote = (id: string, createdAt: string): void => {
    db.prepare(
      `INSERT INTO ai_notes (id, paper_id, annotation_id, role, question, model,
         quote_text, prefix_text, suffix_text, anchor_page, content_md, created_at, updated_at)
       VALUES (?, 'p-1', NULL, 'first-read', 'Q1', 'm', '', '', '', NULL, '', ?, ?)`
    ).run(id, createdAt, createdAt)
  }

  beforeEach(() => {
    db = createTestDb()
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
    ).run('p-1', 'a.pdf', 's-1', 't', 't')
    repo = createAiNotesRepo(db)
    // 插入序：z-first → a-second；id 字典序与插入序刻意相反
    seedNote('z-first', '2026-08-27T00:00:00.000Z')
    seedNote('a-second', '2026-08-27T00:00:00.000Z')
  })

  it('listByPaper：同 created_at 平局按插入序决胜（非 id 字典序）', () => {
    const list = repo.listByPaper('p-1')
    expect(list).toHaveLength(2)
    expect(list.map((n) => n.id)).toEqual(['z-first', 'a-second'])
  })

  it('listByRole：同 created_at 平局按插入序决胜（非 id 字典序）', () => {
    const list = repo.listByRole('p-1', 'first-read')
    expect(list).toHaveLength(2)
    expect(list.map((n) => n.id)).toEqual(['z-first', 'a-second'])
  })
})
