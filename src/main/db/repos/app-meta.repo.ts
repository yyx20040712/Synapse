/**
 * [F-DBCAMP-01 DB-1 U3] app-meta.repo —— app_meta 键值载体+身份确保
 * （owner uuid+设备 token 本地侧——设计书 §5.b/§12+A2 答复口径）。
 *
 * ── 行为层 ──
 * - 表=迁移 018 app_meta（010 lineage_graph_meta 同形态三列 KV：key PK/
 *   value/updated_at——应用层写 ISO 值，弃 DDL DEFAULT=UTC 实测，010 注记）。
 * - ensureIdentity（身份生命周期②「恢复己备份=随库走身份延续」的机制面）：
 *   读 owner_id/device_token 两键→缺席才生成（uuid=randomUUID()/
 *   token=randomBytes(32).toString('hex')——node:crypto）→写=INSERT OR IGNORE
 *   语义（在场键永不覆写）→返回当前生效值。调用点=bootstrap assemble 闭包
 *   createRepos 后一行（单路径：默认库首装+课题切换 assembleInto 同闭包全覆盖；
 *   workspace-layout initWorkspaceDb 空建库身份=首次 assemble 补——两路径不双写）。
 * - snapshot_seq 键=APP_META_KEYS 登记但不经本 repo 写读（DB-3 envelope 面）。
 * - 本批零 IPC 零 service（消费=DB-3 owner/seq+DB-2 设置页 token 展示）。
 *
 * ── 文化层 ──
 * - get/set 预编译+参数绑定（禁拼接）；缺席 get=null（合法态非错误）。
 * - 测试：tests/unit/db/repos/app-meta.repo.test.ts（always-active 真库夹具）。
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { APP_META_KEYS } from '../../../shared/models/app-meta'
import type { SqliteDb } from '../connection'

export interface AppMetaRepo {
  /** 单键读（lineage getMetaStmt 先例；缺席 null） */
  get(key: string): string | null
  /** 单键 upsert（ON CONFLICT(key) DO UPDATE+应用层 ISO updated_at——
   * lineage setLineTypesStmt 先例；同键再写覆写值并刷新 updated_at） */
  set(key: string, value: string): void
  /** 身份确保：读两键→缺席才生成→INSERT OR IGNORE 写（在场键永不覆写
   * ——身份延续）→返回当前生效值 */
  ensureIdentity(): { ownerId: string; deviceToken: string }
}

export function createAppMetaRepo(db: SqliteDb): AppMetaRepo {
  const getStmt = db.prepare(`SELECT value FROM app_meta WHERE key = ?`)
  const setStmt = db.prepare(
    `INSERT INTO app_meta (key, value, updated_at)
     VALUES (@key, @value, @now)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
  // ensure 写=OR IGNORE（在场键永不覆写；与「先读后写」双保险——单进程同步
  // 面无竞态，语义按主控裁决③.3 字面保留 OR IGNORE 形态）
  const ensureStmt = db.prepare(
    `INSERT OR IGNORE INTO app_meta (key, value, updated_at) VALUES (@key, @value, @now)`
  )

  function get(key: string): string | null {
    const row = getStmt.get(key) as { value: string } | undefined
    return row === undefined ? null : row.value
  }

  return {
    get,

    set(key: string, value: string): void {
      setStmt.run({ key, value, now: new Date().toISOString() })
    },

    ensureIdentity(): { ownerId: string; deviceToken: string } {
      const now = new Date().toISOString()
      if (get(APP_META_KEYS.ownerId) === null) {
        ensureStmt.run({ key: APP_META_KEYS.ownerId, value: randomUUID(), now })
      }
      if (get(APP_META_KEYS.deviceToken) === null) {
        ensureStmt.run({ key: APP_META_KEYS.deviceToken, value: randomBytes(32).toString('hex'), now })
      }
      return {
        ownerId: get(APP_META_KEYS.ownerId) as string,
        deviceToken: get(APP_META_KEYS.deviceToken) as string
      }
    }
  }
}
