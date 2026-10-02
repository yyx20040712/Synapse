/**
 * [F-UIRES-01 批 B] papers/delete 通道 service 矩阵（真库——设计稿 §2.4
 * 统一级联契约+S1 队列闸+事务内重验=零比对直删）。
 *
 * 覆盖（一致性矩阵服务面）：删无节点文献（papers 行灭+FTS 影子表残留零——
 * 001:94 papers_fts_ad 触发器主控补证面）/删有节点文献（lineage_nodes 灭+
 * lineage_edges 二跳灭+幽灵边对端节点不受影响）/子行全级联（notes/
 * annotations/paper_tags/ai_notes 各一行→删后全灭）/NOT_FOUND/INV-91 pending
 * 拒（CONFLICT+零库副作用）/事件双播（成功恰一次+拒绝零播）/通道契约
 * （api-surface papers.delete Req strict 负锚+通道名）。
 * always-active（不经 guardedDescribe——K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRepos } from '../../../src/main/db/repos'
import { createPapersService } from '../../../src/main/services/library.service'
import { API_SURFACE } from '../../../src/shared/ipc/api-surface'
import { createTestDb } from '../../utils/fixtures'
import type { SqliteDb } from '../../../src/main/db/connection'

describe('F-UIRES-01 批 B papers/delete 统一级联矩阵（§2.4——真库）', () => {
  let db: SqliteDb
  let repos: ReturnType<typeof createRepos>
  let papers: ReturnType<typeof createPapersService>
  let pending: boolean
  let foldersChanged: ReturnType<typeof vi.fn>
  let lineageChanged: ReturnType<typeof vi.fn>

  function seedPaper(id: string): void {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, title, year, abstract, authors_json, added_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, 2024, `摘要${id}`, '["作者"]', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
  }

  function count(table: string, where = '', ...params: unknown[]): number {
    return (db.prepare(`SELECT COUNT(*) c FROM ${table}${where}`).get(...params) as { c: number }).c
  }

  beforeEach(() => {
    db = createTestDb()
    repos = createRepos(db)
    pending = false
    foldersChanged = vi.fn()
    lineageChanged = vi.fn()
    papers = createPapersService({
      repos,
      lineagePending: () => pending,
      sendFoldersChanged: foldersChanged,
      sendLineageChanged: lineageChanged
    })
  })

  /** FTS 命中探针（外容表直查列展开踩 authors≠authors_json 坑——沿
   * migrate.test.ts 先例经 MATCH 查询断言；term=种子题名全串） */
  function ftsHit(term: string): unknown {
    return db.prepare('SELECT rowid FROM papers_fts WHERE papers_fts MATCH ?').get(`"${term}"`)
  }

  it('删无节点文献：papers 行灭+FTS 影子表残留零（papers_fts_ad 触发器承担）', async () => {
    seedPaper('p-bare')
    seedPaper('p-keep')
    expect(ftsHit('文献p-bare')).toBeDefined() // 种子在 FTS（trigram 中文子串）
    await expect(papers.delete({ paperId: 'p-bare' })).resolves.toEqual({ ok: true })
    expect(count('papers', ' WHERE id=?', 'p-bare')).toBe(0)
    expect(ftsHit('文献p-bare')).toBeUndefined() // AFTER DELETE 触发器自动清（001:94）
    expect(ftsHit('文献p-keep')).toBeDefined() // 他行 FTS 不受影响（精准删非全清）
    expect(foldersChanged).toHaveBeenCalledTimes(1)
    expect(lineageChanged).toHaveBeenCalledTimes(1)
  })

  it('删有节点文献：节点灭+边二跳灭；幽灵边对端节点不受影响（跨夹对端在场）', async () => {
    const f1 = repos.folders.create('图一')
    const f2 = repos.folders.create('图二')
    for (const id of ['p-del', 'p-nbr', 'p-other']) seedPaper(id)
    repos.papers.setFolderId('p-del', f1.id)
    repos.papers.setFolderId('p-nbr', f1.id)
    repos.papers.setFolderId('p-other', f2.id)
    const nDel = repos.lineage.upsertNode({ paperId: 'p-del', title: '删', coreIdea: '', year: 2024, x: null, y: null, folderId: f1.id })
    const nNbr = repos.lineage.upsertNode({ paperId: 'p-nbr', title: '同图邻', coreIdea: '', year: 2024, x: null, y: null, folderId: f1.id })
    const nOther = repos.lineage.upsertNode({ paperId: 'p-other', title: '跨夹对端', coreIdea: '', year: 2024, x: null, y: null, folderId: f2.id })
    repos.lineage.upsertEdge({ fromNode: nNbr.id, toNode: nDel.id, label: '' })
    // 手工预置跨图幽灵边（p-del→p-other——存量遗留形态，绕 service 守卫直插）
    db.prepare(
      "INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?,?,?,?,?,?,?)"
    ).run('e-ghost', nDel.id, nOther.id, '', 'manual', 't', 't')
    expect(count('lineage_edges')).toBe(2)

    await papers.delete({ paperId: 'p-del' })

    expect(count('papers', ' WHERE id=?', 'p-del')).toBe(0)
    expect(count('lineage_nodes', ' WHERE paper_id=?', 'p-del')).toBe(0) // 节点级联灭
    expect(count('lineage_edges')).toBe(0) // 二跳级联：同图边+幽灵边均随端点灭
    // 对端节点/文献不受影响
    expect(count('lineage_nodes', ' WHERE id=?', nOther.id)).toBe(1)
    expect(count('lineage_nodes', ' WHERE id=?', nNbr.id)).toBe(1)
    expect(count('papers', ' WHERE id=?', 'p-other')).toBe(1)
    expect(foldersChanged).toHaveBeenCalledTimes(1)
    expect(lineageChanged).toHaveBeenCalledTimes(1)
  })

  it('子行全级联：notes/annotations/paper_tags/ai_notes 各一行→删后全灭', async () => {
    seedPaper('p-rich')
    db.prepare("INSERT INTO tags (id, name) VALUES ('t-1', '标签一')").run()
    db.prepare(
      "INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at) VALUES ('a-1','p-rich',0,'highlight','0:0','t','t')"
    ).run()
    db.prepare(
      "INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-1','p-rich','t','t')"
    ).run()
    db.prepare("INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-rich','t-1')").run()
    db.prepare(
      "INSERT INTO ai_notes (id, paper_id, role, question, model, content_md, created_at, updated_at) VALUES ('ai-1','p-rich','first-read','Q1','m','内容','t','t')"
    ).run()
    for (const t of ['notes', 'annotations', 'paper_tags', 'ai_notes']) {
      expect(count(t)).toBe(1) // 种子在场
    }

    await papers.delete({ paperId: 'p-rich' })

    expect(count('papers', ' WHERE id=?', 'p-rich')).toBe(0)
    expect(count('notes')).toBe(0)
    expect(count('annotations')).toBe(0)
    expect(count('paper_tags')).toBe(0)
    expect(count('ai_notes')).toBe(0)
    expect(count('tags')).toBe(1) // 标签本体不受文献删除影响（paper_tags 灭）
  })

  it('NOT_FOUND：不存在 id→DomainError code=NOT_FOUND（中文 reason 承载）+[RR1-3] 真库预删后再删同拒', async () => {
    await expect(papers.delete({ paperId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('ghost')
    })
    // [RR1-3/d1-N1] remove 返回值消费防御面：seed→db 直删（绕过 service）→再
    // delete——findById 前置已拦；removed===false 分支=单进程同步序不可达的
    // 并发窗口防御（mock 真库装配下不可构造，红证面=变异）
    seedPaper('p-vanished')
    db.prepare('DELETE FROM papers WHERE id = ?').run('p-vanished')
    await expect(papers.delete({ paperId: 'p-vanished' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('p-vanished')
    })
    expect(foldersChanged).not.toHaveBeenCalled() // 拒路径零播
  })

  it('INV-91：pending=true→CONFLICT 拒+零库副作用+零广播', async () => {
    seedPaper('p-gated')
    pending = true
    await expect(papers.delete({ paperId: 'p-gated' })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(count('papers', ' WHERE id=?', 'p-gated')).toBe(1) // 拒时零库副作用
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
  })

  it('事件双播：成功路径 sendFoldersChanged/sendLineageChanged 各恰一次（双失效广播——夹计数减+图结构级联变）', async () => {
    seedPaper('p-evt')
    await papers.delete({ paperId: 'p-evt' })
    expect(foldersChanged).toHaveBeenCalledTimes(1)
    expect(lineageChanged).toHaveBeenCalledTimes(1)
  })

  it('通道契约：papers/delete 通道名+Req strict 负锚（未知字段拒/空串拒/合法过）', () => {
    const ep = API_SURFACE.papers.delete
    expect(ep.channel).toBe('papers/delete')
    expect(ep.Req.safeParse({ paperId: 'p-1', extra: 1 }).success).toBe(false) // strict
    expect(ep.Req.safeParse({ paperId: '' }).success).toBe(false) // min(1)
    expect(ep.Req.safeParse({ paperId: 'p-1' }).success).toBe(true)
  })
})
