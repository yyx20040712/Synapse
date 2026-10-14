/**
 * [F-DBCAMP-01 DB-3 U2] ipc/snapshot —— 快照导出域装配（设计书 §13.8 U2；
 * 简报主控裁决③-5；export_.ts「先构建后弹框」+CANCELLED 域错误先例）。
 *
 * ── 行为层 ──
 * - getSyncKey/listPeerKeys/removePeerKey/importPeerKey：薄分发 service。
 * - exportToFile 编排：先构建（构建失败零弹框零计数消耗——service.exportToBuffer
 *   纯构建无对话框）→dialogs.saveFile('synapse-snapshot.synsnap', [Synapse 快照
 *   *.synsnap])→null=抛 CANCELLED（code 惯例同 export_）→atomicWriteFile 落盘
 *   （tmp+rename 单源）→成功后 commitExport(seq)（取消/失败零调用=计数不变，
 *   §13.4）→res {filePath, snapshotSeq, tableCounts}。
 *
 * ── 架构层 ──
 * - INV-07：导出路径=main 侧系统对话框产生，renderer 零路径面（C-02 exportTo
 *   同型）；原子写单源=services/shared/atomic-write（system.ts 直引 domain-error
 *   同款 ipc→services/shared 合法面）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/snapshot.test.ts（always-active，dialogs/service 桩）。
 */
import { DomainError } from '../services/shared/domain-error'
import { atomicWriteFile } from '../services/shared/atomic-write'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

/** 域错误：用户取消保存（CANCELLED）载体（基类一行继承——F-DEDUP-01 单源） */
class SnapshotIpcError extends DomainError {}

const SNAP_FILTER = [{ name: 'Synapse 快照', extensions: ['synsnap'] }]

export function createSnapshotIpc(deps: IpcDeps): ApiHandlers['snapshot'] {
  return {
    getSyncKey: async (_req) => deps.services.snapshot.getSyncKeyInfo(),

    exportToFile: async (_req) => {
      const built = await deps.services.snapshot.exportToBuffer()
      const target = await deps.dialogs.saveFile('synapse-snapshot.synsnap', SNAP_FILTER)
      if (target === null) {
        throw new SnapshotIpcError('CANCELLED', '已取消保存')
      }
      await atomicWriteFile(target, built.bytes)
      deps.services.snapshot.commitExport(built.snapshotSeq)
      return { filePath: target, snapshotSeq: built.snapshotSeq, tableCounts: built.tableCounts }
    },

    importPeerKey: async (req) => deps.services.snapshot.importPeerKey(req.bundle),

    listPeerKeys: async (_req) => ({ peers: await deps.services.snapshot.listPeerKeys() }),

    removePeerKey: async (req) => ({ removed: await deps.services.snapshot.removePeerKey(req.ownerId) })
  }
}
