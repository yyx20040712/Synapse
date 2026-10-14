/**
 * [F-DBCAMP-01 DB-3 U2] export-snapshot.service —— 快照导出纯构建面（设计书
 * §13.6/§13.8 U2；简报主控裁决③-5）。U3 导入六闸消费本面产出的 envelope 形态。
 *
 * ── 行为层 ──
 * - getSyncKeyInfo：{ownerId, syncKey, bundle}——bundle=`<owner_id>:<sync_key>`
 *   （36+1+64=101 字符——QR 载荷即此串，§13.9-1 b 案）。本库密钥显形仅此通道
 *   （不经对话框——用户显式打开设置页面才可见）。
 * - exportToBuffer：纯构建（无对话框——先构建后弹框编排归 IPC 层，export_.ts
 *   先例）：ensureSyncKey（幂等）→nextSnapshotSeq（空键≡0→首导=1）→读九表
 *   +deletion_events 全量+pdf_refs 派生→buildEnvelope。取消/失败零计数消耗
 *   ——commitExport 仅在落盘成功后由 IPC 层调（§13.4）。
 * - pdf_refs：按 paper_id 序；blob_id=HMAC-SHA256(blob_key, papers.sha256)——
 *   DB 权威哈希列，导出零文件读（r3-N9 v1 边界=标识计算+清单；file_ref 随卷
 *   携带供 U3 面向转移对账；blob 内容/传输=v2）。
 * - importPeerKey：bundle 正则校验（OWNER_ID_PATTERN 复用+64-hex）→不合法=
 *   INVALID_REQUEST 域错误（中文消息）→owner==本库 owner=拒→setPeerKey→
 *   res ownerId。
 * - listPeerKeys/removePeerKey：对端密钥面薄委托 repo。
 *
 * ── 接口层 ──
 * - export function createExportSnapshotService(deps: { repos: Repos;
 *   makeNonce?: () => Buffer }): SnapshotService
 * - makeNonce 注入（INV-D 确定性测试面——默认 randomBytes(12)）
 *
 * ── 文化层 ──
 * - 分层单向：只经 repos 读面+services/snapshot/envelope.codec 单源；零 electron
 *   依赖。测试：tests/unit/services/export-snapshot.service.test.ts。
 */
import { randomBytes } from 'node:crypto'
import { APP_META_KEYS, OWNER_ID_PATTERN } from '../../../shared/models/app-meta'
import type { Repos } from '../../db/repos'
import { DomainError } from '../shared/domain-error'
import {
  blobIdOf,
  buildEnvelope,
  deriveKeys,
  envelopeToBytes,
  type SnapshotEnvelope
} from './envelope.codec'

/** 域错误：快照面（INVALID_REQUEST 载体——基类一行继承，F-DEDUP-01 单源） */
class SnapshotServiceError extends DomainError {}

/** bundle=<uuid v4 小写>:<64-hex>（OWNER_ID_PATTERN 复用——锚 shared 单源；
 *  分组①=owner_id、②=64-hex） */
const BUNDLE_RE = new RegExp(
  `^(${OWNER_ID_PATTERN.source.replace(/^\^/, '').replace(/\$$/, '')}):([0-9a-f]{64})$`
)

export interface SnapshotExportBuilt {
  bytes: Buffer
  snapshotSeq: number
  tableCounts: Record<string, number>
}

export interface SnapshotService {
  getSyncKeyInfo(): { ownerId: string; syncKey: string; bundle: string }
  exportToBuffer(): SnapshotExportBuilt
  /** 落盘成功后写回计数（取消/失败零调用——§13.4） */
  commitExport(snapshotSeq: number): void
  importPeerKey(bundle: string): { ownerId: string }
  listPeerKeys(): Array<{ ownerId: string; importedAt: string }>
  removePeerKey(ownerId: string): boolean
}

export function createExportSnapshotService(deps: {
  repos: Repos
  makeNonce?: () => Buffer
}): SnapshotService {
  const { repos } = deps

  function requireOwnerId(): string {
    const ownerId = repos.appMeta.get(APP_META_KEYS.ownerId)
    if (ownerId === null) {
      throw new Error('owner_id 缺席：装配序缺陷（ensureIdentity 未在装配期执行）')
    }
    return ownerId
  }

  return {
    getSyncKeyInfo(): { ownerId: string; syncKey: string; bundle: string } {
      const ownerId = requireOwnerId()
      const syncKey = repos.snapshot.readSyncKey()
      return { ownerId, syncKey, bundle: `${ownerId}:${syncKey}` }
    },

    exportToBuffer(): SnapshotExportBuilt {
      const syncKey = repos.snapshot.ensureSyncKey()
      const snapshotSeq = repos.snapshot.nextSnapshotSeq()
      const rows = repos.snapshot.readExportTables()
      const deletions = repos.snapshot.readDeletionEvents()
      const { blobKey } = deriveKeys(syncKey)
      // pdf_refs 按 paper_id 序（papers 行集已按 (updated_at,id) 序——显式再按
      // paper_id 排序落 §13.6「pdf_refs 按 paper_id 序」字面）
      // [回炉 R8] 码元比较（非 localeCompare——INV-D 跨机确定性消 locale 依赖）
      const papers = [...rows.papers].sort((a, b) => {
        const x = String(a.id)
        const y = String(b.id)
        return x < y ? -1 : x > y ? 1 : 0
      })
      const pdfRefs = papers.map((p) => ({
        paper_id: String(p.id),
        file_ref: String(p.file_ref),
        blob_id: blobIdOf(blobKey, String(p.sha256))
      }))
      const envelope: SnapshotEnvelope = buildEnvelope({
        syncKey,
        schemaVersion: repos.snapshot.readSchemaVersion(),
        snapshotSeq,
        ownerId: requireOwnerId(),
        payload: {
          data: rows as unknown as Record<string, Array<Record<string, unknown>>>,
          deletions,
          pdf_refs: pdfRefs
        },
        makeNonce: deps.makeNonce ?? (() => randomBytes(12))
      })
      const tableCounts: Record<string, number> = { ...envelope.table_counts }
      return { bytes: envelopeToBytes(envelope), snapshotSeq, tableCounts }
    },

    commitExport(snapshotSeq: number): void {
      repos.snapshot.commitSnapshotSeq(snapshotSeq)
    },

    importPeerKey(bundle: string): { ownerId: string } {
      const m = BUNDLE_RE.exec(bundle)
      if (m === null) {
        throw new SnapshotServiceError(
          'INVALID_REQUEST',
          '同步密钥格式不正确：应为 <库标识>:<64 位十六进制密钥>（设置页「复制」产物）'
        )
      }
      const ownerId = m[1] as string
      if (ownerId === requireOwnerId()) {
        throw new SnapshotServiceError('INVALID_REQUEST', '不能导入本库自身的同步密钥')
      }
      repos.snapshot.setPeerKey(ownerId, m[2] as string)
      return { ownerId }
    },

    listPeerKeys(): Array<{ ownerId: string; importedAt: string }> {
      return repos.snapshot.listPeerKeys()
    },

    removePeerKey(ownerId: string): boolean {
      return repos.snapshot.removePeerKey(ownerId)
    }
  }
}
