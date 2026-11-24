/**
 * [F-DBCAMP-01 DB-3 U3] import-snapshot.service —— 快照导入六闸编排（设计书
 * §13.2 接收方流程/§13.4 水位/§13.6 摘要域；简报主控裁决③-5）。export 面的
 * 对偶件；验签/解密单源=envelope.codec.decodeEnvelope（R-A）。
 *
 * ── 行为层（主路径序=[回炉 R2/R4 重排]①明文预检→decode〔②HMAC+④a 解密〕
 *    →③seq 决策表→④b 对账；拒收卷零副作用——③④ 闸全在事务外只读预检）──
 * - 闸①a 明文预检（不依赖密钥——R2 前置）：JSON.parse 失败/必填九键（envelope
 *   键集恒九键——codec INV-D 教义，与表数无关〔回炉 R2 勘正：表集十表≠
 *   envelope 键数〕）缺席或类型不符→struct_invalid（owner/seq 不可解析记
 *   null 降级）；闸③前置自检
 *   ==本库 owner→self_reimport（先于闸①值检）；format_version!==1→version_
 *   mismatch；schema_version>本库→schema_newer；table_counts 键集≠十表
 *   （[F-VISFB-61] TABLE_SPECS 九表→十表：+floating_notes）→struct_invalid。
 *   验签钥=peer_sync_key:<自称 owner>，未配对→hmac_fail
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
 * - 闸⑤⑥（单事务 repos.withTransaction）：setGuardStop(1)→先 upsert 后删除（§13.1
 *   批内执行序）。段二（十表按 IMPORT_TABLE_ORDER）——[B4 L1 §7.5] D1 三段闭环：
 *   无 updated_at 三表（R-C 纯键等三分支，防复活过滤先行）：键缺席→INSERT/键等
 *   且内容全等→no-op/异→A7；有 updated_at 表「先读本地行」：①活行在场→LWW
 *   （>→写/<→skippedStale/＝→内容全等 no-op，异=A7 行级拒收）——不再因历史
 *   tombstone 无条件跳过（本库活行即显式恢复，INV-132 受控例外）；②缺席+有
 *   tombstone→skippedRevive（防复活合同逐字保留）；③缺席无 tombstone→插入。
 * - 段三删事件代际判定（段二后同事务逐项；键=deleted_at）：row==null→no-op；
 *   String(row.updated_at)>deleted_at→skippedSuperseded+1（恢复/改写胜出）；==→
 *   同跳过（写点单调守卫下单库不可达——防御默认）；否则 deleteDirect。
 *   NO_UPDATED_AT 三表维持无条件删除；entity='collections' 项同做 graph_meta 派生
 *   清理（§5.4：删该夹 keyed 色行名行）。guard 置位中本地不落账；FTS×3 rebuild→
 *   水位→import_log→事务尾 resetGuardStop（崩溃自回滚）。LWW 键=updated_at 码元序。
 * - rejected：拒收统计键更新（count+1+最近指纹——W1）→Res（ownerId/seq=自称
 *   值，不可解析缺省）。测试=tests/unit/services/import-snapshot.service.test.ts。
 * - [B4 L2 回炉 X-IMP·设计稿 §2.6 #41] 结构事件双播：importFromBuffer 的结果为
 *   applied 且非 noop（库态确有变化）→ applyInTx 的事务返回之后、回执之前双播
 *   folders.changed＋lineage.changed（先 folders 后 lineage——folders.service delete
 *   同序；空载荷，通道与载荷零变化）。拒收（零库副作用）与幂等 noop（零库变）不播。
 *   消费侧=renderer lineage-folder-reconcile 的 #41 全 registry 失效：导入前驻留的
 *   缓存会话返回时按 #34 单飞和解，不再显示导入前的图态；卷内 collections 删事件
 *   亦经此使已删夹的缓存会话被处置。两出口=可选依赖（缺省=空操作——既有 { repos }
 *   构造的受锁测试零适配）；生产装配恒真值（services/index 注入 bootstrap 出口）。
 *   落点在 service 而非 ipc：与 folders/library/import 三 service 的双播同层，ipc
 *   域模块保持纯薄分发。测试=tests/unit/services/import-snapshot-events.test.ts
 *   （服务级）与 import-snapshot-wiring.test.ts（生产装配）。
 * - 纯校验助手（sameKeySet 表集/行键集同集判定、contentEqual 闸④b 整行内容全等、
 *   envelopeShapeOk 闸①a 明文预检）位于同目录 import-snapshot.guards——本件补结构
 *   事件双播后超出 §11.2 行数预算，按预算纪律拆件迁出（闸位对应见该件头注）。
 */
import { createHash } from 'node:crypto'
import type { SnapshotImportRejectReason, SnapshotImportRes, SnapshotImportStats } from '../../../shared/ipc/schemas'
import type { Repos } from '../../db/repos'
import { TABLE_SPECS } from '../../db/repos/snapshot.repo'
import { IMPORT_TABLE_ORDER, identityOf, type ImportTable } from '../../db/repos/import-snapshot.repo'
import { canonicalJson, decodeEnvelope } from './envelope.codec'
import { contentEqual, envelopeShapeOk, sameKeySet } from './import-snapshot.guards'
import { lineTypeNamesKey } from '../../db/repos/lineage.repo'

/** 无 updated_at 三表（001 实照——R-C 纯键等三分支） */
const NO_UPDATED_AT: ReadonlySet<string> = new Set(['collections', 'tags', 'paper_tags'])

/** [F-VISFB-61] 表集单源=TABLE_SPECS（九表→十表：+floating_notes） */
const SNAPSHOT_TABLES: readonly string[] = TABLE_SPECS.map((s) => s.table)

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

/** deletions[].deleted_at=删事件代际标记（有 updated_at 表必携——段三判定键） */
interface ValidPayload {
  data: Record<string, Array<Record<string, unknown>>>
  deletions: Array<{ entity: string; id: string; deleted_at?: string }>
}

export function createImportSnapshotService(deps: {
  repos: Repos
  /** [B4 L2 回炉 X-IMP] 结构事件出口（可选缺省=空操作——受锁单测装配兼容；生产装配
   *  恒真值——services/index 注入 bootstrap 的 foldersChanged/lineageChanged 发送闭包） */
  sendFoldersChanged?: () => void
  sendLineageChanged?: () => void
}): SnapshotImportService {
  const { repos } = deps
  const sendFoldersChanged = deps.sendFoldersChanged ?? (() => undefined)
  const sendLineageChanged = deps.sendLineageChanged ?? (() => undefined)
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
    if (!sameKeySet(Object.keys(data), SNAPSHOT_TABLES)) {
      return 'struct_invalid'
    }
    if (!Array.isArray(p.deletions) || !Array.isArray(p.pdf_refs)) return 'struct_invalid'
    const out: Record<string, Array<Record<string, unknown>>> = {}
    for (const table of SNAPSHOT_TABLES) {
      const rows = data[table]
      if (!Array.isArray(rows)) return 'struct_invalid'
      const cols = COLUMNS_OF.get(table) ?? []
      for (const row of rows) {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) return 'struct_invalid'
        if (!sameKeySet(Object.keys(row as Record<string, unknown>), cols)) {
          return 'struct_invalid'
        }
      }
      if (counts[table] !== rows.length) return 'counts_mismatch'
      out[table] = rows as Array<Record<string, unknown>>
    }
    // [回炉 R7] deletions 身份形态：entity∈十表+id 非空；paper_tags id 恰一竖线
    // +两分量非空（§13.1 序列化形态）——畸形=struct_invalid 整卷拒收
    for (const d of p.deletions) {
      if (d === null || typeof d !== 'object' || Array.isArray(d)) return 'struct_invalid'
      const { entity, id } = d as Record<string, unknown>
      if (typeof entity !== 'string' || !SNAPSHOT_TABLES.includes(entity)) return 'struct_invalid'
      if (typeof id !== 'string' || id.length === 0) return 'struct_invalid'
      // [B4 L1 §7.5] 有 updated_at 表的删事件必携 deleted_at（段三判定键——缺席不可判）
      const { deleted_at } = d as Record<string, unknown>
      if (!NO_UPDATED_AT.has(entity) && typeof deleted_at !== 'string') return 'struct_invalid'
      if (entity === 'paper_tags') {
        const parts = id.split('|')
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return 'struct_invalid'
      }
    }
    return { data: out, deletions: p.deletions as ValidPayload['deletions'] }
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
          const local = imp.readRow(table, row)
          if (NO_UPDATED_AT.has(table)) {
            // 纯键等三表：防复活过滤先于三分支（现行合同）
            if (imp.isDeleted(table, id)) {
              stats.skippedRevive += 1
            } else if (local === null) {
              imp.upsertRow(table, row)
              stats.inserted += 1
            } else if (!contentEqual(cols, row, local)) {
              stats.a7Conflicts += 1
              a7First.v ??= { entity: table, id }
            }
            continue
          }
          const inAt = String(row.updated_at)
          if (local !== null) {
            // [B4 L1 §7.5 段二①] 本地活行在场→updated_at LWW（历史 tombstone 不再无条件跳过）
            if (inAt > String(local.updated_at)) {
              imp.upsertRow(table, row)
              stats.updated += 1
            } else if (inAt < String(local.updated_at)) {
              stats.skippedStale += 1
            } else if (!contentEqual(cols, row, local)) {
              stats.a7Conflicts += 1
              a7First.v ??= { entity: table, id }
            }
          } else if (imp.isDeleted(table, id)) {
            stats.skippedRevive += 1 // 段二②：缺席+有本地 tombstone=skippedRevive
          } else {
            imp.upsertRow(table, row) // 段二③：缺席且无 tombstone=插入
            stats.inserted += 1
          }
        }
      }
      // [B4 L1 §7.5 段三] 删事件代际判定（段二后同事务逐项）；superseded=代际被活行
      // 超越的删事件数（skippedSuperseded 可选键=仅命中时在场）
      let superseded = 0
      for (const d of payload.deletions) {
        // §5.4 派生清理：删夹（collections 属 NO_UPDATED_AT 表——须先于其无条件删除
        // 分支）→同事务清该夹 keyed 色行名行（派生面不计 deleted）
        if (d.entity === 'collections') {
          imp.deleteDirect('lineage_graph_meta', lineTypeNamesKey(d.id))
        }
        if (NO_UPDATED_AT.has(d.entity)) {
          stats.deleted += imp.deleteDirect(d.entity as ImportTable, d.id)
          continue
        }
        const row = imp.readRowById(d.entity as ImportTable, d.id)
        if (row === null) continue // no-op（幂等，无行可删）
        const localAt = String(row.updated_at)
        if (localAt >= d.deleted_at!) {
          superseded += 1 // 活行代际≥删事件：恢复/改写胜出（相等=守卫下不可达的防御默认）
          continue
        }
        stats.deleted += imp.deleteDirect(d.entity as ImportTable, d.id)
      }
      if (superseded > 0) stats.skippedSuperseded = superseded
      // [F-VISFB-42] 派生图表资产恢复重提：快照不携带派生面（TABLE_SPECS 零增
      // ——figure_jobs/paper_figures 不入快照），payload papers 全集 jobs 重置
      // pending+figure 行清空=恢复后重提取（无「ready 但资产缺失」态）；防复活
      // 跳过的 paper 本地已删=repo 侧 INSERT...SELECT 存在性守卫自然跳过；
      // 磁盘旧资产内容寻址覆写（孤儿 digest 随篇目录硬删收口，不在此面）。
      // figures=Repos 可选键（受锁测试字面量闭合）——缺席跳过（真库 createRepos
      // 恒供值）
      repos.figures?.resetJobsForPapers(
        (payload.data.papers ?? []).map((row) => String(identityOf('papers', row)))
      )
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
      if (!sameKeySet(Object.keys(obj.table_counts as Record<string, unknown>), SNAPSHOT_TABLES)) {
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
      // [B4 L2 回炉 X-IMP·§2.6 #41] 走到此处=applied 且非 noop（幂等 noop 出口在闸③
      // 已先行返回）；applyInTx 已返回=事务提交完成——回执前双播（先 folders 后
      // lineage），库态变化对 renderer 可见的时点不晚于导入回执
      sendFoldersChanged()
      sendLineageChanged()
      return { outcome: 'applied', ownerId: body.owner_id, snapshotSeq: body.snapshot_seq, stats }
    }
  }
}
