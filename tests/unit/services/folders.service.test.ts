/**
 * [F-FOLDER-01] folders.service —— CRUD 编排+S1 队列闸+事件广播锁定测试
 * （repos 桩——tags.service.test 同型；design-final §2.1/§3.1/§3.3）。
 *
 * 覆盖：list 透传/create 三序（trim 空 INVALID_REQUEST→同名 CONFLICT→落库+
 * folders.changed）/rename 四序（trim 空→NOT_FOUND→他名 CONFLICT→落库+广播）/
 * delete 三序（S1 拒→NOT_FOUND→级联删+双广播）/S1 队列闸（INV-91：pending=
 * create/rename/delete 三入口全拒+零库副作用+零广播）。
 * [F-ALIGN-01 D4 单元二] delete=域删级联（事务序：papers.listIdsByFolder→
 * 逐 papers.remove→folders.remove——域内文献先删后删夹行；真库零残留断言=
 * folders-delete-domain.test.ts 承载，本件锁编排序与广播）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createFoldersService } from '../../../src/main/services/folders.service'
import type { Folder } from '../../../src/shared/models/folder'
import type { Repos } from '../../../src/main/db/repos'

function stubRepos(
  over: Partial<Record<'create' | 'rename' | 'remove' | 'listWithCounts' | 'findByName' | 'findById', unknown>> = {},
  paperIds: string[] = []
): {
  repos: Repos
  folderOps: Record<string, ReturnType<typeof vi.fn>>
  paperOps: Record<string, ReturnType<typeof vi.fn>>
} {
  const f = (id: string, name: string): Folder => ({ id, name, position: 0, paperCount: 0 })
  const folderOps = {
    create: vi.fn((name: string) => f('f-new', name)),
    rename: vi.fn(() => 1),
    remove: vi.fn(() => 1),
    listWithCounts: vi.fn(() => [f('f-1', '图一')]),
    findByName: vi.fn((name: string) => (name === '占用' ? f('f-x', '占用') : null)),
    findById: vi.fn((id: string) => (id === 'f-ghost' ? null : f(id, '图')))
  }
  // [F-ALIGN-01 D4] 域删级联桩面：papers.listIdsByFolder 恒返注入清单（真实
  // 语义=夹内文献 id 集）；remove 逐 id 调用（DDL 级联=真库面）
  const paperOps = {
    listIdsByFolder: vi.fn(() => paperIds),
    remove: vi.fn(() => true)
  }
  const merged = { ...folderOps, ...over } as Record<string, unknown>
  return {
    repos: {
      folders: merged,
      papers: paperOps,
      withTransaction: vi.fn(<T>(fn: () => T): T => fn())
    } as unknown as Repos,
    folderOps: folderOps as unknown as Record<string, ReturnType<typeof vi.fn>>,
    paperOps: paperOps as unknown as Record<string, ReturnType<typeof vi.fn>>
  }
}

function makeService(repos: Repos, pending = false) {
  const sendFoldersChanged = vi.fn()
  const sendLineageChanged = vi.fn()
  const svc = createFoldersService({
    repos,
    lineagePending: () => pending,
    sendFoldersChanged,
    sendLineageChanged
  })
  return { svc, sendFoldersChanged, sendLineageChanged }
}

describe('F-FOLDER-01 folders.service —— CRUD 编排（校验序沿 tags 先例）', () => {
  it('list 透传 listWithCounts', async () => {
    const { repos } = stubRepos()
    const { svc } = makeService(repos)
    await expect(svc.list({})).resolves.toEqual([{ id: 'f-1', name: '图一', position: 0, paperCount: 0 }])
  })

  it('create：trim 空 INVALID_REQUEST→同名 CONFLICT→成功落库+folders.changed（主图名保留——先退让在迁移面）', async () => {
    const { repos, folderOps } = stubRepos()
    const { svc, sendFoldersChanged } = makeService(repos)
    await expect(svc.create({ name: '   ' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(svc.create({ name: '占用' })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(folderOps.create).not.toHaveBeenCalled()
    const folder = await svc.create({ name: ' 新图 ' })
    expect(folder.name).toBe('新图')
    expect(folderOps.create).toHaveBeenCalledWith('新图')
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
  })

  it('rename：trim 空→NOT_FOUND→他名 CONFLICT→成功+folders.changed（图名 1:1 跟随=S3 数据源）', async () => {
    const { repos } = stubRepos()
    const { svc, sendFoldersChanged } = makeService(repos)
    await expect(svc.rename({ id: 'f-1', name: ' ' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(svc.rename({ id: 'f-ghost', name: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(svc.rename({ id: 'f-1', name: '占用' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.rename({ id: 'f-1', name: '占用' }).catch(() => undefined)).resolves.toBeUndefined()
    // 自身同名=幂等成功（clash.id===req.id 不拒——tags rename 同款）
    await expect(svc.rename({ id: 'f-x', name: '占用' })).resolves.toEqual({ ok: true })
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
  })

  it('[回炉码 4] 主图禁删：id=__main__ → CONFLICT 特例域错误（存量脉络承载锚——级联灭主图全部节点/边）', async () => {
    const { repos, folderOps } = stubRepos()
    const { svc, sendFoldersChanged, sendLineageChanged } = makeService(repos)
    await expect(svc.delete({ id: '__main__' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.delete({ id: '__main__' })).rejects.toThrow('主图不可删除')
    expect(folderOps.remove).not.toHaveBeenCalled() // 拒时零库副作用
    expect(sendFoldersChanged).not.toHaveBeenCalled()
    expect(sendLineageChanged).not.toHaveBeenCalled()
  })

  it('delete：NOT_FOUND→[F-ALIGN-01 D4] 域删级联事务序（夹内文献逐 remove→folders.remove）+双广播（S4 回退依据）', async () => {
    const { repos, folderOps, paperOps } = stubRepos({}, ['p-1', 'p-2'])
    const { svc, sendFoldersChanged, sendLineageChanged } = makeService(repos)
    await expect(svc.delete({ id: 'f-ghost' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(svc.delete({ id: 'f-1' })).resolves.toEqual({ ok: true })
    // 域删语义（INV-NEW-3）：先逐夹内文献 papers.remove，再删夹行
    expect(paperOps.listIdsByFolder).toHaveBeenCalledWith('f-1')
    expect(paperOps.remove).toHaveBeenCalledTimes(2)
    expect(paperOps.remove).toHaveBeenNthCalledWith(1, 'p-1')
    expect(paperOps.remove).toHaveBeenNthCalledWith(2, 'p-2')
    expect(folderOps.remove).toHaveBeenCalledWith('f-1')
    // 事务序：papers.remove 全部先于 folders.remove（先文献后夹行——INV-NEW-3）
    const paperRemoveOrder = paperOps.remove?.mock.invocationCallOrder.at(-1)
    const folderRemoveOrder = folderOps.remove?.mock.invocationCallOrder[0]
    expect(paperRemoveOrder).toBeDefined()
    expect(folderRemoveOrder).toBeDefined()
    expect(paperRemoveOrder!).toBeLessThan(folderRemoveOrder!)
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(sendLineageChanged).toHaveBeenCalledTimes(1)
  })
})

describe('F-FOLDER-01 folders.service —— S1 队列闸（INV-91：写三入口单点互斥）', () => {
  it('lineagePending=true：create/rename/delete 全拒（CONFLICT 中文）+零库副作用+零广播', async () => {
    const { repos, folderOps } = stubRepos()
    const { svc, sendFoldersChanged, sendLineageChanged } = makeService(repos, true)
    await expect(svc.create({ name: '新图' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.rename({ id: 'f-1', name: '新名' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.delete({ id: 'f-1' })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(folderOps.create).not.toHaveBeenCalled()
    expect(folderOps.rename).not.toHaveBeenCalled()
    expect(folderOps.remove).not.toHaveBeenCalled()
    expect(sendFoldersChanged).not.toHaveBeenCalled()
    expect(sendLineageChanged).not.toHaveBeenCalled()
  })
})
