/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-context.service 用例（always-active 真库真 repos
 * 夹具——ai-sessions.service.test 同型）。覆盖简报 §4：形态校验/缓存键（格式+
 * epoch bump+字节相等）/L1 三档（paper 摘要+记忆索引/global 能力清单/lineage 骨架
 * 五段+星标序+120 护栏+边两端正交+笔记在档）/L1 cap 兜底/L2 三档片系统（配额+
 * 片 cap 120+恒空源+整片舍弃防御）/INV-J epoch 集合对账。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  createAiContextService,
  EPOCH_TABLES,
  LINEAGE_NODE_GUARD,
  PIECE_TOKEN_CAP
} from '../../../src/main/services/ai/ai-context.service'
import type { AiScope } from '../../../src/main/db/repos/ai-sessions.repo'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'
import { estimateTokens } from '../../../src/main/services/ai/ai-estimate'

type Db = ReturnType<typeof createTestDb>
type Svc = ReturnType<typeof createAiContextService>

function seedPaper(
  db: Db,
  id: string,
  v: {
    title?: string
    year?: number | null
    venue?: string
    authors?: string
    abstract?: string
    doi?: string | null
    arxiv?: string | null
    folderId?: string
  } = {}
): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, authors_json, year, venue, doi,
       arxiv_id, abstract, folder_id, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 't', 't')`
  ).run(
    id,
    `f/${id}.pdf`,
    `sha-${id}`,
    v.title ?? `文献${id}`,
    v.authors ?? '[]',
    v.year === undefined ? 2020 : v.year,
    v.venue ?? '期刊甲',
    v.doi ?? null,
    v.arxiv ?? null,
    v.abstract ?? '摘要内容',
    v.folderId ?? '__main__'
  )
}

function seedCollection(db: Db, id: string, name?: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name ?? `图${id}`)
}

function seedNote(db: Db, paperId: string, content: string): void {
  db.prepare(
    `INSERT INTO notes (id, paper_id, content_md, created_at, updated_at)
     VALUES (?, ?, ?, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
  ).run(`n-${paperId}`, paperId, content)
}

function seedAnnotation(db: Db, id: string, paperId: string, updatedAt: string, quote: string): void {
  db.prepare(
    `INSERT INTO annotations (id, paper_id, page, kind, quote_text, comment, sort_key,
       created_at, updated_at)
     VALUES (?, ?, 1, 'highlight', ?, '', '1:00000000', ?, ?)`
  ).run(id, paperId, quote, updatedAt, updatedAt)
}

function seedTag(db: Db, id: string, name: string, folderId: string): void {
  db.prepare(`INSERT INTO tags (id, name, folder_id) VALUES (?, ?, ?)`).run(id, name, folderId)
}

function attachTag(db: Db, paperId: string, tagId: string): void {
  db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES (?, ?)`).run(paperId, tagId)
}

function seedNode(db: Db, id: string, folderId: string, createdAt: string, title?: string): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, title, year, x, y, folder_id, created_at, updated_at)
     VALUES (?, ?, 2020, NULL, NULL, ?, ?, ?)`
  ).run(id, title ?? `节点${id}`, folderId, createdAt, createdAt)
}

function seedEdge(db: Db, id: string, from: string, to: string, label = '连线'): void {
  db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, created_at, updated_at)
     VALUES (?, ?, ?, ?, 't1', 't1')`
  ).run(id, from, to, label)
}

function seedMemory(
  db: Db,
  id: number,
  scope: 'paper' | 'lineage' | 'global',
  anchor: string | null,
  category: string,
  title: string,
  updatedAt = '2024-01-01T00:00:00.000Z',
  pinned: 0 | 1 = 0,
  content = '内容'
): void {
  db.prepare(
    `INSERT INTO ai_memory (id, scope, anchor_id, category, title, content, pinned, origin,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', '2024-01-01T00:00:00.000Z', ?)`
  ).run(id, scope, anchor, category, title, content, pinned, updatedAt)
}

function makeSvc(db: Db, caps?: Parameters<typeof createAiContextService>[0]['caps']): Svc {
  return createAiContextService({ repos: createRepos(db), caps })
}

function assemble(svc: Svc, scope: AiScope, anchorId: string | null) {
  return svc.assemblePrefix({ scope, anchorId })
}

function expectInvalid(run: () => unknown): void {
  try {
    run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect((e as { code?: string }).code).toBe('INVALID_REQUEST')
  }
}

/** L2 片行抽取（[源] 前缀行过滤——片系统断言面） */
function pieceLines(prefix: string): string[] {
  return prefix.split('\n').filter((l) => /^\[/.test(l))
}

describe('F-DBCAMP-01 DB-2 U2b-2a ai-context.service —— L1/L2 前缀装配引擎', () => {
  it('X1 形态：scope 三值集外 → INVALID_REQUEST', () => {
    const db = createTestDb()
    expectInvalid(() => assemble(makeSvc(db), 'project' as AiScope, 'p-1'))
    db.close()
  })

  it('X2 形态：global 带 anchorId≠null → INVALID_REQUEST', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    expectInvalid(() => assemble(makeSvc(db), 'global', 'p-1'))
    db.close()
  })

  it('X3 形态：paper/lineage anchorId null 或空串 → INVALID_REQUEST', () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    expectInvalid(() => assemble(svc, 'paper', null))
    expectInvalid(() => assemble(svc, 'paper', ''))
    expectInvalid(() => assemble(svc, 'lineage', null))
    expectInvalid(() => assemble(svc, 'lineage', ''))
    db.close()
  })

  it('X4 缓存键格式：`${scope}|${anchor}|${ctxVer}`（epoch 向量随写前进）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    // 播种 1 paper → papers=1；其余 9 表 0
    const expected =
      'paper|p-1|papers=1;collections=0;tags=0;paper_tags=0;notes=0;annotations=0;' +
      'lineage_graph_meta=0;lineage_nodes=0;lineage_edges=0;ai_memory=0'
    expect(r.cacheKey).toBe(expected)
    const g = assemble(makeSvc(db), 'global', null)
    expect(g.cacheKey.startsWith('global||papers=')).toBe(true)
    db.close()
  })

  it('X5 epoch bump → ctxVer 变化（缓存键前进=失效信号）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const svc = makeSvc(db)
    const before = assemble(svc, 'paper', 'p-1').cacheKey
    seedMemory(db, 1, 'paper', 'p-1', 'method_note', '新记忆')
    const after = assemble(svc, 'paper', 'p-1').cacheKey
    expect(after).not.toBe(before)
    expect(after).toContain('ai_memory=1')
    db.close()
  })

  it('X6 字节相等：同库同键两次装配 prefix===（硬断言）+meta deep-equal（软断言）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { abstract: '摘要'.repeat(30) })
    seedNote(db, 'p-1', '笔记'.repeat(10))
    seedAnnotation(db, 'a-1', 'p-1', '2024-01-01T00:00:00.000Z', '引文甲')
    seedTag(db, 't-1', '浊度', '__main__')
    attachTag(db, 'p-1', 't-1')
    seedMemory(db, 1, 'paper', 'p-1', 'method_note', '方法记忆', '2024-01-02T00:00:00.000Z')
    seedMemory(db, 2, 'paper', 'p-1', 'method_note', '置顶记忆', '2024-01-01T00:00:00.000Z', 1)
    const svc = makeSvc(db)
    const a = assemble(svc, 'paper', 'p-1')
    const b = assemble(svc, 'paper', 'p-1')
    expect(a.prefix).toBe(b.prefix)
    expect(a.meta).toEqual(b.meta)
    expect(a.cacheKey).toBe(b.cacheKey)
    db.close()
  })

  it('X7 L1 paper：锚摘要行=标题/年份/期刊/作者（前 3 逗号隔+>3 加等）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', {
      title: '漏损检测研究',
      year: 2023,
      venue: '水务学报',
      authors: '["张三","李四","王五","赵六"]'
    })
    seedPaper(db, 'p-2', { authors: '["甲","乙"]', year: null })
    const svc = makeSvc(db)
    const r1 = assemble(svc, 'paper', 'p-1')
    const line = r1.prefix.split('\n')[0]!
    expect(line).toContain('【文献档案】漏损检测研究（2023|水务学报）作者：张三，李四，王五等')
    const r2 = assemble(svc, 'paper', 'p-2')
    expect(r2.prefix.split('\n')[0]!).toContain('（-|期刊甲）作者：甲，乙')
    db.close()
  })

  it('X8 L1 paper：记忆索引分类行（计数+置顶/最近标题）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    seedMemory(db, 1, 'paper', 'p-1', 'method_note', '置甲', '2024-01-01T00:00:00.000Z', 1)
    seedMemory(db, 2, 'paper', 'p-1', 'method_note', '置乙', '2024-01-02T00:00:00.000Z', 1)
    seedMemory(db, 3, 'paper', 'p-1', 'method_note', '近丙', '2024-01-03T00:00:00.000Z')
    seedMemory(db, 4, 'paper', 'p-1', 'critique_limit', '评甲', '2024-01-04T00:00:00.000Z')
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    const idx = r.prefix.split('\n').filter((l) => l.startsWith('- '))
    // 定义序：excerpt_quote<method_note<... critique_limit 按 AI_MEMORY_CATEGORIES.paper 序
    expect(idx[0]!).toBe('- method_note×3 置顶[置乙|置甲] 最近[近丙|置乙|置甲]')
    expect(idx[1]!).toBe('- critique_limit×1 置顶[] 最近[评甲]')
    db.close()
  })

  it('X9 L1 paper：无记忆 → 单行（暂无记忆）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    expect(r.prefix).toContain('【记忆索引】\n（暂无记忆）')
    db.close()
  })

  it('X10 L1 global：能力清单（9 动作字样在场+任务派发说明+记忆管理概述）', () => {
    const db = createTestDb()
    const r = assemble(makeSvc(db), 'global', null)
    for (const action of [
      'memory.create', 'memory.update', 'memory.delete', 'memory.pin', 'memory.unpin',
      'memory.search', 'memory.list', 'message.pin', 'message.unpin'
    ]) {
      expect(r.prefix).toContain(action)
    }
    expect(r.prefix).toContain('显式声明目标')
    expect(r.prefix).toContain('【能力清单】')
    db.close()
  })

  it('X11 L1 global：记忆索引（scope=global 本档隔离）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    seedMemory(db, 1, 'global', null, 'user_preference', '偏好甲')
    seedMemory(db, 2, 'paper', 'p-1', 'method_note', '他档隔离')
    const r = assemble(makeSvc(db), 'global', null)
    expect(r.prefix).toContain('- user_preference×1 置顶[] 最近[偏好甲]')
    expect(r.prefix).not.toContain('他档隔离')
    db.close()
  })

  it('X12 L1 lineage：骨架六段结构标记在场', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1', '给水管网图')
    seedNode(db, 'n-1', 'c-1', '2024-01-01T00:00:00.000Z', '节点一')
    seedEdge(db, 'e-1', 'n-1', 'n-1')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    for (const mark of ['【脉络图】', '【文献】', '【连线】', '【标签】', '【笔记在档】', '【记忆索引】']) {
      expect(r.prefix).toContain(mark)
    }
    expect(r.prefix).toContain('给水管网图（1 节点）')
    db.close()
  })

  it('X13 L1 lineage：星标优先序（is_starred DESC→度数 DESC→title,id ASC）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '非星标文献', folderId: 'c-1' })
    seedPaper(db, 'p-2', { title: '星标文献', folderId: 'c-1' })
    db.prepare('UPDATE papers SET is_starred = 1 WHERE id = ?').run('p-2')
    seedNode(db, 'n-1', 'c-1', '2024-01-01T00:00:00.000Z', '甲节点')
    seedNode(db, 'n-2', 'c-1', '2024-01-02T00:00:00.000Z', '乙节点')
    db.prepare(`UPDATE lineage_nodes SET paper_id = ? WHERE id = 'n-1'`).run('p-1')
    db.prepare(`UPDATE lineage_nodes SET paper_id = ? WHERE id = 'n-2'`).run('p-2')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    const lines = r.prefix.split('\n').filter((l) => l.startsWith('【文献】'))
    expect(lines.map((l) => (l.match(/★/) ? 'star' : 'plain'))).toEqual(['star', 'plain'])
    expect(lines[0]).toContain('★乙节点')
    db.close()
  })

  it('X14 L1 lineage 护栏：121 节点→截断至 120+meta.l1Truncated(node-guard-120)', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    for (let i = 1; i <= 121; i++) {
      const id = `n${String(i).padStart(3, '0')}`
      seedNode(db, id, 'c-1', `2024-01-01T00:00:0${String(i % 10).padStart(1, '0')}.000Z`)
    }
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    const nodeLines = r.prefix.split('\n').filter((l) => l.startsWith('【文献】'))
    expect(nodeLines).toHaveLength(LINEAGE_NODE_GUARD)
    expect(r.meta.l1Truncated).toEqual({ section: '文献', reason: 'node-guard-120' })
    expect(r.prefix).toContain(`，已截断至 ${LINEAGE_NODE_GUARD}——护栏）`)
    // 序=title ASC：保留集=前 120（n001..n120），n121 殿后被裁
    expect(nodeLines[0]).toContain('节点n001')
    expect(r.prefix).not.toContain('节点n121')
    db.close()
  })

  it('X15 L1 lineage 截断时：连线两端过滤（含被裁端点的边不入）+边序 id ASC', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    // 度分层：v1..v121 节点（单 CJK 码点题=0x4E00+i，题序=i 序）；边=60 配对
    // （v1-v2..v119-v120）+1 条 v120→v121 ⇒ 度：v120=2、其余=1——序=度数 DESC→
    // title ASC ⇒ 保留 v1..v120、裁 v121（同度末位）。骨架规模控 ~1600<1800
    // （不触发 L1 cap 兜底——护栏语义独立直证）
    const title = (i: number): string => String.fromCodePoint(0x4e00 + i)
    for (let i = 1; i <= 121; i++) {
      seedNode(db, `v${String(i).padStart(3, '0')}`, 'c-1', '2024-01-01T00:00:00.000Z', title(i))
    }
    for (let i = 1; i <= 119; i += 2) {
      seedEdge(db, `e-${String((i + 1) / 2).padStart(3, '0')}`, `v${String(i).padStart(3, '0')}`,
        `v${String(i + 1).padStart(3, '0')}`, '联')
    }
    seedEdge(db, 'e-000', 'v120', 'v121', '联')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    const edgeLines = r.prefix.split('\n').filter((l) => l.startsWith('【连线】'))
    // 保留边=60 配对边；v120→v121 边被两端过滤排除（v121 裁出保留集）
    expect(edgeLines).toHaveLength(60)
    // 真排他（d1-N2 改；r2 再删残余恒真 '节点v121'——播种显式传单码点题，
    // '节点${id}' 默认题形态无生成路径，恒真断言禁留）：被裁节点 v121 标题缺席
    // （title(121) 单码点不与任何保留行共享——节点行与 e-000 边行双杀）
    expect(r.prefix).not.toContain(title(121))
    // 护栏 meta（非 l1-cap 兜底）
    expect(r.meta.l1Truncated).toEqual({ section: '文献', reason: 'node-guard-120' })
    // 边序=id ASC：首行=e-001（v1→v2——播种序乱序后仍按 id）
    expect(edgeLines[0]).toBe(`【连线】${title(1)} → ${title(2)}〔联〕`)
    expect(edgeLines[1]).toBe(`【连线】${title(3)} → ${title(4)}〔联〕`)
    db.close()
  })

  it('X16 L1 lineage：笔记在档清单（有笔记文献标题）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '有笔记文献', folderId: 'c-1' })
    seedPaper(db, 'p-2', { title: '无笔记文献', folderId: 'c-1' })
    seedNote(db, 'p-1', '笔记内容')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    expect(r.prefix).toContain('【笔记在档】有笔记文献')
    expect(r.prefix).not.toContain('无笔记文献')
    db.close()
  })

  it('X17 L1 lineage：记忆索引（lineage 档分类）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedMemory(db, 1, 'lineage', 'c-1', 'branch_summary', '综述甲')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    expect(r.prefix).toContain('- branch_summary×1 置顶[] 最近[综述甲]')
    db.close()
  })

  it('X18 L1 cap 兜底：caps 注入小 L1_CAP→尾部截断+meta(l1-cap)', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { title: '长标题文献', abstract: '摘要'.repeat(50) })
    const svc = makeSvc(db, { l1Cap: { paper: 12 } })
    const r = assemble(svc, 'paper', 'p-1')
    expect(r.meta.l1Truncated).toEqual({ section: 'L1', reason: 'l1-cap' })
    expect(estimateTokens(r.prefix.split('\n')[0]!)).toBeLessThanOrEqual(12)
    db.close()
  })

  it('X19 L2 paper：元数据 A/B 两片', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', {
      year: 2021, venue: '水研究', doi: '10.1000/x', arxiv: '2101.00001', abstract: '正文摘要'
    })
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    const pieces = pieceLines(r.prefix)
    expect(pieces).toContain('[发表] 2021|水研究|doi:10.1000/x|arxiv:2101.00001')
    expect(pieces).toContain('[摘要] 正文摘要')
    db.close()
  })

  it('X20 L2 paper：笔记恒 1 片（title 恒空——[笔记] |content 形态）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    seedNote(db, 'p-1', '笔记主体内容')
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    const notePieces = pieceLines(r.prefix).filter((l) => l.startsWith('[笔记] '))
    expect(notePieces).toEqual(['[笔记] |笔记主体内容'])
    db.close()
  })

  it('X21 L2 paper：标注 ≤4 片 A 型序（5 行取前 4=最新序）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    for (let i = 1; i <= 5; i++) {
      seedAnnotation(db, `a-${i}`, 'p-1', `2024-01-0${i}T00:00:00.000Z`, `引文${i}`)
    }
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    const ann = pieceLines(r.prefix).filter((l) => l.startsWith('[标注] '))
    expect(ann).toEqual([
      '[标注] p1highlight|引文5',
      '[标注] p1highlight|引文4',
      '[标注] p1highlight|引文3',
      '[标注] p1highlight|引文2'
    ])
    db.close()
  })

  it('X22 L2 paper：标签 ≤3 片（B 型 id ASC）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    for (const [id, name] of [['t-1', '甲'], ['t-2', '乙'], ['t-3', '丙'], ['t-4', '丁']] as const) {
      seedTag(db, id, name, '__main__')
      attachTag(db, 'p-1', id)
    }
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    const tags = pieceLines(r.prefix).filter((l) => l.startsWith('[标签] '))
    expect(tags).toEqual(['[标签] 甲', '[标签] 乙', '[标签] 丙'])
    db.close()
  })

  it('X23 L2 paper：文件夹片（folder_id 一跳名）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1', '管网文件夹')
    seedPaper(db, 'p-1', { folderId: 'c-1' })
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    expect(pieceLines(r.prefix)).toContain('[文件夹] 管网文件夹')
    db.close()
  })

  it('X24 L2 paper：片 cap 120 截断（300 码点摘要→片估计 ≤120）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { abstract: '长'.repeat(300) })
    const r = assemble(makeSvc(db), 'paper', 'p-1')
    const abs = pieceLines(r.prefix).find((l) => l.startsWith('[摘要] '))!
    expect(estimateTokens(abs)).toBeLessThanOrEqual(PIECE_TOKEN_CAP)
    expect([...abs].length).toBeLessThan(300)
    db.close()
  })

  it('X25 L2 lineage：图元=恒空源（meta.emptySources 含 graph_meta——P14）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    expect(r.meta.emptySources).toContain('graph_meta')
    // 实际 lineage L2 恒 1 片（文件夹）
    const pieces = pieceLines(r.prefix)
    expect(pieces).toHaveLength(1)
    db.close()
  })

  it('X26 L2 lineage：文件夹 1 片（锚 collections.name）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1', '漏损图谱')
    const r = assemble(makeSvc(db), 'lineage', 'c-1')
    expect(pieceLines(r.prefix)).toEqual(['[文件夹] 漏损图谱'])
    db.close()
  })

  it('X27 L2 global：6 类×top-1=6 片（P1——配额 8 上限自然吸收）', () => {
    const db = createTestDb()
    // 6 global 类各 2 行（top-1=新时间行）+1 档外类行（paper 档隔离）
    const cats = ['user_preference', 'ui_guidance', 'capability_note', 'automation_recipe', 'task_outcome', 'constraint_limit']
    let id = 1
    for (const cat of cats) {
      seedMemory(db, id++, 'global', null, cat, `${cat}旧`, '2024-01-01T00:00:00.000Z')
      seedMemory(db, id++, 'global', null, cat, `${cat}新`, '2024-02-01T00:00:00.000Z')
    }
    seedPaper(db, 'p-1')
    seedMemory(db, id, 'paper', 'p-1', 'method_note', '档外不入')
    const r = assemble(makeSvc(db), 'global', null)
    const memPieces = pieceLines(r.prefix).filter((l) => l.startsWith('[记忆:'))
    expect(memPieces).toHaveLength(6)
    // 定义序迭代+top-1 取新行
    expect(memPieces[0]).toBe('[记忆:user_preference] user_preference新|内容')
    expect(memPieces[5]).toBe('[记忆:constraint_limit] constraint_limit新|内容')
    expect(r.prefix).not.toContain('档外不入')
    expect(memPieces.every((p) => estimateTokens(p) <= PIECE_TOKEN_CAP)).toBe(true)
    db.close()
  })

  it('X28 L2 global：某类空=该类无片不占位（5 类播种→5 片）', () => {
    const db = createTestDb()
    const cats = ['user_preference', 'ui_guidance', 'capability_note', 'automation_recipe', 'task_outcome']
    let id = 1
    for (const cat of cats) seedMemory(db, id++, 'global', null, cat, `${cat}题`)
    const r = assemble(makeSvc(db), 'global', null)
    const memPieces = pieceLines(r.prefix).filter((l) => l.startsWith('[记忆:'))
    expect(memPieces).toHaveLength(5)
    expect(memPieces.map((p) => p.split(']')[0]!.slice(4))).toEqual(cats)
    db.close()
  })

  it('X29 L2 整片舍弃防御：caps 注入小 L2_CAP→尾部整片舍弃+meta.l2Dropped（P6 防御分支）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { abstract: '摘'.repeat(100) })
    seedNote(db, 'p-1', '笔'.repeat(30))
    seedAnnotation(db, 'a-1', 'p-1', '2024-01-01T00:00:00.000Z', '标'.repeat(20))
    const svc = makeSvc(db, { l2Cap: { paper: 60 } })
    const r = assemble(svc, 'paper', 'p-1')
    expect(r.meta.l2Dropped).toBeDefined()
    expect(r.meta.l2Dropped!.length).toBeGreaterThan(0)
    const total = pieceLines(r.prefix).reduce((s, l) => s + estimateTokens(l), 0)
    expect(total).toBeLessThanOrEqual(60)
    // 舍弃=整片（不截半片）：在场片数 < 全量片数（4 源全播种）
    expect(pieceLines(r.prefix).length).toBeLessThan(4)
    db.close()
  })

  it('X30 INV-J 对账：EPOCH_TABLES 常量集==change_epochs 播种行集（集合差双向为空）', () => {
    const db = createTestDb()
    const seeded = (db.prepare('SELECT table_name FROM change_epochs').all() as Array<{
      table_name: string
    }>).map((r) => r.table_name)
    expect([...EPOCH_TABLES].filter((t) => !seeded.includes(t))).toEqual([])
    expect(seeded.filter((t) => !EPOCH_TABLES.includes(t))).toEqual([])
    expect(seeded).toHaveLength(10)
    db.close()
  })

  it('X31 护栏+L1 cap 叠加：121 节点+注入小 l1Cap → meta.l1Truncated 后写覆盖=l1-cap（行为锁 d1-N3）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    const title = (i: number): string => String.fromCodePoint(0x4e00 + i)
    for (let i = 1; i <= 121; i++) {
      seedNode(db, `v${String(i).padStart(3, '0')}`, 'c-1', '2024-01-01T00:00:00.000Z', title(i))
    }
    const svc = makeSvc(db, { l1Cap: { lineage: 50 } })
    const r = assemble(svc, 'lineage', 'c-1')
    // guard 先记 node-guard-120 → cap 兜底后写覆盖（最终截断面为准）
    expect(r.meta.l1Truncated).toEqual({ section: 'L1', reason: 'l1-cap' })
    // 深截断直证：cap=50 下后段节点题（title(100)）不入前缀
    expect(r.prefix).not.toContain(title(100))
    db.close()
  })

  it('X32 emptySources 去重（k3-W1+d1-N1）：paper 幽灵锚 paper 恰一次；lineage 幽灵含 folder（头注语义不变）', () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const p = assemble(svc, 'paper', 'p-ghost')
    // L1 与 L2 幽灵分支各 push 一次 'paper'——去重收口后恰一次；notesOf 幽灵=null
    expect(p.meta.emptySources.filter((s) => s === 'paper')).toHaveLength(1)
    expect(p.meta.emptySources).toContain('note')
    expect(p.prefix).toContain('（未知锚）')
    const l = assemble(svc, 'lineage', 'c-ghost')
    expect(l.meta.emptySources).toContain('folder')
    expect(l.meta.emptySources).toContain('graph_meta')
    db.close()
  })
})
