/**
 * [F-DBCAMP-01 DB-2 U2a] ai-memory-search.service 用例（always-active——真库真
 * repos 夹具）。覆盖简报 §4 矩阵 R1-R14+回炉 R17（paper×MATCH 跨锚）/R18（label
 * 列命中）/R19（LIKE 路 topK）+R15/R16 形态校验超额例：码点路由（0/1-2/≥3）+
 * LIKE 特字符+MATCH 注入+三档完全隔离（裁定①——无并集）+排序同口径+topK+
 * 大小写折叠两路一致（INV-127 行为锁）。always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  createAiMemorySearchService,
  escapeLike,
  MEMORY_SEARCH_TOP_K
} from '../../../src/main/services/ai/ai-memory-search.service'
import { createRepos } from '../../../src/main/db/repos'
import type { AiScope } from '../../../src/main/db/repos/ai-sessions.repo'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

interface SeedMemory {
  scope: 'paper' | 'lineage' | 'global'
  anchor: string | null
  title: string
  content: string
  label?: string
  updatedAt?: string
}

function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedCollection(db: Db, id: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, `图${id}`)
}

/** 直插记忆行（scope 对应合法 category——020 分类条件枚举） */
function seedMemory(db: Db, o: SeedMemory): number {
  const category =
    o.scope === 'paper' ? 'method_note' : o.scope === 'lineage' ? 'node_role' : 'user_preference'
  const t = o.updatedAt ?? '2026-01-01T00:00:00.000Z'
  const r = db
    .prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, label, title, content, pinned, origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'manual', ?, ?)`
    )
    .run(o.scope, o.anchor, category, o.label ?? null, o.title, o.content, t, t)
  return Number(r.lastInsertRowid)
}

function makeSvc(db: Db): ReturnType<typeof createAiMemorySearchService> {
  return createAiMemorySearchService({ repos: createRepos(db) })
}

async function expectDomainError(
  run: () => Promise<unknown>,
  code: string,
  ...msgParts: string[]
): Promise<void> {
  try {
    await run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect(e, '域错误是 Error 子类').toBeInstanceOf(Error)
    expect((e as { code?: string }).code, `错误码应为 ${code}`).toBe(code)
    for (const part of msgParts) expect((e as Error).message).toContain(part)
  }
}

describe('F-DBCAMP-01 DB-2 U2a ai-memory-search —— 码点路由+隔离检索', () => {
  it('R1 空查询 route=empty 零行（trim 后码点 0——不触检索）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    seedMemory(db, { scope: 'global', anchor: null, title: '全局', content: '任意内容' })
    expect(await svc.searchMemory({ scope: 'global', anchorId: null, query: '' })).toEqual({
      route: 'empty',
      rows: []
    })
    expect(await svc.searchMemory({ scope: 'global', anchorId: null, query: '   ' })).toEqual({
      route: 'empty',
      rows: []
    })
    db.close()
  })

  it("R2 单字中文 route='like' 命中真值（'<3 码点 MATCH 静默零命中'回退——§2 实测）", async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const hit = seedMemory(db, { scope: 'global', anchor: null, title: '观测', content: '水文数据观测记录' })
    const miss = seedMemory(db, { scope: 'global', anchor: null, title: '无关', content: '完全不同的主题' })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '水' })
    expect(res.route).toBe('like')
    expect(res.rows.map((r) => r.id)).toEqual([hit])
    expect(res.rows.some((r) => r.id === miss)).toBe(false)
    db.close()
  })

  it("R3 二字中文 route='like'（1-2 码点界内——路由阈值红锚）", async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const hit = seedMemory(db, { scope: 'global', anchor: null, title: '观测', content: '水文站网密度' })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '水文' })
    expect(res.route).toBe('like')
    expect(res.rows.map((r) => r.id)).toEqual([hit])
    db.close()
  })

  it("R4 ≥3 字中文 route='match'（FTS trigram 域内）", async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const hit = seedMemory(db, { scope: 'global', anchor: null, title: '监测', content: '站点水文站监测年报' })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '水文站' })
    expect(res.route).toBe('match')
    expect(res.rows.map((r) => r.id)).toEqual([hit])
    db.close()
  })

  it("R5 英文≥3 route='match'", async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const hit = seedMemory(db, { scope: 'global', anchor: null, title: 'pipeline', content: 'data flow pipeline notes' })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: 'flow' })
    expect(res.route).toBe('match')
    expect(res.rows.map((r) => r.id)).toEqual([hit])
    db.close()
  })

  it("R6 混排 route='match'", async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const hit = seedMemory(db, { scope: 'global', anchor: null, title: '模型', content: 'BERT模型对比实验' })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: 'RT模型' })
    expect(res.route).toBe('match')
    expect(res.rows.map((r) => r.id)).toEqual([hit])
    db.close()
  })

  it('R7 LIKE 特字符：查询含 \\ % _ →字面命中不变形（escapeLike+ESCAPE 子句）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    // 每行只含单一特字符（+一行 %_ 混合）——单字符探针归因无歧义
    const pctOnly = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '税负',
      content: '税负%区间取值'
    })
    const underscoreOnly = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '字段',
      content: 'field_宽'
    })
    const backslashOnly = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '路径',
      content: '路径C:\\temp快照'
    })
    const mixed = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '混合',
      content: '混合%_标记'
    })
    const plain = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '普通',
      content: '普通文本一行'
    })
    const idsOf = (rows: { id: number }[]): number[] => rows.map((r) => r.id).sort((a, b) => a - b)
    // 未转义时 %/_ = 通配符（普通行必误中）；转义后仅含字面特字符的行命中
    const resPct = await svc.searchMemory({ scope: 'global', anchorId: null, query: '%' })
    expect(resPct.route).toBe('like')
    expect(idsOf(resPct.rows)).toEqual([pctOnly, mixed].sort((a, b) => a - b))
    expect(resPct.rows.some((r) => r.id === plain)).toBe(false)
    const resUs = await svc.searchMemory({ scope: 'global', anchorId: null, query: '_' })
    expect(idsOf(resUs.rows)).toEqual([underscoreOnly, mixed].sort((a, b) => a - b))
    expect(resUs.rows.some((r) => r.id === plain)).toBe(false)
    const resBs = await svc.searchMemory({ scope: 'global', anchorId: null, query: '\\' })
    expect(idsOf(resBs.rows)).toEqual([backslashOnly])
    // 双特字符组合（2 码点仍在 LIKE 界内）=字面序列 %_ 命中，非通配语义
    const resMixed = await svc.searchMemory({ scope: 'global', anchorId: null, query: '%_' })
    expect(idsOf(resMixed.rows)).toEqual([mixed])
    db.close()
  })

  it('R8 MATCH 注入：含 " 与 OR →短语字面查找非布尔式（escapeFtsQuery 复用）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const literal = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '注入',
      content: '注入探针 a" OR b 尾部'
    })
    const bothWords = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '词组',
      content: 'alpha and beta words'
    })
    const splitWords = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '分段',
      content: 'a 段 b 段'
    })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: 'a" OR b' })
    expect(res.route).toBe('match')
    // 只命中字面短语行；未转义形态下 OR 布尔式会拉进 bothWords/splitWords
    expect(res.rows.map((r) => r.id)).toEqual([literal])
    expect(res.rows.some((r) => r.id === bothWords)).toBe(false)
    expect(res.rows.some((r) => r.id === splitWords)).toBe(false)
    db.close()
  })

  it('R9 隔离-paper：锚 A 不见锚 B 行+不见 global 行（裁定①完全隔离——无并集）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    seedPaper(db, 'p-a')
    seedPaper(db, 'p-b')
    const mine = seedMemory(db, {
      scope: 'paper',
      anchor: 'p-a',
      title: '甲',
      content: '纸锚A检索命中'
    })
    const other = seedMemory(db, {
      scope: 'paper',
      anchor: 'p-b',
      title: '乙',
      content: '纸锚B检索命中'
    })
    const globalRow = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '全',
      content: '全局检索命中'
    })
    const res = await svc.searchMemory({ scope: 'paper', anchorId: 'p-a', query: '检索' })
    expect(res.route).toBe('like')
    expect(res.rows.map((r) => r.id)).toEqual([mine])
    expect(res.rows.some((r) => r.id === other)).toBe(false)
    expect(res.rows.some((r) => r.id === globalRow)).toBe(false)
    db.close()
  })

  it('R10 隔离-lineage 同构（MATCH 路同谓词——锚=collections.id；同构=亦不见 global 行）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    seedCollection(db, 'c-la')
    seedCollection(db, 'c-lb')
    const mine = seedMemory(db, {
      scope: 'lineage',
      anchor: 'c-la',
      title: '图甲',
      content: '图锚甲命中记录'
    })
    const other = seedMemory(db, {
      scope: 'lineage',
      anchor: 'c-lb',
      title: '图乙',
      // [回炉 W1] 内容含查询词——MATCH 路跨锚剔除断言可红（词不在场=断言恒绿的假锁定）
      content: '图锚甲与图锚乙双命中记录'
    })
    const globalRow = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '全',
      content: '图锚甲全局副本'
    })
    const res = await svc.searchMemory({ scope: 'lineage', anchorId: 'c-la', query: '图锚甲' })
    expect(res.route).toBe('match')
    expect(res.rows.map((r) => r.id)).toEqual([mine])
    expect(res.rows.some((r) => r.id === other)).toBe(false)
    expect(res.rows.some((r) => r.id === globalRow)).toBe(false)
    db.close()
  })

  it('R17 隔离-paper×MATCH 路（对偶 R9 的 LIKE 路——other 锚行内容含查询词仍缺席）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    seedPaper(db, 'p-a')
    seedPaper(db, 'p-b')
    const mine = seedMemory(db, {
      scope: 'paper',
      anchor: 'p-a',
      title: '甲',
      content: '碳基钙钛矿稳定性记录'
    })
    const other = seedMemory(db, {
      scope: 'paper',
      anchor: 'p-b',
      title: '乙',
      content: '碳基钙钛矿失效副本'
    })
    const globalRow = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '全',
      content: '碳基钙钛矿全局笔记'
    })
    const res = await svc.searchMemory({ scope: 'paper', anchorId: 'p-a', query: '碳基钙钛矿' })
    expect(res.route).toBe('match')
    expect(res.rows.map((r) => r.id)).toEqual([mine])
    expect(res.rows.some((r) => r.id === other)).toBe(false)
    expect(res.rows.some((r) => r.id === globalRow)).toBe(false)
    db.close()
  })

  it('R11 隔离-global：global 全集+不见 paper/lineage 行（同词三档对照）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    seedPaper(db, 'p-a')
    seedCollection(db, 'c-l')
    const g = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '全局',
      content: '全局记忆条目'
    })
    const p = seedMemory(db, {
      scope: 'paper',
      anchor: 'p-a',
      title: '纸',
      content: '纸锚记忆条目'
    })
    const l = seedMemory(db, {
      scope: 'lineage',
      anchor: 'c-l',
      title: '图',
      content: '图锚记忆条目'
    })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '记忆' })
    expect(res.route).toBe('like')
    expect(res.rows.map((r) => r.id)).toEqual([g])
    expect(res.rows.some((r) => r.id === p)).toBe(false)
    expect(res.rows.some((r) => r.id === l)).toBe(false)
    db.close()
  })

  it('R12 排序=updated_at DESC,id DESC（同 updated_at 用 id 破平——两路同口径）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const old = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '旧',
      content: '排序探针甲',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    const newer = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '新',
      content: '排序探针乙',
      updatedAt: '2026-01-02T00:00:00.000Z'
    })
    const tieBreak = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '平',
      content: '排序探针丙',
      updatedAt: '2026-01-02T00:00:00.000Z'
    })
    const expected = [tieBreak, newer, old]
    const like = await svc.searchMemory({ scope: 'global', anchorId: null, query: '探针' })
    expect(like.route).toBe('like')
    expect(like.rows.map((r) => r.id)).toEqual(expected.map((r) => r))
    const match = await svc.searchMemory({ scope: 'global', anchorId: null, query: '排序探针' })
    expect(match.route).toBe('match')
    expect(match.rows.map((r) => r.id)).toEqual(expected.map((r) => r))
    db.close()
  })

  it('R13 topK=8（播 10 命中恰 8——top 8 按 (updated_at,id) DESC）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    for (let i = 1; i <= 10; i++) {
      seedMemory(db, {
        scope: 'global',
        anchor: null,
        title: `上限${i}`,
        content: `上限探针行${i}`,
        updatedAt: '2026-01-01T00:00:00.000Z'
      })
    }
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '上限探针' })
    expect(res.route).toBe('match')
    expect(res.rows.length).toBe(MEMORY_SEARCH_TOP_K)
    // 同 updated_at 全行——id DESC 破平=行 10..3
    expect(res.rows.map((r) => r.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3])
    db.close()
  })

  it('R14 大小写折叠两路一致（INV-127 行为锁——ASCII 折叠，两路均命中）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const hit = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '折叠',
      content: 'CaseFold Probe Zz'
    })
    // LIKE 路（2 码点）：小写查询命中混合大小写内容
    const like = await svc.searchMemory({ scope: 'global', anchorId: null, query: 'zz' })
    expect(like.route).toBe('like')
    expect(like.rows.map((r) => r.id)).toEqual([hit])
    // MATCH 路（≥3 码点）：小写查询命中混合大小写内容
    const match = await svc.searchMemory({ scope: 'global', anchorId: null, query: 'fold' })
    expect(match.route).toBe('match')
    expect(match.rows.map((r) => r.id)).toEqual([hit])
    // 负对照：内容无 y 字符（任何大小写形态）——两路均不命中
    const none = await svc.searchMemory({ scope: 'global', anchorId: null, query: 'yy' })
    expect(none.rows).toEqual([])
    db.close()
  })

  it('R18 label 列命中（非空 label+LIKE 路三列 OR 的 label 分支——title/content 均不含查询词）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    const labeled = seedMemory(db, {
      scope: 'global',
      anchor: null,
      title: '无关标题',
      content: '无关内容',
      label: '基准率'
    })
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '基准' })
    expect(res.route).toBe('like')
    expect(res.rows.map((r) => r.id)).toEqual([labeled])
    db.close()
  })

  it('R19 LIKE 路 topK=8（播 10 命中恰 8——对偶 R13 的 MATCH 路）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    for (let i = 1; i <= 10; i++) {
      seedMemory(db, {
        scope: 'global',
        anchor: null,
        title: `上限${i}`,
        content: `行文${i}`,
        updatedAt: '2026-01-01T00:00:00.000Z'
      })
    }
    const res = await svc.searchMemory({ scope: 'global', anchorId: null, query: '上限' })
    expect(res.route).toBe('like')
    expect(res.rows.length).toBe(MEMORY_SEARCH_TOP_K)
    // 同 updated_at 全行——id DESC 破平=行 10..3（硬编码数组防常量同源恒真）
    expect(res.rows.map((r) => r.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3])
    db.close()
  })

  it('R15 非法 scope → INVALID_REQUEST（封闭三值外——与 openSession 同规则）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    await expectDomainError(
      () =>
        svc.searchMemory({
          scope: 'folder' as AiScope,
          anchorId: 'p-a',
          query: '水'
        }),
      'INVALID_REQUEST',
      '范围'
    )
    db.close()
  })

  it('R16 global 带 anchor 拒+paper 缺 anchor 拒（形态校验——§3.E）', async () => {
    const db = createTestDb()
    const svc = makeSvc(db)
    seedPaper(db, 'p-a')
    await expectDomainError(
      () => svc.searchMemory({ scope: 'global', anchorId: 'p-a', query: '水' }),
      'INVALID_REQUEST',
      '锚'
    )
    await expectDomainError(
      () => svc.searchMemory({ scope: 'paper', anchorId: null, query: '水' }),
      'INVALID_REQUEST',
      '锚'
    )
    db.close()
  })

  it('escapeLike 单元面：\\ % _ 三字符逐字转义（service 内助手直证）', () => {
    expect(escapeLike('a\\b%c_d')).toBe('a\\\\b\\%c\\_d')
    expect(escapeLike('普通')).toBe('普通')
  })
})
