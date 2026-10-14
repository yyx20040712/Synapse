/**
 * [F-DBCAMP-01 DB-3 U3] import-snapshot.service —— 快照导入六闸编排（设计书
 * §13.2 接收方流程/§13.4 水位/§13.6 摘要域；简报主控裁决③-5）。export 面的
 * 对偶件；验签/解密单源=envelope.codec.decodeEnvelope（R-A）。
 *
 * ── 行为层（主路径序=[回炉 R2/R4 重排]①明文预检→decode〔②HMAC+④a 解密〕
 *    →③seq 决策表→④b 对账；拒收卷零副作用——③④ 闸全在事务外只读预检）──
 * - 闸①a 明文预检（不依赖密钥——R2 前置）：JSON.parse 失败/必填九键缺席或
 *   类型不符→struct_invalid（owner/seq 不可解析记 null 降级）；闸③前置自检
 *   ==本库 owner→self_reimport（先于闸①值检）；format_version!==1→version_
 *   mismatch；schema_version>本库→schema_newer；table_counts 键集≠九表→
 *   struct_invalid。验签钥=peer_sync_key:<自称 owner>，未配对→hmac_fail
 *   （自裁③收窄为「未配对」——十码闭表无 unknown_owner 键）。
 * - decode（codec 单源）：hmac_fail（闸②）/decrypt_fail（闸④a）。decrypt_fail
 *   恒直报〔R4：内嵌闸③评估删除——「GCM 损坏但同 sha 已 applied」卷报
 *   decrypt_fail 不再 noop（文件损坏是更根本问题，noop 仅对 decode ok 卷）〕。
 * - 闸③（内序决策表 r3-N1 逐字）：a.import_log:<owner>:<seq> 值==卷 payload_
 *   sha256→幂等 no-op 出口（先于水位比较，否则被 stale 吞）；b.值在且异→
 *   seq_conflict；c.缺席且 seq≤recv_seq:<owner>（空键≡0）→seq_stale；d.过闸。
 * - 闸④b：sha256(plaintext)≠body.payload_sha256→hash_mismatch；canonicalJson(JSON
 *   .parse(plaintext))!==plaintext→struct_invalid（重复键/非 canonical=重序列化
 *   对账不符即拒收——§13.6）；逐表逐行键集校验（行 sorted 键集==TABLE_SPECS
 *   sorted 列集）→struct_invalid；table_counts vs 实载行数→counts_mismatch；
 *   deletions 身份形态校验（[回炉 R7] paper_tags id 恰一竖线+两分量非空、他表
 *   id 非空——畸形→struct_invalid 整卷拒收）。
 * - 闸⑤⑥（单事务 repos.withTransaction）：首语句 setGuardStop(1)→先 upsert
 *   后删除（§13.1 批内执行序）——九表按 IMPORT_TABLE_ORDER 逐行三分支：有
 *   updated_at 六表：入站>本地→写（updated+1）；<→跳过（skippedStale+1）；=
 *   →内容全等（整行全列）=no-op/异=A7 行级拒收（a7Conflicts+首例登记，同卷
 *   他行继续）。无 updated_at 三表（collections/tags/paper_tags——R-C：纯键等
 *   三分支）：键缺席→INSERT；键等且内容全等→no-op；异→A7。防复活过滤先于
 *   三分支（INV-132）：入站 (entity,id) 命中本库 deletion_events→跳过
 *   （skippedRevive+1，不计 A7）。deletions 直执（缺席=no-op；guard 置位中
 *   本地不落账）；FTS×3 rebuild→水位→import_log 落（sha）→事务尾
 *   resetGuardStop（同事务=崩溃自回滚）。LWW 键=updated_at 码元序（A3 单机）。
 * - rejected：拒收统计键更新（count+1+最近指纹——W1）→Res（ownerId/seq=自称
 *   值，不可解析缺省）。测试=tests/unit/services/import-snapshot.service.test.ts。
 */
import { createHash } from 'node:crypto'
import type { SnapshotImportRejectReason, SnapshotImportRes, SnapshotImportStats } from '../../../shared/ipc/schemas'
import type { Repos } from '../../db/repos'
import { TABLE_SPECS } from '../../db/repos/snapshot.repo'
import { IMPORT_TABLE_ORDER, identityOf, type ImportTable } from '../../db/repos/import-snapshot.repo'
import { canonicalJson, decodeEnvelope } from './envelope.codec'

/** 无 updated_at 三表（001 实照——R-C 纯键等三分支） */
const NO_UPDATED_AT: ReadonlySet<string> = new Set(['collections', 'tags', 'paper_tags'])

const NINE_TABLES: readonly string[] = TABLE_SPECS.map((s) => s.table)

/** 逐表全列集（行键集校验+内容全等比较——TABLE_SPECS 单源派生） */
const COLUMNS_OF: ReadonlyMap<string, readonly string[]> = new Map(TABLE_SPECS.map((s) => [s.table, s.columns]))

function zeroStats(): SnapshotImportStats {
  return { inserted: 0, updated: 0, skippedStale: 0, skippedRevive: 0, deleted: 0, a7Conflicts: 0 }
}
function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

export interface SnapshotImportService {
  importFromBuffer(bytes: Buffer): SnapshotImportRes
}

interface ValidPayload { data: Record<string, Array<Record<string, unknown>>>; deletions: Array<{ entity: string; id: string }> }

export function createImportSnapshotService(deps: { repos: Repos }): SnapshotImportService {
  const { repos } = deps
  const imp = repos.importSnapshot

  function localOwner(): string {
    const ownerId = repos.appMeta.get('owner_id')
    if (ownerId === null) throw new Error('owner_id 缺席：装配序缺陷（ensureIdentity 未在装配期执行）')
    return ownerId
  }

  /** 拒收路径统一出口：统计键更新（count+1+最近指纹）+Res 自称值 */
  function reject(
    reason: SnapshotImportRes['reason'],
    claimed: { owner: string | null; seq: number | null; sha: string | null }
  ): SnapshotImportRes {
    const prev = imp.getRejectStats()
    imp.setRejectStats({
      count: (prev?.count ?? 0) + 1,
      lastOwner: claimed.owner,
      lastSeq: claimed.seq,
      lastSha: claimed.sha,
      lastReason: reason ?? 'struct_invalid',
      lastAt: new Date().toISOString()
    })
    const res: SnapshotImportRes = { outcome: 'rejected', reason: reason ?? 'struct_invalid' }
    if (claimed.owner !== null) res.ownerId = claimed.owner
    if (claimed.seq !== null) res.snapshotSeq = claimed.seq
    return res
  }

  /** 闸③内序决策表（r3-N1 逐字）：'noop'=幂等出口/'pass'=过闸/其余=拒收码 */
  function seqGate(owner: string, seq: number, sha: string): 'noop' | 'pass' | 'seq_conflict' | 'seq_stale' {
    const logged = imp.getImportLog(owner, seq)
    if (logged === sha) return 'noop'
    if (logged !== null) return 'seq_conflict'
    if (seq <= imp.getRecvSeq(owner)) return 'seq_stale'
    return 'pass'
  }

  /** 闸④结构校验：payload 形状/行键集/counts/deletions 身份（返回原因码即拒收面） */
  function validatePayload(payload: unknown, counts: Record<string, number>): ValidPayload | SnapshotImportRejectReason {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return 'struct_invalid'
    const p = payload as { data?: unknown; deletions?: unknown; pdf_refs?: unknown }
    if (p.data === null || typeof p.data !== 'object' || Array.isArray(p.data)) return 'struct_invalid'
    const data = p.data as Record<string, unknown>
    if (JSON.stringify(Object.keys(data).sort()) !== JSON.stringify([...NINE_TABLES].sort())) return 'struct_invalid'
    if (!Array.isArray(p.deletions) || !Array.isArray(p.pdf_refs)) return 'struct_invalid'
    const out: Record<string, Array<Record<string, unknown>>> = {}
    for (const table of NINE_TABLES) {
      const rows = data[table]
      if (!Array.isArray(rows)) return 'struct_invalid'
      const cols = [...(COLUMNS_OF.get(table) ?? [])].sort()
      for (const row of rows) {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) return 'struct_invalid'
        if (JSON.stringify(Object.keys(row as Record<string, unknown>).sort()) !== JSON.stringify(cols)) {
          return 'struct_invalid'
        }
      }
      if (counts[table] !== rows.length) return 'counts_mismatch'
      out[table] = rows as Array<Record<string, unknown>>
    }
    // [回炉 R7] deletions 身份形态：entity∈九表+id 非空；paper_tags id 恰一竖线
    // +两分量非空（§13.1 序列化形态）——畸形=struct_invalid 整卷拒收
    for (const d of p.deletions) {
      if (d === null || typeof d !== 'object' || Array.isArray(d)) return 'struct_invalid'
      const { entity, id } = d as Record<string, unknown>
      if (typeof entity !== 'string' || !NINE_TABLES.includes(entity)) return 'struct_invalid'
      if (typeof id !== 'string' || id.length === 0) return 'struct_invalid'
      if (entity === 'paper_tags') {
        const parts = id.split('|')
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return 'struct_invalid'
      }
    }
    return { data: out, deletions: p.deletions as Array<{ entity: string; id: string }> }
  }

  /** 闸⑤⑥：单事务应用（guard 开→先 upsert 后删除→FTS/水位/日志→guard 复位） */
  function applyInTx(payload: ValidPayload, owner: string, seq: number, sha: string): SnapshotImportStats {
    const stats = zeroStats()
    // 闭包内首写——对象持有者避 TS 流分析闭包窄化（never 面）
    const a7First: { v: { entity: string; id: string } | null } = { v: null }
    repos.withTransaction(() => {
      imp.setGuardStop(1)
      for (const table of IMPORT_TABLE_ORDER) {
        const cols = COLUMNS_OF.get(table)!
        for (const row of payload.data[table] ?? []) {
          const id = identityOf(table, row)
          if (imp.isDeleted(table, id)) {
            stats.skippedRevive += 1
            continue
          }
          const local = imp.readRow(table, row)
          if (NO_UPDATED_AT.has(table)) {
            if (local === null) {
              imp.upsertRow(table, row)
              stats.inserted += 1
            } else if (!contentEqual(cols, row, local)) {
              stats.a7Conflicts += 1
              a7First.v ??= { entity: table, id }
            }
            continue
          }
          const inAt = String(row.updated_at)
          if (local === null) {
            imp.upsertRow(table, row)
            stats.inserted += 1
          } else if (inAt > String(local.updated_at)) {
            imp.upsertRow(table, row)
            stats.updated += 1
          } else if (inAt < String(local.updated_at)) {
            stats.skippedStale += 1
          } else if (!contentEqual(cols, row, local)) {
            stats.a7Conflicts += 1
            a7First.v ??= { entity: table, id }
          }
        }
      }
      for (const d of payload.deletions) {
        stats.deleted += imp.deleteDirect(d.entity as ImportTable, d.id)
      }
      imp.rebuildFts()
      imp.setRecvSeq(owner, seq)
      imp.setImportLog(owner, seq, sha)
      imp.resetGuardStop()
    })
    if (a7First.v !== null) {
      stats.a7FirstEntity = a7First.v.entity
      stats.a7FirstId = a7First.v.id
    }
    return stats
  }

  return {
    importFromBuffer(bytes: Buffer): SnapshotImportRes {
      let parsed: unknown
      try {
        parsed = JSON.parse(bytes.toString('utf8'))
      } catch {
        return reject('struct_invalid', { owner: null, seq: null, sha: null })
      }
      const obj = (parsed === null || typeof parsed !== 'object' ? {} : parsed) as Record<string, unknown>
      const claimed = {
        owner: typeof obj.owner_id === 'string' ? obj.owner_id : null,
        seq: typeof obj.snapshot_seq === 'number' ? obj.snapshot_seq : null,
        sha: typeof obj.payload_sha256 === 'string' ? obj.payload_sha256 : null
      }
      // 闸①a 明文预检（[回炉 R2] 前置——不依赖密钥）：必填九键在位+类型
      if (!envelopeShapeOk(obj)) {
        return reject('struct_invalid', claimed)
      }
      // 闸③前置自检（§13.2 开头——先于闸①值检）
      if (claimed.owner === localOwner()) {
        return reject('self_reimport', claimed)
      }
      // 闸①值检（明文面——先于 decode）
      if (obj.format_version !== 1) {
        return reject('version_mismatch', claimed)
      }
      if ((obj.schema_version as number) > repos.snapshot.readSchemaVersion()) {
        return reject('schema_newer', claimed)
      }
      if (JSON.stringify(Object.keys(obj.table_counts as Record<string, unknown>).sort()) !== JSON.stringify([...NINE_TABLES].sort())) {
        return reject('struct_invalid', claimed)
      }
      // 验签钥（未配对=不可验签→hmac_fail——自裁③收窄口径；owner 已过形状门）
      const syncKey = imp.readPeerKey(claimed.owner as string)
      if (syncKey === null) {
        return reject('hmac_fail', claimed)
      }
      // decode（闸②HMAC+闸④a 解密——codec 单源；[R4] decrypt_fail 恒直报）
      const dec = decodeEnvelope(parsed, syncKey)
      if (!dec.ok) {
        return reject(dec.reason, claimed)
      }
      const body = dec.body
      const authClaim = { owner: body.owner_id, seq: body.snapshot_seq, sha: body.payload_sha256 }
      // 闸③
      const gate = seqGate(body.owner_id, body.snapshot_seq, body.payload_sha256)
      if (gate === 'noop') {
        return { outcome: 'applied', ownerId: body.owner_id, snapshotSeq: body.snapshot_seq, noop: true, stats: zeroStats() }
      }
      if (gate !== 'pass') {
        return reject(gate, authClaim)
      }
      // 闸④b
      const text = dec.plaintext.toString('utf8')
      if (sha256Hex(dec.plaintext) !== body.payload_sha256) {
        return reject('hash_mismatch', authClaim)
      }
      let payloadJson: unknown
      try {
        payloadJson = JSON.parse(text)
      } catch {
        return reject('struct_invalid', authClaim)
      }
      if (canonicalJson(payloadJson) !== text) {
        return reject('struct_invalid', authClaim)
      }
      const validated = validatePayload(payloadJson, body.table_counts)
      if (typeof validated === 'string') {
        return reject(validated as SnapshotImportRejectReason, authClaim)
      }
      // 闸⑤⑥
      const stats = applyInTx(validated, body.owner_id, body.snapshot_seq, body.payload_sha256)
      return { outcome: 'applied', ownerId: body.owner_id, snapshotSeq: body.snapshot_seq, stats }
    }
  }
}

/** 内容全等：整行所有列（[R1] kind/tags 全列入写面后全列同集比较——§13.2⑤ 字面） */
function contentEqual(cols: readonly string[], inbound: Record<string, unknown>, local: Record<string, unknown>): boolean {
  for (const c of cols) {
    if (inbound[c] !== local[c]) return false
  }
  return true
}

/** [回炉 R2] 明文预检：必填九键在位+类型（不依赖密钥——parse 后最先执行） */
function envelopeShapeOk(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.format_version === 'number' &&
    typeof obj.schema_version === 'number' &&
    typeof obj.snapshot_seq === 'number' &&
    typeof obj.owner_id === 'string' &&
    obj.table_counts !== null &&
    typeof obj.table_counts === 'object' &&
    !Array.isArray(obj.table_counts) &&
    typeof obj.payload_sha256 === 'string' &&
    typeof obj.payload_nonce === 'string' &&
    typeof obj.payload === 'string' &&
    typeof obj.hmac_sha256 === 'string'
  )
}
