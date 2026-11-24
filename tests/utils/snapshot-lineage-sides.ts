/**
 * 测试基建：快照三段闭环双库夹具（B4 L1 §7.5 真库测试序列 1–8 单源）。
 *
 * 消费=tests/unit/services/import-snapshot.service.test.ts 与
 * snapshot-floating-notes.test.ts 的闭环序列段。每侧=真库+身份固定+导出/导入
 * 服务+history-unit 服务（原 id 恢复入口）；固定 nonce（卷字节确定性）。
 * 真库均内存库——不动用户库。
 */
import { createExportSnapshotService } from '../../src/main/services/snapshot/export-snapshot.service'
import { createImportSnapshotService } from '../../src/main/services/snapshot/import-snapshot.service'
import {
  createLineageHistoryUnitService,
  type LineageHistoryUnitService
} from '../../src/main/services/lineage/lineage-history-unit.service'
import { createRepos } from '../../src/main/db/repos'
import { createTestDb } from './fixtures'
import { APP_META_KEYS } from '../../src/shared/models/app-meta'
import type { SnapshotImportRes } from '../../src/shared/ipc/schemas'

export interface SnapshotSide {
  owner: string
  db: ReturnType<typeof createTestDb>
  repos: ReturnType<typeof createRepos>
  history: LineageHistoryUnitService
}

export function makeSnapshotSide(owner: string): SnapshotSide {
  const db = createTestDb()
  const repos = createRepos(db)
  repos.appMeta.ensureIdentity()
  repos.snapshot.ensureSyncKey()
  db.prepare('UPDATE app_meta SET value = ? WHERE key = ?').run(owner, APP_META_KEYS.ownerId)
  const history = createLineageHistoryUnitService({
    historyRepo: repos.lineageHistory,
    meta: repos.lineage,
    listGraph: () => repos.lineage.listGraph(),
    folderExists: (id) => repos.folders.findById(id) !== null,
    paperExists: (id) => repos.papers.findById(id) !== null,
    paperFolderIdOf: (id) => repos.papers.folderIdOf(id), // [INV-88] 恢复节点的归属图查证（与生产装配同源）
    withTransaction: repos.withTransaction
  })
  return { owner, db, repos, history }
}

export function syncKeyOf(side: SnapshotSide): string {
  return (
    side.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as { value: string }
  ).value
}

/** 接收端预导入发送端密钥（§13.9-2 a 案面） */
export function pair(receiver: SnapshotSide, sender: SnapshotSide): void {
  receiver.repos.snapshot.setPeerKey(sender.owner, syncKeyOf(sender))
}

/** 导出并落账计数（=IPC 落盘成功后 commit 语义） */
export function exportVol(side: SnapshotSide): Buffer {
  const exporter = createExportSnapshotService({ repos: side.repos, makeNonce: () => Buffer.from('0123456789ab', 'utf8') })
  const built = exporter.exportToBuffer()
  exporter.commitExport(built.snapshotSeq)
  return built.bytes
}

export function importVol(side: SnapshotSide, bytes: Buffer): SnapshotImportRes {
  return createImportSnapshotService({ repos: side.repos }).importFromBuffer(bytes)
}
