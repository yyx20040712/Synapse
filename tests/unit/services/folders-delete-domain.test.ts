/**
 * [F-ALIGN-01 D4 单元二] folders.service delete 域删级联真库锁定测试
 * （INV-NEW-3：文件夹=数据域容器——删夹=域内数据全删+主图禁删）。
 *
 * 覆盖：删夹=应用层事务先文献后夹行（papers.remove×N——DDL 级联链：
 * paper_tags/annotations/notes/ai_notes/lineage_nodes CASCADE→edges 二跳+
 * FTS 触发器自清）→papers/lineage_nodes/lineage_edges/notes/annotations/
 * paper_tags 域内零残留+他夹/主图数据不动+双广播（FTS 断言带删除前正对照
 * ——k1-N2 防 CJK 分词不命中恒绿假阳性）；主图删恒拒（CONFLICT+零库副作用）；
 * S1 队列闸拒（pending 拒+零库副作用）；[RR1 W-D] 事务回滚注入（papers.remove
 * 中途抛错→整体回滚——夹行/已删首篇/节点全数还原）。K1⑤（文献删除→DDL
 * CASCADE 节点→边零残留）既有锚=papers-delete.test.ts（在役面零改）。
 * always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRepos } from '../../../src/main/db/repos'
import { createFoldersService } from '../../../src/main/services/folders.service'
import { MAIN_GRAPH_ID } from '../../../src/shared/models/lineage'
import { createTestDb } from '../../utils/fixtures'
import type { SqliteDb } from '../../../src/main/db/connection'

describe('F-ALIGN-01 D4 folders/delete 域删级联（INV-NEW-3——真库）', () => {
  let db: SqliteDb
  let repos: ReturnType<typeof createRepos>
  let svc: ReturnType<typeof createFoldersService>
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

  /** 富域种子：两文献（各带节点）+边+notes+annotations+paper_tags+ai_notes */
  function seedRichDomain(folderId: string): void {
    for (const id of ['p-dom-a', 'p-dom-b']) {
      seedPaper(id)
      repos.papers.setFolderId(id, folderId)
      repos.lineage.upsertNode({ paperId: id, title: `节点${id}`, year: 2024, x: null, y: null, folderId })
    }
    const na = repos.lineage.nodeByPaperId('p-dom-a')!
    const nb = repos.lineage.nodeByPaperId('p-dom-b')!
    repos.lineage.upsertEdge({ fromNode: na.id, toNode: nb.id, label: '域内边' })
    db.prepare("INSERT INTO tags (id, name) VALUES ('t-dom', '域标签')").run()
    db.prepare("INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at) VALUES ('a-dom','p-dom-a',0,'highlight','0:0','t','t')").run()
    db.prepare("INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-dom','p-dom-a','t','t')").run()
    db.prepare("INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-dom-a','t-dom')").run()
    db.prepare(
      "INSERT INTO ai_notes (id, paper_id, role, question, model, content_md, created_at, updated_at) VALUES ('ai-dom','p-dom-a','first-read','Q','m','内容','t','t')"
    ).run()
  }

  beforeEach(() => {
    db = createTestDb()
    repos = createRepos(db)
    pending = false
    foldersChanged = vi.fn()
    lineageChanged = vi.fn()
    svc = createFoldersService({
      repos,
      lineagePending: () => pending,
      sendFoldersChanged: foldersChanged,
      sendLineageChanged: lineageChanged
    })
  })

  it('删夹=域删级联零残留：papers/lineage_nodes/lineage_edges/notes/annotations/paper_tags/ai_notes 域内全灭；他夹与主图数据不动+双广播', async () => {
    const dom = repos.folders.create('待删域夹')
    const other = repos.folders.create('幸存夹')
    seedRichDomain(dom.id)
    // 他夹富域（对照面：域外数据不受域删波及）
    seedPaper('p-keep')
    repos.papers.setFolderId('p-keep', other.id)
    repos.lineage.upsertNode({ paperId: 'p-keep', title: '幸存节点', year: 2024, x: null, y: null, folderId: other.id })
    // 主图数据（对照面）
    seedPaper('p-main')
    repos.papers.setFolderId('p-main', MAIN_GRAPH_ID)
    repos.lineage.upsertNode({ paperId: 'p-main', title: '主图节点', year: 2024, x: null, y: null, folderId: MAIN_GRAPH_ID })

    // [RR1 k1-N2] FTS 正对照：删除前同 MATCH 命中=1（证明探针有效——防 CJK
    // 分词不命中导致的「删除后=0」恒绿假阳性）
    expect(count('papers_fts', ' WHERE papers_fts MATCH ?', '"文献p-dom-a"')).toBe(1)

    await expect(svc.delete({ id: dom.id })).resolves.toEqual({ ok: true })

    // 域内零残留（INV-NEW-3 锚定状态：删除事务语义——先文献后夹行）
    expect(count('papers', ' WHERE folder_id=?', dom.id)).toBe(0)
    expect(count('papers', ' WHERE id IN (?,?)', 'p-dom-a', 'p-dom-b')).toBe(0)
    expect(count('lineage_nodes', ' WHERE folder_id=?', dom.id)).toBe(0)
    // 域内两节点随 papers.remove DDL CASCADE 灭→边二跳灭（全表=幸存+主图各一节点、零域内边）
    expect(count('lineage_nodes')).toBe(2)
    expect(count('lineage_edges')).toBe(0)
    expect(count('notes')).toBe(0)
    expect(count('annotations')).toBe(0)
    expect(count('paper_tags')).toBe(0)
    expect(count('ai_notes')).toBe(0)
    expect(count('tags')).toBe(1) // 标签定义行=库级实体保留（设计稿 §1.4 边界申报①）
    expect(count('papers_fts', ' WHERE papers_fts MATCH ?', '"文献p-dom-a"')).toBe(0) // FTS 触发器自清
    // 域外对照面全保持
    expect(count('papers', ' WHERE id=?', 'p-keep')).toBe(1)
    expect(count('papers', ' WHERE id=?', 'p-main')).toBe(1)
    expect(count('lineage_nodes', ' WHERE folder_id=?', other.id)).toBe(1)
    expect(count('lineage_nodes', ' WHERE folder_id=?', MAIN_GRAPH_ID)).toBe(1)
    // 夹行灭+双广播
    expect(repos.folders.findById(dom.id)).toBeNull()
    expect(foldersChanged).toHaveBeenCalledTimes(1)
    expect(lineageChanged).toHaveBeenCalledTimes(1)
  })

  it('空夹删除：零文献零节点——事务空转合法（域删语义对空域幂等）', async () => {
    const empty = repos.folders.create('空夹')
    await expect(svc.delete({ id: empty.id })).resolves.toEqual({ ok: true })
    expect(repos.folders.findById(empty.id)).toBeNull()
    expect(foldersChanged).toHaveBeenCalledTimes(1)
  })

  it('主图删恒拒：id=__main__ → CONFLICT（删主图=删全库恒禁——零库副作用零广播）', async () => {
    seedPaper('p-main-guard')
    repos.papers.setFolderId('p-main-guard', MAIN_GRAPH_ID)
    await expect(svc.delete({ id: MAIN_GRAPH_ID })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.delete({ id: MAIN_GRAPH_ID })).rejects.toThrow('主图不可删除')
    expect(count('papers', ' WHERE id=?', 'p-main-guard')).toBe(1)
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
  })

  it('S1 队列闸：pending=true → CONFLICT 拒+域数据零副作用+零广播', async () => {
    const dom = repos.folders.create('闸测夹')
    seedRichDomain(dom.id)
    pending = true
    await expect(svc.delete({ id: dom.id })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(count('papers', ' WHERE folder_id=?', dom.id)).toBe(2)
    expect(count('lineage_nodes', ' WHERE folder_id=?', dom.id)).toBe(2)
    expect(repos.folders.findById(dom.id)).not.toBeNull()
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
  })

  it('[RR1 W-D] 事务回滚注入：papers.remove 第 2 次抛错→整体回滚——夹行仍在+夹内 2 篇全在（首篇也未删）+节点零残留变化+零广播', async () => {
    const dom = repos.folders.create('回滚注入夹')
    seedRichDomain(dom.id)
    expect(count('papers', ' WHERE folder_id=?', dom.id)).toBe(2)
    // spy 包原实现计数抛错：第 1 篇真删（级联生效），第 2 篇抛错→事务整体回滚
    const originalRemove = repos.papers.remove
    let removeCalls = 0
    const spy = vi.spyOn(repos.papers, 'remove').mockImplementation((id: string) => {
      removeCalls += 1
      if (removeCalls === 2) throw new Error('模拟：第二篇删除失败（SQLITE_BUSY/IO 类）')
      return originalRemove(id)
    })
    await expect(svc.delete({ id: dom.id })).rejects.toThrow('模拟：第二篇删除失败')
    spy.mockRestore()
    // 回滚锚：夹行未删+首篇（已执行 remove）还原+两节点/边全保持+零广播
    expect(removeCalls).toBe(2)
    expect(repos.folders.findById(dom.id)).not.toBeNull()
    expect(count('papers', ' WHERE folder_id=?', dom.id)).toBe(2)
    expect(count('lineage_nodes', ' WHERE folder_id=?', dom.id)).toBe(2)
    expect(count('lineage_edges')).toBe(1)
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
  })
})
