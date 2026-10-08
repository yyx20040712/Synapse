/**
 * [F-DBCAMP-01 DB-1 U4 / F-TAGS-02] tags.service 域限额+域守卫用例
 * （always-active——三屋纪律不经 guardedDescribe）。
 *
 * 2026-10-08 晨用户裁决（主控预裁默认生效）：
 * - 域内标签库总数上限 TAG_LIBRARY_MAX=20 满禁建+提示清理（幂等命中既有
 *   行不触限额——限的是「建」）；
 * - 每篇文献挂接上限 TAG_PER_PAPER_MAX=6 硬禁（幂等重挂不触——同解）；
 * - 标签完全隔离（跨文件夹无共享设计）→ merge 跨域 INVALID_REQUEST 拒。
 * attach 域不一致由 019 触发器 paper_tags_domain_guard ABORT 自然抛
 * （service 不重复预检，双源必漂移——真库 repo 直测件承载）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import { createTagsRepo } from '../../../src/main/db/repos/tags.repo'
import { createTestDb } from '../../utils/fixtures'
import type { Repos } from '../../../src/main/db/repos'
import { TAG_LIBRARY_MAX, TAG_PER_PAPER_MAX } from '../../../src/shared/models/tag'

function stubRepos(over: Record<string, unknown> = {}): Repos {
  const tags = {
    listWithCounts: vi.fn(() => []),
    upsertByName: vi.fn((folderId: string, name: string) => ({ id: 't-new', name, color: null })),
    attach: vi.fn(),
    detach: vi.fn(),
    namesByPaper: vi.fn(() => []),
    findByName: vi.fn((): undefined => undefined),
    findById: vi.fn((): undefined => undefined),
    // [R1/回炉轮1] attach 幂等判据=id 键（默认未挂）
    isAttached: vi.fn(() => false),
    renameTag: vi.fn(() => true),
    mergeTags: vi.fn(),
    deleteTag: vi.fn(),
    setColor: vi.fn(() => true),
    ...over
  }
  return { tags } as unknown as Repos
}

async function expectDomainError(
  run: () => Promise<unknown>,
  code: string,
  msgPart?: string
): Promise<void> {
  try {
    await run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect(e, '域错误是 Error 子类').toBeInstanceOf(Error)
    expect((e as { code?: string }).code, `错误码应为 ${code}`).toBe(code)
    if (msgPart !== undefined) expect((e as Error).message).toContain(msgPart)
  }
}

describe('F-TAGS-02 域内标签库上限（TAG_LIBRARY_MAX=20 满禁建）', () => {
  const full = Array.from({ length: TAG_LIBRARY_MAX }, (_, i) => ({
    id: `t-${i}`,
    name: `标签${i}`,
    paperCount: 0,
    color: null
  }))

  it('第 21 个新建 → CONFLICT「已达上限」+提示清理+upsertByName 零调用（阈值=TAG_LIBRARY_MAX 单源常量）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => full) })
    const svc = createTagsService({ repos })
    await expectDomainError(
      () => svc.upsert({ folderId: '__main__', name: '第二十一个' }),
      'CONFLICT',
      `域内标签已达上限（${TAG_LIBRARY_MAX}）`
    )
    expect(repos.tags.upsertByName).not.toHaveBeenCalled()
  })

  it('满库时幂等命中既有行放行（限「建」不限「查」——直接返回既有行零写入）', async () => {
    const existing = { id: 't-0', name: '标签0', color: null }
    const repos = stubRepos({
      listWithCounts: vi.fn(() => full),
      findByName: vi.fn(() => existing)
    })
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ folderId: '__main__', name: '标签0' })).resolves.toEqual(existing)
    expect(repos.tags.upsertByName).not.toHaveBeenCalled()
  })

  it('未满（19）正常新建（阈值边界放行——upsert 域参逐参；数=TAG_LIBRARY_MAX-1 经常量推得）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => full.slice(0, TAG_LIBRARY_MAX - 1)) })
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ folderId: '__main__', name: '边界名' })).resolves.toEqual({
      id: 't-new',
      name: '边界名',
      color: null
    })
    expect(repos.tags.upsertByName).toHaveBeenCalledWith('__main__', '边界名')
  })

  it('[R3/回炉轮1] 异域限额独立：A 域满 20 时 B 域新建放行（完全隔离——2026-10-08 晨裁决语义锚，限额按域分账）', async () => {
    const repos = stubRepos({
      listWithCounts: vi.fn((folderId: string) => (folderId === 'c-a' ? full : full.slice(0, 3)))
    })
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ folderId: 'c-b', name: '乙域新名' })).resolves.toEqual({
      id: 't-new',
      name: '乙域新名',
      color: null
    })
    expect(repos.tags.listWithCounts).toHaveBeenCalledWith('c-b')
    expect(repos.tags.upsertByName).toHaveBeenCalledWith('c-b', '乙域新名')
  })
})

describe('F-TAGS-02 每篇挂接上限（TAG_PER_PAPER_MAX=6 硬禁）', () => {
  const tag = { id: 't-new', name: '新标签', color: null, folderId: '__main__' }
  const sixNames = Array.from({ length: TAG_PER_PAPER_MAX }, (_, i) => `已有${i}`)

  it('第 7 挂 → CONFLICT「每篇文献最多」+attach 零调用（阈值=TAG_PER_PAPER_MAX 单源常量）', async () => {
    const repos = stubRepos({
      findById: vi.fn(() => tag),
      namesByPaper: vi.fn(() => sixNames)
    })
    const svc = createTagsService({ repos })
    await expectDomainError(
      () => svc.attach({ paperId: 'p-1', tagId: 't-new' }),
      'CONFLICT',
      `每篇文献最多 ${TAG_PER_PAPER_MAX} 个标签`
    )
    expect(repos.tags.attach).not.toHaveBeenCalled()
  })

  it('已挂幂等放行（isAttached (paperId,tagId) id 键命中 → ok 直返零写入——R1 判据换源）', async () => {
    const repos = stubRepos({
      findById: vi.fn(() => tag),
      isAttached: vi.fn(() => true)
    })
    const svc = createTagsService({ repos })
    await expect(svc.attach({ paperId: 'p-1', tagId: 't-new' })).resolves.toEqual({ ok: true })
    expect(repos.tags.attach).not.toHaveBeenCalled()
    expect(repos.tags.isAttached).toHaveBeenCalledWith('p-1', 't-new')
  })

  it('未满（5 挂）正常挂接+tagId 缺席 NOT_FOUND 分流（校验序先行；数=TAG_PER_PAPER_MAX-1 经常量推得）', async () => {
    const repos = stubRepos({
      findById: vi.fn(() => tag),
      namesByPaper: vi.fn(() => sixNames.slice(0, TAG_PER_PAPER_MAX - 1))
    })
    const svc = createTagsService({ repos })
    await expect(svc.attach({ paperId: 'p-1', tagId: 't-new' })).resolves.toEqual({ ok: true })
    expect(repos.tags.attach).toHaveBeenCalledWith('p-1', 't-new')
    // 缺席预检先行（域违约与缺席分流清晰——service 不重复域预检）
    const repos2 = stubRepos({ findById: vi.fn((): undefined => undefined) })
    const svc2 = createTagsService({ repos: repos2 })
    await expectDomainError(() => svc2.attach({ paperId: 'p-1', tagId: 't-ghost' }), 'NOT_FOUND', '标签不存在')
    expect(repos2.tags.attach).not.toHaveBeenCalled()
  })
})

describe('F-TAGS-02 跨域 merge 拒（完全隔离——2026-10-08 晨用户裁决）', () => {
  it('源与目标域不同 → INVALID_REQUEST「跨域标签不可合并」+mergeTags 零调用', async () => {
    const repos = stubRepos({
      findById: vi.fn((id: string) =>
        id === 't-src' ? { id: 't-src', name: '甲', color: null, folderId: 'c-a' } : { id: 't-tgt', name: '乙', color: null, folderId: 'c-b' }
      )
    })
    const svc = createTagsService({ repos })
    await expectDomainError(
      () => svc.merge({ sourceId: 't-src', targetId: 't-tgt' }),
      'INVALID_REQUEST',
      '跨域标签不可合并'
    )
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('同域 merge 成功透传（域一致无碍——既有三步事务）', async () => {
    const repos = stubRepos({
      findById: vi.fn((id: string) => ({ id, name: `名${id}`, color: null, folderId: 'c-a' }))
    })
    const svc = createTagsService({ repos })
    await expect(svc.merge({ sourceId: 't-src', targetId: 't-tgt' })).resolves.toEqual({ ok: true })
    expect(repos.tags.mergeTags).toHaveBeenCalledWith('t-src', 't-tgt')
  })
})

describe('F-TAGS-02 attach 域不一致 → 019 触发器 SqliteError 透传（真库 repo 直测——service 不重复预检）', () => {
  it('跨域挂接：attach 抛「挂接域违约」（RAISE(ABORT) 经 better-sqlite3 透传）+零残留；同域挂接过', () => {
    const db = createTestDb()
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('c-a', '图甲', 0)").run()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
       VALUES ('p-a', 'a.pdf', 's-a', '文献甲', 't', 't', 'c-a')`
    ).run()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
       VALUES ('p-main', 'm.pdf', 's-m', '文献主', 't', 't', '__main__')`
    ).run()
    const repo = createTagsRepo(db)
    const tagMain = repo.upsertByName('__main__', '主图标签')
    const tagA = repo.upsertByName('c-a', '甲域标签')
    // 跨域：p-a（c-a）挂主图标签 → 触发器 ABORT 透传
    expect(() => repo.attach('p-a', tagMain.id)).toThrow(/挂接域违约/)
    expect(db.prepare('SELECT COUNT(*) c FROM paper_tags').get()).toEqual({ c: 0 })
    // 同域放行
    expect(() => repo.attach('p-a', tagA.id)).not.toThrow()
    expect(repo.namesByPaper('p-a')).toEqual(['甲域标签'])
    // 反向跨域同样拒（p-main 挂甲域标签）
    expect(() => repo.attach('p-main', tagA.id)).toThrow(/挂接域违约/)
    db.close()
  })

  it('[R1/回炉轮1 W1 双席同中] 跨域同名 tagId：A 域已挂「X」后 attach B 域同名「X」→ 域违约 SqliteError 而非伪 ok（幂等判据=id 键——名键会把跨域同名当已挂静默放行，触发器错误面被逃逸）', async () => {
    const db = createTestDb()
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('c-a', '图甲', 0)").run()
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('c-b', '图乙', 1)").run()
    for (const [id, folder] of [
      ['p-a', 'c-a'],
      ['p-b', 'c-b']
    ] as const) {
      db.prepare(
        `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
         VALUES (?, ?, ?, ?, 't', 't', ?)`
      ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, folder)
    }
    const repo = createTagsRepo(db)
    const tagA = repo.upsertByName('c-a', '同名X')
    const tagB = repo.upsertByName('c-b', '同名X')
    const svc = createTagsService({ repos: { tags: repo } as unknown as Repos })
    // p-b 挂 B 域「同名X」（同域合法在场——名键判据的混淆源）
    await expect(svc.attach({ paperId: 'p-b', tagId: tagB.id })).resolves.toEqual({ ok: true })
    // 跨域同名 tagId（A 域「同名X」挂 p-b）：幂等判据必须是 (paperId, tagId) id 键
    // ——名键会把 namesByPaper=['同名X'] 误判为已挂→伪 ok:true；正确面=INSERT
    // 走到触发器 ABORT（域违约 SqliteError 透传）
    await expect(svc.attach({ paperId: 'p-b', tagId: tagA.id })).rejects.toThrow(/挂接域违约/)
    expect(db.prepare('SELECT COUNT(*) c FROM paper_tags').get()).toEqual({ c: 1 })
    db.close()
  })
})
