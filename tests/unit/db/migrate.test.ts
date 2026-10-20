import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/**
 * [F-SNAPCLEAN-01] 迁移执行器测试——基线压缩（B″，ADR-0030）后重写：
 * 旧链 001–025 压缩为单件 026_baseline.sql，新库 user_version 直达 26。
 * 三用例族：①新库全量（全对象集+种子=floating_notes 七列负锚等——基线漂移
 * 永驻守卫，兼等价证明的运行期锚）；②已迁移库重开零应用+开库断言仍执行；
 * ③失败整体回滚（migrations 参数注入坏迁移）。旧 12 件迁移路径测试随压缩
 * 删除（升级行为不存在）——覆盖映射=批档 scripts-audits/20261020-snapclean01/
 * impl-report.md。
 */

/** 全表集=22 内容表+4 FTS5 虚表+16 shadow 表（虚表自生）+sqlite_sequence */
const ALL_TABLES = [
  'ai_memory',
  'ai_memory_fts',
  'ai_memory_fts_config',
  'ai_memory_fts_data',
  'ai_memory_fts_docsize',
  'ai_memory_fts_idx',
  'ai_messages',
  'ai_notes',
  'ai_sessions',
  'ai_task_audit',
  'ai_tasks',
  'annotations',
  'annotations_fts',
  'annotations_fts_config',
  'annotations_fts_data',
  'annotations_fts_docsize',
  'annotations_fts_idx',
  'app_meta',
  'change_epochs',
  'collections',
  'deletion_events',
  'deletion_log_guard',
  'figure_jobs',
  'floating_notes',
  'lineage_edges',
  'lineage_graph_meta',
  'lineage_nodes',
  'notes',
  'notes_fts',
  'notes_fts_config',
  'notes_fts_data',
  'notes_fts_docsize',
  'notes_fts_idx',
  'paper_figures',
  'paper_tags',
  'papers',
  'papers_fts',
  'papers_fts_config',
  'papers_fts_data',
  'papers_fts_docsize',
  'papers_fts_idx',
  'sqlite_sequence',
  'tags'
]

/** 显式索引集（autoindex 除外——由约束自生不入清单） */
const ALL_INDEXES = [
  'idx_ai_memory_scope_anchor',
  'idx_ai_messages_session_pin',
  'idx_ai_notes_paper',
  'idx_ai_sessions_scope_anchor',
  'idx_ai_task_audit_task',
  'idx_ai_tasks_target',
  'idx_annotations_paper',
  'idx_floating_notes_folder',
  'idx_lineage_paper',
  'idx_notes_paper',
  'idx_paper_figures_paper',
  'idx_paper_tags_tag',
  'idx_papers_added_at',
  'idx_papers_doi',
  'idx_papers_starred',
  'idx_papers_year'
]

function namesOf(db: ReturnType<typeof openDatabase>, kind: 'table' | 'index' | 'trigger', withSqlOnly: boolean): string[] {
  const sqlFilter = kind === 'index' && withSqlOnly ? ' AND sql IS NOT NULL' : ''
  return (
    db.prepare(`SELECT name FROM sqlite_master WHERE type='${kind}'${sqlFilter} ORDER BY name`).all() as Array<{
      name: string
    }>
  ).map((r) => r.name)
}

describe('db/migrate —— 迁移执行器（026 基线单件）', () => {
  it('新库全量：appliedVersions=[26]、全对象集+种子在位（基线漂移守卫——等价证明的永驻锚）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([26])
    expect(result.currentVersion).toBe(26)
    expect(readUserVersion(db)).toBe(26)
    // [RR1 d1-N6] tripwire：首个 027 迁移合入时本断言随批更新（有意钉死单件防静默增链）
    expect(MIGRATIONS).toHaveLength(1)
    expect(MIGRATIONS[0]!.version).toBe(26)
    expect(MIGRATIONS[0]!.name).toBe('baseline')
    expect(namesOf(db, 'table', false)).toEqual(ALL_TABLES)
    expect(namesOf(db, 'index', true)).toEqual(ALL_INDEXES)
    const triggers = namesOf(db, 'trigger', false)
    expect(triggers).toHaveLength(59)
    expect(triggers.filter((n) => n.includes('_epoch_'))).toHaveLength(30)
    expect(triggers.filter((n) => n.endsWith('_deletion_log_ad'))).toHaveLength(10)
    expect(triggers.filter((n) => /_fts_(ai|ad|au)$/.test(n))).toHaveLength(12)
    expect(triggers).toContain('paper_tags_domain_guard')
    expect(triggers).toContain('papers_ai_anchor_cascade')
    expect(triggers).toContain('collections_ai_anchor_cascade')
    expect(triggers).toContain('ai_task_audit_g2_no_update')
    expect(triggers).toContain('ai_task_audit_g2_no_delete')
    expect(triggers).toContain('deletion_events_no_update')
    expect(triggers).toContain('deletion_events_no_delete')
    expect(
      db.prepare(`SELECT id, name, position FROM collections`).all()
    ).toEqual([{ id: '__main__', name: '主图', position: 0 }])
    expect(db.prepare(`SELECT key, value FROM lineage_graph_meta`).all()).toEqual([
      { key: 'lineTypes', value: '[]' }
    ])
    expect(db.prepare(`SELECT COUNT(*) AS c FROM change_epochs`).get()).toEqual({ c: 10 })
    expect(db.prepare(`SELECT MIN(epoch) AS lo, MAX(epoch) AS hi FROM change_epochs`).get()).toEqual({
      lo: 0,
      hi: 0
    })
    expect(
      db.prepare(`SELECT COUNT(*) AS c, COALESCE(MAX(stop), 0) AS s FROM deletion_log_guard`).get()
    ).toEqual({ c: 1, s: 0 })
    const fnCols = (db.prepare('PRAGMA table_info(floating_notes)').all() as Array<{ name: string }>)
      .map((c) => c.name)
      .sort()
    expect(fnCols).toEqual(['content', 'created_at', 'folder_id', 'id', 'updated_at', 'x', 'y'])
    expect(fnCols).not.toContain('paper_id')
    // [RR1 d1-W1] 基线 DDL 级强化锚：papers 全列集（21 列终态——实测口径；负锚
    // reading_seconds=008/009 双跳已消失列）+部分索引谓词+tags 复合 UNIQUE 存储
    // 态原文+change_epochs 播种全集+sqlite_sequence 复刻行
    const papersCols = (db.prepare('PRAGMA table_info(papers)').all() as Array<{ name: string }>).map(
      (c) => c.name
    )
    expect(papersCols).toEqual([
      'id',
      'file_ref',
      'sha256',
      'title',
      'authors_json',
      'year',
      'venue',
      'doi',
      'arxiv_id',
      'abstract',
      'source',
      'enrich_status',
      'added_at',
      'updated_at',
      'last_read_page',
      'cited_by_count',
      'cited_by_fetched_at',
      'cited_by_count_source',
      'folder_id',
      'impact_factor',
      'is_starred'
    ])
    expect(papersCols).not.toContain('reading_seconds')
    expect(
      (
        db.prepare("SELECT sql FROM sqlite_master WHERE name='idx_lineage_paper'").get() as {
          sql: string
        }
      ).sql
    ).toContain('WHERE paper_id IS NOT NULL')
    expect(
      (
        db.prepare("SELECT sql FROM sqlite_master WHERE name='tags'").get() as {
          sql: string
        }
      ).sql
    ).toContain('UNIQUE (folder_id, name)')
    expect(
      db.prepare('SELECT table_name FROM change_epochs ORDER BY table_name').all() as Array<{
        table_name: string
      }>
    ).toEqual([
      { table_name: 'ai_memory' },
      { table_name: 'annotations' },
      { table_name: 'collections' },
      { table_name: 'lineage_edges' },
      { table_name: 'lineage_graph_meta' },
      { table_name: 'lineage_nodes' },
      { table_name: 'notes' },
      { table_name: 'paper_tags' },
      { table_name: 'papers' },
      { table_name: 'tags' }
    ])
    expect(
      db.prepare("SELECT name, seq FROM sqlite_sequence WHERE name='deletion_events'").all()
    ).toEqual([{ name: 'deletion_events', seq: 0 }])
    const edgeCols = db.prepare('PRAGMA table_info(lineage_edges)').all() as Array<{
      name: string
      notnull: number
    }>
    expect(edgeCols.find((c) => c.name === 'from_anchor')).toBeDefined()
    expect(edgeCols.find((c) => c.name === 'to_anchor')).toBeDefined()
    expect(edgeCols.find((c) => c.name === 'from_anchor')!.notnull).toBe(0)
    expect(edgeCols.find((c) => c.name === 'to_anchor')!.notnull).toBe(0)
    // [d1-r2-W2] 星标部分索引谓词+folder_id 列级（NOT NULL+默认 '__main__'——
    // INV-122/124 锚面；RR2 主控亲笔补——d1 增量复审条件清偿）
    expect(
      (
        db.prepare("SELECT sql FROM sqlite_master WHERE name='idx_papers_starred'").get() as {
          sql: string
        }
      ).sql
    ).toContain('WHERE is_starred = 1')
    const paperCols = db.prepare('PRAGMA table_info(papers)').all() as Array<{
      name: string
      notnull: number
      dflt_value: string | null
    }>
    expect(paperCols.find((c) => c.name === 'folder_id')!.notnull).toBe(1)
    expect(paperCols.find((c) => c.name === 'folder_id')!.dflt_value).toBe("'__main__'")
    db.close()
  })

  it('已迁移库重开：零应用幂等+开库断言仍执行（守卫悬挂态在零应用路径显性告警）', () => {
    const db = openDatabase(':memory:')
    const first = migrate(db)
    expect(first.currentVersion).toBe(26)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    expect(again.currentVersion).toBe(26)
    db.prepare('UPDATE deletion_log_guard SET stop = 1').run()
    expect(() => migrate(db)).toThrow(/开库断言失败/)
    db.close()
  })

  it('迁移失败整体回滚：user_version 归 0、半建对象不残留（注入坏迁移验证）', () => {
    const db = openDatabase(':memory:')
    const bad = [
      {
        version: 26,
        name: 'bad',
        sql: 'CREATE TABLE rollback_probe_a (x); CREATE TABLE rollback_probe_b (y;'
      }
    ]
    expect(() => migrate(db, bad)).toThrow()
    expect(readUserVersion(db)).toBe(0)
    const leftover = db
      .prepare("SELECT name FROM sqlite_master WHERE name LIKE 'rollback_probe_%'")
      .all() as Array<{ name: string }>
    expect(leftover).toEqual([])
    db.close()
  })

  it('fkOff 迁移违约：事务内 foreign_key_check 拦截→抛+整体回滚（半成品表不残留）+FK 复位 ON（[F-SNAPCLEAN-01 RR1] 自 migrate-papers-folder-not-null 移植——注入式假迁移，与现役单件链解耦）', () => {
    const db = openDatabase(':memory:')
    const bad = [
      {
        version: 1,
        name: 'fkoff_bad',
        sql: `CREATE TABLE probe_parent (id TEXT PRIMARY KEY);
              CREATE TABLE probe_child (id TEXT PRIMARY KEY, pid TEXT NOT NULL REFERENCES probe_parent(id));
              INSERT INTO probe_child VALUES ('c1', 'ghost');`,
        fkOff: true
      }
    ]
    expect(() => migrate(db, bad)).toThrow(/foreign_key_check/)
    expect(readUserVersion(db)).toBe(0)
    const leftover = db
      .prepare("SELECT name FROM sqlite_master WHERE name LIKE 'probe_%'")
      .all()
    expect(leftover).toEqual([])
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    db.close()
  })

  it('fkOff 迁移正常应用：user_version 前进+FK 复位 ON+FK OFF 期可观察（NO ACTION 子行在场 DROP 父表——FK ON 下必炸）+后续常规迁移不受染（[F-SNAPCLEAN-01 RR1] 移植）', () => {
    const db = openDatabase(':memory:')
    const list = [
      {
        version: 1,
        name: 'fkoff_ok',
        sql: `CREATE TABLE probe_ok (x TEXT);
              CREATE TABLE probe_fk_parent (id TEXT PRIMARY KEY);
              CREATE TABLE probe_fk_child (id TEXT PRIMARY KEY, pid TEXT NOT NULL REFERENCES probe_fk_parent(id));
              INSERT INTO probe_fk_parent VALUES ('p');
              INSERT INTO probe_fk_child VALUES ('c', 'p');
              DROP TABLE probe_fk_parent;
              DELETE FROM probe_fk_child;`,
        fkOff: true
      },
      { version: 2, name: 'normal_after', sql: 'CREATE TABLE probe_after (y TEXT);' }
    ]
    const result = migrate(db, list)
    expect(result.appliedVersions).toEqual([1, 2])
    expect(readUserVersion(db)).toBe(2)
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.pragma('foreign_key_check')).toEqual([])
    const survivors = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE name IN ('probe_ok','probe_after','probe_fk_child','probe_fk_parent')"
      )
      .all() as Array<{ name: string }>
    expect(survivors.map((r) => r.name).sort()).toEqual(['probe_after', 'probe_fk_child', 'probe_ok'])
    db.close()
  })
})
