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
 * 第三笔例外（在档）：[F-SNAPCLEAN-01] 迁移链基线压缩（2026-10-20，ADR-0030）——
 * 删已合入 001–025 全 25 件、并单件 026_baseline.sql（B″ 续号方案：新库
 * user_version 直达 26，版本连续不重置）。授权链=2026-10-19 用户裁决「开发
 * 阶段一切以最新版本为准，不考虑多余的兼容」（账本 1488 行⑦）+票面受锁面
 * [tests+migrations]；旧链升级舞步唯一消费者=本地 v22 测试库（随批 tar 备份
 * 后删除）；等价证明（双库 sqlite_master+种子 diff 空）与回退路径=仓外批档
 * scripts-audits/20261020-snapclean01/（design-v2-final.md §1/§7）。遗留 v2x
 * 旧库在新代码下启动=响亮迁移失败（22<26 跑 026→CREATE TABLE 已存在→事务
 * 回滚抛错）——有意行为非静默错配。
 *
 * SQL 通过 Vite ?raw 内联进产物，打包后无需携带 .sql 文件。
 * 测试：tests/unit/db/migrate.test.ts（新库全量〔基线漂移守卫〕/已迁移跳过
 * +开库断言仍执行/失败回滚）。
 */
import type { SqliteDb } from './connection'
import baselineSql from './migrations/026_baseline.sql?raw'

export interface Migration {
  version: number
  name: string
  sql: string
  /** [F-DBCAMP-01 DB-1] FK-OFF 迁移模式（历史首例 016 重建父表舞步——该用例
   * 已随 [F-SNAPCLEAN-01] 基线压缩删除，机制保留供后续重建型迁移复用）：置真时
   * 执行器在事务外围 PRAGMA foreign_keys=OFF（事务内该 pragma 对 FK 约束无
   * 操作=SQLite 语义），事务内 exec 后先跑 foreign_key_check 断言（可读未提交
   * 态，违约即抛=整体回滚+user_version 不前进），finally 复位 ON。机制边界（U1 探针 2×2
   * 真值表）：子表 FK 子句改写由 RENAME 父表触发——fk=ON 恒改写；fk=OFF∧
   * legacy=ON 不改写；fk=OFF∧legacy=OFF 仍改写（本仓连接从不置 legacy）。
   * 官方序（旧表只 DROP 不 RENAME、新表 RENAME 无引用者）=不进 RENAME 改写面，
   * FK OFF 只承担关断 DROP 父表的隐式 DELETE 级联〔d1-新N2 精化〕 */
  fkOff?: boolean
}

/** 迁移清单：新增迁移在此追加（文件放 migrations/ 并 import ?raw）。
 * [F-SNAPCLEAN-01] 基线压缩后现役单件=026（B″ 续号——新库直达 26）；后续演进
 * 从 027_*.sql 起新增，026 与其内容不可再修改。 */
export const MIGRATIONS: readonly Migration[] = [
  { version: 26, name: 'baseline', sql: baselineSql }
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
    // 其隐式 DELETE 级联灭子表——SQLite 语义）——必须在事务外关断（事务内该 pragma 无操作）；
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
  // [F-SNAPCLEAN-01] 基线压缩后新库终值 26≥21 恒过闸=活防线非死码（主控裁决
  // 保留不动）。版本<21 的注入式部分迁移测试不受版本守卫波及。
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
