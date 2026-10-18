/**
 * [F-VISFB-65 U2] recovery.files —— 恢复副本原子文件层（设计书 §1）。
 *
 * ── 职责（纯 fs 原语；编排/epoch/归属判定在 recovery.service）──
 * - 槽读写删：`<recoveryRoot>/<workspaceId>/<fileName>` 单槽覆写；写=同目录
 *   `<fileName>.tmp` 写全→rename 原子替换（持久性=进程崩溃级，不承诺掉电——
 *   INV-167）；槽文件 0600。
 * - 读侧四态：empty / available（外覆层+载荷均过检）/ foreign-version
 *   （schemaVersion 高于注册表——保留不加载）/ invalid（其余一切不可用——
 *   保留不自动删，INV-160）。
 * - opaque token：损坏外覆层取不到 token 时以 sha256(content)+size+mtime
 *   组合代之（放弃专用、同内容同权——INV-157 登记）；外覆层可读时用真 token。
 * - 启动 tmp 提升（§1 规则）：槽缺席而 .tmp 外覆层可解析→提升为槽；槽在场
 *   而 .tmp 可解析且 writtenAt 更新→提升替换；否则删 .tmp。目录内一切 .tmp
 *   皆自有（应用管目录）；槽不可解析时保守不覆盖（保槽待用户 release）。
 * - 孤儿清理：recovery/ 下无对应工作区的子目录整删（启动扫调用）。
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  RECOVERY_REGISTRY,
  recoveryEnvelopeSchema,
  isRegisteredRecoveryType,
  type RecoveryPayloadSummary,
  type RecoveryType
} from '../../../shared/recovery/schemas'

export interface SlotReadResult {
  kind: 'empty' | 'available' | 'invalid' | 'foreign-version'
  /** empty=null；invalid=外覆层可读时真 token、不可读时 opaque；available/foreign-version=真 token */
  token: string | null
  writtenAt: string | null
  lastWriterSession: string | null
  /** 仅 available：已过 payloadSchema 校验的载荷 */
  payload: unknown
  summary: RecoveryPayloadSummary | null
}

const EMPTY_SUMMARY: RecoveryPayloadSummary = { actionCount: 0, draftPresent: false }

/** opaque token（同内容同权——sha256+size+mtime 组合单源） */
export function opaqueTokenFor(content: string, size: number, mtimeMs: number): string {
  return `opaque-${createHash('sha256').update(content, 'utf-8').digest('hex')}-${size}-${mtimeMs}`
}

function emptySlot(): SlotReadResult {
  return { kind: 'empty', token: null, writtenAt: null, lastWriterSession: null, payload: null, summary: null }
}

function slotPath(dir: string, type: RecoveryType): string {
  return join(dir, RECOVERY_REGISTRY[type]!.fileName)
}

function tmpPath(dir: string, type: RecoveryType): string {
  return join(dir, `${RECOVERY_REGISTRY[type]!.fileName}.tmp`)
}

/** 尽力读外覆层（不抛——IO/解析失败归 invalid 态；opaque 兜底 token；
 *  [回炉 N2] 外覆层 type 与请求 type 不符=错位文件→invalid（token 取外覆层
 *  真值——可读面诚实暴露） */
async function tryReadEnvelope(
  path: string,
  expectedType: RecoveryType
): Promise<
  | {
      ok: true
      env: { token: string; writtenAt: string; lastWriterSession: string; schemaVersion: number; payload: unknown }
    }
  | { ok: false; token: string }
> {
  let raw: string
  let st: { size: number; mtimeMs: number }
  try {
    const [content, s] = await Promise.all([readFile(path, 'utf-8'), stat(path)])
    raw = content
    st = { size: s.size, mtimeMs: s.mtimeMs }
  } catch {
    throw new Error(`恢复槽文件读取失败：${path}`)
  }
  try {
    const parsed = recoveryEnvelopeSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return { ok: false, token: opaqueTokenFor(raw, st.size, st.mtimeMs) }
    // [回炉 N2] type 错位=invalid（token 取外覆层真值——可读面诚实暴露）
    if (parsed.data.type !== expectedType) return { ok: false, token: parsed.data.token }
    return {
      ok: true,
      env: {
        token: parsed.data.token,
        writtenAt: parsed.data.writtenAt,
        lastWriterSession: parsed.data.lastWriterSession,
        schemaVersion: parsed.data.schemaVersion,
        payload: parsed.data.payload
      }
    }
  } catch {
    return { ok: false, token: opaqueTokenFor(raw, st.size, st.mtimeMs) }
  }
}

/** 槽读侧四态判定（§1——available/foreign-version/invalid/empty 单源） */
export async function readSlot(dir: string, type: RecoveryType): Promise<SlotReadResult> {
  if (!isRegisteredRecoveryType(type)) throw new Error(`未注册的恢复类型：${type}`)
  const path = slotPath(dir, type)
  if (!existsSync(path)) return emptySlot()
  const meta = RECOVERY_REGISTRY[type]!
  const r = await tryReadEnvelope(path, type)
  if (!r.ok) {
    return {
      kind: 'invalid',
      token: r.token,
      writtenAt: null,
      lastWriterSession: null,
      payload: null,
      summary: null
    }
  }
  const env = r.env
  if (env.schemaVersion > meta.schemaVersion) {
    return {
      kind: 'foreign-version',
      token: env.token,
      writtenAt: env.writtenAt,
      lastWriterSession: env.lastWriterSession,
      payload: null,
      summary: null
    }
  }
  const payloadOk = meta.payloadSchema.safeParse(env.payload)
  if (!payloadOk.success) {
    return {
      kind: 'invalid',
      token: env.token,
      writtenAt: env.writtenAt,
      lastWriterSession: env.lastWriterSession,
      payload: null,
      summary: null
    }
  }
  return {
    kind: 'available',
    token: env.token,
    writtenAt: env.writtenAt,
    lastWriterSession: env.lastWriterSession,
    payload: payloadOk.data,
    summary: meta.summarize ? meta.summarize(payloadOk.data) : EMPTY_SUMMARY
  }
}

/** 原子写（tmp 写全→rename；0600；失败抛错旧槽原样——rename 原子性承载） */
export async function writeSlotAtomic(
  dir: string,
  type: RecoveryType,
  envelope: {
    token: string
    writtenAt: string
    lastWriterSession: string
    payload: unknown
  }
): Promise<void> {
  const meta = RECOVERY_REGISTRY[type]!
  await mkdir(dir, { recursive: true })
  const body = JSON.stringify({
    type,
    schemaVersion: meta.schemaVersion,
    token: envelope.token,
    writtenAt: envelope.writtenAt,
    lastWriterSession: envelope.lastWriterSession,
    payload: envelope.payload
  })
  const tmp = tmpPath(dir, type)
  await writeFile(tmp, body, { mode: 0o600 })
  await chmod(tmp, 0o600)
  await rename(tmp, slotPath(dir, type))
}

/** 删槽（失败抛错——调用方决定是否推进 epoch，W-03 半成功序在 service 层） */
export async function deleteSlot(dir: string, type: RecoveryType): Promise<void> {
  await rm(slotPath(dir, type), { force: true })
}

/** 启动 tmp 提升（§1 规则单源；坏 tmp/不可比较→删 tmp） */
export async function promoteTmp(dir: string, type: RecoveryType): Promise<void> {
  const tmp = tmpPath(dir, type)
  if (!existsSync(tmp)) return
  const tmpRead = await tryReadEnvelope(tmp, type)
  // 坏 tmp：外覆层不可解析→删（应用管目录，tmp 皆自有写残迹）
  if (!tmpRead.ok) {
    await rm(tmp, { force: true })
    return
  }
  const slot = slotPath(dir, type)
  if (!existsSync(slot)) {
    await rename(tmp, slot)
    return
  }
  const slotRead = await tryReadEnvelope(slot, type)
  // [回炉 N1] 时间比较=Date.parse 校验（字典序对残缺串误判）——任一侧非法
  // 即不可比较：保守保槽（用户 release 唯一删除径）/tmp 非法即删
  const tmpAt = Date.parse(tmpRead.env.writtenAt)
  if (!Number.isFinite(tmpAt)) {
    await rm(tmp, { force: true })
    return
  }
  // 槽不可解析或槽 writtenAt 非法：不可比较——保守保槽，tmp 删
  const slotAt = slotRead.ok ? Date.parse(slotRead.env.writtenAt) : Number.NaN
  if (!Number.isFinite(slotAt)) {
    await rm(tmp, { force: true })
    return
  }
  if (tmpAt > slotAt) {
    await rename(tmp, slot)
    return
  }
  await rm(tmp, { force: true })
}

/** 根目录 ensure（启动扫——只建根，工作区子目录随首写落位） */
export async function ensureRecoveryRoot(root: string): Promise<void> {
  await mkdir(root, { recursive: true })
}

/** recovery/ 下子目录名清单（孤儿清理比对源） */
export async function listWorkspaceDirNames(root: string): Promise<string[]> {
  if (!existsSync(root)) return []
  const entries = await readdir(root, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

/** 孤儿清理：无对应工作区的子目录整删（启动即删——INV-157 收口） */
export async function cleanupOrphanDirs(root: string, liveWorkspaceIds: ReadonlySet<string>): Promise<void> {
  for (const name of await listWorkspaceDirNames(root)) {
    if (!liveWorkspaceIds.has(name)) await rm(join(root, name), { recursive: true, force: true })
  }
}
