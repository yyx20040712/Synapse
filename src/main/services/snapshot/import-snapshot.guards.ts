/**
 * [B4 L2 回炉 X-IMP 拆件] import-snapshot.guards —— 快照导入的无状态校验助手。
 *
 * ── 来源与拆件理由 ──
 * 三个助手迁自 import-snapshot.service.ts（同目录）。[B4 L2 回炉 X-IMP] 该件补
 * 「导入成功后双播 folders.changed＋lineage.changed」后为 379 行，超出设计稿 §11.2
 * 行数预算（≤355）；按预算纪律以拆文件达成、不削注释：三助手无状态、无该件以外
 * 的引用方，迁出零行为变化（函数体与注释逐字迁入，仅声明行加 export）。
 *
 * ── 职责（对应 import-snapshot.service 的闸位）──
 * - envelopeShapeOk：闸①a 明文预检（必填九键在位+类型；不依赖密钥——parse 后
 *   最先执行）
 * - sameKeySet：同集判定单源——闸①a 的 table_counts 键集校验、闸④b 的 data 十表
 *   键集校验与逐表行键集校验
 * - contentEqual：闸④b 整行内容全等（纯键等三分支与 LWW 平局的 no-op 判定）
 *
 * ── 架构层 ── 纯函数件：零依赖，不碰 repos 与 electron；消费方=
 * import-snapshot.service。
 */

/** 键集同集判定（两键列各自排序后序列化比较——表集校验×2+行键集校验×1 三处单源） */
export function sameKeySet(a: readonly string[], b: readonly string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
}

/** 内容全等：整行所有列（[R1] kind/tags 全列入写面后全列同集比较——§13.2⑤ 字面） */
export function contentEqual(cols: readonly string[], inbound: Record<string, unknown>, local: Record<string, unknown>): boolean {
  for (const c of cols) {
    if (inbound[c] !== local[c]) return false
  }
  return true
}

/** [回炉 R2] 明文预检：必填九键在位+类型（不依赖密钥——parse 后最先执行） */
export function envelopeShapeOk(obj: Record<string, unknown>): boolean {
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
