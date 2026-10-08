/**
 * [F-DBCAMP-01 DB-1 U3] app-meta.repo 锁定测试（always-active——tags-color.repo
 * .test.ts 同型真库夹具）。
 *
 * 覆盖（简报④下限拆解）：ensureIdentity 双键生成+格式（uuid v4 小写/
 * DEVICE_TOKEN_PATTERN 64-hex=32 字节——A2 答复口径）/再 ensure 幂等值不变/
 * 预置值保留不覆写（INSERT OR IGNORE 在场键永不覆写——恢复己备份随库走=
 * 身份延续，设计 §5.b 生命周期②）/get+set upsert 往返/set updated_at=
 * 应用层 ISO 随写（弃 DDL DEFAULT——010 口径）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAppMetaRepo } from '../../../../src/main/db/repos/app-meta.repo'
import { createTestDb } from '../../../utils/fixtures'
import {
  APP_META_KEYS,
  DEVICE_TOKEN_PATTERN,
  OWNER_ID_PATTERN
} from '../../../../src/shared/models/app-meta'

type Db = ReturnType<typeof createTestDb>

/** 直读单键行（绕过 repo 读面——断言落库真值） */
function readRow(db: Db, key: string): { value: string; updated_at: string } | undefined {
  return db.prepare('SELECT value, updated_at FROM app_meta WHERE key = ?').get(key) as
    | { value: string; updated_at: string }
    | undefined
}

describe('F-DBCAMP-01 DB-1 U3 app-meta.repo —— KV 载体+身份确保', () => {
  it('ensureIdentity 新库双键生成：ownerId=uuid v4 小写+deviceToken=64-hex（32 字节）+两键落库', () => {
    const db = createTestDb()
    const repo = createAppMetaRepo(db)
    const id = repo.ensureIdentity()
    // 格式契约（shared 常量单源——A2 答复口径 uuid+设备 token）
    expect(id.ownerId).toMatch(OWNER_ID_PATTERN)
    expect(id.deviceToken).toMatch(DEVICE_TOKEN_PATTERN)
    // 返回值=库中当前生效值（非仅内存生成值）
    expect(readRow(db, APP_META_KEYS.ownerId)?.value).toBe(id.ownerId)
    expect(readRow(db, APP_META_KEYS.deviceToken)?.value).toBe(id.deviceToken)
    db.close()
  })

  it('再 ensure 幂等：两键值不变（在场键永不覆写——身份延续）', () => {
    const db = createTestDb()
    const repo = createAppMetaRepo(db)
    const first = repo.ensureIdentity()
    const second = repo.ensureIdentity()
    expect(second.ownerId).toBe(first.ownerId)
    expect(second.deviceToken).toBe(first.deviceToken)
    db.close()
  })

  it('预置值保留不覆写：库中已有 owner_id/device_token（恢复己备份形态）→ensure 返回预置原值', () => {
    const db = createTestDb()
    // 合法形态预置（v4 小写 uuid+64-hex——随库恢复回来的身份）
    const presetOwner = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
    const presetToken = `0123456789abcdef`.repeat(4)
    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, '2026-01-01T00:00:00.000Z')`
    ).run(APP_META_KEYS.ownerId, presetOwner)
    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, '2026-01-01T00:00:00.000Z')`
    ).run(APP_META_KEYS.deviceToken, presetToken)
    const repo = createAppMetaRepo(db)
    const id = repo.ensureIdentity()
    expect(id.ownerId).toBe(presetOwner)
    expect(id.deviceToken).toBe(presetToken)
    db.close()
  })

  it('get+set 往返：缺席键 get=null+新键写入回读+同键再写覆写（upsert DO UPDATE 语义）', () => {
    const db = createTestDb()
    const repo = createAppMetaRepo(db)
    expect(repo.get('no-such-key')).toBeNull()
    repo.set('probe-k', 'v1')
    expect(repo.get('probe-k')).toBe('v1')
    repo.set('probe-k', 'v2')
    expect(repo.get('probe-k')).toBe('v2')
    db.close()
  })

  it('set updated_at=应用层 ISO 随写：1970 哨兵预置行→set 后刷新为近今 ISO（弃 DDL DEFAULT）', () => {
    const db = createTestDb()
    const t0 = Date.now() - 60_000 // 近今窗口下界（余量 60s——防边界抖动）
    // [门一 d1-W1 销项锚] 预置行使 key 在场——set 走 ON CONFLICT DO UPDATE 覆写
    // 分支（本用例同证覆写路径的 updated_at 刷新：摘 DO UPDATE 的 updated_at
    // 赋值→残留 1970 哨兵→下方 ≥t0 断言红——预置前提勿删）
    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES ('probe-k', 'old', '1970-01-01T00:00:00.000Z')`
    ).run()
    const repo = createAppMetaRepo(db)
    repo.set('probe-k', 'new')
    const row = readRow(db, 'probe-k')
    expect(row?.value).toBe('new')
    // ISO 形态+近今（随写=每次 set 刷新当前时刻，非哨兵/非恒定值）
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(new Date(row!.updated_at).getTime()).toBeGreaterThanOrEqual(t0)
    db.close()
  })
})
