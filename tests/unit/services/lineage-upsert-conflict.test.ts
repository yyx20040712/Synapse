/**
 * [F1 小挂账] upsertNode 服务层重复节点预检锁定测试（always-active，不经
 * guardedDescribe）——真库件（createTestDb/createRepos 配方沿
 * folders-move-paper.test.ts）。
 *
 * 锁行为面（v87 P2-F1）：已有该文献节点+input 无 id（新建形态）→ service
 * 预检抛 CONFLICT「该文献已有节点」（中文）——不再落库撞 idx_lineage_paper
 * 部分唯一索引折叠 INTERNAL（renderer write-queue 仅 CONFLICT 丢弃，系统型
 * 永久重试卡队列——lineage-write-queue.ts flush 分支在档契约）。预检取
 * listGraph 已读 nodes 单源面（repo.nodeByPaperId 同语义，零新增 deps）。
 *
 * 边界：update 形态（input 带 id）不走预检（整行 upsert 语义不变）；预检
 * 先于 ensurePaperFolder 归档写（拒路径零库副作用）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createRepos } from '../../../src/main/db/repos'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { DomainError } from '../../../src/main/services/shared/domain-error'
import { createTestDb } from '../../utils/fixtures'
import type { SqliteDb } from '../../../src/main/db/connection'

describe('F1 upsertNode 服务层重复节点预检（真库）', () => {
  let db: SqliteDb
  let repos: ReturnType<typeof createRepos>
  let lineage: ReturnType<typeof createLineageService>

  beforeEach(() => {
    db = createTestDb()
    repos = createRepos(db)
    lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction
    })
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run('p-1', 'a.pdf', 's-1', '文献一', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
  })

  it('新建形态撞已有节点 → DomainError CONFLICT+中文文案「该文献已有节点」+零库副作用', () => {
    const first = lineage.upsertNode({ paperId: 'p-1', title: '首节点', coreIdea: '', year: 2024, x: null, y: null })
    expect(first.id).toBeTruthy()
    let caught: unknown = null
    try {
      lineage.upsertNode({ paperId: 'p-1', title: '重复节点', coreIdea: '', year: 2025, x: null, y: null })
    } catch (e) {
      caught = e
    }
    expect(caught, '重复新建必须抛（不落库撞索引折叠 INTERNAL）').not.toBeNull()
    expect(caught instanceof DomainError, '错误类型=DomainError（code 经 toAppError 透传——队列按码分支）').toBe(true)
    expect((caught as DomainError).code, '错误码=CONFLICT（write-queue 丢弃型）').toBe('CONFLICT')
    expect((caught as DomainError).message, '中文文案含「该文献已有节点」').toContain('该文献已有节点')
    const cnt = db.prepare('SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id=?').get('p-1') as { c: number }
    expect(cnt.c, '零库副作用=仅首节点在库').toBe(1)
  })

  it('幽灵 paperId 直插占坑（绕 service 预置旧行）同拒：预检面覆盖库内任意存量节点', () => {
    db.prepare(
      'INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, folder_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run('n-legacy', 'p-1', '旧行', '', 2023, null, null, null, 1, '__main__', 't', 't')
    let caught: unknown = null
    try {
      lineage.upsertNode({ paperId: 'p-1', title: '再建', coreIdea: '', year: 2025, x: null, y: null })
    } catch (e) {
      caught = e
    }
    expect(caught instanceof DomainError).toBe(true)
    expect((caught as DomainError).code).toBe('CONFLICT')
    expect((caught as DomainError).message).toContain('该文献已有节点')
    const cnt = db.prepare('SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id=?').get('p-1') as { c: number }
    expect(cnt.c, '旧行独存=拒路径零 INSERT').toBe(1)
  })

  it('update 形态（input 带 id）不走预检：整行 upsert 语义不变（改题名成功回显）', () => {
    const first = lineage.upsertNode({ paperId: 'p-1', title: '首节点', coreIdea: '', year: 2024, x: null, y: null })
    const updated = lineage.upsertNode({ id: first.id, paperId: 'p-1', title: '改名后', coreIdea: '', year: 2024, x: null, y: null })
    expect(updated.title, '带 id 更新=合法路径（预检仅拦新建形态）').toBe('改名后')
    const cnt = db.prepare('SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id=?').get('p-1') as { c: number }
    expect(cnt.c).toBe(1)
  })

  it('预检先于归档写：未归档文献+幽灵占坑拒路径 → papers.folder_id 保持 NULL（零副作用）', () => {
    db.prepare(
      'INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, folder_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run('n-legacy', 'p-1', '旧行', '', 2023, null, null, null, 1, '__main__', 't', 't')
    expect(() =>
      lineage.upsertNode({ paperId: 'p-1', title: '撞', coreIdea: '', year: 2025, x: null, y: null })
    ).toThrow(DomainError)
    expect(repos.papers.folderIdOf('p-1'), '拒路径零归档写（ensurePaperFolder 未执行）').toBeNull()
  })
})
