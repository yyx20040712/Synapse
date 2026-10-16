/**
 * [F-DBCAMP-01 DB-1 U3] 迁移 018（app_meta 键值表——owner uuid+设备 token
 * 本地侧载体）锁定测试（真库夹具——migrate-papers-is-starred.test.ts 同型）。
 *
 * 真相源=docs/design/2026-10-08_f-dbcamp01-design.md §1（app_meta=owner_id/
 * snapshot_seq 载体术语）+§5.b（owner_id 生命周期：生成=首运行 uuid 写
 * app_meta/恢复己备份随库走=身份延续）+§5.c（018 行）+§12（契约增量汇总
 * 「app_meta（owner uuid+设备 token 本地侧）」）+2026-10-08 U3 简报主控裁决
 * ③（DDL=010 lineage_graph_meta 同形态三列 KV；无 seed——owner_id/device_token
 * =运行期生成值非静态默认，缺席才生成在 repo ensureIdentity；snapshot_seq
 * 本批不初始化不消费=DB-3 envelope 面；无 fkOff——纯新增表零 FK 面）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

/** v17 形态直插 papers（folder_id 走 016 DEFAULT '__main__'——缺省合法） */
function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

/** 建到 v17 的库（018 前形态） */
function openV17(): Db {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 17))
  return db
}

describe('db/migrate —— 018 app_meta 键值表（纯新增 KV——零 FK 牵动）', () => {
  it('新库全链：user_version=18+应用清单 [1..18]+幂等重入（再跑 applied=[]）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(23)
    expect(result.appliedVersions).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
    ])
    expect(readUserVersion(db)).toBe(23)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })

  it('v17→18 升级链：applied=[18]（[F-DBCAMP-01 DB-1 U4] 019 随链=[18,19]）+既有行保全+app_meta 表在档且空表无 seed', () => {
    const db = openV17()
    seedPaper(db, 'p-1')
    const result = migrate(db)
    // 判别器：18 确已应用（否则表不存在→下方 app_meta 查询 SQL 报错红）
    expect(result.appliedVersions).toEqual([18, 19, 20, 21, 22, 23])
    expect(readUserVersion(db)).toBe(23)
    expect(db.prepare("SELECT title FROM papers WHERE id = 'p-1'").get()).toEqual({
      title: '文献p-1'
    })
    // 无 seed（裁决③.1）：owner_id/device_token=运行期生成值（repo ensureIdentity
    // 缺席才生成）；snapshot_seq=DB-3 面不初始化——迁移后恒零行
    expect(db.prepare('SELECT COUNT(*) c FROM app_meta').get()).toEqual({ c: 0 })
    db.close()
  })

  it('表形态=010 lineage_graph_meta 同构：恰三列+全列 NOT NULL+key 列 PK+全列无 DDL DEFAULT', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const cols = db.prepare('PRAGMA table_info(app_meta)').all() as Array<{
      name: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>
    expect(cols.map((c) => c.name)).toEqual(['key', 'value', 'updated_at'])
    for (const c of cols) {
      expect(c.dflt_value, `${c.name} 应无 DDL DEFAULT（应用层写 ISO——010 先例）`).toBeNull()
    }
    // 全列显式 NOT NULL=1；key=PK。key 的显式 NOT NULL=[门一 k1-W1 处置]：
    // TEXT PK 在 SQLite 不隐含 NOT NULL（010 怪癖——NULL 键可插且 UNIQUE 互不
    // 冲突），018 未发布零成本收紧（key TEXT NOT NULL PRIMARY KEY）
    expect(cols.find((c) => c.name === 'key')).toMatchObject({ notnull: 1, pk: 1 })
    expect(cols.find((c) => c.name === 'value')).toMatchObject({ notnull: 1, pk: 0 })
    expect(cols.find((c) => c.name === 'updated_at')).toMatchObject({ notnull: 1, pk: 0 })
    db.close()
  })

  it('KV 契约：同 key 二次 INSERT 拒（UNIQUE）+key/value/updated_at 显式 NULL 三面拒', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('probe-k', 'v1', 't1')`).run()
    expect(() =>
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('probe-k', 'v2', 't2')`).run()
    ).toThrow(/UNIQUE constraint failed/)
    expect(() =>
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES (NULL, 'v', 't')`).run()
    ).toThrow(/NOT NULL constraint failed/)
    expect(() =>
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('k-null-v', NULL, 't')`).run()
    ).toThrow(/NOT NULL constraint failed/)
    expect(() =>
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('k-null-u', 'v', NULL)`).run()
    ).toThrow(/NOT NULL constraint failed/)
    db.close()
  })
})
