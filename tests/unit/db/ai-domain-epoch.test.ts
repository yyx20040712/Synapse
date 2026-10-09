/**
 * [F-DBCAMP-01 DB-2 U1] 迁移 020 epoch 机制（INV-J 基建）锁定测试：
 * M2 播种/三一致/10 表×{I,U,D} 递增/自愈 + M3 与既有 FTS 触发器同表并存。
 *
 * 真相源=简报 §3（T5/epoch 模板）+设计报告 §3.F（集合=10 物理表）+
 * 主控终裁补遗 N-1（播种 10 行/新增触发器计数）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { migrate } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

/** epoch 集合 10 表（§3.F 实照物理名；断言序=迭代序互不污染各自计数） */
const EPOCH_TABLES = [
  'papers',
  'collections',
  'tags',
  'paper_tags',
  'notes',
  'annotations',
  'lineage_graph_meta',
  'lineage_nodes',
  'lineage_edges',
  'ai_memory'
] as const

function openFull(): Db {
  const db = openDatabase(':memory:')
  migrate(db)
  return db
}

function epochOf(db: Db, table: string): number | undefined {
  const r = db.prepare('SELECT epoch FROM change_epochs WHERE table_name = ?').get(table) as
    | { epoch: number }
    | undefined
  return r?.epoch
}

function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedCollection(db: Db, id: string, name: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
}

/** 每表 {I,U,D} 三步闭包（列值最小插入——复合主键/可空列按实照形态） */
function opsFor(db: Db, table: string): { ins: () => void; upd: () => void; del: () => void } {
  switch (table) {
    case 'papers':
      return {
        ins: () => seedPaper(db, 'p-ep'),
        upd: () => db.prepare(`UPDATE papers SET title='改题' WHERE id='p-ep'`).run(),
        del: () => db.prepare(`DELETE FROM papers WHERE id='p-ep'`).run()
      }
    case 'collections':
      return {
        ins: () => seedCollection(db, 'c-ep', 'epoch 图'),
        upd: () => db.prepare(`UPDATE collections SET position=1 WHERE id='c-ep'`).run(),
        del: () => db.prepare(`DELETE FROM collections WHERE id='c-ep'`).run()
      }
    case 'tags':
      return {
        ins: () => db.prepare(`INSERT INTO tags (id, name) VALUES ('t-ep', 'epoch 标签')`).run(),
        upd: () => db.prepare(`UPDATE tags SET color='#000000' WHERE id='t-ep'`).run(),
        del: () => db.prepare(`DELETE FROM tags WHERE id='t-ep'`).run()
      }
    case 'paper_tags':
      return {
        ins: () => {
          seedPaper(db, 'p-pt')
          db.prepare(`INSERT INTO tags (id, name) VALUES ('t-pt1', '挂接一')`).run()
          db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-pt', 't-pt1')`).run()
        },
        upd: () => {
          db.prepare(`INSERT INTO tags (id, name) VALUES ('t-pt2', '挂接二')`).run()
          db.prepare(`UPDATE paper_tags SET tag_id='t-pt2' WHERE paper_id='p-pt'`).run()
        },
        del: () => {
          db.prepare(`DELETE FROM paper_tags WHERE paper_id='p-pt'`).run()
          db.prepare(`DELETE FROM tags WHERE id IN ('t-pt1','t-pt2')`).run()
          db.prepare(`DELETE FROM papers WHERE id='p-pt'`).run()
        }
      }
    case 'notes':
      return {
        ins: () => {
          seedPaper(db, 'p-nt')
          db.prepare(
            `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-ep', 'p-nt', 't', 't')`
          ).run()
        },
        upd: () => db.prepare(`UPDATE notes SET content_md='内容' WHERE id='n-ep'`).run(),
        del: () => {
          db.prepare(`DELETE FROM notes WHERE id='n-ep'`).run()
          db.prepare(`DELETE FROM papers WHERE id='p-nt'`).run()
        }
      }
    case 'annotations':
      return {
        ins: () => {
          seedPaper(db, 'p-an')
          db.prepare(
            `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
             VALUES ('a-ep', 'p-an', 0, 'highlight', '0000:01', 't', 't')`
          ).run()
        },
        upd: () => db.prepare(`UPDATE annotations SET comment='批注' WHERE id='a-ep'`).run(),
        del: () => {
          db.prepare(`DELETE FROM annotations WHERE id='a-ep'`).run()
          db.prepare(`DELETE FROM papers WHERE id='p-an'`).run()
        }
      }
    case 'lineage_graph_meta':
      return {
        ins: () =>
          db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('k-ep', 'v1', 't')`).run(),
        upd: () => db.prepare(`UPDATE lineage_graph_meta SET value='v2' WHERE key='k-ep'`).run(),
        del: () => db.prepare(`DELETE FROM lineage_graph_meta WHERE key='k-ep'`).run()
      }
    case 'lineage_nodes':
      return {
        ins: () =>
          db.prepare(
            `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-ep', '节点', 't', 't')`
          ).run(),
        upd: () => db.prepare(`UPDATE lineage_nodes SET x=1 WHERE id='ln-ep'`).run(),
        del: () => db.prepare(`DELETE FROM lineage_nodes WHERE id='ln-ep'`).run()
      }
    case 'lineage_edges':
      return {
        ins: () => {
          db.prepare(
            `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-e1', '端一', 't', 't')`
          ).run()
          db.prepare(
            `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-e2', '端二', 't', 't')`
          ).run()
          db.prepare(
            `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
             VALUES ('le-ep', 'ln-e1', 'ln-e2', 't', 't')`
          ).run()
        },
        upd: () => db.prepare(`UPDATE lineage_edges SET label='连线' WHERE id='le-ep'`).run(),
        del: () => {
          db.prepare(`DELETE FROM lineage_edges WHERE id='le-ep'`).run()
          db.prepare(`DELETE FROM lineage_nodes WHERE id IN ('ln-e1','ln-e2')`).run()
        }
      }
    case 'ai_memory':
      return {
        ins: () =>
          db.prepare(
            `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
             VALUES ('paper', 'p-ep', 'reading_insight', '洞见', '内容', 'manual', 't', 't')`
          ).run(),
        upd: () => db.prepare(`UPDATE ai_memory SET title='新洞见' WHERE anchor_id='p-ep'`).run(),
        del: () => db.prepare(`DELETE FROM ai_memory WHERE anchor_id='p-ep'`).run()
      }
    default:
      throw new Error(`未知表：${table}`)
  }
}

describe('db/ai-domain-epoch —— M2 epoch 机制（10 表播种/三一致/I·U·D 递增/自愈）+M3 与既有 FTS 触发器共存', () => {
  it('M2 播种：恰 10 行 epoch=0 且表名=集合物理名（多/少/错名均红）', () => {
    const db = openFull()
    const rows = db
      .prepare('SELECT table_name, epoch FROM change_epochs ORDER BY table_name')
      .all() as Array<{ table_name: string; epoch: number }>
    expect(rows.map((r) => r.table_name)).toEqual([...EPOCH_TABLES].sort())
    expect(rows.every((r) => r.epoch === 0)).toBe(true)
    db.close()
  })

  it('M2 三一致：epoch 集合 10 表↔每表恰 3 个 epoch 触发器（ai/au/ad 名单精确）↔全库 epoch 触发器恰 30（无多余）', () => {
    const db = openFull()
    for (const t of EPOCH_TABLES) {
      const names = (
        db
          .prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name=? ORDER BY name")
          .all(t) as Array<{ name: string }>
      )
        .map((r) => r.name)
        .filter((n) => n.includes('_epoch_'))
      expect(names, `${t} 的 epoch 触发器`).toEqual(
        [`${t}_epoch_ad`, `${t}_epoch_ai`, `${t}_epoch_au`].sort()
      )
    }
    const total = (
      db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='trigger' AND name LIKE '%_epoch_%'")
        .get() as { c: number }
    ).c
    expect(total).toBe(30)
    db.close()
  })

  it('M2 逐表 I→+1、U→+1、D→+1（10 表×3=30 断言；_au 无 OF=任意列更新皆 bump）', () => {
    const db = openFull()
    for (const t of EPOCH_TABLES) {
      // 播种起点=0 由「播种」用例锁（fresh 库）；本用例逐格断言相对递增——
      // ai_memory 轮次前计数已被前序表的级联清理 bump（papers/collections 删
      // 行时级联体显式 bump 无条件+1——保守过失效语义，见 020 头注 T3）
      const e0 = epochOf(db, t)
      expect(e0, `${t} 计数行在场`).toBeDefined()
      const { ins, upd, del } = opsFor(db, t)
      ins()
      expect(epochOf(db, t), `${t} INSERT 后 +1`).toBe(e0! + 1)
      upd()
      expect(epochOf(db, t), `${t} UPDATE 后 +2`).toBe(e0! + 2)
      del()
      expect(epochOf(db, t), `${t} DELETE 后 +3`).toBe(e0! + 3)
    }
    db.close()
  })

  it('M2 中间步逐格复证（papers 三格序列+is_starred 翻转亦 bump——保守过失效语义）', () => {
    const db = openFull()
    seedPaper(db, 'p-step')
    expect(epochOf(db, 'papers')).toBe(1)
    db.prepare(`UPDATE papers SET is_starred=1 WHERE id='p-step'`).run()
    expect(epochOf(db, 'papers')).toBe(2)
    db.prepare(`DELETE FROM papers WHERE id='p-step'`).run()
    expect(epochOf(db, 'papers')).toBe(3)
    db.close()
  })

  it('M2 自愈：删计数行→该表下次写→重建=1（不回 0——变化已发生）；ai_memory 同款', () => {
    const db = openFull()
    db.prepare(`DELETE FROM change_epochs WHERE table_name='papers'`).run()
    expect(epochOf(db, 'papers')).toBeUndefined()
    seedPaper(db, 'p-heal')
    expect(epochOf(db, 'papers')).toBe(1)
    db.prepare(`DELETE FROM change_epochs WHERE table_name='ai_memory'`).run()
    db.prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
       VALUES ('global', NULL, 'user_preference', '偏好', '内容', 'manual', 't', 't')`
    ).run()
    expect(epochOf(db, 'ai_memory')).toBe(1)
    db.close()
  })

  it('M3 共存（papers）：插入/更新后 papers_fts 行在（MATCH 命中/旧词清）且 papers epoch 同步前进——旧 FTS 触发器与新 epoch 触发器同表互不干扰', () => {
    const db = openFull()
    seedPaper(db, 'p-co')
    // [k3-W1] INSERT 路径闭合：seedPaper 后立即断插入词命中（防 UPDATE 的 _au 重建
    // 半部掩盖 papers_fts_ai 失效——_ai 单独红面）
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"文献p-co"'`).get()
    ).toBeTruthy()
    expect(epochOf(db, 'papers')).toBe(1)
    db.prepare(`UPDATE papers SET abstract='水务管理综述摘要' WHERE id='p-co'`).run()
    expect(epochOf(db, 'papers')).toBe(2)
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"水务管理综述摘要"'`).get()
    ).toBeTruthy()
    db.prepare(`UPDATE papers SET abstract='更换后的摘要' WHERE id='p-co'`).run()
    expect(epochOf(db, 'papers')).toBe(3)
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"水务管理综述摘要"'`).get()
    ).toBeUndefined()
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"更换后的摘要"'`).get()
    ).toBeTruthy()
    db.close()
  })

  it('M3 共存（ai_memory 抽测·_au 协议锁）：插入词命中+更新后旧词 MATCH 归零/新词命中（delete 旧值+insert 新值双语句），epoch 同步 +2', () => {
    const db = openFull()
    seedPaper(db, 'p-am')
    db.prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
       VALUES ('paper', 'p-am', 'reading_insight', '初题', '记忆原文甲', 'manual', 't', 't')`
    ).run()
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"记忆原文甲"'`).get()
    ).toBeTruthy()
    expect(epochOf(db, 'ai_memory')).toBe(1)
    db.prepare(`UPDATE ai_memory SET content='记忆新词乙' WHERE anchor_id='p-am'`).run()
    // [d1-W1] _au 协议：旧词归零（delete 半部）+新词命中（insert 半部）缺一即红
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"记忆原文甲"'`).get()
    ).toBeUndefined()
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"记忆新词乙"'`).get()
    ).toBeTruthy()
    expect(epochOf(db, 'ai_memory')).toBe(2)
    db.close()
  })

  it('M3 共存（notes 抽测）：插入后 notes_fts 行在且 notes epoch +1', () => {
    const db = openFull()
    seedPaper(db, 'p-nc')
    db.prepare(
      `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
       VALUES ('n-co', 'p-nc', '水处理笔记', '反渗透膜污染机理', 't', 't')`
    ).run()
    expect(
      db.prepare(`SELECT rowid FROM notes_fts WHERE notes_fts MATCH '"反渗透膜污染机理"'`).get()
    ).toBeTruthy()
    expect(epochOf(db, 'notes')).toBe(1)
    db.close()
  })
})
