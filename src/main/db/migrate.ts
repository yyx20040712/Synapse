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
import tagsFolderDomainSql from './migrations/019_tags_folder_domain.sql?raw'
import aiDomainSql from './migrations/020_ai_domain.sql?raw'
import deletionEventsSql from './migrations/021_deletion_events.sql?raw'
import lineageGhostEdgesSql from './migrations/022_lineage_ghost_edges.sql?raw'
import paperFiguresSql from './migrations/023_paper_figures.sql?raw'

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
  { version: 18, name: 'app_meta', sql: appMetaSql },
  // [F-DBCAMP-01 DB-1 U4 / F-TAGS-02] tags 多域：folder_id 域列+UNIQUE(folder_id,
  // name)+存量归主图+挂接域守卫触发器（012 族域资产语义——CASCADE 夹删随灭；
  // 重建序独立于 016：无 FTS 面/无表上触发器/唯一子表=paper_tags；fkOff 同 016
  // ——tags 是父表 DROP 级联灭挂接；新库 user_version 终值 19）
  { version: 19, name: 'tags_folder_domain', sql: tagsFolderDomainSql, fkOff: true },
  // [F-DBCAMP-01 DB-2 U1] AI 域数据面：change_epochs epoch 基建（INV-J，10 表
  // ×3 触发器+播种 10 行）+AI 域 5 新表（sessions/messages/tasks/memory/
  // task_audit）+分类条件枚举（19=6+7+6 冻结）+ai_memory FTS（external content
  // +trigram）+G2 审计触发器+随锚级联触发器（用户裁定①②④⑥——纯新增无表
  // 重建，无 fkOff；级联体 T3 实照修正=memory 先删链式 _ad 清 FTS，见 020 头注；
  // 新库 user_version 终值 20）
  { version: 20, name: 'ai_domain', sql: aiDomainSql },
  // [F-DBCAMP-01 DB-3 U1] 删事件日志（设计 §13.1/§13.3 021 号改派）：
  // deletion_events append-only 账+deletion_log_guard 直执守卫+导出面九表
  // AFTER DELETE 触发器族+append-only 拒写防御；服务层零侵入；纯新增表+触发器
  // 无表重建，无 fkOff；新库 user_version 终值 21
  { version: 21, name: 'deletion_events', sql: deletionEventsSql },
  // [F-DBCAMP-01 DB-4 / F1] 幽灵边存量清理（guard 先行三步：stop=1→DELETE 跨图
  // 边→stop=0——防 021 触发器落账假删事件；判据=双端点 nodes.folder_id 不等；
  // 纯存量 DELETE 无 DDL，无 fkOff；新库 user_version 终值 22）
  { version: 22, name: 'lineage_ghost_edges', sql: lineageGhostEdgesSql },
  // [F-VISFB-42] 派生图表资产合同：figure_jobs 状态表（pending→ready/failed
  // 终态+excess 截断记档+failed_count）+paper_figures 资产表（digest 单键去重/
  // 资产路径/像素尺寸/CTM bbox/页码）；papers 零新列；派生不入快照（恢复后
  // 重提取）；paper_id FK CASCADE（papers 三删除路径自动清派生行）；纯新增
  // 表无触发器，无 fkOff；新库 user_version 终值 23
  { version: 23, name: 'paper_figures', sql: paperFiguresSql }
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

  // [F-DBCAMP-01 DB-3 U1] 开库断言（设计 §13.1 r3-N7②）：库版本已达 021 时
  // deletion_log_guard 须在位、恰 1 行、stop=0——守卫悬挂态（导入事务置 1 后未
  // 复位/播种行被清空等形态）由静默失效转显性告警。空行态=触发器 WHEN 子查询
  // NULL→静默停记（防线停摆面），由行数断言捕获。migrate 每次开库都调用
  // （bootstrap/workspace-layout），循环零应用（已迁移库重开）断言仍须执行；
  // 版本<21 的注入式部分迁移测试不受版本守卫波及。
  if (readUserVersion(db) >= 21) {
    let guard: { n: number; s: number }
    try {
      guard = db
        .prepare('SELECT COUNT(*) AS n, COALESCE(MAX(stop), 0) AS s FROM deletion_log_guard')
        .get() as { n: number; s: number }
    } catch (e) {
      throw new Error(
        `deletion_log_guard 开库断言失败：表缺失或不可读（${String(e)}）——` +
          '库版本已达 21 而守卫表不在位，库处于不一致态'
      )
    }
    if (guard.n !== 1) {
      throw new Error(
        `deletion_log_guard 开库断言失败：守卫行数=${guard.n}≠1（播种恰 1 行被破坏` +
          '——空行/多行均为防线停摆面，修复守卫表后再开库）'
      )
    }
    if (guard.s !== 0) {
      throw new Error(
        `deletion_log_guard 开库断言失败：stop=${guard.s}≠0（导入直执守卫悬挂态——复位 0 后再开库）`
      )
    }
  }

  return { appliedVersions: applied, currentVersion: readUserVersion(db) }
}

export function readUserVersion(db: SqliteDb): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return row.user_version
}
