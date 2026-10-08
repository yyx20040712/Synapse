/**
 * 迁移执行器（SR-INFRA-03，已完成）。
 *
 * 职责：按版本号顺序应用 SQL 迁移；PRAGMA user_version 驱动，幂等可重入。
 * 硬规则（CI 锁强制）：已合入的迁移文件不可修改，只能新增 002_*.sql、003_*.sql…。
 * 单点例外（在档）：012 同名退让二重撞 UNIQUE 修复（[F-MIGR-01] P1-1——
 * 用户 2026-09-30 裁决案 a，v87 §3，单用户未分发论证下改 012 本体）。
 * 注释级例外（在档）：004 头注 stale 句改写（[F-BAKRET-01] 2026-09-30——
 * 纯注释零 SQL 变更零运行时影响，主控随批批准；例外口径=注释勘误不属
 * 「迁移不可修改」红线所防的语义漂移面）。
 *
 * SQL 通过 Vite ?raw 内联进产物，打包后无需携带 .sql 文件。
 * 测试：tests/unit/db/migrate.test.ts（新库全量/已迁移跳过/部分失败回滚）。
 */
import type { SqliteDb } from './connection'
import initSql from './migrations/001_init.sql?raw'
import indexesSql from './migrations/002_indexes.sql?raw'
import aiNotesSql from './migrations/003_ai_notes.sql?raw'
import lineageSql from './migrations/004_lineage.sql?raw'
import citedBySql from './migrations/005_cited_by.sql?raw'
import refEdgesSql from './migrations/006_lineage_ref_edges.sql?raw'
import nodeTagsSql from './migrations/007_lineage_node_tags.sql?raw'
import readingTimeSql from './migrations/008_reading_time.sql?raw'
import readingTimeDropSql from './migrations/009_reading_time_drop.sql?raw'
import lineageV2Sql from './migrations/010_lineage_v2.sql?raw'
import tagsColorSql from './migrations/011_tags_color.sql?raw'
import foldersGraphsSql from './migrations/012_folders_graphs.sql?raw'
import lineageEdgeViaSql from './migrations/013_lineage_edge_via.sql?raw'
import lineageEdgeVisualSql from './migrations/014_lineage_edge_visual.sql?raw'
import lineageEdgeBlueRecolorSql from './migrations/015_lineage_edge_blue_recolor.sql?raw'
import papersFolderNotNullSql from './migrations/016_papers_folder_not_null.sql?raw'
import papersIsStarredSql from './migrations/017_papers_is_starred.sql?raw'
import appMetaSql from './migrations/018_app_meta.sql?raw'

export interface Migration {
  version: number
  name: string
  sql: string
  /** [F-DBCAMP-01 DB-1] FK-OFF 迁移模式（016 重建父表舞步配套）：置真时执行器
   * 在事务外围 PRAGMA foreign_keys=OFF（事务内该 pragma 无操作=012 头注 F1），
   * 事务内 exec 后先跑 foreign_key_check 断言（可读未提交态，违约即抛=整体
   * 回滚+user_version 不前进），finally 复位 ON。机制边界（U1 探针 2×2 真值表）：
   * 子表 FK 子句改写由 RENAME 父表触发——fk=ON 恒改写；fk=OFF∧legacy=ON
   * 不改写；fk=OFF∧legacy=OFF 仍改写（本仓连接从不置 legacy）。官方序（旧表
   * 只 DROP 不 RENAME、新表 RENAME 无引用者）=不进 RENAME 改写面，FK OFF
   * 只承担关断 DROP 父表的隐式 DELETE 级联〔d1-新N2 精化〕 */
  fkOff?: boolean
}

/** 迁移清单：新增迁移在此追加（文件放 migrations/ 并 import ?raw） */
export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'init', sql: initSql },
  { version: 2, name: 'indexes', sql: indexesSql },
  { version: 3, name: 'ai_notes', sql: aiNotesSql },
  { version: 4, name: 'lineage', sql: lineageSql },
  { version: 5, name: 'cited_by', sql: citedBySql },
  { version: 6, name: 'lineage_ref_edges', sql: refEdgesSql },
  { version: 7, name: 'lineage_node_tags', sql: nodeTagsSql },
  { version: 8, name: 'reading_time', sql: readingTimeSql },
  // [F-TIME-02] 2026-09-19 用户裁决移除阅读时长——008 加列→009 删列双跳
  // （已合入迁移不可修改=CI 锁硬规则）
  { version: 9, name: 'reading_time_drop', sql: readingTimeDropSql },
  // [T3-P5] 脉络数据层 v2：month/slot/sub 列+lineage_graph_meta KV+slot 窗口
  // 回填（010 落地时新库终值 10——现行链尾随 011 演进，k1-W1 勘正）
  { version: 10, name: 'lineage_v2', sql: lineageV2Sql },
  // [F-TAGS-01] 标签颜色：tags.color TEXT 可空无默认（NULL=存量默认 accent；
  // 新库 user_version 终值 11）
  { version: 11, name: 'tags_color', sql: tagsColorSql },
  // [F-FOLDER-01] 文件夹×脉络图绑定：papers.folder_id（单归属）+impact_factor
  // +lineage_nodes.folder_id（修订二：可空列+迁移回填+repo 写边界兜底——SQLite
  // ADD COLUMN 静态禁 REFERENCES+非空 DEFAULT）+坑 a 存量去重+部分唯一索引
  // +回填+paper_collections 退役（design-final 修订二——新库 user_version 终值 12）
  { version: 12, name: 'folders_graphs', sql: foldersGraphsSql },
  // [F-LINEAGE-02 ①a] 手动调线路点：lineage_edges.via JSON TEXT（缺省 NULL=
  // 自动路由；不变量校验在 service 写面——新库 user_version 终值 13）
  { version: 13, name: 'lineage_edge_via', sql: lineageEdgeViaSql },
  // [F-LGRAPH-01②U8] 边视觉线型内联：dashed INTEGER/color TEXT NOT NULL
  // DEFAULT（存量行零迁移归一=实线+蓝；kind 列保留恒 'manual'——A3 DDL 最小
  // 化；新库 user_version 终值 15（k1-N1 勘正——015 起））
  { version: 14, name: 'lineage_edge_visual', sql: lineageEdgeVisualSql },
  // [F-UIRES-03 C1] 存量边旧蓝换深蓝：色板首色 '#3a5bd9'→'#1e3a8a'（呈裁①
  // ——shared 单源换值随批；014 DEFAULT 不动=repo 写面恒显式色死路径；
  // 新库 user_version 终值 15）
  { version: 15, name: 'lineage_edge_blue_recolor', sql: lineageEdgeBlueRecolorSql },
  // [F-DBCAMP-01 DB-1] papers.folder_id NOT NULL 真重建（v122 裁决② DDL 终态；
  // 官方 12 步序=旧表只 DROP 不 RENAME+FTS 双扫——候选 A legacy 换名舞步经
  // 探针证不可行；FK-OFF 模式首例=fkOff 标志；新库 user_version 终值 16）
  { version: 16, name: 'papers_folder_not_null', sql: papersFolderNotNullSql, fkOff: true },
  // [F-DBCAMP-01 DB-1 U2 / F-STAR-01] papers.is_starred 星标列+partial index
  // （ADD COLUMN 静态 DEFAULT 0——与 016 重建本质不同：FK 面零牵动，无 fkOff；
  // 新库 user_version 终值 17）
  { version: 17, name: 'papers_is_starred', sql: papersIsStarredSql },
  // [F-DBCAMP-01 DB-1 U3] app_meta 键值表（owner uuid+设备 token 本地侧载体
  // ——010 lineage_graph_meta 同形态三列 KV 无 seed：身份值=运行期
  // ensureIdentity 缺席才生成，snapshot_seq=DB-3 面不初始化；纯新增表零 FK
  // 面，无 fkOff；新库 user_version 终值 18）
  { version: 18, name: 'app_meta', sql: appMetaSql }
]

export interface MigrateResult {
  appliedVersions: number[]
  currentVersion: number
}

/**
 * 应用迁移。migrations 参数仅供测试注入（构造坏迁移验证回滚）；生产调用留空。
 */
export function migrate(
  db: SqliteDb,
  migrations: readonly Migration[] = MIGRATIONS
): MigrateResult {
  const current = readUserVersion(db)
  const applied: number[] = []

  for (const migration of [...migrations].sort((a, b) => a.version - b.version)) {
    if (migration.version <= current) continue
    // user_version 经字符串插值写入 pragma（pragma 无法参数绑定）——
    // 值只允许整数，杜绝任何拼接来源（AGENTS.md SQL 禁令的自证）
    if (!Number.isInteger(migration.version)) {
      throw new Error(`迁移版本号必须是整数：${String(migration.version)}`)
    }
    const runMigration = db.transaction(() => {
      db.exec(migration.sql)
      // FK-OFF 迁移守卫：关断期间写面不受 DDL 级联/约束保护——事务内
      // foreign_key_check 可读未提交态（U1 探针 B5），违约即抛=整体回滚。
      // 无表参数=全库扫描（有意设计）：覆盖 FK OFF 窗口内一切写面+顺带暴露
      // 存量库任何既存违例——fail-closed 方向=违例中止升级链+user_version
      // 不前进+重启重试再失败（宁拒升不吞错）
      if (migration.fkOff === true) {
        const violations = db.prepare('PRAGMA foreign_key_check').all() as Array<{
          table: string
          rowid: number
        }>
        if (violations.length > 0) {
          // 违例明细随报（前 3 行 table#rowid——定位修复对象〔d1-新N4〕）
          const detail = violations
            .slice(0, 3)
            .map((v) => `${v.table}#${v.rowid}`)
            .join('、')
          throw new Error(
            `迁移 ${migration.version}（${migration.name}）foreign_key_check 违约 ${violations.length} 行：${detail}`
          )
        }
      }
      db.pragma(`user_version = ${migration.version}`)
    })
    // FK-OFF 模式：DROP 父表需关断其隐式 DELETE 级联（FK ON 下 DROP 父表=
    // 级联灭子表——012 头注 F3）——必须在事务外关断（事务内该 pragma 无操作）；
    // finally 复位，失败路径不留半关断连接
    if (migration.fkOff === true) db.pragma('foreign_keys = OFF')
    try {
      runMigration()
    } finally {
      if (migration.fkOff === true) db.pragma('foreign_keys = ON')
    }
    applied.push(migration.version)
  }

  return { appliedVersions: applied, currentVersion: readUserVersion(db) }
}

export function readUserVersion(db: SqliteDb): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return row.user_version
}
