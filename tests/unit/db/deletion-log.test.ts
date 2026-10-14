/**
 * [F-DBCAMP-01 DB-3 U1] 迁移 021（删事件日志：deletion_events+deletion_log_guard
 * +九表 AFTER DELETE 触发器族+append-only 拒写防御）锁定测试。
 *
 * 真相源=docs/design/2026-10-08_f-dbcamp01-design.md §13.1（A1 删事件日志——
 * 表/触发器/守卫/身份矩阵）+§13.3（021 号改派）+§13.7（九表清单）+§13.8 U1 行。
 * 级联语义=实测超集口径（recursive_triggers=0 下 FK 级联点火子表 DELETE
 * 触发器——级联行事件在场：探针 probe-cascade-deletionlog+020 头注 T3/
 * R4-1 锁定测试一致，按超集断言）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { migrate } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

/** 导出面九表（§13.7；断言序=迭代序互不污染各自计数） */
const NINE_TABLES = [
  'papers',
  'collections',
  'tags',
  'paper_tags',
  'notes',
  'annotations',
  'lineage_graph_meta',
  'lineage_nodes',
  'lineage_edges'
] as const

function openFull(): Db {
  const db = openDatabase(':memory:')
  migrate(db)
  return db
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

/** (entity,id) 事件计数 */
function eventsOf(db: Db, entity: string, id: string): number {
  return (
    db.prepare('SELECT COUNT(*) c FROM deletion_events WHERE entity = ? AND id = ?').get(entity, id) as {
      c: number
    }
  ).c
}

/** 全账总行数 */
function totalEvents(db: Db): number {
  return (db.prepare('SELECT COUNT(*) c FROM deletion_events').get() as { c: number }).c
}

function epochOf(db: Db, table: string): number | undefined {
  const r = db.prepare('SELECT epoch FROM change_epochs WHERE table_name = ?').get(table) as
    | { epoch: number }
    | undefined
  return r?.epoch
}

/** 逐表 seed→直接 DELETE→期望身份闭包（§13.1 身份矩阵；直接删=非级联路径） */
function deleteCaseFor(db: Db, table: string): { seed: () => void; del: () => void; expectId: string } {
  switch (table) {
    case 'papers':
      return {
        seed: () => seedPaper(db, 'p-dl'),
        del: () => db.prepare(`DELETE FROM papers WHERE id='p-dl'`).run(),
        expectId: 'p-dl'
      }
    case 'collections':
      return {
        seed: () => seedCollection(db, 'c-dl', '删事件图'),
        del: () => db.prepare(`DELETE FROM collections WHERE id='c-dl'`).run(),
        expectId: 'c-dl'
      }
    case 'tags':
      return {
        seed: () => db.prepare(`INSERT INTO tags (id, name) VALUES ('t-dl', '删事件标签')`).run(),
        del: () => db.prepare(`DELETE FROM tags WHERE id='t-dl'`).run(),
        expectId: 't-dl'
      }
    case 'paper_tags':
      return {
        seed: () => {
          seedPaper(db, 'p-dpt')
          db.prepare(`INSERT INTO tags (id, name) VALUES ('t-dpt', '复合键标签')`).run()
          db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-dpt', 't-dpt')`).run()
        },
        del: () => db.prepare(`DELETE FROM paper_tags WHERE paper_id='p-dpt'`).run(),
        expectId: 'p-dpt|t-dpt'
      }
    case 'notes':
      return {
        seed: () => {
          seedPaper(db, 'p-dn')
          db.prepare(
            `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-dl', 'p-dn', 't', 't')`
          ).run()
        },
        del: () => db.prepare(`DELETE FROM notes WHERE id='n-dl'`).run(),
        expectId: 'n-dl'
      }
    case 'annotations':
      return {
        seed: () => {
          seedPaper(db, 'p-da')
          db.prepare(
            `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
             VALUES ('a-dl', 'p-da', 0, 'highlight', '0000:01', 't', 't')`
          ).run()
        },
        del: () => db.prepare(`DELETE FROM annotations WHERE id='a-dl'`).run(),
        expectId: 'a-dl'
      }
    case 'lineage_graph_meta':
      return {
        seed: () =>
          db.prepare(
            `INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('k-dl', 'v1', 't')`
          ).run(),
        del: () => db.prepare(`DELETE FROM lineage_graph_meta WHERE key='k-dl'`).run(),
        expectId: 'k-dl'
      }
    case 'lineage_nodes':
      return {
        seed: () =>
          db.prepare(
            `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-dl', '节点', 't', 't')`
          ).run(),
        del: () => db.prepare(`DELETE FROM lineage_nodes WHERE id='ln-dl'`).run(),
        expectId: 'ln-dl'
      }
    case 'lineage_edges':
      return {
        seed: () => {
          db.prepare(
            `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-d1', '端一', 't', 't')`
          ).run()
          db.prepare(
            `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-d2', '端二', 't', 't')`
          ).run()
          db.prepare(
            `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
             VALUES ('le-dl', 'ln-d1', 'ln-d2', 't', 't')`
          ).run()
        },
        del: () => db.prepare(`DELETE FROM lineage_edges WHERE id='le-dl'`).run(),
        expectId: 'le-dl'
      }
    default:
      throw new Error(`未知表：${table}`)
  }
}

describe('db/deletion-log —— 021 删事件日志（九表落账/守卫两态/append-only/去重/级联超集/开库断言）', () => {
  it('U1-1 对位：九表各恰 1 个 <t>_deletion_log_ad+触发器 WHEN 守卫在场（sql 文本含 FROM deletion_log_guard）+全库 %_deletion_log_% 计数=9+deletion_events 上恰 2 个 append-only 触发器+guard 播种恰 1 行 stop=0', () => {
    const db = openFull()
    for (const t of NINE_TABLES) {
      const rows = db
        .prepare(
          "SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name=? ORDER BY name"
        )
        .all(t) as Array<{ name: string; sql: string }>
      const names = rows.map((r) => r.name)
      expect(names, `${t} 的 deletion_log 触发器`).toContain(`${t}_deletion_log_ad`)
      const dl = rows.filter((r) => r.name.endsWith('_deletion_log_ad'))
      expect(dl, `${t} 的 deletion_log 触发器恰 1 个`).toHaveLength(1)
      // WHEN 守卫在场锁：摘守卫（退化为无条件落账，直执抑制失效）单表变异即红
      // （长度断言先行=非空前提；vitest 经 esbuild 不查类型，tsc 关口拦索引访问）
      expect(dl[0]!.sql, `${t} WHEN 守卫读 deletion_log_guard`).toContain('FROM deletion_log_guard')
    }
    const total = (
      db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='trigger' AND name LIKE '%_deletion_log_%'")
        .get() as { c: number }
    ).c
    expect(total).toBe(9)
    const appendOnly = (
      db
        .prepare(
          "SELECT COUNT(*) c FROM sqlite_master WHERE type='trigger' AND tbl_name='deletion_events'"
        )
        .get() as { c: number }
    ).c
    expect(appendOnly).toBe(2)
    const guard = db.prepare('SELECT COUNT(*) c, COALESCE(MAX(stop), -1) s FROM deletion_log_guard').get() as {
      c: number
      s: number
    }
    expect(guard.c).toBe(1)
    expect(guard.s).toBe(0)
    db.close()
  })

  it('U1-2 guard 两态：stop=1 删行零事件；复位 0 恢复落账；守卫表空行=静默停记（防线停摆面——开库断言行数≠1 捕获，U1-9 锁）', () => {
    const db = openFull()
    seedPaper(db, 'p-g1')
    db.prepare('UPDATE deletion_log_guard SET stop=1').run()
    db.prepare(`DELETE FROM papers WHERE id='p-g1'`).run()
    expect(eventsOf(db, 'papers', 'p-g1')).toBe(0)
    db.prepare('UPDATE deletion_log_guard SET stop=0').run()
    seedPaper(db, 'p-g2')
    db.prepare(`DELETE FROM papers WHERE id='p-g2'`).run()
    expect(eventsOf(db, 'papers', 'p-g2')).toBe(1)
    // 守卫表空行：COALESCE 在行内兜 NULL 值、不兜零行——子查询 NULL=WHEN 不成立
    // →静默停记（非安全默认；播种恰 1 行由 U1-1 锁+应用层无删行路径，空行=异常
    // 态，由 migrate 开库断言转显性错误——U1-9 空行态用例锁）
    db.prepare('DELETE FROM deletion_log_guard').run()
    seedPaper(db, 'p-g3')
    db.prepare(`DELETE FROM papers WHERE id='p-g3'`).run()
    expect(eventsOf(db, 'papers', 'p-g3')).toBe(0)
    db.close()
  })

  it('U1-3 逐表删除断言 ×9（身份矩阵：常规表=OLD.id；paper_tags=pid|tid 拼接；lineage_graph_meta=key 值）', () => {
    const db = openFull()
    for (const t of NINE_TABLES) {
      const { seed, del, expectId } = deleteCaseFor(db, t)
      seed()
      del()
      expect(eventsOf(db, t, expectId), `${t} 删除后 (entity,id) 事件在场`).toBe(1)
    }
    db.close()
  })

  it('U1-4 append-only：UPDATE 与 DELETE deletion_events 各 throws（RAISE(ABORT)）', () => {
    const db = openFull()
    db.prepare(
      `INSERT INTO deletion_events (entity, id, deleted_at) VALUES ('papers', 'p-ao', '2026-01-01T00:00:00.000Z')`
    ).run()
    expect(() => db.prepare(`UPDATE deletion_events SET id='篡改' WHERE entity='papers'`).run()).toThrow(
      /append-only.*禁止修改/
    )
    expect(() => db.prepare(`DELETE FROM deletion_events WHERE entity='papers'`).run()).toThrow(
      /append-only.*禁止删除/
    )
    expect(totalEvents(db)).toBe(1)
    db.close()
  })

  it('U1-5 去重：同 (entity,id,deleted_at) 三元组 INSERT OR IGNORE 重插→行数仍 1（UNIQUE+OR IGNORE 两语义兼容）', () => {
    const db = openFull()
    const ins = db.prepare(
      `INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at) VALUES ('papers', 'p-dd', '2026-01-02T03:04:05.678Z')`
    )
    ins.run()
    ins.run()
    expect(totalEvents(db)).toBe(1)
    db.close()
  })

  it('U1-6 级联超集锁：删带 1 note+1 annotation+1 paper_tag 的 paper→恰 4 事件；删带 1 tag+1 node(带 1 edge) 的 collection→恰 4 事件；删带 1 node(带 1 edge) 的 paper→恰 3 事件（FK 级联点火子表触发器——超集口径）', () => {
    const db = openFull()
    seedPaper(db, 'p-cs')
    db.prepare(
      `INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('n-cs', 'p-cs', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
       VALUES ('a-cs', 'p-cs', 0, 'highlight', '0000:01', 't', 't')`
    ).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-cs', '级联标签')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-cs', 't-cs')`).run()
    db.prepare(`DELETE FROM papers WHERE id='p-cs'`).run()
    expect(totalEvents(db)).toBe(4)
    expect(eventsOf(db, 'papers', 'p-cs')).toBe(1)
    expect(eventsOf(db, 'notes', 'n-cs')).toBe(1)
    expect(eventsOf(db, 'annotations', 'a-cs')).toBe(1)
    expect(eventsOf(db, 'paper_tags', 'p-cs|t-cs')).toBe(1)
    db.close()

    const db2 = openFull()
    seedCollection(db2, 'c-cs', '级联域')
    db2.prepare(`INSERT INTO tags (id, name, folder_id) VALUES ('t-cc', '域内标签', 'c-cs')`).run()
    db2.prepare(
      `INSERT INTO lineage_nodes (id, title, folder_id, created_at, updated_at) VALUES ('ln-cc', '域内节点', 'c-cs', 't', 't')`
    ).run()
    db2.prepare(
      `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-out', '域外端点', 't', 't')`
    ).run()
    db2.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
       VALUES ('le-cc', 'ln-cc', 'ln-out', 't', 't')`
    ).run()
    db2.prepare(`DELETE FROM collections WHERE id='c-cs'`).run()
    expect(totalEvents(db2)).toBe(4)
    expect(eventsOf(db2, 'collections', 'c-cs')).toBe(1)
    expect(eventsOf(db2, 'tags', 't-cc')).toBe(1)
    expect(eventsOf(db2, 'lineage_nodes', 'ln-cc')).toBe(1)
    expect(eventsOf(db2, 'lineage_edges', 'le-cc')).toBe(1)
    expect(
      (db2.prepare(`SELECT COUNT(*) c FROM lineage_nodes WHERE id='ln-out'`).get() as { c: number }).c
    ).toBe(1)
    db2.close()

    // 第三形态：papers→lineage_nodes→lineage_edges 二段（004 lineage_nodes.
    // paper_id CASCADE+edges 两端 CASCADE）——删文献节点随灭、边随节点二段灭
    const db3 = openFull()
    seedPaper(db3, 'p-cn')
    db3.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, created_at, updated_at) VALUES ('ln-cn', 'p-cn', '文献节点', 't', 't')`
    ).run()
    db3.prepare(
      `INSERT INTO lineage_nodes (id, title, created_at, updated_at) VALUES ('ln-free', '独立节点', 't', 't')`
    ).run()
    db3.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, created_at, updated_at)
       VALUES ('le-cn', 'ln-cn', 'ln-free', 't', 't')`
    ).run()
    db3.prepare(`DELETE FROM papers WHERE id='p-cn'`).run()
    expect(totalEvents(db3)).toBe(3)
    expect(eventsOf(db3, 'papers', 'p-cn')).toBe(1)
    expect(eventsOf(db3, 'lineage_nodes', 'ln-cn')).toBe(1)
    expect(eventsOf(db3, 'lineage_edges', 'le-cn')).toBe(1)
    db3.close()
  })

  it('U1-7 deleted_at 格式锚：DB 时钟 ISO 毫秒 Z（触发器内取时——无应用层时钟）', () => {
    const db = openFull()
    seedPaper(db, 'p-ts')
    db.prepare(`DELETE FROM papers WHERE id='p-ts'`).run()
    const row = db
      .prepare(`SELECT deleted_at FROM deletion_events WHERE entity='papers' AND id='p-ts'`)
      .get() as { deleted_at: string }
    expect(row.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    db.close()
  })

  it('U1-8 epoch 共存：删 papers→papers epoch 仍恰 +1/步（deletion 触发器不扰 epoch 链）+全库 _epoch_ 触发器计数恒 30', () => {
    const db = openFull()
    seedPaper(db, 'p-ec')
    expect(epochOf(db, 'papers')).toBe(1)
    db.prepare(`DELETE FROM papers WHERE id='p-ec'`).run()
    expect(epochOf(db, 'papers')).toBe(2)
    expect(eventsOf(db, 'papers', 'p-ec')).toBe(1)
    const epochTriggers = (
      db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='trigger' AND name LIKE '%_epoch_%'")
        .get() as { c: number }
    ).c
    expect(epochTriggers).toBe(30)
    db.close()
  })

  it('U1-9 migrate 开库断言：stop=1 再 migrate→throws；复位 0→applied=[] 正常；守卫表缺失→throws 显性错误；守卫表空行态→throws', () => {
    const db = openFull()
    db.prepare('UPDATE deletion_log_guard SET stop=1').run()
    expect(() => migrate(db)).toThrow(/deletion_log_guard/)
    db.prepare('UPDATE deletion_log_guard SET stop=0').run()
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()

    const db2 = openFull()
    db2.prepare('DROP TABLE deletion_log_guard').run()
    expect(() => migrate(db2)).toThrow(/deletion_log_guard/)
    db2.close()

    // 空行态：播种行被清=防线停摆面（触发器 WHEN 子查询 NULL→静默停记）——
    // 开库断言须按行数≠1 捕获为显性错误
    const db3 = openFull()
    db3.prepare('DELETE FROM deletion_log_guard').run()
    expect(() => migrate(db3)).toThrow(/deletion_log_guard/)
    db3.close()
  })

  it('U1-10 FTS 共存抽测：删 note→notes_fts 同步清+事件在场（notes_fts_ad 与 notes_deletion_log_ad 同表并存）', () => {
    const db = openFull()
    seedPaper(db, 'p-fc')
    db.prepare(
      `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
       VALUES ('n-fc', 'p-fc', '絮凝笔记', '絮凝剂投加量优化试验', 't', 't')`
    ).run()
    expect(
      db.prepare(`SELECT rowid FROM notes_fts WHERE notes_fts MATCH '"絮凝剂投加量优化试验"'`).get()
    ).toBeTruthy()
    db.prepare(`DELETE FROM notes WHERE id='n-fc'`).run()
    expect(
      db.prepare(`SELECT rowid FROM notes_fts WHERE notes_fts MATCH '"絮凝剂投加量优化试验"'`).get()
    ).toBeUndefined()
    expect(eventsOf(db, 'notes', 'n-fc')).toBe(1)
    db.close()
  })
})
