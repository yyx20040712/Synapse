/**
 * [F-DBCAMP-01 DB-2 U2b-2b] ai-tail.service 用例（always-active 真库真 repos
 * 夹具——ai-context.service.test 同型）。覆盖简报 §4-2：形态（幽灵 NOT_FOUND/
 * currentMessage 类型闸）+窗（正序输出/新到旧装入/边界截断/分桶/三档预算）+
 * 召回（三路由/隔离谓词/topK/cap 截断）+文献（top-5/单篇 250/腿 300/仅 lineage）+
 * 代理（识别契约/cap 200）+meta+两次调用 ===+caps 注入+INV-131 两断言
 * （cacheKey 零耦合+消息写后前缀字节相等）。
 */
import { describe, expect, it } from 'vitest'
import { createAiTailService, LITERATURE_PAPER_CAP } from '../../../src/main/services/ai/ai-tail.service'
import { createAiContextService } from '../../../src/main/services/ai/ai-context.service'
import { createAiTasksService } from '../../../src/main/services/ai/ai-tasks.service'
import { MEMORY_SEARCH_TOP_K } from '../../../src/main/services/ai/ai-memory-search.service'
import { estimateTokens } from '../../../src/main/services/ai/ai-estimate'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>
type Svc = ReturnType<typeof createAiTailService>

function seedPaper(
  db: Db,
  id: string,
  v: { title?: string; abstract?: string; year?: number | null; folderId?: string } = {}
): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, authors_json, year, venue, doi,
       arxiv_id, abstract, folder_id, added_at, updated_at)
     VALUES (?, ?, ?, ?, '[]', ?, '期刊甲', NULL, NULL, ?, ?, 't', 't')`
  ).run(
    id,
    `f/${id}.pdf`,
    `sha-${id}`,
    v.title ?? `文献${id}`,
    v.year === undefined ? 2020 : v.year,
    v.abstract ?? '摘要内容',
    v.folderId ?? '__main__'
  )
}

function seedCollection(db: Db, id: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, `图${id}`)
}

function seedNode(db: Db, id: string, folderId: string, paperId: string): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, title, year, x, y, folder_id, paper_id, created_at, updated_at)
     VALUES (?, ?, 2020, NULL, NULL, ?, ?, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
  ).run(id, `节点${id}`, folderId, paperId)
}

function seedNote(db: Db, paperId: string, content: string): void {
  db.prepare(
    `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
     VALUES (?, ?, '', ?, 't', 't')`
  ).run(`n-${paperId}`, paperId, content)
}

function seedMemory(
  db: Db,
  scope: 'paper' | 'lineage' | 'global',
  anchor: string | null,
  title: string,
  content = '内容',
  updatedAt = '2024-01-01T00:00:00.000Z'
): void {
  const category =
    scope === 'paper' ? 'method_note' : scope === 'lineage' ? 'node_role' : 'user_preference'
  db.prepare(
    `INSERT INTO ai_memory (scope, anchor_id, category, title, content, pinned, origin,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, 'manual', ?, ?)`
  ).run(scope, anchor, category, title, content, updatedAt, updatedAt)
}

/** 消息直插（绕 50 上限淘汰——窗口腿预算测试需 >50 行确定性底座） */
function seedMsg(db: Db, sessionId: number, role: 'user' | 'assistant', content: string): void {
  db.prepare(
    `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
     VALUES (?, ?, ?, 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
  ).run(sessionId, role, content)
}

function makeSvc(db: Db, caps?: Parameters<typeof createAiTailService>[0]['caps']): Svc {
  return createAiTailService({ repos: createRepos(db), caps })
}

function expectDomainError(run: () => unknown, code: string, ...msgParts: string[]): void {
  try {
    run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect((e as { code?: string }).code).toBe(code)
    for (const part of msgParts) expect((e as Error).message).toContain(part)
  }
}

/** 代理信封（handlers 回写形状——INV-130） */
function envelope(rows: Array<{ id: number; title: string }> = []): string {
  return JSON.stringify({ action: 'memory.list', count: rows.length, rows })
}

describe('F-DBCAMP-01 DB-2 U2b-2b ai-tail.service —— L3 尾段现算装配', () => {
  it('T1 形态：幽灵会话 → NOT_FOUND「会话不存在」（与 ai-sessions.service 逐字对齐）', () => {
    const db = createTestDb()
    expectDomainError(() => makeSvc(db).assembleTail({ sessionId: 9999, currentMessage: 'x' }), 'NOT_FOUND', '会话不存在')
    db.close()
  })

  it('T2 形态：currentMessage 非 string → INVALID_REQUEST（形态先于存在性——裁③）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const svc = makeSvc(db)
    expectDomainError(
      () => svc.assembleTail({ sessionId: s.id, currentMessage: 42 as never }),
      'INVALID_REQUEST'
    )
    // 序锁：幽灵会话+非 string 并存 → 形态闸先于存在性（INVALID_REQUEST 非 NOT_FOUND）
    expectDomainError(
      () => svc.assembleTail({ sessionId: 9999, currentMessage: 42 as never }),
      'INVALID_REQUEST'
    )
    db.close()
  })

  it('T3 消息窗正序输出：旧→新（渲染 [user]/[assistant] 前缀）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    seedMsg(db, s.id, 'user', '第一条')
    seedMsg(db, s.id, 'assistant', '第二条')
    seedMsg(db, s.id, 'user', '第三条')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '' })
    const lines = r.tail.split('\n')
    expect(lines).toEqual(['[user] 第一条', '[assistant] 第二条', '[user] 第三条'])
    expect(r.meta.windowLoaded).toBe(3)
    expect(r.meta.windowTruncated).toBe(false)
    db.close()
  })

  it('T4 消息窗新到旧装入+边界截断：注入 window cap 7→最新整条+次新截半+最旧弃', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    for (let i = 1; i <= 3; i++) seedMsg(db, s.id, 'user', '甲甲甲')
    // 每行 `[user] 甲甲甲` = 7 ASCII×0.25 + 3 CJK = 4.75 → 5 tok；cap 7：m3 整条（5），
    // m2 余 2 → 截 '[user] '（7 码点 ASCII=1.75→2 tok），m1 弃
    const r = makeSvc(db, { window: { paper: 7 } }).assembleTail({ sessionId: s.id, currentMessage: '' })
    expect(r.tail.split('\n')).toEqual(['[user] ', '[user] 甲甲甲'])
    expect(r.meta.windowLoaded).toBe(2)
    expect(r.meta.windowTruncated).toBe(true)
    expect(r.meta.legsTruncated).toEqual(['window'])
    db.close()
  })

  it('T5 分桶：信封 assistant 入代理腿（原样 content）；非信封 assistant 留窗（4 形负对照）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const createEnv = JSON.stringify({ action: 'memory.create', memoryId: 1 })
    const noAction = JSON.stringify({ ok: true })
    const e1 = envelope([{ id: 1, title: '题一' }])
    const e2 = envelope([{ id: 2, title: '题二' }])
    seedMsg(db, s.id, 'user', '问')
    seedMsg(db, s.id, 'assistant', createEnv)
    seedMsg(db, s.id, 'assistant', '普通助手文本')
    seedMsg(db, s.id, 'assistant', e1)
    seedMsg(db, s.id, 'assistant', '[1,2,3]')
    seedMsg(db, s.id, 'assistant', noAction)
    seedMsg(db, s.id, 'assistant', e2)
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '' })
    const lines = r.tail.split('\n')
    // 窗腿（对话桶正序）：user+3 个非信封 assistant（create 动作/纯文本/JSON 数组/noAction）
    expect(lines.slice(0, 5)).toEqual([
      '[user] 问',
      `[assistant] ${createEnv}`,
      '[assistant] 普通助手文本',
      '[assistant] [1,2,3]',
      `[assistant] ${noAction}`
    ])
    // 代理腿（新到旧原样）：e2 在前 e1 在后；信封不重复渲染为 [assistant] 行
    expect(lines.slice(5)).toEqual([e2, e1])
    expect(r.meta.agentLoaded).toBe(2)
    expect(r.meta.windowLoaded).toBe(5)
    db.close()
  })

  it('T6 三档预算：46 行×10 tok → paper/global 全装（≤500）、lineage 截断（400）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    seedCollection(db, 'c-1')
    const repos = createRepos(db)
    const ids: Array<[number, 'paper' | 'lineage' | 'global', string | null]> = [
      [1, 'paper', 'p-1'],
      [2, 'lineage', 'c-1'],
      [3, 'global', null]
    ]
    const sessions = ids.map(([n, scope, anchor]) => {
      const s = repos.aiSessions.createSession(scope as never, anchor)
      for (let i = 0; i < 46; i++) seedMsg(db, s.id, 'user', '甲'.repeat(8))
      return [n, s.id] as const
    })
    const svc = makeSvc(db)
    const p = svc.assembleTail({ sessionId: sessions[0]![1], currentMessage: '' })
    expect(p.meta.windowLoaded).toBe(46)
    expect(p.meta.windowTruncated).toBe(false)
    const l = svc.assembleTail({ sessionId: sessions[1]![1], currentMessage: '' })
    // cap 400：最新 40 行恰满（40×10），第 41 行余 0 → 弃+truncated
    expect(l.meta.windowLoaded).toBe(40)
    expect(l.meta.windowTruncated).toBe(true)
    const g = svc.assembleTail({ sessionId: sessions[2]![1], currentMessage: '' })
    expect(g.meta.windowLoaded).toBe(46)
    expect(g.meta.windowTruncated).toBe(false)
    db.close()
  })

  it('T7 召回三路由：空串→empty 零行、2 码点→like、≥3 码点→match', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    seedMemory(db, 'paper', 'p-1', '浊度甲', '浊度监测年报')
    const svc = makeSvc(db)
    const empty = svc.assembleTail({ sessionId: s.id, currentMessage: '   ' })
    expect(empty.meta.recallRoute).toBe('empty')
    expect(empty.meta.recallRows).toBe(0)
    expect(empty.tail).not.toContain('[记忆召回')
    const like = svc.assembleTail({ sessionId: s.id, currentMessage: '浊度' })
    expect(like.meta.recallRoute).toBe('like')
    expect(like.meta.recallRows).toBe(1)
    const match = svc.assembleTail({ sessionId: s.id, currentMessage: '浊度监测' })
    expect(match.meta.recallRoute).toBe('match')
    expect(match.meta.recallRows).toBe(1)
    db.close()
  })

  it('T8 召回隔离谓词：scope+anchor 传会话行值（本锚行 only——他锚/global 不入）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    seedMemory(db, 'paper', 'p-1', '浊度甲')
    seedMemory(db, 'paper', 'p-2', '浊度乙')
    seedMemory(db, 'global', null, '浊度丙')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '浊度' })
    expect(r.meta.recallRows).toBe(1)
    expect(r.tail).toContain('[记忆召回:method_note] 浊度甲|内容')
    expect(r.tail).not.toContain('浊度乙')
    expect(r.tail).not.toContain('浊度丙')
    db.close()
  })

  it('T9 召回 topK：10 命中→恰 8（MEMORY_SEARCH_TOP_K 单源）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    for (let i = 1; i <= 10; i++) seedMemory(db, 'paper', 'p-1', `浊度${i}号`)
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '浊度' })
    expect(r.meta.recallRows).toBe(MEMORY_SEARCH_TOP_K)
    expect(r.tail.split('\n').filter((l) => l.startsWith('[记忆召回'))).toHaveLength(8)
    db.close()
  })

  it('T10 召回腿 cap 截断：注入 recall 100→首行整装+次行截半+余弃（legsTruncated）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    for (let i = 1; i <= 8; i++) seedMemory(db, 'paper', 'p-1', `题${i}`, '内'.repeat(50))
    // 每行 ≈60 tok（15 ASCII×0.25+56 CJK）；cap 100：行 1 整装（60）→行 2 余 40 截半
    const r = makeSvc(db, { recall: 100 }).assembleTail({ sessionId: s.id, currentMessage: '题' })
    const recallLines = r.tail.split('\n').filter((l) => l.startsWith('[记忆召回'))
    expect(recallLines).toHaveLength(2)
    expect(recallLines[1]!.length).toBeLessThan(recallLines[0]!.length)
    expect(r.meta.recallRows).toBe(8)
    expect(r.meta.legsTruncated).toContain('recall')
    db.close()
  })

  it('T11 文献 top-5：7 篇图内命中→literatureHits=5+恰 5 块', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    for (let i = 1; i <= 7; i++) {
      seedPaper(db, `p-${i}`, { title: `漏损检测${i}号`, abstract: 'x', folderId: 'c-1' })
      seedNode(db, `n-${i}`, 'c-1', `p-${i}`)
    }
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '漏损检测' })
    expect(r.meta.literatureHits).toBe(5)
    expect(r.tail.split('\n').filter((l) => l.startsWith('[文献展开]'))).toHaveLength(5)
    db.close()
  })

  it('T12 单篇 250：400 码点摘要→块估计 ≤250+前缀保留（LITERATURE_PAPER_CAP）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '甲文', abstract: '长'.repeat(400), folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '甲文' })
    const block = r.tail.split('\n').find((l) => l.startsWith('[文献展开]'))!
    expect(estimateTokens(block)).toBeLessThanOrEqual(LITERATURE_PAPER_CAP)
    expect(block.startsWith('[文献展开] 甲文（2020）|摘要 长长长')).toBe(true)
    // 单篇截断≠腿截断：legsTruncated 不含 literature（片级语义）
    expect(r.meta.legsTruncated).not.toContain('literature')
    db.close()
  })

  it('T13 文献腿 300：注入 literature 40→边界块截半（legsTruncated 含 literature）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    for (let i = 1; i <= 5; i++) {
      seedPaper(db, `p-${i}`, { title: `甲文${i}`, abstract: '摘'.repeat(15), folderId: 'c-1' })
      seedNode(db, `n-${i}`, 'c-1', `p-${i}`)
    }
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    const r = makeSvc(db, { literature: 40 }).assembleTail({ sessionId: s.id, currentMessage: '甲文' })
    const blocks = r.tail.split('\n').filter((l) => l.startsWith('[文献展开]'))
    expect(blocks.length).toBe(2)
    expect(r.meta.literatureHits).toBe(5)
    expect(r.meta.legsTruncated).toContain('literature')
    db.close()
  })

  it('T14 仅 lineage：paper/global 档无文献腿（literatureHits 缺席+零块）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { title: '漏损检测甲' })
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-2', { title: '漏损检测乙', folderId: 'c-1' })
    seedNode(db, 'n-2', 'c-1', 'p-2')
    const repos = createRepos(db)
    const svc = makeSvc(db)
    const p = svc.assembleTail({ sessionId: repos.aiSessions.createSession('paper', 'p-1').id, currentMessage: '漏损检测' })
    expect(p.meta.literatureHits).toBeUndefined()
    expect(p.tail).not.toContain('[文献展开]')
    const g = svc.assembleTail({ sessionId: repos.aiSessions.createSession('global', null).id, currentMessage: '漏损检测' })
    expect(g.tail).not.toContain('[文献展开]')
    db.close()
  })

  it('T15 INV-130 识别契约见 T5（信封=对象+action∈{memory.search,memory.list}；4 负对照在窗）——本例补 search 形', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const searchEnv = JSON.stringify({ action: 'memory.search', route: 'like', rows: [{ id: 1 }] })
    seedMsg(db, s.id, 'assistant', searchEnv)
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '' })
    expect(r.tail.split('\n')).toEqual([searchEnv])
    expect(r.meta.agentLoaded).toBe(1)
    db.close()
  })

  it('T16 代理腿 cap 200：3 信封 ~106 tok→最新整+次新截半+最旧弃', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const mk = (): string =>
      JSON.stringify({
        action: 'memory.list',
        count: 3,
        rows: [1, 2, 3].map((i) => ({ id: i, category: 'method_note', title: '题'.repeat(20) }))
      })
    const e1 = mk()
    const e2 = mk()
    const e3 = mk()
    seedMsg(db, s.id, 'assistant', e1)
    seedMsg(db, s.id, 'assistant', e2)
    seedMsg(db, s.id, 'assistant', e3)
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '' })
    const agentLines = r.tail.split('\n')
    // 新到旧：e3 整条（~106≤200）→e2 截半（余 ~94）→e1 弃
    expect(agentLines).toHaveLength(2)
    expect(agentLines[0]).toBe(e3)
    expect(agentLines[1]!.length).toBeLessThan(e2.length)
    expect(r.meta.agentLoaded).toBe(2)
    expect(r.meta.legsTruncated).toContain('agent')
    db.close()
  })

  it('T17 meta 形状：四腿全命中（lineage）→全字段（recallRoute/recallRows/literatureHits/loaded 双量）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '漏损检测甲', abstract: '摘要本体', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    seedMsg(db, s.id, 'user', '问')
    seedMemory(db, 'lineage', 'c-1', '漏损记忆', '漏损检测内容')
    seedMsg(db, s.id, 'assistant', envelope([{ id: 1, title: '题' }]))
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '漏损检测' })
    expect(r.meta).toEqual({
      scope: 'lineage',
      recallRoute: 'match',
      recallRows: 1,
      literatureHits: 1,
      windowLoaded: 1,
      windowTruncated: false,
      agentLoaded: 1,
      legsTruncated: []
    })
    db.close()
  })

  it('T18 确定性：同输入两次调用 tail ===（硬断言）+meta toEqual（软断言）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '漏损检测甲', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    seedMsg(db, s.id, 'user', '问'.repeat(30))
    seedMsg(db, s.id, 'assistant', '答'.repeat(30))
    seedMemory(db, 'lineage', 'c-1', '漏损记忆', '漏损检测'.repeat(10))
    seedMsg(db, s.id, 'assistant', envelope([{ id: 1, title: '题'.repeat(10) }]))
    const svc = makeSvc(db)
    const a = svc.assembleTail({ sessionId: s.id, currentMessage: '漏损检测' })
    const b = svc.assembleTail({ sessionId: s.id, currentMessage: '漏损检测' })
    expect(a.tail).toBe(b.tail)
    expect(a.meta).toEqual(b.meta)
    db.close()
  })

  it('T19 caps 注入全覆盖：四腿全注 1→各腿至多边界 1 tok 片（退化档不炸）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '漏损检测甲', abstract: '长'.repeat(100), folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    seedMsg(db, s.id, 'user', '问'.repeat(20))
    seedMemory(db, 'lineage', 'c-1', '漏损记忆', '漏损检测'.repeat(10))
    seedMsg(db, s.id, 'assistant', envelope([{ id: 1, title: '题'.repeat(10) }]))
    const r = makeSvc(db, {
      window: { lineage: 1 },
      recall: 1,
      literature: 1,
      agent: 1
    }).assembleTail({ sessionId: s.id, currentMessage: '漏损检测' })
    expect(r.meta.legsTruncated).toEqual(['window', 'recall', 'literature', 'agent'])
    for (const line of r.tail.split('\n')) {
      expect(estimateTokens(line)).toBeLessThanOrEqual(1)
    }
    db.close()
  })

  it('T20 INV-131 断言一 cacheKey 零耦合：写 ai_messages 后 prefix cacheKey 不变', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const ctx = createAiContextService({ repos })
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const before = ctx.assemblePrefix({ scope: 'paper', anchorId: 'p-1' })
    repos.aiSessions.insertWithEviction(s.id, 'user', '新消息——不应触碰前缀缓存键')
    const after = ctx.assemblePrefix({ scope: 'paper', anchorId: 'p-1' })
    expect(after.cacheKey).toBe(before.cacheKey)
    db.close()
  })

  it('T21 INV-131 断言二 前缀字节相等：写 ai_messages 后 prefix ===（L3 数据不入 L1/L2）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { abstract: '摘要'.repeat(20) })
    seedNote(db, 'p-1', '笔记内容')
    const repos = createRepos(db)
    const ctx = createAiContextService({ repos })
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const before = ctx.assemblePrefix({ scope: 'paper', anchorId: 'p-1' })
    repos.aiSessions.insertWithEviction(s.id, 'assistant', JSON.stringify({ action: 'memory.list', count: 0, rows: [] }))
    const after = ctx.assemblePrefix({ scope: 'paper', anchorId: 'p-1' })
    expect(after.prefix).toBe(before.prefix)
    db.close()
  })

  it('T22 装入序：窗→召回→文献→代理（indexOf 全序链）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '漏损检测甲', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    seedMsg(db, s.id, 'user', '问')
    seedMemory(db, 'lineage', 'c-1', '漏损记忆')
    seedMsg(db, s.id, 'assistant', envelope([{ id: 1, title: '题' }]))
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '漏损' })
    const iWin = r.tail.indexOf('[user] 问')
    const iRecall = r.tail.indexOf('[记忆召回')
    const iLit = r.tail.indexOf('[文献展开]')
    const iAgent = r.tail.indexOf('{"action"')
    expect(iWin).toBeGreaterThanOrEqual(0)
    expect(iRecall).toBeGreaterThan(iWin)
    expect(iLit).toBeGreaterThan(iRecall)
    expect(iAgent).toBeGreaterThan(iLit)
    db.close()
  })

  it('T23 currentMessage trim 路由：首尾空白剥离（空白包裹的查询→match）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    seedMemory(db, 'paper', 'p-1', '浊度甲', '浊度监测年报')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '  浊度监测  ' })
    expect(r.meta.recallRoute).toBe('match')
    expect(r.meta.recallRows).toBe(1)
    db.close()
  })

  it('T24 召回渲染格式：[记忆召回:{category}] {title}|{content≤120 片 cap}', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    seedMemory(db, 'paper', 'p-1', '浊度记忆', '内'.repeat(200))
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '浊度' })
    expect(r.tail.split('\n')).toEqual([`[记忆召回:method_note] 浊度记忆|${'内'.repeat(120)}`])
    db.close()
  })

  it('T25 文献渲染格式：title（year）|摘要 …|笔记 无/笔记内容（year null→短横线）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '管网论文', year: null, abstract: '摘要本体', folderId: 'c-1' })
    seedPaper(db, 'p-2', { title: '管网对照', year: 2021, abstract: '摘要乙体', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    seedNode(db, 'n-2', 'c-1', 'p-2')
    seedNote(db, 'p-2', '笔记内容')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '管网' })
    const blocks = r.tail.split('\n').filter((l) => l.startsWith('[文献展开]'))
    expect(blocks).toEqual([
      '[文献展开] 管网论文（-）|摘要 摘要本体|笔记 无',
      '[文献展开] 管网对照（2021）|摘要 摘要乙体|笔记 笔记内容'
    ])
    db.close()
  })

  it('T26 global 档全装配：窗+召回+代理三腿（无文献腿）——scope 从会话行读', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('global', null)
    seedMsg(db, s.id, 'user', '全局问题')
    seedMemory(db, 'global', null, '偏好甲')
    seedMsg(db, s.id, 'assistant', envelope([{ id: 1, title: '题' }]))
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '偏好' })
    expect(r.meta.scope).toBe('global')
    const lines = r.tail.split('\n')
    expect(lines[0]).toBe('[user] 全局问题')
    expect(lines[1]).toBe('[记忆召回:user_preference] 偏好甲|内容')
    expect(lines[2]).toBe(envelope([{ id: 1, title: '题' }]))
    expect(lines.some((l) => l.startsWith('[文献展开]'))).toBe(false)
    db.close()
  })

  // ── [r1 回炉] W2 真缺席语义+N4 产出面直证 ──

  it('T27 [r1 R-W2] literatureHits 真缺席：paper/global 档键不在场（in 检查非 undefined 值键）', () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', { title: '漏损检测甲' })
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-2', { title: '漏损检测乙', folderId: 'c-1' })
    seedNode(db, 'n-2', 'c-1', 'p-2')
    const repos = createRepos(db)
    const svc = makeSvc(db)
    const p = svc.assembleTail({
      sessionId: repos.aiSessions.createSession('paper', 'p-1').id,
      currentMessage: '漏损检测'
    })
    expect('literatureHits' in p.meta).toBe(false)
    const g = svc.assembleTail({
      sessionId: repos.aiSessions.createSession('global', null).id,
      currentMessage: '漏损检测'
    })
    expect('literatureHits' in g.meta).toBe(false)
    db.close()
  })

  it('T28 [r1 R-W2] lineage 档+empty 路由：literatureHits=0 在场（空查询零 SQL 仍记 0）', () => {
    const db = createTestDb()
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', { title: '漏损检测甲', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repos = createRepos(db)
    const s = repos.aiSessions.createSession('lineage', 'c-1')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '   ' })
    expect(r.meta.recallRoute).toBe('empty')
    expect(r.meta.literatureHits).toBe(0)
    expect('literatureHits' in r.meta).toBe(true)
    expect(r.tail).not.toContain('[文献展开]')
    db.close()
  })

  it('T29 [r1 R-N4] INV-130 产出面直证：真 handler memory.search 回写→assembleTail 识别入代理腿', async () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    const repos = createRepos(db)
    seedMemory(db, 'paper', 'p-1', '浊度语料')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    // 真 handler 表（不走 handlerOverrides）——产出面=ai-tasks.handlers 原路
    const tasks = createAiTasksService({ repos })
    const t = await tasks.submitTask({
      sessionId: s.id,
      action: 'memory.search',
      payload: { query: '浊度' }
    })
    const final = await tasks.runTask({ taskId: t.id, sessionId: s.id })
    expect(final.status).toBe('succeeded')
    const r = makeSvc(db).assembleTail({ sessionId: s.id, currentMessage: '' })
    expect(r.meta.agentLoaded).toBe(1)
    const writeback = repos.aiSessions.listMessages(s.id).find((m) => m.role === 'assistant')!
    expect(r.tail.split('\n')).toContain(writeback.content)
    expect(r.tail).toContain('"action":"memory.search"')
    db.close()
  })
})
