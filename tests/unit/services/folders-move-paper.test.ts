/**
 * [F-FOLDER-01] papers/move-folder 移动事务序+slot 语义+跨图边+updateMeta
 * 年月同步锁定测试（真库——§3.4+W2/W3 终裁+S1 队列闸+INV-88/89/90/93）。
 *
 * 覆盖（一致性矩阵服务面）：移动 F1→F2（节点在场：图归属改写+slot 不重排+
 * 跨图边清理+同图边保留）/移动 F1→F2（无节点：自动入图——W6 漏格 month=NULL
 * 缺省归组+slot=目标图组 max+1）/移出 F→U（W2：folder_id=NULL→节点删→边随
 * CASCADE 灭）/非法 toFolderId 拒（NOT_FOUND）/幽灵 paperId 拒/S1 队列闸
 * （pending 拒+零库副作用）/跨图边 ERR_CROSS_GRAPH_EDGE（INV-90——CONFLICT
 * 码+中文 reason 承载）/updateMeta year/month 节点排序键同步（组变 slot=
 * 目标图组 max+1）+impactFactor 落库/repo 写边界默认锚（主控追认补强①：
 * upsertNode 未显式给 folderId→落 '__main__'——NOT NULL DEFAULT 安全网
 * 自 DDL 移 repo 写边界，design-final 修订二）。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRepos } from '../../../src/main/db/repos'
import { createLibraryService, createPapersService } from '../../../src/main/services/library.service'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { MAIN_GRAPH_ID } from '../../../src/shared/models/lineage'
import { createTestDb } from '../../utils/fixtures'
import type { SqliteDb } from '../../../src/main/db/connection'

describe('F-FOLDER-01 papers/move-folder 移动事务序（§3.4+W2/W3——真库）', () => {
  let db: SqliteDb
  let repos: ReturnType<typeof createRepos>
  let papers: ReturnType<typeof createPapersService>
  let lineage: ReturnType<typeof createLineageService>
  let pending: boolean
  let foldersChanged: ReturnType<typeof vi.fn>
  let lineageChanged: ReturnType<typeof vi.fn>

  function seedPaper(id: string, year: number | null = 2024): void {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, title, year, added_at, updated_at) VALUES (?,?,?,?,?,?,?)'
    ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, year, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
  }

  function folderIdOf(paperId: string): string | null {
    return (db.prepare('SELECT folder_id FROM papers WHERE id=?').get(paperId) as { folder_id: string | null })
      .folder_id
  }

  function nodeOf(paperId: string): { id: string; folder_id: string; year: number | null; month: number | null; slot: number | null } | undefined {
    return db.prepare('SELECT id, folder_id, year, month, slot FROM lineage_nodes WHERE paper_id=?').get(paperId) as
      | { id: string; folder_id: string; year: number | null; month: number | null; slot: number | null }
      | undefined
  }

  beforeEach(() => {
    db = createTestDb()
    repos = createRepos(db)
    pending = false
    foldersChanged = vi.fn()
    lineageChanged = vi.fn()
    const deps = { repos, lineagePending: () => pending, sendFoldersChanged: foldersChanged, sendLineageChanged: lineageChanged }
    papers = createPapersService(deps)
    lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction,
      folderExists: (id) => repos.folders.findById(id) !== null
    })
  })

  it('同值移动（F→F）：幂等早退——零库写/零 slot 重排/零广播（R2——k1-W2/d1-W2：无早退则 slot 自计重排组末+updated_at 刷新）', async () => {
    const f1 = repos.folders.create('图一')
    seedPaper('p-same', 2024)
    repos.papers.setFolderId('p-same', f1.id)
    const n = lineage.upsertNode({ paperId: 'p-same', title: '同', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 1, folderId: f1.id })
    const before = db.prepare('SELECT updated_at FROM papers WHERE id=?').get('p-same') as { updated_at: string }
    await expect(papers.moveFolder({ paperId: 'p-same', toFolderId: f1.id })).resolves.toEqual({ ok: true })
    expect(folderIdOf('p-same')).toBe(f1.id)
    expect(nodeOf('p-same')).toMatchObject({ id: n.id, slot: 1 }) // slot 原位不重排
    expect((db.prepare('SELECT updated_at FROM papers WHERE id=?').get('p-same') as { updated_at: string }).updated_at).toBe(before.updated_at)
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
  })

  it('移动 F1→F2（节点在场）：folder_id+节点图归属改写；slot=目标组 max+1（[回炉码 6] 归一——本夹具目标组 max=1 恰得 2）；跨图边清理+同图边保留+双广播', async () => {
    const f1 = repos.folders.create('图一')
    const f2 = repos.folders.create('图二')
    seedPaper('p-mover', 2024)
    seedPaper('p-oldnbr', 2024)
    seedPaper('p-newnbr', 2024)
    // [回炉码 1] INV-88 统一规则前置：文献先归档（节点 folder=文献归属——
    // 未归档文献建他图节点=新守卫拒绝面，夹具按真实流先归属）
    repos.papers.setFolderId('p-mover', f1.id)
    repos.papers.setFolderId('p-oldnbr', f1.id)
    repos.papers.setFolderId('p-newnbr', f2.id)
    const mover = lineage.upsertNode({ paperId: 'p-mover', title: '移', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 2, folderId: f1.id })
    const oldNb = lineage.upsertNode({ paperId: 'p-oldnbr', title: '旧邻', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 1, folderId: f1.id })
    lineage.upsertNode({ paperId: 'p-newnbr', title: '新邻', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 1, folderId: f2.id })
    // F1 内一条直接连线（oldNb→mover——树守卫禁反向成环，双连线索以单边+预置跨图边承载）
    lineage.upsertEdge({ fromNode: oldNb.id, toNode: mover.id, label: '' })
    // 手工预置一条反向边（mover→旧邻——端点对与树边互逆不撞 UNIQUE；移动后
    // 双端异图=跨图，应随清理灭）
    db.prepare('INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run('e-cross', mover.id, oldNb.id, '', 'manual', 't', 't')

    await papers.moveFolder({ paperId: 'p-mover', toFolderId: f2.id })

    expect(folderIdOf('p-mover')).toBe(f2.id)
    const node = nodeOf('p-mover')!
    expect(node.folder_id).toBe(f2.id)
    expect(node.slot).toBe(2) // 回炉码 6：目标组 max(newNb=1)+1=2（旧 slot 亦 2——碰撞面专测见下例）
    // 边清理：mover 与旧图邻居的直接连线删（边属图派生——连线不迁移）；
    // 预置跨图边（对端本就他图）也清；其余图内边（无 mover 端点）不动
    const remaining = db.prepare('SELECT id, from_node, to_node FROM lineage_edges').all() as Array<{ id: string; from_node: string; to_node: string }>
    expect(remaining.some((e) => e.id === 'e-cross')).toBe(false)
    expect(remaining.some((e) => e.from_node === mover.id || e.to_node === mover.id)).toBe(false)
    expect(foldersChanged).toHaveBeenCalledTimes(1)
    expect(lineageChanged).toHaveBeenCalledTimes(1)
  })

  it('移动 F1→F2（无节点）：自动入图——month=NULL 缺省归组（W6 漏格）+slot=目标图组 max+1', async () => {
    const f2 = repos.folders.create('图二')
    seedPaper('p-bare', 2023)
    seedPaper('p-existing', 2023)
    // F2 图同年同月（null 月）已有一节点 slot=3——新节点应落组末 4
    repos.papers.setFolderId('p-existing', f2.id) // 统一规则前置（同上）
    lineage.upsertNode({ paperId: 'p-existing', title: '在图', coreIdea: '', year: 2023, x: null, y: null, month: null, slot: 3, folderId: f2.id })

    await papers.moveFolder({ paperId: 'p-bare', toFolderId: f2.id })

    const node = nodeOf('p-bare')!
    expect(node.folder_id).toBe(f2.id)
    expect(node.year).toBe(2023) // 排序键取文献元数据
    expect(node.month).toBeNull() // month 无源=未定月框（W6 漏格：month=NULL 缺省归组）
    expect(node.slot).toBe(4) // 目标图组 max+1（W3）
    expect(folderIdOf('p-bare')).toBe(f2.id)
  })

  it('移出 F→U（toFolderId=null）：folder_id=NULL→节点删（政策性 INV-93）→边随节点 CASCADE 灭+双广播', async () => {
    const f1 = repos.folders.create('图一')
    seedPaper('p-out', 2024)
    seedPaper('p-nbr', 2024)
    repos.papers.setFolderId('p-out', f1.id) // 统一规则前置（同上）
    repos.papers.setFolderId('p-nbr', f1.id)
    const n1 = lineage.upsertNode({ paperId: 'p-out', title: '移出', coreIdea: '', year: 2024, x: null, y: null, folderId: f1.id })
    const n2 = lineage.upsertNode({ paperId: 'p-nbr', title: '邻居', coreIdea: '', year: 2024, x: null, y: null, folderId: f1.id })
    lineage.upsertEdge({ fromNode: n2.id, toNode: n1.id, label: '' })

    await papers.moveFolder({ paperId: 'p-out', toFolderId: null })

    expect(folderIdOf('p-out')).toBeNull() // 未归档（与「未加入脉络」正交——INV-93）
    expect(nodeOf('p-out')).toBeUndefined() // W2：节点删
    const edges = db.prepare('SELECT COUNT(*) c FROM lineage_edges').get() as { c: number }
    expect(edges.c).toBe(0) // 边随节点 DDL CASCADE 灭
    expect(nodeOf('p-nbr')).toBeDefined() // 邻居不动
    expect(foldersChanged).toHaveBeenCalledTimes(1)
    expect(lineageChanged).toHaveBeenCalledTimes(1)
  })

  it('[回炉码 6] 移入 slot 归一：目标图组已有同 slot 值→落组末 max+1 不重复（不透写原 slot——INV-75 同图内唯一）', async () => {
    const f1 = repos.folders.create('图一')
    const f2 = repos.folders.create('图二')
    for (const id of ['p-m', 'p-o1', 'p-o2']) seedPaper(id, 2024)
    repos.papers.setFolderId('p-m', f1.id)
    repos.papers.setFolderId('p-o1', f2.id)
    repos.papers.setFolderId('p-o2', f2.id)
    // 移动者旧 slot=1（F1 组）；F2 同 (year,month) 组已占 slot=1 与 2 → 落 3
    lineage.upsertNode({ paperId: 'p-m', title: '移', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 1, folderId: f1.id })
    lineage.upsertNode({ paperId: 'p-o1', title: '占一', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 1, folderId: f2.id })
    lineage.upsertNode({ paperId: 'p-o2', title: '占二', coreIdea: '', year: 2024, x: null, y: null, month: 5, slot: 2, folderId: f2.id })
    await papers.moveFolder({ paperId: 'p-m', toFolderId: f2.id })
    const moved = nodeOf('p-m')!
    expect(moved.folder_id).toBe(f2.id)
    expect(moved.slot).toBe(3) // max(1,2)+1——透写旧值 1 即重复（变异 M14 锚）
  })

  it('非法 toFolderId 拒（NOT_FOUND 中文）；幽灵 paperId 拒；S1 pending 拒（CONFLICT+零库副作用）', async () => {
    const f1 = repos.folders.create('图一')
    seedPaper('p-a', 2024)
    await expect(papers.moveFolder({ paperId: 'p-a', toFolderId: 'f-ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    await expect(papers.moveFolder({ paperId: 'ghost', toFolderId: f1.id })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    pending = true
    await expect(papers.moveFolder({ paperId: 'p-a', toFolderId: f1.id })).rejects.toMatchObject({
      code: 'CONFLICT'
    })
    expect(folderIdOf('p-a')).toBeNull() // 拒时零库副作用
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
  })
})

describe('F-FOLDER-01·回炉码 1/3 INV-88 统一规则——upsert-node 文献节点图归属', () => {
  it('未归档文献建节点（缺省）：先写 papers.folder_id=主图（入图即归档）再建节点——节点 folder=主图', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction
    })
    db.prepare('INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)').run('p-1', 'a.pdf', 's-1', 't', 't')
    const node = lineage.upsertNode({ paperId: 'p-1', title: '入图即归档', coreIdea: '', year: 2024, x: null, y: null })
    expect(node.folderId).toBe('__main__')
    expect(repos.papers.folderIdOf('p-1')).toBe('__main__') // 统一规则落笔（文献侧同步归档）
  })

  it('[R2·k1-W3] upsertNode 原子性：ensurePaperFolder 归档写与节点 INSERT 同事务——INSERT 抛（坑 a 索引撞）时无「已归档未建节点」残留', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction
    })
    db.prepare('INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)').run('p-1', 'a.pdf', 's-1', 't', 't')
    // 预置手工节点占坑 a 唯一域（绕 service 直插——012 前旧形态同族），文献保持未归档
    db.prepare(
      'INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, folder_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run('n-legacy', 'p-1', '旧行', '', 2023, null, null, null, 1, '__main__', 't', 't')
    // service 首支：未归档→ensurePaperFolder 归档写→随後 INSERT 撞部分唯一索引
    // 裸抛（INV-89 DDL 面）→ withTransaction 回滚
    expect(() =>
      lineage.upsertNode({ paperId: 'p-1', title: '撞索引', coreIdea: '', year: 2025, x: null, y: null })
    ).toThrow()
    // 原子性：归档写随事务回滚——文献仍 NULL（无「已归档未建节点」残留）
    expect(repos.papers.folderIdOf('p-1')).toBeNull()
    const cnt = db.prepare('SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id=?').get('p-1') as { c: number }
    expect(cnt.c).toBe(1) // 仅预置旧行
  })

  it('显式 folderId=归属→过；≠归属→CONFLICT 拒（消息含「文献不在该文件夹——用移动文献操作」；不隐式移动+零库副作用）', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction
    })
    db.prepare('INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)').run('p-1', 'a.pdf', 's-1', 't', 't')
    const f2 = repos.folders.create('图二')
    repos.papers.setFolderId('p-1', f2.id)
    // 显式=归属 → 过
    const ok = lineage.upsertNode({ paperId: 'p-1', title: '同图', coreIdea: '', year: 2024, x: null, y: null, folderId: f2.id })
    expect(ok.folderId).toBe(f2.id)
    // 显式≠归属（主图）→ 拒；文献归属不被隐式移动、节点不落库
    expect(() =>
      lineage.upsertNode({ paperId: 'p-1', title: '异图', coreIdea: '', year: 2024, x: null, y: null, folderId: '__main__' })
    ).toThrow('文献不在该文件夹——用移动文献操作')
    expect(repos.papers.folderIdOf('p-1')).toBe(f2.id) // 不隐式移动
    const nodes = db.prepare('SELECT COUNT(*) c FROM lineage_nodes').get() as { c: number }
    expect(nodes.c).toBe(1) // 拒路径零节点残留（仅首条合法节点）
  })
})

describe('F-FOLDER-01·回炉码 13（d1-W11）graph(folderId) 子图过滤+pubNos 装配', () => {
  it('同图节点/边保留；跨图边滤掉；跨图端点边不残；pubNos 键值=paperId→库级编号', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction,
      pubNos: (ids) => repos.papers.pubNoByIds(ids)
    })
    const f2 = repos.folders.create('图二')
    // [R2·k1'-N2] added_at 数字映射（旧 id.slice(-1) 拼出非法 ISO 串——排序侥幸
    // 按字符串序正确，勘正免误导）：p-a/p-b/p-c → 01/02/03
    for (const [i, id] of ['p-a', 'p-b', 'p-c'].entries()) {
      db.prepare('INSERT INTO papers (id, file_ref, sha256, title, year, added_at, updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, 'a.pdf', `s-${id}`, `文献${id}`, 2024, `2026-01-0${i + 1}T00:00:00Z`, 't')
    }
    repos.papers.setFolderId('p-a', f2.id)
    repos.papers.setFolderId('p-b', f2.id) // p-c 未归档→主图
    const na = lineage.upsertNode({ paperId: 'p-a', title: 'A', coreIdea: '', year: 2024, x: null, y: null, folderId: f2.id })
    const nb = lineage.upsertNode({ paperId: 'p-b', title: 'B', coreIdea: '', year: 2025, x: null, y: null, folderId: f2.id })
    const nc = lineage.upsertNode({ paperId: 'p-c', title: 'C', coreIdea: '', year: 2024, x: null, y: null }) // 主图
    lineage.upsertEdge({ fromNode: na.id, toNode: nb.id, label: '同图' })
    // 手工预置跨图边（a↔c——迁移期遗留形态）：子图读应滤掉
    db.prepare('INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run('e-cross', na.id, nc.id, '', 'manual', 't', 't')
    const g = lineage.graph(f2.id)
    expect(g.nodes.map((n) => n.paperId)).toEqual(['p-a', 'p-b']) // 该图节点（lineageOrder 序）
    expect(g.edges).toHaveLength(1) // 同图边保留、跨图边滤掉
    expect(g.edges[0]!.label).toBe('同图')
    // pubNos 键值：键=paperId、值=库级编号（pubNoByIds 单源）
    expect(g.pubNos).toEqual({ 'p-a': 1, 'p-b': 2 }) // year 2024<2025 库级序（p-c=2024 同年 added_at 晚→3 不入子图）
  })
})

describe('F-FOLDER-01 跨图边守卫（INV-90——ERR_CROSS_GRAPH_EDGE 以 CONFLICT 码承载）', () => {
  it('两端分属不同图：upsertEdge 拒（CONFLICT+跨图边拒绝 reason）；同图边不受限', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const lineage = createLineageService({
      repo: repos.lineage,
      paperExists: (id) => repos.papers.findById(id) !== null,
      paperFolderOf: (id) => repos.papers.folderIdOf(id),
      ensurePaperFolder: (id) => repos.papers.ensureFolderAssigned(id),
      withTransaction: repos.withTransaction,
      folderExists: (id) => repos.folders.findById(id) !== null
    })
    const f2 = repos.folders.create('图二')
    for (const id of ['p-1', 'p-2']) {
      db.prepare('INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)').run(id, 'a.pdf', `s-${id}`, 't', 't')
    }
    repos.papers.setFolderId('p-2', f2.id) // 统一规则前置：p-2 归图二（p-1 未归档→主图）
    const n1 = lineage.upsertNode({ paperId: 'p-1', title: '主图节点', coreIdea: '', year: 2024, x: null, y: null })
    const n2 = lineage.upsertNode({ paperId: 'p-2', title: '图二节点', coreIdea: '', year: 2024, x: null, y: null, folderId: f2.id })
    expect(n1.folderId).toBe(MAIN_GRAPH_ID)
    expect(() => lineage.upsertEdge({ fromNode: n1.id, toNode: n2.id, label: '' })).toThrow('跨图边拒绝')
    const edges = db.prepare('SELECT COUNT(*) c FROM lineage_edges').get() as { c: number }
    expect(edges.c).toBe(0) // 拒时零库副作用
    // 幽灵 folderId（upsertNode 显式给值不存在）拒
    expect(() =>
      lineage.upsertNode({ paperId: null, title: '幽灵图节点', coreIdea: '', year: 2024, x: null, y: null, folderId: 'f-ghost' })
    ).toThrow('幽灵 folderId')
  })
})

describe('F-FOLDER-01 updateMeta 年月节点同步+repo 写边界默认锚（§3.4+修订二）', () => {
  it('patch.year/month 同事务同步节点排序键：组变 slot=目标图组 max+1；组不变 slot 保留', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const library = createLibraryService({ repos })
    db.prepare('INSERT INTO papers (id, file_ref, sha256, title, year, added_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run('p-1', 'a.pdf', 's-1', '文献', 2024, 't', 't')
    const n = repos.lineage.upsertNode({ paperId: 'p-1', title: '节点', coreIdea: '', year: 2024, x: null, y: null, month: 3, slot: 1 })
    // 目标组（2025,null）已有 slot=5——改年后应落组末 6
    db.prepare('INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)').run('p-0', 'b.pdf', 's-0', 't', 't')
    repos.lineage.upsertNode({ paperId: 'p-0', title: '占位', coreIdea: '', year: 2025, x: null, y: null, month: 3, slot: 5 })

    const d1 = await library.updateMeta({ paperId: 'p-1', patch: { year: 2025 } })
    expect(d1.year).toBe(2025)
    const moved = db.prepare('SELECT year, month, slot FROM lineage_nodes WHERE id=?').get(n.id) as {
      year: number | null
      month: number | null
      slot: number | null
    }
    expect([moved.year, moved.month, moved.slot]).toEqual([2025, 3, 6]) // 年改=组变→落组末
    // 月份单独改（组再变）：slot 再归一
    await library.updateMeta({ paperId: 'p-1', patch: { month: 8 } })
    const moved2 = db.prepare('SELECT year, month, slot FROM lineage_nodes WHERE id=?').get(n.id) as {
      year: number | null
      month: number | null
      slot: number | null
    }
    expect([moved2.year, moved2.month, moved2.slot]).toEqual([2025, 8, 1]) // 新组 (2025,8) 空→1
    // 同组重写（年月不变值）：slot 保留
    await library.updateMeta({ paperId: 'p-1', patch: { month: 8 } })
    const moved3 = db.prepare('SELECT slot FROM lineage_nodes WHERE id=?').get(n.id) as { slot: number | null }
    expect(moved3.slot).toBe(1)
  })

  it('patch.impactFactor 落库（D1 手动字段）；未入脉络文献 patch.month 无落点照实忽略（不建节点）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const library = createLibraryService({ repos })
    db.prepare('INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('p-1', 'a.pdf', 's-1', '文献', 't', 't')
    const d = await library.updateMeta({ paperId: 'p-1', patch: { impactFactor: 3.7, month: 5 } })
    expect(d.impactFactor).toBe(3.7)
    const row = db.prepare('SELECT impact_factor FROM papers WHERE id=?').get('p-1') as { impact_factor: number | null }
    expect(row.impact_factor).toBe(3.7)
    const nodes = db.prepare('SELECT COUNT(*) c FROM lineage_nodes').get() as { c: number }
    expect(nodes.c).toBe(0) // 无节点面：month 无落点，不自动建节点
  })

  it('[回炉码 14/d1-W12] patch={month} 单独（rest 列面空集）：papers 不落库（updated_at 不刷新）+节点月同步照走', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const library = createLibraryService({ repos })
    db.prepare('INSERT INTO papers (id, file_ref, sha256, title, year, added_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run('p-1', 'a.pdf', 's-1', '文献', 2024, 't', 't0')
    repos.lineage.upsertNode({ paperId: 'p-1', title: '节点', coreIdea: '', year: 2024, x: null, y: null, month: 3, slot: 1 })
    const before = (db.prepare('SELECT updated_at FROM papers WHERE id=?').get('p-1') as { updated_at: string }).updated_at
    await new Promise((r) => setTimeout(r, 5))
    const d = await library.updateMeta({ paperId: 'p-1', patch: { month: 9 } })
    expect(d.year).toBe(2024)
    const after = (db.prepare('SELECT updated_at FROM papers WHERE id=?').get('p-1') as { updated_at: string }).updated_at
    expect(after).toBe(before) // 空 rest 不落库——无意义 updated_at 刷新零面
    const node = db.prepare('SELECT month, slot FROM lineage_nodes WHERE paper_id=?').get('p-1') as { month: number | null; slot: number | null }
    expect(node.month).toBe(9) // 节点月同步照走（组变 slot 归一）
    expect(node.slot).toBe(1) // 新组 (2024,9) 空→1
  })

  it('repo 写边界默认锚（主控追认补强①——修订二：NOT NULL DEFAULT 安全网移此）：upsertNode 未显式给 folderId→落 __main__', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    db.prepare('INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)').run('p-1', 'a.pdf', 's-1', 't', 't')
    const node = repos.lineage.upsertNode({ paperId: 'p-1', title: '默认归主图', coreIdea: '', year: 2024, x: null, y: null })
    expect(node.folderId).toBe(MAIN_GRAPH_ID)
    const row = db.prepare('SELECT folder_id FROM lineage_nodes WHERE id=?').get(node.id) as { folder_id: string }
    expect(row.folder_id).toBe('__main__')
  })
})
